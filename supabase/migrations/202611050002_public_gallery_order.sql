-- Apply after 202611050001. Public read projection only; no rows or tables changed.
BEGIN;
CREATE OR REPLACE FUNCTION organizer.public_content() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object(
 'settings',(SELECT to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] FROM organizer.site_settings s WHERE status='published'),
 'services',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.services s WHERE status='published'),
 'team_members',(SELECT coalesce(jsonb_agg((to_jsonb(t)-ARRAY['created_by','updated_by','created_at','updated_at'])||jsonb_build_object('role_title',p.name,'position_sort_order',p.sort_order) ORDER BY t.sort_order,t.id),'[]'::jsonb) FROM organizer.team_members t JOIN organizer.positions p ON p.id=t.position_id WHERE t.status='published'),
 'testimonials',(SELECT coalesce(jsonb_agg((to_jsonb(t)-ARRAY['created_by','updated_by','created_at','updated_at','publication_consent','consent_recorded_at'])||jsonb_build_object('event_name',e.name,'event_sort_order',e.sort_order,'created_at',t.created_at) ORDER BY t.created_at DESC,t.id DESC),'[]'::jsonb) FROM organizer.testimonials t LEFT JOIN organizer.events e ON e.id=t.event_id WHERE t.status='published' AND t.publication_consent),
 'social_links',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.social_links s WHERE status='published'),
 'media',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind,'storage_path',m.storage_path,'mime_type',m.mime_type,'size_bytes',m.size_bytes,'width',m.width,'height',m.height,'duration_seconds',m.duration_seconds,'poster_media_id',m.poster_media_id,'alt_text',m.alt_text,'is_decorative',m.is_decorative)),'[]'::jsonb) FROM organizer.media_files m WHERE m.status='ready' AND organizer_private.media_published(m.id)));
$$;
REVOKE ALL ON FUNCTION organizer.public_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.public_content() TO anon,authenticated,service_role;


NOTIFY pgrst, 'reload schema';
COMMIT;
