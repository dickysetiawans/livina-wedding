-- Target: proyek Supabase organizer terpisah. Dijalankan pengguna, bukan agen.
BEGIN;
CREATE SCHEMA organizer;
CREATE SCHEMA organizer_private;
REVOKE ALL ON SCHEMA organizer, organizer_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA organizer TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA organizer_private TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA organizer REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA organizer_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE organizer.roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code varchar(50) NOT NULL UNIQUE CHECK (code ~ '^[a-z][a-z0-9_]*$'),
 name varchar(100) NOT NULL CHECK (length(btrim(name)) > 0),
 description varchar(500), is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organizer.permissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code varchar(100) NOT NULL UNIQUE CHECK (code ~ '^[a-z_]+\.[a-z_]+$'),
 name varchar(100) NOT NULL CHECK (length(btrim(name)) > 0),
 module varchar(50) NOT NULL CHECK (length(btrim(module)) > 0), description varchar(500),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organizer.users (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
 role_id uuid NOT NULL REFERENCES organizer.roles(id) ON DELETE RESTRICT,
 name varchar(150) NOT NULL CHECK (length(btrim(name)) > 0),
 email varchar(254) NOT NULL CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 phone varchar(20) CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{7,14}$'),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON organizer.users(lower(email));
CREATE INDEX users_role_idx ON organizer.users(role_id);
CREATE TABLE organizer.role_permissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 role_id uuid NOT NULL REFERENCES organizer.roles(id) ON DELETE CASCADE,
 permission_id uuid NOT NULL REFERENCES organizer.permissions(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(role_id, permission_id)
);
CREATE INDEX role_permissions_permission_idx ON organizer.role_permissions(permission_id);

CREATE TABLE organizer.media_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('image','video')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed')),
 original_name varchar(255) NOT NULL CHECK (length(btrim(original_name)) > 0),
 source_path text, storage_bucket text, storage_path text, mime_type varchar(100),
 source_size_bytes bigint NOT NULL CHECK (source_size_bytes > 0),
 size_bytes bigint CHECK (size_bytes > 0), width integer CHECK (width > 0), height integer CHECK (height > 0),
 duration_seconds numeric CHECK (duration_seconds > 0),
 poster_media_id uuid REFERENCES organizer.media_files(id) ON DELETE RESTRICT,
 alt_text varchar(300), is_decorative boolean NOT NULL DEFAULT false, error_code varchar(100),
 uploaded_by uuid NOT NULL REFERENCES organizer.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(storage_bucket,storage_path), CHECK (poster_media_id IS DISTINCT FROM id),
 CHECK ((kind='image' AND source_size_bytes<=5242880 AND duration_seconds IS NULL)
     OR (kind='video' AND source_size_bytes<=41943040)),
 CHECK (status <> 'ready' OR (
   storage_bucket IS NOT NULL AND storage_bucket='organizer-media' AND storage_path IS NOT NULL
   AND storage_path !~ '(^/|\.\.)' AND size_bytes IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL
   AND ((kind='image' AND mime_type IS NOT NULL AND mime_type='image/webp' AND storage_path ~ '\.webp$'
         AND greatest(width,height)<=1920 AND size_bytes<=5242880)
     OR (kind='video' AND mime_type IS NOT NULL AND mime_type='video/mp4' AND storage_path ~ '\.mp4$'
         AND greatest(width,height)<=1920 AND least(width,height)<=1080 AND size_bytes<=20971520
         AND duration_seconds IS NOT NULL AND duration_seconds<=60 AND poster_media_id IS NOT NULL))))
);
CREATE INDEX media_owner_idx ON organizer.media_files(uploaded_by,created_at);
CREATE INDEX media_kind_status_idx ON organizer.media_files(kind,status,created_at);
CREATE INDEX media_poster_idx ON organizer.media_files(poster_media_id);

CREATE TABLE organizer.site_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 singleton_key varchar(30) NOT NULL UNIQUE DEFAULT 'main' CHECK (singleton_key='main'),
 brand_name varchar(150) NOT NULL CHECK (length(btrim(brand_name))>0),
 hero_title varchar(200) NOT NULL CHECK (length(btrim(hero_title))>0),
 hero_subtitle varchar(300) NOT NULL CHECK (length(btrim(hero_subtitle))>0),
 logo_media_id uuid REFERENCES organizer.media_files(id) ON DELETE RESTRICT,
 hero_video_id uuid REFERENCES organizer.media_files(id) ON DELETE RESTRICT,
 hero_poster_id uuid REFERENCES organizer.media_files(id) ON DELETE RESTRICT,
 contact_email varchar(254) NOT NULL CHECK (contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 whatsapp_number varchar(20) NOT NULL CHECK (whatsapp_number ~ '^\+[1-9][0-9]{7,14}$'),
 copyright_start_year smallint NOT NULL CHECK (copyright_start_year>=1900),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 created_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 updated_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (hero_video_id IS NULL OR hero_poster_id IS NOT NULL)
);
CREATE TABLE organizer.services (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title varchar(150) NOT NULL CHECK (length(btrim(title))>0),
 slug varchar(160) NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 summary varchar(500) NOT NULL CHECK (length(btrim(summary))>0),
 description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 10000), highlight varchar(300),
 image_media_id uuid REFERENCES organizer.media_files(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order>=0),
 created_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 updated_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organizer.team_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(150) NOT NULL CHECK (length(btrim(name))>0),
 role_title varchar(150) NOT NULL CHECK (length(btrim(role_title))>0),
 biography varchar(2000) NOT NULL CHECK (length(btrim(biography))>0),
 photo_media_id uuid REFERENCES organizer.media_files(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order>=0),
 created_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 updated_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE organizer.testimonials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 couple_name varchar(200) NOT NULL CHECK (length(btrim(couple_name))>0),
 venue varchar(200) NOT NULL CHECK (length(btrim(venue))>0),
 excerpt varchar(1000) NOT NULL CHECK (length(btrim(excerpt))>0),
 full_review text CHECK (length(full_review)<=10000),
 photo_media_id uuid NOT NULL REFERENCES organizer.media_files(id) ON DELETE RESTRICT,
 publication_consent boolean NOT NULL DEFAULT false, consent_recorded_at timestamptz,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order>=0),
 created_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 updated_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (status<>'published' OR (publication_consent AND consent_recorded_at IS NOT NULL))
);
CREATE TABLE organizer.social_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 platform varchar(30) NOT NULL CHECK (platform IN ('instagram','tiktok','threads','bridestory','website','other')),
 label varchar(100) NOT NULL CHECK (length(btrim(label))>0),
 url varchar(2048) NOT NULL CHECK (url ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]+)?([/?#][^[:space:]]*)?$' AND url !~ '@'),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order>=0),
 created_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 updated_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (platform IN ('website','other') OR
  (platform='instagram' AND url ~ '^https://(www\.)?instagram\.com(/|$)') OR
  (platform='tiktok' AND url ~ '^https://(www\.)?tiktok\.com(/|$)') OR
  (platform='threads' AND url ~ '^https://(www\.)?threads\.(com|net)(/|$)') OR
  (platform='bridestory' AND url ~ '^https://(www\.)?bridestory\.com(/|$)'))
);

CREATE TABLE organizer_private.login_rate_limits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 scope text NOT NULL CHECK (scope IN ('account','ip')), key_hash text NOT NULL CHECK (key_hash ~ '^[a-f0-9]{64}$'),
 window_started_at timestamptz NOT NULL DEFAULT now(), attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count>=0),
 failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count>=0), blocked_until timestamptz,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(scope,key_hash)
);
CREATE INDEX login_expiry_idx ON organizer_private.login_rate_limits(expires_at);
CREATE TABLE organizer_private.login_ip_minutes (
 key_hash text PRIMARY KEY CHECK (key_hash ~ '^[a-f0-9]{64}$'),
 window_started_at timestamptz NOT NULL, attempt_count integer NOT NULL CHECK(attempt_count>=0)
);

CREATE FUNCTION organizer_private.has_permission(p_code text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM organizer.users u JOIN organizer.roles r ON r.id=u.role_id
 WHERE u.id=auth.uid() AND u.is_active AND r.is_active AND
 (r.code='admin' OR EXISTS(SELECT 1 FROM organizer.role_permissions rp JOIN organizer.permissions p ON p.id=rp.permission_id
 WHERE rp.role_id=r.id AND p.code=p_code)));
$$;
CREATE FUNCTION organizer_private.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM organizer.users u JOIN organizer.roles r ON r.id=u.role_id
 WHERE u.id=auth.uid() AND u.is_active AND r.is_active AND r.code='admin');
$$;
GRANT EXECUTE ON FUNCTION organizer_private.has_permission(text), organizer_private.is_admin() TO authenticated;

CREATE FUNCTION organizer_private.stamp() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN NEW.id:=OLD.id; NEW.created_at:=OLD.created_at; END IF;
 NEW.updated_at:=now();
 IF pg_trigger_depth()=1 AND TG_TABLE_NAME IN ('site_settings','services','team_members','testimonials','social_links') THEN
  IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); ELSE NEW.created_by:=OLD.created_by; END IF;
  NEW.updated_by:=auth.uid();
 END IF;
 RETURN NEW;
END $$;

-- Kunci statement sebelum baris akun/role dikunci, untuk serialisasi perubahan admin.
CREATE FUNCTION organizer_private.lock_access() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN PERFORM pg_catalog.pg_advisory_xact_lock(170026,1); RETURN NULL; END $$;
CREATE FUNCTION organizer_private.guard_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_email text;
BEGIN
 IF TG_TABLE_NAME='roles' THEN
  IF TG_OP<>'INSERT' AND OLD.code='admin' THEN
   IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Role admin sistem tidak dapat dihapus'; END IF;
   IF NEW.code<>'admin' OR NOT NEW.is_active THEN RAISE EXCEPTION 'Role admin sistem harus tetap aktif'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP<>'INSERT' AND OLD.is_active AND EXISTS(SELECT 1 FROM organizer.roles WHERE id=OLD.role_id AND code='admin') THEN
  IF TG_OP='DELETE' OR NOT NEW.is_active OR NEW.role_id IS DISTINCT FROM OLD.role_id THEN
   IF NOT EXISTS(SELECT 1 FROM organizer.users u JOIN organizer.roles r ON r.id=u.role_id WHERE u.id<>OLD.id AND u.is_active AND r.code='admin' AND r.is_active) THEN
    RAISE EXCEPTION 'Administrator aktif terakhir tidak dapat dihapus atau dinonaktifkan';
   END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NOT EXISTS(SELECT 1 FROM organizer.roles WHERE id=NEW.role_id AND is_active) THEN RAISE EXCEPTION 'Role harus aktif'; END IF;
 SELECT lower(btrim(email)) INTO v_email FROM auth.users WHERE id=NEW.id;
 IF v_email IS NULL THEN RAISE EXCEPTION 'Akun Auth dengan email wajib tersedia'; END IF;
 NEW.email:=v_email;
 RETURN NEW;
END $$;
CREATE TRIGGER access_lock BEFORE INSERT OR UPDATE OR DELETE ON organizer.users FOR EACH STATEMENT EXECUTE FUNCTION organizer_private.lock_access();
CREATE TRIGGER access_guard BEFORE INSERT OR UPDATE OR DELETE ON organizer.users FOR EACH ROW EXECUTE FUNCTION organizer_private.guard_access();
CREATE TRIGGER access_lock BEFORE INSERT OR UPDATE OR DELETE ON organizer.roles FOR EACH STATEMENT EXECUTE FUNCTION organizer_private.lock_access();
CREATE TRIGGER access_guard BEFORE INSERT OR UPDATE OR DELETE ON organizer.roles FOR EACH ROW EXECUTE FUNCTION organizer_private.guard_access();
CREATE FUNCTION organizer_private.sync_auth_email() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN UPDATE organizer.users SET email=lower(btrim(NEW.email)) WHERE id=NEW.id; RETURN NEW; END $$;
CREATE TRIGGER organizer_sync_email AFTER UPDATE OF email ON auth.users FOR EACH ROW
 WHEN (OLD.email IS DISTINCT FROM NEW.email) EXECUTE FUNCTION organizer_private.sync_auth_email();

CREATE FUNCTION organizer_private.require_media(p_id uuid,p_kind text,p_public boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE m organizer.media_files;
BEGIN
 IF p_id IS NULL THEN RETURN; END IF;
 SELECT * INTO m FROM organizer.media_files WHERE id=p_id FOR SHARE;
 IF NOT FOUND OR m.status<>'ready' OR m.kind<>p_kind THEN RAISE EXCEPTION 'Media harus siap dan berjenis %',p_kind; END IF;
 IF p_public AND m.kind='image' AND NOT m.is_decorative AND coalesce(length(btrim(m.alt_text)),0)=0 THEN RAISE EXCEPTION 'Deskripsi foto wajib diisi'; END IF;
END $$;
CREATE FUNCTION organizer_private.validate_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE published boolean:=NEW.status='published';
BEGIN
 IF TG_TABLE_NAME='site_settings' THEN
  IF NEW.copyright_start_year>extract(year FROM now()) THEN RAISE EXCEPTION 'Tahun hak cipta tidak boleh melebihi tahun berjalan'; END IF;
  PERFORM organizer_private.require_media(NEW.logo_media_id,'image',published);
  PERFORM organizer_private.require_media(NEW.hero_poster_id,'image',published);
  PERFORM organizer_private.require_media(NEW.hero_video_id,'video',published);
 ELSIF TG_TABLE_NAME='services' THEN PERFORM organizer_private.require_media(NEW.image_media_id,'image',published);
 ELSIF TG_TABLE_NAME IN ('team_members','testimonials') THEN PERFORM organizer_private.require_media(NEW.photo_media_id,'image',published);
 END IF;
 IF TG_TABLE_NAME='testimonials' THEN
  IF NEW.consent_recorded_at>now() THEN RAISE EXCEPTION 'Waktu persetujuan tidak boleh di masa depan'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION organizer_private.guard_publish() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_code text;
BEGIN
 -- Jalur service_role tetap memerlukan pemeriksaan pengguna pada endpoint server.
 IF current_user IN ('anon','authenticated') THEN
  v_code:=TG_TABLE_NAME||'.publish';
  IF (TG_OP='INSERT' AND NEW.status='published') OR
     (TG_OP='UPDATE' AND (OLD.status='published' OR NEW.status='published')) OR
     (TG_OP='DELETE' AND OLD.status='published') THEN
   IF NOT organizer_private.has_permission(v_code) THEN RAISE EXCEPTION 'Tidak memiliki izin publikasi'; END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;

CREATE FUNCTION organizer_private.guard_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND EXISTS(
  SELECT 1 FROM organizer.site_settings WHERE OLD.id IN (logo_media_id,hero_video_id,hero_poster_id)
  UNION ALL SELECT 1 FROM organizer.services WHERE image_media_id=OLD.id
  UNION ALL SELECT 1 FROM organizer.team_members WHERE photo_media_id=OLD.id
  UNION ALL SELECT 1 FROM organizer.testimonials WHERE photo_media_id=OLD.id
  UNION ALL SELECT 1 FROM organizer.media_files WHERE poster_media_id=OLD.id
 ) AND (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN
  RAISE EXCEPTION 'Media yang sedang dipakai tidak dapat diubah; buat hasil pengganti';
 END IF;
 IF NEW.status='ready' AND NEW.kind='video' THEN PERFORM organizer_private.require_media(NEW.poster_media_id,'image',false); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER media_guard BEFORE INSERT OR UPDATE ON organizer.media_files FOR EACH ROW EXECUTE FUNCTION organizer_private.guard_media();

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['roles','permissions','users','role_permissions','site_settings','services','team_members','testimonials','social_links','media_files'] LOOP
  EXECUTE format('ALTER TABLE organizer.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON organizer.%I FROM anon, authenticated',t);
  EXECUTE format('GRANT ALL ON organizer.%I TO service_role',t);
  EXECUTE format('CREATE TRIGGER stamp BEFORE INSERT OR UPDATE ON organizer.%I FOR EACH ROW EXECUTE FUNCTION organizer_private.stamp()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['site_settings','services','team_members','testimonials','social_links'] LOOP
  EXECUTE format('CREATE TRIGGER content_validate BEFORE INSERT OR UPDATE ON organizer.%I FOR EACH ROW EXECUTE FUNCTION organizer_private.validate_content()',t);
  EXECUTE format('CREATE TRIGGER publish_guard BEFORE INSERT OR UPDATE OR DELETE ON organizer.%I FOR EACH ROW EXECUTE FUNCTION organizer_private.guard_publish()',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON organizer.%I TO authenticated',t);
  EXECUTE format('CREATE POLICY admin_read ON organizer.%I FOR SELECT TO authenticated USING (organizer_private.has_permission(%L))',t,t||'.read');
  EXECUTE format('CREATE POLICY admin_create ON organizer.%I FOR INSERT TO authenticated WITH CHECK (organizer_private.has_permission(%L))',t,t||'.create');
  EXECUTE format('CREATE POLICY admin_update ON organizer.%I FOR UPDATE TO authenticated USING (organizer_private.has_permission(%L)) WITH CHECK (organizer_private.has_permission(%L))',t,t||'.update',t||'.update');
  EXECUTE format('CREATE POLICY admin_delete ON organizer.%I FOR DELETE TO authenticated USING (organizer_private.has_permission(%L))',t,t||'.delete');
  IF t<>'site_settings' THEN EXECUTE format('CREATE INDEX ON organizer.%I(status,sort_order,id)',t); END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['roles','permissions','role_permissions'] LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON organizer.%I TO authenticated',t);
  EXECUTE format('CREATE POLICY access_admin ON organizer.%I FOR ALL TO authenticated USING (organizer_private.is_admin()) WITH CHECK (organizer_private.is_admin())',t);
  EXECUTE format('CREATE POLICY access_read ON organizer.%I FOR SELECT TO authenticated USING (organizer_private.has_permission(%L))',t,t||'.read');
 END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE,DELETE ON organizer.users TO authenticated;
CREATE POLICY users_read ON organizer.users FOR SELECT TO authenticated USING (
 organizer_private.has_permission('users.read') OR (id=auth.uid() AND is_active AND organizer_private.has_permission('profile.read')));
CREATE POLICY users_admin ON organizer.users FOR ALL TO authenticated USING (organizer_private.is_admin()) WITH CHECK (organizer_private.is_admin());
GRANT SELECT ON organizer.media_files TO authenticated;
CREATE POLICY media_read ON organizer.media_files FOR SELECT TO authenticated USING (organizer_private.has_permission('media.read'));
ALTER TABLE organizer_private.login_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_private.login_ip_minutes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON ALL TABLES IN SCHEMA organizer_private TO service_role;

-- Hanya metadata akses sistem; tidak ada akun/konten contoh.
INSERT INTO organizer.roles(code,name) VALUES ('admin','Administrator'),('editor','Pengelola konten');
INSERT INTO organizer.permissions(code,name,module)
SELECT m||'.'||a,m||' — '||a,m FROM unnest(ARRAY['services','team_members','testimonials','social_links','site_settings']) m
CROSS JOIN unnest(ARRAY['read','create','update','delete','publish']) a;
INSERT INTO organizer.permissions(code,name,module)
SELECT m||'.'||a,m||' — '||a,m FROM unnest(ARRAY['users','roles','permissions','role_permissions','media']) m
CROSS JOIN unnest(ARRAY['read','create','update','delete']) a;
INSERT INTO organizer.permissions(code,name,module) VALUES ('profile.read','Baca profil sendiri','profile');
-- Editor awal tanpa hak: pemilik menentukan mapping secara eksplisit.

-- Indeks seluruh FK konten/audit, tanpa menyentuh tabel lama.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT c.table_name,c.column_name FROM information_schema.columns c
 WHERE c.table_schema='organizer' AND (c.column_name LIKE '%media_id' OR c.column_name IN ('hero_video_id','hero_poster_id','created_by','updated_by')) LOOP
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON organizer.%I(%I)',r.table_name||'_'||r.column_name||'_idx',r.table_name,r.column_name);
 END LOOP;
END $$;

COMMIT;
