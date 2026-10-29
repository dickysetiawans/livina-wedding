import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
async function load(path,deps={}) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const entry=new Module('crew-public-test.cjs');entry.require=name=>{if(name in deps)return deps[name];if(name==='react/jsx-runtime')return jsxRuntime;throw new Error('Unexpected dependency '+name);};entry._compile(code,'crew-public-test.cjs');return entry.exports;
}
const id='f15c80f3-165c-40c2-93b4-c851d98f7c97';
let photo,signCalls=[],media=[];
const api={publicConfigured:true,publicRpc:async(name)=>name==='public_content'?{media}:photo,publicPhotoUrl:async(path)=>{assert.equal(typeof path,'string');signCalls.push(path);return 'https://storage.test/object?token=test-'+signCalls.length;}};
const validation=await load('../src/lib/crew/validation.ts');
const photoRoute=await load('../src/app/api/crew/photo/[id]/route.ts',{'@/lib/crew/public':api,'@/lib/crew/validation':validation});
const mediaRoute=await load('../src/app/api/wedding/media/[id]/route.ts',{'@/lib/crew/public':api,'@/lib/crew/validation':validation});
const params=()=>({params:Promise.resolve({id})});
test('foto Crew memakai storage_path dari RPC terbaru dan tetap mendukung path lama',async()=>{
 for(const payload of [{storage_path:'owner/image.webp'},{path:'owner/legacy.webp'}]){
  photo=payload;signCalls=[];const response=await photoRoute.GET(new Request('https://livina.test/api/crew/photo/'+id),params());
  assert.equal(response.status,302);assert.deepEqual(signCalls,[payload.storage_path||payload.path]);assert.match(response.headers.get('cache-control'),/no-store/);
 }
});
test('foto draft/tidak direferensikan dan UUID invalid tidak mendapat URL Storage',async()=>{
 photo=null;signCalls=[];assert.equal((await photoRoute.GET(new Request('https://livina.test'),params())).status,404);
 assert.equal((await photoRoute.GET(new Request('https://livina.test'),{params:Promise.resolve({id:'invalid'})})).status,404);assert.equal(signCalls.length,0);
 photo={};assert.equal((await photoRoute.GET(new Request('https://livina.test'),params())).status,503);assert.equal(signCalls.length,0);
});
test('video publik streaming Range dari URL aplikasi dengan tanda tangan baru setiap request',async()=>{
 const previous=globalThis.fetch;const upstream=[];media=[{id,kind:'video',storage_path:'owner/video.mp4'}];signCalls=[];
 try {
  globalThis.fetch=async(url,init)=>{upstream.push({url,init});return new Response(new Uint8Array([1,2,3]),{status:206,headers:{'Content-Range':'bytes 0-2/100','Content-Length':'3','Accept-Ranges':'bytes'}});};
  for(let index=0;index<2;index++){
   const response=await mediaRoute.GET(new Request('https://livina.test/api/wedding/media/'+id,{headers:{Range:'bytes=0-2'}}),params());
   assert.equal(response.status,206);assert.equal(response.headers.get('location'),null);assert.equal(response.headers.get('content-type'),'video/mp4');assert.equal(response.headers.get('content-range'),'bytes 0-2/100');assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3]);
  }
  assert.equal(signCalls.length,2);assert.notEqual(upstream[0].url,upstream[1].url);assert.equal(upstream[0].init.headers.Range,'bytes=0-2');
 }finally{globalThis.fetch=previous;}
});
test('streaming video tidak membuka media draft atau menerima multiple Range',async()=>{
 signCalls=[];media=[];assert.equal((await mediaRoute.GET(new Request('https://livina.test'),params())).status,404);
 media=[{id,kind:'video',storage_path:'owner/video.mp4'}];assert.equal((await mediaRoute.GET(new Request('https://livina.test',{headers:{Range:'bytes=0-1,5-6'}}),params())).status,416);assert.equal(signCalls.length,0);
 media=[{id,kind:'image',storage_path:'owner/image.webp'}];assert.equal((await mediaRoute.GET(new Request('https://livina.test'),params())).status,302);
});
const translate=key=>({ownerGroup:'The Owner',crewGroup:'The Crew'}[key]||key), stub=()=>null;
const one=await load('../src/components/wedding/WeddingCrew.tsx',{'next-intl':{useTranslations:()=>translate},'./WeddingCrewRow':{default:stub},'./Wedding.module.css':{default:{}}});
const two=await load('../src/components/wedding-luxe/LuxeCrew.tsx',{'next/image':{default:stub},'next-intl/server':{getTranslations:async()=>translate},'./Luxe.module.css':{default:{}}});
function nodes(node){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
const founder={id:'owner',name:'Owner Name',role_title:'Leader',biography:'Owner bio',is_founder:true,sort_order:9};
const member={id:'member',name:'Crew Name',role_title:'Runner',biography:'Crew bio',is_founder:false,sort_order:0};
test('kedua style menampilkan The Owner sebelum founder lalu The Crew tanpa mengubah profil',async()=>{
 for(const component of [one,two]){
  const tree=await component.default({members:[member,founder],preview:false});
  const headings=nodes(tree).filter(node=>node.type==='h2').map(node=>node.props.children).filter(value=>typeof value==='string');
  assert.deepEqual(headings.filter(value=>['The Owner','The Crew'].includes(value)),['The Owner','The Crew']);
 }
 const rowNodes=nodes(one.default({members:[member,founder]})).filter(node=>node.type===stub);assert.deepEqual(rowNodes.map(node=>node.props.member),[founder,member]);
});
test('tanpa founder tidak ada The Owner; founder saja tidak membuat judul The Crew kosong',async()=>{
 for(const component of [one,two])for(const [members,expected] of [[[member],['The Crew']],[[founder],['The Owner']]]){
  const tree=await component.default({members,preview:false});const headings=nodes(tree).filter(node=>node.type==='h2').map(node=>node.props.children).filter(value=>['The Owner','The Crew'].includes(value));assert.deepEqual(headings,expected);
 }
});
async function heroWithPlayer({blocked=false,reduced=false}={}){
 const effects=[],updates=[];let index=0,play=0,pause=0;
 const player={play:()=>{play++;return blocked?Promise.reject(new Error('autoplay blocked')):Promise.resolve();},pause:()=>pause++};
 const component=await load('../src/components/wedding/WeddingHero.tsx',{'react':{useState:initial=>{const n=index++;return [initial,value=>updates.push([n,value])];},useRef:()=>({current:player}),useEffect:fn=>effects.push(fn)},'next-intl':{useTranslations:()=>translate},'next/image':{default:stub},'@/icons':{ChevronDownIcon:stub},'./Wedding.module.css':{default:{}}});
 const tree=component.default({title:'Livina',subtitle:'Love',video:'/api/wedding/media/video',poster:'/poster',filmTitle:'Film'});
 const previous=globalThis.window;globalThis.window={matchMedia:()=>({matches:reduced})};let cleanup;
 try{cleanup=effects[0]();await new Promise(resolve=>setImmediate(resolve));}finally{globalThis.window=previous;}
 return {tree,player,updates,cleanup,play:()=>play,pause:()=>pause};
}
test('video Style 1 muted/autoplay/loop, tidak berhenti hanya karena scroll keluar layar',async()=>{
 const run=await heroWithPlayer();const video=nodes(run.tree).find(node=>node.type==='video');assert.equal(video.props.loop,true);assert.equal(video.props.muted,true);assert.equal(video.props.autoPlay,true);assert.equal(run.play(),1);assert.equal(run.pause(),0);assert.equal(run.player.loop,true);run.cleanup();assert.equal(run.pause(),1);
});
test('autoplay diblokir membuka kontrol, bukan mengganti video dengan poster error',async()=>{
 const run=await heroWithPlayer({blocked:true});assert.deepEqual(run.updates,[[1,true]]);run.cleanup();
 const reduced=await heroWithPlayer({reduced:true});assert.equal(reduced.play(),0);assert.equal(reduced.player.controls,true);
});
test('Style 2 tetap video dengan kontrol tanpa autoplay/loop',async()=>{
 const film=await load('../src/components/wedding-luxe/LuxeFilm.tsx',{'react':{useState:value=>[value,()=>{}]},'next-intl':{useTranslations:()=>translate},'next/image':{default:stub},'./Luxe.module.css':{default:{}}});
 const video=nodes(film.default({video:'/video',poster:'/poster',title:'Film'})).find(node=>node.type==='video');assert.equal(video.props.controls,true);assert.equal(video.props.loop,undefined);assert.equal(video.props.autoPlay,undefined);
});
