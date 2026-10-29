import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';

async function load(path,dependencies={}) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const entry=new Module('admin-test.cjs');entry.require=name=>{if(name in dependencies)return dependencies[name];throw new Error(`Unexpected dependency ${name}`);};entry._compile(code,'admin-test.cjs');return entry.exports;
}
const whatsapp=await load('../src/lib/wedding/whatsapp.ts');
const config=await load('../src/lib/admin/modules.ts',{'@/lib/wedding/whatsapp':whatsapp});
const crew=await load('../src/lib/crew/validation.ts');
const permissions=await load('../src/lib/admin/permissions.ts');
const uuid='12345678-1234-4234-8234-123456789abc';
const user={...config.emptyValues('users'),name:'Pengelola uji',email:'user@example.test',role_id:uuid};

test('satu pengguna hanya menerima satu UUID role, bukan array role',()=>{
 assert.deepEqual(config.validateAdminValues('users',user),{});
 assert.ok(config.validateAdminValues('users',{...user,role_id:[uuid]}).role_id);
 assert.ok(config.validateAdminValues('users',{...user,role_id:'admin'}).role_id);
});
test('payload users edit tidak mengubah email Auth atau menerima field otorisasi/audit',()=>{
 const result=config.adminPayload('users',{...user,email:'other@example.test',auth_user_id:uuid,id:'forged',created_at:'forged',permissions:['*']},true);
 assert.equal('email' in result,false);assert.equal('auth_user_id' in result,false);assert.equal('id' in result,false);assert.equal('permissions' in result,false);assert.equal(result.role_id,uuid);
});
test('client draft tanpa media diterima; publikasi membutuhkan foto dan persetujuan',()=>{
 const value={...config.emptyValues('clients'),couple_name:'Pasangan uji',venue:'Venue uji',excerpt:'Ulasan uji'};
 assert.deepEqual(config.validateAdminValues('clients',value),{});
 const issues=config.validateAdminValues('clients',{...value,status:'published'});
 assert.equal(issues.photo_media_id,'required');assert.equal(issues.publication_consent,'consent');
 assert.deepEqual(config.validateAdminValues('clients',{...value,status:'published',photo_media_id:uuid,publication_consent:true}),{});
});
test('website memerlukan poster untuk video dan menolak tahun di masa depan',()=>{
 const value={...config.emptyValues('website'),brand_name:'Uji',hero_title:'Uji',hero_subtitle:'Uji',contact_email:'u@example.test',whatsapp_number:'+6281234567890',hero_video_id:uuid,copyright_start_year:new Date().getFullYear()+1};
 const issues=config.validateAdminValues('website',value);assert.equal(issues.hero_poster_id,'required');assert.equal(issues.copyright_start_year,'invalid');
});
test('penanda founder harus boolean dan payload crew tetap membuang role akun',()=>{
 const value={...crew.emptyCrew,name:'Nadia',role_title:'Founder',biography:'Uji'};
 assert.ok(crew.validateCrew({...value,is_founder:'true'}).is_founder);
 assert.equal('role_id' in crew.crewPayload({...value,is_founder:true,role_id:uuid}),false);
});
test('UI admin penuh konsisten dengan SQL; role editor tidak dinaikkan izinnya',()=>{
 const editor={user:{role:'editor'},permissions:['services.read']};assert.deepEqual(permissions.withAdminPermissions(editor),editor);
 const admin=permissions.withAdminPermissions({user:{role:'admin'},permissions:[]});assert.ok(admin.permissions.includes('templates.update'));assert.ok(admin.permissions.includes('users.create'));
});

const calls=[];
let identity=null;
const auth={privateHeaders:{'Cache-Control':'no-store'},sameOrigin:r=>r.headers.get('origin')===new URL(r.url).origin,routeSession:async()=>identity,supabaseFetch:async(...args)=>{calls.push(args);return Response.json([{id:uuid}]);}};
const passwordRules=await load('../src/lib/auth/password.ts');
const route=await load('../src/app/api/organizer/[...path]/route.ts',{'@/lib/auth/server':auth,'@/lib/admin/modules':config,'@/lib/crew/validation':crew,'@/lib/auth/password':passwordRules});
async function request(method,path,body,query='') {
 const req=new Request(`https://livina.test/api/organizer/${path}${query}`,{method,headers:{origin:'https://livina.test','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 return route[method](req,{params:Promise.resolve({path:path.split('/')})});
}
test('API admin menolak pembaca anonim tanpa menyentuh Supabase',async()=>{
 identity=null;calls.length=0;assert.equal((await request('GET','rest/v1/users')).status,401);assert.equal(calls.length,0);
});
test('grant users.create pada editor tidak dapat melewati batas administrator',async()=>{
 identity={token:'test',context:{user:{role:'editor'},permissions:['users.create','roles.update']}};calls.length=0;
 assert.equal((await request('POST','functions/v1/organizer-api',{action:'create-user',...user})).status,403);
 assert.equal((await request('PATCH','rest/v1/roles',{name:'Nama',code:'editor',description:null,is_active:true},`?id=eq.${uuid}`)).status,403);
 assert.equal((await request('POST','rest/v1/rpc/set_role_permissions',{p_role_id:uuid,p_permission_ids:[]})).status,403);assert.equal(calls.length,0);
});
test('mutasi massal tanpa ID dan tabel yang tidak diizinkan ditolak',async()=>{
 identity={token:'test',context:{user:{role:'admin'},permissions:[]}};calls.length=0;
 assert.equal((await request('DELETE','rest/v1/services')).status,422);
 assert.equal((await request('DELETE','rest/v1/templates',undefined,`?id=eq.${uuid}`)).status,404);
 assert.equal(calls.length,0);
});
test('API membersihkan payload service sebelum diteruskan dan mempertahankan JWT pengguna',async()=>{
 identity={token:'test-user-jwt',context:{user:{role:'admin'},permissions:[]}};calls.length=0;
 const value={...config.emptyValues('services'),title:'Layanan uji',slug:'layanan-uji',summary:'Ringkasan',description:'Deskripsi',created_by:'forged',id:'forged'};
 assert.equal((await request('POST','rest/v1/services',value)).status,200);
 const [path,token,init]=calls[0];assert.equal(path,'rest/v1/services');assert.equal(token,'test-user-jwt');assert.equal('created_by' in JSON.parse(init.body),false);assert.equal('id' in JSON.parse(init.body),false);
});

let templateValue='style-1';
const templateReader=await load('../src/lib/wedding/template.ts',{'server-only':{},'@/lib/crew/public':{publicConfigured:true,publicRpc:async()=>templateValue}});
test('pemilih template publik menolak path di luar dua style tetap',async()=>{
 templateValue='https://evil.test';assert.equal(await templateReader.activeTemplate(),'style-1');templateValue='style-2';assert.equal(await templateReader.activeTemplate(),'style-2');
});
const templates=await load('../src/app/api/admin/templates/route.ts',{'@/lib/auth/server':auth});
test('selector template membutuhkan sesi dan izin update, bukan hanya izin baca',async()=>{
 identity=null;assert.equal((await templates.GET()).status,401);
 identity={token:'test',context:{user:{role:'editor'},permissions:['templates.read']}};
 const req=new Request('https://livina.test/api/admin/templates',{method:'POST',headers:{Origin:'https://livina.test','Content-Type':'application/json'},body:JSON.stringify({code:'style-2'})});
 assert.equal((await templates.POST(req)).status,403);
});
test('template baru di luar katalog tidak dapat diaktifkan lewat API',async()=>{
 identity={token:'test',context:{user:{role:'admin'},permissions:[]}};calls.length=0;
 const req=new Request('https://livina.test/api/admin/templates',{method:'POST',headers:{Origin:'https://livina.test','Content-Type':'application/json'},body:JSON.stringify({code:'style-3'})});
 assert.equal((await templates.POST(req)).status,422);assert.equal(calls.length,0);
});
let activationContext=null;const activationWrites=[];
const activation=await load('../src/app/api/auth/activate/route.ts',{'@/lib/auth/server':{...auth,verifySession:async()=>activationContext,setSession:async(...args)=>activationWrites.push(args)}});
function activationRequest(password='LongPassword123!'){return new Request('https://livina.test/api/auth/activate',{method:'POST',headers:{Origin:'https://livina.test','Content-Type':'application/json'},body:JSON.stringify({access_token:'invite-access',refresh_token:'invite-refresh',password})});}
test('token undangan tidak sah tidak dapat mengganti password atau membuat cookie sesi',async()=>{
 activationContext=null;activationWrites.length=0;calls.length=0;assert.equal((await activation.POST(activationRequest())).status,401);assert.equal(calls.length,0);assert.equal(activationWrites.length,0);
});
test('kata sandi undangan lemah ditolak sebelum request Auth',async()=>{
 calls.length=0;assert.equal((await activation.POST(activationRequest('short'))).status,422);assert.equal(calls.length,0);
});
test('aktivasi sah hanya mengubah akun pemegang token dan memasang sesi setelah sukses',async()=>{
 activationContext={user:{id:uuid},permissions:[]};activationWrites.length=0;calls.length=0;
 assert.equal((await activation.POST(activationRequest())).status,200);assert.equal(calls[0][0],'auth/v1/user');assert.equal(calls[0][1],'invite-access');assert.deepEqual(activationWrites,[['invite-access','invite-refresh']]);
});


test('pengaturan Website menerima detail kontak sampai batas yang didukung, tanpa mengubah singleton',async()=>{
 identity={token:'test-user-jwt',context:{user:{role:'admin'},permissions:[]}};calls.length=0;
 const contacts=Array.from({length:40},(_,index)=>({id:`12345678-1234-4234-8234-${String(index).padStart(12,'0')}`,label:'Konsultasi',number:'+6281234567890',message:'a'.repeat(1000),sort_order:index,is_active:true}));
 const value={...config.emptyValues('website'),brand_name:'Livina',hero_title:'Hello',hero_subtitle:'Love',contact_email:'hello@example.test',whatsapp_contacts:contacts};
 assert.ok(JSON.stringify(value).length>32768);
 assert.equal((await request('PATCH','rest/v1/site_settings',value,`?id=eq.${uuid}`)).status,200);
 assert.equal(JSON.parse(calls[0][2].body).whatsapp_contacts.length,40);
 assert.equal(config.modules.website.singleton,true);
});
