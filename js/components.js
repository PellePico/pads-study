/* PADS shared components. Everything lives on PADS.ui. Full docs with examples: AUTHORING.md.
   Every factory takes ONE options object and returns a DOM element, so it can be used as a block:
     { type: "stepper", ...opts }  is the same as  api.ui.stepper(opts, api)                      */
(function () {
  "use strict";
  const PADS = window.PADS;
  const { h, esc } = PADS;
  const ui = (PADS.ui = {});

  const ICON = (() => {
    const s = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    return {
      first: s('<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/>'),
      back: s('<path d="m15 18-6-6 6-6"/>'),
      next: s('<path d="m9 18 6-6-6-6"/>'),
      play: s('<polygon points="6 3 20 12 6 21 6 3"/>'),
      pause: s('<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>'),
      stop: s('<rect x="5" y="5" width="14" height="14" rx="2"/>'),
      reset: s('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
    };
  })();
  ui.icons = ICON;
  const btn = (label, attrs) => h("button", Object.assign({ type: "button", class: "btn" }, attrs || {}), label);
  const htmlEl = (tag, cls, html) => h(tag, { class: cls, html: html });

  /* ================================================================
     Text blocks
     ================================================================ */

  /* Section heading. { text, sub } */
  ui.h = function (o) {
    o = typeof o === "string" ? { text: o } : o;
    const el = h("h2", { class: "sec-h", id: o.id || null }, o.text);
    if (o.sub) el.appendChild(h("small", null, o.sub));
    return el;
  };

  /* Paragraphs / lists as an HTML string. { html } */
  ui.text = o => PADS.html(typeof o === "string" ? o : o.html, "prose");

  /* Callout box. { kind: "tip" | "warn" | "exam" | "rule" | "note", title, html } */
  const CALLOUT_LABEL = { tip: "Tip", warn: "Careful", exam: "Exam", rule: "Rule", note: "Note" };
  ui.callout = function (o) {
    const kind = o.kind || "note";
    const el = h("aside", { class: "callout " + kind });
    el.appendChild(h("p", { class: "c-title", "data-label": o.label || CALLOUT_LABEL[kind] || "Note" }, o.title || ""));
    if (o.html) el.appendChild(h("div", { html: o.html }));
    if (o.code) el.appendChild(ui.code({ code: o.code, nonum: true }));
    return el;
  };

  /* Static, highlighted code. { code, nonum, caption, active: [lineNos], dim: [..], bad: [..], good: [..] } */
  ui.code = function (o) {
    o = typeof o === "string" ? { code: o } : o;
    const lines = PADS.lines(o.code);
    const mark = (name, n) => (o[name] || []).includes(n) ? " " + name : "";
    const pre = h("div", { class: "code" + (o.nonum ? " nonum" : ""), role: "region", "aria-label": o.caption || "Python code" });
    pre.innerHTML = lines.map((l, i) => {
      const n = i + 1;
      return `<div class="ln${mark("active", n)}${mark("dim", n)}${mark("bad", n)}${mark("good", n)}"><span class="no">${n}</span><span>${PADS.highlight(l) || " "}</span></div>`;
    }).join("");
    if (!o.caption) return pre;
    return h("figure", { style: "margin:0" }, h("figcaption", { class: "code-cap" }, o.caption), pre);
  };

  /* Table. { head: [...], rows: [[...], ...], caption, code: [colIdx], num: [colIdx] }
     Cells are HTML strings, except columns listed in `code`, which are shown as highlighted Python. */
  ui.table = function (o) {
    const codeCols = new Set(o.code || []), numCols = new Set(o.num || []);
    const t = h("table", { class: "tbl" });
    if (o.caption) t.appendChild(h("caption", null, o.caption));
    if (o.head) t.appendChild(h("thead", null, h("tr", null, o.head.map((c, i) => h("th", { class: numCols.has(i) ? "num" : null, html: c })))));
    t.appendChild(h("tbody", null, o.rows.map(r => h("tr", null, r.map((c, i) => codeCols.has(i)
      ? h("td", { class: "code-cell", html: PADS.highlight(String(c)) })
      : h("td", { class: numCols.has(i) ? "num" : null, html: String(c) }))))));
    return h("div", { class: "tablewrap" }, t);
  };

  /* Common-mistakes box. { title, items: [{ title, wrong, right, why }] }  (wrong/right are code) */
  ui.mistakes = function (o) {
    const box = h("section", { class: "mistakes" }, h("h4", null, o.title || "Common mistakes"));
    for (const m of o.items) {
      box.appendChild(h("div", { class: "mistake" },
        m.title ? h("div", { class: "m-title", html: m.title }) : null,
        m.wrong != null ? h("div", { class: "m-col" }, h("div", { class: "m-lab bad" }, m.wrongLabel || "Wrong"), ui.code({ code: m.wrong, nonum: true })) : null,
        m.right != null ? h("div", { class: "m-col" }, h("div", { class: "m-lab good" }, m.rightLabel || "Right"), ui.code({ code: m.right, nonum: true })) : null,
        m.why ? h("p", { class: "m-why", html: m.why }) : null));
    }
    return box;
  };

  /* A card for your own interactive widget. { title, intro, render(el, api) } */
  ui.widget = function (o, api) {
    const card = h("section", { class: "card widget" });
    if (o.title) card.appendChild(h("h3", { style: "margin:0 0 6px;font:600 16px var(--font-ui)" }, o.title));
    if (o.intro) card.appendChild(h("p", { class: "muted", style: "margin:0 0 12px", html: o.intro }));
    const body = h("div");
    card.appendChild(body);
    o.render(body, api);
    return card;
  };

  /* Mini tabs inside a page. { label, items: [{ label, blocks: [...] } | { label, render(el, api) }] } */
  ui.switch = function (o, api) {
    const wrap = h("div", { class: "switch" });
    const seg = h("div", { class: "seg", role: "group", "aria-label": o.label || "Choose a version" });
    const panes = o.items.map(() => h("div", { hidden: true }));
    const built = [];
    const show = i => {
      o.items.forEach((_, j) => { panes[j].hidden = j !== i; seg.children[j].setAttribute("aria-pressed", String(j === i)); });
      if (!built[i]) {
        built[i] = true;
        const it = o.items[i];
        if (it.render) it.render(panes[i], api); else PADS.renderBlocks(panes[i], it.blocks || [], api);
      }
    };
    o.items.forEach((it, i) => seg.appendChild(h("button", { type: "button", onclick: () => show(i) }, it.label)));
    wrap.append(seg, ...panes);
    show(o.start || 0);
    return wrap;
  };

  /* ================================================================
     Drawing toolkit: PADS.ui.draw
     ================================================================ */
  const draw = (ui.draw = {});

  /* Variables as chips. vars: { name: "shown text" }, prev: same shape (changed ones glow).
     Values are shown EXACTLY as given: write strings Python-style, e.g. { s: "'hi'" }. */
  draw.vars = function (vars, prev, opts) {
    const box = h("div", { class: "vars" });
    const keys = vars ? Object.keys(vars) : [];
    if (!keys.length) { box.appendChild(h("span", { class: "novars" }, (opts && opts.empty) || "No variables yet.")); return box; }
    for (const k of keys) {
      const v = vars[k];
      const changed = prev !== undefined && (!prev || !(k in prev) || String(prev[k]) !== String(v));
      box.appendChild(h("span", { class: "var" + (changed ? " changed" : "") }, k + " = " + (typeof v === "string" ? v : PADS.pyrepr(v))));
    }
    return box;
  };

  /* Call stack. frames: [{ name, vars, note }], first = bottom (global), last = running now. */
  draw.frames = function (frames, prevFrames) {
    const box = h("div", { class: "frames" });
    if (!frames || !frames.length) { box.appendChild(h("span", { class: "novars" }, "Nothing on the stack.")); return box; }
    frames.slice().reverse().forEach((f, ri) => {
      const i = frames.length - 1 - ri;
      const pf = prevFrames && prevFrames[i] && prevFrames[i].name === f.name ? prevFrames[i].vars : prevFrames ? null : undefined;
      box.appendChild(h("div", { class: "frame" + (ri === 0 ? " top" : "") },
        h("div", { class: "f-name" }, f.name, h("span", { class: "note" }, f.note || (ri === 0 ? "running now" : "waiting"))),
        f.vars ? draw.vars(f.vars, pf, { empty: "no variables" }) : null));
    });
    return box;
  };

  /* A list / string as numbered cells.
     values: array of shown texts.  opts: { name, marks: {i: "cmp"|"swap"|"done"|"min"|"held"|"sorted"|"dim"|"gap"|"outline"},
     ptrs: {i: "label"}, index: true, negIndex: false, quote: false, below: {i: "text"} } */
  draw.array = function (values, opts) {
    opts = opts || {};
    const marks = opts.marks || {}, ptrs = opts.ptrs || {};
    const cells = h("div", { class: "a-cells" });
    const n = values.length;
    if (!n) cells.appendChild(h("span", { class: "a-empty" }, opts.emptyText || "[ ]  (empty)"));
    values.forEach((v, i) => {
      const txt = opts.quote ? "'" + v + "'" : String(v);
      cells.appendChild(h("div", { class: "a-cell" },
        opts.index === false ? null : h("span", { class: "a-idx" }, String(i)),
        h("div", { class: "a-val" + (marks[i] ? " mk-" + marks[i].split(" ").join(" mk-") : "") }, txt === " " ? "␣" : txt),
        opts.negIndex ? h("span", { class: "a-idx" }, String(i - n)) : null,
        h("span", { class: "a-ptr" }, ptrs[i] || (opts.below && opts.below[i]) || "")));
    });
    if (!opts.name) return h("div", { class: "arr", style: "grid-template-columns:minmax(0,1fr)" }, cells);
    return h("div", { class: "arr" }, h("div", { class: "a-name" }, opts.name), cells);
  };

  /* Colour key. items: [[mark, "label"], ...] using the same mark names as draw.array. */
  draw.legend = function (items) {
    return h("div", { class: "legend" }, items.map(([m, t]) => h("span", null, h("i", { class: "mk-" + m }), t)));
  };

  /* SVG canvas. S = draw.svg({ w: 400, h: 200, label: "what it shows" }); S.box(...); el.append(S.el)
     All coordinates are in viewBox units (w × h). It scales down on small screens.
     tone: "accent" | "cmp" | "swap" | "done" | "min" | "muted" | "tile" (colours come from tokens). */
  const SVGNS = "http://www.w3.org/2000/svg";
  const s = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]); return e; };
  draw.svg = function (o) {
    o = o || {};
    const W = o.w || 400, H = o.h || 200, uid = PADS.uid("dw");
    const el = s("svg", { class: "dw", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.label || "diagram", style: `max-width:${o.maxWidth || W}px` });
    const defs = s("defs");
    ["", "accent", "cmp", "swap", "done", "min"].forEach(t => {
      const m = s("marker", { id: `${uid}-m${t}`, class: "mk" + (t ? " tone-" + t : ""), viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" });
      m.setAttribute("markerWidth", "10"); m.setAttribute("markerHeight", "10");
      m.appendChild(s("path", { d: "M0,0 L10,5 L0,10 z" }));
      defs.appendChild(m);
    });
    el.appendChild(defs);
    const cls = (base, op) => [base, op.tone ? "tone-" + op.tone : "", op.faded ? "faded" : "", op.dashed ? "dashed" : "", op.cls || ""].join(" ").trim();
    const api = {
      el, w: W, h: H,
      add(node) { el.appendChild(node); return node; },
      text(x, y, str, op) {
        op = op || {};
        const t = s("text", { x, y, "text-anchor": op.anchor || "middle", "dominant-baseline": op.baseline || "central", class: [op.muted ? "t-muted" : "", op.small ? "t-small" : "", op.ui ? "t-ui" : "", op.faded ? "faded" : "", op.cls || ""].join(" ").trim() || null, style: op.size ? `font-size:${op.size}px` : (op.weight ? `font-weight:${op.weight}` : null) });
        if (op.weight && op.size) t.setAttribute("style", `font-size:${op.size}px;font-weight:${op.weight}`);
        t.textContent = str;
        return api.add(t);
      },
      box(x, y, w, hh, op) {
        op = op || {};
        const g = s("g", { class: op.faded ? "faded" : null });
        g.appendChild(s("rect", { x, y, width: w, height: hh, rx: op.rx == null ? 8 : op.rx, class: cls("bx", Object.assign({}, op, { faded: false })) }));
        if (op.text != null) {
          const t = s("text", { x: x + w / 2, y: y + hh / 2 - (op.sub ? 8 : 0), "text-anchor": "middle", "dominant-baseline": "central", style: op.size ? `font-size:${op.size}px` : null });
          t.textContent = op.text; g.appendChild(t);
        }
        if (op.sub != null) {
          const t2 = s("text", { x: x + w / 2, y: y + hh / 2 + 11, "text-anchor": "middle", "dominant-baseline": "central", class: "t-muted" });
          t2.textContent = op.sub; g.appendChild(t2);
        }
        return api.add(g);
      },
      circle(x, y, r, op) {
        op = op || {};
        const g = s("g", { class: op.faded ? "faded" : null });
        g.appendChild(s("circle", { cx: x, cy: y, r, class: cls("bx", Object.assign({}, op, { faded: false })) }));
        if (op.text != null) { const t = s("text", { x, y, "text-anchor": "middle", "dominant-baseline": "central" }); t.textContent = op.text; g.appendChild(t); }
        return api.add(g);
      },
      line(x1, y1, x2, y2, op) { return api.add(s("line", { x1, y1, x2, y2, class: cls("ln-plain", op || {}) })); },
      path(d, op) { return api.add(s("path", { d, class: cls("ln-plain", op || {}) })); },
      /* Arrow from (x1,y1) to (x2,y2). op: { tone, dashed, faded, label, bend (px, curves the arrow) } */
      arrow(x1, y1, x2, y2, op) {
        op = op || {};
        const g = s("g", { class: op.faded ? "faded" : null });
        const t = ["accent", "cmp", "swap", "done", "min"].includes(op.tone) ? op.tone : "";
        let d, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        if (op.bend) {
          const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
          const cx = mx - (dy / len) * op.bend, cy = my + (dx / len) * op.bend;
          d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`; mx = (mx + cx) / 2; my = (my + cy) / 2;
        } else d = `M${x1},${y1} L${x2},${y2}`;
        g.appendChild(s("path", { d, class: cls("ln-plain", Object.assign({}, op, { faded: false })), "marker-end": `url(#${uid}-m${t})` }));
        if (op.label) {
          const tx = s("text", { x: mx, y: my - 9, "text-anchor": "middle", "dominant-baseline": "central", class: "t-muted" });
          tx.textContent = op.label; g.appendChild(tx);
        }
        return api.add(g);
      },
    };
    return api;
  };

  /* Name tags → value boxes (variables, aliasing, references).
     { names: [{ name, to, tone, faded }], values: [{ id, text, sub, tone, faded }], w, label } */
  draw.bindings = function (o) {
    const rows = Math.max(o.names.length, o.values.length, 1);
    const rowH = o.rowH || 56, W = o.w || 360, H = rows * rowH + 8;
    const S = draw.svg({ w: W, h: H, label: o.label || "names pointing at values" });
    const nameW = o.nameW || 92, valW = o.valW || 120, valX = W - valW - 4;
    const yOf = i => 8 + i * rowH + (rowH - 40) / 2;
    const valY = {};
    o.values.forEach((v, i) => {
      valY[v.id] = yOf(i) + 20;
      S.box(valX, yOf(i), valW, 40, { text: v.text, sub: v.sub, tone: v.tone || "tile", faded: v.faded });
    });
    o.names.forEach((n, i) => {
      const y = yOf(i);
      S.box(4, y, nameW, 40, { text: n.name, tone: n.tone || null, faded: n.faded, rx: 20 });
      if (n.to != null && valY[n.to] != null) S.arrow(4 + nameW + 4, y + 20, valX - 6, valY[n.to], { tone: n.tone || "accent", faded: n.faded, dashed: n.dashed });
    });
    return S.el;
  };

  /* Nodes and edges at positions you choose (trees, graphs, linked lists).
     { w, h, r: 20, nodes: [{ id, x, y, label, tone, faded, sub }], edges: [{ from, to, directed, label, tone, dashed, faded, bend }] } */
  draw.graph = function (o) {
    const S = draw.svg({ w: o.w || 400, h: o.h || 240, label: o.label || "graph" });
    const R = o.r || 20, at = {};
    o.nodes.forEach(n => (at[n.id] = n));
    (o.edges || []).forEach(e => {
      const a = at[e.from], b = at[e.to];
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const ra = a.r || R, rb = b.r || R;
      const x1 = a.x + (dx / len) * ra, y1 = a.y + (dy / len) * ra, x2 = b.x - (dx / len) * (rb + (e.directed ? 2 : 0)), y2 = b.y - (dy / len) * (rb + (e.directed ? 2 : 0));
      if (e.directed) S.arrow(x1, y1, x2, y2, e);
      else { S.line(x1, y1, x2, y2, e); if (e.label) S.text((x1 + x2) / 2, (y1 + y2) / 2 - 9, e.label, { muted: true }); }
    });
    o.nodes.forEach(n => {
      S.circle(n.x, n.y, n.r || R, { text: n.label != null ? n.label : n.id, tone: n.tone, faded: n.faded, dashed: n.dashed });
      if (n.sub) S.text(n.x, n.y + (n.r || R) + 12, n.sub, { muted: true });
    });
    return S.el;
  };

  /* ================================================================
     Code stepper (the signature component)
     ================================================================ */
  /* opts: {
       title, intro (HTML),
       code: "python source" | [lines],
       what: { lineNo: "what this line does" },            // default explanation per line
       steps: [{ line, now, what?, vars?, frames?, print?, ...anything your visual needs }],
       visual(el, step, ctx)  // optional: draw your own picture for this step; el is emptied first
       visualTitle, legend: [[mark, label]], varsTitle, start: 0, speed: 3
     }
     - vars: { name: "text" } shown exactly as written; omit `vars` to keep the previous step's vars.
     - frames: [{ name, vars, note }] bottom → top; omit to keep the previous step's frames.
     - print: text this step prints (one line or several); the Output panel builds up automatically.
     - line: 1-based line to highlight; 0/null = no line (e.g. "before we start").                 */
  ui.stepper = function (o, api) {
    const lines = PADS.lines(o.code);
    const raw = o.steps || [];
    if (!raw.length) return h("p", { class: "muted" }, "(stepper has no steps)");
    // resolve inherited vars/frames and cumulative output
    const steps = [];
    let vars = null, frames = null, out = [];
    raw.forEach((st, i) => {
      if ("vars" in st) vars = st.vars;
      if ("frames" in st) frames = st.frames;
      const newOut = st.print != null ? String(st.print).split("\n") : [];
      out = out.concat(newOut);
      steps.push(Object.assign({}, st, { _vars: vars, _frames: frames, _out: out.slice(), _new: newOut.length, _i: i }));
    });
    const hasOut = raw.some(st => st.print != null) || o.output;
    const hasFrames = raw.some(st => st.frames);
    const hasVars = raw.some(st => st.vars) || !hasFrames;

    const root = h("section", { class: "stepper", tabindex: "0", "aria-label": (o.title || "Code stepper") + ". Use the left and right arrow keys to step." });
    const head = h("div", { class: "st-head" },
      h("h3", { class: "st-title" }, o.title || "Step through the code"),
      h("p", { class: "st-keys" }, "Click here, then ", h("kbd", null, "←"), " ", h("kbd", null, "→"), " to step, ", h("kbd", null, "Space"), " to play"));
    root.appendChild(head);
    if (o.intro) root.appendChild(h("p", { class: "muted", style: "margin:0", html: o.intro }));

    const bReset = btn(null, { "aria-label": "Back to the start", title: "Back to the start", html: ICON.first });
    const bBack = btn(null, { html: ICON.back + "Back" });
    const bPlay = btn(null, { class: "btn primary", html: ICON.play + "Play", style: "min-width:92px" });
    const bNext = btn(null, { html: "Step" + ICON.next });
    const counter = h("span", { class: "st-counter", "aria-live": "polite" });
    const scrub = h("input", { type: "range", class: "st-scrub", min: "0", max: String(steps.length - 1), value: "0", "aria-label": "Jump to step" });
    const speedId = PADS.uid("spd");
    const speed = h("input", { type: "range", class: "st-speed", id: speedId, min: "1", max: "5", value: String(o.speed || 3) });
    root.appendChild(h("div", { class: "st-controls" },
      h("div", { class: "grp" }, bReset, bBack, bPlay, bNext), counter, scrub,
      h("div", { class: "grp" }, h("label", { for: speedId }, "Speed"), speed)));

    const codeEl = h("div", { class: "code", role: "region", "aria-label": "Python code" });
    codeEl.innerHTML = lines.map((l, i) => `<div class="ln" data-l="${i + 1}"><span class="no">${l === "" ? "" : i + 1}</span><span>${PADS.highlight(l) || " "}</span></div>`).join("");
    const lineLabel = h("p", { class: "eyebrow st-line" });
    const lineCode = h("div", { class: "st-linecode" });
    const what = h("p", { class: "st-what" });
    const now = h("p", { class: "st-now" });
    const fin = h("span", { class: "st-done", hidden: true }, "Done");
    const explain = h("div", { class: "st-card" }, lineLabel, lineCode, what, h("p", { class: "eyebrow" }, "Right now"), now, fin);
    const visBody = h("div");
    const visCard = o.visual ? h("div", { class: "st-card" }, o.visualTitle ? h("p", { class: "eyebrow" }, o.visualTitle) : null, visBody, o.legend ? h("div", { style: "margin-top:10px" }, draw.legend(o.legend)) : null) : null;
    const varsBody = h("div");
    const varsCard = hasVars ? h("div", { class: "st-card" }, h("p", { class: "eyebrow" }, o.varsTitle || "Variables"), varsBody) : null;
    const framesBody = h("div");
    const framesCard = hasFrames ? h("div", { class: "st-card" }, h("p", { class: "eyebrow" }, "Call stack (newest on top)"), framesBody) : null;
    const outBody = h("pre", { class: "st-out" });
    const outCard = hasOut ? h("div", { class: "st-card" }, h("p", { class: "eyebrow" }, "Output"), outBody) : null;
    const codeCol = h("div", { class: "st-codecol" }, codeEl, o.below ? PADS.html(o.below, "prose small muted") : null);
    const sideCol = h("div", { class: "st-sidecol" }, explain, visCard, varsCard, framesCard, outCard);
    root.appendChild(h("div", { class: "st-main" }, codeCol, sideCol));

    let k = Math.min(o.start || 0, steps.length - 1), timer = null;
    const speeds = [1500, 1100, 750, 450, 220];

    function render() {
      const st = steps[k], prev = steps[k - 1];
      codeEl.querySelectorAll(".ln").forEach(el => el.classList.toggle("active", +el.dataset.l === st.line));
      if (st.line) {
        lineLabel.textContent = "Line " + st.line;
        lineCode.hidden = false;
        lineCode.innerHTML = PADS.highlight((lines[st.line - 1] || "").trim());
      } else { lineLabel.textContent = st.label || (k === 0 ? "Before the code runs" : "After the code"); lineCode.hidden = true; }
      what.innerHTML = st.what || (o.what && o.what[st.line]) || "";
      what.hidden = !what.innerHTML;
      now.innerHTML = st.now || "";
      fin.hidden = k !== steps.length - 1;
      if (varsCard) { varsBody.replaceChildren(draw.vars(st._vars, prev ? prev._vars : undefined)); }
      if (framesCard) { framesBody.replaceChildren(draw.frames(st._frames, prev ? prev._frames : undefined)); }
      if (outCard) {
        const o2 = st._out, nNew = st._new;
        if (!o2.length) outBody.innerHTML = '<span class="none">(nothing printed yet)</span>';
        else outBody.innerHTML = o2.map((l, i) => i >= o2.length - nNew ? `<span class="new">${esc(l)}</span>` : esc(l)).join("\n");
      }
      if (visCard) {
        visBody.replaceChildren();
        try { o.visual(visBody, st, { index: k, steps, prev, ui, h, draw, api }); }
        catch (e) { console.error("[PADS] stepper visual failed at step " + k, e); visBody.textContent = "(visual error, see console)"; }
      }
      counter.textContent = `Step ${k + 1} / ${steps.length}`;
      scrub.value = String(k);
      bBack.disabled = k === 0;
      bNext.disabled = k === steps.length - 1;
    }
    function stop() { if (timer) clearInterval(timer); timer = null; bPlay.innerHTML = ICON.play + "Play"; }
    function play() {
      if (timer) return stop();
      if (k === steps.length - 1) k = 0;
      bPlay.innerHTML = ICON.pause + "Pause";
      timer = setInterval(() => {
        if (!root.isConnected) return stop();
        if (k < steps.length - 1) { k++; render(); } else stop();
      }, speeds[+speed.value - 1]);
      render();
    }
    const go = n => { stop(); k = Math.max(0, Math.min(steps.length - 1, n)); render(); };
    bNext.onclick = () => go(k + 1);
    bBack.onclick = () => go(k - 1);
    bReset.onclick = () => go(0);
    bPlay.onclick = play;
    scrub.oninput = () => go(+scrub.value);
    speed.oninput = () => { if (timer) { stop(); play(); } };
    root.addEventListener("keydown", e => {
      const t = e.target;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return; // sliders keep their own arrows
      if (e.key === "ArrowRight") { e.preventDefault(); go(k + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(k - 1); }
      else if (e.key === "Home") { e.preventDefault(); go(0); }
      else if (e.key === "End") { e.preventDefault(); go(steps.length - 1); }
      else if ((e.key === " " || e.key === "Spacebar") && t === root) { e.preventDefault(); play(); }
    });
    if (api && api.onCleanup) api.onCleanup(stop);
    render();
    root.stepTo = go;
    return root;
  };

  /* ================================================================
     Code editor (used by Try it)
     ================================================================ */
  ui.editor = function (o) {
    o = o || {};
    const ta = h("textarea", { spellcheck: "false", autocapitalize: "off", autocomplete: "off", autocorrect: "off", wrap: "off", "aria-label": o.label || "Python code (editable). Tab indents; press Escape, then Tab, to leave." });
    const pre = h("pre", { "aria-hidden": "true" });
    const gutter = h("div", { class: "ed-gutter", "aria-hidden": "true" });
    const el = h("div", { class: "ed" }, gutter, h("div", { class: "ed-scroll" }, h("div", { class: "ed-area" }, pre, ta)));
    let errLine = null, escaped = false;
    function sync() {
      pre.innerHTML = PADS.highlight(ta.value) + " ";
      const n = ta.value.split("\n").length;
      let g = "";
      for (let i = 1; i <= n; i++) g += (i === errLine ? `<span class="err">${i}</span>` : i) + (i < n ? "\n" : "");
      gutter.innerHTML = g;
    }
    function insert(text) {
      ta.focus();
      if (!document.execCommand || !document.execCommand("insertText", false, text)) {
        ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end");
        sync();
      }
    }
    ta.addEventListener("input", () => { errLine = null; sync(); });
    ta.addEventListener("blur", () => { escaped = false; });
    ta.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); o.onRun && o.onRun(); return; }
      if (e.key === "Escape") { escaped = true; return; }
      if (e.key === "Tab" && !escaped) {
        e.preventDefault();
        const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;
        const ls = v.lastIndexOf("\n", a - 1) + 1;
        if (e.shiftKey || a !== b) {
          // indent / dedent every selected line
          const le = v.indexOf("\n", b - (b > a && v[b - 1] === "\n" ? 1 : 0)); const end = le < 0 ? v.length : le;
          const block = v.slice(ls, end);
          const changed = block.split("\n").map(l => e.shiftKey ? l.replace(/^ {1,4}/, "") : "    " + l).join("\n");
          ta.setSelectionRange(ls, end);
          insert(changed);
          ta.setSelectionRange(ls, ls + changed.length);
        } else insert("    ");
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        const v = ta.value, a = ta.selectionStart;
        const ls = v.lastIndexOf("\n", a - 1) + 1;
        const line = v.slice(ls, a);
        let ind = line.match(/^ */)[0];
        if (/:\s*(#.*)?$/.test(line)) ind += "    ";
        else if (/^\s*(return|break|continue|pass|raise)\b/.test(line)) ind = ind.slice(4);
        e.preventDefault();
        insert("\n" + ind);
        return;
      }
      if (e.key === "Backspace" && ta.selectionStart === ta.selectionEnd) {
        const v = ta.value, a = ta.selectionStart, ls = v.lastIndexOf("\n", a - 1) + 1;
        const before = v.slice(ls, a);
        if (before.length >= 4 && /^ +$/.test(before) && before.length % 4 === 0) {
          e.preventDefault(); ta.setSelectionRange(a - 4, a); insert("");
        }
      }
    });
    const api = {
      el, textarea: ta,
      get: () => ta.value,
      set(v) { ta.value = v; errLine = null; sync(); },
      markError(line) { errLine = line || null; sync(); },
      focus: () => ta.focus(),
    };
    api.set(PADS.dedent(o.code || ""));
    return api;
  };

  /* ================================================================
     Try it: editable code + Run (Pyodide)
     ================================================================ */
  const FRIENDLY = {
    SyntaxError: "Python could not even read this line, so nothing ran. Look for a missing <code>:</code>, a bracket or quote that is not closed, or <code>=</code> where you meant <code>==</code>.",
    IndentationError: "The spaces at the start of a line are wrong. Lines inside an <code>if</code>, loop or <code>def</code> need 4 more spaces than the line with the <code>:</code>.",
    NameError: "Python does not know this name. Check the spelling, and check that the variable is made <i>before</i> this line runs.",
    TypeError: "You used a value of the wrong type here, for example <code>'5' + 1</code> (text plus number) or calling something with the wrong number of arguments.",
    ValueError: "The type is right but the value is not, for example <code>int('abc')</code>.",
    IndexError: "You asked for a position that does not exist. The last index is <code>len(x) - 1</code>.",
    KeyError: "That key is not in the dictionary.",
    ZeroDivisionError: "You divided by zero.",
    UnboundLocalError: "You assign to this name somewhere in the function, so Python treats it as local everywhere in it, but you read it before giving it a value.",
    AttributeError: "This object does not have that method or attribute. Check the spelling, or the type of the object.",
    EOFError: "Your code called <code>input()</code> more times than there are lines in the typed-input box.",
    RecursionError: "The function kept calling itself and never reached a base case.",
    AssertionError: "An <code>assert</code> was False.",
    ModuleNotFoundError: "That module is not available here.",
  };
  ui.friendlyError = FRIENDLY;

  const normOut = s => String(s).replace(/\r/g, "").split("\n").map(l => l.replace(/\s+$/, "")).join("\n").replace(/^\n+|\n+$/g, "");

  /* opts: { title, task (HTML), code, stdin, packages: ["numpy"], checks: [["call(…)", "expected"]], test: "python asserts",
             expectOutput: "exact printed text", hint (HTML), solution (code), solutionNote (HTML), onResult(passed, result) } */
  ui.tryit = function (o, api) {
    o = o || {};
    const root = h("section", { class: "tryit" });
    const ed = ui.editor({ code: o.code || "", onRun: () => run() });
    const bRun = btn(null, { class: "btn primary", html: ICON.play + "Run", title: "Run (Ctrl/Cmd + Enter)" });
    const bStop = btn(null, { html: ICON.stop + "Stop", hidden: true });
    const bReset = btn(null, { class: "btn ghost small", html: ICON.reset + "Reset code", title: "Put the starting code back" });
    const status = h("span", { class: "status", "aria-live": "polite" });
    const bar = h("div", { class: "ti-bar" }, bRun, bStop, status, h("span", { style: "flex:1" }), bReset);
    const head = h("div", { class: "ti-head" }, h("h3", { class: "ti-title" }, o.title || "Run it yourself"),
      h("span", { class: "small muted" }, h("kbd", null, "Ctrl"), " + ", h("kbd", null, "Enter"), " runs"));
    root.appendChild(head);
    if (o.task) root.appendChild(h("div", { class: "ti-task", html: o.task }));
    const body = h("div", { class: "ti-body" });
    root.appendChild(body);
    body.appendChild(ed.el);
    let stdin = null;
    if (o.stdin != null) {
      const id = PADS.uid("stdin");
      stdin = h("textarea", { class: "input", id, rows: String(Math.max(1, String(o.stdin).split("\n").length)), spellcheck: "false" });
      stdin.value = o.stdin;
      body.appendChild(h("div", { class: "ti-stdin" }, h("label", { for: id }, "Typed input: what you would type for each input(), one line each"), stdin));
    }
    body.appendChild(bar);
    const outWrap = h("div", { class: "ti-result", hidden: true, style: "display:grid;gap:8px" });
    const outPre = h("pre", { class: "ti-out", "aria-live": "polite" });
    outWrap.appendChild(outPre);
    const extra = h("div", { style: "display:grid;gap:8px" });
    outWrap.appendChild(extra);
    body.appendChild(outWrap);

    // hint + model answer
    let reveal = null;
    if (o.hint || o.solution) {
      const rbar = h("div", { class: "q-actions" });
      const rbox = h("div", { style: "display:grid;gap:8px" });
      if (o.hint) rbar.appendChild(btn("Hint", { class: "btn small", onclick: e => { e.currentTarget.disabled = true; rbox.prepend(h("div", { class: "q-fb hint", html: "<b>Hint:</b> " + o.hint })); } }));
      if (o.solution) rbar.appendChild(btn("Show model answer", {
        class: "btn small", onclick: e => {
          e.currentTarget.disabled = true;
          const use = btn("Put it in the editor", { class: "btn small", onclick: () => { ed.set(PADS.dedent(o.solution)); ed.focus(); } });
          rbox.appendChild(h("div", { class: "q-fb info" }, h("p", null, h("b", null, "Model answer")), ui.code({ code: o.solution }), o.solutionNote ? h("div", { html: o.solutionNote, style: "margin-top:6px" }) : null, h("div", { style: "margin-top:8px" }, use)));
          if (o.onReveal) o.onReveal();
        }
      }));
      reveal = h("div", { class: "reveal" }, rbar, rbox);
      body.appendChild(reveal);
    }

    let slowTimer = null;
    function setRunning(on) {
      bRun.disabled = on; bStop.hidden = !on;
      if (!on) { clearTimeout(slowTimer); }
    }
    function addOut(text, stream) {
      if (stream === "err") outPre.appendChild(h("span", { class: "err" }, text));
      else if (stream === "sys") outPre.appendChild(h("span", { class: "sys" }, text));
      else outPre.appendChild(document.createTextNode(text));
      outPre.scrollTop = outPre.scrollHeight;
    }

    async function run() {
      if (bRun.disabled) return;
      outWrap.hidden = false; outPre.replaceChildren(); extra.replaceChildren(); ed.markError(null);
      setRunning(true);
      status.textContent = PADS.py.state() === "idle" ? "Loading Python… (first time only, about 10 MB)" : "Running…";
      slowTimer = setTimeout(() => { status.textContent = PADS.py.state() === "loading" ? "Still loading Python… (slow connection?)" : "Still running… If it never ends, a loop may be infinite. Press Stop."; }, 6000);
      const res = await PADS.py.run(ed.get(), {
        stdin: stdin ? stdin.value : "",
        packages: o.packages, checks: o.checks, test: o.test,
        onOutput: addOut,
        onStatus: st => { if (st === "running") status.textContent = "Running…"; },
      });
      setRunning(false);
      status.textContent = "";
      const passed = showResult(res);
      if (o.onResult) o.onResult(passed, res);
    }
    bRun.onclick = run;
    bStop.onclick = () => {
      PADS.py.stop();
    };
    bReset.onclick = () => { ed.set(PADS.dedent(o.code || "")); outWrap.hidden = true; };

    function showResult(res) {
      if (res.status === "offline") {
        outPre.hidden = true;
        extra.appendChild(h("div", { class: "q-fb no", html: "<p><b>Python could not load.</b> The first run needs internet: it downloads Python from cdn.jsdelivr.net (about 10 MB), then your browser keeps a copy.</p><p>You can still read the code, step through the visuals and open the model answer.</p>" }));
        return undefined;
      }
      outPre.hidden = false;
      if (res.status === "busy") { extra.appendChild(h("div", { class: "q-fb no", text: res.error.message })); return undefined; }
      if (res.status === "stopped") {
        addOut("\n■ Stopped.", "sys");
        extra.appendChild(h("div", { class: "q-fb hint", html: "Stopped. If it would have run forever, check that something in your loop changes so the condition can become False (or that a <code>break</code> is reached)." }));
        return false;
      }
      if (!res.stdout && !res.stderr && !res.error) outPre.appendChild(h("span", { class: "sys" }, "(ran fine, printed nothing)"));
      if (res.error) {
        const e = res.error;
        if (e.line) ed.markError(e.line);
        const friendly = FRIENDLY[e.type];
        const box = h("div", { class: "ti-errbox" },
          h("div", { html: `<b>${esc(e.type)}</b>${e.line ? " on line " + e.line : ""}: ${esc(e.message || "")}` }),
          friendly ? h("div", { class: "small", style: "margin-top:4px", html: friendly }) : null,
          e.trace ? h("details", { style: "margin-top:6px" }, h("summary", { class: "small muted" }, "Full traceback (read it bottom-up)"), h("pre", { class: "ti-out", style: "margin-top:6px" }, e.trace)) : null);
        extra.appendChild(box);
        return (o.checks || o.test || o.expectOutput != null) ? false : undefined;
      }
      let verdict = undefined;
      if (res.checks) {
        const ok = res.checks.filter(c => c.ok).length;
        const list = h("div", { class: "ti-checks" });
        res.checks.forEach(c => {
          list.appendChild(h("div", { class: "ti-check " + (c.ok ? "ok" : "no") },
            h("span", { class: "mark" }, c.ok ? "✓" : "✗"),
            c.call + "  →  " + c.got + (c.ok ? "" : "   (expected " + c.want + ")"),
            c.note === "none" ? h("span", { class: "hint", html: "It gave back <code>None</code>. Did you <code>print</code> instead of <code>return</code>, or forget the <code>return</code> line?" }) : null,
            c.note === "crashed" ? h("span", { class: "hint" }, "It crashed when called like this.") : null));
        });
        verdict = ok === res.checks.length;
        extra.appendChild(h("div", { class: "ti-verdict " + (verdict ? "ok" : "no") }, verdict ? `All ${ok} checks passed.` : `${ok} of ${res.checks.length} checks passed.`));
        extra.appendChild(list);
      }
      if (o.test) {
        const ok = !res.testError;
        extra.appendChild(h("div", { class: "ti-verdict " + (ok ? "ok" : "no") }, ok ? "Test passed." : "Test failed: " + res.testError));
        verdict = (verdict === undefined ? true : verdict) && ok;
      }
      if (o.expectOutput != null) {
        const ok = normOut(res.stdout) === normOut(o.expectOutput);
        extra.appendChild(h("div", { class: "ti-verdict " + (ok ? "ok" : "no") }, ok ? "Output matches." : "Output is not what was expected yet."));
        if (!ok) extra.appendChild(h("div", { class: "small muted" }, "Expected:", h("pre", { class: "ti-out", style: "margin-top:4px" }, o.expectOutput)));
        verdict = (verdict === undefined ? true : verdict) && ok;
      }
      return verdict;
    }

    if (api && api.onCleanup) api.onCleanup(() => { if (!bStop.hidden) PADS.py.stop(); });
    root.editor = ed;
    root.run = run;
    return root;
  };

  /* ================================================================
     Quiz
     ================================================================ */
  /* ui.quiz({ key: "subject/topic", questions: [...] , title })
     Question types (all have: q (HTML), hint (HTML), explain (HTML)):
       mc       { options: [HTML...], answer: index, code? }
       predict  { code, answer: "printed text" | [accepted...] }  or  { code, options: [plain text...], answer: index }
       bug      { code, bugs: [lineNos], notes: { lineNo: "what is wrong" }, fixed: "corrected code" }
       write    { starter, checks: [["call", "expected"]], test?, expectOutput?, solution, stdin?, packages? }
       explain  { answer: HTML model answer, points: ["key point", ...] }   (self-marked)              */
  const KIND_LABEL = { mc: "Multiple choice", predict: "Predict the output", bug: "Find the bug", write: "Write it", explain: "Explain" };
  const norm = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

  ui.quiz = function (o, api) {
    const key = "quiz:" + o.key;
    const qs = o.questions || [];
    let state = PADS.store.get(key, {}) || {};
    const root = h("section", { class: "quiz", id: "quiz" });
    const scoreEl = h("span", { class: "quiz-score", "aria-live": "polite" });
    const bResetQ = btn("Reset quiz", { class: "btn small ghost" });
    root.appendChild(h("div", { class: "quiz-head" }, h("h2", { class: "sec-h", style: "border:0;padding:0;margin:0" }, o.title || "Check yourself", h("small", null, "Exam-style questions. Your score is saved in this browser.")), h("div", { class: "row-wrap" }, scoreEl, bResetQ)));
    const list = h("div", { style: "display:grid;gap:14px" });
    root.appendChild(list);

    function updateScore() {
      const n = qs.filter((_, i) => state[i] === 1).length;
      scoreEl.innerHTML = `Score: <b>${n} / ${qs.length}</b><span class="bar"><i style="width:${qs.length ? (100 * n / qs.length) : 0}%"></i></span>`;
      document.dispatchEvent(new CustomEvent("pads:progress", { detail: { key: o.key } }));
    }
    function solved(i, card, stateEl) {
      state[i] = 1;
      PADS.store.set(key, state);
      card.classList.add("right");
      stateEl.textContent = "✓ Solved"; stateEl.className = "q-state ok";
      updateScore();
    }
    function build() {
      list.replaceChildren();
      qs.forEach((q, i) => {
        try { list.appendChild(buildQ(q, i)); }
        catch (e) { console.error("[PADS] quiz question " + (i + 1) + " failed", e); list.appendChild(h("p", { class: "muted" }, "(question " + (i + 1) + " could not be shown)")); }
      });
      updateScore();
    }
    bResetQ.onclick = () => { state = {}; PADS.store.set(key, state); build(); };

    function buildQ(q, i) {
      const type = q.type || (q.options ? "mc" : "predict");
      const stateEl = h("span", { class: "q-state" }, state[i] === 1 ? "✓ Solved before" : "");
      if (state[i] === 1) stateEl.className = "q-state ok";
      const card = h("article", { class: "q" + (state[i] === 1 ? " right" : "") });
      card.appendChild(h("div", { class: "q-top" }, h("span", { class: "q-num" }, "Q" + (i + 1)), h("span", { class: "q-kind" }, q.kindLabel || KIND_LABEL[type] || type), stateEl));
      card.appendChild(h("div", { class: "q-text", html: q.q || "" }));
      const fb = h("div", { style: "display:grid;gap:8px" });
      const actions = h("div", { class: "q-actions" });
      const done = () => solved(i, card, stateEl);
      let hintShown = false;
      const showHint = () => { if (hintShown || !q.hint) return; hintShown = true; fb.prepend(h("div", { class: "q-fb hint", html: "<b>Hint:</b> " + q.hint })); };
      const explainBox = (ok, extraHtml) => h("div", { class: "q-fb " + (ok === true ? "ok" : ok === false ? "no" : "info"), html: (extraHtml || "") + (q.explain ? "<p>" + q.explain + "</p>" : "") });
      const bHint = q.hint ? btn("Hint", { class: "btn small", onclick: () => { showHint(); bHint.disabled = true; } }) : null;

      if (type === "mc" || (type === "predict" && q.options)) {
        if (q.code) card.appendChild(ui.code({ code: q.code }));
        const opts = h("div", { class: "q-opts", role: "group", "aria-label": "Answer options" });
        let answered = false;
        q.options.forEach((opt, j) => {
          const b = h("button", { type: "button", class: "q-opt" + (type === "predict" ? " code-opt" : "") }, h("span", { class: "k" }, String.fromCharCode(65 + j)));
          const lab = h("span");
          if (type === "predict") lab.textContent = opt; else lab.innerHTML = opt;
          b.appendChild(lab);
          b.onclick = () => {
            if (answered) return;
            fb.querySelectorAll(".q-fb.no.try").forEach(x => x.remove());
            if (j === q.answer) {
              answered = true;
              b.classList.add("picked-ok");
              opts.querySelectorAll(".q-opt").forEach(x => (x.disabled = true));
              fb.appendChild(explainBox(true, "<p><b>Right.</b></p>"));
              done();
            } else {
              b.classList.add("picked-bad"); b.disabled = true;
              const tries = opts.querySelectorAll(".picked-bad").length;
              const msg = h("div", { class: "q-fb no try", html: "<b>Not this one.</b> " + (q.wrong && q.wrong[j] ? q.wrong[j] : "Try again" + (q.hint && tries === 1 ? ", or open the hint." : ".")) });
              fb.appendChild(msg);
              if (tries >= 2) showHint();
            }
          };
          opts.appendChild(b);
        });
        card.appendChild(opts);
        const bShow = btn("Show answer", { class: "btn small ghost", onclick: () => {
          if (answered) return; answered = true;
          opts.children[q.answer].classList.add("is-answer");
          opts.querySelectorAll(".q-opt").forEach(x => (x.disabled = true));
          fb.querySelectorAll(".q-fb.no.try").forEach(x => x.remove());
          fb.appendChild(explainBox(null, "<p><b>Answer: " + String.fromCharCode(65 + q.answer) + ".</b></p>"));
        } });
        actions.append(...[bHint, bShow].filter(Boolean));
      }

      else if (type === "predict") {
        card.appendChild(ui.code({ code: q.code }));
        const id = PADS.uid("pred");
        const ans = h("textarea", { class: "input", id, rows: "2", spellcheck: "false", placeholder: "Type exactly what Python prints", "aria-label": "Your prediction of the output" });
        const bCheck = btn("Check", { class: "btn primary small" });
        card.appendChild(h("div", { class: "q-answer" }, ans, bCheck));
        const accepted = (Array.isArray(q.answer) ? q.answer : [q.answer]).map(norm);
        let tries = 0, finished = false;
        const check = () => {
          if (finished) return;
          fb.querySelectorAll(".try").forEach(x => x.remove());
          const v = norm(ans.value);
          if (!v) return;
          if (accepted.includes(v)) {
            finished = true;
            fb.appendChild(explainBox(true, "<p><b>Right.</b> Python prints:</p><pre class='ti-out'>" + esc(Array.isArray(q.answer) ? q.answer[0] : q.answer) + "</pre>"));
            done();
          } else {
            tries++;
            fb.appendChild(h("div", { class: "q-fb no try", html: "<b>Not quite.</b> " + (tries === 1 ? "Read it line by line and try again." : "Check the hint, or show the answer.") + (q.caseNote ? " " + q.caseNote : "") }));
            if (tries >= 2) showHint();
          }
        };
        bCheck.onclick = check;
        ans.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); check(); } });
        const bShow = btn("Show answer", { class: "btn small ghost", onclick: () => {
          if (finished) return; finished = true;
          fb.querySelectorAll(".try").forEach(x => x.remove());
          fb.appendChild(explainBox(null, "<p><b>Python prints:</b></p><pre class='ti-out'>" + esc(Array.isArray(q.answer) ? q.answer[0] : q.answer) + "</pre>"));
        } });
        actions.append(...[bHint, bShow].filter(Boolean));
        if (q.tryit !== false) actions.appendChild(btn("Run it to see", { class: "btn small ghost", onclick: e => {
          e.currentTarget.disabled = true;
          card.appendChild(ui.tryit({ title: "Run the code", code: q.code, stdin: q.stdin, packages: q.packages }, api));
        } }));
      }

      else if (type === "bug") {
        const lines = PADS.lines(q.code);
        const bugs = new Set(q.bugs || []);
        const codeEl = h("div", { class: "code bugcode", role: "group", "aria-label": "Code. Click every line that has a bug." });
        const picked = new Set();
        lines.forEach((l, j) => {
          const n = j + 1;
          const row = h("div", { class: "ln", role: "checkbox", "aria-checked": "false", tabindex: "0", "aria-label": "Line " + n + ": " + l.trim() });
          row.innerHTML = `<span class="no">${n}</span><span>${PADS.highlight(l) || " "}</span>`;
          const flag = h("span", { class: "flag" });
          row.appendChild(flag);
          const toggle = () => {
            if (finished) return;
            if (picked.has(n)) picked.delete(n); else picked.add(n);
            row.setAttribute("aria-checked", String(picked.has(n)));
            flag.textContent = picked.has(n) ? "← bug?" : "";
          };
          row.onclick = toggle;
          row.onkeydown = e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } };
          codeEl.appendChild(row);
        });
        card.appendChild(h("p", { class: "small muted", style: "margin:0" }, "Click every line that has a bug (click again to unmark), then press Check."));
        card.appendChild(codeEl);
        let finished = false, tries = 0;
        const markAll = () => {
          codeEl.querySelectorAll(".ln").forEach((row, j) => {
            const n = j + 1;
            row.classList.toggle("bad", bugs.has(n));
            row.querySelector(".flag").textContent = bugs.has(n) ? (q.notes && q.notes[n] ? q.notes[n] : "bug") : "";
            row.setAttribute("aria-checked", String(bugs.has(n)));
          });
        };
        const reveal = ok => {
          finished = true;
          markAll();
          const extra = (ok ? "<p><b>Right: " + (bugs.size === 1 ? "line " : "lines ") + [...bugs].join(", ") + ".</b></p>" : "<p><b>The buggy " + (bugs.size === 1 ? "line is " : "lines are ") + [...bugs].join(", ") + ".</b></p>")
            + (q.notes ? "<ul>" + [...bugs].map(n => `<li>Line ${n}: ${q.notes[n] || ""}</li>`).join("") + "</ul>" : "");
          const box = explainBox(ok ? true : null, extra);
          if (q.fixed) { box.appendChild(h("p", { style: "margin-top:8px" }, h("b", null, "Fixed code"))); box.appendChild(ui.code({ code: q.fixed })); }
          fb.appendChild(box);
          if (ok) done();
        };
        const bCheck = btn("Check", { class: "btn primary small", onclick: () => {
          if (finished) return;
          fb.querySelectorAll(".try").forEach(x => x.remove());
          if (!picked.size) { fb.appendChild(h("div", { class: "q-fb no try" }, "Click at least one line first.")); return; }
          const hit = [...picked].filter(n => bugs.has(n)).length, wrong = [...picked].filter(n => !bugs.has(n));
          if (hit === bugs.size && !wrong.length) return reveal(true);
          tries++;
          let msg = `<b>Not yet.</b> You found ${hit} of ${bugs.size} buggy line${bugs.size > 1 ? "s" : ""}.`;
          if (wrong.length) msg += ` Line${wrong.length > 1 ? "s" : ""} ${wrong.join(", ")} ${wrong.length > 1 ? "are" : "is"} fine.`;
          fb.appendChild(h("div", { class: "q-fb no try", html: msg }));
          if (tries >= 2) showHint();
        } });
        actions.append(...[bCheck, bHint, btn("Show answer", { class: "btn small ghost", onclick: () => { if (!finished) { fb.querySelectorAll(".try").forEach(x => x.remove()); reveal(false); } } })].filter(Boolean));
      }

      else if (type === "write") {
        let passedOnce = false;
        const t = ui.tryit({
          title: q.title || "Write it", code: q.starter || "", stdin: q.stdin, packages: q.packages,
          checks: q.checks, test: q.test, expectOutput: q.expectOutput,
          solution: q.solution, solutionNote: q.explain,
          onResult: passed => { if (passed && !passedOnce) { passedOnce = true; fb.appendChild(explainBox(true, "<p><b>All checks pass. Nice.</b> Compare with the model answer below if you like.</p>")); done(); } },
          onReveal: () => { if (!passedOnce && state[i] !== 1) actions.appendChild(btn("I solved it on paper", { class: "btn small ghost", title: "Use this if Python can't load, or you checked your answer by hand", onclick: e => { e.currentTarget.remove(); done(); } })); },
        }, api);
        card.appendChild(t);
        if (bHint) actions.appendChild(bHint);
      }

      else if (type === "explain") {
        const ta = h("textarea", { class: "input", rows: "4", style: "width:100%;font-family:var(--font-ui)", placeholder: "Write your answer in plain words, as you would in the exam's Markdown cell.", "aria-label": "Your explanation" });
        card.appendChild(ta);
        let shown = false;
        const bShow = btn("Compare with model answer", { class: "btn primary small", onclick: () => {
          if (shown) return; shown = true; bShow.disabled = true;
          const box = h("div", { class: "q-fb info", html: "<p><b>Model answer</b></p>" + (q.answer || "") + (q.points ? "<p style='margin-top:8px'><b>Did you mention…</b></p><ul>" + q.points.map(p => "<li>" + p + "</li>").join("") + "</ul>" : "") });
          const self = h("div", { class: "q-actions", style: "margin-top:8px" },
            btn("I had the key points", { class: "btn small", onclick: () => { self.remove(); done(); } }),
            btn("Not yet", { class: "btn small ghost", onclick: () => { self.replaceWith(h("p", { class: "small muted" }, "Fine. Read the model answer again and retry later.")); } }));
          box.appendChild(self);
          fb.appendChild(box);
        } });
        actions.append(...[bShow, bHint].filter(Boolean));
      }

      card.appendChild(actions);
      card.appendChild(fb);
      return card;
    }

    build();
    return root;
  };

  /* Score helpers for the app (side menu, home page). */
  PADS.quizScore = function (key, total) {
    const st = PADS.store.get("quiz:" + key, {}) || {};
    let n = 0;
    for (let i = 0; i < total; i++) if (st[i] === 1) n++;
    return n;
  };

  /* ================================================================
     Block renderer: turns topic.blocks into DOM
     ================================================================ */
  /* Each block is one of:
       "html string"                          → paragraphs etc. (wrapped in .prose)
       a DOM Node                             → appended as is
       function (api) → Node | string         → called, result appended
       { type: "h" | "text" | "callout" | "code" | "table" | "mistakes" | "stepper" | "tryit" | "widget" | "switch" | "quiz", ...opts }
                                              → api.ui[type](opts, api)                                                  */
  PADS.renderBlocks = function (el, blocks, api) {
    for (const b of blocks || []) {
      let node = null;
      try {
        if (b == null || b === false) continue;
        if (typeof b === "string") node = PADS.html(b, "prose");
        else if (b instanceof Node) node = b;
        else if (typeof b === "function") { const r = b(api); node = typeof r === "string" ? PADS.html(r, "prose") : r; }
        else if (typeof b === "object" && b.type && typeof ui[b.type] === "function") node = ui[b.type](b, api);
        else throw new Error("unknown block " + JSON.stringify(b).slice(0, 80));
      } catch (e) {
        console.error("[PADS] block failed", e);
        node = h("div", { class: "callout warn" }, h("p", { class: "c-title", "data-label": "Bug" }, "This part failed to render: " + e.message));
      }
      if (node) el.appendChild(node);
    }
  };
})();
