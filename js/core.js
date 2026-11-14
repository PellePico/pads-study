/* PADS core: namespace, subject registry, DOM helper, storage, Python highlighter.
   Loaded first. No dependencies. See AUTHORING.md for the public API. */
(function () {
  "use strict";
  const PADS = (window.PADS = window.PADS || {});
  PADS.version = "1.0";

  /* ---------- subject registry ---------- */
  const subjects = {};
  PADS.subjects = subjects;

  PADS.registerSubject = function (def) {
    const fail = msg => { console.error("[PADS] registerSubject(" + (def && def.id) + "): " + msg); };
    if (!def || typeof def.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(def.id)) return fail("id must be a lowercase string like 'oop'");
    if (!def.title) return fail("title is required");
    if (!Array.isArray(def.topics) || def.topics.length === 0) return fail("topics must be a non-empty array");
    const seen = new Set();
    for (const t of def.topics) {
      if (!t || typeof t.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(t.id)) return fail("every topic needs an id like 'control-flow' (got " + (t && t.id) + ")");
      if (seen.has(t.id)) return fail("duplicate topic id " + t.id);
      seen.add(t.id);
      if (!t.title) return fail("topic " + t.id + " needs a title");
      if (!t.render && !t.blocks) return fail("topic " + t.id + " needs blocks: [...] or render(el, api)");
    }
    subjects[def.id] = Object.assign({ order: 99, blurb: "", covers: [], exam: [] }, def);
    if (PADS._onRegister) PADS._onRegister(def.id);
    return subjects[def.id];
  };
  PADS.subjectList = () => Object.values(subjects).sort((a, b) => a.order - b.order);

  /* ---------- tiny DOM helper ----------
     h("div", { class: "x", onclick: fn, html: "<b>raw</b>" }, "text", childNode, [more])
     - attrs: class, style (string or object), html (innerHTML), text, on<event>, data-*, aria-*, any other attribute.
     - children: strings become TEXT (safe), Nodes are appended, arrays are flattened, null/false skipped. */
  function h(tag, attrs, ...kids) {
    const el = tag instanceof Node ? tag : document.createElement(tag);
    if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "html") el.innerHTML = v;
        else if (k === "text") el.textContent = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k in el && typeof v !== "string" && k !== "list") el[k] = v;
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    const add = c => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) return c.forEach(add);
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  }
  PADS.h = h;

  /* HTML string → single Node (wrapped in a <div class="html"> if there are several top-level nodes). */
  PADS.html = function (str, cls) {
    const d = document.createElement("div");
    d.innerHTML = String(str).trim();
    if (!cls && d.childNodes.length === 1 && d.firstChild.nodeType === 1) return d.firstChild;
    d.className = cls || "prose";
    return d;
  };

  PADS.esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  PADS.uid = (() => { let n = 0; return (p = "pads") => p + "-" + (++n); })();

  /* Python-style text of a JS value: 'abc', [1, 2], True, None, {'a': 1}. Numbers stay as written. */
  PADS.pyrepr = function pyrepr(v) {
    if (v === null || v === undefined) return "None";
    if (v === true) return "True";
    if (v === false) return "False";
    if (typeof v === "string") return v.includes("'") && !v.includes('"') ? '"' + v + '"' : "'" + v.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n") + "'";
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : (v > 0 ? "inf" : v < 0 ? "-inf" : "nan");
    if (Array.isArray(v)) return "[" + v.map(pyrepr).join(", ") + "]";
    if (typeof v === "object") return "{" + Object.entries(v).map(([k, x]) => pyrepr(k) + ": " + pyrepr(x)).join(", ") + "}";
    return String(v);
  };

  /* ---------- storage (never throws) ---------- */
  const NS = "pads:";
  PADS.store = {
    get(key, fallback) {
      try { const raw = window.localStorage.getItem(NS + key); return raw == null ? fallback : JSON.parse(raw); }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { window.localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove(key) { try { window.localStorage.removeItem(NS + key); } catch (e) { /* ignore */ } },
  };

  /* ---------- Python syntax highlighter ----------
     PADS.highlight(src) → HTML string with <span class="tk-…"> tokens. Safe: escapes everything. */
  const KW = new Set("False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(" "));
  const BI = new Set("print len range int float str bool type input list dict set tuple sum min max abs round sorted reversed enumerate zip isinstance super open map filter repr id iter next any all object hasattr getattr setattr ValueError TypeError IndexError KeyError NameError ZeroDivisionError Exception AssertionError RecursionError AttributeError".split(" "));
  const TOKEN = /(#[^\n]*)|((?:[rRbBuU]|[fF][rR]?|[rR][fF])?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))|(\b\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?j?\b|\.\d+\b)|(@[A-Za-z_][\w.]*)|([A-Za-z_]\w*)/g;
  PADS.highlight = function (src) {
    const esc = PADS.esc;
    let out = "", last = 0, m, prevWord = "";
    TOKEN.lastIndex = 0;
    src = String(src);
    while ((m = TOKEN.exec(src))) {
      out += esc(src.slice(last, m.index));
      const t = m[0];
      if (m[1]) out += '<span class="tk-com">' + esc(t) + "</span>";
      else if (m[2]) out += '<span class="tk-str">' + esc(t) + "</span>";
      else if (m[3]) out += '<span class="tk-num">' + esc(t) + "</span>";
      else if (m[4]) out += '<span class="tk-dec">' + esc(t) + "</span>";
      else {
        const next = src.slice(TOKEN.lastIndex).match(/^\s*\(/);
        if (prevWord === "def" || prevWord === "class") out += '<span class="tk-fn">' + esc(t) + "</span>";
        else if (KW.has(t)) out += '<span class="tk-kw">' + t + "</span>";
        else if (t === "self") out += '<span class="tk-self">self</span>';
        else if (BI.has(t) && next) out += '<span class="tk-bi">' + t + "</span>";
        else out += esc(t);
        prevWord = t;
        last = TOKEN.lastIndex;
        continue;
      }
      prevWord = "";
      last = TOKEN.lastIndex;
    }
    return out + esc(src.slice(last));
  };

  /* Turn a code string (or array of lines) into an array of lines. Strips one leading/trailing blank line
     and the common indentation, so template literals can be indented inside your JS. */
  PADS.lines = function (code) {
    if (Array.isArray(code)) return code.slice();
    let ls = String(code).replace(/\t/g, "    ").split("\n");
    while (ls.length && ls[0].trim() === "") ls.shift();
    while (ls.length && ls[ls.length - 1].trim() === "") ls.pop();
    const ind = Math.min(...ls.filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
    return ls.map(l => l.slice(Number.isFinite(ind) ? ind : 0));
  };
  PADS.dedent = code => PADS.lines(code).join("\n");
})();
