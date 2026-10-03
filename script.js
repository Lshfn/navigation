(() => {
  const LINKS = {
    history: "history.html",
    cv: "cv.html",
    portfolio: "portfolio.html",
    contacts: "https://dariaivans.neocities.org/contact/contact",
    teaching: "teaching.html",
    homepage: "index.html"
  };

  const HUB = [795, 250];

  const ENDPOINTS = {
    history: [355, 215],
    cv: [795, 250],
    portfolio: [1248, 225],
    contacts: [330, 805],
    teaching: [790, 790],
    homepage: [1148, 782]
  };

  const ball = document.getElementById("ball");
  const launchButton = document.getElementById("launchButton");
  const historyCarrier = document.getElementById("historyCarrier");
  const teleporter = document.getElementById("teleporter");
  const elevatorCab = document.getElementById("elevatorCab");
  const miniTrampoline = document.getElementById("miniTrampoline");
  const downPath = document.getElementById("downPath");
  const bigTrampoline = document.getElementById("bigTrampoline");
  const homeRing = document.getElementById("homeRing");
  const particles = document.getElementById("particles");

  let currentLocation = "start";
  let running = false;
  let elevatorY = 443;

  const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

  function setBall(x, y) {
    ball.setAttribute("cx", x);
    ball.setAttribute("cy", y);
  }

  function setActive(name) {
    document.querySelectorAll(".nav").forEach(el => {
      el.classList.toggle(
        "active",
        el.dataset.destination === name
      );
    });
  }

  function clearBallTransform() {
    ball.style.transform = "";
    ball.style.transformOrigin = "";
    ball.style.opacity = "1";
    ball.style.filter = "";
  }

  function pointOnPolyline(points, t) {
    const lengths = [];
    let total = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1][0] - points[i][0];
      const dy = points[i + 1][1] - points[i][1];
      const length = Math.hypot(dx, dy);

      lengths.push(length);
      total += length;
    }

    let wanted = t * total;

    for (let i = 0; i < lengths.length; i++) {
      if (wanted <= lengths[i]) {
        const u = lengths[i]
          ? wanted / lengths[i]
          : 0;

        return [
          points[i][0] +
            (points[i + 1][0] - points[i][0]) * u,

          points[i][1] +
            (points[i + 1][1] - points[i][1]) * u
        ];
      }

      wanted -= lengths[i];
    }

    return points[points.length - 1];
  }

  function easeValue(t, mode) {
    if (mode === "linear") return t;

    if (mode === "out") {
      return 1 - Math.pow(1 - t, 3);
    }

    if (mode === "in") {
      return t * t;
    }

    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  async function moveBall(
    points,
    duration,
    mode = "inout"
  ) {
    return new Promise(resolve => {
      const start = performance.now();

      function frame(now) {
        const raw = Math.min(
          1,
          (now - start) / duration
        );

        const t = easeValue(raw, mode);
        const point = pointOnPolyline(points, t);

        setBall(point[0], point[1]);

        ball.style.transformOrigin =
          `${point[0]}px ${point[1]}px`;

        ball.style.transform =
          `rotate(${t * 900}deg)`;

        if (raw < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  async function moveBallSwimming(
    points,
    duration
  ) {
    return new Promise(resolve => {
      const start = performance.now();

      function frame(now) {
        const raw = Math.min(
          1,
          (now - start) / duration
        );

        const t = easeValue(raw, "inout");

        const point =
          pointOnPolyline(points, t);

        const nextPoint =
          pointOnPolyline(
            points,
            Math.min(1, t + 0.008)
          );

        let dx = nextPoint[0] - point[0];
        let dy = nextPoint[1] - point[1];

        const length =
          Math.hypot(dx, dy) || 1;

        dx /= length;
        dy /= length;

        const nx = -dy;
        const ny = dx;

        const bob =
          Math.sin(t * Math.PI * 12) * 6;

        const x = point[0] + nx * bob;
        const y = point[1] + ny * bob;

        setBall(x, y);

        ball.style.transformOrigin =
          `${x}px ${y}px`;

        ball.style.transform =
          `rotate(${t * 1100}deg)`;

        if (raw < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  function pulse(el) {
    const base =
      el.getAttribute("transform") || "";

    el.animate(
      [
        {
          transform: base,
          opacity: 1
        },
        {
          transform: `${base} scale(1.1)`,
          opacity: 0.78
        },
        {
          transform: base,
          opacity: 1
        }
      ],
      {
        duration: 360,
        iterations: 2,
        transformOrigin: "center",
        transformBox: "fill-box"
      }
    );
  }

  async function pressLauncher() {
    launchButton.setAttribute(
      "transform",
      "translate(0 10)"
    );

    await sleep(100);

    launchButton.setAttribute(
      "transform",
      "translate(0 0)"
    );

    await sleep(70);
  }

  async function animateElementTransform(
    el,
    from,
    to,
    duration
  ) {
    return new Promise(resolve => {
      const start = performance.now();

      function frame(now) {
        let t = Math.min(
          1,
          (now - start) / duration
        );

        t = t * t * (3 - 2 * t);

        const x =
          from.x + (to.x - from.x) * t;

        const y =
          from.y + (to.y - from.y) * t;

        const r =
          (from.r || 0) +
          ((to.r || 0) - (from.r || 0)) * t;

        const sx =
          (from.sx || 1) +
          ((to.sx || 1) - (from.sx || 1)) * t;

        const sy =
          (from.sy || 1) +
          ((to.sy || 1) - (from.sy || 1)) * t;

        el.setAttribute(
          "transform",
          `translate(${x} ${y}) rotate(${r}) scale(${sx} ${sy})`
        );

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  async function carryWithHistoryRing(
    from,
    to,
    duration
  ) {
    const base = [495, 420];

    await animateElementTransform(
      historyCarrier,
      {
        x: base[0],
        y: base[1],
        r: 0
      },
      {
        x: from[0],
        y: from[1],
        r: 0
      },
      420
    );

    await new Promise(resolve => {
      const start = performance.now();

      function frame(now) {
        let t = Math.min(
          1,
          (now - start) / duration
        );

        t = easeValue(t, "inout");

        const arch =
          Math.sin(t * Math.PI) * -55;

        const x =
          from[0] +
          (to[0] - from[0]) * t;

        const y =
          from[1] +
          (to[1] - from[1]) * t +
          arch;

        historyCarrier.setAttribute(
          "transform",
          `translate(${x} ${y})`
        );

        setBall(x, y);

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });

    await animateElementTransform(
      historyCarrier,
      {
        x: to[0],
        y: to[1],
        r: 0
      },
      {
        x: base[0],
        y: base[1],
        r: 0
      },
      520
    );
  }

  function createParticles(
    x,
    y,
    count,
    colorA,
    colorB
  ) {
    const ns =
      "http://www.w3.org/2000/svg";

    const created = [];

    for (let i = 0; i < count; i++) {
      const circle =
        document.createElementNS(
          ns,
          "circle"
        );

      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);

      circle.setAttribute(
        "r",
        (2 + Math.random() * 4).toFixed(1)
      );

      circle.setAttribute(
        "fill",
        Math.random() > 0.5
          ? colorA
          : colorB
      );

      circle.setAttribute(
        "opacity",
        "1"
      );

      particles.appendChild(circle);
      created.push(circle);
    }

    return created;
  }

  async function dissolveTeleport(
    from,
    to
  ) {
    setBall(from[0], from[1]);
    pulse(teleporter);

    const outgoing =
      createParticles(
        from[0],
        from[1],
        18,
        "#6f24f2",
        "#32d8d5"
      );

    outgoing.forEach((particle, i) => {
      const angle =
        Math.PI * 2 * i /
          outgoing.length +
        Math.random() * 0.3;

      const distance =
        25 + Math.random() * 45;

      const dx =
        Math.cos(angle) * distance;

      const dy =
        Math.sin(angle) * distance;

      particle.animate(
        [
          {
            transform:
              "translate(0 0)",
            opacity: 1
          },
          {
            transform:
              `translate(${dx}px ${dy}px)`,
            opacity: 0
          }
        ],
        {
          duration:
            360 + Math.random() * 180,
          fill: "forwards"
        }
      );
    });

    ball.animate(
      [
        {
          opacity: 1,
          transform: "scale(1)",
          filter: "blur(0px)"
        },
        {
          opacity: 0.1,
          transform: "scale(.2)",
          filter: "blur(7px)"
        }
      ],
      {
        duration: 390,
        fill: "forwards",
        transformOrigin: "center",
        transformBox: "fill-box"
      }
    );

    await sleep(410);

    ball.style.opacity = "0";

    outgoing.forEach(
      particle => particle.remove()
    );

    setBall(to[0], to[1]);

    const incoming =
      createParticles(
        to[0],
        to[1],
        18,
        "#6f24f2",
        "#32d8d5"
      );

    incoming.forEach((particle, i) => {
      const angle =
        Math.PI * 2 * i /
          incoming.length +
        Math.random() * 0.3;

      const distance =
        25 + Math.random() * 45;

      const dx =
        Math.cos(angle) * distance;

      const dy =
        Math.sin(angle) * distance;

      particle.animate(
        [
          {
            transform:
              `translate(${dx}px ${dy}px)`,
            opacity: 0
          },
          {
            transform:
              "translate(0 0)",
            opacity: 1
          },
          {
            transform:
              "translate(0 0)",
            opacity: 0
          }
        ],
        {
          duration:
            460 + Math.random() * 160,
          fill: "forwards"
        }
      );
    });

    ball.style.opacity = "1";

    ball.animate(
      [
        {
          opacity: 0.1,
          transform: "scale(.2)",
          filter: "blur(7px)"
        },
        {
          opacity: 1,
          transform: "scale(1)",
          filter: "blur(0px)"
        }
      ],
      {
        duration: 430,
        fill: "forwards",
        transformOrigin: "center",
        transformBox: "fill-box"
      }
    );

    await sleep(460);

    incoming.forEach(
      particle => particle.remove()
    );

    clearBallTransform();
  }

  async function moveElevator(toY) {
    return new Promise(resolve => {
      const from = elevatorY;
      const start = performance.now();

      function frame(now) {
        let t = Math.min(
          1,
          (now - start) / 900
        );

        t = t * t * (3 - 2 * t);

        const y =
          from + (toY - from) * t;

        elevatorCab.setAttribute(
          "transform",
          `translate(790 ${y})`
        );

        setBall(790, y);

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          elevatorY = toY;
          resolve();
        }
      }

      requestAnimationFrame(frame);
    });
  }

  async function flipMiniTrampoline(
    angle,
    duration = 190
  ) {
    return animateElementTransform(
      miniTrampoline,
      {
        x: 1085,
        y: 444,
        r: 2
      },
      {
        x: 1085,
        y: 444,
        r: angle
      },
      duration
    );
  }

  async function retractMiniTrampoline() {
    return animateElementTransform(
      miniTrampoline,
      {
        x: 1085,
        y: 444,
        r: 2
      },
      {
        x: 1180,
        y: 410,
        r: -62
      },
      320
    );
  }

  async function restoreMiniTrampoline() {
    return animateElementTransform(
      miniTrampoline,
      {
        x: 1180,
        y: 410,
        r: -62
      },
      {
        x: 1085,
        y: 444,
        r: 2
      },
      330
    );
  }

  async function leaveCurrentToHub() {
    if (currentLocation === "start") {
      await pressLauncher();

      await moveBall(
        [
          [795, 130],
          [795, 185],
          HUB
        ],
        520,
        "out"
      );

      currentLocation = "cv";
      return;
    }

    if (currentLocation === "cv") {
      setBall(HUB[0], HUB[1]);
      return;
    }

    if (
      currentLocation === "history"
    ) {
      await carryWithHistoryRing(
        ENDPOINTS.history,
        HUB,
        1050
      );

      setBall(HUB[0], HUB[1]);
      return;
    }

    if (
      currentLocation === "contacts"
    ) {
      await dissolveTeleport(
        ENDPOINTS.contacts,
        HUB
      );

      return;
    }

    if (
      currentLocation === "teaching"
    ) {
      setBall(790, elevatorY);

      await moveElevator(443);

      await moveBall(
        [
          [790, 443],
          [790, 360],
          [795, 300],
          HUB
        ],
        620,
        "out"
      );

      return;
    }

    if (
      currentLocation === "portfolio"
    ) {
      await moveBall(
        [
          ENDPOINTS.portfolio,
          [1215, 280],
          [1175, 345],
          [1110, 420],
          [1085, 444]
        ],
        780,
        "in"
      );

      await flipMiniTrampoline(
        -13,
        120
      );

      pulse(miniTrampoline);

      await moveBall(
        [
          [1085, 444],
          [1030, 365],
          [930, 295],
          [845, 250],
          HUB
        ],
        820,
        "out"
      );

      await flipMiniTrampoline(
        2,
        170
      );

      return;
    }

    if (
      currentLocation === "homepage"
    ) {
      await moveBall(
        [
          ENDPOINTS.homepage,
          [1160, 748],
          [1185, 720],
          [1215, 695]
        ],
        440,
        "in"
      );

      pulse(bigTrampoline);

      await moveBall(
        [
          [1215, 695],
          [1170, 565],
          [1095, 455],
          [995, 350],
          [900, 285],
          HUB
        ],
        1100,
        "out"
      );

      return;
    }
  }

  async function goToHistory() {
    await moveBall(
      [
        HUB,
        [760, 248],
        [705, 240],
        [665, 274],
        [620, 310],
        [575, 348],
        [545, 372],
        [515, 405],
        [495, 420]
      ],
      900,
      "inout"
    );

    pulse(historyCarrier);

    await carryWithHistoryRing(
      [495, 420],
      ENDPOINTS.history,
      1050
    );

    setBall(...ENDPOINTS.history);
  }

  async function goToCV() {
    await moveBall(
      [
        HUB,
        ENDPOINTS.cv
      ],
      240,
      "out"
    );
  }

  async function goToContacts() {
    await moveBall(
      [
        HUB,
        [760, 320],
        [715, 392]
      ],
      500,
      "inout"
    );

    await moveBallSwimming(
      [
        [715, 392],
        [690, 425],
        [670, 466],
        [635, 487],
        [607, 526],
        [582, 558],
        [557, 596],
        [530, 620],
        [502, 662],
        [470, 668],
        [438, 660],
        [414, 674],
        [380, 695],
        [340, 704],
        [300, 698],
        [270, 691],
        [255, 688]
      ],
      1800
    );

    await dissolveTeleport(
      [255, 688],
      ENDPOINTS.contacts
    );
  }

  async function goToTeaching() {
    if (elevatorY !== 443) {
      elevatorCab.setAttribute(
        "transform",
        "translate(790 443)"
      );

      elevatorY = 443;
    }

    await moveBall(
      [
        HUB,
        [793, 310],
        [790, 390],
        [790, 443]
      ],
      650,
      "inout"
    );

    pulse(elevatorCab);

    await moveElevator(748);

    await moveBall(
      [
        [790, 748],
        ENDPOINTS.teaching
      ],
      280,
      "out"
    );
  }

  async function goToPortfolio() {
    await moveBall(
      [
        HUB,
        [810, 262],
        [850, 300],
        [900, 350],
        [945, 400],
        [983, 438],
        [1040, 444],
        [1085, 444]
      ],
      1050,
      "inout"
    );

    await flipMiniTrampoline(
      -14,
      130
    );

    pulse(miniTrampoline);

    await moveBall(
      [
        [1085, 444],
        [1145, 390],
        [1195, 315],
        ENDPOINTS.portfolio
      ],
      720,
      "out"
    );

    await flipMiniTrampoline(
      2,
      180
    );
  }

  async function goToHomepage() {
    await moveBall(
      [
        HUB,
        [810, 262],
        [850, 300],
        [900, 350],
        [945, 400],
        [983, 438]
      ],
      880,
      "inout"
    );

    await retractMiniTrampoline();

    downPath.classList.add("open");

    await moveBall(
      [
        [983, 438],
        [1015, 490],
        [1050, 550],
        [1090, 620],
        [1125, 692],
        [1150, 706]
      ],
      900,
      "in"
    );

    pulse(bigTrampoline);

    await moveBall(
      [
        [1150, 706],
        [1170, 680],
        [1190, 700],
        [1172, 746],
        ENDPOINTS.homepage
      ],
      620,
      "out"
    );

    pulse(homeRing);

    downPath.classList.remove("open");

    await restoreMiniTrampoline();
  }

  const TARGETS = {
    history: goToHistory,
    cv: goToCV,
    portfolio: goToPortfolio,
    contacts: goToContacts,
    teaching: goToTeaching,
    homepage: goToHomepage
  };

  async function navigateBall(name) {
    if (
      running ||
      !TARGETS[name]
    ) {
      return;
    }

    if (
      currentLocation === name
    ) {
      setActive(name);

      window.open(
        LINKS[name],
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    running = true;

    setActive(name);
    clearBallTransform();

    await leaveCurrentToHub();
    await TARGETS[name]();

    currentLocation = name;

    setBall(
      ...ENDPOINTS[name]
    );

    clearBallTransform();

    window.open(
      LINKS[name],
      "_blank",
      "noopener,noreferrer"
    );

    running = false;
  }

  /*
    Keep the ball above the other SVG
    elements, including inside the
    vertical history tube.
  */

  if (ball && ball.parentNode) {
    ball.parentNode.appendChild(ball);

    const keepBallVisible = () => {
      const x = Number(
        ball.getAttribute("cx")
      );

      const y = Number(
        ball.getAttribute("cy")
      );

      const inHistoryTube =
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Math.abs(x - 790) <= 18 &&
        y >= 378 &&
        y <= 800;

      if (inHistoryTube) {
        ball.style.transform = "none";
        ball.style.transformOrigin =
          "center";
        ball.style.opacity = "1";
        ball.style.filter = "";
      }
    };

    const observer =
      new MutationObserver(
        keepBallVisible
      );

    observer.observe(
      ball,
      {
        attributes: true,
        attributeFilter: [
          "cx",
          "cy"
        ]
      }
    );

    keepBallVisible();
  }

  document
    .querySelectorAll(".nav")
    .forEach(el => {
      el.addEventListener(
        "click",
        () => {
          navigateBall(
            el.dataset.destination
          );
        }
      );
    });
})();
