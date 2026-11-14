import { createTimeline } from 'animejs';
import type { createAssemblyModel } from './assembly-model';

export function createAssemblyTimeline(model: ReturnType<typeof createAssemblyModel>) {
  const timeline = createTimeline({ autoplay: false, defaults: { ease: 'inOut(3)' } });
  // Explicit from/to coordinates make seeking fully reversible, including scroll upwards.
  timeline.add(model.board.position, { x: [-1.5, -.22], z: [2.5, -.85], duration: 2100 }, 600);
  timeline.add(model.processor.position, { y: [4, 0], duration: 1900 }, 2900);
  timeline.add(model.memory.position, { y: [3.4, 0], x: [.7, 0], duration: 1800 }, 5000);
  timeline.add(model.ssd.position, { y: [3, 0], duration: 1500 }, 7000);
  timeline.add(model.cooler.position, { z: [3.7, -.17], duration: 1800 }, 8600);
  timeline.add(model.gpu.position, { x: [-1.1, -.24], z: [3.5, .1], duration: 2100 }, 10600);
  timeline.add(model.power.position, { x: [-2.8, 0], z: [1.3, 0], duration: 1800 }, 12900);
  timeline.add(model.panel.position, { z: [3.2, 0], duration: 1800 }, 15000);
  timeline.add(model.root.rotation, { y: [-.28, .16], duration: 18000, ease: 'inOutSine' }, 0);
  timeline.add(model.light, { emissiveIntensity: [.15, 1.8], duration: 900 }, 17000);
  return timeline;
}
