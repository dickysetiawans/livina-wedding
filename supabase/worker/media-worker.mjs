// Node.js >=20.9 + FFmpeg/FFprobe pada host worker. Jalankan --once atau loop.
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const base = process.env.SUPABASE_URL?.replace(/\/$/,'');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib tersedia di environment server');
const executable = process.platform==='win32'?'.exe':'';
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'+executable;
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe'+executable;
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json','Content-Profile':'organizer','Accept-Profile':'organizer',Prefer:'return=representation'};
async function api(path,method='GET',body) {
 const response=await fetch(`${base}/rest/v1/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 if(!response.ok) throw new Error('DATABASE_FAILED');
 return response.status===204?null:response.json();
}
async function probe(path) {
 const {stdout}=await exec(ffprobe,['-v','error','-protocol_whitelist','file,pipe','-format_whitelist','jpeg_pipe,png_pipe,webp_pipe,mov,matroska,webm','-show_streams','-show_format','-of','json',path],{timeout:30000,maxBuffer:1024*1024,windowsHide:true});
 return JSON.parse(stdout);
}
async function put(path,file,mime) {
 const response=await fetch(`${base}/storage/v1/object/organizer-media/${path}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':mime,'x-upsert':'false'},body:await readFile(file),signal:AbortSignal.timeout(120000)});
 if(!response.ok) throw new Error('STORAGE_FAILED');
}
async function removeObjects(bucket,paths) {
 if(!paths.length) return;
 const r=await fetch(`${base}/storage/v1/object/${bucket}`,{method:'DELETE',headers,body:JSON.stringify({prefixes:paths})});
 if(!r.ok) console.error('Pembersihan Storage perlu diulang oleh operator.');
}
async function processOne() {
 const [media]=await api('rpc/claim_media','POST',{});
 if(!media) return false;
 let directory; const outputs=[]; let posterId; let committed=false;
 try {
  const source=await fetch(`${base}/storage/v1/object/authenticated/organizer-staging/${media.source_path}`,{headers,signal:AbortSignal.timeout(120000)});
  if(source.status===404||source.status===400) {
   // Baris dibuat sebelum upload selesai. Jangan anggap file belum ada sebagai file rusak.
   if(Date.now()-Date.parse(media.created_at)<15*60000) {await api(`media_files?id=eq.${media.id}`,'PATCH',{status:'pending'});return false;}
   throw new Error('SOURCE_NOT_FOUND');
  }
  if(!source.ok) throw new Error('SOURCE_DOWNLOAD_FAILED');
  const limit=media.kind==='image'?5242880:41943040;
  const reader=source.body.getReader();let length=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new Error('SOURCE_TOO_LARGE');}chunks.push(value);}
  if(length!==Number(media.source_size_bytes)||!length) throw new Error('SOURCE_SIZE_MISMATCH');
  directory=await mkdtemp(join(tmpdir(),'organizer-media-'));
  const input=join(directory,'input');await writeFile(input,Buffer.concat(chunks));
  const metadata=await probe(input),visual=metadata.streams.filter(s=>s.codec_type==='video');
  if(visual.length!==1||!visual[0].width||!visual[0].height) throw new Error('INVALID_MEDIA');
  const stream=visual[0];
  const output=join(directory,media.kind==='image'?'result.webp':'result.mp4');
  const runId=crypto.randomUUID();
  const outputPath=`${media.uploaded_by}/${media.id}/${runId}/result.${media.kind==='image'?'webp':'mp4'}`;
  if(media.kind==='image') {
   if(!['mjpeg','png','webp'].includes(stream.codec_name)||!['jpeg_pipe','png_pipe','webp_pipe'].includes(metadata.format.format_name)||stream.width*stream.height>20000000||metadata.streams.length!==1) throw new Error('INVALID_IMAGE');
   await exec(ffmpeg,['-y','-v','error','-protocol_whitelist','file,pipe','-format_whitelist','jpeg_pipe,png_pipe,webp_pipe,mov,matroska,webm','-i',input,'-frames:v','1','-vf',"scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease",'-map_metadata','-1','-c:v','libwebp','-quality','80',output],{timeout:90000,windowsHide:true});
   // Perkecil dimensi bertahap tanpa menurunkan kualitas di bawah 75.
   for(const side of [1600,1280,960,640]) {
    if((await stat(output)).size<=307200) break;
    await exec(ffmpeg,['-y','-v','error','-protocol_whitelist','file,pipe','-format_whitelist','jpeg_pipe,png_pipe,webp_pipe','-i',input,'-frames:v','1','-vf',`scale=w='min(${side},iw)':h='min(${side},ih)':force_original_aspect_ratio=decrease`,'-map_metadata','-1','-c:v','libwebp','-quality','75',output],{timeout:90000,windowsHide:true});
   }
   // Sumber yang sudah kecil boleh menghasilkan WebP sedikit lebih besar.
   // Batas hasil tetap diperiksa sebelum unggah, jangan merusak kualitas demi rasio.
  } else {
   const duration=Number(metadata.format.duration);
   if(!Number.isFinite(duration)||duration<=0||duration>60||stream.width*stream.height>3840*2160||!['h264','hevc','vp8','vp9','av1','mpeg4'].includes(stream.codec_name)||!/(mp4|mov|webm|matroska)/.test(metadata.format.format_name)) throw new Error('INVALID_VIDEO');
   await exec(ffmpeg,['-y','-v','error','-protocol_whitelist','file,pipe','-format_whitelist','jpeg_pipe,png_pipe,webp_pipe,mov,matroska,webm','-i',input,'-map','0:v:0','-map','0:a:0?','-vf',"scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",'-c:v','libx264','-preset','medium','-crf','26','-maxrate','1800k','-bufsize','3600k','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-map_metadata','-1','-movflags','+faststart',output],{timeout:300000,windowsHide:true});
   if((await stat(output)).size>=length) throw new Error('VIDEO_ALREADY_OPTIMAL');
   const poster=join(directory,'poster.webp');
   await exec(ffmpeg,['-y','-v','error','-protocol_whitelist','file,pipe','-format_whitelist','mov','-i',output,'-frames:v','1','-c:v','libwebp','-quality','80',poster],{timeout:60000,windowsHide:true});
   const path=`${media.uploaded_by}/${media.id}/${runId}/poster.webp`,info=await probe(poster),size=(await stat(poster)).size;
   if(size>5242880) throw new Error('POSTER_TOO_LARGE');
   await put(path,poster,'image/webp');outputs.push(path);
   const [record]=await api('media_files','POST',{kind:'image',status:'ready',original_name:'Poster video.webp',source_size_bytes:size,size_bytes:size,width:info.streams[0].width,height:info.streams[0].height,mime_type:'image/webp',storage_bucket:'organizer-media',storage_path:path,uploaded_by:media.uploaded_by,alt_text:media.alt_text,is_decorative:media.is_decorative});posterId=record.id;
  }
  const info=await probe(output),size=(await stat(output)).size;
  if(size>(media.kind==='image'?5242880:20971520)) throw new Error('RESULT_TOO_LARGE');
  await put(outputPath,output,media.kind==='image'?'image/webp':'video/mp4');outputs.push(outputPath);
  const saved=await api(`media_files?id=eq.${media.id}`,'PATCH',{status:'ready',storage_bucket:'organizer-media',storage_path:outputPath,mime_type:media.kind==='image'?'image/webp':'video/mp4',size_bytes:size,width:info.streams[0].width,height:info.streams[0].height,duration_seconds:media.kind==='video'?Number(info.format.duration):null,poster_media_id:posterId||null,error_code:null,source_path:null});
  if(!saved.length) throw new Error('MEDIA_REMOVED');
  committed=true;
  await removeObjects('organizer-staging',[media.source_path]);
  console.log(`Media ${media.id} siap (${size} byte).`);
 } catch(error) {
  if(!committed) {
   if(posterId) await api(`media_files?id=eq.${posterId}`,'DELETE').catch(()=>{});
   await removeObjects('organizer-media',outputs).catch(()=>{});
   const code=/^[A-Z_]+$/.test(error.message)?error.message:'PROCESSING_FAILED';
   await api(`media_files?id=eq.${media.id}`,'PATCH',{status:'failed',error_code:code}).catch(()=>{});
   console.error(`Media ${media.id} gagal. Periksa worker dan metadata file.`);
  }
 } finally {if(directory)await rm(directory,{recursive:true,force:true});}
 return true;
}
let lastCleanup=0;
do {
 if(Date.now()-lastCleanup>300000) {await api('rpc/cleanup_login_limits','POST',{}).then(()=>{lastCleanup=Date.now();}).catch(()=>{});}
 try {const worked=await processOne();if(!worked&&!process.argv.includes('--once'))await new Promise(r=>setTimeout(r,5000));}
 catch {console.error('Worker gagal mengakses layanan. Periksa environment dan jaringan.');if(process.argv.includes('--once'))process.exitCode=1;else await new Promise(r=>setTimeout(r,5000));}
} while(!process.argv.includes('--once'));
