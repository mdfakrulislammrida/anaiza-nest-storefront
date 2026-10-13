// The brand signature probe. It checks one rendered page against the kit's rules for the shop's signature
// visuals: one pour line, one seal, burgundy once, no shadows or gradients outside the allowed places, nothing
// overlapping, no sideways scroll, decorative marks hidden from screen readers, the gift frame at 4%.
//
// Two ways to use it (see docs/signature-checks.md):
//   - In a browser: open a page (the dev server or the built site), set the window to 390 wide and then 1280 wide, paste
//     this whole file into the console. It returns the list of problems and the snapshot it took.
//   - In node: require() it. check(snapshot) is a pure function, and it is what signatureProbe.test.ts runs.
//
// Plain ES5-ish JavaScript with no imports, so it can be pasted as it is.

(function () {
  // The one shadow the kit allows: product photography (the shadow-warm utility in globals.css).
  var PRODUCT_SHADOW = "rgba(42, 38, 34, 0.35) 0px 12px 28px -14px";
  var BURGUNDY = "rgb(102, 30, 41)";
  // The fixed order bar and the cookie banner together may take this much of a phone's height.
  var MAX_BOTTOM_STACK = 0.38;

  // ---- Browser side: take a snapshot of the page ----------------------------------------------------------------

  function label(element) {
    var cls = typeof element.className === "string" ? element.className.split(/\s+/).slice(0, 3).join(".") : "";
    var text = (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 32);
    return element.tagName.toLowerCase() + (cls ? "." + cls : "") + (text ? ' "' + text + '"' : "");
  }

  function isVisible(element) {
    var style = getComputedStyle(element);
    var rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  // True when the shadow would actually be seen: some layer has a colour that is not transparent and a size.
  function shadowShows(value) {
    if (!value || value === "none") return false;
    var layers = value.split(/,(?![^(]*\))/);
    return layers.some(function (layer) {
      var color = layer.match(/rgba?\(([^)]*)\)/);
      var alpha = color ? (color[1].split(",").length === 4 ? parseFloat(color[1].split(",")[3]) : 1) : 1;
      var lengths = layer.replace(/rgba?\([^)]*\)/, "").match(/-?[\d.]+px/g) || [];
      var nonZero = lengths.some(function (n) { return parseFloat(n) !== 0; });
      return alpha > 0 && nonZero;
    });
  }

  function collect() {
    var all = Array.prototype.slice.call(document.querySelectorAll("body *"));
    var snapshot = {
      path: location.pathname,
      width: window.innerWidth,
      height: window.innerHeight,
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
      h1: document.querySelectorAll("h1").length,
      pour: [],
      frames: [],
      seals: 0,
      burgundyFills: [],
      burgundyItalic: [],
      shadows: [],
      gradients: [],
      fixed: [],
    };

    Array.prototype.forEach.call(document.querySelectorAll(".pour-line, .an-pour"), function (line) {
      snapshot.pour.push({ label: label(line), hidden: Boolean(line.closest('[aria-hidden="true"]')) });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".gift-frame-line"), function (frame) {
      var parent = frame.parentElement.getBoundingClientRect();
      var rect = frame.getBoundingClientRect();
      snapshot.frames.push({
        inset: Math.round((rect.left - parent.left) * 10) / 10,
        short: Math.round(Math.min(parent.width, parent.height)),
        hidden: Boolean(frame.closest('[aria-hidden="true"]')),
      });
    });

    snapshot.seals = Array.prototype.filter.call(document.querySelectorAll("[data-seal]"), isVisible).length;

    all.forEach(function (element) {
      if (!isVisible(element)) return;
      var style = getComputedStyle(element);
      var hasText = Array.prototype.some.call(element.childNodes, function (node) {
        return node.nodeType === 3 && node.textContent.trim() !== "";
      });

      if (style.backgroundColor === BURGUNDY) snapshot.burgundyFills.push(label(element));
      if (style.color === BURGUNDY && style.fontStyle === "italic" && hasText) snapshot.burgundyItalic.push(label(element));

      if (shadowShows(style.boxShadow)) snapshot.shadows.push({ label: label(element), value: style.boxShadow });

      if (style.backgroundImage && style.backgroundImage.indexOf("gradient") >= 0) {
        snapshot.gradients.push({ label: label(element), allowed: element.hasAttribute("data-scrim") });
      }

      if (style.position === "fixed") {
        var rect = element.getBoundingClientRect();
        snapshot.fixed.push({
          label: label(element),
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          modal: element.getAttribute("role") === "dialog" || element.getAttribute("aria-modal") === "true",
          // Wide, low on the screen and not the whole screen: an order bar or the cookie banner (not the bubble).
          bottom: rect.width >= window.innerWidth * 0.5 && rect.top > window.innerHeight * 0.4 && rect.height < window.innerHeight * 0.6,
        });
      }
    });

    return snapshot;
  }

  // ---- Pure side: the rules --------------------------------------------------------------------------------------

  function check(snapshot) {
    var problems = [];

    if (snapshot.h1 !== 1) problems.push("Expected exactly one h1, found " + snapshot.h1 + ".");
    if (snapshot.overflowX) problems.push("The page scrolls sideways at " + snapshot.width + " px.");

    if (snapshot.pour.length > 1) problems.push("More than one pour line (" + snapshot.pour.length + "): the kit allows one per layout.");
    snapshot.pour.forEach(function (line) {
      if (!line.hidden) problems.push("A pour line is not hidden from screen readers: " + line.label);
    });

    snapshot.frames.forEach(function (frame) {
      var expected = frame.short * 0.04;
      if (Math.abs(frame.inset - expected) > 1.5) {
        problems.push("A gift frame is inset " + frame.inset + " px; 4% of its short side (" + frame.short + " px) is " + Math.round(expected * 10) / 10 + " px.");
      }
      if (!frame.hidden) problems.push("A gift frame is not hidden from screen readers.");
    });

    if (snapshot.seals > 1) problems.push("More than one seal (" + snapshot.seals + "): one per layout.");

    var burgundy = snapshot.burgundyFills.length + snapshot.burgundyItalic.length;
    if (burgundy > 1) {
      problems.push("Burgundy is used " + burgundy + " times (fills: " + snapshot.burgundyFills.join("; ") + "; italic: " + snapshot.burgundyItalic.join("; ") + "): once per layout.");
    }

    snapshot.shadows.forEach(function (shadow) {
      if (shadow.value !== PRODUCT_SHADOW) problems.push("A shadow outside product photography: " + shadow.label + " (" + shadow.value + ").");
    });

    snapshot.gradients.forEach(function (gradient) {
      if (!gradient.allowed) problems.push("A gradient that is not a text scrim (no data-scrim): " + gradient.label + ".");
    });

    // Fixed things must not sit on each other. A modal (the cart drawer, a popup) covers the page by design.
    var fixed = snapshot.fixed.filter(function (item) { return !item.modal; });
    for (var i = 0; i < fixed.length; i++) {
      for (var j = i + 1; j < fixed.length; j++) {
        var a = fixed[i];
        var b = fixed[j];
        var overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        var overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (overlapX > 0 && overlapY > 0) problems.push("Fixed items overlap by " + overlapX + "x" + overlapY + " px: " + a.label + " and " + b.label + ".");
      }
    }

    // The bar and the banner stacked at the bottom, measured from the highest top edge to the bottom of the screen.
    var bottoms = fixed.filter(function (item) { return item.bottom; });
    if (bottoms.length > 0) {
      var top = Math.min.apply(null, bottoms.map(function (item) { return item.y; }));
      var taken = snapshot.height - top;
      if (taken > snapshot.height * MAX_BOTTOM_STACK) {
        problems.push("Fixed bars take " + taken + " px of " + snapshot.height + " px (" + Math.round((taken / snapshot.height) * 100) + "%); the limit is " + MAX_BOTTOM_STACK * 100 + "%.");
      }
    }

    return problems;
  }

  var api = { collect: collect, check: check, PRODUCT_SHADOW: PRODUCT_SHADOW };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return api;
  }

  var snapshot = collect();
  return JSON.stringify({ path: snapshot.path, width: snapshot.width, problems: check(snapshot), snapshot: snapshot }, null, 1);
})();
