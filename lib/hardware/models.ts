import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { HardwareId } from "./catalog";

/** Original reference meshes. These are not scans or measurements of listed products. */
export function createHardwareModel(id: HardwareId) {
  const root = new T.Group(),
    base = new T.Group();
  root.add(base);
  const textures: T.Texture[] = [],
    materials: T.Material[] = [];
  const parts: { group: T.Group; offset: T.Vector3 }[] = [];
  const mat = (color: number, metalness = 0.2, roughness = 0.5) => {
    const m = new T.MeshStandardMaterial({ color, metalness, roughness });
    materials.push(m);
    return m;
  };
  const pcb = mat(0x193e36, 0.25, 0.5),
    graphite = mat(0x273239, 0.4, 0.4),
    chip = mat(0x131a20, 0.15, 0.72),
    ceramic = mat(0x605443);
  const silver = mat(0xa7b0b9, 0.88, 0.28),
    aluminum = mat(0x78858d, 0.8, 0.35),
    gold = mat(0xc7a259, 0.78, 0.3),
    copper = mat(0xa26a42, 0.75, 0.3),
    accent = mat(0x6ac9cd, 0.5, 0.32),
    socket = mat(0x090e13, 0.15, 0.8);
  function box(
    g: T.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: T.Material,
    rounded = false,
  ) {
    const mesh = new T.Mesh(
      rounded
        ? new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.18)
        : new T.BoxGeometry(w, h, d),
      m,
    );
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  }
  function cyl(
    g: T.Group,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    m: T.Material,
  ) {
    const mesh = new T.Mesh(new T.CylinderGeometry(r, r, h, 24), m);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  }
  function ring(
    g: T.Group,
    x: number,
    y: number,
    z: number,
    outer: number,
    inner: number,
    m: T.Material = gold,
  ) {
    const mesh = new T.Mesh(new T.RingGeometry(inner, outer, 28), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    g.add(mesh);
  }
  function part(x: number, y: number, z: number) {
    const group = new T.Group();
    root.add(group);
    parts.push({ group, offset: new T.Vector3(x, y, z) });
    return group;
  }
  function texture(
    draw: (ctx: CanvasRenderingContext2D) => void,
    w = 1024,
    h = 1024,
  ) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    draw(ctx);
    const map = new T.CanvasTexture(c);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    textures.push(map);
    return map;
  }
  function label(
    g: T.Group,
    text: string,
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    light = false,
  ) {
    const map = texture(
      (ctx) => {
        ctx.fillStyle = light ? "#c5cfd2" : "#29383b";
        ctx.font = "600 42px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lines = text.split("\n");
        lines.forEach((l, i) =>
          ctx.fillText(l, 256, 64 + (i - (lines.length - 1) / 2) * 43, 480),
        );
      },
      512,
      128,
    );
    const m = new T.MeshStandardMaterial({
      map,
      transparent: true,
      roughness: 0.65,
      metalness: 0.2,
      depthWrite: false,
    });
    materials.push(m);
    const mesh = new T.Mesh(new T.PlaneGeometry(w, d), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    g.add(mesh);
  }
  function board(
    g: T.Group,
    w: number,
    d: number,
    thickness = 0.055,
    notched: false | "ram" | "m2" = false,
  ) {
    const shape = new T.Shape();
    shape.moveTo(-w / 2, -d / 2);
    shape.lineTo(w / 2, -d / 2);
    if (notched === "m2") {
      shape.lineTo(w / 2, -0.115);
      shape.absarc(w / 2, 0, 0.115, -Math.PI / 2, (-3 * Math.PI) / 2, true);
    }
    shape.lineTo(w / 2, d / 2);
    if (notched === "ram") {
      shape.lineTo(w * 0.08, d / 2);
      shape.lineTo(w * 0.08, d / 2 - 0.12);
      shape.lineTo(w * 0.045, d / 2 - 0.12);
      shape.lineTo(w * 0.045, d / 2);
    }
    shape.lineTo(-w / 2, d / 2);
    if (notched === "m2") {
      shape.lineTo(-w / 2, 0.41);
      shape.lineTo(-w / 2 + 0.23, 0.41);
      shape.lineTo(-w / 2 + 0.23, 0.32);
      shape.lineTo(-w / 2, 0.32);
      const mount = new T.Mesh(
        new T.RingGeometry(0.116, 0.17, 20, 1, Math.PI / 2, Math.PI),
        gold,
      );
      mount.rotation.x = -Math.PI / 2;
      mount.position.set(w / 2, thickness + 0.003, 0);
      g.add(mount);
    }
    shape.closePath();
    if (!notched)
      for (const x of [-w / 2 + 0.16, w / 2 - 0.16])
        for (const z of [-d / 2 + 0.16, d / 2 - 0.16]) {
          const hole = new T.Path();
          hole.absarc(x, z, 0.045, 0, Math.PI * 2, true);
          shape.holes.push(hole);
          ring(g, x, thickness + 0.002, z, 0.083, 0.046);
        }
    const geo = new T.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 16,
    });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, thickness, 0);
    g.add(new T.Mesh(geo, pcb));
    const map = texture((ctx) => {
      ctx.fillStyle = "#183b34";
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 105; i++) {
        const x = ((i * 73 + 31) % 960) + 32,
          y = ((i * 149 + 27) % 960) + 32;
        ctx.strokeStyle = i % 4 ? "#31554a" : "#6b7958";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 32, y);
        ctx.lineTo(x + 57, y + 25);
        ctx.lineTo(x + 57, y + 80 + (i % 5) * 13);
        ctx.stroke();
        ctx.strokeStyle = "#90a797";
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.stroke();
        if (i % 3 === 0) {
          ctx.fillStyle = "#a2b8ab";
          ctx.font = "8px monospace";
          ctx.fillText(`R${i + 10}`, x + 4, y - 7);
        }
      }
      ctx.strokeStyle = "#97a99c";
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, 1000, 1000);
    });
    const silk = new T.MeshStandardMaterial({
      map,
      metalness: 0.25,
      roughness: 0.58,
      side: T.DoubleSide,
    });
    materials.push(silk);
    const surface = new T.ShapeGeometry(shape, 16);
    surface.rotateX(Math.PI / 2);
    const uv = surface.getAttribute("uv"),
      pos = surface.getAttribute("position");
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, pos.getX(i) / w + 0.5, pos.getZ(i) / d + 0.5);
    const skin = new T.Mesh(surface, silk);
    skin.position.y = thickness + 0.001;
    g.add(skin);
  }
  function resistor(g: T.Group, x: number, y: number, z: number) {
    box(g, x, y, z, 0.065, 0.025, 0.035, ceramic);
    for (const s of [-1, 1])
      box(g, x + s * 0.029, y, z, 0.014, 0.028, 0.038, silver);
  }
  function cap(g: T.Group, x: number, z: number) {
    cyl(g, x, 0.18, z, 0.075, 0.22, graphite);
    cyl(g, x, 0.295, z, 0.071, 0.012, silver);
    box(g, x, 0.303, z, 0.11, 0.002, 0.007, graphite);
    box(g, x, 0.303, z, 0.007, 0.002, 0.11, graphite);
  }
  function chipPins(
    g: T.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
  ) {
    box(g, x, y, z, w, 0.08, d, chip, true);
    for (let i = 0; i < 9; i++)
      for (const s of [-1, 1])
        box(
          g,
          x - w * 0.42 + i * w * 0.105,
          y - 0.02,
          z + s * (d / 2 + 0.025),
          w / 25,
          0.025,
          0.06,
          silver,
        );
  }
  function cpu(g: T.Group, x = 0, y = 0, z = 0, lid = g) {
    box(g, x, y + 0.045, z, 1.18, 0.09, 1.18, pcb, true);
    box(lid, x, y + 0.12, z, 1.02, 0.09, 1.02, silver, true);
    label(lid, "ECOCICLO\nPROCESSOR", x, y + 0.167, z, 0.68, 0.31);
    for (let ix = 0; ix < 16; ix++)
      for (let iz = 0; iz < 16; iz++) {
        if (ix > 4 && ix < 11 && iz > 4 && iz < 11) continue;
        box(
          g,
          x - 0.51 + ix * 0.068,
          y - 0.004,
          z - 0.51 + iz * 0.068,
          0.038,
          0.008,
          0.038,
          gold,
        );
      }
    for (let i = 0; i < 8; i++)
      resistor(
        g,
        x - 0.24 + (i % 4) * 0.16,
        y - 0.017,
        z - 0.1 + Math.floor(i / 4) * 0.2,
      );
  }
  function ram(g: T.Group, chips = g) {
    board(g, 4.9, 1.15, 0.055, "ram");
    for (const side of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        box(
          chips,
          -2.08 + i * 0.59,
          side > 0 ? 0.12 : -0.055,
          -0.05,
          0.47,
          0.11,
          0.55,
          chip,
          true,
        );
        if (side > 0)
          label(
            chips,
            "EC MEMORY",
            -2.08 + i * 0.59,
            0.177,
            -0.05,
            0.35,
            0.08,
            true,
          );
      }
      for (let i = 0; i < 68; i++) {
        const x = -2.33 + i * 0.069;
        if (x > 0.19 && x < 0.42) continue;
        box(g, x, side > 0 ? 0.059 : -0.004, 0.46, 0.04, 0.006, 0.21, gold);
      }
    }
    for (let i = 0; i < 30; i++) resistor(g, -2.2 + i * 0.148, 0.08, -0.43);
  }
  function ssd(g: T.Group, chips = g) {
    board(g, 4.7, 1.3, 0.065, "m2");
    for (let i = 0; i < 3; i++) {
      chipPins(chips, -0.9 + i * 0.9, 0.14, 0, 0.72, 0.88);
      label(
        chips,
        i === 2 ? "CONTROLLER" : "NAND FLASH",
        -0.9 + i * 0.9,
        0.183,
        0,
        0.58,
        0.16,
        true,
      );
    }
    for (let i = 0; i < 18; i++) {
      const z = -0.55 + i * 0.063;
      if (z > 0.3 && z < 0.43) continue;
      for (const y of [0.07, -0.005])
        box(g, -2.2, y, z, 0.28, 0.012, 0.038, gold);
    }
    for (let i = 0; i < 16; i++) resistor(g, -0.9 + i * 0.16, 0.095, -0.53);
    label(g, "EcoCiclo M.2 / 2280", 0.1, 0.069, 0.52, 1.9, 0.1, true);
  }
  function heatsink(
    g: T.Group,
    x: number,
    z: number,
    w: number,
    d: number,
    h = 0.42,
  ) {
    box(g, x, 0.13, z, w, 0.12, d, aluminum);
    for (let i = 0; i < 12; i++)
      box(
        g,
        x - w / 2 + 0.035 + (i * (w - 0.07)) / 11,
        0.15 + h / 2,
        z,
        0.026,
        h,
        d,
        graphite,
      );
  }
  function motherboard() {
    board(base, 4.7, 5.6);
    box(base, -0.3, 0.12, -0.9, 1.58, 0.13, 1.58, socket, true);
    for (const z of [-1.66, -0.14])
      box(base, -0.3, 0.22, z, 1.55, 0.065, 0.055, silver);
    for (const x of [-1.05, 0.45])
      box(base, x, 0.22, -0.9, 0.055, 0.065, 1.54, silver);
    cpu(part(0, 1.4, 0), -0.3, 0.22, -0.9);
    box(base, 0.56, 0.24, -0.9, 0.035, 0.035, 1.72, silver).rotation.y = -0.08;
    heatsink(base, -1.35, -0.95, 0.36, 1.9);
    heatsink(base, -0.35, -2.24, 1.65, 0.45);
    for (let i = 0; i < 8; i++) cap(base, -1.01 + i * 0.23, -1.92);
    for (let i = 0; i < 7; i++) cap(base, -1.6, -0.18 + i * 0.25);
    for (let i = 0; i < 4; i++) {
      const x = 0.94 + i * 0.29;
      box(
        base,
        x,
        0.17,
        -1.08,
        0.17,
        0.23,
        2.3,
        i % 2 ? graphite : socket,
        true,
      );
      box(base, x, 0.29, -1.08, 0.055, 0.01, 2.14, socket);
      for (const z of [-2.26, 0.1])
        box(base, x, 0.24, z, 0.22, 0.32, 0.13, aluminum, true);
    }
    const memory = part(0.1, 1, 0),
      module = new T.Group();
    memory.add(module);
    ram(module);
    module.scale.setScalar(0.44);
    module.rotation.set(Math.PI / 2, Math.PI / 2, 0, "YXZ");
    module.position.set(1.52, 0.55, -1.08);
    for (let i = 0; i < 3; i++) {
      const z = 0.6 + i * 0.65;
      box(
        base,
        -0.55,
        0.16,
        z,
        2.7,
        0.2,
        0.19,
        i === 0 ? silver : graphite,
        true,
      );
      box(base, -0.55, 0.267, z, 2.5, 0.014, 0.05, socket);
      box(base, 0.87, 0.2, z, 0.14, 0.28, 0.22, graphite);
      for (let j = 0; j < 36; j++)
        box(base, -1.75 + j * 0.069, 0.268, z, 0.02, 0.008, 0.045, gold);
    }
    heatsink(base, 1.56, 1.16, 1.1, 1.13, 0.15);
    label(base, "EC / ATX", 1.56, 0.37, 1.16, 0.75, 0.2, true);
    const storage = part(0, 0.65, 0.22),
      drive = new T.Group();
    storage.add(drive);
    ssd(drive);
    drive.scale.setScalar(0.38);
    drive.position.set(-0.3, 0.08, 0.27);
    for (let i = 0; i < 4; i++) {
      box(base, -2.04, 0.31, -2.14 + i * 0.64, 0.52, 0.52, 0.5, silver, true);
      for (const y of [0.21, 0.42]) {
        box(base, -2.31, y, -2.14 + i * 0.64, 0.008, 0.12, 0.31, socket);
        box(
          base,
          -2.32,
          y,
          -2.14 + i * 0.64,
          0.01,
          0.04,
          0.25,
          i < 2 ? accent : graphite,
        );
      }
    }
    box(base, 2.08, 0.26, -0.85, 0.27, 0.36, 1.55, socket);
    for (let i = 0; i < 12; i++)
      for (const x of [2.01, 2.15])
        box(base, x, 0.445, -1.53 + i * 0.123, 0.055, 0.01, 0.075, graphite);
    for (let i = 0; i < 5; i++)
      box(base, 2.05, 0.22, 0.5 + i * 0.35, 0.4, 0.3, 0.28, socket, true);
    cyl(base, -0.98, 0.13, 2.3, 0.25, 0.1, silver);
    ring(base, -0.98, 0.19, 2.3, 0.26, 0.23, graphite);
    chipPins(base, 0.12, 0.12, 2.25, 0.52, 0.5);
    for (let i = 0; i < 18; i++) {
      resistor(
        base,
        -1.85 + (i % 6) * 0.3,
        0.09,
        -2.57 + Math.floor(i / 6) * 0.13,
      );
      resistor(
        base,
        -0.65 + (i % 6) * 0.29,
        0.09,
        2.15 + Math.floor(i / 6) * 0.16,
      );
    }
    label(base, "EcoCiclo", -0.38, 0.065, 1.58, 1.08, 0.22, true);
  }
  function fan(g: T.Group, x: number, z: number) {
    cyl(g, x, 0.66, z, 0.86, 0.04, socket);
    ring(g, x, 0.78, z, 0.89, 0.84, aluminum);
    for (let i = 0; i < 11; i++) {
      const shape = new T.Shape();
      shape.moveTo(0.18, -0.07);
      shape.bezierCurveTo(0.36, -0.22, 0.62, -0.18, 0.82, 0.03);
      shape.bezierCurveTo(0.71, 0.26, 0.39, 0.28, 0.2, 0.12);
      shape.closePath();
      const geo = new T.ExtrudeGeometry(shape, {
        depth: 0.027,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 1,
        steps: 1,
        curveSegments: 8,
      });
      geo.rotateX(-Math.PI / 2);
      geo.rotateY((i * Math.PI * 2) / 11);
      const blade = new T.Mesh(geo, graphite);
      blade.position.set(x, 0.73, z);
      g.add(blade);
    }
    cyl(g, x, 0.76, z, 0.22, 0.12, aluminum);
    cyl(g, x, 0.825, z, 0.18, 0.01, graphite);
    label(g, "EC", x, 0.833, z, 0.18, 0.11, true);
  }
  function gpu() {
    board(base, 5.4, 2.15, 0.07);
    for (let i = 0; i < 62; i++)
      box(base, -1.4 + i * 0.048, 0.04, 1.18, 0.03, 0.06, 0.26, gold);
    const cooler = part(0, 0.95, 0);
    for (let i = 0; i < 64; i++)
      box(cooler, -2.4 + i * 0.076, 0.32, 0, 0.022, 0.43, 1.82, aluminum);
    for (const z of [-0.62, 0.62])
      cyl(cooler, 0, 0.45, z, 0.065, 4.7, copper).rotation.z = Math.PI / 2;
    for (const z of [-1.02, 1.02])
      box(cooler, 0, 0.65, z, 5.35, 0.22, 0.18, graphite, true);
    for (const x of [-2.61, 0, 2.61])
      box(cooler, x, 0.65, 0, 0.16, 0.22, 2.12, graphite, true);
    fan(cooler, -1.29, 0);
    fan(cooler, 1.29, 0);
    box(cooler, 0, 0.79, -1.04, 3.7, 0.035, 0.03, accent);
    box(base, -2.8, 0.3, 0, 0.07, 0.8, 2.5, silver);
    for (let i = 0; i < 4; i++)
      box(base, -2.84, 0.24, -0.81 + i * 0.48, 0.012, 0.24, 0.35, socket);
    box(base, 2.14, 0.3, -0.89, 0.62, 0.3, 0.32, socket);
    chipPins(base, 0, 0.12, 0, 0.85, 0.85);
    for (const x of [-0.72, 0.72])
      for (const z of [-0.65, 0.65])
        box(base, x, 0.12, z, 0.38, 0.08, 0.4, chip);
  }
  function notebook() {
    box(base, 0, 0.13, 0, 5.1, 0.22, 3.45, aluminum, true);
    box(base, 0, 0.25, -0.34, 4.65, 0.025, 1.85, socket, true);
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 14; col++) {
        if (row === 4 && col > 3 && col < 10) continue;
        const x = -2.12 + col * 0.326,
          z = -1.03 + row * 0.34;
        box(base, x, 0.29, z, 0.28, 0.055, 0.26, graphite, true);
        label(
          base,
          row === 0
            ? String((col + 1) % 10)
            : (["QWERTYUIOP[]", "ASDFGHJKL;", "ZXCVBNM"][Math.min(row - 1, 2)][
                col
              ] ?? ""),
          x,
          0.32,
          z,
          0.08,
          0.07,
          true,
        );
      }
    box(base, 0.17, 0.29, 0.33, 1.85, 0.055, 0.26, graphite, true);
    box(base, 0, 0.25, 1.05, 1.55, 0.018, 0.77, silver, true);
    for (let i = 0; i < 3; i++)
      box(base, -2.56, 0.13, -0.9 + i * 0.53, 0.012, 0.08, 0.3, socket);
    const display = part(0, 0.8, -0.25),
      lid = new T.Group();
    display.add(lid);
    lid.position.set(0, 0.24, -1.63);
    lid.rotation.x = -0.19;
    box(lid, 0, 1.52, 0, 5.05, 3.05, 0.11, aluminum, true);
    box(lid, 0, 1.54, 0.065, 4.83, 2.82, 0.028, socket, true);
    const map = texture(
      (ctx) => {
        const gradient = ctx.createLinearGradient(0, 0, 1024, 640);
        gradient.addColorStop(0, "#102e38");
        gradient.addColorStop(1, "#3e848d");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 640);
        for (let i = 0; i < 9; i++) {
          ctx.strokeStyle = `rgba(171,229,221,${0.12 + i * 0.02})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(
            580,
            370,
            420 - i * 30,
            180 - i * 12,
            -0.6,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
        ctx.fillStyle = "#eff8f7";
        ctx.font = "600 56px Arial";
        ctx.fillText("EcoCiclo", 76, 120);
        ctx.font = "25px Arial";
        ctx.fillText("Novas possibilidades.", 78, 165);
      },
      1024,
      640,
    );
    const screen = new T.MeshBasicMaterial({ map });
    materials.push(screen);
    const plane = new T.Mesh(new T.PlaneGeometry(4.65, 2.59), screen);
    plane.position.set(0, 1.55, 0.082);
    lid.add(plane);
    const webcam = new T.Mesh(new T.SphereGeometry(0.023, 12, 8), socket);
    webcam.position.set(0, 2.93, 0.085);
    lid.add(webcam);
    for (const x of [-1.8, 1.8])
      cyl(base, x, 0.25, -1.58, 0.115, 0.52, graphite).rotation.z = Math.PI / 2;
  }
  switch (id) {
    case "motherboard":
      motherboard();
      break;
    case "memory":
      ram(base, part(0, 0.5, 0));
      break;
    case "ssd":
      ssd(base, part(0, 0.55, 0));
      break;
    case "processor":
      cpu(base, 0, 0, 0, part(0, 0.4, 0));
      root.scale.setScalar(3.5);
      break;
    case "gpu":
      gpu();
      break;
    case "notebook":
      notebook();
  }
  // Batch static geometry by material, preserving the movable assembly groups.
  for (const group of [base, ...parts.map((p) => p.group)]) {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert(),
      buckets = new Map<T.Material, T.BufferGeometry[]>();
    group.traverse((object) => {
      if (!(object instanceof T.Mesh)) return;
      const material = object.material as T.Material;
      let geo = object.geometry.clone();
      geo.applyMatrix4(
        new T.Matrix4().multiplyMatrices(inverse, object.matrixWorld),
      );
      if (geo.index) {
        const flat = geo.toNonIndexed();
        geo.dispose();
        geo = flat;
      }
      const bucket = buckets.get(material) ?? [];
      bucket.push(geo);
      buckets.set(material, bucket);
      object.geometry.dispose();
    });
    group.clear();
    for (const [material, geometries] of buckets) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((g) => g.dispose());
      if (merged) {
        const mesh = new T.Mesh(merged, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
    }
  }
  root.updateMatrixWorld(true);
  root.position.sub(
    new T.Box3().setFromObject(root).getCenter(new T.Vector3()),
  );
  return {
    root,
    setExploded(amount: number) {
      parts.forEach((p) =>
        p.group.position.copy(p.offset).multiplyScalar(amount),
      );
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof T.Mesh) o.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
