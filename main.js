// ====== NAVMENU ======
const btn = document.querySelector(".topbar .menu-toggle");
const sheet = document.getElementById("sheet");
let menuOpen = false;

function setMenu(open) {
  menuOpen = open;
  if (btn) {
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "close menu" : "open menu");
  }
  if (sheet) {
    sheet.setAttribute("aria-hidden", String(!open));
    sheet.classList.toggle("is-open", open);
  }
}
btn?.addEventListener("click", () => setMenu(!menuOpen));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menuOpen) setMenu(false);
});
document.addEventListener("click", (e) => {
  if (!menuOpen) return;
  const within = e.target.closest("#sheet, .menu-toggle");
  if (!within) setMenu(false);
});
document.querySelector(".sheet-nav")?.addEventListener("click", (e) => {
  if (e.target.closest("a")) setMenu(false);
});

// ====== PANELS (hero slideshow) ======
const panels = Array.from(document.querySelectorAll(".panel"));
const HAS_PANELS = panels.length > 0;
let index = 0;
let busy = false;
const TRANSITION_MS = 700;

// sections for scroll logic
const heroSection = document.getElementById("hero");
const landing = document.getElementById("landing-hero");

let heroActive = false;
let landingActive = false;

// Observe dominant section in viewport
const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.target === heroSection) {
        heroActive = entry.isIntersecting && entry.intersectionRatio > 0.6;
        // lock body scroll when hero is active
        document.body.style.overflow = heroActive ? "hidden" : "";
      }
      if (entry.target === landing) {
        landingActive = entry.isIntersecting && entry.intersectionRatio > 0.6;
      }
    }
  },
  { threshold: [0, 0.6, 1] }
);
if (heroSection) io.observe(heroSection);
if (landing) io.observe(landing);

if (HAS_PANELS) {
  function controlVideos() {
    panels.forEach((p, i) => {
      const v = p.dataset.type === "video" ? p.querySelector("video") : null;
      if (!v) return;
      try {
        i === index ? v.play() : v.pause();
      } catch {}
    });
  }

  function syncUI() {
    panels.forEach((p, i) => {
      const active = i === index;
      p.classList.toggle("active", active);
      p.setAttribute("aria-hidden", active ? "false" : "true");
    });
    controlVideos();
  }

  function goTo(i) {
    if (busy) return;
    const len = panels.length;
    const target = ((i % len) + len) % len;
    if (target === index) return;
    busy = true;
    index = target;
    syncUI();
    setTimeout(() => (busy = false), TRANSITION_MS);
  }
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // autoplay (optional)
  setInterval(() => {
    if (menuOpen || busy) return;
    goTo(index + 1);
  }, 5000);

  syncUI();

  // pause video on tab hide
  document.addEventListener("visibilitychange", () => {
    const p = panels[index];
    if (!p) return;
    const v = p.dataset.type === "video" ? p.querySelector("video") : null;
    if (!v) return;
    try {
      document.hidden ? v.pause() : v.play();
    } catch {}
  });

  // Arrow button to scroll into hero section
  document.getElementById("to-loop")?.addEventListener("click", () => {
    heroSection?.scrollIntoView({ behavior: "smooth" });
  });

  // Disable page scroll; use wheel only to change panels
  window.addEventListener(
    "wheel",
    (e) => {
      if (menuOpen || busy) return;

      if (landingActive && e.deltaY > 0 && heroSection) {
        e.preventDefault();
        heroSection.scrollIntoView({ behavior: "smooth" });
        return;
      }

      if (heroActive) {
        e.preventDefault();
        if (Math.abs(e.deltaY) < 12) return;
        e.deltaY > 0 ? next() : prev();
      }
    },
    { passive: false }
  );

  // Arrow keys
  window.addEventListener("keydown", (e) => {
    if (menuOpen || busy) return;
    const downKeys = ["ArrowDown", "PageDown", " "];
    const upKeys = ["ArrowUp", "PageUp"];

    if (landingActive && downKeys.includes(e.key) && heroSection) {
      e.preventDefault();
      heroSection.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (heroActive) {
      e.preventDefault();
      if (downKeys.includes(e.key)) next();
      if (upKeys.includes(e.key)) prev();
    }
  });

  // Touch gestures
  let touchStartY = null;
  heroSection?.addEventListener(
    "touchstart",
    (e) => (touchStartY = e.touches[0].clientY),
    { passive: true }
  );

  heroSection?.addEventListener(
    "touchmove",
    (e) => {
      if (!heroActive || touchStartY == null) return;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dy) < 18) return;
      e.preventDefault();
      dy < 0 ? next() : prev();
      touchStartY = e.touches[0].clientY;
    },
    { passive: false }
  );
}

// Back to top button
document.getElementById("to-top")?.addEventListener("click", () => {
  document
    .getElementById("landing-hero")
    ?.scrollIntoView({ behavior: "smooth" });
});

// Works on Home and Services
(() => {
  const btn = document.getElementById("to-loop");
  if (!btn) return;

  const target =
    document.getElementById("hero") || // Home
    document.getElementById("services-main") || // Services main wrapper
    document.getElementById("stage-01") || // First stage (optional fallback)
    document.querySelector("[data-services-root]") ||
    document.body;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();

// PROJECTS
(() => {
  const track = document.querySelector(".page-hscroll .h-track");
  if (!track || typeof gsap === "undefined") return;

  gsap.registerPlugin(ScrollToPlugin);

  // ---- Tunables ----
  const SPEED = 2.6; // wheel multiplier
  const KICK = 140; // extra px per wheel flick
  const MOMENTUM = 950; // drag inertia scale
  const GLIDE_DUR = 0.42; // default tween duration
  const EASE = "power2.out";

  // Reveal window (as % of visible width where the image finishes sliding in)
  const REVEAL_START = 0.65; // tile's left hits 65% of viewport
  const REVEAL_END = 0.92; // ...to 92% of viewport

  // Image transform range
  const IMG_START_X = -25; // xPercent at start (shifted left)
  const IMG_END_X = 0; // xPercent at end
  const IMG_START_S = 1.06; // slight zoom in
  const IMG_END_S = 1.0;

  /* ------- Wait for images so sizes are stable ------- */
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  async function waitImages(container) {
    const imgs = qsa("img", container);
    await Promise.all(
      imgs.map((img) => {
        if (img.complete)
          return img.decode?.().catch(() => {}) || Promise.resolve();
        return new Promise((res) => {
          img.addEventListener(
            "load",
            () => (img.decode?.().catch(() => {}), res()),
            { once: true }
          );
          img.addEventListener("error", () => res(), { once: true });
        });
      })
    );
  }

  (async () => {
    const originals = qsa(".tile", track);
    if (!originals.length) return;

    await waitImages(track);

    /* ------- Build loop: [A][A][A] ------- */
    const pre = document.createDocumentFragment();
    const post = document.createDocumentFragment();
    originals.forEach((t) => {
      pre.appendChild(t.cloneNode(true));
      post.appendChild(t.cloneNode(true));
    });
    track.insertBefore(pre, track.firstChild);
    track.appendChild(post);

    let RUN = 0; // width of one run (A)
    let logicalOffset = 0; // keeps logical scroll growing across warps

    requestAnimationFrame(() => {
      RUN = track.scrollWidth / 3;
      track.scrollLeft = RUN; // start in the middle copy
      baseX = track.scrollLeft + logicalOffset; // init title baseline
      initReveal(); // set initial img transforms
      updateReveal(); // sync once
      updateTitle(); // position title once
    });

    /* ------- Warp to keep us in the middle ------- */
    function warpIfNeeded() {
      if (!RUN) return;
      const x = track.scrollLeft;
      if (x < RUN * 0.5) {
        // jumped left → add RUN
        track.scrollLeft = x + RUN;
        logicalOffset -= RUN;
      } else if (x > RUN * 1.5) {
        // jumped right → subtract RUN
        track.scrollLeft = x - RUN;
        logicalOffset += RUN;
      }
    }
    track.addEventListener("scroll", warpIfNeeded, { passive: true });

    /* ------- GSAP helpers ------- */
    let anim;
    const clampX = gsap.utils.clamp(
      0,
      () => track.scrollWidth - track.clientWidth
    );
    function toX(dest, dur = GLIDE_DUR, ease = EASE, onComplete) {
      if (anim) anim.kill();
      anim = gsap.to(track, {
        scrollTo: { x: clampX(dest), autoKill: true },
        duration: dur,
        ease,
        overwrite: true,
        onComplete,
      });
    }

    /* ------- Wheel → horizontal (snappy & smooth) ------- */
    track.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // ignore sideways trackpads
        e.preventDefault();
        const sign = Math.sign(e.deltaY || 1);
        const target = track.scrollLeft + e.deltaY * SPEED + sign * KICK;
        toX(target);
      },
      { passive: false }
    );

    /* ------- Drag with inertia ------- */
    let isDown = false,
      startX = 0,
      startLeft = 0,
      lastX = 0,
      lastT = 0,
      vx = 0;
    track.addEventListener("pointerdown", (e) => {
      isDown = true;
      track.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startLeft = track.scrollLeft;
      lastX = startX;
      lastT = performance.now();
      vx = 0;
      anim?.kill();
    });
    track.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dt = now - lastT || 16;
      vx = dx / dt; // px per ms
      track.scrollLeft = clampX(startLeft - (e.clientX - startX));
      lastX = e.clientX;
      lastT = now;
    });
    track.addEventListener("pointerup", () => {
      if (!isDown) return;
      isDown = false;
      const momentum = -vx * MOMENTUM;
      const dest = clampX(track.scrollLeft + momentum);
      toX(dest, 0.33, "power2.out", () => snapToNearest());
    });

    /* ------- Snap to nearest tile edge (variable widths) ------- */
    function snapToNearest() {
      const trackRect = track.getBoundingClientRect();
      let best = null,
        bestDist = Infinity;
      Array.from(track.querySelectorAll(".tile")).forEach((t) => {
        const r = t.getBoundingClientRect();
        const dist = Math.abs(r.left - trackRect.left); // align left edge
        if (dist < bestDist) {
          bestDist = dist;
          best = t;
        }
      });
      if (best) {
        const r = best.getBoundingClientRect();
        const delta = r.left - trackRect.left;
        toX(track.scrollLeft + delta, 0.32, "power2.out");
      }
    }
    window.addEventListener("resize", () => {
      snapToNearest();
      updateReveal();
    });

    /* ------- Mark active (subtle scale) ------- */
    const tilesAll = Array.from(track.querySelectorAll(".tile"));
    function markActive() {
      const center = track.scrollLeft + track.clientWidth / 2;
      let best = tilesAll[0],
        bestDist = Infinity;
      tilesAll.forEach((t) => {
        const rect = t.getBoundingClientRect();
        const tileCenter =
          rect.left +
          rect.width / 2 +
          track.scrollLeft -
          track.getBoundingClientRect().left;
        const d = Math.abs(center - tileCenter);
        if (d < bestDist) {
          bestDist = d;
          best = t;
        }
      });
      tilesAll.forEach((t) => t.classList.toggle("is-active", t === best));
    }
    track.addEventListener("scroll", markActive, { passive: true });
    markActive();

    /* ------- Reveal-on-approach (slide image in) ------- */
    const trackRect = () => track.getBoundingClientRect();
    const imgSetters = tilesAll.map((t) => {
      const img = t.querySelector("img");
      return {
        setX: gsap.quickSetter(img, "xPercent"),
        setS: gsap.quickSetter(img, "scale"),
        img,
      };
    });

    function initReveal() {
      imgSetters.forEach(({ setX, setS }) => {
        setX(-25);
        setS(1.06);
      });
    }

    function updateReveal() {
      const tr = trackRect();
      const startX = tr.left + tr.width * 0.65;
      const endX = tr.left + tr.width * 0.92;
      const span = Math.max(8, endX - startX);

      tilesAll.forEach((tile, i) => {
        const r = tile.getBoundingClientRect();
        const left = r.left;
        let p = (left - startX) / span;
        p = Math.max(0, Math.min(1, p));

        const x = -25 + (0 - -25) * p;
        const s = 1.06 + (1.0 - 1.06) * p;

        const { setX, setS } = imgSetters[i];
        setX(x);
        setS(s);
      });
    }

    track.addEventListener("scroll", updateReveal, { passive: true });

    const projectTitle = document.querySelector(".page-hscroll .project-title");
    const title = projectTitle?.querySelector("h1");
    let baseX = null;
    let titleGone = false;

    function updateTitle() {
      if (!title || titleGone || baseX == null) return;
      const logicalX = track.scrollLeft + logicalOffset;
      const progress = Math.max(0, logicalX - baseX);
      gsap.set(title, { x: -progress });
      const leftPad =
        parseFloat(getComputedStyle(projectTitle).paddingLeft) || 0;
      const offThreshold = title.offsetWidth + leftPad * 2;
      if (progress > offThreshold) {
        titleGone = true;
        projectTitle.classList.add("gone");
        gsap.set(title, { clearProps: "transform" });
        track.removeEventListener("scroll", updateTitle);
      }
    }

    track.addEventListener("scroll", updateTitle, { passive: true });
  })();
})();

// SERVICES
(() => {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
    return;
  gsap.registerPlugin(ScrollTrigger);

  const items = gsap.utils.toArray("[data-speed]");
  if (!items.length) return;

  items.forEach((el) => {
    const speed = parseFloat(el.getAttribute("data-speed")) || -0.3; //
    gsap.fromTo(
      el,
      { yPercent: () => -100 * speed },
      {
        yPercent: () => 100 * speed,
        ease: "none",
        overwrite: "auto",
        scrollTrigger: {
          trigger: el.closest(".services-stage") || el,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      }
    );
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
})();

// ABOUT
(() => {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
    return;

  gsap.registerPlugin(ScrollTrigger);

  const video = document.querySelector(".tv__video");
  if (!video) return;

  gsap.fromTo(
    video,
    {
      width: "30%", // starting size
      scale: 1,
    },
    {
      width: "100%",
      scale: 1.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".text-video",
        start: "top top",
        end: "center top",
        scrub: true,
        pin: false,
      },
    }
  );
})();

// ABOUT – Our Culture reveal
(() => {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
    return;
  gsap.registerPlugin(ScrollTrigger);

  const rows = document.querySelectorAll(".about-culture .ac-col");
  if (!rows.length) return;

  rows.forEach((el, i) => {
    gsap.from(el, {
      autoAlpha: 0,
      y: 24,
      ease: "power2.out",
      duration: 0.6,
      delay: i * 0.05,
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    });
  });
})();

// AIVIO hero video expands to 90% and hides text under it
(() => {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
    return;
  gsap.registerPlugin(ScrollTrigger);

  const hero = document.querySelector(".hero");
  const video = document.querySelector(".hero__video");
  if (!hero || !video) return;

  gsap.fromTo(
    video,
    { width: "30%", scale: 1 },
    {
      width: "90vw", // expand to 90% of viewport
      // scale: 1.1,
      ease: "power2.out",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    }
  );
})();

(() => {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
    return;
  gsap.registerPlugin(ScrollTrigger);

  const words = document.querySelectorAll(".scroll-text h2 span");
  if (!words.length) return;

  words.forEach((word) => {
    gsap.fromTo(
      word,
      { opacity: 0.2, y: 20 }, // start faded & slightly lower
      {
        opacity: 1,
        y: 0, // rise up into place
        ease: "power2.out",
        scrollTrigger: {
          trigger: word,
          start: "top 85%", // starts entering
          end: "top 60%", // fully visible
          scrub: true,
        },
      }
    );
  });
})();

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    // deactivate tabs
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-pane")
      .forEach((p) => p.classList.remove("active"));

    // activate clicked tab
    btn.classList.add("active");
    const tabId = btn.getAttribute("data-tab");
    document.getElementById(tabId).classList.add("active");
  });
});
