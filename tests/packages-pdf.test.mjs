import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';
async function load(path,deps={}){const code=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const entry=new Module('pdf-test.cjs');entry.require=name=>{if(name in deps)return deps[name];if(name.startsWith('node:'))return Module.createRequire(import.meta.url)(name);throw Error(name);};entry._compile(code,'pdf-test.cjs');return entry.exports;}
const pdf=await load('../src/lib/wedding/package-pdf.ts'),catalogLib=await load('../src/lib/wedding/packages.ts'),crew=await load('../src/lib/crew/validation.ts');
const category='12345678-1234-4234-8234-123456789abc',id='22345678-1234-4234-8234-123456789abc';
const item={id,name:'Paket (Signature) \\ Livina',category_id:category,subcategory_id:null,package_kind:'all_in',price:190000000,sort_order:0,benefits:['Koordinasi vendor','Pendamping pengantin']};
const content={settings:{brand_name:'Livina Wedding'},package_catalog:{categories:[{id:category,name:'Nasional',has_subcategories:false,sort_order:0}],subcategories:[],packages:[item],gallery:[]}};
const route=await load('../src/app/api/wedding/packages/pdf/route.ts',{'@/lib/wedding/content':{weddingContent:async()=>content},'@/lib/wedding/packages':catalogLib,'@/lib/wedding/package-pdf':pdf,'@/lib/crew/validation':crew});
const request=query=>route.GET(new Request('https://livina.test/api/wedding/packages/pdf?'+query));
test('PDF hanya menyediakan unduhan semua paket, menolak parameter per paket/filter',async()=>{
 for(const query of ['category=invalid',`package=${id}`,`category=${category}&kind=all_in`])assert.equal((await request(query)).status,400);
});
test('download PDF semua paket menggunakan Poppins embedded, harga/benefit dan attachment',async()=>{
 const response=await request('');assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/pdf');assert.match(response.headers.get('Content-Disposition'),/attachment/);assert.equal(response.headers.get('Cache-Control'),'no-store');
 const text=Buffer.from(await response.arrayBuffer()).toString('ascii');assert.match(text,/^%PDF-1.4/);assert.match(text,/Poppins-Regular/);assert.match(text,/FontFile2/);assert.match(text,/190\.000\.000/);assert.match(text,/Koordinasi vendor/);assert.ok(text.includes('\\(Signature\\)'));assert.match(text,/%%EOF/);
});
test('PDF panjang memecah halaman dan mempertahankan benefit terakhir serta cross-reference valid',async()=>{
 const bytes=pdf.buildPackagePdf({brand:'Livina Wedding',label:'Nasional / All In',packages:[{...item,benefits:Array.from({length:50},(_,n)=>`Benefit ${n+1} `+'Koordinasi acara dan dukungan vendor. '.repeat(12))}]});
 const text=Buffer.from(bytes).toString('ascii');assert.ok((text.match(/\/Type \/Page\b/g)||[]).length>1);assert.match(text,/Benefit 50/);
 const offset=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(text.slice(offset,offset+4),'xref');
 await mkdir(new URL('../.tmp/',import.meta.url),{recursive:true});await writeFile(new URL('../.tmp/paket-pdf-qa.pdf',import.meta.url),bytes);
});
