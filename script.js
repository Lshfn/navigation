(() => {
  const LINKS = {
    history: "history.html",
    cv: "https://docs.google.com/document/d/14i8lpF-PPK2IcqgMuQ-s5R-ya_tmGrCH/edit?usp=sharing&ouid=107911058444608401925&rtpof=true&sd=true",
    official: "official-portfolio.html",
    teaching: "teaching.html",
    unofficial: "https://dariaivans.hotglue.me/?projects",
    home: "https://dariaivans.neocities.org/"
  };

  const HUB = [795,250];
  const HISTORY_CARRIER_CENTER = [495,420];
  const BLUE_ROUTE_START = [715,392];
  const BLUE_ROUTE_END = [330,699];

  const ENDPOINTS = {
    official:[355,215],
    cv:[795,250],
    unofficial:[1248,225],
    teaching:[330,805],
    history:[790,790],
    home:[1148,782]
  };

  const ball = document.getElementById("ball");
  const launchButton = document.getElementById("launchButton");
  const historyCarrier = document.getElementById("historyCarrier");
  const teleporter = document.getElementById("teleporter");
  const teachingReceiver = document.getElementById("teachingReceiver");
  const cvCluster = document.getElementById("cvCluster");
  const elevatorCab = document.getElementById("elevatorCab");
  const miniTrampoline = document.getElementById("miniTrampoline");
  const downPath = document.getElementById("downPath");
  const bigTrampoline = document.getElementById("bigTrampoline");
  const homeRing = document.getElementById("homeRing");
  const particles = document.getElementById("particles");

  let currentLocation = "start";
  let running = false;
  let elevatorY = 443;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const SOUND_URLS = {
    tube: "https://dariaivans.neocities.org/sounds/5-whoosh-sci-fi_qjbU91C.mp3",
    blue: "https://dariaivans.neocities.org/sounds/plop_1.mp3",
    synth: "https://dariaivans.neocities.org/sounds/synth-pad.mp3",
    roll: "https://dariaivans.neocities.org/sounds/computer_magic-microsift-1901299923.mp3"
  };

  const sounds = Object.fromEntries(
    Object.entries(SOUND_URLS).map(([key,url]) => {
      const a = new Audio(url);
      a.preload = "auto";
      a.crossOrigin = "anonymous";
      return [key,a];
    })
  );
  let audioUnlocked = false;
  const pendingSoundStops = {};

  function clearPendingStop(key){
    if(pendingSoundStops[key]){
      clearTimeout(pendingSoundStops[key]);
      delete pendingSoundStops[key];
    }
  }

  function unlockAudio(){
    if(audioUnlocked) return;
    audioUnlocked = true;
    Object.values(sounds).forEach(a => {
      const oldVolume = a.volume;
      a.volume = 0;
      const p = a.play();
      if(p && p.then){
        p.then(() => { a.pause(); a.currentTime = 0; a.volume = oldVolume || .34; }).catch(() => { a.volume = oldVolume || .34; });
      }
    });
  }

  function startSound(key, {loop=true, volume=.32}={}){
    const a = sounds[key];
    if(!a) return;
    clearPendingStop(key);
    try{
      a.loop = loop;
      a.volume = volume;
      if(!a.paused){
        return;
      }
      a.currentTime = 0;
      a.play().catch(()=>{});
    }catch(e){}
  }

  function stopSound(key, {force=false, delay=140}={}){
    const a = sounds[key];
    if(!a) return;
    clearPendingStop(key);

    const performStop = () => {
      try{ a.pause(); a.currentTime = 0; }catch(e){}
      delete pendingSoundStops[key];
    };

    if(force || delay <= 0){
      performStop();
      return;
    }

    pendingSoundStops[key] = setTimeout(performStop, delay);
  }

  function stopAllSounds(){
    Object.keys(sounds).forEach(key => stopSound(key, {force:true}));
  }

  function setBall(x,y){
    ball.setAttribute("cx", x);
    ball.setAttribute("cy", y);
  }

  function setActive(name){
    document.querySelectorAll(".nav").forEach(el=>{
      el.classList.toggle("active", el.dataset.destination === name);
    });
  }

  function clearBallTransform(){
    ball.style.transform = "";
    ball.style.transformOrigin = "";
    ball.style.opacity = "1";
    ball.style.filter = "";
  }

  function pointOnPolyline(points,t){
    const lengths=[];
    let total=0;

    for(let i=0;i<points.length-1;i++){
      const dx=points[i+1][0]-points[i][0];
      const dy=points[i+1][1]-points[i][1];
      const l=Math.hypot(dx,dy);
      lengths.push(l);
      total+=l;
    }

    let wanted=t*total;

    for(let i=0;i<lengths.length;i++){
      if(wanted<=lengths[i]){
        const u=lengths[i] ? wanted/lengths[i] : 0;
        return [
          points[i][0]+(points[i+1][0]-points[i][0])*u,
          points[i][1]+(points[i+1][1]-points[i][1])*u
        ];
      }
      wanted-=lengths[i];
    }

    return points[points.length-1];
  }

  function easeValue(t,mode){
    if(mode==="linear") return t;
    if(mode==="out") return 1-Math.pow(1-t,3);
    if(mode==="in") return t*t;
    return t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
  }

  async function moveBall(points,duration,mode="inout",soundKey="roll"){
    if(soundKey) startSound(soundKey,{loop:true,volume:soundKey==="roll"?.24:.3});
    return new Promise(resolve=>{
      const start=performance.now();

      function frame(now){
        const raw=Math.min(1,(now-start)/duration);
        const t=easeValue(raw,mode);
        const p=pointOnPolyline(points,t);

        setBall(p[0],p[1]);
        ball.style.transformOrigin=p[0]+"px "+p[1]+"px";
        ball.style.transform="rotate("+(t*900)+"deg)";

        if(raw<1) requestAnimationFrame(frame);
        else {
          if(soundKey) stopSound(soundKey);
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  async function moveBallSwimming(points,duration){
    startSound("blue",{loop:true,volume:.3});
    return new Promise(resolve=>{
      const start=performance.now();

      function frame(now){
        const raw=Math.min(1,(now-start)/duration);
        const t=easeValue(raw,"inout");

        const p=pointOnPolyline(points,t);
        const p2=pointOnPolyline(points,Math.min(1,t+.008));

        let dx=p2[0]-p[0];
        let dy=p2[1]-p[1];
        const len=Math.hypot(dx,dy)||1;
        dx/=len;
        dy/=len;

        const nx=-dy;
        const ny=dx;
        const bob=Math.sin(t*Math.PI*12)*6;

        const x=p[0]+nx*bob;
        const y=p[1]+ny*bob;

        setBall(x,y);
        ball.style.transformOrigin=x+"px "+y+"px";
        ball.style.transform="rotate("+(t*1100)+"deg)";

        if(raw<1) requestAnimationFrame(frame);
        else { stopSound("blue"); resolve(); }
      }

      requestAnimationFrame(frame);
    });
  }

  function pulse(el){
    const base=el.getAttribute("transform")||"";
    el.animate(
      [
        {transform:base,opacity:1},
        {transform:base+" scale(1.1)",opacity:.78},
        {transform:base,opacity:1}
      ],
      {
        duration:360,
        iterations:2,
        transformOrigin:"center",
        transformBox:"fill-box"
      }
    );
  }

  async function pressLauncher(){
    launchButton.setAttribute("transform","translate(0 10)");
    await sleep(100);
    launchButton.setAttribute("transform","translate(0 0)");
    await sleep(70);
  }

  async function animateElementTransform(el,from,to,duration){
    return new Promise(resolve=>{
      const start=performance.now();

      function frame(now){
        let t=Math.min(1,(now-start)/duration);
        t=t*t*(3-2*t);

        const x=from.x+(to.x-from.x)*t;
        const y=from.y+(to.y-from.y)*t;
        const r=(from.r||0)+((to.r||0)-(from.r||0))*t;
        const sx=(from.sx||1)+((to.sx||1)-(from.sx||1))*t;
        const sy=(from.sy||1)+((to.sy||1)-(from.sy||1))*t;

        el.setAttribute(
          "transform",
          `translate(${x} ${y}) rotate(${r}) scale(${sx} ${sy})`
        );

        if(t<1) requestAnimationFrame(frame);
        else resolve();
      }

      requestAnimationFrame(frame);
    });
  }

  async function carryWithHistoryRing(from,to,duration){
    startSound("synth",{loop:true,volume:.36});
    const base=[495,420];

    await animateElementTransform(
      historyCarrier,
      {x:base[0],y:base[1],r:0},
      {x:from[0],y:from[1],r:0},
      420
    );

    await new Promise(resolve=>{
      const start=performance.now();

      function frame(now){
        let t=Math.min(1,(now-start)/duration);
        t=easeValue(t,"inout");

        const arch=Math.sin(t*Math.PI)*-55;
        const x=from[0]+(to[0]-from[0])*t;
        const y=from[1]+(to[1]-from[1])*t+arch;

        historyCarrier.setAttribute("transform",`translate(${x} ${y})`);
        setBall(x,y);

        if(t<1) requestAnimationFrame(frame);
        else resolve();
      }

      requestAnimationFrame(frame);
    });

    await animateElementTransform(
      historyCarrier,
      {x:to[0],y:to[1],r:0},
      {x:base[0],y:base[1],r:0},
      520
    );
    stopSound("synth");
  }

  function createParticles(x,y,count,colorA,colorB){
    const ns="http://www.w3.org/2000/svg";
    const created=[];

    for(let i=0;i<count;i++){
      const c=document.createElementNS(ns,"circle");
      c.setAttribute("cx",x);
      c.setAttribute("cy",y);
      c.setAttribute("r",(2+Math.random()*4).toFixed(1));
      c.setAttribute("fill",Math.random()>.5?colorA:colorB);
      c.setAttribute("opacity","1");
      particles.appendChild(c);
      created.push(c);
    }

    return created;
  }

  async function dissolveTeleport(from,to,fromElement=teleporter,toElement=cvCluster,soundKey=null){
    if(soundKey) startSound(soundKey,{loop:false,volume:.38});
    setBall(from[0],from[1]);
    if(fromElement) pulse(fromElement);

    const out=createParticles(from[0],from[1],18,"#6f24f2","#32d8d5");

    out.forEach((p,i)=>{
      const angle=(Math.PI*2*i/out.length)+(Math.random()*.3);
      const dist=25+Math.random()*45;
      const dx=Math.cos(angle)*dist;
      const dy=Math.sin(angle)*dist;

      p.animate(
        [
          {transform:"translate(0 0)",opacity:1},
          {transform:`translate(${dx}px ${dy}px)`,opacity:0}
        ],
        {duration:360+Math.random()*180,fill:"forwards"}
      );
    });

    ball.animate(
      [
        {opacity:1,transform:"scale(1)",filter:"blur(0px)"},
        {opacity:.1,transform:"scale(.2)",filter:"blur(7px)"}
      ],
      {
        duration:390,
        fill:"forwards",
        transformOrigin:"center",
        transformBox:"fill-box"
      }
    );

    await sleep(410);
    ball.style.opacity="0";
    out.forEach(p=>p.remove());

    setBall(to[0],to[1]);
    if(toElement) pulse(toElement);

    const incoming=createParticles(to[0],to[1],18,"#6f24f2","#32d8d5");

    incoming.forEach((p,i)=>{
      const angle=(Math.PI*2*i/incoming.length)+(Math.random()*.3);
      const dist=25+Math.random()*45;
      const dx=Math.cos(angle)*dist;
      const dy=Math.sin(angle)*dist;

      p.animate(
        [
          {transform:`translate(${dx}px ${dy}px)`,opacity:0},
          {transform:"translate(0 0)",opacity:1},
          {transform:"translate(0 0)",opacity:0}
        ],
        {duration:460+Math.random()*160,fill:"forwards"}
      );
    });

    ball.style.opacity="1";

    ball.animate(
      [
        {opacity:.1,transform:"scale(.2)",filter:"blur(7px)"},
        {opacity:1,transform:"scale(1)",filter:"blur(0px)"}
      ],
      {
        duration:430,
        fill:"forwards",
        transformOrigin:"center",
        transformBox:"fill-box"
      }
    );

    await sleep(460);
    incoming.forEach(p=>p.remove());
    clearBallTransform();
    if(soundKey) stopSound(soundKey, {force:true});
  }

  async function moveElevator(toY){
    startSound("tube",{loop:true,volume:.32});
    return new Promise(resolve=>{
      const from=elevatorY;
      const start=performance.now();

      function frame(now){
        let t=Math.min(1,(now-start)/900);
        t=t*t*(3-2*t);

        const y=from+(toY-from)*t;

        elevatorCab.setAttribute("transform",`translate(790 ${y})`);
        setBall(790,y);

        if(t<1){
          requestAnimationFrame(frame);
        }else{
          elevatorY=toY;
          stopSound("tube");
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  async function flipMiniTrampoline(angle,duration=190){
    return animateElementTransform(
      miniTrampoline,
      {x:1085,y:444,r:2},
      {x:1085,y:444,r:angle},
      duration
    );
  }

  async function retractMiniTrampoline(){
    return animateElementTransform(
      miniTrampoline,
      {x:1085,y:444,r:2},
      {x:1180,y:410,r:-62},
      320
    );
  }

  async function restoreMiniTrampoline(){
    return animateElementTransform(
      miniTrampoline,
      {x:1180,y:410,r:-62},
      {x:1085,y:444,r:2},
      330
    );
  }

  async function leaveCurrentToHub(){
    if(currentLocation==="start"){
      await pressLauncher();
      await moveBall([[795,116],[795,172],[795,220],HUB],560,"out");
      currentLocation="cv";
      return;
    }

    if(currentLocation==="cv"){
      setBall(HUB[0],HUB[1]);
      return;
    }

    // OFFICIAL PORTFOLIO lives on the left carrier route.
    if(currentLocation==="official"){
      await carryWithHistoryRing(ENDPOINTS.official,HISTORY_CARRIER_CENTER,1020);
      setBall(...HISTORY_CARRIER_CENTER);
      clearBallTransform();
      await sleep(100);
      await moveBall([HISTORY_CARRIER_CENTER,[515,405],[545,372],[620,310],[705,240],HUB],820,"out");
      setBall(HUB[0],HUB[1]);
      return;
    }

    if(currentLocation==="teaching"){
      await dissolveTeleport(ENDPOINTS.teaching,HUB,teachingReceiver,cvCluster);
      return;
    }

    // PERSONAL HISTORY lives at the bottom of the elevator.
    if(currentLocation==="history"){
      await moveBall([ENDPOINTS.history,[790,748]],260,"in");
      await moveElevator(443);
      await moveBall([[790,443],[790,382],[792,315],HUB],620,"out");
      return;
    }

    // UNOFFICIAL PORTFOLIO lives at the top-right trampoline route.
    if(currentLocation==="unofficial"){
      await moveBall([
        ENDPOINTS.unofficial,
        [1238,276],
        [1210,332],
        [1166,383],
        [1110,432],
        [1085,444]
      ],820,"in");

      await flipMiniTrampoline(-13,120);
      pulse(miniTrampoline);

      await moveBall([
        [1085,444],
        [1038,402],
        [990,354],
        [930,316],
        [870,291],
        [835,280],
        HUB
      ],900,"out");

      await flipMiniTrampoline(2,170);
      return;
    }

    if(currentLocation==="home"){
      await moveBall([
        ENDPOINTS.home,
        [1163,755],
        [1182,725],
        [1215,695]
      ],440,"in");

      pulse(bigTrampoline);

      await moveBall([
        [1215,695],
        [1170,565],
        [1095,455],
        [995,350],
        [900,292],
        [835,280],
        HUB
      ],1100,"out");

      return;
    }
  }

  // left carrier -> OFFICIAL PORTFOLIO
  async function goToOfficialLeft(){
    await moveBall([
      HUB,
      [760,248],
      [705,240],
      [665,274],
      [620,310],
      [575,348],
      [535,388],
      [502,418],
      HISTORY_CARRIER_CENTER
    ],940,"inout");

    setBall(...HISTORY_CARRIER_CENTER);
    clearBallTransform();
    pulse(historyCarrier);
    await sleep(160);
    setBall(...HISTORY_CARRIER_CENTER);
    await carryWithHistoryRing(HISTORY_CARRIER_CENTER,ENDPOINTS.official,1050);
    setBall(...ENDPOINTS.official);
  }

  async function goToCV(){
    await moveBall([HUB,ENDPOINTS.cv],240,"out");
  }

  async function goToTeaching(){
    await moveBall([HUB,[780,258],[770,270]],270,"out");
    pulse(document.getElementById("blueTransferGem"));
    pulse(document.getElementById("blueRouteGem"));
    await dissolveTeleport([770,270],BLUE_ROUTE_START,document.getElementById("blueTransferGem"),document.getElementById("blueRouteGem"));

    await moveBallSwimming([
      [715,392],
      [690,425],
      [670,466],
      [635,487],
      [607,526],
      [582,558],
      [557,596],
      [530,620],
      [502,662],
      [470,668],
      [438,660],
      [414,674],
      [380,695],
      [350,703],
      BLUE_ROUTE_END
    ],1680);

    pulse(document.getElementById("blueExitGem"));
    pulse(teleporter);
    await dissolveTeleport(BLUE_ROUTE_END,ENDPOINTS.teaching,document.getElementById("blueExitGem"),teachingReceiver);
    setBall(...ENDPOINTS.teaching);
  }

  // elevator -> PERSONAL HISTORY
  async function goToPersonalHistory(){
    if(elevatorY!==443){
      elevatorCab.setAttribute("transform","translate(790 443)");
      elevatorY=443;
    }

    await moveBall([
      HUB,
      [793,310],
      [790,382],
      [790,443]
    ],650,"inout");

    pulse(elevatorCab);
    await moveElevator(748);
    await moveBall([[790,748],ENDPOINTS.history],280,"out");
  }

  // right ramp + trampoline -> UNOFFICIAL PORTFOLIO
  async function goToUnofficialRight(){
    await moveBall([
      HUB,
      [807,257],
      [820,268],
      [835,280],
      [875,315],
      [915,355],
      [950,402],
      [983,438],
      [1040,444],
      [1085,444]
    ],1080,"inout");

    await flipMiniTrampoline(-14,130);
    pulse(miniTrampoline);

    await moveBall([
      [1085,444],
      [1145,390],
      [1195,315],
      ENDPOINTS.unofficial
    ],720,"out");

    await flipMiniTrampoline(2,180);
  }

  async function goToHome(){
    await moveBall([
      HUB,
      [807,257],
      [820,268],
      [835,280],
      [875,315],
      [915,355],
      [950,402],
      [983,438]
    ],900,"inout");

    await retractMiniTrampoline();
    downPath.classList.add("open");

    await moveBall([
      [983,438],
      [1015,490],
      [1050,550],
      [1090,620],
      [1125,692],
      [1150,706]
    ],900,"in");

    pulse(bigTrampoline);

    await moveBall([
      [1150,706],
      [1170,680],
      [1190,700],
      [1172,746],
      ENDPOINTS.home
    ],620,"out");

    pulse(homeRing);
    downPath.classList.remove("open");
    await restoreMiniTrampoline();
  }


  const TARGETS={
    official:goToOfficialLeft,
    cv:goToCV,
    teaching:goToTeaching,
    history:goToPersonalHistory,
    unofficial:goToUnofficialRight,
    home:goToHome
  };

  async function navigateBall(name){
    if(running || !TARGETS[name]) return;

    if(currentLocation===name){
      setActive(name);
      window.open(LINKS[name],"_blank","noopener,noreferrer");
      return;
    }

    running=true;
    setActive(name);
    clearBallTransform();

    await leaveCurrentToHub();
    await TARGETS[name]();

    currentLocation=name;
    setBall(...ENDPOINTS[name]);
    clearBallTransform();

    window.open(LINKS[name],"_blank","noopener,noreferrer");
    stopAllSounds();
    running=false;
  }

  document.querySelectorAll(".nav").forEach(el=>{
    el.addEventListener("click",()=>{ unlockAudio(); navigateBall(el.dataset.destination); });
  });


  // JELLY TITLE --------------------------------------------------------------
  // Each letter now uses the user-supplied manual glyph cutouts; only the remaining screenshots were color-cleaned. Nearby
  // letters are gently attracted toward the cursor, overshoot, squash/stretch,
  // and then spring back to their exact original positions.
  const titleLetters = Array.from(document.querySelectorAll('#pageTitle .title-letter')).map((el, index) => ({
    el,
    index,
    cx: Number(el.dataset.cx),
    cy: Number(el.dataset.cy),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: 0,
    targetY: 0,
    rot: 0,
    targetRot: 0,
    phase: index * 0.71
  }));

  const titlePointer = {x:-9999, y:-9999, active:false};
  const jellyBoard = document.getElementById('board');

  function clientToSvg(clientX, clientY){
    const pt = jellyBoard.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const matrix = jellyBoard.getScreenCTM();
    if(!matrix) return {x:clientX, y:clientY};
    const svgPt = pt.matrixTransform(matrix.inverse());
    return {x:svgPt.x, y:svgPt.y};
  }

  window.addEventListener('pointermove', e => {
    const p = clientToSvg(e.clientX, e.clientY);
    titlePointer.x = p.x;
    titlePointer.y = p.y;
    titlePointer.active = true;
  }, {passive:true});

  document.documentElement.addEventListener('pointerleave', () => {
    titlePointer.active = false;
  });

  window.addEventListener('blur', () => {
    titlePointer.active = false;
  });

  function animateJellyTitle(time){
    const radius = 245;
    const maxPull = 25;
    const spring = 0.105;
    const damping = 0.79;

    titleLetters.forEach((letter, i) => {
      let tx = 0;
      let ty = 0;
      let tr = 0;

      if(titlePointer.active){
        const dx = titlePointer.x - letter.cx;
        const dy = titlePointer.y - letter.cy;
        const dist = Math.hypot(dx, dy);

        if(dist < radius){
          const proximity = 1 - dist / radius;
          const strength = proximity * proximity * (3 - 2 * proximity);
          const safeDist = Math.max(1, dist);
          const pull = maxPull * strength;

          tx = (dx / safeDist) * pull;
          ty = (dy / safeDist) * pull;

          // A tiny per-letter wobble keeps the reaction organic rather than rigid.
          const wobble = Math.sin(time * 0.006 + letter.phase) * 1.8 * strength;
          tx += wobble;
          ty += Math.cos(time * 0.005 + letter.phase) * 1.2 * strength;
          tr = Math.max(-4.5, Math.min(4.5, dx * 0.018)) * strength;
        }
      }

      letter.targetX = tx;
      letter.targetY = ty;
      letter.targetRot = tr;

      letter.vx += (letter.targetX - letter.x) * spring;
      letter.vy += (letter.targetY - letter.y) * spring;
      letter.vx *= damping;
      letter.vy *= damping;
      letter.x += letter.vx;
      letter.y += letter.vy;
      letter.rot += (letter.targetRot - letter.rot) * 0.12;

      // Jelly squash/stretch follows motion velocity, but stays subtle enough
      // that the lettering remains readable.
      const speed = Math.hypot(letter.vx, letter.vy);
      const stretch = Math.min(0.045, speed * 0.0045);
      const sxJ = 1 + stretch;
      const syJ = 1 - stretch * 0.58;

      letter.el.style.transform =
        `translate(${letter.x.toFixed(2)}px, ${letter.y.toFixed(2)}px) ` +
        `rotate(${letter.rot.toFixed(2)}deg) ` +
        `scale(${sxJ.toFixed(4)}, ${syJ.toFixed(4)})`;
    });

    requestAnimationFrame(animateJellyTitle);
  }

  requestAnimationFrame(animateJellyTitle);

})();
