import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import sharp from 'sharp';
import { webcrypto } from 'node:crypto';
import * as jsxRuntime from 'react/jsx-runtime';
async function load(path,deps={}) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const entry=new Module('direct-photo-test.cjs');entry.require=name=>{if(name in deps)return deps[name];if(name==='react/jsx-runtime')return jsxRuntime;throw new Error('Unexpected dependency '+name);};entry._compile(code,'direct-photo-test.cjs');return entry.exports;
}
const {PendingPhotos}=await load('../src/lib/media/pending.ts');
const whatsapp=await load('../src/lib/wedding/whatsapp.ts');
const config=await load('../src/lib/admin/modules.ts',{'@/lib/wedding/whatsapp':whatsapp});
const actor='12345678-1234-4234-8234-123456789abc',id='22345678-1234-4234-8234-123456789abc';
const contact={id,label:'Konsultasi',number:'+6281234567890',message:'Halo, ingin tanya paket & tanggal',sort_order:1,is_active:true};

test('pilih/crop tetap lokal; hanya prepare saat Simpan mengunggah foto yang masih dipilih',async()=>{
 const pending=new PendingPhotos(), file=new File(['example'],'crop.webp',{type:'image/webp'});let calls=0;
 const discarded=pending.stage(file,'Lama'),chosen=pending.stage(file,'Baru');
 assert.notEqual(discarded,chosen);assert.equal(calls,0);
 const values={name:'Crew',photo_media_id:chosen};
 const result=await pending.prepare(values,async(_,alt)=>{calls++;assert.equal(alt,'Baru');return id;});
 assert.equal(result.photo_media_id,id);assert.equal(values.photo_media_id,chosen);assert.equal(calls,1);
 const retry=await pending.prepare(values,async()=>{throw new Error('must use cached upload');});assert.equal(retry.photo_media_id,id);
});
test('foto yang dibatalkan/dihapus tidak diunggah; kegagalan upload tidak melanjutkan penyimpanan record',async()=>{
 const pending=new PendingPhotos(), token=pending.stage(new File(['x'],'x.webp'),'Foto');let calls=0;
 await pending.prepare({photo_media_id:null},async()=>{calls++;return id;});assert.equal(calls,0);
 await assert.rejects(()=>pending.prepare({photo_media_id:token},async()=>{throw new Error('upload failed');}),/upload failed/);
 assert.equal((await pending.prepare({photo_media_id:token},async()=>id)).photo_media_id,id);
});
test('kontak WhatsApp divalidasi, field tambahan dibuang, dapat dikosongkan',()=>{
 const value={...config.emptyValues('website'),brand_name:'Livina',hero_title:'Hello',hero_subtitle:'Love',contact_email:'hello@example.test',whatsapp_contacts:[{...contact,forged:true}]};
 assert.deepEqual(config.validateAdminValues('website',value),{});assert.equal(config.adminPayload('website',value).whatsapp_contacts[0].forged,undefined);
 for(const row of [{...contact,number:'08123'},{...contact,label:''},{...contact,is_active:'true'},{...contact,sort_order:-1}])assert.equal(config.validateAdminValues('website',{...value,whatsapp_contacts:[row]}).whatsapp_contacts,'contacts');
 assert.equal(whatsapp.validWhatsAppContacts([contact,contact]),false);assert.equal(whatsapp.validWhatsAppContacts([]),true);
});
test('kedua style mendapat kontak aktif berurutan dengan pesan ter-encode; daftar kosong tidak mengembalikan nomor lama',()=>{
 const rows=whatsapp.publicWhatsApp({whatsapp_contacts:[{...contact,id:actor,sort_order:2},{...contact,sort_order:1,label:'Booking'},{...contact,id:'inactive',is_active:false}]});
 assert.deepEqual(rows.map(row=>row.label),['Booking','Konsultasi']);assert.equal(rows[0].href,`https://wa.me/6281234567890?text=${encodeURIComponent(contact.message)}`);
 assert.deepEqual(whatsapp.publicWhatsApp({whatsapp_contacts:[],whatsapp_number:contact.number}),[]);
});
const edgeSource=await readFile(new URL('../supabase/functions/organizer-api/index.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(edgeSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const photo=await sharp({create:{width:48,height:64,channels:4,background:{r:20,g:100,b:50,alpha:0.6}}}).webp().toBuffer();
function runtime({owner=actor,permission=true,bytes=photo,ready=false,size=bytes.length,storageFails=false,kind="image",posterPresent=true}={}) {
 let handler;const calls=[],warnings=[];
 const env={SUPABASE_URL:'https://supabase.test',SUPABASE_SERVICE_ROLE_KEY:'test-service',SUPABASE_ANON_KEY:'test-public',ORGANIZER_ALLOWED_ORIGINS:'https://livina.test'};
 const media={id,uploaded_by:owner,kind,processing_mode:'direct',status:ready?'ready':'processing',source_path:`${actor}/${id}/source`,source_size_bytes:size};
 const fetch=async(url,init={})=>{
  calls.push({url:String(url),method:init.method||'GET',body:init.body,headers:new Headers(init.headers)});
  if(String(url).includes('/auth/v1/user'))return Response.json({id:actor});
  if(String(url).includes('/rpc/session_context'))return Response.json({user:{id:actor,role:'editor'},permissions:permission?['media.create']:[]});
  if(String(url).includes('/rest/v1/media_files')&&(!init.method||init.method==='GET')) {
   if(String(url).includes('kind=eq.image'))return Response.json(posterPresent?[{id:actor,kind:'image',status:'ready',uploaded_by:actor}]:[]);
   return Response.json(owner===actor?[media]:[]);
  }
  if(String(url).includes('/object/authenticated/organizer-staging/'))return new Response(bytes);
  if(String(url).includes('/object/organizer-media/')&&init.method==='POST')return Response.json({}, {status:storageFails?500:200});
  if(String(url).includes('/rest/v1/media_files')&&init.method==='PATCH')return Response.json([{...media,...JSON.parse(init.body)}]);
  if(String(url).endsWith('/rest/v1/media_files')&&init.method==='POST')return Response.json([media],{status:201});
  if(String(url).includes('/object/upload/sign/'))return Response.json({url:'/object/upload/sign/test'});
  throw new Error('Unexpected request '+url);
 };
 const context={Deno:{env:{get:key=>env[key]},serve:fn=>{handler=fn;}},fetch,crypto:webcrypto,TextEncoder,Uint8Array,DataView,String,URL,Response,Request,AbortSignal,console:{warn:value=>warnings.push(JSON.parse(value))}};
 vm.runInNewContext(compiled,context);
 return {calls,warnings,parse:context.croppedWebp,parseVideo:context.browserMp4,invoke:(body={action:'finish-photo',id})=>handler(new Request('https://supabase.test/functions/v1/organizer-api',{method:'POST',headers:{Origin:'https://livina.test',Authorization:'Bearer actor-token','Content-Type':'application/json'},body:JSON.stringify(body)}))};
}
test('foto WebP asli langsung disimpan ke bucket hasil dan ditandai ready di server tanpa antre worker',async()=>{
 const run=runtime();assert.equal((await run.invoke()).status,200);
 const save=run.calls.find(call=>call.method==='PATCH');const body=JSON.parse(save.body);
 assert.equal(body.status,'ready');assert.equal(body.width,48);assert.equal(body.height,64);assert.equal(body.storage_bucket,'organizer-media');assert.match(body.storage_path,/photo\.webp$/);
 assert.equal(run.calls.some(call=>call.url.includes('claim_media')),false);
});
test('finalisasi foto menolak pengguna tanpa izin dan foto milik akun lain',async()=>{
 for(const options of [{permission:false},{owner:id}]){
  const run=runtime(options);assert.ok([403,404].includes((await run.invoke()).status));assert.equal(run.calls.some(call=>call.method==='PATCH'),false);
 }
});
test('kontainer rusak, animasi, ukuran palsu, dimensi terlalu besar dan Storage gagal tidak menjadi ready',async()=>{
 const tooLarge=await sharp({create:{width:2000,height:2,channels:3,background:'red'}}).webp().toBuffer();
 const animated=Buffer.from(photo);animated[20]|=2;
 for(const options of [{bytes:Buffer.from('not an image')},{bytes:tooLarge},{bytes:animated},{size:photo.length+1},{storageFails:true}]){
  const run=runtime(options);assert.ok([422,500].includes((await run.invoke()).status));assert.equal(run.calls.some(call=>call.method==='PATCH'),false);
 }
});
test('foto ready idempoten; jalur upload lama tetap kompatibel untuk worker',async()=>{
 const ready=runtime({ready:true});assert.equal((await ready.invoke()).status,200);assert.equal(ready.calls.some(call=>call.url.includes('/storage/')),false);
 for(const [action,kind,mime,mode] of [['upload-photo','image','image/webp','direct'],['upload','video','video/mp4','worker']]){
  const run=runtime();assert.equal((await run.invoke({action,kind,mime,name:'test',size:123,alt_text:'Foto'})).status,200);
  const create=run.calls.find(call=>call.url.endsWith('/rest/v1/media_files')&&call.method==='POST');assert.equal(JSON.parse(create.body).processing_mode,mode);
 }
});
test('jalur foto direct tidak menerima JPEG mentah yang belum di-crop',async()=>{
 const run=runtime();assert.equal((await run.invoke({action:'upload-photo',kind:'image',mime:'image/jpeg',name:'test.jpg',size:123,alt_text:'Foto'})).status,422);
});
const translate=async()=>key=>key, stub=()=>null;
const common={'next-intl/server':{getTranslations:translate},'@/i18n/navigation':{Link:stub},'@/icons':{EnvelopeIcon:stub,ChatIcon:stub,UserCircleIcon:stub,ArrowUpIcon:stub,ArrowRightIcon:stub},'@/lib/wedding/whatsapp':whatsapp};
function links(node){if(!node||typeof node!=='object')return [];return [...(node.type==='a'?[node.props.href]:[]),...([node.props?.children].flat(Infinity).flatMap(links))];}
test('Style 1 dan Style 2 merender seluruh kontak aktif dari data yang sama',async()=>{
 for(const [path,css] of [['../src/components/wedding/WeddingContact.tsx','./Wedding.module.css'],['../src/components/wedding-luxe/LuxeContact.tsx','./Luxe.module.css']]){
  const component=await load(path,{...common,[css]:{default:{}}});const tree=await component.default({content:{settings:{whatsapp_contacts:[contact,{...contact,id:actor,number:'+6289876543210'}]},social_links:[]}});
  const urls=links(tree).filter(url=>url?.startsWith('https://wa.me/'));assert.equal(urls.length,2);assert.ok(urls.some(url=>url.includes('6289876543210')));
 }
});


test('foto WebP dengan profil ICC valid tidak ditolak sebagai crop rusak',async()=>{
 const bytes=await sharp({create:{width:80,height:100,channels:3,background:'red'}}).withIccProfile('srgb').webp().toBuffer();
 assert.ok(bytes.includes(Buffer.from('ICCP')));
 const run=runtime({bytes});assert.equal((await run.invoke()).status,200);
});


test('foto berprofil warna tetap dapat didekode setelah metadata EXIF/XMP dibuang',async()=>{
 const bytes=await sharp({create:{width:80,height:100,channels:4,background:{r:20,g:100,b:50,alpha:0.6}}}).withIccProfile('srgb').withExif({IFD0:{Artist:'Private author'}}).withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/">private metadata</x:xmpmeta>').webp().toBuffer();
 const run=runtime({bytes});assert.equal((await run.invoke()).status,200);
 const uploaded=run.calls.find(call=>call.url.includes('/object/organizer-media/')&&call.method==='POST').body;
 const clean=Buffer.from(uploaded);assert.ok(clean.includes(Buffer.from('ICCP')));assert.equal(clean.includes(Buffer.from('EXIF')),false);assert.equal(clean.includes(Buffer.from('XMP ')),false);
 const info=await sharp(clean).metadata();assert.equal(info.width,80);assert.equal(info.height,100);
 assert.equal(JSON.parse(run.calls.find(call=>call.method==='PATCH').body).size_bytes,clean.length);
});
// ISO BMFF structural fixture: unit tests exercise server metadata validation,
// not a video decoder. The browser independently reads a frame before staging.
function box(type,...chunks){const data=Buffer.concat(chunks),header=Buffer.alloc(8);header.writeUInt32BE(data.length+8);header.write(type,4);return Buffer.concat([header,data]);}
function full(type,data){return box(type,Buffer.alloc(4),data);}
function uint(value){const data=Buffer.alloc(4);data.writeUInt32BE(value);return data;}
function movie({duration=2,width=1280,height=720,codec='avc1',external=false,fragmented=false,badOffset=false}={}){
 const ftyp=box('ftyp',Buffer.from('isom'),uint(0),Buffer.from('isomavc1'));
 const mdat=box('mdat',Buffer.from([0,0,0,4,0x65,1,2,3]));
 const timing=Buffer.alloc(20);timing.writeUInt32BE(1000,12);timing.writeUInt32BE(Math.round(duration*1000),16);
 const handler=Buffer.alloc(12);handler.write('vide',8);
 const visual=Buffer.alloc(78);visual.writeUInt16BE(1,6);visual.writeUInt16BE(width,24);visual.writeUInt16BE(height,26);
 const avcc=box('avcC',Buffer.from([1,100,0,31,255,225,0]));
 const stsd=full('stsd',Buffer.concat([uint(1),box(codec,visual,avcc)]));
 const stco=full('stco',Buffer.concat([uint(1),uint(badOffset?0:ftyp.length+8)]));
 const dref=full('dref',Buffer.concat([uint(1),box('url ',uint(external?0:1))]));
 const minf=box('minf',box('dinf',dref),box('stbl',stsd,stco));
 const trak=box('trak',box('mdia',box('mdhd',timing),box('hdlr',handler),minf));
 return Buffer.concat([ftyp,mdat,box('moov',box('mvhd',timing),trak),...(fragmented?[box('moof')]:[])]);
}
test('MP4 sesuai batas langsung ready dengan poster, tanpa worker atau polling',async()=>{
 const bytes=movie(),run=runtime({bytes,kind:'video'});
 assert.equal((await run.invoke({action:'finish-video',id,poster_id:actor})).status,200);
 const saved=JSON.parse(run.calls.find(call=>call.method==='PATCH').body);
 assert.equal(saved.mime_type,'video/mp4');assert.equal(saved.duration_seconds,2);assert.equal(saved.width,1280);assert.equal(saved.poster_media_id,actor);assert.equal(saved.status,'ready');
 assert.equal(run.calls.some(call=>call.url.includes('claim_media')),false);
});
test('MP4 rusak, codec lain, durasi/resolusi berlebih, referensi eksternal dan fragmented ditolak',async()=>{
 for(const options of [{duration:61},{width:3840,height:2160},{codec:'hvc1'},{external:true},{fragmented:true},{badOffset:true}]){
  const run=runtime({bytes:movie(options),kind:'video'});const response=await run.invoke({action:'finish-video',id,poster_id:actor});
  assert.equal(response.status,422);assert.equal(run.calls.some(call=>call.method==='PATCH'),false);
 }
 const run=runtime({bytes:Buffer.from('not an mp4'),kind:'video'});assert.equal((await run.invoke({action:'finish-video',id,poster_id:actor})).status,422);
});
test('video wajib menggunakan poster siap milik aktor sebelum bisa ready',async()=>{
 const run=runtime({bytes:movie(),kind:'video',posterPresent:false});
 const response=await run.invoke({action:'finish-video',id,poster_id:actor});assert.equal(response.status,422);assert.equal((await response.json()).code,'VIDEO_POSTER');assert.equal(run.calls.some(call=>call.url.includes('/storage/')),false);
});
test('upload video baru memakai direct dan menolak WebM/lebih dari 20 MB dengan kode jelas',async()=>{
 const run=runtime({kind:'video'});assert.equal((await run.invoke({action:'upload-video',kind:'video',mime:'video/mp4',name:'video.mp4',size:123})).status,200);
 const created=JSON.parse(run.calls.find(call=>call.url.endsWith('/rest/v1/media_files')&&call.method==='POST').body);assert.equal(created.processing_mode,'direct');
 for(const [mime,size,code] of [['video/webm',123,'VIDEO_FORMAT'],['video/mp4',20971521,'VIDEO_LIMIT']]){
  const response=await runtime().invoke({action:'upload-video',kind:'video',mime,name:'video',size});assert.equal(response.status,422);assert.equal((await response.json()).code,code);
 }
});
test('video dan poster tetap lokal sebelum Simpan; retry tidak mengunggah ulang yang sudah sukses',async()=>{
 const pending=new PendingPhotos(), video=new File(['mp4'],'video.mp4',{type:'video/mp4'}), poster=new File(['webp'],'poster.webp',{type:'image/webp'});
 const staged=pending.stageVideo(video,poster,'Poster');let images=0,videos=0;
 assert.equal(pending.file(staged.posterId),poster);assert.equal(images+videos,0);
 const value={hero_video_id:staged.id,hero_poster_id:staged.posterId};
 const result=await pending.prepare(value,async()=>{images++;return actor;},async(file,posterId)=>{videos++;assert.equal(file,video);assert.equal(posterId,actor);return id;});
 assert.deepEqual(result,{hero_video_id:id,hero_poster_id:actor});assert.equal(images,1);assert.equal(videos,1);
 await pending.prepare(value,async()=>{throw Error('no reupload');},async()=>{throw Error('no reupload');});
});
const videoRules=await load('../src/lib/media/video.ts');
test('validasi lokal video menolak format/ukuran/durasi/resolusi tanpa request cloud',()=>{
 assert.throws(()=>videoRules.validateVideoFile(new File(['x'],'x.webm',{type:'video/webm'})),/videoFormat/);
 assert.throws(()=>videoRules.validateVideoFile({type:'video/mp4',size:20971521}),/videoLimit/);
 for(const values of [[3840,2160,2],[1280,720,61],[0,720,2],[1280,720,Infinity]])assert.throws(()=>videoRules.validateVideoMetadata(...values),/videoLimit/);
 assert.doesNotThrow(()=>videoRules.validateVideoMetadata(1080,1920,60));
});


test('poster video lokal dibuat dan seluruh resource dibersihkan tanpa upload',async()=>{
 const previous=globalThis.document;let video,draws=0;
 try {
  globalThis.document={createElement:type=>{
   if(type==='video'){video={videoWidth:1280,videoHeight:720,duration:2,src:'',load(){if(this.src)queueMicrotask(()=>this.onloadedmetadata?.());},removeAttribute(){this.src='';},set currentTime(value){queueMicrotask(()=>this.onseeked?.());}};return video;}
   if(type==='canvas')return {getContext:()=>({drawImage(){draws++;}}),toBlob:callback=>callback(new Blob(['webp'],{type:'image/webp'}))};
   throw Error('Unexpected element');
  }};
  const poster=await videoRules.videoPoster(new File(['mp4'],'video.mp4',{type:'video/mp4'}),new AbortController().signal);
  assert.equal(poster.type,'image/webp');assert.equal(draws,1);assert.equal(video.src,'');assert.equal(video.onseeked,null);
 }finally{globalThis.document=previous;}
});
test('pembatalan membaca video lokal melepaskan resource dan tidak menghasilkan poster',async()=>{
 const previous=globalThis.document;let cleaned=false;
 try {
  globalThis.document={createElement:()=>({load(){},removeAttribute(){cleaned=true;}})};
  const controller=new AbortController();const pending=videoRules.videoPoster(new File(['mp4'],'video.mp4',{type:'video/mp4'}),controller.signal);controller.abort();
  await assert.rejects(()=>pending,/videoCancelled/);assert.equal(cleaned,true);
 }finally{globalThis.document=previous;}
});
