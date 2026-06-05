// ─── Clicks ──────────────────────────────────────────────────────────────────
// Called automatically from banner.js — do not call initClicks() manually.

// data-action → click tag var + event name (eventName defaults to tagVar)
var CLICK_MAP = [
  { action: 'default-click',   tagVar: 'clickTag',             eventName: 'defaultClickTag' },
  { action: 'special-offer-1', tagVar: 'clickSpecialOffer1Tag' },
  { action: 'special-offer-2', tagVar: 'clickSpecialOffer2Tag' },
  { action: 'special-offer-3', tagVar: 'clickSpecialOffer3Tag' },
];

function initClicks() {
  CLICK_MAP.forEach(function (item) {
    var eventName = item.eventName || item.tagVar;
    document.querySelectorAll('[data-action="' + item.action + '"]').forEach(function (el) {
      RtbhEnabler.addClickEvent(el, function () {
        RtbhEnabler.open(window[item.tagVar], eventName);
      });
    });
  });
}

// ─── Animation ───────────────────────────────────────────────────────────────
// Called automatically from banner.js — do not call extraInit() manually.

function extraInit() {}
