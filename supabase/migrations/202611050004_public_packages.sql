-- Public package projection. Apply after 202611050003; preserves existing public sections.
BEGIN;
CREATE OR REPLACE FUNCTION organizer.public_packages() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object(
 'categories',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'has_subcategories',c.has_subcategories,'sort_order',c.sort_order) ORDER BY c.sort_order,c.id),'[]'::jsonb) FROM organizer.package_categories c WHERE c.is_active),
 'subcategories',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'category_id',s.category_id,'name',s.name,'sort_order',s.sort_order) ORDER BY s.sort_order,s.id),'[]'::jsonb) FROM organizer.package_subcategories s JOIN organizer.package_categories c ON c.id=s.category_id WHERE s.is_active AND c.is_active),
 'packages',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'category_id',p.category_id,'subcategory_id',p.subcategory_id,'package_kind',p.package_kind,'price',p.price,'benefits',p.benefits,'sort_order',p.sort_order) ORDER BY p.sort_order,p.id),'[]'::jsonb) FROM organizer.packages p JOIN organizer.package_categories c ON c.id=p.category_id LEFT JOIN organizer.package_subcategories s ON s.id=p.subcategory_id WHERE p.status='published' AND c.is_active AND (p.subcategory_id IS NULL OR s.is_active)),
 'gallery',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'category_id',g.category_id,'subcategory_id',g.subcategory_id,'photo_media_id',g.photo_media_id,'caption',g.caption,'sort_order',g.sort_order) ORDER BY g.sort_order,g.id),'[]'::jsonb) FROM organizer.package_gallery g JOIN organizer.package_categories c ON c.id=g.category_id LEFT JOIN organizer.package_subcategories s ON s.id=g.subcategory_id JOIN organizer.media_files m ON m.id=g.photo_media_id AND m.status='ready' AND m.kind='image' WHERE g.status='published' AND c.is_active AND (g.subcategory_id IS NULL OR s.is_active))
 );
$$;
REVOKE ALL ON FUNCTION organizer.public_packages() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.public_packages() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION organizer_private.media_published(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
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
 'testimonials',(SELECT coalesce(jsonb_agg((to_jsonb(t)-ARRAY['created_by','updated_by','created_at','updated_at','publication_consent','consent_recorded_at'])||jsonb_build_object('event_name',e.name,'event_sort_order',e.sort_order,'created_at',t.created_at) ORDER BY t.created_at DESC,t.id DESC),'[]'::jsonb) FROM organizer.testimonials t LEFT JOIN organizer.events e ON e.id=t.event_id WHERE t.status='published' AND t.publication_consent),
 'social_links',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.social_links s WHERE status='published'),
 'media',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind,'storage_path',m.storage_path,'mime_type',m.mime_type,'size_bytes',m.size_bytes,'width',m.width,'height',m.height,'duration_seconds',m.duration_seconds,'poster_media_id',m.poster_media_id,'alt_text',m.alt_text,'is_decorative',m.is_decorative)),'[]'::jsonb) FROM organizer.media_files m WHERE m.status='ready' AND organizer_private.media_published(m.id)));
$$;
REVOKE ALL ON FUNCTION organizer.public_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.public_content() TO anon,authenticated,service_role;



NOTIFY pgrst, 'reload schema';
COMMIT;
