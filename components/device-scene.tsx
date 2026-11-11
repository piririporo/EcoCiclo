'use client';
import { useEffect,useRef,useState } from 'react';
import { Pause,Play,MoveUpRight } from 'lucide-react';
export default function DeviceScene(){
 const host=useRef<HTMLDivElement>(null);const pausedRef=useRef(false);const [paused,setPaused]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{const root=host.current;if(!root||matchMedia('(prefers-reduced-motion: reduce)').matches||matchMedia('(max-width: 767px)').matches)return;let disposed=false;let cleanup=()=>{};
 void import('three').then(THREE=>{if(disposed)return;let renderer:InstanceType<typeof THREE.WebGLRenderer>;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0x000000,0);root.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,60);camera.position.set(7.5,8.5,10);camera.lookAt(0,.4,0);
 scene.add(new THREE.AmbientLight(0xffffff,2));const light=new THREE.DirectionalLight(0xffffff,5);light.position.set(4,9,6);scene.add(light);const rim=new THREE.DirectionalLight(0x9dffc1,3);rim.position.set(-6,3,-4);scene.add(rim);
 const group=new THREE.Group();scene.add(group);group.rotation.y=-.18;
 const material=(color:number,metalness=.2,roughness=.5)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const pcb=material(0x154f3b),black=material(0x222b2c),silver=material(0xaebcb9,.85,.24),gold=material(0xb5944a,.75,.34),green=material(0xa7db84);
 function box(w:number,h:number,d:number,x:number,y:number,z:number,mat:InstanceType<typeof THREE.MeshStandardMaterial>,parent=group){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;}
 box(5,.13,3.9,0,0,0,pcb);for(let i=0;i<17;i++){box(.016,.012,1.25+(i%4)*.28,-2.1+i*.255,.08,-.7, gold);box(1.1,.012,.013,-1.7+(i%4)*1.03,.08,-1.65+i*.19,gold);}
 for(const x of [-2.25,2.25])for(const z of [-1.7,1.7]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.06,16),gold);m.position.set(x,.12,z);group.add(m);}
 box(1.65,.17,1.65,-.5,.2,-.35,black);const cpu=box(1.35,.15,1.35,-.5,1.05,-.35,silver);box(.9,.015,.12,-.5,1.135,-.35,black);box(.45,.018,.04,-.5,1.14,-.15,green);
 for(let i=0;i<4;i++)box(.12,.16,2.6,1.05+i*.28,.17,-.25,i%2?black:silver);
 const ram=new THREE.Group();group.add(ram);ram.position.set(1.5,1.35,-.2);box(.1,.9,2.5,0,0,0,pcb,ram);for(let i=0;i<6;i++)box(.12,.5,.28,.07,.03,-1+i*.38,black,ram);box(.12,.12,2.25,.01,-.45,0,gold,ram);
 box(3.2,.16,.17,-.6,.19,1.25,black);box(3.2,.16,.17,-.6,.19,1.65,black);for(let i=0;i<6;i++){box(.3,.6,.35,-2.25,.35,-1.4+i*.52,silver);}
 for(let i=0;i<10;i++){const cap=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.24,12),silver);cap.position.set(-1.65+i*.29,.22,.78);group.add(cap);}
 for(let i=0;i<6;i++)box(.17,.3,.65,-1.7+i*.2,.23,-1.5,black);
 const resize=()=>{const {width,height}=root.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();renderer.render(scene,camera);};const ro=new ResizeObserver(resize);ro.observe(root);resize();let visible=true;const reduced=matchMedia('(prefers-reduced-motion: reduce)');const start=performance.now();const render=()=>{if(!visible||document.hidden||reduced.matches)return;const t=(performance.now()-start)/1000;if(!pausedRef.current){cpu.position.y=1.05+Math.sin(t*.7)*.09;ram.position.y=1.35+Math.sin(t*.7+1)*.1;group.rotation.y=-.18+Math.sin(t*.2)*.035;}renderer.render(scene,camera);};
 const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;renderer.setAnimationLoop(visible&&!document.hidden?render:null);});io.observe(root);const vis=()=>renderer.setAnimationLoop(document.hidden?null:render);document.addEventListener('visibilitychange',vis);renderer.setAnimationLoop(render);setReady(true);
 cleanup=()=>{ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',vis);renderer.setAnimationLoop(null);scene.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});[pcb,black,silver,gold,green].forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 });return()=>{disposed=true;cleanup();};},[]);
 return <div className="device-composition"><div className="orbital orbit-one"/><div className="orbital orbit-two"/><div ref={host} className={`three-stage ${ready?'is-ready':''}`} aria-hidden="true"/><img src="/visuals/motherboard.svg" width="800" height="600" alt="Ilustração de uma placa-mãe com componentes que podem ser avaliados para reutilização" className={`scene-fallback ${ready?'is-hidden':''}`}/><div className="hardware-label label-cpu"><span className="label-point"/><div><small>Novas possibilidades</small><strong>O valor está nos detalhes.</strong></div><MoveUpRight size={18}/></div><div className="hardware-label label-bottom"><span className="hardware-icon">↻</span><div><strong>Um equipamento. Muitos recomeços.</strong><small>Identifique. Avalie. Reutilize.</small></div></div>{ready&&<button className="scene-pause" aria-label={paused?'Reproduzir animação 3D':'Pausar animação 3D'} onClick={()=>{pausedRef.current=!paused;setPaused(!paused);}}>{paused?<Play size={13}/>:<Pause size={13}/>}<span>Visualização ilustrativa 3D</span></button>}<span className="scene-caption">Reutilizar começa com um novo olhar.</span></div>;
}
