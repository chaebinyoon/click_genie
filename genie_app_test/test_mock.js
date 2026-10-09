const fs = require('fs');

global.window = {
  location: { search: "" },
  addEventListener: () => {}
};
global.document = {
  getElementById: (id) => {
    if (id === "app") return global.app;
    return { id, insertAdjacentHTML: () => {}, focus: () => {}, setSelectionRange: () => {} };
  },
  querySelector: () => ({ scrollTop: 0, scrollLeft: 0 }),
  addEventListener: () => {}
};
global.Audio = class {
  constructor() { this.paused = true; this.src = ""; }
  play() {}
  pause() {}
  addEventListener() {}
};
global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  disconnect() {}
};
global.Intl = {
  NumberFormat: class { format(n) { return n.toString(); } }
};
global.URLSearchParams = class {
  constructor() {}
  get() { return null; }
};
global.app = { innerHTML: "", addEventListener: () => {} };

const code = fs.readFileSync('app.js', 'utf8');
try {
  eval(code);
  fs.writeFileSync('output.html', global.app.innerHTML);
} catch (e) {
  console.error(e);
}
