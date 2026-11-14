import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createHardwareModel } from '../hardware/models';

/** Original, illustrative PC. Geometry is shared with the component studio. */
export function createAssemblyModel() {
  const root = new T.Group();
  const chassis = new T.Group();
  const panel = new T.Group();
  const cooler = new T.Group();
  const power = new T.Group();
  root.add(chassis, panel, cooler, power);
  const material = (color: number, metalness = .45, roughness = .4) =>
    new T.MeshStandardMaterial({ color, metalness, roughness });
  const graphite = material(0x253c44);
  const edge = material(0x647d82, .8, .28);
  const silver = material(0xb4c5ca, .8, .3);
  const black = material(0x101d24, .15, .6);
  const copper = material(0xc69472, .7, .3);
  const light = new T.MeshStandardMaterial({ color: 0x91dcd6, emissive: 0x51b5ae, emissiveIntensity: .8 });
  const glass = new T.MeshPhysicalMaterial({ color: 0xb6dfdb, transparent: true, opacity: .1, metalness: .05, roughness: .12, side: T.DoubleSide, depthWrite: false });
  const ownMaterials = [graphite, edge, silver, black, copper, light, glass];
  function box(parent: T.Group, x: number, y: number, z: number, w: number, h: number, d: number, mat: T.Material) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent: T.Group, radius: number, depth: number, mat: T.Material) {
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, depth, 32), mat);
    mesh.rotation.x = Math.PI / 2;
    parent.add(mesh);
    return mesh;
  }
  function fan(parent: T.Group, x: number, y: number, z: number, size: number) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(size);
    parent.add(group);
    const ring = new T.Mesh(new T.TorusGeometry(.44, .024, 8, 40), light);
    group.add(ring);
    cylinder(group, .125, .1, graphite);
    for (let i = 0; i < 9; i++) {
      const blade = box(group, 0, 0, 0, .15, .3, .025, edge);
      const angle = i / 9 * Math.PI * 2;
      blade.position.set(Math.sin(angle) * .25, Math.cos(angle) * .25, 0);
      blade.rotation.z = -angle + .5;
    }
    return group;
  }
  // Open side faces +Z. The front fascia is on the right (+X).
  for (const y of [-2.35, 2.35]) box(chassis, 0, y, 0, 3.8, .13, 2.3, graphite);
  for (const x of [-1.84, 1.84]) for (const z of [-1.06, 1.06]) box(chassis, x, 0, z, .12, 4.7, .12, edge);
  box(chassis, 0, 0, -1.06, 3.7, 4.6, .09, graphite);
  box(chassis, 1.85, 0, 0, .1, 4.6, 2.15, graphite);
  for (let i = 0; i < 29; i++) box(chassis, 1.912, -.95 + i * .104, 0, .015, .035, 1.7, black);
  for (const y of [-1.2, 0, 1.2]) {
    const frontFan = fan(chassis, 1.93, y, 0, 1.1);
    frontFan.rotation.y = Math.PI / 2;
  }
  box(chassis, 1.91, 2.08, 0, .018, .055, 1.5, copper);
  for (const x of [-1.4, 1.4]) for (const z of [-.76, .76]) box(chassis, x, -2.51, z, .38, .2, .43, black);
  for (let i = 0; i < 13; i++) box(chassis, -.7 + i * .15, 2.423, -.22, .055, .012, 1.3, black);
  box(chassis, 1.2, 2.43, .6, .16, .025, .16, light);
  // PSU, shroud and a visible cable bundle.
  box(power, -.55, -1.88, -.1, 2.5, .72, 1.85, black);
  box(power, -.35, -1.46, 0, 2.95, .065, 2.05, graphite);
  box(power, -.65, -1.89, .84, 1.1, .26, .025, edge);
  for (let i = 0; i < 5; i++) box(power, .7 + i * .055, -1.22, -.55, .035, .5, .035, black);
  const board = createHardwareModel('motherboard');
  board.root.scale.setScalar(.6);
  board.root.rotation.x = Math.PI / 2;
  board.root.position.set(-.22, .38, -.85);
  root.add(board.root);
  const processor = board.assemblyParts.find(part => part.name === 'processor')!;
  const memory = board.assemblyParts.find(part => part.name === 'memory')!;
  const ssd = board.assemblyParts.find(part => part.name === 'ssd')!;
  // CPU cooler with fins, copper heatpipes and an illuminated fan.
  cooler.position.set(-.4, .92, -.17);
  box(cooler, 0, 0, -.19, .65, .65, .16, copper);
  for (let i = 0; i < 16; i++) box(cooler, 0, -.5 + i * .065, 0, 1.06, .028, .5, silver);
  for (const x of [-.27, .27]) box(cooler, x, -.05, -.28, .06, .8, .06, copper);
  fan(cooler, 0, 0, .31, 1.07);
  const gpu = createHardwareModel('gpu');
  gpu.root.scale.setScalar(.49);
  gpu.root.rotation.x = Math.PI / 2;
  gpu.root.position.set(-.24, -.68, .1);
  root.add(gpu.root);
  // The last panel slides into the case; subtle glass keeps internal parts visible.
  box(panel, 0, 0, 1.125, 3.65, 4.5, .035, glass);
  for (const y of [-2.26, 2.26]) box(panel, 0, y, 1.14, 3.7, .055, .055, edge);
  for (const x of [-1.81, 1.81]) box(panel, x, 0, 1.14, .055, 4.5, .055, edge);
  for (const x of [-1.7, 1.7]) for (const y of [-2.13, 2.13]) {
    const screw = cylinder(panel, .043, .035, silver);
    screw.position.set(x, y, 1.18);
  }
  // Merge fixed details inside each movable group to keep draw calls low on phones.
  for (const group of [chassis, power, cooler, panel]) {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const buckets = new Map<T.Material, T.BufferGeometry[]>();
    group.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      const mat = object.material as T.Material;
      const bucket = buckets.get(mat) ?? [];
      bucket.push(geometry);
      buckets.set(mat, bucket);
      object.geometry.dispose();
    });
    group.clear();
    for (const [mat, geometries] of buckets) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach(geometry => geometry.dispose());
      if (merged) group.add(new T.Mesh(merged, mat));
    }
  }
  return {
    root, chassis, board: board.root, processor, memory, ssd, cooler, gpu: gpu.root, power, panel, light,
    dispose() {
      board.dispose();
      gpu.dispose();
      for (const group of [chassis, power, cooler, panel]) group.traverse(object => {
        if (object instanceof T.Mesh) object.geometry.dispose();
      });
      ownMaterials.forEach(mat => mat.dispose());
    },
  };
}
