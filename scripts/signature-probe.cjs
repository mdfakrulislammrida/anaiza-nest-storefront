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
  // One radius for the whole shop: 2px. Photographs have none. Only the seal (and the pour line's drop, a pseudo-element)
  // is round.
  var MAX_RADIUS = 2;
  // The fixed order bar and the cookie banner together may take this much of a phone's height, but never less than
  // MIN_STACK_ALLOWED px: the bars are as tall as they are (a 166 px order bar and a 145 px banner) on a 640 px phone
  // as on an 844 px one, so a percentage alone would flag the same bars on a shorter screen.
  var MAX_BOTTOM_STACK = 0.38;
  var MIN_STACK_ALLOWED = 320;
  // The product page's sticky Add to cart bar: the price and one button, never taller than this.
  var MAX_PRODUCT_BAR = 64;
  // Under this width the product's title must be in the first screen: the whole of it, or its first two lines when it runs
  // longer (a 30 px title is three lines on a 360 px phone, and the rest of it is a short scroll away).
  var PHONE_WIDTH = 480;

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
      // clientWidth, not innerWidth: a phone that has been made to scroll sideways reports an innerWidth as wide as the
      // overflowing page, which hid exactly this fault.
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      header: null,
      hero: null,
      product: null,
      checkout: null,
      h1: document.querySelectorAll("h1").length,
      pour: [],
      frames: [],
      seals: 0,
      burgundyFills: [],
      burgundyItalic: [],
      shadows: [],
      radii: [],
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

    // The header's controls: how far right the rightmost reaches, and the cart in particular.
    var header = document.querySelector("header");
    if (header) {
      var controls = Array.prototype.filter.call(header.querySelectorAll("a, button, img"), isVisible);
      var cart = Array.prototype.filter.call(controls, function (el) { return /^Cart/.test(el.getAttribute("aria-label") || ""); })[0];
      var cartRect = cart ? cart.getBoundingClientRect() : null;
      snapshot.header = {
        rightmost: Math.round(Math.max.apply(null, [0].concat(controls.map(function (el) { return el.getBoundingClientRect().right; })))),
        cart: cartRect ? { left: Math.round(cartRect.left), right: Math.round(cartRect.right), w: Math.round(cartRect.width), h: Math.round(cartRect.height) } : null,
        // The checkout's frame has no cart on purpose (nothing there should take the visitor away from paying).
        cartOptional: /^\/checkout\/?$/.test(window.location.pathname),
      };
    }


    // The homepage hero, when the page has one: where its words, frame and pour line sit against its panel, and where its
    // edges sit against the header's logo and cart (the edges of the header's content, inside its 24 px sides).
    var heroSection = document.querySelector("[data-hero]");
    var heroPanel = heroSection ? heroSection.querySelector("[data-hero-panel]") : null;
    if (heroSection && heroPanel) {
      var box = function (el) {
        if (!el) return null;
        var r = el.getBoundingClientRect();
        var round = function (n) { return Math.round(n * 10) / 10; };
        return { l: round(r.left), r: round(r.right), t: round(r.top + window.scrollY), b: round(r.bottom + window.scrollY) };
      };
      var pourLine = heroPanel.querySelector(".pour-line");
      var pourBox = box(pourLine);
      if (pourBox) {
        // The line draws itself on scroll (it is 0 px tall until then), so measure where it ends up: its length, then the drop.
        var length = window.getComputedStyle(pourLine).getPropertyValue("--pour-length").trim();
        var rem = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
        pourBox.b = pourBox.t + (/rem$/.test(length) ? parseFloat(length) * rem : parseFloat(length)) + 5;
      }
      var inner = header ? header.querySelector("[class*='max-w-7xl']") : null;
      var innerStyle = inner ? window.getComputedStyle(inner) : null;
      var innerRect = inner ? inner.getBoundingClientRect() : null;
      snapshot.hero = {
        picture: Boolean(heroSection.querySelector("picture")),
        panel: box(heroPanel),
        h1: box(heroPanel.querySelector("h1")),
        badge: box(heroPanel.querySelector("span")),
        frame: box(heroPanel.querySelector(".gift-frame-line")),
        pour: pourBox,
        left: box(heroSection.firstElementChild).l,
        right: box(heroSection.lastElementChild).r,
        headerLeft: innerRect ? Math.round((innerRect.left + parseFloat(innerStyle.paddingLeft)) * 10) / 10 : null,
        headerRight: innerRect ? Math.round((innerRect.right - parseFloat(innerStyle.paddingRight)) * 10) / 10 : null,
      };
    }


    // A product page: where the title stands (from the top of the page) and how tall the fixed bar is.
    var productTitle = /^\/product\//.test(window.location.pathname) ? document.querySelector("main h1") : null;
    if (productTitle) {
      var titleRect = productTitle.getBoundingClientRect();
      var productBar = document.querySelector("[data-bottom-bar]");
      var barFixed = productBar && window.getComputedStyle(productBar).position === "fixed";
      snapshot.product = {
        titleTop: Math.round((titleRect.top + window.scrollY) * 10) / 10,
        titleHeight: Math.round(titleRect.height * 10) / 10,
        titleLine: Math.round(parseFloat(window.getComputedStyle(productTitle).lineHeight) * 10) / 10 || null,
        bar: barFixed ? { h: Math.round(productBar.getBoundingClientRect().height * 10) / 10 } : null,
      };
    }


    // The checkout page: where the order total stands (from the top of the page) and how tall the fixed bar is.
    if (/^\/checkout\/?$/.test(window.location.pathname)) {
      var totalNode = document.querySelector("[data-checkout-total]");
      var checkoutBar = document.querySelector("[data-bottom-bar]");
      var checkoutBarFixed = checkoutBar && window.getComputedStyle(checkoutBar).position === "fixed";
      if (totalNode || checkoutBar) {
        var totalRect = totalNode ? totalNode.getBoundingClientRect() : null;
        snapshot.checkout = {
          totalBottom: totalRect && totalRect.height > 0 ? Math.round((totalRect.bottom + window.scrollY) * 10) / 10 : null,
          bar: checkoutBarFixed ? { h: Math.round(checkoutBar.getBoundingClientRect().height * 10) / 10 } : null,
        };
      }
    }

    all.forEach(function (element) {
      if (!isVisible(element)) return;
      var style = getComputedStyle(element);
      var hasText = Array.prototype.some.call(element.childNodes, function (node) {
        return node.nodeType === 3 && node.textContent.trim() !== "";
      });

      if (style.backgroundColor === BURGUNDY) snapshot.burgundyFills.push(label(element));
      if (style.color === BURGUNDY && style.fontStyle === "italic" && hasText) snapshot.burgundyItalic.push(label(element));

      if (shadowShows(style.boxShadow)) snapshot.shadows.push({ label: label(element), value: style.boxShadow });

      // A corner rounder than the shop's 2px (a percentage, as on a circle, counts as round), or any corner on a photograph.
      var radius = style.borderTopLeftRadius || "0px";
      var rounded = radius.indexOf("%") >= 0 ? parseFloat(radius) > 0 : parseFloat(radius) > MAX_RADIUS;
      var photo = element.tagName === "IMG" && parseFloat(radius) > 0;
      if ((rounded || photo) && !element.closest("[data-seal]") && !element.classList.contains("sr-only")) snapshot.radii.push({ label: label(element), value: radius, photo: photo });

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
    if (snapshot.overflowX) problems.push("The page scrolls sideways at " + snapshot.width + " px (its content is " + snapshot.scrollWidth + " px wide, the screen " + snapshot.clientWidth + " px).");

    // Every header control inside the screen, and the cart whole and big enough to tap.
    if (snapshot.header) {
      var screen = snapshot.clientWidth || snapshot.width;
      if (snapshot.header.rightmost > screen) {
        problems.push("The header reaches " + (snapshot.header.rightmost - screen) + " px past the screen edge at " + snapshot.width + " px.");
      }
      var cart = snapshot.header.cart;
      if (!cart && snapshot.header.cartOptional) {
        // A frame that leaves the cart out on purpose (the checkout): the other header checks still hold.
      } else if (!cart) {
        problems.push("The header has no cart button.");
      } else if (cart.left < 0 || cart.right > screen) {
        problems.push("The cart button is not fully on screen (" + cart.left + " to " + cart.right + " of " + screen + " px).");
      } else if (cart.w < 44 || cart.h < 44) {
        problems.push("The cart button is " + cart.w + " x " + cart.h + " px; the smallest tap target is 44 x 44.");
      }
    }


    // The homepage hero: the whole headline and badge inside the screen and the panel, the frame and the pour line inside the
    // panel (never over the photograph beside it), and the hero and its tiles on the header's left and right edges.
    var hero = snapshot.hero;
    if (hero) {
      var screenWidth = snapshot.clientWidth || snapshot.width;
      var inside = function (inner, outer) {
        return inner.l >= outer.l - 1 && inner.r <= outer.r + 1 && inner.t >= outer.t - 1 && inner.b <= outer.b + 1;
      };
      var words = { "headline": hero.h1, "badge": hero.badge };
      Object.keys(words).forEach(function (name) {
        var box = words[name];
        if (!box) return;
        if (box.l < 0 || box.r > screenWidth || box.t < 0) problems.push("The hero " + name + " is outside the screen (" + box.l + " to " + box.r + " of " + screenWidth + " px, top " + box.t + ").");
        if (hero.panel && !inside(box, hero.panel)) problems.push("The hero " + name + " is cut off by its panel (it spans " + box.t + " to " + box.b + " px, the panel " + hero.panel.t + " to " + hero.panel.b + ").");
      });
      if (hero.picture && hero.panel) {
        if (hero.frame && !inside(hero.frame, hero.panel)) problems.push("With a picture set, the gift frame reaches outside the hero's text panel, over the photograph.");
        if (hero.pour && !inside(hero.pour, hero.panel)) problems.push("With a picture set, the pour line reaches outside the hero's text panel, over the photograph.");
      }
      // A phone keeps the hero edge to edge; from 640 px it sits on the header's column.
      if (snapshot.width >= 640 && hero.headerLeft !== null) {
        if (Math.abs(hero.left - hero.headerLeft) > 1) problems.push("The hero starts at " + hero.left + " px, the header content at " + hero.headerLeft + " px.");
        if (Math.abs(hero.right - hero.headerRight) > 1) problems.push("The hero tiles end at " + hero.right + " px, the header content at " + hero.headerRight + " px.");
      }
    }


    // A product page: the whole title in the first screen on a phone, and the sticky bar no taller than the limit.
    var product = snapshot.product;
    if (product) {
      var titleShown = Math.min(product.titleHeight, 2 * (product.titleLine || product.titleHeight));
      if (snapshot.width <= PHONE_WIDTH && product.titleTop + titleShown > snapshot.height) {
        problems.push("The product title ends at " + Math.round(product.titleTop + titleShown) + " px, below the first screen (" + snapshot.height + " px high).");
      }
      if (product.bar && product.bar.h > MAX_PRODUCT_BAR) {
        problems.push("The sticky bar is " + product.bar.h + " px tall; the limit is " + MAX_PRODUCT_BAR + " px.");
      }
    }


    // The checkout on a phone: the order total in the first screen (in the folded summary, whatever is open), and the bar at
    // most as tall as the limit.
    var checkout = snapshot.checkout;
    if (checkout) {
      if (snapshot.width <= PHONE_WIDTH && checkout.totalBottom !== null && checkout.totalBottom > snapshot.height) {
        problems.push("The checkout's order total ends at " + Math.round(checkout.totalBottom) + " px, below the first screen (" + snapshot.height + " px high).");
      }
      if (checkout.bar && checkout.bar.h > MAX_PRODUCT_BAR) {
        problems.push("The checkout bar is " + checkout.bar.h + " px tall; the limit is " + MAX_PRODUCT_BAR + " px.");
      }
    }

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

    (snapshot.radii || []).forEach(function (corner) {
      problems.push((corner.photo ? "A photograph with rounded corners: " : "A corner rounder than 2px: ") + corner.label + " (" + corner.value + ").");
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
      var allowed = Math.max(snapshot.height * MAX_BOTTOM_STACK, MIN_STACK_ALLOWED);
      if (taken > allowed) {
        problems.push("Fixed bars take " + taken + " px of " + snapshot.height + " px (" + Math.round((taken / snapshot.height) * 100) + "%); the limit is " + Math.round(allowed) + " px.");
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
