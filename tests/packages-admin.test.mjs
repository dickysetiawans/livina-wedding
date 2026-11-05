import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
async function load(path,deps={}){
 const code=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const entry=new Module('packages-test.cjs');entry.require=name=>name in deps?deps[name]:name==='react/jsx-runtime'?jsxRuntime:(()=>{throw Error('Unexpected import '+name);})();entry._compile(code,'packages-test.cjs');return entry.exports;
}
const whatsapp=await load('../src/lib/wedding/whatsapp.ts');
const config=await load('../src/lib/admin/modules.ts',{'@/lib/wedding/whatsapp':whatsapp});
const id='12345678-1234-4234-8234-123456789abc';
const sample={...config.emptyValues('packages'),name:' Paket Batak ',category_id:id,subcategory_id:id,package_kind:'all_in',price:190000000,benefits:['  Koordinasi vendor  ','Pendamping pengantin']};
test('paket menyimpan rupiah penuh dan urutan benefit secara atomik; field audit dibuang',()=>{
 assert.deepEqual(config.validateAdminValues('packages',sample),{});
 const result=config.adminPayload('packages',{...sample,created_by:id,role:'admin',category_name:'forged'});
 assert.equal(result.price,190000000);assert.deepEqual(result.benefits,['Koordinasi vendor','Pendamping pengantin']);assert.equal(result.name,'Paket Batak');
 for(const key of ['created_by','role','category_name'])assert.equal(key in result,false);
 assert.equal(config.adminPayload('packages',{...sample,subcategory_id:''}).subcategory_id,null);
});
test('paket menolak ID palsu, jenis di luar katalog, harga tidak bulat/negatif/overflow',()=>{
 for(const key of ['category_id','subcategory_id'])for(const value of ['Batak',[id],{id}])assert.ok(config.validateAdminValues('packages',{...sample,[key]:value})[key]);
 for(const package_kind of ['all','Non Venue','',null])assert.ok(config.validateAdminValues('packages',{...sample,package_kind}).package_kind);
 for(const price of [-1,1.5,NaN,Infinity,1e12,'190000000'])assert.ok(config.validateAdminValues('packages',{...sample,price}).price);
 assert.deepEqual(config.validateAdminValues('packages',{...sample,price:999999999999,package_kind:'non_venue'}),{});
});
test('benefit dibatasi 1–50 baris teks, tidak menerima objek atau baris kosong',()=>{
 for(const benefits of [[],[' '],[{}],[1],null,'teks',['a'.repeat(501)],Array(51).fill('x')])assert.equal(config.validateAdminValues('packages',{...sample,benefits}).benefits,'benefits');
 assert.deepEqual(config.validateAdminValues('packages',{...sample,benefits:Array(50).fill('x')}),{});
});
test('galeri wajib memilih foto UUID dan tidak menerima jenis paket/harga kiriman',()=>{
 const value={...config.emptyValues('package_gallery'),name:'Galeri',category_id:id,photo_media_id:id};assert.deepEqual(config.validateAdminValues('package_gallery',value),{});
 assert.equal(config.validateAdminValues('package_gallery',{...value,photo_media_id:null}).photo_media_id,'required');
 const payload=config.adminPayload('package_gallery',{...value,price:1,package_kind:'all_in'});assert.equal('price' in payload,false);assert.equal('package_kind' in payload,false);
});
const stub=()=>null;
function nodes(node){return !node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
test('editor benefit menghapus dan memindah baris sambil mempertahankan urutan',async()=>{
 const editor=await load('../src/components/admin/modules/BenefitsEditor.tsx',{'next-intl':{useTranslations:()=>key=>key},'@/components/ui/button/Button':{default:stub}});
 let result;const tree=editor.default({value:['A','B','C'],disabled:false,onChange:value=>result=value});
 const buttons=nodes(tree).filter(node=>node.type===stub);buttons.find(node=>node.props.children==='benefitDown').props.onClick();assert.deepEqual(result,['B','A','C']);
 buttons.filter(node=>node.props.children==='delete')[1].props.onClick();assert.deepEqual(result,['A','C']);buttons.at(-1).props.onClick();assert.deepEqual(result,['A','B','C','']);
});
test('pilihan kategori mereset subkategori; pilihan anak hanya berasal dari induk aktif',async()=>{
 const categories=[{id:'adat',name:'Adat',has_subcategories:true,is_active:true},{id:'nasional',name:'Nasional',has_subcategories:false,is_active:true}];
 let stateIndex=0,changes;
 const picker=await load('../src/components/admin/modules/PackageClassification.tsx',{'react':{useState:()=>[stateIndex++===0?{categories,children:[{id:'batak',category_id:'adat',name:'Batak',is_active:true},{id:'china',category_id:'internasional',name:'China',is_active:true}],loading:false,error:false}:0,()=>{}],useEffect:()=>{}},'next-intl':{useTranslations:()=>key=>key},'@/lib/admin/client':{},'@/components/ui/button/Button':{default:stub},'@/components/form/Label':{default:stub}});
 const tree=picker.default({category:'adat',subcategory:'batak',disabled:false,onRequired(){},onChange:(...value)=>changes=value});
 const selects=nodes(tree).filter(node=>node.type==='select');assert.equal(selects.length,2);assert.deepEqual(nodes(selects[1]).filter(node=>node.type==='option').map(node=>node.props.value),['','batak']);
 selects[0].props.onChange({target:{value:'nasional'}});assert.deepEqual(changes,['nasional','']);
});
const crew=await load('../src/lib/crew/validation.ts'),password=await load('../src/lib/auth/password.ts');let session={token:'jwt-user',context:{user:{role:'editor'}}},calls=[];
const route=await load('../src/app/api/organizer/[...path]/route.ts',{'@/lib/auth/server':{privateHeaders:{},sameOrigin:()=>true,routeSession:async()=>session,supabaseFetch:async(path,token,init)=>{calls.push({path,token,init});return Response.json([{id}]);}},'@/lib/admin/modules':config,'@/lib/crew/validation':crew,'@/lib/auth/password':password});
async function post(body){return route.POST(new Request('https://livina.test/api/organizer/rest/v1/packages',{method:'POST',body:JSON.stringify(body)}),{params:Promise.resolve({path:['rest','v1','packages']})});}
test('API paket memakai JWT pengguna, menolak payload invalid dan akses anonim sebelum Supabase',async()=>{
 calls=[];assert.equal((await post({...sample,is_admin:true})).status,200);assert.equal(calls[0].token,'jwt-user');assert.equal('is_admin' in JSON.parse(calls[0].init.body),false);
 calls=[];assert.equal((await post({...sample,benefits:['']})).status,422);assert.equal(calls.length,0);session=null;assert.equal((await post(sample)).status,401);assert.equal(calls.length,0);
});
test('semua menu, deskripsi dan label field Paket mempunyai terjemahan',async()=>{
 const messages=JSON.parse(await readFile(new URL('../src/messages/en.json',import.meta.url),'utf8')).management;
 for(const code of ['package_categories','package_subcategories','packages','package_gallery']){
  assert.ok(messages.modules[code]);assert.ok(messages.descriptions[code]);for(const field of config.modules[code].fields)assert.ok(messages.fields[field.key],field.key);
 }
});
