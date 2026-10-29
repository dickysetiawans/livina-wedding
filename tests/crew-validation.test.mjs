import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Jalankan validasi source aktual tanpa memasang runner/dependency baru.
const source = await readFile(new URL('../src/lib/crew/validation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { validateCrew, crewPayload, emptyCrew } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const valid = () => ({ ...emptyCrew, name: 'Anggota uji', role_title: 'Posisi uji', biography: 'Teks uji validasi.' });

test('menolak kolom wajib yang hanya berisi spasi', () => {
  const errors = validateCrew({ ...valid(), name: '   ', role_title: '\n', biography: '\t' });
  assert.deepEqual(Object.keys(errors).sort(), ['biography', 'name', 'role_title']);
});
test('menerima batas 150/150/2000 karakter dan menolak lebih panjang', () => {
  const value = { ...valid(), name: 'N'.repeat(150), role_title: 'P'.repeat(150), biography: 'T'.repeat(2000) };
  assert.deepEqual(validateCrew(value), {});
  assert.deepEqual(Object.keys(validateCrew({ ...value, name: value.name + 'N', role_title: value.role_title + 'P', biography: value.biography + 'T' })).sort(), ['biography', 'name', 'role_title']);
});
test('urutan menolak kosong/NaN, negatif, pecahan, tak hingga, dan overflow integer database', () => {
  for (const sort_order of [NaN, -1, 0.5, Infinity, 2147483648]) assert.ok(validateCrew({ ...valid(), sort_order }).sort_order);
  for (const sort_order of [0, 2147483647]) assert.deepEqual(validateCrew({ ...valid(), sort_order }), {});
});
test('foto opsional menerima UUID tetapi menolak URL bebas', () => {
  assert.deepEqual(validateCrew(valid()), {});
  assert.deepEqual(validateCrew({ ...valid(), photo_media_id: '61bc377f-54fb-43f0-a9bb-2a2401c37a8f' }), {});
  assert.ok(validateCrew({ ...valid(), photo_media_id: 'https://example.com/photo.webp' }).photo_media_id);
});
test('status publikasi harus melalui allowlist', () => {
  assert.ok(validateCrew({ ...valid(), status: 'ready' }).status);
  assert.deepEqual(validateCrew({ ...valid(), status: 'published' }), {});
});
test('payload menghapus field audit dan otorisasi tanpa mengubah sumber input', () => {
  const input = { ...valid(), name: ' Nama ', role_title: ' Posisi ', biography: ' Kata-kata ', role_id: 'admin', created_by: 'attacker', updated_at: '2000-01-01' };
  const payload = crewPayload(input);
  assert.deepEqual(Object.keys(payload).sort(), ['biography', 'is_founder', 'name', 'photo_media_id', 'role_title', 'sort_order', 'status']);
  assert.equal(payload.name, 'Nama');
  assert.equal(payload.biography, 'Kata-kata');
  assert.equal(input.name, ' Nama ');
});
