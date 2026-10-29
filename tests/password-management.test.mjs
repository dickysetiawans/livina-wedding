import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

const actorId='12345678-1234-4234-8234-123456789abc';
const targetId='22345678-1234-4234-8234-123456789abc';
const edgeSource=await readFile(new URL('../supabase/functions/organizer-api/index.ts',import.meta.url),'utf8');
const edge=ts.transpileModule(edgeSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
function runtime({role='admin',wrongPassword=false,mismatchedProof=false,missingTarget=false,limited=false,expired=false,updateFails=false}={}) {
 const calls=[];let handler;
 const env={SUPABASE_URL:'https://supabase.test',SUPABASE_SERVICE_ROLE_KEY:'test-service',SUPABASE_ANON_KEY:'test-public',ORGANIZER_ALLOWED_ORIGINS:'https://livina.test',ORGANIZER_LOGIN_HMAC_SECRET:'only-test-secret-longer-than-32-characters',ORGANIZER_TRUSTED_IP_HEADER:'test-ip'};
 const fetch=async(url,init={})=>{
  calls.push({url:String(url),method:init.method||'GET',headers:new Headers(init.headers),body:init.body});
  if(String(url).includes('/auth/v1/user')&&init.method!=='PUT')return Response.json(expired?{}:{id:actorId,email:'actor@example.test'},{status:expired?401:200});
  if(String(url).includes('/rpc/session_context'))return Response.json({user:{id:actorId,role},permissions:['users.update']});
  if(String(url).includes('/rpc/take_login_attempt'))return Response.json({blocked:limited,retry_after_seconds:60});
  if(String(url).includes('/rpc/record_login_result'))return Response.json(null);
  if(String(url).includes('/auth/v1/token'))return Response.json(wrongPassword?{error_code:'invalid_credentials'}:{user:{id:mismatchedProof?targetId:actorId},access_token:'test-reauth-token',refresh_token:'never-return-this'},{status:wrongPassword?400:200});
  if(String(url).includes('/rest/v1/users?'))return Response.json(missingTarget?[]:[{id:targetId}]);
  if(init.method==='PUT')return Response.json(updateFails?{error_code:'weak_password'}:{id:targetId},{status:updateFails?422:200});
  if(String(url).includes('/auth/v1/logout?'))return new Response(null,{status:204});
  throw new Error('Unexpected call '+url);
 };
 vm.runInNewContext(edge,{Deno:{env:{get:key=>env[key]},serve:fn=>{handler=fn;}},fetch,crypto:webcrypto,TextEncoder,Uint8Array,URL,Response,Request,AbortSignal,console:{warn:()=>{throw new Error('Unexpected log');}}});
 return {calls,invoke:(input,token=true)=>handler(new Request('https://supabase.test/functions/v1/organizer-api',{method:'POST',headers:{origin:'https://livina.test','test-ip':'192.0.2.1','Content-Type':'application/json',...(token?{Authorization:'Bearer actor-token'}:{})},body:JSON.stringify(input)}))};
}
const reset={action:'reset-password',user_id:targetId,current_password:'CurrentPassword123',password:'NewPassword456'};
const change={action:'change-password',current_password:'CurrentPassword123',password:'NewPassword456'};
const updates=run=>run.calls.filter(call=>call.method==='PUT');

test('pengguna anonim atau JWT tidak sah tidak dapat mengganti password',async()=>{
 const anonymous=runtime();assert.equal((await anonymous.invoke(reset,false)).status,401);assert.equal(updates(anonymous).length,0);
 const expired=runtime({expired:true});assert.equal((await expired.invoke(reset)).status,401);assert.equal(updates(expired).length,0);
});
test('editor dengan grant users.update tidak dapat mereset pengguna lain',async()=>{
 const run=runtime({role:'editor'});assert.equal((await run.invoke(reset)).status,403);assert.equal(updates(run).length,0);
 assert.equal(run.calls.some(call=>call.url.includes('/token?')),false);
});
test('password admin salah dan bukti identitas berbeda ditolak sebelum update',async()=>{
 for(const options of [{wrongPassword:true},{mismatchedProof:true}]) {
  const run=runtime(options);const response=await run.invoke(reset);assert.equal(response.status,422);assert.equal((await response.json()).code,'PASSWORD_CURRENT_INVALID');assert.equal(updates(run).length,0);
 }
});
test('validasi password dan target mencegah reautentikasi atau update yang tidak valid',async()=>{
 for(const value of [{...reset,password:'short'},{...reset,user_id:'bad-id'},{...reset,user_id:actorId},{...change,password:change.current_password},{...change,current_password:''}]) {
  const run=runtime();assert.equal((await run.invoke(value)).status,422);assert.equal(updates(run).length,0);assert.equal(run.calls.some(call=>call.url.includes('/token?')),false);
 }
});
test('limiter menolak percobaan password berlebih sebelum Auth dipanggil',async()=>{
 const run=runtime({limited:true});const response=await run.invoke(reset);assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'60');assert.equal(run.calls.some(call=>call.url.includes('/token?')),false);
});
test('reset hanya memperbarui password target yang ada, tanpa email atau atribut role',async()=>{
 const run=runtime();const response=await run.invoke({...reset,email:'forged@example.test',role:'admin',email_confirm:true});assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{ok:true,sign_out:false});
 assert.equal(updates(run).length,1);const update=updates(run)[0];
 assert.equal(update.url,'https://supabase.test/auth/v1/admin/users/'+targetId);assert.equal(update.headers.get('authorization'),'Bearer test-service');
 assert.deepEqual(JSON.parse(update.body),{password:reset.password});
 assert.equal(run.calls.some(call=>/\/invite|\/recover|\/generate_link/.test(call.url)),false);
 assert.ok(run.calls.some(call=>call.url.includes('/logout?scope=local')));
});
test('profil target yang tidak ada tidak dapat direset',async()=>{
 const run=runtime({missingTarget:true});assert.equal((await run.invoke(reset)).status,404);assert.equal(updates(run).length,0);assert.ok(run.calls.some(call=>call.url.includes('/logout?scope=local')));
});
test('ganti password sendiri menggunakan JWT reautentikasi, bukan service role',async()=>{
 const run=runtime({role:'editor'});const response=await run.invoke({...change,user_id:targetId});assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,sign_out:true});
 const update=updates(run)[0];assert.equal(update.url,'https://supabase.test/auth/v1/user');assert.equal(update.headers.get('apikey'),'test-public');assert.equal(update.headers.get('authorization'),'Bearer test-reauth-token');assert.deepEqual(JSON.parse(update.body),{password:change.password,current_password:change.current_password});
});
test('kegagalan update Auth tidak dilaporkan sebagai sukses dan sesi sementara ditutup',async()=>{
 const run=runtime({updateFails:true});const response=await run.invoke(change);assert.equal(response.status,422);assert.equal((await response.json()).code,'PASSWORD_WEAK');assert.ok(run.calls.some(call=>call.url.includes('/logout?scope=local')));
});

async function load(path,dependencies={}) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const entry=new Module('password-management.cjs');entry.require=name=>{if(name in dependencies)return dependencies[name];throw new Error('Unexpected dependency '+name);};entry._compile(compiled,'password-management.cjs');return entry.exports;
}
const rules=await load('../src/lib/auth/password.ts');
let session={token:'actor-token',context:{user:{id:actorId,role:'admin'},permissions:[]}},forwarded=[],cleared=0,upstreamStatus=200;
const proxy=await load('../src/app/api/organizer/[...path]/route.ts',{
 '@/lib/auth/server':{privateHeaders:{'Cache-Control':'no-store'},sameOrigin:r=>r.headers.get('origin')===new URL(r.url).origin,routeSession:async()=>session,clearServerSession:async()=>{cleared++;},supabaseFetch:async(...args)=>{forwarded.push(args);return Response.json({ok:upstreamStatus===200},{status:upstreamStatus});}},
 '@/lib/admin/modules':{moduleCodes:[],modules:{}},'@/lib/crew/validation':{},'@/lib/auth/password':rules
});
const request=(value,origin='https://livina.test')=>proxy.POST(new Request('https://livina.test/api/organizer/functions/v1/organizer-api',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(value)}),{params:Promise.resolve({path:['functions','v1','organizer-api']})});

test('proxy menolak CSRF dan reset non-admin sebelum diteruskan',async()=>{
 forwarded=[];assert.equal((await request(reset,'https://foreign.test')).status,403);
 session={...session,context:{...session.context,user:{id:actorId,role:'editor'}}};assert.equal((await request(reset)).status,403);assert.equal(forwarded.length,0);
 session={...session,context:{...session.context,user:{id:actorId,role:'admin'}}};
});
test('proxy membuang atribut tambahan dan hanya menghapus cookie setelah ganti sendiri sukses',async()=>{
 forwarded=[];cleared=0;upstreamStatus=200;
 assert.equal((await request({...reset,email:'forged',role:'admin'})).status,200);assert.deepEqual(JSON.parse(forwarded[0][2].body),reset);assert.equal(cleared,0);
 assert.equal((await request({...change,user_id:targetId})).status,200);assert.deepEqual(JSON.parse(forwarded[1][2].body),change);assert.equal(cleared,1);
 upstreamStatus=422;assert.equal((await request(change)).status,422);assert.equal(cleared,1);upstreamStatus=200;
});
test('proxy menolak reset sendiri dan password lemah tanpa meneruskan request',async()=>{
 forwarded=[];assert.equal((await request({...reset,user_id:actorId})).status,422);assert.equal((await request({...change,password:'weak'})).status,422);assert.equal(forwarded.length,0);
});
