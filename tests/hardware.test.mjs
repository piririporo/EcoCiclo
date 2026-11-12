import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHardwareModel } from "../lib/hardware/models.ts";
import { hardwareCatalog } from "../lib/hardware/catalog.ts";

// Geometry tests do not need a GPU or rasterized textures.
const context = new Proxy(
  {},
  {
    get: (_, name) =>
      name === "createLinearGradient"
        ? () => ({ addColorStop() {} })
        : () => {},
  },
);
globalThis.document = {
  createElement: () => ({ width: 1, height: 1, getContext: () => context }),
};
for (const item of hardwareCatalog)
  test(`${item.name}: geometry, assembly and resource disposal`, () => {
    const model = createHardwareModel(item.id);
    let meshes = 0,
      triangles = 0,
      disposed = 0;
    model.root.traverse((object) => {
      if (!object.isMesh) return;
      meshes++;
      const p = object.geometry.getAttribute("position");
      assert.ok(p.count > 0);
      assert.ok(Array.from(p.array).every(Number.isFinite));
      assert.equal(object.geometry.getAttribute("normal").count, p.count);
      assert.equal(object.geometry.getAttribute("uv").count, p.count);
      triangles += p.count / 3;
      object.geometry.addEventListener("dispose", () => disposed++);
    });
    assert.ok(meshes > 3 && meshes < 120, `unexpected draw count ${meshes}`);
    assert.ok(
      triangles > 300 && triangles < 120000,
      `unexpected triangle count ${triangles}`,
    );
    const assembled = new THREE.Box3().setFromObject(model.root);
    assert.ok(!assembled.isEmpty());
    model.setExploded(1);
    const exploded = new THREE.Box3().setFromObject(model.root);
    assert.ok(exploded.max.y > assembled.max.y);
    model.setExploded(0);
    assert.ok(new THREE.Box3().setFromObject(model.root).equals(assembled));
    model.dispose();
    assert.equal(disposed, meshes);
  });
