import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
const source=await readFile(new URL('../supabase/functions/organizer-api/index.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const id='12345678-1234-4234-8234-123456789abc';
function runtime({link=false,profileFails=false,email='user@example.test',profileExists=false,login=false,authError=null,missingContext=false,missingAccessToken=false}={}) {
 const calls=[],warnings=[];let handler;
 const env={SUPABASE_URL:'https://supabase.test',SUPABASE_SERVICE_ROLE_KEY:'test-secret',SUPABASE_ANON_KEY:'test-public',ORGANIZER_ALLOWED_ORIGINS:'https://livina.test',ORGANIZER_LOGIN_HMAC_SECRET:'test-only-hmac-secret-longer-than-32-characters',ORGANIZER_TRUSTED_IP_HEADER:'test-client-ip'};
 const fetch=async(url,init={})=>{calls.push({url:String(url),method:init.method||'GET',headers:new Headers(init.headers),body:init.body});
  if(String(url).includes('/rpc/take_login_attempt'))return Response.json({blocked:false});
  if(String(url).includes('/rpc/record_login_result'))return Response.json(null);
  if(String(url).includes('/auth/v1/token'))return Response.json(authError||(missingAccessToken?{}:{access_token:'private-access-token',refresh_token:'private-refresh-token'}),{status:authError?400:200});
  if(String(url).includes('/auth/v1/user')&&!String(url).includes('/admin/'))return Response.json({id:'actor'});
  if(String(url).includes('/rpc/session_context'))return Response.json(missingContext?null:{user:{role:'admin'},permissions:[]});
  if(String(url).includes('/rest/v1/users?'))return Response.json(profileExists?[{id}]:[]);
  if(String(url).includes('/rest/v1/roles?'))return Response.json([{id}]);
  if(String(url).includes('/auth/v1/admin/users/'))return Response.json({id,email});
  if(String(url).includes('/auth/v1/invite'))return Response.json({id,email});
  if(String(url).endsWith('/rest/v1/users'))return Response.json(profileFails?{message:'conflict'}:[{id}],{status:profileFails?409:201});
  throw new Error('Unexpected request '+url);
 };
 vm.runInNewContext(compiled,{Deno:{env:{get:key=>env[key]},serve:fn=>{handler=fn;}},console:{warn:value=>warnings.push(JSON.parse(value))},fetch,crypto:webcrypto,TextEncoder,Uint8Array,URL,Response,Request});
 return {calls,warnings,invoke:()=>handler(new Request('https://supabase.test/functions/v1/organizer-api',{method:'POST',headers:{Origin:'https://livina.test',Authorization:'Bearer test-token','Content-Type':'application/json','test-client-ip':'192.0.2.1'},body:JSON.stringify(login?{action:'login',email:'user@example.test',password:'private-password'}:{action:'create-user',name:'Nama uji',email:'user@example.test',role_id:id,is_active:true,...(link?{auth_user_id:id}:{})})}))};
}
test('profil gagal tidak pernah menghapus akun Auth yang sudah diundang',async()=>{
 const run=runtime({profileFails:true});assert.equal((await run.invoke()).status,409);assert.ok(run.calls.some(call=>call.url.includes('/invite?redirect_to=')));assert.equal(run.calls.some(call=>call.method==='DELETE'),false);
});
test('menghubungkan akun Auth existing tidak mengirim undangan baru',async()=>{
 const run=runtime({link:true});assert.equal((await run.invoke()).status,201);assert.equal(run.calls.some(call=>call.url.includes('/invite')),false);assert.equal(run.calls.some(call=>call.method==='DELETE'),false);
});
test('email berbeda dengan akun Auth ditolak sebelum profil ditulis',async()=>{
 const run=runtime({link:true,email:'different@example.test'});assert.equal((await run.invoke()).status,422);assert.equal(run.calls.some(call=>call.url.endsWith('/rest/v1/users')),false);
});

test('pengguna existing ditolak sebelum undangan dikirim ulang',async()=>{const run=runtime({profileExists:true});assert.equal((await run.invoke()).status,409);assert.equal(run.calls.some(call=>call.url.includes('/invite')),false);});

test('diagnostik login membedakan CAPTCHA dan kredensial tanpa mencatat rahasia',async()=>{
 for(const code of ['captcha_failed','invalid_credentials']) {
  const run=runtime({login:true,authError:{error_code:code,message:'private-password private-captcha-token user@example.test'}});
  const response=await run.invoke();assert.equal(response.status,401);
  const body=await response.clone().json();assert.equal(body.code,code==='captcha_failed'?'CAPTCHA_FAILED':'AUTH_REJECTED');
  assert.deepEqual(run.warnings,[{event:'organizer_login_rejected',stage:'auth',status:400,code}]);
  assert.doesNotMatch(JSON.stringify(run.warnings),/private-|user@example/);
  assert.doesNotMatch(await response.text(),new RegExp(code));
 }
});

test('kode Auth tidak dikenal tidak menyalin pesan atau kode mentah ke log',async()=>{
 const run=runtime({login:true,authError:{error_code:'private-access-token',message:'user@example.test'}});
 assert.equal((await run.invoke()).status,401);assert.equal(run.warnings[0].code,'unknown');
 assert.doesNotMatch(JSON.stringify(run.warnings),/private-|user@example/);
});

test('Auth berhasil tetapi profil tidak aktif dibedakan dari kegagalan password',async()=>{
 const run=runtime({login:true,missingContext:true});const response=await run.invoke();assert.equal(response.status,401);
 assert.equal((await response.json()).code,'ACCOUNT_ACCESS_UNAVAILABLE');
 assert.deepEqual(run.warnings,[{event:'organizer_login_rejected',stage:'profile',code:'inactive_or_missing_context'}]);
});

test('login berhasil tidak menulis diagnostik penolakan atau token ke log',async()=>{
 const run=runtime({login:true});assert.equal((await run.invoke()).status,200);assert.deepEqual(run.warnings,[]);
 const auth=run.calls.find(call=>call.url.includes('/auth/v1/token'));
 assert.deepEqual(JSON.parse(auth.body),{email:'user@example.test',password:'private-password'});
});

test('RPC profil memakai key publik dan JWT user; limiter tetap service role',async()=>{
 const run=runtime({login:true});assert.equal((await run.invoke()).status,200);
 const profile=run.calls.find(call=>call.url.includes('/rpc/session_context'));
 assert.equal(profile.headers.get('apikey'),'test-public');
 assert.equal(profile.headers.get('authorization'),'Bearer private-access-token');
 for(const path of ['/rpc/take_login_attempt','/rpc/record_login_result']) {
  const internal=run.calls.find(call=>call.url.includes(path));
  assert.equal(internal.headers.get('apikey'),'test-secret');
  assert.equal(internal.headers.get('authorization'),'Bearer test-secret');
 }
});

test('aksi admin memeriksa konteks dengan JWT pengguna sebelum operasi service role',async()=>{
 const run=runtime({link:true});assert.equal((await run.invoke()).status,201);
 const profile=run.calls.find(call=>call.url.includes('/rpc/session_context'));
 assert.equal(profile.headers.get('apikey'),'test-public');
 assert.equal(profile.headers.get('authorization'),'Bearer test-token');
 const roles=run.calls.find(call=>call.url.includes('/rest/v1/roles?'));
 assert.equal(roles.headers.get('apikey'),'test-secret');
});

test('Auth tanpa access token tidak boleh jatuh ke RPC service role',async()=>{
 const run=runtime({login:true,missingAccessToken:true});assert.equal((await run.invoke()).status,503);
 assert.equal(run.calls.some(call=>call.url.includes('/rpc/session_context')),false);
 assert.equal(run.warnings[0].code,'invalid_auth_response');
});
