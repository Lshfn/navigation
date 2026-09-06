(() => {
  "use strict";

  /*
    Navigation patch for https://github.com/Lshfn/navigation

    Visual remapping requested:
      - upper-right "unofficial portfolio" -> "teaching" (violet)
      - lower-left "teaching" -> "contacts" (blue)
      - "back to the homepage" -> "homepage"

    The original route geometry is intentionally preserved:
      - the upper-right ramp now functions as Teaching
      - the lower-left blue route now functions as Contacts

    It also keeps the moving ball visible while it travels through
    the vertical Personal History tube/elevator.
  */

  const CONTACTS_URL = "https://dariaivans.neocities.org/contact/contact";
  const OLD_UNOFFICIAL_URL = "https://dariaivans.hotglue.me/?projects";
  const TEACHING_URL = "teaching.html";

  function navText(destination) {
    return document.querySelector(`.nav[data-destination="${destination}"] text`);
  }

  // --- labels / colours ------------------------------------------------------

  // Upper-right route: keep its original route id internally so the existing
  // right-ramp animation continues to work, but present it as "teaching".
  const upperRight = navText("unofficial");
  if (upperRight) {
    upperRight.textContent = "teaching";
    upperRight.setAttribute("fill", "var(--violet)");
  }

  // Lower-left blue route becomes Contacts.
  const lowerLeft = navText("teaching");
  if (lowerLeft) {
    lowerLeft.textContent = "contacts";
    lowerLeft.setAttribute("fill", "var(--blue)");

    // Keep exactly the same typeface as the other navigation labels.
    lowerLeft.style.fontFamily = '"Portfolio566", Arial, Helvetica, sans-serif';
    lowerLeft.style.fontWeight = "400";
  }

  // Match the wording in the reference screenshot.
  const home = navText("home");
  if (home) {
    home.textContent = "homepage";
  }

  // --- destination remapping ------------------------------------------------
  //
  // The original script has its route functions in a private IIFE.
  // Keeping the original data-destination values preserves the animations.
  // We only replace the URL opened at the end of those animations:
  //
  // original "unofficial" (upper-right route) -> teaching.html
  // original "teaching"   (lower-left route)  -> contacts page

  const nativeOpen = window.open.bind(window);

  window.open = function (url, target, features) {
    let mapped = url;

    if (typeof mapped === "string") {
      if (mapped === OLD_UNOFFICIAL_URL) {
        mapped = TEACHING_URL;
      } else if (
        mapped === TEACHING_URL ||
        mapped.endsWith("/teaching.html")
      ) {
        mapped = CONTACTS_URL;
      }
    }

    return nativeOpen(mapped, target, features);
  };

  // --- keep the ball visible in the Personal History tube -------------------
  //
  // moveBall() leaves a CSS rotation on #ball. During elevator movement the
  // circle's cx/cy then change while that old transform-origin can remain,
  // which can make the ball visually orbit away from the tube. Clear the
  // residual transform whenever the ball is in the vertical history corridor.

  const ball = document.getElementById("ball");

  if (ball) {
    // Keep it as the topmost SVG child inside the scene.
    if (ball.parentNode) ball.parentNode.appendChild(ball);

    const keepBallInTube = () => {
      const x = Number(ball.getAttribute("cx"));
      const y = Number(ball.getAttribute("cy"));

      const inHistoryTube =
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Math.abs(x - 790) <= 18 &&
        y >= 378 &&
        y <= 800;

      if (inHistoryTube) {
        ball.style.transform = "none";
        ball.style.transformOrigin = "center";
        ball.style.opacity = "1";
        ball.style.filter = "";
      }
    };

    const observer = new MutationObserver(keepBallInTube);
    observer.observe(ball, {
      attributes: true,
      attributeFilter: ["cx", "cy"]
    });

    keepBallInTube();
  }
})();
