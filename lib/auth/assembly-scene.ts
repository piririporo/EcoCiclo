import * as T from 'three';
import { createAssemblyTimeline } from './assembly-timeline';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createAssemblyModel } from './assembly-model';

export type AssemblyUpdate = { progress: number; mobile: boolean; paused: boolean; reduced: boolean };
export type AssemblyController = { seek: (progress: number) => void; toggle: () => void; replay: () => void; dispose: () => void };

export function createAssemblyScene(host: HTMLElement, onUpdate: (state: AssemblyUpdate) => void, onFailure: () => void): AssemblyController {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'low-power' });
  if (!context) throw new Error('WebGL2 indisponível');
  const renderer = new T.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(36, 1, .1, 80);
  const pmrem = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new T.HemisphereLight(0xe8fffb, 0x587982, 2));
  const key = new T.DirectionalLight(0xffffff, 3.5);
  key.position.set(4, 7, 6);
  scene.add(key);
  const rim = new T.DirectionalLight(0xf4c8a9, 2.5);
  rim.position.set(-5, 3, -2);
  scene.add(rim);
  const model = createAssemblyModel();
  scene.add(model.root);
  const timeline = createAssemblyTimeline(model);
  const media = window.matchMedia('(max-width: 979px)');
  const reducedMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  const experience = host.closest<HTMLDialogElement>('.auth-intro')!;
  const track = experience.querySelector<HTMLElement>('.assembly-track')!;
  let mobile = media.matches;
  let reduced = reducedMedia.matches;
  let paused = reduced;
  let progress = reduced ? 1 : 0;
  let target = progress;
  let time = progress * timeline.duration;
  let previous = 0;
  let visible = true;
  let lost = false;
  let disposed = false;
  let dirty = true;
  let lastReport = -1;
  let lastComplete = false;
  const starts = [0, 600, 2900, 5000, 7000, 8600, 10600, 12900, 15000];
  const parts = [model.chassis, model.board, model.processor, model.memory, model.ssd, model.cooler, model.gpu, model.power, model.panel];
  function report(force = false) {
    const value = Math.round(progress * 100);
    const complete = progress === 1;
    if (force || value !== lastReport || complete !== lastComplete) {
      lastReport = value;
      lastComplete = complete;
      onUpdate({ progress, mobile, paused, reduced });
    }
  }
  function draw() {
    timeline.seek(progress * timeline.duration, true);
    parts.forEach((part, i) => { part.visible = i === 0 || progress * timeline.duration >= starts[i]; });
    // Camera eases closer as the loose components settle into the case.
    const distance = 1 + .13 * (1 - progress);
    camera.position.set(5.6 * distance, 3.1 * distance, 9.6 * distance);
    camera.lookAt(.1, -.08, .3);
    renderer.render(scene, camera);
    dirty = false;
    report();
  }
  function scrollTarget() {
    if (mobile || reduced) return;
    const travel = Math.max(1, track.offsetHeight - experience.clientHeight);
    target = T.MathUtils.clamp(experience.scrollTop / travel, 0, 1);
    dirty = true;
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.8));
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    camera.aspect = width / Math.max(1, height);
    // Keep the case within the frame on tall phones and wide, short displays.
    camera.fov = T.MathUtils.radToDeg(2 * Math.atan(Math.max(.31, .32 / camera.aspect)));
    camera.updateProjectionMatrix();
    scrollTarget();
    dirty = true;
  }
  function tick(now: number) {
    const delta = previous ? Math.min(now - previous, 70) : 0;
    previous = now;
    if (mobile && !paused && !reduced && !lost) {
      time = Math.min(timeline.duration, time + delta);
      progress = time / timeline.duration;
      dirty = true;
      if (progress === 1) { paused = true; report(true); }
    } else if (!mobile && !reduced && Math.abs(progress - target) > .00005) {
      progress = T.MathUtils.damp(progress, target, 12, delta / 1000);
      if (Math.abs(progress - target) < .0001) progress = target;
      dirty = true;
    }
    if (dirty && !lost) draw();
  }
  function syncLoop() {
    previous = 0;
    renderer.setAnimationLoop(!disposed && visible && !document.hidden && !lost ? tick : null);
  }
  function preferenceChange() {
    const wasMobile = mobile;
    mobile = media.matches;
    reduced = reducedMedia.matches;
    experience.dataset.motion = reduced ? 'reduced' : 'full';
    if (reduced) { progress = target = 1; paused = true; }
    else if (mobile !== wasMobile) { paused = false; time = progress * timeline.duration; }
    resize();
    report(true);
  }
  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    syncLoop();
    onFailure();
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    syncLoop();
  }, { threshold: .02 });
  const resizeObserver = new ResizeObserver(resize);
  observer.observe(host);
  resizeObserver.observe(host);
  experience.addEventListener('scroll', scrollTarget, { passive: true });
  document.addEventListener('visibilitychange', syncLoop);
  media.addEventListener('change', preferenceChange);
  reducedMedia.addEventListener('change', preferenceChange);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  preferenceChange();
  draw();
  syncLoop();
  function seek(amount: number) {
    progress = target = T.MathUtils.clamp(amount, 0, 1);
    time = progress * timeline.duration;
    if (mobile) paused = true;
    else if (!reduced) {
      const travel = Math.max(1, track.offsetHeight - experience.clientHeight);
      experience.scrollTo({ top: travel * progress, behavior: 'instant' });
    }
    dirty = true;
    report(true);
  }
  return {
    seek,
    toggle() {
      if (reduced) return;
      if (progress >= 1) { progress = 0; time = 0; }
      paused = !paused;
      report(true);
    },
    replay() { seek(0); if (mobile && !reduced) { paused = false; report(true); } },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      resizeObserver.disconnect();
      experience.removeEventListener('scroll', scrollTarget);
      document.removeEventListener('visibilitychange', syncLoop);
      media.removeEventListener('change', preferenceChange);
      reducedMedia.removeEventListener('change', preferenceChange);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      timeline.cancel();
      model.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      delete experience.dataset.motion;
    },
  };
}
