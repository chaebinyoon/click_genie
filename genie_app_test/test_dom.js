const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html><div><svg width=&quot;1em&quot;></svg></div>`);
console.log(dom.window.document.body.innerHTML);
