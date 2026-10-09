const { JSDOM } = require("jsdom");
const dom = new JSDOM(`<!DOCTYPE html><html lang="ko"><head></head><body><div id="app"></div></body></html>`, { runScripts: "dangerously" });
const scriptContent = require("fs").readFileSync("./app.js", "utf-8");
try {
  dom.window.eval(scriptContent);
  console.log("SUCCESS");
} catch (e) {
  console.error(e);
}
