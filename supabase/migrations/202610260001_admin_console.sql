-- Tambahan untuk fondasi organizer yang sudah ada. Jalankan setelah migration 20261017.
-- Tidak menghapus/membuat ulang schema atau akun Auth. Migration dijalankan pengguna.
BEGIN;
DO $$ BEGIN
 IF to_regclass('organizer.users') IS NULL OR to_regprocedure('organizer.session_context()') IS NULL THEN
  RAISE EXCEPTION 'Fondasi organizer belum lengkap. Periksa migration 202610170001 dan 202610170002 terlebih dahulu.';
 END IF;
END $$;

ALTER TABLE organizer.team_members ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false;
ALTER TABLE organizer.site_settings ADD COLUMN IF NOT EXISTS film_title varchar(300);
CREATE UNIQUE INDEX IF NOT EXISTS team_members_one_founder ON organizer.team_members(is_founder) WHERE is_founder;
ALTER TABLE organizer.testimonials ADD COLUMN IF NOT EXISTS video_media_id uuid REFERENCES organizer.media_files(id) ON DELETE RESTRICT;
-- Foto boleh kosong pada draft; wajib saat terbit agar seed tidak mengarang media siap.
ALTER TABLE organizer.testimonials ALTER COLUMN photo_media_id DROP NOT NULL;
ALTER TABLE organizer.testimonials ADD CONSTRAINT testimonials_published_photo CHECK(status <> 'published' OR photo_media_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS testimonials_video_idx ON organizer.testimonials(video_media_id);

CREATE TABLE organizer.templates (
 code text PRIMARY KEY CHECK(code IN ('style-1','style-2')),
 name text NOT NULL,
 description text NOT NULL
);
INSERT INTO organizer.templates(code,name,description) VALUES
 ('style-1','Style 1','Editorial gelap dengan animasi foto mengikuti kursor.'),
 ('style-2','Style 2','Ivory dan espresso, tipografi elegan dengan foto berukuran ringkas.');
CREATE TABLE organizer.template_selection (
 singleton_key text PRIMARY KEY DEFAULT 'main' CHECK(singleton_key='main'),
 template_code text NOT NULL DEFAULT 'style-1' REFERENCES organizer.templates(code) ON DELETE RESTRICT,
 updated_by uuid REFERENCES organizer.users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO organizer.template_selection(singleton_key,template_code) VALUES ('main','style-1');
ALTER TABLE organizer.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer.template_selection ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON organizer.templates,organizer.template_selection FROM anon,authenticated;
GRANT SELECT ON organizer.templates,organizer.template_selection TO authenticated;
GRANT ALL ON organizer.templates,organizer.template_selection TO service_role;
CREATE POLICY template_read ON organizer.templates FOR SELECT TO authenticated USING(organizer_private.has_permission('templates.read'));
CREATE POLICY selection_read ON organizer.template_selection FOR SELECT TO authenticated USING(organizer_private.has_permission('templates.read'));
INSERT INTO organizer.permissions(code,name,module) VALUES
 ('templates.read','Lihat template','templates'),('templates.update','Pilih template aktif','templates')
ON CONFLICT(code) DO NOTHING;

CREATE FUNCTION organizer.public_template() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce((SELECT template_code FROM organizer.template_selection WHERE singleton_key='main'),'style-1');
$$;
REVOKE ALL ON FUNCTION organizer.public_template() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.public_template() TO anon,authenticated,service_role;
CREATE FUNCTION organizer.set_template(p_code text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT organizer_private.has_permission('templates.update') THEN RAISE EXCEPTION 'Tidak memiliki izin' USING ERRCODE='42501'; END IF;
 IF p_code IS NULL OR p_code NOT IN ('style-1','style-2') THEN RAISE EXCEPTION 'Template tidak tersedia'; END IF;
 UPDATE organizer.template_selection SET template_code=p_code,updated_by=auth.uid(),updated_at=now() WHERE singleton_key='main';
 RETURN p_code;
END $$;
REVOKE ALL ON FUNCTION organizer.set_template(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.set_template(text) TO authenticated;

CREATE FUNCTION organizer.set_role_permissions(p_role_id uuid,p_permission_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r organizer.roles; supplied integer;
BEGIN
 IF NOT organizer_private.is_admin() THEN RAISE EXCEPTION 'Khusus administrator' USING ERRCODE='42501'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(170026,1);
 SELECT * INTO r FROM organizer.roles WHERE id=p_role_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Role tidak ditemukan'; END IF;
 IF r.code='admin' THEN RAISE EXCEPTION 'Role admin sistem selalu memiliki seluruh izin'; END IF;
 IF p_permission_ids IS NULL OR cardinality(p_permission_ids)>200 THEN RAISE EXCEPTION 'Daftar izin tidak valid'; END IF;
 SELECT count(DISTINCT id) INTO supplied FROM organizer.permissions WHERE id=ANY(p_permission_ids);
 IF supplied<>(SELECT count(DISTINCT item) FROM unnest(p_permission_ids) item) OR array_position(p_permission_ids,NULL) IS NOT NULL THEN
  RAISE EXCEPTION 'Permission tidak ditemukan';
 END IF;
 DELETE FROM organizer.role_permissions WHERE role_id=p_role_id;
 INSERT INTO organizer.role_permissions(role_id,permission_id) SELECT p_role_id,item FROM (SELECT DISTINCT unnest(p_permission_ids) item) selected;
END $$;
REVOKE ALL ON FUNCTION organizer.set_role_permissions(uuid,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.set_role_permissions(uuid,uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION organizer_private.validate_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
  PERFORM organizer_private.require_media(NEW.video_media_id,'video',published);
  IF NEW.publication_consent THEN
   IF TG_OP='INSERT' THEN NEW.consent_recorded_at:=now();
   ELSIF NOT OLD.publication_consent THEN NEW.consent_recorded_at:=now();
   ELSE NEW.consent_recorded_at:=coalesce(OLD.consent_recorded_at,now()); END IF;
  ELSE NEW.consent_recorded_at:=NULL; END IF;
  IF NEW.consent_recorded_at>now() THEN RAISE EXCEPTION 'Waktu persetujuan tidak boleh di masa depan'; END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION organizer_private.guard_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND EXISTS(
  SELECT 1 FROM organizer.site_settings WHERE OLD.id IN (logo_media_id,hero_video_id,hero_poster_id)
  UNION ALL SELECT 1 FROM organizer.services WHERE image_media_id=OLD.id
  UNION ALL SELECT 1 FROM organizer.team_members WHERE photo_media_id=OLD.id
  UNION ALL SELECT 1 FROM organizer.testimonials WHERE OLD.id IN (photo_media_id,video_media_id)
  UNION ALL SELECT 1 FROM organizer.media_files WHERE poster_media_id=OLD.id
 ) AND (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN
  RAISE EXCEPTION 'Media yang sedang dipakai tidak dapat diubah; buat hasil pengganti';
 END IF;
 IF NEW.status='ready' AND NEW.kind='video' THEN PERFORM organizer_private.require_media(NEW.poster_media_id,'image',false); END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION organizer_private.media_published(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM organizer.site_settings WHERE status='published' AND p_id IN (logo_media_id,hero_video_id,hero_poster_id)
  UNION ALL SELECT 1 FROM organizer.services WHERE status='published' AND image_media_id=p_id
  UNION ALL SELECT 1 FROM organizer.team_members WHERE status='published' AND photo_media_id=p_id
  UNION ALL SELECT 1 FROM organizer.testimonials WHERE status='published' AND publication_consent AND p_id IN (photo_media_id,video_media_id)
  UNION ALL SELECT 1 FROM organizer.site_settings s JOIN organizer.media_files m ON m.id=s.hero_video_id WHERE s.status='published' AND m.poster_media_id=p_id
  UNION ALL SELECT 1 FROM organizer.testimonials t JOIN organizer.media_files m ON m.id=t.video_media_id WHERE t.status='published' AND t.publication_consent AND m.poster_media_id=p_id
 );
$$;

-- Aman bila migration crew sebelumnya belum diimpor: definisi proyeksi eksplisit.
CREATE OR REPLACE FUNCTION organizer.public_crew() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'role_title',t.role_title,'biography',t.biography,'photo_media_id',t.photo_media_id,'is_founder',t.is_founder,'sort_order',t.sort_order) ORDER BY t.is_founder DESC,t.sort_order,t.id),'[]'::jsonb) FROM organizer.team_members t WHERE t.status='published';
$$;
CREATE OR REPLACE FUNCTION organizer.public_crew_photo(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('storage_path',m.storage_path) FROM organizer.media_files m WHERE m.id=p_id AND m.kind='image' AND m.status='ready' AND EXISTS(SELECT 1 FROM organizer.team_members t WHERE t.photo_media_id=m.id AND t.status='published');
$$;
REVOKE ALL ON FUNCTION organizer.public_crew(),organizer.public_crew_photo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.public_crew(),organizer.public_crew_photo(uuid) TO anon,authenticated,service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
