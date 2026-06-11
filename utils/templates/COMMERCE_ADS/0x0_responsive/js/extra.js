// ─── Clicks ──────────────────────────────────────────────────────────────────
// Called automatically from banner.js — do not call initClicks() manually.

// data-action → click tag var + event name (eventName defaults to tagVar)
var CLICK_MAP = [
  { action: "default-click", tagVar: "clickTag", eventName: "defaultClickTag" },
  { action: "special-offer-1", tagVar: "clickSpecialOffer1Tag" },
  { action: "special-offer-2", tagVar: "clickSpecialOffer2Tag" },
  { action: "special-offer-3", tagVar: "clickSpecialOffer3Tag" },
];

function initClicks() {
  CLICK_MAP.forEach(function (item) {
    var eventName = item.eventName || item.tagVar;
    document
      .querySelectorAll('[data-action="' + item.action + '"]')
      .forEach(function (el) {
        RtbhEnabler.addClickEvent(el, function () {
          RtbhEnabler.open(window[item.tagVar], eventName);
        });
      });
  });
}

// ─── Animation ───────────────────────────────────────────────────────────────
// Called automatically from banner.js — do not call extraInit() manually.

function extraInit() {
  const tl = gsap.timeline({
    defaults: {
      ease: "power2.inOut",
      duration: 0.6,
    },
  });

  tl.from(
    ".banner__btn",
    {
      x: -20,
      opacity: 0,
      stagger: 0.2,
      onComplete: () => {
        changeBtn();
      },
    },
    "-=0.4",
  );
}

// auto change active class in buttons
function changeBtn() {
  const btns = document.querySelectorAll(".banner__btn");
  const banner = document.querySelector("body");
  if (btns.length === 0) return;

  let index = 0;
  let interval;

  const setActive = (i) => {
    btns.forEach((btn) => btn.classList.remove("active"));
    btns[i].classList.add("active");
  };

  const startInterval = () => {
    clearInterval(interval);
    interval = setInterval(() => {
      index = (index + 1) % btns.length;
      setActive(index);
    }, 1500);
  };

  setActive(index);
  startInterval();

  if (banner) {
    banner.addEventListener("mouseenter", () => {
      clearInterval(interval);
      btns.forEach((btn) => btn.classList.remove("active"));
    });

    banner.addEventListener("mouseleave", () => {
      setActive(index);
      startInterval();
    });
  }
}
