(() => {
  'use strict';
  const board = document.getElementById('board');
  const core = window.PinballCore;
  const media = window.PORTFOLIO_MEDIA;
  const ns = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const status = document.getElementById('liveStatus');
  const world = document.getElementById('pinball-world');
  const ladder = document.getElementById('ladder');
  const splitter = document.getElementById('splitter');
  const filmDialog = document.getElementById('filmDialog');
  const bubblesLayer = document.getElementById('bubbles');
  const ballsLayer = document.getElementById('extraBalls');
  const main = document.getElementById('ball');
  let upsideDown = false;
  let flipping = false;
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  function svg(tag, attributes, parent) {
    const el = document.createElementNS(ns, tag);
    for (const [name,value] of Object.entries(attributes || {})) el.setAttribute(name, value);
    if (parent) parent.appendChild(el);
    return el;
  }
  // Always invert the actual screen matrix, including the upside-down world.
  function boardPoint(event) {
    const matrix = board.getScreenCTM();
    if (!matrix) return [800,450];
    const p = new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
    return [p.x,p.y];
  }
  function action(el, fn, keys=['Enter',' ']) {
    el.addEventListener('click', fn);
    el.addEventListener('keydown', e => {
      if (keys.includes(e.key)) { e.preventDefault(); fn(e); }
    });
  }
  function flash(el) {
    el.animate([{opacity:1},{opacity:.48},{opacity:1}],{duration:300});
  }
  function applyImage(el,url) {
    if (!url) return;
    // Invalid / missing assets leave the original texture visible underneath.
    el.addEventListener('error', () => el.setAttribute('visibility','hidden'));
    el.setAttribute('preserveAspectRatio','xMidYMid slice');
    el.setAttribute('href',url);
    el.setAttribute('visibility','visible');
  }
  applyImage(document.getElementById('videoDiamondGif'),media.fills[0]);
  applyImage(document.getElementById('splitterGif'),media.fills[1]);
  document.querySelectorAll('.catcher-gif').forEach((el,i)=>applyImage(el,media.fills[i+2]));
  applyImage(document.getElementById('pipeLipImage'),media.fills[5]);
  applyImage(document.getElementById('ladderGemImage'),media.fills[6]);

  // A single shared artwork avoids duplicating the large PNG in every bubble.
  if(media.bubble) {
    const art=svg('image',{id:'suppliedBubbleArtwork',href:media.bubble,x:-1,y:-1,width:2,height:2,preserveAspectRatio:'xMidYMid meet'},board.querySelector('defs'));
    art.addEventListener('error',()=>art.remove());
  }

  // Soap bubbles: independent irregular bursts, downward pressure, then buoyancy.
  const bubbles = [];
  const pipes = [[114,66],[237,66],[365,118]];
  function blow(index, force=false) {
    if (document.hidden || (reduced && !force)) return;
    const [x,y] = pipes[index];
    for (let i=0,n=Math.floor(rand(3,7)); i<n; i++) {
      if (bubbles.length >= 42) break;
      const radius = rand(8,26);
      const g = svg('g',{},bubblesLayer);
      if (media.bubble) {
        svg('use',{href:'#suppliedBubbleArtwork',transform:`scale(${radius})`},g);
      } else {
        svg('circle',{r:radius,fill:'url(#soapGlass)',stroke:'url(#soapRim)','stroke-width':1.4},g);
        svg('path',{d:`M${-radius*.6} ${-radius*.18} Q${-radius*.45} ${-radius*.7} ${radius*.05} ${-radius*.74}`,fill:'none',stroke:'#fff','stroke-width':1.8,'stroke-linecap':'round',opacity:.9},g);
      }
      bubbles.push({el:g,x:x+rand(-9,9),y:y+radius*.6-i*3,vx:rand(-26,26),vy:rand(55,100),r:radius,life:0,max:rand(7,13),phase:rand(0,7)});
    }
  }
  const pipeTimers = [];
  function schedulePipe(i, first=false) {
    pipeTimers[i] = setTimeout(()=>{blow(i);schedulePipe(i);},first ? rand(400,2400) : rand(3100,11500));
  }
  pipes.forEach((_,i)=>schedulePipe(i,true));
  document.querySelectorAll('.pipe').forEach((el,i)=>action(el,()=>blow(i,true)));

  // Catchers can move with a pointer or keyboard. A held ball follows its catcher.
  const catchers = [...document.querySelectorAll('.catcher')].map((el,i)=>({el,x:[1503,1390,1515][i],y:[691,758,820][i],held:null}));
  let dragging = null;
  let primaryHold = null;
  let mainIgnoreUntil = 0;
  let lastMainPoint = core.point;
  function placeCatcher(c) { c.el.setAttribute('transform',`translate(${c.x} ${c.y})`); }
  function release(c) {
    const b = c.held;
    if (!b) return;
    c.held = null;
    if(b.main) {
      primaryHold=null;mainIgnoreUntil=performance.now()+1400;
      const released=[c.x,c.y-17.6];lastMainPoint=released;
      b.resolve(released);flash(c.el);return;
    }
    b.catcher = null;
    b.catchUntil = performance.now()+1000;
    setTwinMode(b,'idle');scheduleTwin(b);
    b.path?.remove();b.path=null;
    flash(c.el);
  }
  window.PinballExtras = {
    offerMain(point) {
      if(carrierActor===main){positionCarrier(point);return null;}
      if(transferActors.has(main))return null;
      if(!elevatorActor||elevatorActor===main)updateElevator(point);
      const previous=Math.hypot(point[0]-lastMainPoint[0],point[1]-lastMainPoint[1])>100?point:lastMainPoint;
      lastMainPoint=point;
      if(primaryHold||performance.now()<mainIgnoreUntil)return null;
      for(const c of catchers) {
        if(c.held)continue;
        const ax=(previous[0]-c.x)/66,ay=(previous[1]-c.y)/26;
        const dx=(point[0]-previous[0])/66,dy=(point[1]-previous[1])/26;
        const t=clamp(-(ax*dx+ay*dy)/(dx*dx+dy*dy||1),0,1);
        if((ax+t*dx)**2+(ay+t*dy)**2<=1) {
          status.textContent='Ball caught.';
          flash(c.el);
          return new Promise(resolve=>{primaryHold={main:true,catcher:c,resolve};c.held=primaryHold;});
        }
      }
      return null;
    }
  };
  for (const c of catchers) {
    c.el.addEventListener('pointerdown',e=>{
      if (e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      const [x,y] = boardPoint(e);
      dragging = {c,id:e.pointerId,dx:x-c.x,dy:y-c.y,startX:x,startY:y,moved:false};
      c.el.setPointerCapture(e.pointerId);
      c.el.classList.add('dragging');
    });
    c.el.addEventListener('pointermove',e=>{
      if (!dragging || dragging.id!==e.pointerId || dragging.c!==c) return;
      const [x,y] = boardPoint(e);
      if (Math.hypot(x-dragging.startX,y-dragging.startY)>4) dragging.moved=true;
      c.x=clamp(x-dragging.dx,64,1536); c.y=clamp(y-dragging.dy,30,870); placeCatcher(c);
    });
    const end=e=>{
      if (!dragging || dragging.id!==e.pointerId || dragging.c!==c) return;
      const moved=dragging.moved;
      dragging=null; c.el.classList.remove('dragging');
      if(c.el.hasPointerCapture(e.pointerId)) c.el.releasePointerCapture(e.pointerId);
      if(!moved && e.type==='pointerup') release(c);
    };
    c.el.addEventListener('pointerup',end);
    c.el.addEventListener('pointercancel',end);
    c.el.addEventListener('lostpointercapture',end);
    c.el.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' ') {e.preventDefault();release(c);return;}
      const step=e.shiftKey?35:12;
      const delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
      if(!delta)return;
      e.preventDefault(); c.x=clamp(c.x+delta[0],64,1536);c.y=clamp(c.y+delta[1],30,870);placeCatcher(c);
    });
  }

  // The round carrier serves only portfolio and the left video scoop.
  // Other disconnected structures use the existing disappearance / reappearance
  // mechanism, keeping the carrier at the foot of its own ramp.
  const P = ([x,y]) => [160+.8*x,175+.8*y];
  const radius=17.6;
  const nodes={
    launcher:P([795,116]),hub:P([795,250]),leftTop:P([705,240]),
    carrier:P([495,420]),portfolio:P([355,215]),blueTop:P([715,392]),
    blueEnd:P([330,699]),contacts:P([330,805]),liftTop:P([790,382]),
    about:P([790,790]),rightTop:P([835,280]),rightEnd:P([983,438]),
    mini:P([1085,444]),teaching:P([1248,225]),big:P([1150,706]),
    home:P([1148,782]),split:[1395,449],ladder:[1401,298],
    filmEntry:[354,528-radius],filmExit:[143,449-radius],film:[160,467],
    catch1:[catchers[0].x,catchers[0].y-radius],
    catch2:[catchers[1].x,catchers[1].y-radius],
    catch3:[catchers[2].x,catchers[2].y-radius]
  };
  const edges=[];
  function pointOn(points,t){
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
    let remaining=lengths.reduce((a,b)=>a+b,0)*t;
    for(let i=0;i<lengths.length;i++){
      if(remaining<=lengths[i]){const u=remaining/(lengths[i]||1);return [points[i][0]+(points[i+1][0]-points[i][0])*u,points[i][1]+(points[i+1][1]-points[i][1])*u];}
      remaining-=lengths[i];
    }
    return points[points.length-1];
  }
  function sample(selector,reverse=false,offset=0){
    const path=document.querySelector(selector),length=path.getTotalLength();
    const local=!!path.closest('#scene');
    const result=Array.from({length:65},(_,i)=>{
      const p=path.getPointAtLength(length*(reverse?1-i/64:i/64));
      const q=local?P([p.x,p.y]):[p.x,p.y];return [q[0],q[1]+offset];
    });
    return result;
  }
  function addEdge(a,b,inner=[],newRail=false){
    const carrierRoute=a==='carrier'&&(b==='portfolio'||b==='filmEntry');
    const edge={a,b,points:[nodes[a],...inner,nodes[b]],newRail,carrierRoute,users:0,el:null};
    edge.length=edge.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-edge.points[i][0],p[1]-edge.points[i][1]),0);
    edges.push(edge);return edge;
  }
  addEdge('launcher','hub');
  addEdge('hub','leftTop',[P([760,248])]);
  addEdge('leftTop','carrier',sample('#historyRamp path',true));
  addEdge('carrier','portfolio',[[530,484],[485,412]],true);
  addEdge('hub','rightTop',[P([807,257]),P([820,268])]);
  addEdge('rightTop','rightEnd',sample('#rightRamp path'));
  addEdge('rightEnd','mini');
  addEdge('mini','teaching',[P([1145,390]),P([1195,315])]);
  addEdge('hub','blueTop',[P([770,270]),[756,441]],true);
  addEdge('blueTop','blueEnd',sample('#bluePath path'));
  addEdge('blueEnd','contacts',[[386,736],[350,725],[350,782]],true);
  addEdge('hub','liftTop',[P([793,310])]);
  addEdge('liftTop','about');
  addEdge('mini','big',[P([990,446]),...sample('#downPath path'),P([1125,692])]);
  addEdge('big','home',[[1094,765]],true);
  addEdge('mini','split',[[1110,544],[1206,530],[1304,495]],true);
  addEdge('teaching','ladder',[[1240,355],[1320,342],[1376,318]],true);
  addEdge('carrier','filmEntry',[[498,510],[414,510]],true);
  addEdge('filmEntry','filmExit',sample('#filmRail',true,-radius));
  addEdge('filmExit','film',[[153,435],[160,450]],true);
  const catcherEdges=[addEdge('split','catch1',[[1470,530]],true),addEdge('catch1','catch2',[],true),addEdge('catch2','catch3',[],true),addEdge('catch3','big',[[1440,850],[1250,850],[1150,788]],true)];
  function refreshCatchers(){
    for(let i=0;i<3;i++)nodes['catch'+(i+1)]=[catchers[i].x,catchers[i].y-radius];
    for(const edge of catcherEdges){
      // A bridge in use stays under the travelling ball until it has crossed.
      if(edge.users)continue;
      edge.points[0]=nodes[edge.a];edge.points[edge.points.length-1]=nodes[edge.b];
      edge.length=edge.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-edge.points[i][0],p[1]-edge.points[i][1]),0);
    }
  }
  function projection(point,edge){
    let best={distance:Infinity},travelled=0;
    for(let i=0;i<edge.points.length-1;i++){
      const a=edge.points[i],b=edge.points[i+1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
      const t=clamp(((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(len*len||1),0,1);
      const q=[a[0]+dx*t,a[1]+dy*t],distance=Math.hypot(q[0]-point[0],q[1]-point[1]);
      if(distance<best.distance)best={edge,point:q,distance,travel:travelled+t*len,index:i};
      travelled+=len;
    }
    return best;
  }
  function attach(point){
    let best=null;
    for(const edge of edges){const p=projection(point,edge);if(!best||p.distance<best.distance)best=p;}
    return best;
  }
  function part(edge,from,to){
    const a=projection(from,edge),b=projection(to,edge);
    if(a.travel>b.travel)return part(edge,to,from).reverse();
    return [a.point,...edge.points.slice(a.index+1,b.index+1),b.point];
  }
  function plan(start,target){
    refreshCatchers();
    const finish=typeof target==='string'?nodes[target]:target;
    const a=attach(start),b=attach(finish),adj=new Map();
    const link=(u,v,points,edge)=>{
      const cost=points.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
      if(!adj.has(u))adj.set(u,[]);adj.get(u).push({node:v,points,edge,cost});
    };
    const both=(u,v,points,edge)=>{link(u,v,points,edge);link(v,u,points.slice().reverse(),edge);};
    for(const e of edges)both(e.a,e.b,e.points,e);
    for(const [id,p] of [['$start',a],['$finish',b]]){
      both(id,p.edge.a,part(p.edge,p.point,nodes[p.edge.a]),p.edge);
      both(id,p.edge.b,part(p.edge,p.point,nodes[p.edge.b]),p.edge);
    }
    if(a.edge===b.edge)both('$start','$finish',part(a.edge,a.point,b.point),a.edge);
    const costs=new Map([['$start',0]]),previous=new Map(),pending=new Set(adj.keys());
    while(pending.size){
      let u=null;for(const n of pending)if(u===null||(costs.get(n)??Infinity)<(costs.get(u)??Infinity))u=n;
      pending.delete(u);if(u==='$finish')break;
      for(const e of adj.get(u)||[]){const cost=(costs.get(u)??Infinity)+e.cost;if(cost<(costs.get(e.node)??Infinity)){costs.set(e.node,cost);previous.set(e.node,{...e,from:u});}}
    }
    const steps=[];let at='$finish';
    while(at!=='$start'){const step=previous.get(at);if(!step)throw new Error('Disconnected pinball rail');steps.unshift(step);at=step.from;}
    const points=[start,...steps.flatMap(s=>s.points),finish];
    if(a.distance>1)steps.unshift({points:[start,a.point],cost:a.distance,edge:{newRail:true}});
    if(b.distance>1)steps.push({points:[b.point,finish],cost:b.distance,edge:{newRail:true}});
    return {points,steps,edges:[...new Set(steps.map(s=>s.edge))],length:costs.get('$finish')+a.distance+b.distance};
  }
  function activate(p){
    for(const e of p.edges)e.users=(e.users||0)+1;
    if(p.edges.some(e=>e.a==='mini'&&e.b==='big'))document.getElementById('downPath').classList.add('open');
    let done=false;
    return ()=>{
      if(done)return;done=true;
      for(const e of p.edges)e.users=Math.max(0,e.users-1);
      if(!edges.some(e=>e.a==='mini'&&e.b==='big'&&e.users))document.getElementById('downPath').classList.remove('open');
    };
  }
  const carrier=document.getElementById('historyCarrier');
  const carrierHome=P([495,420]);
  let carrierPoint=carrierHome.slice(),carrierActor=null,elevatorActor=null;
  const transferActors=new Set();
  // Balls share the original moving equipment, with the main ball first in line.
  const equipment=new Map();
  function interrupted(){const error=new Error('Ball movement interrupted');error.name='AbortError';return error;}
  function checkMovement(a){if(a.signal?.aborted)throw interrupted();}
  async function withEquipment(name,actor,a,task){
    checkMovement(a);
    if(!equipment.has(name))equipment.set(name,{busy:false,queue:[]});
    const resource=equipment.get(name);
    await new Promise((resolve,reject)=>{
      const entry={actor,start:null,cancel:null};
      entry.cancel=()=>{const i=resource.queue.indexOf(entry);if(i>=0){resource.queue.splice(i,1);reject(interrupted());}};
      entry.start=()=>{a.signal?.removeEventListener('abort',entry.cancel);resource.busy=true;resolve();};
      if(resource.busy){
        if(actor===main){const i=resource.queue.findIndex(e=>e.actor!==main);resource.queue.splice(i<0?resource.queue.length:i,0,entry);}
        else resource.queue.push(entry);
        a.signal?.addEventListener('abort',entry.cancel,{once:true});
      }else entry.start();
    });
    try{checkMovement(a);return await task();}
    finally{resource.busy=false;resource.queue.shift()?.start();}
  }
  function routeSound(a,key,options){if(!a.silent)core.sound.play(key,options);}
  function positionCarrier(point){
    carrierPoint=point.slice();
    carrier.setAttribute('transform',`translate(${(point[0]-160)/.8} ${(point[1]-175)/.8})`);
  }
  function updateElevator(point){
    if(Math.abs(point[0]-792)<6&&point[1]>=481&&point[1]<=807){
      document.getElementById('elevatorCab').setAttribute('transform',`translate(790 ${clamp((point[1]-175)/.8,443,748)})`);
    }
  }
  async function moveCarrierTo(to,duration=210){
    const from=carrierPoint.slice();
    await new Promise(resolve=>{
      const start=performance.now();
      function tick(now){const t=Math.min(1,(now-start)/duration),u=t*t*(3-2*t);positionCarrier([from[0]+(to[0]-from[0])*u,from[1]+(to[1]-from[1])*u]);if(t<1)requestAnimationFrame(tick);else resolve();}
      requestAnimationFrame(tick);
    });
  }
  async function carryAcross(points,move,actor=main){
    await moveCarrierTo(points[0]);carrierActor=actor;
    try{await move();}finally{carrierActor=null;await moveCarrierTo(carrierHome);}
  }
  async function transferAcross(move,actor=main){
    const originalOpacity=actor.style.opacity;
    let fade;
    transferActors.add(actor);
    try{
      fade=actor.animate([{opacity:1},{opacity:0}],{duration:180,fill:'forwards'});
      await fade.finished;actor.style.opacity='0';fade.cancel();
      await move();
      fade=actor.animate([{opacity:0},{opacity:1}],{duration:180,fill:'forwards'});
      await fade.finished;
    }finally{fade?.cancel();actor.style.opacity=originalOpacity;transferActors.delete(actor);}
  }
  const pinkTrampoline=document.getElementById('miniTrampoline');
  const pinkPaths=pinkTrampoline.querySelectorAll(':scope > path');
  const pinkRestPaths=[pinkPaths[1].getAttribute('d'),pinkPaths[2].getAttribute('d')];
  const spring=window.PinballSpring;
  let springAnimation=0;
  // Centre of the ball at contact with the top of the mat, including its radius
  // and the existing two-degree rotation of the whole trampoline.
  function springContact(depth=0,actor=main){
    const ballRadius=actor===main?22:11/.8;
    const localY=-15.5-ballRadius+depth,angle=2*Math.PI/180;
    return P([1085-localY*Math.sin(angle),444+localY*Math.cos(angle)]);
  }
  const springApproach=sample('#rightRamp path').reduce((best,p)=>Math.hypot(p[0]-920,p[1]-497)<Math.hypot(best[0]-920,best[1]-497)?p:best);
  function setSpringDepth(depth){
    pinkPaths[1].setAttribute('d',`M-96 -9 Q0 ${-22+2*depth} 96 -9 L90 8 Q0 ${20+.5*depth} -90 8 Z`);
    pinkPaths[2].setAttribute('d',`M-96 -9 Q0 ${-22+2*depth} 96 -9`);
  }
  function flexMat(fn,duration){
    return new Promise(resolve=>{
      const start=performance.now();
      const animation=springAnimation;
      function tick(now){if(animation!==springAnimation){resolve();return;}const t=Math.min(1,(now-start)/duration);setSpringDepth(fn(t));if(t<1)requestAnimationFrame(tick);else resolve();}
      requestAnimationFrame(tick);
    });
  }
  async function reboundFromPink(a,landing,actor=main){
    routeSound(a,'roll',{volume:.24});
    springAnimation++;
    try{
      // During contact, mat and ball have exactly the same displacement.
      for(const [fn,duration] of [[spring.compression,110],[spring.release,85]]){
        pinkTrampoline.setAttribute('data-spring-phase',fn===spring.compression?'compression':'release');
        const contactPoints=Array.from({length:31},(_,i)=>springContact(fn(i/30),actor));
        await Promise.all([a.move(contactPoints,duration,'timed'),flexMat(fn,duration)]);
      }
      pinkTrampoline.setAttribute('data-spring-phase','flight');
      await Promise.all([
        a.move(spring.flight(springContact(-8,actor),landing,85),860,'timed'),
        flexMat(spring.settle,600)
      ]);
    }finally{
      springAnimation++;pinkTrampoline.setAttribute('data-spring-phase','idle');
      pinkPaths[1].setAttribute('d',pinkRestPaths[0]);pinkPaths[2].setAttribute('d',pinkRestPaths[1]);
    }
  }
  async function travelOnStructures(a,start,target,actor=main){
    checkMovement(a);
    if(typeof target==='string'&&Math.hypot(start[0]-nodes[target][0],start[1]-nodes[target][1])<.5)return;
    // Fall onto the actual upper surface, compress it, and rebound to the hub.
    if(Math.hypot(start[0]-nodes.teaching[0],start[1]-nodes.teaching[1])<1&&target!=='teaching'){
      await withEquipment('pink',actor,a,async()=>{
        routeSound(a,'roll',{volume:.24});
        await a.move(spring.flight(start,springContact(0,actor),24),760,'timed');
        await reboundFromPink(a,nodes.hub,actor);
      });
      start=nodes.hub;
    }
    if(target==='teaching'){
      await travelOnStructures(a,start,springApproach,actor);
      await withEquipment('pink',actor,a,async()=>{
        const contact=springContact(0,actor);
        await a.move([springApproach,[contact[0]-35,contact[1]-2],contact],360,'in');
        await reboundFromPink(a,nodes.teaching,actor);
      });
      return;
    }
    // In the original homepage route the flipper retracts before the ball
    // enters the lower track, then returns after the bounce on the big ramp.
    if(target==='home'){
      await travelOnStructures(a,start,'rightEnd',actor);
      await withEquipment('pink',actor,a,async()=>{
        await core.flipper.retract();
        try{
          checkMovement(a);document.getElementById('downPath').classList.add('open');
          routeSound(a,'roll',{volume:.24});
          await a.move([[983,438],[1015,490],[1050,550],[1090,620],[1125,692],[1150,706]].map(P),900,'in');
          flash(document.getElementById('bigTrampoline'));
          await a.move([[1150,706],[1170,680],[1190,700],[1172,746],[1148,782]].map(P),620,'out');
          flash(document.getElementById('homeRing'));
        }finally{document.getElementById('downPath').classList.remove('open');await core.flipper.restore();}
      });
      return;
    }
    const p=plan(start,target),finish=activate(p);
    try{
      for(const step of p.steps){
        checkMovement(a);
        if(step.cost<.5)continue;
        const edge=step.edge;
        const sound=edge.carrierRoute?'synth':edge.a==='liftTop'&&edge.b==='about'?'tube':edge.a==='blueTop'&&edge.b==='blueEnd'?'blue':'roll';
        routeSound(a,sound,{volume:sound==='roll'?.24:.3});
        const move=()=>a.move(step.points,clamp(step.cost*3.4,130,5000),'linear');
        if(step.edge.carrierRoute)await withEquipment('carrier',actor,a,()=>carryAcross(step.points,move,actor));
        else if(step.edge.newRail){
          const endpoint=step.points[step.points.length-1];
          await transferAcross(()=>a.move([endpoint,endpoint],16,'linear'),actor);
        }
        else if(actor!==main&&edge.a==='mini'&&edge.b==='teaching')await withEquipment('pink',actor,a,async()=>{
          const contact=springContact(0,actor);
          await a.move(spring.flight(step.points[0],contact,24),600,'timed');
          await reboundFromPink(a,step.points[step.points.length-1],actor);
        });
        else if(actor!==main&&edge.a==='mini'&&edge.b==='big')await withEquipment('pink',actor,a,async()=>{
          await core.flipper.retract();
          try{checkMovement(a);document.getElementById('downPath').classList.add('open');await move();}
          finally{await core.flipper.restore();}
        });
        else if(edge.a==='liftTop'&&edge.b==='about')await withEquipment('elevator',actor,a,async()=>{
          elevatorActor=actor;try{await move();}finally{elevatorActor=null;}
        });
        else await move();
      }
    }finally{finish();}
  }
  async function travelMain(a,target){await travelOnStructures(a,core.point,target);}
  window.PinballExtras.navigate=async(name,move)=>{
    const destination={official:'portfolio',cv:'hub',unofficial:'teaching',teaching:'contacts',history:'about',home:'home'}[name];
    await travelMain({move},destination);
  };
  window.PinballExtras.resumeAfterCatch=(points,move)=>transferAcross(move);
  const marbles=[];
  const maxMarbles=12;
  let createdCount=0;
  const twinStops=['hub','portfolio','contacts','about','teaching','home','film','ladder','split'];
  const ballColors=['#ff4ab9','#4ce9e5','#ffe14a','#8b66ff','#93ed4a','#ff8654','#74a9ff'];
  const ballDefs=board.querySelector('defs');
  const textureIds=media.fills.map((url,i)=>{
    const id='roamingBallTexture'+i;
    const pattern=svg('pattern',{id,width:1,height:1,viewBox:'0 0 64 64',preserveAspectRatio:'xMidYMid slice'},ballDefs);
    svg('image',{href:url,width:64,height:64,preserveAspectRatio:'xMidYMid slice'},pattern);
    return id;
  });
  const ballSheen=svg('radialGradient',{id:'roamingBallSheen',cx:'.3',cy:'.22',r:'.8'},ballDefs);
  for(const attrs of [{offset:0,'stop-color':'#fff','stop-opacity':.9},{offset:.22,'stop-color':'#fff','stop-opacity':.25},{offset:.6,'stop-color':'#fff','stop-opacity':0},{offset:1,'stop-color':'#170d40','stop-opacity':.7}])svg('stop',attrs,ballSheen);
  const effectsLayer=svg('g',{id:'smallBallEffects','pointer-events':'none'},ballsLayer);
  function setTwinMode(b,mode){b.mode=mode;b.el.setAttribute('data-state',mode);}
  function putTwin(b,point){
    b.x=point[0];b.y=point[1];b.el.setAttribute('transform',`translate(${b.x} ${b.y})`);
    (b.history??=[]).push(point.slice());if(b.history.length>16)b.history.shift();
    if(carrierActor===b.el)positionCarrier(point);
    if(elevatorActor===b.el)updateElevator(point);
  }
  function moveTwin(b,points,duration,mode='linear'){
    return new Promise((resolve,reject)=>{
      const signal=b.controller.signal;
      if(signal.aborted){reject(interrupted());return;}
      const start=performance.now();
      let frameId;
      const abort=()=>{cancelAnimationFrame(frameId);reject(interrupted());};
      signal.addEventListener('abort',abort,{once:true});
      const done=(error)=>{signal.removeEventListener('abort',abort);if(error)reject(error);else resolve();};
      function tick(now){
        if(signal.aborted){done(interrupted());return;}
        if(document.hidden){b.pauseStarted??=now;frameId=requestAnimationFrame(tick);return;}
        if(b.pauseStarted!=null){b.pausedTime+=now-b.pauseStarted;b.pauseStarted=null;}
        const raw=clamp((now-start-b.pausedTime)/duration,0,1);
        const t=mode==='out'?1-Math.pow(1-raw,3):mode==='in'?raw*raw:mode==='inout'?(raw<.5?2*raw*raw:1-Math.pow(-2*raw+2,2)/2):raw;
        const point=mode==='timed'?spring.pointAt(points,raw):pointOn(points,t),oldX=b.x,oldY=b.y;
        putTwin(b,point);
        if(carrierActor!==b.el&&!transferActors.has(b.el)&&tryCatch(b,oldX,oldY,now)){
          const error=new Error('Ball held by catcher');error.name='BallCaught';done(error);return;
        }
        if(raw<1)frameId=requestAnimationFrame(tick);else done();
      }
      b.pausedTime=0;b.pauseStarted=null;frameId=requestAnimationFrame(tick);
    });
  }
  function scheduleTwin(b,delay=rand(600,1900)){
    clearTimeout(b.timer);
    if(b.removed||b.reacting||b.mode!=='idle')return;
    b.timer=setTimeout(()=>{
      if(b.removed||b.reacting||b.mode!=='idle')return;
      if(document.hidden||flipping||core.busy){scheduleTwin(b,450);return;}
      void advanceTwin(b);
    },delay);
  }
  async function advanceTwin(b){
    if(b.removed||b.reacting||b.mode!=='idle')return;
    const choices=twinStops.filter(name=>Math.hypot(b.x-nodes[name][0],b.y-nodes[name][1])>2&&name!==b.lastStop);
    const target=choices[Math.floor(rand(0,choices.length))];
    b.controller=new AbortController();setTwinMode(b,'moving');b.el.setAttribute('data-target',target);
    const a={signal:b.controller.signal,silent:true,move:(points,duration,mode)=>moveTwin(b,points,duration,mode)};
    b.journey=travelOnStructures(a,[b.x,b.y],target,b.el);
    try{
      await b.journey;b.lastStop=target;
    }catch(error){if(!['BallCaught','AbortError'].includes(error.name))console.error(error);}
    finally{
      b.journey=null;
      if(!b.removed&&!b.reacting&&b.mode==='moving'){setTwinMode(b,'idle');scheduleTwin(b);}
    }
  }
  function spawnTwin(parent=null){
    if(marbles.length>=maxMarbles)return null;
    const [x,y]=parent?[parent.x,parent.y]:nodes.split;
    const count=Math.max(1,textureIds.length);
    const texture=parent?(parent.texture+1+Math.floor(rand(0,Math.max(1,count-1))))%count:Math.floor(rand(0,count));
    const color=parent?(parent.color+1+Math.floor(rand(0,ballColors.length-1)))%ballColors.length:createdCount%ballColors.length;
    const b={id:++createdCount,x,y,radius:11,texture,color,removed:false,reacting:false,mode:'idle',catchUntil:performance.now()+900,catcher:null};
    b.el=svg('g',{class:'secondary-ball',role:'button',tabindex:0,'aria-label':'Small ball','data-ball-id':b.id,'data-texture':texture,'data-color':ballColors[color],'data-state':'idle'},ballsLayer);
    const fill=textureIds.length?`url(#${textureIds[texture]})`:'url(#twinPink)';
    svg('circle',{r:15,fill:'transparent'},b.el);
    svg('circle',{r:b.radius,fill,filter:'url(#shadow)',class:'small-ball-sphere'},b.el);
    svg('circle',{r:b.radius,fill:ballColors[color],opacity:.22},b.el);
    svg('circle',{r:b.radius,fill:'url(#roamingBallSheen)'},b.el);
    svg('ellipse',{cx:-3.5,cy:-4,rx:3.7,ry:2.4,fill:'#fff',opacity:.72},b.el);
    marbles.push(b);putTwin(b,[x,y]);action(b.el,()=>void reactTwin(b));
    b.el.animate([{opacity:0},{opacity:1}],{duration:250});
    // A twin born during a journey follows that same rail/flight until arrival.
    if(parent&&['moving','following'].includes(parent.mode)){b.leader=parent;setTwinMode(b,'following');}
    else scheduleTwin(b,rand(800,1600));
    return b;
  }
  function removeTwin(b){
    if(b.removed)return;b.removed=true;clearTimeout(b.timer);b.controller?.abort();
    if(b.catcher){b.catcher.held=null;b.catcher=null;}
    b.bubble?.remove();b.el.remove();const i=marbles.indexOf(b);if(i>=0)marbles.splice(i,1);
  }
  async function stopTwin(b){
    clearTimeout(b.timer);b.leader=null;b.controller?.abort();
    if(b.catcher){b.catcher.held=null;b.catcher=null;}
    try{await b.journey;}catch{}
    b.el.style.opacity='';b.catchUntil=performance.now()+500;
  }
  function explodeTwin(b){
    const burst=svg('g',{class:'twin-explosion',transform:`translate(${b.x} ${b.y})`},effectsLayer);
    for(let i=0;i<12;i++){
      const angle=i/12*Math.PI*2+rand(-.15,.15),distance=rand(30,85);
      const shard=svg('g',{},burst);
      svg(i%3?'circle':'rect',i%3?{r:rand(1.5,4),fill:ballColors[(b.color+i)%ballColors.length]}:{x:-3,y:-3,width:6,height:6,fill:`url(#${textureIds[b.texture]||'twinPink'})`},shard);
      shard.animate([{transform:'translate(0px,0px) scale(1)',opacity:1},{transform:`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance+18}px) scale(.2)`,opacity:0}],{duration:rand(420,800),fill:'forwards'});
    }
    removeTwin(b);setTimeout(()=>burst.remove(),850);
  }
  async function reactTwin(b){
    if(b.removed||b.reacting||b.mode==='bubble')return;
    let outcome=['explode','split','fall','bubble'][Math.floor(rand(0,4))];
    if(outcome==='split'&&marbles.length>=maxMarbles)outcome='bubble';
    board.setAttribute('data-last-small-ball-effect',outcome);
    if(outcome==='split'){
      const child=spawnTwin(b);flash(b.el);if(child)flash(child.el);return;
    }
    b.reacting=true;setTwinMode(b,'reacting');await stopTwin(b);if(b.removed)return;
    if(outcome==='explode'){explodeTwin(b);return;}
    b.reacting=false;b.effectTime=0;
    if(outcome==='fall'){
      setTwinMode(b,'falling');b.vx=rand(-90,90);b.vy=rand(35,85);return;
    }
    setTwinMode(b,'bubble');b.origin=[b.x,b.y];
    b.bubble=svg('g',{class:'ball-carrying-bubble'},effectsLayer);
    svg('circle',{r:23,fill:'url(#soapGlass)',stroke:'url(#soapRim)','stroke-width':1.6},b.bubble);
    if(media.bubble)svg('use',{href:'#suppliedBubbleArtwork',transform:'scale(23)',opacity:.65},b.bubble);
    svg('path',{d:'M-14 -5 Q-11 -17 3 -17',fill:'none',stroke:'#fff','stroke-width':2,opacity:.85},b.bubble);
    b.bubble.setAttribute('transform',`translate(${b.x} ${b.y}) scale(.5)`);
  }
  function tryCatch(b,oldX,oldY,now){
    if(now<b.catchUntil)return;
    for(const c of catchers){
      if(c.held)continue;
      const ax=(oldX-c.x)/66,ay=(oldY-c.y)/26,dx=(b.x-oldX)/66,dy=(b.y-oldY)/26;
      const t=clamp(-(ax*dx+ay*dy)/(dx*dx+dy*dy||1),0,1);
      if((ax+t*dx)**2+(ay+t*dy)**2<=1){c.held=b;b.catcher=c;setTwinMode(b,'held');flash(c.el);status.textContent='Ball caught.';return true;}
    }
  }
  async function jump(){
    if(core.busy||flipping)return;
    await core.addon(async a=>{
      await travelMain(a,'split');flash(splitter);spawnTwin();await wait(140);await travelMain(a,'hub');
    });
    status.textContent='Duplicate ball ready.';
  }
  action(splitter,jump);
  pinkTrampoline.classList.add('new-control');
  pinkTrampoline.setAttribute('role','button');pinkTrampoline.setAttribute('tabindex','0');
  pinkTrampoline.setAttribute('aria-label','Pink trampoline');
  action(pinkTrampoline,async()=>{
    if(core.busy||flipping)return;
    await core.addon(async a=>{
      const p=core.point;
      const target=Math.hypot(p[0]-nodes.teaching[0],p[1]-nodes.teaching[1])<1?'hub':'teaching';
      await travelMain(a,target);
    });
  });
  const launcher=document.getElementById('launchButton');
  launcher.setAttribute('role','button');launcher.setAttribute('tabindex','0');launcher.setAttribute('aria-label','Launcher');action(launcher,jump);

  async function climb(){
    if(core.busy||flipping)return;flipping=true;
    try{await core.addon(async a=>{
      await travelMain(a,'ladder');
      const rungs=[[1401,298]];
      for(let y=270;y>=-38;y-=28)rungs.push([1401+(rungs.length%2?8:-8),y]);
      await a.move(rungs,1700,'linear');
      upsideDown=!upsideDown;world.classList.toggle('upside-down',upsideDown);
      ladder.setAttribute('aria-pressed',String(upsideDown));ladder.setAttribute('aria-label',upsideDown?'Return ladder':'Ladder');
      document.getElementById('worldReturn').hidden=!upsideDown;
      await wait(reduced?1:1260);
      await a.move(rungs.slice().reverse(),1300,'linear');
      status.textContent=upsideDown?'You are on the upside-down page.':'Back on the original side.';
    });}finally{flipping=false;}
  }
  action(ladder,climb,['Enter',' ','ArrowUp']);document.getElementById('worldReturn').addEventListener('click',climb);


  function closeFilm() { filmDialog.close(); }
  document.getElementById('filmClose').addEventListener('click',closeFilm);
  filmDialog.addEventListener('click',e=>{if(e.target===filmDialog)closeFilm();});
  filmDialog.addEventListener('close',()=>{document.getElementById('filmBody').replaceChildren();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&filmDialog.open)closeFilm();});
  function positionFilm() {
    if(!filmDialog.open)return;
    const matrix=board.getScreenCTM();
    if(!matrix)return;
    const anchor=new DOMPoint(186,418).matrixTransform(matrix);
    const box=filmDialog.getBoundingClientRect();
    filmDialog.style.left=clamp(anchor.x,12,Math.max(12,window.innerWidth-box.width-12))+'px';
    filmDialog.style.top=clamp(anchor.y,12,Math.max(12,window.innerHeight-box.height-12))+'px';
  }
  window.addEventListener('resize',positionFilm);
  world.addEventListener('transitionend',positionFilm);
  function openFilm() {
    if(filmDialog.open)return;
    const body=document.getElementById('filmBody');body.replaceChildren();
    const url=media.video.trim();
    const external=document.getElementById('filmLink');
    external.hidden=true;external.removeAttribute('href');
    if(url) {
      let parsed;
      try{parsed=new URL(url,location.href);}catch{}
      if(parsed && !['https:','http:','data:','blob:','file:'].includes(parsed.protocol)) parsed=null;
      if(parsed) {
        external.href=parsed.href;external.hidden=false;
        const hostname=parsed.hostname.replace(/^www\./,'');
        let embed='';
        if(hostname==='youtu.be')embed='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(parsed.pathname.slice(1));
        if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(hostname)) {
          const id=parsed.searchParams.get('v')||parsed.pathname.split('/').filter(Boolean).pop();
          if(id)embed='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id);
        }
        if(hostname==='vimeo.com' && /^\/\d+/.test(parsed.pathname))embed='https://player.vimeo.com/video/'+parsed.pathname.split('/')[1];
        if(embed) {
          const frame=document.createElement('iframe');frame.src=embed;frame.title='Portfolio video';frame.allow='fullscreen; picture-in-picture';frame.allowFullscreen=true;body.appendChild(frame);
        } else {
          const video=document.createElement('video');video.src=parsed.href;video.controls=true;video.playsInline=true;video.preload='metadata';
          video.addEventListener('error',()=>{
            const line=document.createElement('p');line.className='missing-film';line.append('Video could not be played. ');
            const link=document.createElement('a');link.href=parsed.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open video';line.append(link);body.append(line);
          },{once:true});body.appendChild(video);
        }
      }
    }
    if(!body.children.length) {
      const note=document.createElement('div');note.className='missing-film';
      note.innerHTML='<svg viewBox="0 0 70 70" aria-hidden="true"><path d="M35 3 L67 35 L35 67 L3 35 Z" fill="#ed1daf" opacity=".35"/><path d="M29 23 L47 35 L29 47 Z" fill="#fff"/></svg>';
      const text=document.createElement('p');text.textContent='Видео пока не добавлено';note.append(text);body.append(note);
    }
    filmDialog.show();positionFilm();
  }
  async function filmJourney() {
    if(core.busy||flipping)return;
    await core.addon(async a=>{
      await travelMain(a,'film');flash(document.getElementById('videoDiamond'));openFilm();
    });
  }
  action(document.getElementById('filmScoop'),filmJourney);
  action(document.getElementById('videoDiamond'),filmJourney);

  // Keep the game and bubbles moving while the small video preview is open.
  let lastFrame=performance.now();
  function frame(now) {
    const dt=Math.min(.04,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
    if(!document.hidden) {
      if(primaryHold) {
        const c=primaryHold.catcher;
        main.setAttribute('cx',(c.x-160)/.8);main.setAttribute('cy',(c.y-17.6-175)/.8);
        main.style.transform='none';
      }
      for(let i=bubbles.length-1;i>=0;i--) {
        const b=bubbles[i];b.life+=dt;b.vy-=18*dt;
        b.x+=(b.vx+Math.sin(now*.0015+b.phase)*9)*dt;b.y+=b.vy*dt;
        const fade=Math.min(1,b.life/.3,Math.max(0,(b.max-b.life)/1.4));
        b.el.setAttribute('transform',`translate(${b.x.toFixed(2)} ${b.y.toFixed(2)}) scale(${1+Math.sin(b.life*3)*.04} ${1-Math.sin(b.life*3)*.04})`);
        b.el.setAttribute('opacity',fade);
        if(b.life>b.max||b.y < -60){b.el.remove();bubbles.splice(i,1);}
      }
      for(const b of [...marbles]) {
        if(b.mode==='following'){
          const leader=b.leader;
          if(leader&&!leader.removed&&['moving','following'].includes(leader.mode)){
            const trail=leader.history||[[leader.x,leader.y]];
            putTwin(b,trail[Math.max(0,trail.length-6)]);b.el.style.opacity=leader.el.style.opacity;
          }else{
            b.leader=null;b.el.style.opacity='';setTwinMode(b,'idle');scheduleTwin(b,rand(200,600));
          }
        }
        if(b.mode==='held')putTwin(b,[b.catcher.x,b.catcher.y-b.radius]);
        if(b.mode==='falling'){
          const oldX=b.x,oldY=b.y;b.effectTime+=dt;b.vy+=520*dt;
          putTwin(b,[b.x+b.vx*dt,b.y+b.vy*dt]);
          if(tryCatch(b,oldX,oldY,now))continue;
          if(b.y>960||b.x < -80||b.x>1680)removeTwin(b);
        }
        if(b.mode==='bubble'){
          const t=b.effectTime+=dt;
          putTwin(b,[b.origin[0]+Math.sin(t*1.8)*24,b.origin[1]-52*t-19*t*t]);
          const fade=clamp((2.9-t)/.9,0,1);
          b.bubble.setAttribute('transform',`translate(${b.x} ${b.y}) scale(${Math.min(1,.5+t*2)})`);
          b.bubble.setAttribute('opacity',fade);b.el.style.opacity=fade;
          if(t>=2.9||b.y < -50)removeTwin(b);
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();});
  window.addEventListener('pagehide',()=>{pipeTimers.forEach(clearTimeout);for(const b of [...marbles])removeTwin(b);});

  // Preserve the live page's tube visibility repair.
  const restoreTubeBall=()=>{
    const x=Number(main.getAttribute('cx')),y=Number(main.getAttribute('cy'));
    if(Math.abs(x-790)<=18&&y>=378&&y<=800){main.style.transform='none';main.style.opacity='1';main.style.filter='';}
  };
  new MutationObserver(restoreTubeBall).observe(main,{attributes:true,attributeFilter:['cx','cy']});
  main.parentNode.appendChild(main);
})();

