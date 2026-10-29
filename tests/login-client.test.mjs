import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const source=await readFile(new URL('../src/lib/crew/client.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const previousUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL='https://supabase.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-public';
const entry=new Module('login-client-test.cjs');
entry.require=name=>{if(name==='./validation')return {uuidPattern:/^[0-9a-f-]{36}$/i};throw new Error('Unexpected dependency '+name);};
entry._compile(compiled,'login-client-test.cjs');
if(previousUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=previousUrl;
if(previousKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=previousKey;
const {login}=entry.exports;
const session={access_token:'test-access-token',refresh_token:'test-refresh-token',expires_in:3600};

test('login tanpa CAPTCHA mempertahankan password persis dan membuat sesi via endpoint lokal',async()=>{
 const previousFetch=globalThis.fetch,previousStorage=globalThis.sessionStorage;
 const calls=[],removed=[];
 try {
  globalThis.sessionStorage={removeItem:name=>removed.push(name)};
  globalThis.fetch=async(url,init)=>{calls.push({url,init});return Response.json(calls.length===1?{session,context:{}}:{user:{id:'user-id'}});};
  const password='  Pā$$"word + &!  ';
  const context=await login(' ADMIN@LIVINA.WEDDING ',password);
  assert.equal(context.user.id,'user-id');assert.equal(calls.length,2);
  assert.equal(calls[0].url,'https://supabase.test/functions/v1/organizer-api');
  assert.deepEqual(JSON.parse(calls[0].init.body),{action:'login',email:'admin@livina.wedding',password});
  assert.equal(calls[0].init.credentials,'omit');
  assert.equal(calls[1].url,'/api/auth/session');
  assert.equal(calls[1].init.credentials,'same-origin');
  assert.deepEqual(JSON.parse(calls[1].init.body),session);
  assert.deepEqual(removed,['livina-admin-session']);
 } finally {globalThis.fetch=previousFetch;globalThis.sessionStorage=previousStorage;}
});

for(const [code,expected] of [['AUTH_REJECTED','authRejected'],['CAPTCHA_FAILED','captchaRejected'],['ACCOUNT_ACCESS_UNAVAILABLE','accountAccess'],[undefined,'authRejected']]) {
 test('pesan login memisahkan penolakan '+(code||'backend lama')+' dari sesi kedaluwarsa',async()=>{
  const previous=globalThis.fetch;let requests=0;
  try {
   globalThis.fetch=async()=>{requests++;return Response.json({code,message:'raw server detail'},{status:401});};
   await assert.rejects(()=>login('a@example.test','test-password'),error=>error.code===expected&&!error.message.includes('raw server detail'));
   assert.equal(requests,1);
  } finally {globalThis.fetch=previous;}
 });
}

test('Auth berhasil tetapi penyimpanan sesi ditolak tidak disebut password salah',async()=>{
 const previous=globalThis.fetch;let requests=0;
 try {
  globalThis.fetch=async()=>++requests===1?Response.json({session,context:{}}):Response.json(null,{status:401});
  await assert.rejects(()=>login('a@example.test','test-password'),error=>error.code==='sessionSetup');
  assert.equal(requests,2);
 } finally {globalThis.fetch=previous;}
});


test('upload video memakai upload-video, signed PUT dan finish-video dengan poster, tanpa polling',async()=>{
 const previous=globalThis.fetch,calls=[];
 try {
  globalThis.fetch=async(url,init)=>{calls.push({url:String(url),init});return calls.length===1?Response.json({id:'video-id',url:'https://supabase.test/storage/v1/object/upload/sign/test?token=test-signature'}):Response.json({ok:true});};
  const poster='12345678-1234-4234-8234-123456789abc';
  assert.equal(await entry.exports.uploadVideo(new File(['mp4'],'video.mp4',{type:'video/mp4'}),poster),'video-id');
  assert.equal(calls.length,3);assert.equal(JSON.parse(calls[0].init.body).action,'upload-video');assert.equal(calls[1].init.method,'PUT');assert.deepEqual(JSON.parse(calls[2].init.body),{action:'finish-video',id:'video-id',poster_id:poster});
 }finally{globalThis.fetch=previous;}
});
test('kode media 422 tampil sebagai pesan yang spesifik, bukan sesi berakhir',async()=>{
 const previous=globalThis.fetch;
 try {
  for(const [code,expected] of [['PHOTO_INVALID','photoInvalid'],['VIDEO_FORMAT','videoFormat'],['VIDEO_LIMIT','videoLimit'],['VIDEO_POSTER','videoPoster']]){
   globalThis.fetch=async()=>Response.json({code},{status:422});
   await assert.rejects(()=>entry.exports.photoUrl('media-id'),error=>error.code===expected);
  }
 }finally{globalThis.fetch=previous;}
});
