import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createHardwareModel } from "./models";
import type { HardwareId } from "./catalog";

export function mountHardwareScene(
  host: HTMLElement,
  id: HardwareId,
  initialExploded: boolean,
  onLost: () => void,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!context) throw new Error("WebGL 2 indisponível");
  const renderer = new T.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      matchMedia("(max-width: 767px)").matches ? 1.5 : 2,
    ),
  );
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);
  host.appendChild(canvas);
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
  const pmrem = new T.PMREMGenerator(renderer),
    room = new RoomEnvironment(),
    environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.85;
  room.dispose();
  pmrem.dispose();
  scene.add(new T.HemisphereLight(0xe3f8ff, 0x414853, 2.1));
  const key = new T.DirectionalLight(0xfff3df, 4.2);
  key.position.set(3, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.0003;
  scene.add(key);
  const rim = new T.DirectionalLight(0x9ed9ef, 3.5);
  rim.position.set(-5, 3, -4);
  scene.add(rim);
  const model = createHardwareModel(id);
  scene.add(model.root);
  const bounds = new T.Box3().setFromObject(model.root);
  model.setExploded(1);
  bounds.union(new T.Box3().setFromObject(model.root));
  model.setExploded(initialExploded ? 1 : 0);
  const floor = new T.Mesh(
    new T.PlaneGeometry(40, 40),
    new T.ShadowMaterial({ opacity: 0.17, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = bounds.min.y - 0.08;
  floor.receiveShadow = true;
  scene.add(floor);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.dampingFactor = 0.085;
  controls.autoRotateSpeed = 0.65;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.7;
  controls.target.set(0, 0.12, 0);
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  controls.enableDamping = !media.matches;
  let disposed = false,
    visible = true,
    frame = 0,
    exploded = initialExploded ? 1 : 0,
    targetExploded = exploded,
    baseDistance = 0,
    lastTime = 0;
  model.setExploded(exploded);
  const direction = (
    id === "notebook"
      ? new T.Vector3(5, 3.7, 8)
      : id === "memory" || id === "ssd"
        ? new T.Vector3(2.7, 6.6, 7.3)
        : new T.Vector3(5.4, 7.6, 7.8)
  ).normalize();
  function request() {
    if (!disposed && visible && !document.hidden && !frame)
      frame = requestAnimationFrame(draw);
  }
  function draw(time: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    const changing = Math.abs(targetExploded - exploded) > 0.002;
    if (changing) {
      exploded = media.matches
        ? targetExploded
        : T.MathUtils.damp(exploded, targetExploded, 8, dt);
      model.setExploded(exploded);
    }
    const moving = controls.update(dt);
    renderer.render(scene, camera);
    if (changing || moving || controls.autoRotate) request();
  }
  function reset() {
    controls.target.set(0, 0.12, 0);
    camera.position
      .copy(direction)
      .multiplyScalar(baseDistance)
      .add(controls.target);
    controls.update();
    request();
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const previous = baseDistance;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Fit actual corner projections to both axes, including mobile portrait viewports.
    const orientation = new T.Quaternion()
      .setFromRotationMatrix(
        new T.Matrix4().lookAt(
          direction,
          new T.Vector3(),
          new T.Vector3(0, 1, 0),
        ),
      )
      .invert();
    let distance = 0;
    const tangent = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const p = new T.Vector3(x, y, z)
            .sub(controls.target)
            .applyQuaternion(orientation);
          distance = Math.max(
            distance,
            p.z + Math.abs(p.x) / (tangent * camera.aspect),
            p.z + Math.abs(p.y) / tangent,
          );
        }
    baseDistance = distance * 1.22;
    controls.minDistance = baseDistance * 0.42;
    controls.maxDistance = baseDistance * 1.8;
    if (!previous) reset();
    else
      camera.position
        .sub(controls.target)
        .multiplyScalar(baseDistance / previous)
        .add(controls.target);
    request();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) request();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  intersection.observe(host);
  function visibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else request();
  }
  function motion() {
    controls.enableDamping = !media.matches;
    if (media.matches) controls.autoRotate = false;
    request();
  }
  const lost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", visibility);
  media.addEventListener("change", motion);
  controls.addEventListener("change", request);
  request();
  return {
    setExploded(value: boolean) {
      targetExploded = value ? 1 : 0;
      request();
    },
    setRotating(value: boolean) {
      controls.autoRotate = value;
      request();
    },
    zoom(direction: number) {
      camera.position
        .sub(controls.target)
        .multiplyScalar(direction > 0 ? 0.82 : 1.22)
        .clampLength(controls.minDistance, controls.maxDistance)
        .add(controls.target);
      controls.update();
      request();
    },
    turn(horizontal: number, vertical = 0) {
      const spherical = new T.Spherical().setFromVector3(
        camera.position.clone().sub(controls.target),
      );
      spherical.theta += horizontal;
      spherical.phi = T.MathUtils.clamp(
        spherical.phi + vertical,
        0.05,
        Math.PI - 0.05,
      );
      camera.position.setFromSpherical(spherical).add(controls.target);
      controls.update();
      request();
    },
    reset,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", motion);
      canvas.removeEventListener("webglcontextlost", lost);
      controls.removeEventListener("change", request);
      controls.dispose();
      model.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      environment.dispose();
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
