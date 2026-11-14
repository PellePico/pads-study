// Headless check for the PADS site (Chrome + DevTools protocol, no npm packages).
// Usage:  node tools/check.mjs foundations/basics data/lists ...   (hashes, without #)
//         OUT=/some/dir node tools/check.mjs datasci            (screenshots go to $OUT, default $TMPDIR/pads-check)
// For each hash it loads index.html in light (1280 px), dark (1280 px) and phone (390 px, light) and reports:
//   console errors / exceptions, blocks that failed to render, horizontal overflow at phone width.
// Screenshots: <out>/<hash>-light.png, -dark.png, -phone.png (viewport only; add FULL=1 for full page).
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hashes = process.argv.slice(2).length ? process.argv.slice(2) : [""];
const outDir = process.env.OUT || join(tmpdir(), "pads-check");
const base = pathToFileURL(join(root, "index.html")).href;
const EVAL = "const bad=document.querySelectorAll('[data-label=Bug]').length; return {h1: document.querySelector('h1')?.textContent, failedBlocks: bad, steppers: document.querySelectorAll('.stepper').length, tryits: document.querySelectorAll('.tryit').length, quizQuestions: document.querySelectorAll('.q').length, overflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth}";
const tasks = [];
for (const hs of hashes) {
  const n = (hs || "home").replace(/\//g, "_");
  tasks.push({ name: hs + " light", url: base + "#" + hs, eval: EVAL, shot: n + "-light", full: !!process.env.FULL });
  tasks.push({ name: hs + " dark", scheme: "dark", url: base + "#" + hs, eval: EVAL, shot: n + "-dark", full: !!process.env.FULL });
  tasks.push({ name: hs + " phone", width: 390, height: 844, mobile: true, url: base + "#" + hs, eval: EVAL, shot: n + "-phone", full: !!process.env.FULL });
}
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9300 + Math.floor(Math.random() * 400);
mkdirSync(outDir, { recursive: true });
const prof = outDir + "/profile";
rmSync(prof, { recursive: true, force: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", ...(process.env.CHROME_EXTRA ? [process.env.CHROME_EXTRA] : []), "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 50; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(t => t.type === "page"); if (p) { wsUrl = p.webSocketDebuggerUrl; break; } } catch (e) {}
  await sleep(200);
}
const ws = new WebSocket(wsUrl);
await new Promise(r => (ws.onopen = r));
let id = 0; const pend = new Map(); const logs = [];
let loadResolve = null;
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
  if (m.method === "Runtime.consoleAPICalled" && ["error", "warning", "assert"].includes(m.params.type)) logs.push("console." + m.params.type + ": " + m.params.args.map(a => a.value ?? a.description).join(" "));
  if (m.method === "Runtime.exceptionThrown") logs.push("EXCEPTION: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error") logs.push("log.error: " + m.params.entry.text + " " + (m.params.entry.url || ""));
  if (m.method === "Page.loadEventFired" && loadResolve) { loadResolve(); loadResolve = null; }
};
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
const report = [];
for (const t of tasks) {
  logs.length = 0;
  await send("Emulation.setDeviceMetricsOverride", { width: t.width || 1280, height: t.height || 900, deviceScaleFactor: 1, mobile: !!t.mobile });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: t.scheme || "light" }] });
  if (t.url) {
    const p = new Promise(r => (loadResolve = r));
    await send("Page.navigate", { url: t.url });
    await Promise.race([p, sleep(8000)]);
    await sleep(t.wait ?? 600);
  }
  let value = null;
  if (t.eval) {
    const r = await send("Runtime.evaluate", { expression: `(async () => { ${t.eval} })()`, awaitPromise: true, returnByValue: true, timeout: t.timeout || 120000 });
    value = r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description ?? r.error;
    await sleep(t.after ?? 300);
  }
  if (t.shot) {
    const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: !!t.full });
    writeFileSync(`${outDir}/${t.shot}.png`, Buffer.from(r.result.data, "base64"));
  }
  report.push({ name: t.name, value, logs: logs.slice() });
  console.log("== " + t.name + (value != null ? "\n   value: " + JSON.stringify(value) : "") + (logs.length ? "\n   LOGS:\n   " + logs.join("\n   ") : ""));
}
ws.close(); chrome.kill();
console.log("\nScreenshots in " + outDir);
const problems = report.filter(r => r.logs.length || (r.value && (r.value.failedBlocks || r.value.overflowPx > 0)));
console.log(problems.length ? "PROBLEMS in " + problems.length + " load(s)." : "No problems found.");
process.exit(problems.length ? 1 : 0);
