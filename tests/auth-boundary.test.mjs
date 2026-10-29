import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';

// Seluruh respons Auth/RPC di bawah adalah mock lokal; tidak mengakses database.
const source = await readFile(new URL('../src/lib/auth/server.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const writes = [];
const jar = { get: () => undefined, set: (...args) => writes.push(args), delete: () => {} };
const module = new Module('livina-auth-test.cjs');
module.require = name => {
  if (name === 'server-only') return {};
  if (name === 'next/headers') return { cookies: async () => jar };
  if (name === 'react') return { cache: fn => fn };
  throw new Error(`Unexpected runtime dependency: ${name}`);
};
const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
module._compile(compiled, 'livina-auth-test.cjs');
if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
const { verifySession, setSession, sameOrigin } = module.exports;

test('cookie palsu tidak menjadi sesi hanya karena cookie tersedia', async () => {
  const previous = globalThis.fetch;
  try { globalThis.fetch = async () => new Response('{}', { status: 401 }); assert.equal(await verifySession('forged-token'), null); }
  finally { globalThis.fetch = previous; }
});
test('identitas Auth dan profil aplikasi harus cocok', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async url => Response.json(url.includes('/auth/') ? { id: 'user-a' } : { user: { id: 'user-b' }, permissions: ['team_members.read'] });
    assert.equal(await verifySession('valid-jwt'), null);
  } finally { globalThis.fetch = previous; }
});
test('akun Auth tanpa konteks role aktif tidak dapat masuk panel', async () => {
  const previous = globalThis.fetch;
  try { globalThis.fetch = async url => Response.json(url.includes('/auth/') ? { id: 'user-a' } : null); assert.equal(await verifySession('valid-jwt'), null); }
  finally { globalThis.fetch = previous; }
});
test('identitas dan konteks yang terverifikasi diterima', async () => {
  const previous = globalThis.fetch;
  const context = { user: { id: 'user-a', name: 'Pengguna uji' }, permissions: ['team_members.read'] };
  try { globalThis.fetch = async url => Response.json(url.includes('/auth/') ? { id: 'user-a' } : context); assert.deepEqual(await verifySession('valid-jwt'), context); }
  finally { globalThis.fetch = previous; }
});
test('cookie sesi tidak dapat dibaca JavaScript dan memakai SameSite', async () => {
  writes.length = 0;
  await setSession('access-test', 'refresh-test');
  assert.equal(writes.length, 2);
  for (const [, , options] of writes) { assert.equal(options.httpOnly, true); assert.equal(options.sameSite, 'lax'); assert.equal(options.path, '/'); assert.ok(options.maxAge > 0); }
});
test('mutasi menolak origin asing, origin kosong dan request cross-site', () => {
  assert.equal(sameOrigin(new Request('https://livina.test/api/auth/session', { headers: { Origin: 'https://evil.test' } })), false);
  assert.equal(sameOrigin(new Request('https://livina.test/api/auth/session')), false);
  assert.equal(sameOrigin(new Request('https://livina.test/api/auth/session', { headers: { Origin: 'https://livina.test', 'Sec-Fetch-Site': 'cross-site' } })), false);
  assert.equal(sameOrigin(new Request('https://livina.test/api/auth/session', { headers: { Origin: 'https://livina.test', 'Sec-Fetch-Site': 'same-origin' } })), true);
});
