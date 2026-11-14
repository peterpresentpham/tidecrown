import * as THREE from 'three';
import { UNITS } from '../data/units';
import { FACTIONS, type Unit } from '../game/engine';
type Builder={mesh:(geometry:THREE.BufferGeometry,color:string,parent:THREE.Object3D,x?:number,y?:number,z?:number)=>THREE.Mesh;box:(parent:THREE.Object3D,color:string,size:number[],position:number[])=>THREE.Mesh};
/** Small rigid parts only; limbs/wheels/weapon pivots animate exclusively during actions. */
export function buildUnitModel(u:Unit,b:Builder){
 const g=new THREE.Group(),color=FACTIONS[u.owner].color,d=UNITS[u.type],legs:THREE.Object3D[]=[],wheels:THREE.Object3D[]=[];
 const box=b.box,mesh=b.mesh;
 const flag=(p:THREE.Group,y:number)=>{box(p,'#71604b',[.04,.8,.04],[-.35,y,0]);box(p,color,[.37,.22,.035],[-.16,y+.24,0]);};
 let weapon:THREE.Object3D|undefined;
 if(d.class==='ship'){
  const hull=mesh(new THREE.CylinderGeometry(.45,.28,1.45,6),u.type==='heavy_warship'?'#51493f':'#806141',g,0,.3);hull.rotation.x=Math.PI/2;hull.scale.x=1.2;
  box(g,'#c09a66',[.84,.09,1.1],[0,.4,0]);
  const mast=box(g,'#80613b',[.055,1.15,.055],[0,.98,0]);
  if(u.type!=='transport'){
   const sail=mesh(new THREE.ConeGeometry(.5,.85,3),u.type==='heavy_warship'?'#d7c7a2':color,g,.05,1.2,.08);sail.scale.z=.06;sail.rotation.z=-.2;
   box(g,'#ebe2c3',[.09,.5,.025],[.05,1.25,.12]);
  }else for(const x of [-.2,.2])box(g,'#ad8351',[.24,.25,.4],[x,.57,.1]);
  if(['warship','heavy_warship'].includes(u.type)){weapon=box(g,'#474c49',[.15,.13,.65],[0,.6,-.5]);if(u.type==='heavy_warship')box(g,'#c6b393',[.85,.08,.08],[0,.64,-.65]);}
  flag(g,.9);g.userData.sail=mast;
 }else if(d.class==='siege'){
  box(g,'#775631',[.85,.14,1.05],[0,.28,0]);
  for(const x of [-.45,.45])for(const z of [-.35,.35]){const w=mesh(new THREE.CylinderGeometry(.23,.23,.11,7),'#403b31',g,x,.24,z);w.rotation.z=Math.PI/2;wheels.push(w);}
  const pivot=new THREE.Group();pivot.position.set(0,.85,0);g.add(pivot);weapon=pivot;
  if(u.type==='ballista'){
   box(g,'#a28b5a',[.12,.15,.9],[0,.65,0]);box(pivot,'#b8a079',[1.08,.07,.12],[0,0,-.12]);box(pivot,'#ddd1ae',[.04,.04,.95],[0,.08,-.2]);
  }else{
   const tall=u.type==='trebuchet';for(const x of [-.3,.3]){const frame=box(g,color,[.11,tall?1.55:.7,.11],[x,tall?1.02:.62,0]);frame.rotation.z=x>0?.15:-.15;}
   pivot.position.y=tall?1.62:.96;const arm=box(pivot,'#bb9760',[.1,tall?1.8:1.15,.1],[0,.3,0]);arm.rotation.x=-.55;
   mesh(new THREE.DodecahedronGeometry(.17,0),'#b4baa8',pivot,0,.82,-.38);
   if(tall)box(pivot,'#74776c',[.4,.4,.4],[0,-.4,.2]);
  }
  flag(g,.8);
 }else{
  const mounted=d.class==='cavalry',heavy=['heavy_infantry','heavy_knight','paladin'].includes(u.type),dy=mounted?.62:0;
  if(mounted){
   const horse=mesh(new THREE.CylinderGeometry(.3,.34,.95,7),heavy?'#89908b':'#815f43',g,0,.65,0);horse.rotation.x=Math.PI/2;
   for(const x of [-.22,.22])for(const z of [-.35,.35]){const leg=new THREE.Group();leg.position.set(x,.52,z);g.add(leg);box(leg,'#4b4439',[.13,.48,.13],[0,-.24,0]);legs.push(leg);}
   box(g,heavy?'#9ea7a0':'#947354',[.32,.4,.3],[0,.98,.45]);box(g,'#c6ad7b',[.3,.13,.34],[0,1.06,.66]);box(g,color,[.48,.07,.5],[0,.94,-.07]);
  }else for(const x of [-.13,.13]){const leg=new THREE.Group();leg.position.set(x,.44,0);g.add(leg);box(leg,'#4b483e',[.17,.32,.2],[0,-.16,0]);box(leg,'#302c28',[.18,.12,.3],[0,-.33,.05]);legs.push(leg);}
  mesh(new THREE.CylinderGeometry(.23,.3,.48,7),heavy?'#a4afae':color,g,0,.7+dy);
  box(g,color,[.53,.09,.35],[0,.52+dy,0]);mesh(new THREE.SphereGeometry(.22,8,6),'#dfaf81',g,0,1.12+dy);
  mesh(new THREE.SphereGeometry(.25,8,5,0,Math.PI*2,0,Math.PI/2),heavy?'#d0d6ce':u.type==='ranger'?'#537d4e':color,g,0,1.15+dy);
  if(heavy){box(g,color,[.42,.07,.25],[0,1.36+dy,0]);box(g,'#5d6568',[.25,.07,.1],[0,1.16+dy,.22]);}
  if(['scout','ranger'].includes(u.type))box(g,'#4f6950',[.5,.53,.08],[0,.8+dy,-.2]);
  const hand=new THREE.Group();hand.position.set(.32,.87+dy,0);g.add(hand);weapon=hand;
  box(hand,'#d4a16f',[.13,.28,.15],[0,-.1,0]);
  if(d.range>1){
   if(u.type==='crossbow'){box(hand,'#b39968',[.65,.07,.12],[.1,-.05,.2]);box(hand,'#e4dec7',[.045,.045,.55],[.1,0,.25]);}
   else{const bow=mesh(new THREE.TorusGeometry(.29,.04,4,9,Math.PI),'#8f623f',hand,.08,0,.2);bow.rotation.z=-Math.PI/2;box(hand,'#ddd5ba',[.025,.55,.025],[.08,0,.2]);}
  }else if(u.type==='engineer'){box(hand,'#94764d',[.06,.6,.06],[0,.1,.06]);box(hand,'#bdc6bc',[.35,.15,.15],[0,.4,.06]);box(g,'#a7804f',[.4,.4,.25],[0,.7,-.3]);}
  else{
   const spear=['spear','pikeman','knight','heavy_knight'].includes(u.type),length=u.type==='pikeman'?2.1:spear?1.65:.65;
   box(hand,spear||u.type==='clubman'?'#977447':'#dfe4d7',[.06,length,.07],[.05,length*.3,.12]);
   if(spear)mesh(new THREE.ConeGeometry(.09,.27,4),'#e1e1cf',hand,.05,length*.85,.12);
   if(u.type==='clubman')mesh(new THREE.DodecahedronGeometry(.16,0),'#795630',hand,.05,.47,.12);
   if(!spear&&u.type!=='clubman')box(hand,'#c2a464',[.3,.06,.07],[.05,-.03,.12]);
   const shield=box(g,u.type==='paladin'?'#eee6c9':color,[u.type==='shield'?.48:.34,u.type==='shield'?.78:.45,.1],[-.37,.78+dy,.17]);shield.rotation.z=-.05;
   box(g,'#e8dec0',[.065,.35,.025],[-.37,.78+dy,.23]);
  }
  if(u.type==='scout')flag(g,1.3);
  if(u.type==='paladin'){box(g,'#f0e7c7',[.5,.6,.07],[0,.85+dy,-.2]);box(g,'#dfb74f',[.07,.32,.025],[0,.85+dy,-.25]);box(g,'#dfb74f',[.25,.06,.025],[0,.9+dy,-.25]);}
 }
 const base=mesh(new THREE.CylinderGeometry(d.class==='ship'?.7:.57,d.class==='ship'?.7:.57,.05,16),color,g,0,.02,0);
 const mat=new THREE.MeshBasicMaterial({color});mat.userData.transient=true;base.material=mat;
 g.userData.legs=legs;g.userData.wheels=wheels;g.userData.weapon=weapon;
 return g;
}
