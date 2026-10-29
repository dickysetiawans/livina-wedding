import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';

async function load(path,deps={}) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const entry=new Module('media-site-test.cjs');entry.require=name=>{if(name in deps)return deps[name];if(name==='react/jsx-runtime')return jsxRuntime;throw new Error('Unexpected dependency '+name);};entry._compile(code,'media-site-test.cjs');return entry.exports;
}
const {cropGeometry}=await load('../src/lib/media/crop.ts');
test('crop cover memotong tengah foto lanskap dan dapat digeser sampai kedua tepi',()=>{
 const base={imageWidth:1000,imageHeight:500,frameWidth:200,frameHeight:200,zoom:1,x:0,y:0};
 const center=cropGeometry(base);assert.equal(center.sx,250);assert.equal(center.sy,0);assert.equal(center.sw,500);assert.equal(center.sh,500);
 assert.equal(cropGeometry({...base,x:100000}).sx,0);assert.equal(cropGeometry({...base,x:-100000}).sx,500);
});
test('zoom membatasi potongan di dalam foto untuk rasio portrait, logo dan hero',()=>{
 for(const [imageWidth,imageHeight] of [[400,1200],[2400,800],[1200,1200]])for(const aspect of [1,3/4,4/3,16/9])for(const zoom of [1,1.5,3])for(const delta of [-100000,0,100000]) {
  const r=cropGeometry({imageWidth,imageHeight,frameWidth:320,frameHeight:320/aspect,zoom,x:delta,y:delta});
  assert.ok(r.sx>=-1e-8&&r.sy>=-1e-8);assert.ok(r.sx+r.sw<=imageWidth+1e-8&&r.sy+r.sh<=imageHeight+1e-8);assert.ok(Math.abs(r.sw/r.sh-aspect)<1e-8);
 }
});
test('crop menolak dimensi kosong atau tidak finite',()=>{
 const base={imageWidth:100,imageHeight:100,frameWidth:100,frameHeight:100,zoom:1,x:0,y:0};
 for(const invalid of [{imageWidth:0},{frameHeight:-1},{zoom:NaN},{x:Infinity}])assert.throws(()=>cropGeometry({...base,...invalid}),RangeError);
});
const {waitForMedia}=await load('../src/lib/media/wait.ts');
const ready={id:'media-id',kind:'image',status:'ready'};
test('upload baru dipilih setelah worker mengubah pending menjadi ready',async()=>{
 let calls=0;const result=await waitForMedia(ready.id,'image',async()=>[{...ready,status:++calls<3?'pending':'ready'}],new AbortController().signal,4,0);
 assert.equal(result.status,'ready');assert.equal(calls,3);
});
test('status failed, ID berbeda atau jenis berkas salah tidak pernah dipilih',async()=>{
 for(const item of [{...ready,status:'failed'},{...ready,id:'other-id'},{...ready,kind:'video'}])await assert.rejects(()=>waitForMedia(ready.id,'image',async()=>[item],new AbortController().signal,2,0),error=>error.message==='processingFailed');
});
test('timeout worker dan pembatalan berhenti tanpa melaporkan media siap',async()=>{
 await assert.rejects(()=>waitForMedia(ready.id,'image',async()=>[{...ready,status:'processing'}],new AbortController().signal,2,0),error=>error.message==='processingSlow');
 const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(()=>waitForMedia(ready.id,'image',async()=>{calls++;return [ready];},controller.signal),error=>error.name==='AbortError');assert.equal(calls,0);
});

let published={settings:null,services:[],team_members:[],testimonials:[],social_links:[]};
const provider=await load('../src/lib/wedding/page-content.ts',{'server-only':{},react:{cache:fn=>fn},'./content':{weddingContent:async()=>published}});
const whatsapp=await load('../src/lib/wedding/whatsapp.ts');
const sections=await load('../src/lib/wedding/sections.ts',{'./whatsapp':whatsapp});
test('data kosong tetap kosong walau environment lama meminta JSON preview',async()=>{
 const previous=process.env.WEDDING_CONTENT_SOURCE;process.env.WEDDING_CONTENT_SOURCE='preview';
 try {const response=await provider.weddingPageContent();assert.equal(response.meta.source,'supabase');assert.equal(response.data.settings,null);assert.deepEqual(response.meta.counts,{services:0,team_members:0,testimonials:0});assert.ok(Object.values(response.data.hero).every(value=>value===''));assert.equal(sections.publishedSections(response.data).empty,true);}
 finally{if(previous===undefined)delete process.env.WEDDING_CONTENT_SOURCE;else process.env.WEDDING_CONTENT_SOURCE=previous;}
});
test('hero dan media hanya berasal dari setting admin, tanpa URL foto/video contoh',async()=>{
 published={...published,settings:{brand_name:'Brand asli',hero_title:'Judul admin',hero_subtitle:'Kalimat admin',film_title:'Film admin',hero_poster_id:'poster-id',hero_video_id:'video-id'}};
 const {data}=await provider.weddingPageContent();assert.equal(data.hero.brand_name,'Brand asli');assert.equal(data.hero.hero_title,'Judul admin');assert.equal(data.hero.hero_poster_url,'/api/wedding/media/poster-id');assert.equal(data.hero.hero_video_url,'/api/wedding/media/video-id');
 assert.deepEqual(sections.publishedSections(data).ids,[]);assert.equal(sections.publishedSections(data).hero,true);
});
test('navigasi hanya berisi bagian yang mempunyai konten atau kontak',async()=>{
 published={...published,services:[{id:'service'}],team_members:[],testimonials:[{id:'client'}]};
 const {data}=await provider.weddingPageContent();assert.deepEqual(sections.publishedSections(data).ids,['services','stories']);
 data.settings.contact_email='hello@example.test';assert.deepEqual(sections.publishedSections(data).ids,['services','stories','contact']);
});
let template='style-1';let requestedLocale='';const one=()=>null,two=()=>null;
const home=await load('../src/app/[locale]/(full-width-pages)/page.tsx',{
 'next-intl/server':{setRequestLocale:value=>{requestedLocale=value;},getTranslations:async()=>key=>key},
 '@/lib/wedding/template':{activeTemplate:async()=>template},'@/lib/wedding/page-content':provider,
 '@/components/wedding/StyleOneWebsite':{default:one},'@/components/wedding-luxe/StyleTwoWebsite':{default:two}
});
test('akar / merender template terpilih secara langsung tanpa membutuhkan redirect',async()=>{
 for(const [code,component] of [['style-1',one],['style-2',two]]){
  template=code;const page=await home.default({params:Promise.resolve({locale:'en'})});assert.equal(page.type,component);assert.equal(page.props.content.hero.brand_name,'Brand asli');assert.equal(requestedLocale,'en');
 }
});

const stub=()=>null;const translate=async()=>key=>key;
const styleOne=await load('../src/components/wedding/StyleOneWebsite.tsx',{
 'next-intl/server':{getTranslations:translate},'next/font/google':{Montserrat:()=>({variable:'sans'}),Playfair_Display:()=>({variable:'serif'})},'next/image':{default:stub},
 '@/lib/wedding/sections':sections,'./WeddingHero':{default:stub},'./WeddingServices':{default:stub},'./WeddingCrew':{default:stub},'./WeddingGallery':{default:stub},'./WeddingContact':{default:stub},'./WeddingMotion':{default:stub},'./PublishedEmpty':{default:stub},'./Wedding.module.css':{default:{}}
});
test('render tanpa data tidak menyertakan heading, section atau link ke crew kosong',async()=>{
 published={settings:null,services:[],team_members:[],testimonials:[],social_links:[]};
 const {data}=await provider.weddingPageContent();const tree=await styleOne.default({content:data});
 const main=tree.props.children.find(child=>child&&child.type==='main');
 assert.equal(main.props.children.filter(Boolean).length,1);
 assert.equal(tree.props.children.filter(child=>child?.type==='header').length,0);
});
