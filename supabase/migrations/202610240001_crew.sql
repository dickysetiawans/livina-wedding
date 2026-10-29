-- Source khusus Livina. Pengguna menjalankan setelah tiga migration fondasi.
BEGIN;

-- Proyeksi eksplisit: tidak mengirim audit, draft, lokasi sumber, atau data akun.
CREATE FUNCTION organizer.public_crew() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',t.id,'name',t.name,'role_title',t.role_title,'biography',t.biography,
  'photo_media_id', CASE WHEN m.status='ready' AND m.kind='image'
    AND (m.is_decorative OR length(btrim(m.alt_text))>0) THEN m.id ELSE NULL END
 ) ORDER BY t.sort_order,t.id),'[]'::jsonb)
 FROM organizer.team_members t LEFT JOIN organizer.media_files m ON m.id=t.photo_media_id
 WHERE t.status='published';
$$;

CREATE FUNCTION organizer.public_crew_photo(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('path',m.storage_path)
 FROM organizer.media_files m WHERE m.id=p_id AND m.kind='image' AND m.status='ready'
 AND (m.is_decorative OR length(btrim(m.alt_text))>0)
 AND EXISTS(SELECT 1 FROM organizer.team_members t WHERE t.photo_media_id=m.id AND t.status='published');
$$;

REVOKE EXECUTE ON FUNCTION organizer.public_crew(),organizer.public_crew_photo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION organizer.public_crew(),organizer.public_crew_photo(uuid) TO anon,authenticated,service_role;
COMMIT;
