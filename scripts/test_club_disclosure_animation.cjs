const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

function setup({ open = false, reducedMotion = false, canAnimate = true } = {}) {
  const context = vm.createContext({
    document: { addEventListener() {} },
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    getComputedStyle: () => ({ opacity: "0.6" })
  });
  const source = fs.readFileSync(path.join(__dirname, "../web/js/clubs/clubs_profil.js"), "utf8");
  const end = source.lastIndexOf("})();");
  vm.runInContext(source.slice(0, end) + "window.initAnimation = initDisciplineAnimation;\n" + source.slice(end), context);

  const animations = [];
  const attributes = new Set();
  let activate;
  let renderedHeight = 240;
  const body = {
    scrollHeight: 400,
    getBoundingClientRect: () => ({ height: renderedHeight })
  };
  if (canAnimate) {
    body.animate = (frames, options) => {
      const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
      animations.push(animation);
      return animation;
    };
  }
  const summary = { addEventListener(type, listener) { assert.equal(type, "click"); activate = listener; } };
  const card = {
    open,
    querySelector: (selector) => selector === "summary" ? summary : body,
    removeAttribute: (name) => attributes.delete(name),
    toggleAttribute(name, value) { if (value) attributes.add(name); else attributes.delete(name); }
  };
  context.window.initAnimation(card);
  return {
    card, attributes, animations,
    setHeight(value) { renderedHeight = value; },
    click() {
      let prevented = false;
      activate({ preventDefault() { prevented = true; } });
      assert.ok(prevented, "native toggling must wait for the animation");
    }
  };
}

test("closing keeps content visible until the animation finishes and releases its height", () => {
  const state = setup({ open: true });
  state.click();
  assert.equal(state.card.open, true);
  assert.ok(state.attributes.has("data-closing"));
  const animation = state.animations[0];
  assert.equal(animation.frames[0].height, "240px");
  assert.equal(animation.frames[1].height, "0px");
  animation.onfinish();
  assert.equal(state.card.open, false);
  assert.equal(state.attributes.has("data-closing"), false);
  assert.equal(animation.cancelled, true, "finished animation must not fix the responsive height");
});

test("rapid reversals continue from the visible height and ignore stale completion callbacks", () => {
  const state = setup();
  state.click();
  const opening = state.animations[0];
  assert.equal(opening.frames[0].height, "0px");
  assert.equal(opening.frames[1].height, "400px");
  state.setHeight(120);
  state.click();
  const closing = state.animations[1];
  assert.equal(opening.cancelled, true);
  assert.equal(closing.frames[0].height, "120px");
  state.setHeight(60);
  state.click();
  const reopening = state.animations[2];
  assert.equal(closing.cancelled, true);
  assert.equal(reopening.frames[0].height, "60px");
  closing.onfinish();
  assert.equal(reopening.cancelled, false);
  assert.equal(state.card.open, true);
  reopening.onfinish();
  assert.equal(state.card.open, true);
  assert.equal(reopening.cancelled, true);
  assert.equal(state.attributes.has("data-closing"), false);
});

test("reduced motion and browsers without animation support toggle immediately", () => {
  for (const options of [{ reducedMotion: true }, { canAnimate: false }]) {
    const state = setup(options);
    state.click();
    assert.equal(state.card.open, true);
    state.click();
    assert.equal(state.card.open, false);
    assert.equal(state.animations.length, 0);
    assert.equal(state.attributes.has("data-closing"), false);
  }
});
