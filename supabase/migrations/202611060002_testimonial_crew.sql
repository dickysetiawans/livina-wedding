-- Apply after 202611060001. Per-event Crew roles with optional photo/video.
BEGIN;
ALTER TABLE organizer.testimonials ADD COLUMN crew_assignments jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(crew_assignments)='array' AND jsonb_array_length(crew_assignments)<=50);
CREATE TABLE organizer.testimonial_crew (
 id uuid PRIMARY KEY, testimonial_id uuid NOT NULL REFERENCES organizer.testimonials(id) ON DELETE CASCADE,
 crew_id uuid NOT NULL REFERENCES organizer.team_members(id) ON DELETE RESTRICT,
 position_id uuid NOT NULL REFERENCES organizer.positions(id) ON DELETE RESTRICT,
 position_name varchar(150) NOT NULL,
 photo_media_id uuid REFERENCES organizer.media_files(id) ON DELETE RESTRICT,
 video_media_id uuid REFERENCES organizer.media_files(id) ON DELETE RESTRICT,
 sort_order integer NOT NULL CHECK(sort_order>=0),UNIQUE(testimonial_id,crew_id)
);
CREATE INDEX testimonial_crew_parent_idx ON organizer.testimonial_crew(testimonial_id,sort_order);
ALTER TABLE organizer.testimonial_crew ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON organizer.testimonial_crew FROM PUBLIC,anon,authenticated;
GRANT SELECT ON organizer.testimonial_crew TO authenticated;
GRANT ALL ON organizer.testimonial_crew TO service_role;
CREATE POLICY assignment_read ON organizer.testimonial_crew FOR SELECT TO authenticated USING(organizer_private.has_permission('testimonials.read'));
-- Writes go through the parent testimonial trigger, keeping its existing CRUD/publish permissions.
CREATE FUNCTION organizer_private.validate_testimonial_crew() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry jsonb; normalized jsonb:='[]'; role_name text; member_name text; assignment_id uuid; member_id uuid; job_id uuid; photo_id uuid; video_id uuid; members uuid[]:='{}'; ids uuid[]:='{}';
BEGIN
 IF jsonb_typeof(NEW.crew_assignments)<>'array' OR jsonb_array_length(NEW.crew_assignments)>50 THEN RAISE EXCEPTION 'Penugasan tidak valid' USING ERRCODE='23514'; END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(NEW.crew_assignments) LOOP
  assignment_id:=(entry->>'id')::uuid;member_id:=(entry->>'crew_id')::uuid;job_id:=(entry->>'position_id')::uuid;photo_id:=nullif(entry->>'photo_media_id','')::uuid;video_id:=nullif(entry->>'video_media_id','')::uuid;
  IF assignment_id IS NULL OR member_id IS NULL OR job_id IS NULL OR assignment_id=ANY(ids) OR member_id=ANY(members) THEN RAISE EXCEPTION 'Penugasan duplikat/tidak lengkap' USING ERRCODE='23514'; END IF;
  SELECT name INTO member_name FROM organizer.team_members WHERE id=member_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Crew tidak tersedia' USING ERRCODE='23503'; END IF;
  SELECT position_name INTO role_name FROM organizer.testimonial_crew WHERE id=assignment_id AND testimonial_id=NEW.id AND crew_id=member_id AND position_id=job_id;
  IF NOT FOUND THEN SELECT name INTO role_name FROM organizer.positions WHERE id=job_id;IF NOT FOUND THEN RAISE EXCEPTION 'Jabatan tidak tersedia' USING ERRCODE='23503';END IF; END IF;
  PERFORM organizer_private.require_media(photo_id,'image',NEW.status='published');PERFORM organizer_private.require_media(video_id,'video',NEW.status='published');
  normalized:=normalized||jsonb_build_array(jsonb_build_object('id',assignment_id,'crew_id',member_id,'position_id',job_id,'position_name',role_name,'crew_name',member_name,'photo_media_id',photo_id,'video_media_id',video_id));
  ids:=array_append(ids,assignment_id);members:=array_append(members,member_id);
 END LOOP;
 NEW.crew_assignments:=normalized;RETURN NEW;
END $$;
CREATE FUNCTION organizer_private.sync_testimonial_crew() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 DELETE FROM organizer.testimonial_crew WHERE testimonial_id=NEW.id;
 INSERT INTO organizer.testimonial_crew(id,testimonial_id,crew_id,position_id,position_name,photo_media_id,video_media_id,sort_order)
 SELECT (value->>'id')::uuid,NEW.id,(value->>'crew_id')::uuid,(value->>'position_id')::uuid,value->>'position_name',(value->>'photo_media_id')::uuid,(value->>'video_media_id')::uuid,(ordinality-1)::integer FROM jsonb_array_elements(NEW.crew_assignments) WITH ORDINALITY;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION organizer_private.validate_testimonial_crew(),organizer_private.sync_testimonial_crew() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION organizer_private.validate_testimonial_crew(),organizer_private.sync_testimonial_crew() TO service_role;
CREATE TRIGGER assignment_validate BEFORE INSERT OR UPDATE ON organizer.testimonials FOR EACH ROW EXECUTE FUNCTION organizer_private.validate_testimonial_crew();
CREATE TRIGGER assignment_sync AFTER INSERT OR UPDATE ON organizer.testimonials FOR EACH ROW EXECUTE FUNCTION organizer_private.sync_testimonial_crew();
CREATE FUNCTION organizer_private.public_testimonial_crew(parent_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'crew_id',c.id,'name',c.name,'position_name',a.position_name,'photo_media_id',CASE WHEN pm.status='ready' THEN pm.id END,'video_media_id',CASE WHEN vm.status='ready' THEN vm.id END) ORDER BY a.sort_order,a.id),'[]'::jsonb)
 FROM organizer.testimonial_crew a JOIN organizer.testimonials t ON t.id=a.testimonial_id JOIN organizer.team_members c ON c.id=a.crew_id AND c.status='published'
 LEFT JOIN organizer.media_files pm ON pm.id=coalesce(a.photo_media_id,c.photo_media_id) AND pm.kind='image'
 LEFT JOIN organizer.media_files vm ON vm.id=a.video_media_id AND vm.kind='video'
 WHERE a.testimonial_id=parent_id AND t.status='published' AND t.publication_consent;
$$;
REVOKE ALL ON FUNCTION organizer_private.public_testimonial_crew(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION organizer_private.public_testimonial_crew(uuid) TO service_role;
CREATE OR REPLACE FUNCTION organizer_private.media_published(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
  SELECT 1 FROM organizer.testimonial_crew a JOIN organizer.testimonials t ON t.id=a.testimonial_id JOIN organizer.team_members c ON c.id=a.crew_id WHERE t.status='published' AND t.publication_consent AND c.status='published' AND p_id IN (a.photo_media_id,a.video_media_id)
  UNION ALL SELECT 1 FROM organizer.testimonial_crew a JOIN organizer.testimonials t ON t.id=a.testimonial_id JOIN organizer.team_members c ON c.id=a.crew_id JOIN organizer.media_files m ON m.id=a.video_media_id WHERE t.status='published' AND t.publication_consent AND c.status='published' AND m.poster_media_id=p_id
  UNION ALL
  SELECT 1 FROM organizer.package_gallery g JOIN organizer.package_categories c ON c.id=g.category_id LEFT JOIN organizer.package_subcategories s ON s.id=g.subcategory_id WHERE g.photo_media_id=p_id AND g.status='published' AND c.is_active AND (g.subcategory_id IS NULL OR s.is_active)
  UNION ALL
  SELECT 1 FROM organizer.site_settings WHERE status='published' AND p_id IN (logo_media_id,hero_video_id,hero_poster_id)
  UNION ALL SELECT 1 FROM organizer.services WHERE status='published' AND image_media_id=p_id
  UNION ALL SELECT 1 FROM organizer.team_members WHERE status='published' AND photo_media_id=p_id
  UNION ALL SELECT 1 FROM organizer.testimonials WHERE status='published' AND publication_consent AND p_id IN (photo_media_id,video_media_id)
  UNION ALL SELECT 1 FROM organizer.site_settings s JOIN organizer.media_files m ON m.id=s.hero_video_id WHERE s.status='published' AND m.poster_media_id=p_id
  UNION ALL SELECT 1 FROM organizer.testimonials t JOIN organizer.media_files m ON m.id=t.video_media_id WHERE t.status='published' AND t.publication_consent AND m.poster_media_id=p_id
 );
$$;

CREATE OR REPLACE FUNCTION organizer.public_content() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object(
 'package_catalog',organizer.public_packages(),
 'settings',(SELECT to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] FROM organizer.site_settings s WHERE status='published'),
 'services',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.services s WHERE status='published'),
 'team_members',(SELECT coalesce(jsonb_agg((to_jsonb(t)-ARRAY['created_by','updated_by','created_at','updated_at'])||jsonb_build_object('role_title',p.name,'position_sort_order',p.sort_order) ORDER BY t.sort_order,t.id),'[]'::jsonb) FROM organizer.team_members t JOIN organizer.positions p ON p.id=t.position_id WHERE t.status='published'),
 'testimonials',(SELECT coalesce(jsonb_agg((to_jsonb(t)-ARRAY['created_by','updated_by','created_at','updated_at','publication_consent','consent_recorded_at'])||jsonb_build_object('event_name',e.name,'event_sort_order',e.sort_order,'created_at',t.created_at,'crew_assignments',organizer_private.public_testimonial_crew(t.id)) ORDER BY t.created_at DESC,t.id DESC),'[]'::jsonb) FROM organizer.testimonials t LEFT JOIN organizer.events e ON e.id=t.event_id WHERE t.status='published' AND t.publication_consent),
 'social_links',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.social_links s WHERE status='published'),
 'media',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind,'storage_path',m.storage_path,'mime_type',m.mime_type,'size_bytes',m.size_bytes,'width',m.width,'height',m.height,'duration_seconds',m.duration_seconds,'poster_media_id',m.poster_media_id,'alt_text',m.alt_text,'is_decorative',m.is_decorative)),'[]'::jsonb) FROM organizer.media_files m WHERE m.status='ready' AND organizer_private.media_published(m.id)));
$$;
REVOKE ALL ON FUNCTION organizer.public_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.public_content() TO anon,authenticated,service_role;




NOTIFY pgrst, 'reload schema';
COMMIT;
