-- Additive migration. Apply once after 202610290001; no Auth/Storage reset.
BEGIN;
LOCK TABLE organizer.team_members,organizer.testimonials IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE organizer.events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(150) NOT NULL CHECK(length(btrim(name))>0),
 sort_order integer NOT NULL DEFAULT 0 CHECK(sort_order>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organizer.positions (LIKE organizer.events INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);
CREATE UNIQUE INDEX events_name_unique ON organizer.events(lower(btrim(name)));
CREATE UNIQUE INDEX positions_name_unique ON organizer.positions(lower(btrim(name)));
CREATE INDEX events_sort_idx ON organizer.events(sort_order,id);
CREATE INDEX positions_sort_idx ON organizer.positions(sort_order,id);

-- Reuse existing job titles, merging case/outer-space variants, preserving all
-- Crew IDs, biographies, photos, founder flags and publication status.
INSERT INTO organizer.positions(name,sort_order)
 SELECT DISTINCT ON (lower(btrim(role_title))) btrim(role_title),sort_order
 FROM organizer.team_members ORDER BY lower(btrim(role_title)),created_at,id;
ALTER TABLE organizer.team_members ADD COLUMN position_id uuid REFERENCES organizer.positions(id) ON DELETE RESTRICT;
UPDATE organizer.team_members t SET position_id=p.id FROM organizer.positions p WHERE lower(btrim(t.role_title))=lower(btrim(p.name));
ALTER TABLE organizer.team_members ALTER COLUMN position_id SET NOT NULL;
CREATE INDEX team_members_position_idx ON organizer.team_members(position_id);

ALTER TABLE organizer.testimonials ADD COLUMN event_id uuid REFERENCES organizer.events(id) ON DELETE RESTRICT;
CREATE INDEX testimonials_event_idx ON organizer.testimonials(event_id);
-- Existing testimonials remain unclassified until the admin selects an event.
-- New inserts/updates must choose one; no fabricated event is assigned.
ALTER TABLE organizer.testimonials ADD CONSTRAINT testimonials_event_required CHECK(event_id IS NOT NULL) NOT VALID;

CREATE FUNCTION organizer_private.link_crew_position() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 SELECT p.name INTO NEW.role_title FROM organizer.positions p WHERE p.id=NEW.position_id FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Jabatan tidak tersedia' USING ERRCODE='23503'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION organizer_private.link_crew_position() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION organizer_private.link_crew_position() TO service_role;
CREATE TRIGGER a_position_link BEFORE INSERT OR UPDATE ON organizer.team_members FOR EACH ROW EXECUTE FUNCTION organizer_private.link_crew_position();

INSERT INTO organizer.permissions(code,name,module)
 SELECT m||'.'||a,m||' — '||a,m FROM unnest(ARRAY['events','positions']) m CROSS JOIN unnest(ARRAY['read','create','update','delete']) a
 ON CONFLICT(code) DO NOTHING;
DO $$ DECLARE t text; consumer text; BEGIN
 FOREACH t IN ARRAY ARRAY['events','positions'] LOOP
  consumer:=CASE t WHEN 'events' THEN 'testimonials.read' ELSE 'team_members.read' END;
  EXECUTE format('ALTER TABLE organizer.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON organizer.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON organizer.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON organizer.%I TO service_role',t);
  EXECUTE format('CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON organizer.%I FOR EACH ROW EXECUTE FUNCTION organizer_private.stamp()',t);
  EXECUTE format('CREATE POLICY master_read ON organizer.%I FOR SELECT TO authenticated USING(organizer_private.has_permission(%L) OR organizer_private.has_permission(%L))',t,t||'.read',consumer);
  EXECUTE format('CREATE POLICY master_create ON organizer.%I FOR INSERT TO authenticated WITH CHECK(organizer_private.has_permission(%L))',t,t||'.create');
  EXECUTE format('CREATE POLICY master_update ON organizer.%I FOR UPDATE TO authenticated USING(organizer_private.has_permission(%L)) WITH CHECK(organizer_private.has_permission(%L))',t,t||'.update',t||'.update');
  EXECUTE format('CREATE POLICY master_delete ON organizer.%I FOR DELETE TO authenticated USING(organizer_private.has_permission(%L))',t,t||'.delete');
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION organizer.list_data(p_module text,p_page integer DEFAULT 1,p_per_page integer DEFAULT 10,
 p_search text DEFAULT '',p_sort_by text DEFAULT NULL,p_sort_order text DEFAULT NULL,p_filters jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE cols text[]; search_cols text[]; filter_cols text[]; sort_col text; sort_direction text; q text; source_sql text; where_sql text:='true'; c text; n bigint; rows jsonb; pages bigint;
BEGIN
 IF p_module IS NULL OR NOT organizer_private.has_permission(CASE WHEN p_module='media_files' THEN 'media.read' ELSE p_module||'.read' END) THEN RAISE EXCEPTION 'Tidak memiliki izin membaca data' USING ERRCODE='42501'; END IF;
 CASE p_module
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
 source_sql:=CASE WHEN p_module='role_permissions' THEN '(SELECT rp.*,p.code,p.module FROM organizer.role_permissions rp JOIN organizer.permissions p ON p.id=rp.permission_id)' WHEN p_module='team_members' THEN '(SELECT t.id,t.name,p.name AS role_title,t.position_id,t.biography,t.photo_media_id,t.sort_order,t.status,t.is_founder,t.created_at,t.updated_at,t.created_by,t.updated_by FROM organizer.team_members t JOIN organizer.positions p ON p.id=t.position_id)' WHEN p_module='testimonials' THEN '(SELECT t.*,e.name AS event_name FROM organizer.testimonials t LEFT JOIN organizer.events e ON e.id=t.event_id)' ELSE format('organizer.%I',p_module) END;
 q:=format('SELECT count(*) FROM %s t WHERE %s',source_sql,where_sql);
 EXECUTE q INTO n USING p_search,p_filters;
 q:=format('SELECT coalesce(jsonb_agg(to_jsonb(s)),''[]''::jsonb) FROM (SELECT t.* FROM %s t WHERE %s ORDER BY t.%I %s NULLS LAST,t.id ASC LIMIT $3 OFFSET $4) s',source_sql,where_sql,sort_col,sort_direction);
 EXECUTE q INTO rows USING p_search,p_filters,p_per_page,(p_page::bigint-1)*p_per_page;
 pages:=ceil(n::numeric/p_per_page)::bigint;
 RETURN jsonb_build_object('data',rows,'meta',jsonb_build_object('page',p_page,'per_page',p_per_page,'total_data',n,'total_pages',pages,'has_previous_page',n>0 AND p_page>1,'has_next_page',p_page<pages));
END $$;
GRANT EXECUTE ON FUNCTION organizer.list_data(text,integer,integer,text,text,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION organizer.public_crew() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'role_title',p.name,'position_id',p.id,'biography',t.biography,'photo_media_id',t.photo_media_id,'is_founder',t.is_founder,'sort_order',t.sort_order) ORDER BY t.is_founder DESC,t.sort_order,t.id),'[]'::jsonb)
 FROM organizer.team_members t JOIN organizer.positions p ON p.id=t.position_id WHERE t.status='published';
$$;
REVOKE ALL ON FUNCTION organizer.public_crew() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.public_crew() TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION organizer.public_content() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object(
 'settings',(SELECT to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] FROM organizer.site_settings s WHERE status='published'),
 'services',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.services s WHERE status='published'),
 'team_members',(SELECT coalesce(jsonb_agg((to_jsonb(t)-ARRAY['created_by','updated_by','created_at','updated_at'])||jsonb_build_object('role_title',p.name) ORDER BY t.sort_order,t.id),'[]'::jsonb) FROM organizer.team_members t JOIN organizer.positions p ON p.id=t.position_id WHERE t.status='published'),
 'testimonials',(SELECT coalesce(jsonb_agg((to_jsonb(t)-ARRAY['created_by','updated_by','created_at','updated_at','publication_consent','consent_recorded_at'])||jsonb_build_object('event_name',e.name,'event_sort_order',e.sort_order) ORDER BY t.sort_order,t.id),'[]'::jsonb) FROM organizer.testimonials t LEFT JOIN organizer.events e ON e.id=t.event_id WHERE t.status='published' AND t.publication_consent),
 'social_links',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.social_links s WHERE status='published'),
 'media',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind,'storage_path',m.storage_path,'mime_type',m.mime_type,'size_bytes',m.size_bytes,'width',m.width,'height',m.height,'duration_seconds',m.duration_seconds,'poster_media_id',m.poster_media_id,'alt_text',m.alt_text,'is_decorative',m.is_decorative)),'[]'::jsonb) FROM organizer.media_files m WHERE m.status='ready' AND organizer_private.media_published(m.id)));
$$;
REVOKE ALL ON FUNCTION organizer.public_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.public_content() TO anon,authenticated,service_role;


NOTIFY pgrst, 'reload schema';
COMMIT;
