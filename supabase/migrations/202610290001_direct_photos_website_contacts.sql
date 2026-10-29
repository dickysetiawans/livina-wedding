BEGIN;
-- Keep existing content and the existing singleton constraint ('main').
ALTER TABLE organizer.media_files ADD COLUMN IF NOT EXISTS processing_mode text NOT NULL DEFAULT 'worker' CHECK (processing_mode IN ('worker','direct'));
CREATE OR REPLACE FUNCTION organizer.claim_media() RETURNS SETOF organizer.media_files
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE organizer.media_files SET status='processing',updated_at=now()
 WHERE id=(SELECT id FROM organizer.media_files WHERE processing_mode='worker' AND (status='pending' OR (status='processing' AND updated_at<now()-interval '30 minutes')) ORDER BY updated_at,id FOR UPDATE SKIP LOCKED LIMIT 1)
 RETURNING *;
$$;
REVOKE ALL ON FUNCTION organizer.claim_media() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION organizer.claim_media() TO service_role;

ALTER TABLE organizer.site_settings ADD COLUMN IF NOT EXISTS whatsapp_contacts jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE organizer.site_settings ALTER COLUMN whatsapp_number DROP NOT NULL;
-- Move the old number once, preserving it as the first contact. No data deleted.
UPDATE organizer.site_settings SET whatsapp_contacts=jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'label','WhatsApp','number',whatsapp_number,'message','','sort_order',0,'is_active',true)), whatsapp_number=NULL
 WHERE whatsapp_number IS NOT NULL AND whatsapp_contacts='[]'::jsonb;

CREATE OR REPLACE FUNCTION organizer_private.valid_whatsapp_contacts(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE item jsonb; ids text[]:=ARRAY[]::text[];
BEGIN
 IF value IS NULL OR jsonb_typeof(value)<>'array' OR jsonb_array_length(value)>50 THEN RETURN false; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(value) LOOP
  IF jsonb_typeof(item)<>'object'
   OR NOT (item ?& ARRAY['id','label','number','message','sort_order','is_active'])
   OR jsonb_typeof(item->'id')<>'string' OR (item->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR item->>'id'=ANY(ids)
   OR jsonb_typeof(item->'label')<>'string' OR length(btrim(item->>'label')) NOT BETWEEN 1 AND 100
   OR jsonb_typeof(item->'number')<>'string' OR (item->>'number') !~ '^\+[1-9][0-9]{7,14}$'
   OR jsonb_typeof(item->'message')<>'string' OR length(item->>'message')>1000
   OR jsonb_typeof(item->'sort_order')<>'number' OR (item->>'sort_order') !~ '^[0-9]+$' OR (item->>'sort_order')::numeric>2147483647
   OR jsonb_typeof(item->'is_active')<>'boolean' THEN RETURN false; END IF;
  ids:=array_append(ids,item->>'id');
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
REVOKE ALL ON FUNCTION organizer_private.valid_whatsapp_contacts(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION organizer_private.valid_whatsapp_contacts(jsonb) TO authenticated,service_role;
ALTER TABLE organizer.site_settings ADD CONSTRAINT website_whatsapp_contacts_valid CHECK (organizer_private.valid_whatsapp_contacts(whatsapp_contacts));
NOTIFY pgrst, 'reload schema';
COMMIT;
