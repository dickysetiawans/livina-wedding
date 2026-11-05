-- Admin packages only. Apply after 202611050002. Existing public templates stay unchanged.
BEGIN;
CREATE TABLE organizer.package_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(150) NOT NULL CHECK(length(btrim(name))>0),
 has_subcategories boolean NOT NULL DEFAULT false, is_active boolean NOT NULL DEFAULT true,
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0), created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX package_categories_name_unique ON organizer.package_categories(lower(btrim(name)));
CREATE TABLE organizer.package_subcategories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),category_id uuid NOT NULL REFERENCES organizer.package_categories(id) ON DELETE RESTRICT,
 name varchar(150) NOT NULL CHECK(length(btrim(name))>0),is_active boolean NOT NULL DEFAULT true,
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(category_id,id)
);
CREATE UNIQUE INDEX package_subcategories_name_unique ON organizer.package_subcategories(category_id,lower(btrim(name)));
CREATE FUNCTION organizer_private.valid_package_benefits(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN jsonb_typeof(value)='array' THEN jsonb_array_length(value) BETWEEN 1 AND 50 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(value) AS entry(item) WHERE jsonb_typeof(item)<>'string' OR length(btrim(item#>>'{}')) NOT BETWEEN 1 AND 500) ELSE false END;
$$;
REVOKE ALL ON FUNCTION organizer_private.valid_package_benefits(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION organizer_private.valid_package_benefits(jsonb) TO authenticated,service_role;
CREATE TABLE organizer.packages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name varchar(150) NOT NULL CHECK(length(btrim(name))>0),
 category_id uuid NOT NULL REFERENCES organizer.package_categories(id) ON DELETE RESTRICT,subcategory_id uuid,
 package_kind text NOT NULL CHECK(package_kind IN ('all_in','non_venue')),price bigint NOT NULL CHECK(price BETWEEN 0 AND 999999999999),
 benefits jsonb NOT NULL CHECK(organizer_private.valid_package_benefits(benefits)),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(category_id,subcategory_id) REFERENCES organizer.package_subcategories(category_id,id) ON DELETE RESTRICT
);
CREATE TABLE organizer.package_gallery (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name varchar(150) NOT NULL CHECK(length(btrim(name))>0),
 category_id uuid NOT NULL REFERENCES organizer.package_categories(id) ON DELETE RESTRICT,subcategory_id uuid,
 photo_media_id uuid NOT NULL REFERENCES organizer.media_files(id) ON DELETE RESTRICT,caption varchar(1000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(category_id,subcategory_id) REFERENCES organizer.package_subcategories(category_id,id) ON DELETE RESTRICT
);
-- Serialize classification edits before row locks; prevent concurrent changes bypassing topology checks.
CREATE FUNCTION organizer_private.lock_package_tree() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN PERFORM pg_catalog.pg_advisory_xact_lock(170026,5); RETURN NULL; END $$;
CREATE FUNCTION organizer_private.guard_package_tree() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE needs_child boolean;
BEGIN
 IF TG_TABLE_NAME='package_categories' THEN
  IF TG_OP='UPDATE' AND NEW.has_subcategories<>OLD.has_subcategories AND (
   EXISTS(SELECT 1 FROM organizer.package_subcategories WHERE category_id=OLD.id) OR
   EXISTS(SELECT 1 FROM organizer.packages WHERE category_id=OLD.id) OR EXISTS(SELECT 1 FROM organizer.package_gallery WHERE category_id=OLD.id))
  THEN RAISE EXCEPTION 'Kategori sudah digunakan' USING ERRCODE='23503'; END IF;
 ELSE
  SELECT has_subcategories INTO needs_child FROM organizer.package_categories WHERE id=NEW.category_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kategori tidak tersedia' USING ERRCODE='23503'; END IF;
  IF TG_TABLE_NAME='package_subcategories' THEN
   IF NOT needs_child THEN RAISE EXCEPTION 'Kategori tidak menggunakan subkategori' USING ERRCODE='23514'; END IF;
  ELSE
   IF needs_child<>(NEW.subcategory_id IS NOT NULL) THEN RAISE EXCEPTION 'Pilih subkategori yang sesuai kategori' USING ERRCODE='23514'; END IF;
   IF TG_TABLE_NAME='package_gallery' THEN PERFORM organizer_private.require_media(NEW.photo_media_id,'image',NEW.status='published'); END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION organizer_private.lock_package_tree(),organizer_private.guard_package_tree() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION organizer_private.lock_package_tree(),organizer_private.guard_package_tree() TO service_role;
INSERT INTO organizer.permissions(code,name,module)
 SELECT m||'.'||a,m||' — '||a,m FROM unnest(ARRAY['package_categories','package_subcategories','packages','package_gallery']) m CROSS JOIN unnest(ARRAY['read','create','update','delete','publish']) a
 WHERE a<>'publish' OR m IN ('packages','package_gallery') ON CONFLICT(code) DO NOTHING;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['package_categories','package_subcategories','packages','package_gallery'] LOOP
  EXECUTE format('ALTER TABLE organizer.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON organizer.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON organizer.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON organizer.%I TO service_role',t);
  EXECUTE format('CREATE INDEX ON organizer.%I(sort_order,id)',t);
  EXECUTE format('CREATE TRIGGER a_package_lock BEFORE INSERT OR UPDATE OR DELETE ON organizer.%I FOR EACH STATEMENT EXECUTE FUNCTION organizer_private.lock_package_tree()',t);
  EXECUTE format('CREATE TRIGGER package_tree BEFORE INSERT OR UPDATE ON organizer.%I FOR EACH ROW EXECUTE FUNCTION organizer_private.guard_package_tree()',t);
  EXECUTE format('CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON organizer.%I FOR EACH ROW EXECUTE FUNCTION organizer_private.stamp()',t);
  EXECUTE format('CREATE POLICY module_create ON organizer.%I FOR INSERT TO authenticated WITH CHECK(organizer_private.has_permission(%L))',t,t||'.create');
  EXECUTE format('CREATE POLICY module_update ON organizer.%I FOR UPDATE TO authenticated USING(organizer_private.has_permission(%L)) WITH CHECK(organizer_private.has_permission(%L))',t,t||'.update',t||'.update');
  EXECUTE format('CREATE POLICY module_delete ON organizer.%I FOR DELETE TO authenticated USING(organizer_private.has_permission(%L))',t,t||'.delete');
  IF t IN ('package_categories','package_subcategories') THEN
   EXECUTE format('CREATE POLICY module_read ON organizer.%I FOR SELECT TO authenticated USING(organizer_private.has_permission(%L) OR organizer_private.has_permission(''packages.read'') OR organizer_private.has_permission(''package_gallery.read'') OR organizer_private.has_permission(''package_subcategories.read''))',t,t||'.read');
  ELSE
   EXECUTE format('CREATE POLICY module_read ON organizer.%I FOR SELECT TO authenticated USING(organizer_private.has_permission(%L))',t,t||'.read');
   EXECUTE format('CREATE TRIGGER publish_guard BEFORE INSERT OR UPDATE OR DELETE ON organizer.%I FOR EACH ROW EXECUTE FUNCTION organizer_private.guard_publish()',t);
  END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION organizer.list_data(p_module text,p_page integer DEFAULT 1,p_per_page integer DEFAULT 10,
 p_search text DEFAULT '',p_sort_by text DEFAULT NULL,p_sort_order text DEFAULT NULL,p_filters jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE cols text[]; search_cols text[]; filter_cols text[]; sort_col text; sort_direction text; q text; source_sql text; where_sql text:='true'; c text; n bigint; rows jsonb; pages bigint;
BEGIN
 IF p_module IS NULL OR NOT organizer_private.has_permission(CASE WHEN p_module='media_files' THEN 'media.read' ELSE p_module||'.read' END) THEN RAISE EXCEPTION 'Tidak memiliki izin membaca data' USING ERRCODE='42501'; END IF;
 CASE p_module
 WHEN 'package_categories' THEN cols:=ARRAY['name','sort_order','created_at'];search_cols:=ARRAY['name'];filter_cols:=ARRAY['is_active'];
 WHEN 'package_subcategories' THEN cols:=ARRAY['name','sort_order','created_at'];search_cols:=ARRAY['name','category_name'];filter_cols:=ARRAY['category_id','is_active'];
 WHEN 'packages' THEN cols:=ARRAY['name','price','sort_order','created_at'];search_cols:=ARRAY['name','category_name','subcategory_name'];filter_cols:=ARRAY['category_id','subcategory_id','package_kind','status'];
 WHEN 'package_gallery' THEN cols:=ARRAY['name','sort_order','created_at'];search_cols:=ARRAY['name','category_name','subcategory_name'];filter_cols:=ARRAY['category_id','subcategory_id','status'];
 WHEN 'events','positions' THEN cols:=ARRAY['name','sort_order','created_at'];search_cols:=ARRAY['name'];filter_cols:=ARRAY[]::text[];
 WHEN 'users' THEN cols:=ARRAY['name','email','created_at'];search_cols:=ARRAY['name','email'];filter_cols:=ARRAY['role_id','is_active'];
 WHEN 'roles' THEN cols:=ARRAY['name','code','created_at'];search_cols:=ARRAY['name','code'];filter_cols:=ARRAY['is_active'];
 WHEN 'permissions' THEN cols:=ARRAY['name','code','module'];search_cols:=ARRAY['name','code'];filter_cols:=ARRAY['module'];
 WHEN 'role_permissions' THEN cols:=ARRAY['code','module','created_at'];search_cols:=ARRAY['code','module'];filter_cols:=ARRAY['role_id','permission_id','module'];
 WHEN 'services' THEN cols:=ARRAY['title','sort_order','created_at'];search_cols:=ARRAY['title'];filter_cols:=ARRAY['status'];
 WHEN 'team_members' THEN cols:=ARRAY['name','sort_order','created_at'];search_cols:=ARRAY['name','role_title'];filter_cols:=ARRAY['status','position_id'];
 WHEN 'testimonials' THEN cols:=ARRAY['couple_name','venue','sort_order','created_at'];search_cols:=ARRAY['couple_name','venue','event_name'];filter_cols:=ARRAY['status','publication_consent','event_id'];
 WHEN 'social_links' THEN cols:=ARRAY['label','platform','sort_order'];search_cols:=ARRAY['label'];filter_cols:=ARRAY['platform','status'];
 WHEN 'media_files' THEN cols:=ARRAY['original_name','size_bytes','created_at'];search_cols:=ARRAY['original_name'];filter_cols:=ARRAY['kind','status'];
 ELSE RAISE EXCEPTION 'Modul tidak dikenal'; END CASE;
 IF p_page IS NULL OR p_page<1 OR p_per_page IS NULL OR p_per_page NOT IN (10,25,50,100) OR p_search IS NULL OR length(p_search)>100
 OR (p_sort_order IS NOT NULL AND p_sort_order NOT IN ('asc','desc')) OR p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' THEN RAISE EXCEPTION 'Parameter daftar tidak valid'; END IF;
 sort_col:=coalesce(p_sort_by,CASE WHEN 'sort_order'=ANY(cols) THEN 'sort_order' WHEN 'created_at'=ANY(cols) THEN 'created_at' ELSE cols[1] END);
 sort_direction:=coalesce(p_sort_order,CASE WHEN sort_col='created_at' THEN 'desc' ELSE 'asc' END);
 IF NOT sort_col=ANY(cols) THEN RAISE EXCEPTION 'Kolom urutan tidak diizinkan'; END IF;
 FOR c IN SELECT jsonb_object_keys(p_filters) LOOP
  IF NOT c=ANY(filter_cols) THEN RAISE EXCEPTION 'Filter tidak diizinkan: %',c; END IF;
 END LOOP;
 IF p_search<>'' AND cardinality(search_cols)>0 THEN
  where_sql:='(';
  FOREACH c IN ARRAY search_cols LOOP
   where_sql:=where_sql||format('position(lower($1) in lower(coalesce(t.%I::text,'''')))>0 OR ',c);
  END LOOP;
  where_sql:=left(where_sql,length(where_sql)-4)||')';
 END IF;
 where_sql:=where_sql||' AND to_jsonb(t) @> $2';
 source_sql:=CASE WHEN p_module='package_subcategories' THEN '(SELECT s.*,c.name AS category_name FROM organizer.package_subcategories s JOIN organizer.package_categories c ON c.id=s.category_id)' WHEN p_module IN ('packages','package_gallery') THEN format('(SELECT t.*,c.name AS category_name,s.name AS subcategory_name FROM organizer.%I t JOIN organizer.package_categories c ON c.id=t.category_id LEFT JOIN organizer.package_subcategories s ON s.id=t.subcategory_id)',p_module) WHEN p_module='role_permissions' THEN '(SELECT rp.*,p.code,p.module FROM organizer.role_permissions rp JOIN organizer.permissions p ON p.id=rp.permission_id)' WHEN p_module='team_members' THEN '(SELECT t.id,t.name,p.name AS role_title,t.position_id,t.biography,t.photo_media_id,t.sort_order,t.status,t.is_founder,t.created_at,t.updated_at,t.created_by,t.updated_by FROM organizer.team_members t JOIN organizer.positions p ON p.id=t.position_id)' WHEN p_module='testimonials' THEN '(SELECT t.*,e.name AS event_name FROM organizer.testimonials t LEFT JOIN organizer.events e ON e.id=t.event_id)' ELSE format('organizer.%I',p_module) END;
 q:=format('SELECT count(*) FROM %s t WHERE %s',source_sql,where_sql);
 EXECUTE q INTO n USING p_search,p_filters;
 q:=format('SELECT coalesce(jsonb_agg(to_jsonb(s)),''[]''::jsonb) FROM (SELECT t.* FROM %s t WHERE %s ORDER BY t.%I %s NULLS LAST,t.id ASC LIMIT $3 OFFSET $4) s',source_sql,where_sql,sort_col,sort_direction);
 EXECUTE q INTO rows USING p_search,p_filters,p_per_page,(p_page::bigint-1)*p_per_page;
 pages:=ceil(n::numeric/p_per_page)::bigint;
 RETURN jsonb_build_object('data',rows,'meta',jsonb_build_object('page',p_page,'per_page',p_per_page,'total_data',n,'total_pages',pages,'has_previous_page',n>0 AND p_page>1,'has_next_page',p_page<pages));
END $$;
GRANT EXECUTE ON FUNCTION organizer.list_data(text,integer,integer,text,text,text,jsonb) TO authenticated;


NOTIFY pgrst, 'reload schema';
COMMIT;
