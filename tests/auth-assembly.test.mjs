import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as T from 'three';

// Resolve the app's bundler-style TS specifiers in Node's native TypeScript runner.
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
    throw error;
  }
} });
const { createAssemblyModel } = await import('../lib/auth/assembly-model.ts');
const { createAssemblyTimeline } = await import('../lib/auth/assembly-timeline.ts');
const context = new Proxy({}, { get: (_, name) => name === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => context }) };

const parts = ['board', 'processor', 'memory', 'ssd', 'cooler', 'gpu', 'power', 'panel'];
const positions = model => Object.fromEntries(parts.map(name => [name, model[name].position.toArray()]));
function near(actual, expected) {
  for (const name of parts) actual[name].forEach((value, i) => assert.ok(Math.abs(value - expected[name][i]) < .00001, `${name}: ${value} != ${expected[name][i]}`));
}

test('PC assembly finishes in the designed sockets and scroll seeking is reversible', () => {
  const model = createAssemblyModel();
  const assembled = positions(model);
  const timeline = createAssemblyTimeline(model);
  assert.equal(timeline.duration, 18000);
  timeline.seek(timeline.duration, true);
  near(positions(model), assembled);
  const snapshots = new Map();
  for (const progress of [0, .15, .31, .5, .72, .9, 1]) {
    timeline.seek(timeline.duration * progress, true);
    snapshots.set(progress, positions(model));
    model.root.updateMatrixWorld(true);
    model.root.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
  }
  for (const progress of [1, .9, .72, .5, .31, .15, 0]) {
    timeline.seek(timeline.duration * progress, true);
    near(positions(model), snapshots.get(progress));
  }
  timeline.cancel();
  model.dispose();
});

test('assembled internal parts fit the case and GPU resources are released', () => {
  const model = createAssemblyModel();
  model.root.updateMatrixWorld(true);
  for (const name of ['board', 'cooler', 'gpu', 'power']) {
    const box = new T.Box3().setFromObject(model[name]);
    assert.ok(box.min.x >= -1.85 && box.max.x <= 1.85, `${name} width`);
    assert.ok(box.min.y >= -2.35 && box.max.y <= 2.35, `${name} height`);
    assert.ok(box.min.z >= -1.07 && box.max.z <= 1.1, `${name} depth`);
  }
  let meshes = 0, triangles = 0, disposed = 0;
  model.root.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    meshes++;
    const position = object.geometry.getAttribute('position');
    triangles += (object.geometry.index?.count ?? position.count) / 3;
    assert.ok(Array.from(position.array).every(Number.isFinite));
    object.geometry.addEventListener('dispose', () => disposed++);
  });
  assert.ok(meshes < 100, `mobile draw budget: ${meshes}`);
  assert.ok(triangles < 160000, `triangle budget: ${triangles}`);
  model.dispose();
  assert.equal(disposed, meshes);
});
