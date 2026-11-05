import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
async function load(path,deps={}){
 const code=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const entry=new Module('events-positions-test.cjs');entry.require=name=>name in deps?deps[name]:name==='react/jsx-runtime'?jsxRuntime:(()=>{throw Error('Unexpected import '+name);})();entry._compile(code,'events-positions-test.cjs');return entry.exports;
}
const whatsapp=await load('../src/lib/wedding/whatsapp.ts');
const config=await load('../src/lib/admin/modules.ts',{'@/lib/wedding/whatsapp':whatsapp});
const crew=await load('../src/lib/crew/validation.ts');
const client=await load('../src/lib/admin/client.ts',{'./modules':config});
const id='12345678-1234-4234-8234-123456789abc',other='22345678-1234-4234-8234-123456789abc';
test('master Acara/Jabatan hanya mengirim nama dan urutan, dengan validasi batas',()=>{
 for(const moduleName of ['events','positions']){
  const value={...config.emptyValues(moduleName),name:' Nama ',sort_order:2,permissions:['*'],status:'published',id:'forged'};
  assert.deepEqual(config.validateAdminValues(moduleName,value),{});assert.deepEqual(config.adminPayload(moduleName,value),{name:'Nama',sort_order:2});
  for(const sort_order of [-1,1.5,NaN,2147483648])assert.equal(config.validateAdminValues(moduleName,{...value,sort_order}).sort_order,'invalid');
  assert.equal(config.validateAdminValues(moduleName,{...value,name:' '}).name,'required');
 }
});
test('Client wajib memilih satu UUID acara, bukan nama atau beberapa acara',()=>{
 const value={...config.emptyValues('clients'),couple_name:'Pasangan',venue:'Venue',excerpt:'Ulasan'};
 assert.equal(config.validateAdminValues('clients',value).event_id,'required');
 for(const event_id of ['Resepsi',[id],{id}])assert.ok(config.validateAdminValues('clients',{...value,event_id}).event_id);
 assert.deepEqual(config.validateAdminValues('clients',{...value,event_id:id}),{});
});
test('Crew wajib memilih UUID jabatan; teks jabatan, role akun dan audit dibuang dari payload',()=>{
 const value={...crew.emptyCrew,name:'Nama',biography:'Biografi',position_id:id,role_title:'FORGED',role_id:other,created_by:other};
 assert.deepEqual(crew.validateCrew(value),{});const payload=crew.crewPayload(value);assert.equal(payload.position_id,id);assert.equal('role_title' in payload,false);assert.equal('role_id' in payload,false);assert.equal('created_by' in payload,false);
 for(const position_id of ['',null,'Leader',[id],{id}])assert.equal(crew.validateCrew({...value,position_id}).position_id,'requiredPosition');
});
let session={token:'user-jwt',context:{user:{role:'editor'},permissions:['team_members.read','team_members.update','testimonials.read']}};const calls=[];
const auth={privateHeaders:{'Cache-Control':'no-store'},sameOrigin:request=>request.headers.get('origin')===new URL(request.url).origin,routeSession:async()=>session,supabaseFetch:async(path,token,init)=>{calls.push({path,token,init});return Response.json([{id}]);}};
const password=await load('../src/lib/auth/password.ts');
const route=await load('../src/app/api/organizer/[...path]/route.ts',{'@/lib/auth/server':auth,'@/lib/admin/modules':config,'@/lib/crew/validation':crew,'@/lib/auth/password':password});
async function request(method,table,body){return route[method](new Request('https://livina.test/api/organizer/rest/v1/'+table,{method,headers:{origin:'https://livina.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}),{params:Promise.resolve({path:['rest','v1',table]})});}
test('endpoint master memakai JWT pengguna dan membuang kolom selain nama/urutan',async()=>{
 for(const table of ['events','positions']){
  calls.length=0;assert.equal((await request('POST',table,{name:'Master',sort_order:0,id:'forged',is_admin:true})).status,200);assert.equal(calls[0].token,'user-jwt');assert.deepEqual(JSON.parse(calls[0].init.body),{name:'Master',sort_order:0});
 }
});
test('akses anonim dan payload jabatan Crew yang tidak sah ditolak sebelum menghubungi Supabase',async()=>{
 const previous=session;session=null;calls.length=0;assert.equal((await request('GET','positions')).status,401);session=previous;
 assert.equal((await request('POST','team_members',{...crew.emptyCrew,name:'Crew',biography:'Bio',role_title:'Leader'})).status,422);assert.equal(calls.length,0);
 assert.equal((await request('POST','team_members',{...crew.emptyCrew,name:'Crew',biography:'Bio',position_id:id,role_title:'FORGED'})).status,200);assert.equal('role_title' in JSON.parse(calls[0].init.body),false);
});
test('pilihan master dibaca berurutan dan mengambil halaman berikutnya tanpa kehilangan data',async()=>{
 const original=globalThis.fetch,urls=[];
 try{
  globalThis.fetch=async(url)=>{urls.push(String(url));return Response.json(urls.length===1?Array.from({length:1000},(_,n)=>({id:String(n),name:'Jabatan '+n,sort_order:n})):[{id,name:'Terakhir',sort_order:1001}]);};
  const rows=await client.masterOptions('positions');assert.equal(rows.length,1001);assert.match(urls[0],/order=sort_order.asc,name.asc,id.asc/);assert.match(urls[1],/offset=1000/);
 }finally{globalThis.fetch=original;}
});
test('menghapus master yang masih digunakan mempertahankan pesan data dipakai',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async()=>Response.json({code:'23503'},{status:409});await assert.rejects(()=>client.deleteAdmin('events',id),error=>error.code==='inUse');}finally{globalThis.fetch=original;}
});
const events=await load('../src/lib/wedding/testimonial-events.ts');
test('testimoni terbaru diurutkan tanpa mengubah data asli; data lama tanpa tanggal tetap stabil',()=>{
 const source=[{id:'old',created_at:'2026-01-01'},{id:'legacy'},{id:'new',created_at:'2026-02-01'},{id:'invalid',created_at:'invalid'}];
 assert.deepEqual(events.newestTestimonials(source).map(row=>row.id),['new','old','legacy','invalid']);
 assert.deepEqual(source.map(row=>row.id),['old','legacy','new','invalid']);
});
test('setiap filter menampilkan 6, 12, 18 lalu sisa; pindah filter mengulang dari 6',async()=>{
 let state;
 const hook=await load('../src/hooks/useTestimonialFilter.ts',{'react':{useState:initial=>[state??=initial,value=>{state=typeof value==='function'?value(state):value;}]},'@/lib/wedding/testimonial-events':events});
 const rows=Array.from({length:21},(_,n)=>({id:String(n),event_id:n<19?id:other,event_name:n<19?'Resepsi':'Akad',created_at:new Date(Date.UTC(2026,0,n+1)).toISOString()}));
 let result=hook.default(rows);assert.equal(result.reviews.length,6);assert.equal(result.reviews[0].id,'20');assert.equal(result.hasMore,true);
 result.select(id);result=hook.default(rows);assert.equal(result.reviews.length,6);assert.equal(result.total,19);assert.equal(result.reviews[0].id,'18');
 for(const count of [12,18,19]){result.showMore();result=hook.default(rows);assert.equal(result.reviews.length,count);}
 assert.equal(result.hasMore,false);result.select(other);result=hook.default(rows);assert.equal(result.reviews.length,2);assert.equal(result.hasMore,false);
 result.select(null);result=hook.default(rows);assert.equal(result.reviews.length,6);assert.equal(result.total,21);
 result.select(id);result=hook.default(rows);result.showMore();result=hook.default(rows.filter(row=>row.event_id===other));assert.equal(result.active,null);assert.equal(result.reviews.length,2);
});
const reviews=[{id:'a',couple_name:'A',event_id:id,event_name:'Resepsi',event_sort_order:4},{id:'b',couple_name:'B',event_id:other,event_name:'Akad',event_sort_order:0},{id:'c',couple_name:'C',event_id:id,event_name:'Resepsi',event_sort_order:4},{id:'legacy',couple_name:'Lama',event_id:null}];
test('filter mengikuti urutan acara, tanpa duplikat; Semua mempertahankan testimoni lama',()=>{
 assert.deepEqual(events.testimonialEvents(reviews).map(row=>row.name),['Akad','Resepsi']);assert.equal(events.eventTestimonials(reviews,null).length,4);assert.deepEqual(events.eventTestimonials(reviews,id).map(row=>row.id),['a','c']);assert.deepEqual(events.testimonialEvents([{id:'legacy'}]),[]);
});
function nodes(node){return !node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
const translate=key=>({storiesAllEvents:'Semua'}[key]||key),stub=()=>null;
const Filter=await load('../src/components/wedding/StoryEventFilter.tsx',{'next-intl':{useTranslations:()=>translate},'./StoryEventFilter.module.css':{default:{}}});
test('filter interaktif berlaku di Style 1 dan Style 2, termasuk kembali ke Semua',async()=>{
 for(const [path,css,dialog] of [['../src/components/wedding/WeddingGallery.tsx','./Wedding.module.css','./StoryDialog'],['../src/components/wedding-luxe/LuxeGallery.tsx','./Luxe.module.css','@/components/wedding/StoryDialog']]){
  let state;
  const hook=await load('../src/hooks/useTestimonialFilter.ts',{'react':{useState:initial=>[state??=initial,value=>{state=typeof value==='function'?value(state):value;}]},'@/lib/wedding/testimonial-events':events});
  const component=await load(path,{'react':{useState:()=>[null,()=>{}]},'next/image':{default:stub},'next-intl':{useTranslations:()=>translate},'@/hooks/useModal':{useModal:()=>({isOpen:false,openModal(){},closeModal(){}})},'@/hooks/useTestimonialFilter':{default:hook.default},'@/components/wedding/StoryEventFilter':{default:Filter.default},'@/components/wedding/StoryMoreButton':{default:stub},[dialog]:{default:stub},[css]:{default:{}}});
  let tree=component.default({testimonials:reviews});assert.equal(nodes(tree).filter(node=>node.type==='article').length,4);
  const filterNode=nodes(tree).find(node=>node.type===Filter.default);const buttons=nodes(Filter.default(filterNode.props)).filter(node=>node.type==='button');assert.deepEqual(buttons.map(node=>node.props.children),['Semua','Akad','Resepsi']);buttons[2].props.onClick();
  tree=component.default({testimonials:reviews});assert.deepEqual(nodes(tree).filter(node=>node.type==='h3').map(node=>node.props.children),['A','C']);buttons[0].props.onClick();tree=component.default({testimonials:reviews});assert.equal(nodes(tree).filter(node=>node.type==='article').length,4);
 }
});
