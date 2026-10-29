BEGIN;
CREATE FUNCTION organizer.session_context() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('user',jsonb_build_object('id',u.id,'name',u.name,'email',u.email,'role_id',r.id,'role',r.code),
 'permissions',(SELECT coalesce(jsonb_agg(p.code),'[]'::jsonb) FROM organizer.permissions p
 WHERE r.code='admin' OR EXISTS(SELECT 1 FROM organizer.role_permissions rp WHERE rp.role_id=r.id AND rp.permission_id=p.id)))
 FROM organizer.users u JOIN organizer.roles r ON r.id=u.role_id WHERE u.id=auth.uid() AND u.is_active AND r.is_active;
$$;
GRANT EXECUTE ON FUNCTION organizer.session_context() TO authenticated;

CREATE FUNCTION organizer.list_data(p_module text,p_page integer DEFAULT 1,p_per_page integer DEFAULT 10,
 p_search text DEFAULT '',p_sort_by text DEFAULT NULL,p_sort_order text DEFAULT NULL,p_filters jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE cols text[]; search_cols text[]; filter_cols text[]; sort_col text; sort_direction text; q text; source_sql text; where_sql text:='true'; c text; n bigint; rows jsonb; pages bigint;
BEGIN
 IF p_module IS NULL OR NOT organizer_private.has_permission(CASE WHEN p_module='media_files' THEN 'media.read' ELSE p_module||'.read' END) THEN RAISE EXCEPTION 'Tidak memiliki izin membaca data' USING ERRCODE='42501'; END IF;
 CASE p_module
 WHEN 'users' THEN cols:=ARRAY['name','email','created_at'];search_cols:=ARRAY['name','email'];filter_cols:=ARRAY['role_id','is_active'];
 WHEN 'roles' THEN cols:=ARRAY['name','code','created_at'];search_cols:=ARRAY['name','code'];filter_cols:=ARRAY['is_active'];
 WHEN 'permissions' THEN cols:=ARRAY['name','code','module'];search_cols:=ARRAY['name','code'];filter_cols:=ARRAY['module'];
 WHEN 'role_permissions' THEN cols:=ARRAY['code','module','created_at'];search_cols:=ARRAY['code','module'];filter_cols:=ARRAY['role_id','permission_id','module'];
 WHEN 'services' THEN cols:=ARRAY['title','sort_order','created_at'];search_cols:=ARRAY['title'];filter_cols:=ARRAY['status'];
 WHEN 'team_members' THEN cols:=ARRAY['name','sort_order','created_at'];search_cols:=ARRAY['name','role_title'];filter_cols:=ARRAY['status'];
 WHEN 'testimonials' THEN cols:=ARRAY['couple_name','venue','sort_order','created_at'];search_cols:=ARRAY['couple_name','venue'];filter_cols:=ARRAY['status','publication_consent'];
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
 source_sql:=CASE WHEN p_module='role_permissions' THEN '(SELECT rp.*,p.code,p.module FROM organizer.role_permissions rp JOIN organizer.permissions p ON p.id=rp.permission_id)' ELSE format('organizer.%I',p_module) END;
 q:=format('SELECT count(*) FROM %s t WHERE %s',source_sql,where_sql);
 EXECUTE q INTO n USING p_search,p_filters;
 q:=format('SELECT coalesce(jsonb_agg(to_jsonb(s)),''[]''::jsonb) FROM (SELECT t.* FROM %s t WHERE %s ORDER BY t.%I %s NULLS LAST,t.id ASC LIMIT $3 OFFSET $4) s',source_sql,where_sql,sort_col,sort_direction);
 EXECUTE q INTO rows USING p_search,p_filters,p_per_page,(p_page::bigint-1)*p_per_page;
 pages:=ceil(n::numeric/p_per_page)::bigint;
 RETURN jsonb_build_object('data',rows,'meta',jsonb_build_object('page',p_page,'per_page',p_per_page,'total_data',n,'total_pages',pages,'has_previous_page',n>0 AND p_page>1,'has_next_page',p_page<pages));
END $$;
GRANT EXECUTE ON FUNCTION organizer.list_data(text,integer,integer,text,text,text,jsonb) TO authenticated;

CREATE FUNCTION organizer_private.media_published(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(
 SELECT 1 FROM organizer.site_settings WHERE status='published' AND p_id IN (logo_media_id,hero_video_id,hero_poster_id)
 UNION ALL SELECT 1 FROM organizer.services WHERE status='published' AND image_media_id=p_id
 UNION ALL SELECT 1 FROM organizer.team_members WHERE status='published' AND photo_media_id=p_id
 UNION ALL SELECT 1 FROM organizer.testimonials WHERE status='published' AND publication_consent AND photo_media_id=p_id
 UNION ALL SELECT 1 FROM organizer.site_settings s JOIN organizer.media_files m ON m.id=s.hero_video_id WHERE s.status='published' AND m.poster_media_id=p_id
 );
$$;
CREATE FUNCTION organizer_private.can_read_media(p_bucket text,p_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM organizer.media_files m WHERE m.storage_bucket=p_bucket AND m.storage_path=p_path AND m.status='ready'
 AND (organizer_private.has_permission('media.read') OR organizer_private.media_published(m.id)));
$$;
GRANT USAGE ON SCHEMA organizer_private TO anon;
GRANT EXECUTE ON FUNCTION organizer_private.can_read_media(text,text) TO anon,authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
 ('organizer-staging','organizer-staging',false,41943040,ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
 ('organizer-media','organizer-media',false,20971520,ARRAY['image/webp','video/mp4']);
CREATE POLICY organizer_read_results ON storage.objects FOR SELECT TO anon,authenticated
 USING (bucket_id='organizer-media' AND organizer_private.can_read_media(bucket_id,name));
-- Tidak ada policy tulis/hapus browser; server/worker melalui Storage API.

CREATE FUNCTION organizer.public_content() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object(
 'settings',(SELECT to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] FROM organizer.site_settings s WHERE status='published'),
 'services',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.services s WHERE status='published'),
 'team_members',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.team_members s WHERE status='published'),
 'testimonials',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at','publication_consent','consent_recorded_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.testimonials s WHERE status='published' AND publication_consent),
 'social_links',(SELECT coalesce(jsonb_agg(to_jsonb(s)-ARRAY['created_by','updated_by','created_at','updated_at'] ORDER BY sort_order,id),'[]'::jsonb) FROM organizer.social_links s WHERE status='published'),
 'media',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind,'storage_path',m.storage_path,'mime_type',m.mime_type,'size_bytes',m.size_bytes,'width',m.width,'height',m.height,'duration_seconds',m.duration_seconds,'poster_media_id',m.poster_media_id,'alt_text',m.alt_text,'is_decorative',m.is_decorative)),'[]'::jsonb) FROM organizer.media_files m WHERE m.status='ready' AND organizer_private.media_published(m.id)));
$$;
GRANT EXECUTE ON FUNCTION organizer.public_content() TO anon,authenticated;

CREATE FUNCTION organizer_private.take_login_attempt(p_account text,p_ip text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b timestamptz; v organizer_private.login_ip_minutes; t timestamptz:=clock_timestamp();
BEGIN
 IF p_account IS NULL OR p_ip IS NULL OR p_account !~ '^[a-f0-9]{64}$' OR p_ip !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Identitas limiter tidak valid'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(170026,2);
 INSERT INTO organizer_private.login_rate_limits(scope,key_hash,expires_at) VALUES ('account',p_account,t+interval '30 minutes'),('ip',p_ip,t+interval '30 minutes') ON CONFLICT DO NOTHING;
 UPDATE organizer_private.login_rate_limits SET failure_count=0,window_started_at=t,blocked_until=NULL WHERE ((scope='account' AND key_hash=p_account) OR (scope='ip' AND key_hash=p_ip)) AND window_started_at<=t-interval '15 minutes' AND coalesce(blocked_until,t)<=t;
 SELECT max(blocked_until) INTO b FROM organizer_private.login_rate_limits WHERE (scope='account' AND key_hash=p_account) OR (scope='ip' AND key_hash=p_ip);
 IF b>t THEN RETURN jsonb_build_object('blocked',true,'retry_after_seconds',ceil(extract(epoch FROM b-t))); END IF;
 INSERT INTO organizer_private.login_ip_minutes VALUES (p_ip,t,0) ON CONFLICT DO NOTHING;
 UPDATE organizer_private.login_ip_minutes SET window_started_at=t,attempt_count=0 WHERE key_hash=p_ip AND window_started_at<=t-interval '1 minute';
 UPDATE organizer_private.login_ip_minutes SET attempt_count=attempt_count+1 WHERE key_hash=p_ip RETURNING * INTO v;
 UPDATE organizer_private.login_rate_limits SET attempt_count=attempt_count+1,expires_at=t+interval '30 minutes',updated_at=t WHERE (scope='account' AND key_hash=p_account) OR (scope='ip' AND key_hash=p_ip);
 RETURN jsonb_build_object('blocked',v.attempt_count>5,'retry_after_seconds',CASE WHEN v.attempt_count>5 THEN greatest(1,ceil(extract(epoch FROM v.window_started_at+interval '1 minute'-t))) ELSE 0 END);
END $$;
CREATE FUNCTION organizer_private.record_login_result(p_account text,p_ip text,p_success boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t timestamptz:=clock_timestamp();
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(170026,2);
 IF p_success THEN
  UPDATE organizer_private.login_rate_limits SET failure_count=0,blocked_until=NULL,window_started_at=t WHERE scope='account' AND key_hash=p_account;
 ELSE
  UPDATE organizer_private.login_rate_limits SET failure_count=failure_count+1,
   blocked_until=CASE WHEN failure_count+1>=CASE scope WHEN 'account' THEN 5 ELSE 20 END THEN t+interval '15 minutes' ELSE blocked_until END,
   expires_at=t+interval '30 minutes',updated_at=t
  WHERE (scope='account' AND key_hash=p_account) OR (scope='ip' AND key_hash=p_ip);
 END IF;
END $$;
-- Wrapper Data API hanya service_role untuk Edge Function; private tetap tidak diekspos.
CREATE FUNCTION organizer.take_login_attempt(p_account text,p_ip text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT organizer_private.take_login_attempt(p_account,p_ip); $$;
CREATE FUNCTION organizer.record_login_result(p_account text,p_ip text,p_success boolean) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT organizer_private.record_login_result(p_account,p_ip,p_success); $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA organizer_private TO service_role;
GRANT EXECUTE ON FUNCTION organizer.take_login_attempt(text,text),organizer.record_login_result(text,text,boolean) TO service_role;
CREATE FUNCTION organizer.cleanup_login_limits() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(170026,2);
 DELETE FROM organizer_private.login_rate_limits WHERE expires_at<now() AND coalesce(blocked_until,now())<=now();
 DELETE FROM organizer_private.login_ip_minutes WHERE window_started_at<now()-interval '2 minutes';
END $$;
GRANT EXECUTE ON FUNCTION organizer.cleanup_login_limits() TO service_role;
COMMIT;
