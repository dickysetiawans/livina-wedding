import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
async function load(path,deps={}){
 const code=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const entry=new Module('packages-public-test.cjs');entry.require=name=>name in deps?deps[name]:name==='react/jsx-runtime'?jsxRuntime:(()=>{throw Error('Unexpected import '+name);})();entry._compile(code,'packages-public-test.cjs');return entry.exports;
}
const inquiry=await load('../src/lib/wedding/package-inquiry.ts');
const catalogLib=await load('../src/lib/wedding/packages.ts');
const categories=[{id:'national',name:'Nasional',has_subcategories:false,sort_order:0},{id:'adat',name:'Adat',has_subcategories:true,sort_order:1},{id:'empty',name:'Kosong',has_subcategories:false,sort_order:2}];
const subcategories=[{id:'batak',category_id:'adat',name:'Batak',sort_order:0},{id:'bugis',category_id:'adat',name:'Bugis',sort_order:1}];
const make=(id,category_id,subcategory_id,package_kind='all_in',sort_order=0)=>({id,name:id,category_id,subcategory_id,package_kind,sort_order,price:190000000,benefits:['Vendor','Koordinasi']});
const catalog={categories,subcategories,packages:[...Array.from({length:9},(_,i)=>make('n'+i,'national',null,'all_in',i)),make('non','national',null,'non_venue'),make('b','adat','batak'),make('g','adat','bugis')],gallery:[{id:'photo',category_id:'national',subcategory_id:null,sort_order:0,photo_media_id:'public-photo',name:'Nasional',caption:'Foto Nasional'}]};
function nodes(node){return !node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(nodes)];}
const stub=()=>null;
test('pilihan mengikuti urutan master, kategori kosong hilang dan subkategori mengikuti induk',()=>{
 const all=catalogLib.packageSelection(catalog,null,null,'all_in');assert.deepEqual(all.categories.map(row=>row.id),['national','adat']);assert.equal(all.category.id,'national');assert.equal(all.subcategory,null);assert.equal(all.packages.length,9);
 const adat=catalogLib.packageSelection(catalog,'adat','invalid','all_in');assert.equal(adat.subcategory.id,'batak');assert.deepEqual(adat.packages.map(row=>row.id),['b']);
 const bugis=catalogLib.packageSelection(catalog,'adat','bugis','all_in');assert.deepEqual(bugis.packages.map(row=>row.id),['g']);
 const removed=catalogLib.packageSelection({...catalog,packages:catalog.packages.filter(row=>row.category_id!=='adat')},'adat','batak','all_in');assert.equal(removed.category.id,'national');
});
test('jenis paket tidak mengubah galeri; hanya jenis yang tersedia ditampilkan',()=>{
 const all=catalogLib.packageSelection(catalog,'national',null,'all_in'),non=catalogLib.packageSelection(catalog,'national',null,'non_venue');assert.deepEqual(all.gallery,non.gallery);assert.deepEqual(non.packages.map(row=>row.id),['non']);
 assert.deepEqual(catalogLib.packageSelection(catalog,'adat','batak','non_venue').kinds,['all_in']);
 assert.equal(catalogLib.packageSelection(catalogLib.emptyCatalog,null,null,'all_in').category,null);
});
test('kedua tema menampilkan 4/8/sisa dan mereset pagination saat kategori/jenis berubah',async()=>{
 for(const tone of ['dark','light']){
 let state;const component=await load('../src/components/wedding/packages/PackageShowcase.tsx',{'./PackageInquiry':{default:stub},'@/lib/wedding/package-inquiry':inquiry,'react':{useState:initial=>[state??=initial,value=>state=value]},'next/image':{default:stub},'next-intl':{useTranslations:()=>key=>key},'@/lib/wedding/packages':catalogLib,'./PackageShowcase.module.css':{default:{}}});
 const render=()=>component.default({catalog,tone});let tree=render();assert.equal(tree.props['data-tone'],tone);
 for(const count of [4,8,9]){assert.equal(nodes(tree).filter(node=>node.type==='article').length,count);const more=nodes(tree).find(node=>node.type==='button'&&node.props.children==='showMore');if(count===9)assert.equal(more,undefined);else{more.props.onClick();tree=render();}}
 nodes(tree).find(node=>node.type==='button'&&node.props.children==='nonVenue').props.onClick();tree=render();assert.equal(nodes(tree).filter(node=>node.type==='article').length,1);assert.equal(nodes(tree).filter(node=>node.type==='figure').length,1);
 nodes(tree).find(node=>node.type==='button'&&node.props.children==='allIn').props.onClick();tree=render();assert.equal(nodes(tree).filter(node=>node.type==='article').length,4);
 nodes(tree).find(node=>node.type==='button'&&node.props.children==='Adat').props.onClick();tree=render();assert.equal(nodes(tree).find(node=>node.type==='h3').props.children,'b');assert.equal(nodes(tree).filter(node=>node.type==='figure').length,0);
 nodes(tree).find(node=>node.type==='button'&&node.props.children==='Bugis').props.onClick();tree=render();assert.equal(nodes(tree).find(node=>node.type==='h3').props.children,'g');
 assert.equal(component.default({catalog:catalogLib.emptyCatalog,tone}),null);
 }
});
test('provider mempertahankan katalog dari Supabase dan kompatibel dengan migration lama tanpa katalog',async()=>{
 let content={settings:null,services:[],team_members:[],testimonials:[],social_links:[],package_catalog:catalog};
 const provider=await load('../src/lib/wedding/content.ts',{'server-only':{},'./packages':catalogLib,'@/lib/crew/public':{publicConfigured:true,publicRpc:async()=>content}});
 assert.deepEqual((await provider.weddingContent()).package_catalog,catalog);delete content.package_catalog;assert.deepEqual((await provider.weddingContent()).package_catalog,catalogLib.emptyCatalog);
});
