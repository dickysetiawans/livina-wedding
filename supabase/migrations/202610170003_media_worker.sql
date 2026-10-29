BEGIN;
CREATE FUNCTION organizer.claim_media() RETURNS SETOF organizer.media_files
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE organizer.media_files SET status='processing',updated_at=now()
 WHERE id=(SELECT id FROM organizer.media_files WHERE status='pending' OR (status='processing' AND updated_at<now()-interval '30 minutes') ORDER BY updated_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
 RETURNING *;
$$;
GRANT EXECUTE ON FUNCTION organizer.claim_media() TO service_role;
-- Cabut juga grant default global proyek sebelum menerapkan allowlist akhir.
REVOKE ALL ON ALL TABLES IN SCHEMA organizer_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA organizer FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA organizer,organizer_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION organizer.session_context(),organizer.list_data(text,integer,integer,text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION organizer.public_content() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION organizer_private.has_permission(text),organizer_private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION organizer_private.can_read_media(text,text) TO anon,authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA organizer,organizer_private TO service_role;
COMMIT;
