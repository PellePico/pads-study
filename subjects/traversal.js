/* Two subjects: "Data engineering" (lifecycle, formats, storage, APIs, ETL) and "Tree traversal" (Exercise 10: BFS debugging, DFS easy/medium/hard).
   Built on the public API in AUTHORING.md. The basics of trees, BFS and DFS live in
   #algorithms/trees and #algorithms/dfs-bfs; this subject does NOT repeat them.
   Local helpers that might be promoted later: treeSvg (binary tree with tones, path edges, notes and
   level labels), ladder (hint 1 → hint 2 → model answer reveals), reveal (button that shows blocks). */
(function () {
  "use strict";
  const { h, ui, pyrepr } = PADS;
  const D = ui.draw;

  /* ---------- small helpers for this file only ---------- */
  const row = (...kids) => h("div", { class: "row-wrap" }, ...kids);
  const eyebrow = (text, style) => h("p", { class: "eyebrow", style: style || null }, text);
  const btn = (text, onclick, cls, extra) => h("button", Object.assign({ type: "button", class: cls || "btn small", onclick }, extra || {}), text);
  const L = list => "[" + list.join(", ") + "]";            // JS array of numbers → Python list text

  /* ---------- trees ---------- */
  const N = (v, l, r) => ({ v, l: l || null, r: r || null });
  const SAMPLE = N(10, N(5, N(3), N(7)), N(15, N(12), N(18)));   // the exercise's shared tree
  const chain = vals => vals.reduceRight((acc, v) => N(v, null, acc), null);   // build_right_chain

  /* Layout: x = in-order position, y = depth. Values must be unique inside one drawn tree. */
  function layout(root) {
    const pos = {}, edges = [];
    let i = 0, maxD = 0;
    (function walk(n, d, parent) {
      if (!n) return;
      walk(n.l, d + 1, n);
      pos[n.v] = { i: i++, d };
      maxD = Math.max(maxD, d);
      if (parent) edges.push([parent.v, n.v]);
      walk(n.r, d + 1, n);
    })(root, 0, null);
    return { pos, edges, count: i, maxD };
  }

  /* Draw a binary tree.
     o: { tone: {v: "accent"|"cmp"|"done"|"min"|"swap"}, faded: [v], edge: {childV: tone} (edge parent→child),
          note: {v: "text under the node"}, levels: true (labels on the left), gap, label } */
  function treeSvg(root, o) {
    o = o || {};
    const lay = layout(root);
    const gap = o.gap || 50, R = 19, left = o.levels ? 86 : 26, rowH = 62;
    const W = left + (lay.count - 1) * gap + 30, H = 28 + lay.maxD * rowH + R + (o.note ? 24 : 10);
    const S = D.svg({ w: Math.max(W, 120), h: H, label: o.label || "binary tree" });
    const P = v => ({ x: left + lay.pos[v].i * gap, y: 26 + lay.pos[v].d * rowH });
    if (o.levels) for (let d = 0; d <= lay.maxD; d++) S.text(6, 26 + d * rowH, "level " + d, { anchor: "start", muted: true });
    lay.edges.forEach(([a, b]) => {
      const A = P(a), B = P(b), dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
      const t = (o.edge || {})[b];
      S.line(A.x + dx / len * R, A.y + dy / len * R, B.x - dx / len * R, B.y - dy / len * R, { tone: t || null, cls: t ? "tv-thick" : null });
    });
    Object.keys(lay.pos).forEach(k => {
      const v = Number(k), p = P(v);
      S.circle(p.x, p.y, R, { text: String(v), tone: (o.tone || {})[v] || null, faded: (o.faded || []).includes(v) });
      const nt = (o.note || {})[v];
      if (nt) S.text(p.x, p.y + R + 11, nt, { small: true, cls: "tv-note" });
    });
    return S.el;
  }

  /* tone map from sets: current node, waiting nodes, finished nodes */
  function tones(cur, wait, done) {
    const t = {};
    (done || []).forEach(v => (t[v] = "done"));
    (wait || []).forEach(v => (t[v] = "cmp"));
    if (cur != null) t[cur] = "accent";
    return t;
  }
  const LEG = [["held", "current node"], ["cmp", "waiting (in the queue / stack)"], ["done", "visited"]];

  /* a labelled array, for queue / stack / result panels */
  function arr(name, vals, o) {
    o = o || {};
    return h("div", { style: "margin-top:8px" }, D.array(vals.map(String), { name, index: false, marks: o.marks, ptrs: o.ptrs, emptyText: o.empty }));
  }

  /* a button that shows hidden blocks (model answers behind a click) */
  function reveal(labelText, blocks) {
    return api => {
      const box = h("div", { class: "tv-reveal", hidden: true });
      let built = false;
      const b = btn(labelText, () => {
        const open = box.hidden;
        if (open && !built) { PADS.renderBlocks(box, blocks, api); built = true; }
        box.hidden = !open;
        b.setAttribute("aria-expanded", String(open));
        b.textContent = open ? "Hide" : labelText;
      }, "btn small", { "aria-expanded": "false" });
      return h("div", { class: "tv-revealwrap" }, b, box);
    };
  }

  /* hint ladder: each rung opens the next. rungs: [{ label, html } | { label, code }] */
  function ladder(el, api, task, rungs) {
    const list = h("div", { class: "tv-rungs" });
    let k = 0;
    const next = btn("", () => open());
    function open() {
      const r = rungs[k++];
      list.appendChild(h("div", { class: "tv-rung" + (r.code ? " tv-answer" : "") },
        h("p", { class: "eyebrow", style: "margin:0 0 4px" }, r.label),
        r.html ? h("div", { class: "prose", html: r.html }) : null,
        r.code ? ui.code({ code: r.code }) : null));
      update();
    }
    function update() {
      if (k >= rungs.length) { next.hidden = true; return; }
      next.textContent = "Show " + rungs[k].label.toLowerCase();
      next.className = rungs[k].code ? "btn small" : "btn small primary";
    }
    el.append(h("div", { class: "prose", html: task }), list, row(next));
    update();
  }

  /* ================================================================
     Step generators (each simulates the Python code it is shown next to)
     ================================================================ */

  // --- BFS with a deque on the sample tree ---
  function bfsSteps() {
    const S = [];
    let q = [], res = [], cur = null;
    const vals = () => q.map(n => n.v);
    const V = () => ({ node: cur ? "node " + cur.v : "None", queue: "deque(" + L(vals()) + ")", result: L(res) });
    const push = (line, now, more) => S.push(Object.assign({ line, now, queue: vals(), result: res.slice(), cur: cur ? cur.v : null, vars: V() }, more || {}));
    S.push({ line: 0, now: "We call <code>bfs_level_order(sample_tree.root)</code>. <code>root</code> is the 10 node.", vars: {}, queue: [], result: [], cur: null });
    S.push({ line: 2, now: "Is <code>root</code> None? <b>No</b>, it is the 10 node. Go on.", vars: { root: "node 10" }, queue: [], result: [], cur: null });
    q = [SAMPLE];
    S.push({ line: 5, now: "The waiting line starts with one node: the root, 10.", vars: { queue: "deque([10])" }, queue: [10], result: [], cur: null });
    push(6, "An empty list for the answer.");
    while (q.length) {
      push(8, `Is anyone waiting? <b>Yes</b>: ${q.length} node${q.length > 1 ? "s" : ""} in the queue.`);
      cur = q.shift();
      push(9, `<code>popleft()</code> takes the <b>front</b> of the line: <b>${cur.v}</b>. It waited longest.`);
      res.push(cur.v);
      push(10, `Store the value ${cur.v}. result is now <code>${L(res)}</code>.`);
      if (!cur.l && !cur.r) { push(12, `${cur.v} is a leaf: both children are None, so nobody joins the line.`); continue; }
      if (cur.l) { q.push(cur.l); push(13, `Left child ${cur.l.v} joins the <b>back</b> of the line.`); }
      if (cur.r) { q.push(cur.r); push(15, `Then right child ${cur.r.v} joins behind it.`); }
    }
    cur = null;
    push(8, "Is anyone waiting? <b>No</b>, the queue is empty. The loop ends.");
    push(17, `Give back <code>${L(res)}</code>: level 0, then level 1, then level 2.`, { print: L(res) });
    return S;
  }

  // --- recursive pre/in/post-order with one shared result list ---
  const REC_LINES = { pre: { visit: 8, left: 9, right: 10 }, in: { visit: 9, left: 8, right: 10 }, post: { visit: 10, left: 8, right: 9 } };
  function recSteps(order) {
    const Ln = REC_LINES[order], fn = order + "order";
    const S = [], res = [], stack = [];
    const frames = () => [{ name: "global", vars: { tree: "the sample tree" } }].concat(stack.map((f, i) => ({
      name: fn + "(" + (f.n ? f.n.v : "None") + ")",
      vars: { node: f.n ? "node " + f.n.v : "None", result: L(res) },
      note: i === stack.length - 1 ? (f.note || "running now") : "waiting on line " + f.line,
    })));
    const waiting = () => stack.filter(f => f.n).map(f => f.n.v);
    const push = (line, now, curV) => S.push({ line, now, frames: frames(), result: res.slice(), tone: tones(curV, waiting().filter(v => v !== curV), res) });
    S.push({ line: 0, now: `We call <code>tree.${fn}_traversal(tree.root)</code> with no list.`, frames: [{ name: "global", vars: { tree: "the sample tree" } }], result: [], tone: {} });
    function call(n, parent, side) {
      stack.push({ n, line: 0 });
      const top = stack[stack.length - 1];
      if (!n) {
        top.note = "returning the list";
        push(6, `node is None: the ${side} spot under ${parent} is empty. Base case: give the <b>same</b> list back, unchanged.`, parent);
        stack.pop();
        return;
      }
      if (stack.length === 1) push(3, "First call: <code>result</code> is None, so make <b>one</b> new list. Every deeper call gets this same list.", n.v);
      push(5, `node is ${n.v}, not None. Go on.`, n.v);
      for (const step of order === "pre" ? ["visit", "left", "right"] : order === "in" ? ["left", "visit", "right"] : ["left", "right", "visit"]) {
        if (step === "visit") { res.push(n.v); push(Ln.visit, `Append <b>${n.v}</b>. result is now <code>${L(res)}</code>.`, n.v); }
        else {
          const child = step === "left" ? n.l : n.r;
          top.line = Ln[step];
          push(Ln[step], `Call on the ${step} child (${child ? child.v : "None"}), passing the same list. This call waits here.`, n.v);
          call(child, n.v, step);
        }
      }
      top.note = "returning the list";
      push(11, `${n.v} is finished. Give the list back to ${stack.length > 1 ? "the call for " + stack[stack.length - 2].n.v : "the caller"}.`, n.v);
      stack.pop();
    }
    call(SAMPLE, null, "");
    S.push({ line: 0, label: "After the code", now: `The first call gives back <code>${L(res)}</code>.`, frames: [{ name: "global", vars: { tree: "the sample tree", answer: L(res) } }], result: res.slice(), tone: tones(null, [], res), print: L(res) });
    return S;
  }

  // --- count_nodes / height: values bubble up from the leaves ---
  function aggSteps(kind) {
    const isH = kind === "height", base = isH ? -1 : 0, fn = isH ? "height" : "count_nodes";
    const ln = isH ? "left_h" : "left", rn = isH ? "right_h" : "right";
    const S = [], stack = [], got = {};
    const frames = () => [{ name: "global", vars: {} }].concat(stack.map((f, i) => {
      const vars = { node: f.n ? "node " + f.n.v : "None" };
      if (f.lv != null) vars[ln] = String(f.lv);
      if (f.rv != null) vars[rn] = String(f.rv);
      return { name: fn + "(" + (f.n ? f.n.v : "None") + ")", vars, note: i === stack.length - 1 ? (f.note || "running now") : "waiting on line " + f.line };
    }));
    const note = () => { const o = {}; Object.keys(got).forEach(v => (o[v] = (isH ? "h=" : "=") + got[v])); return o; };
    const push = (line, now, curV) => S.push({ line, now, frames: frames(), note: note(),
      tone: tones(curV, stack.filter(f => f.n && f.n.v !== curV).map(f => f.n.v), Object.keys(got).map(Number)) });
    S.push({ line: 0, now: `We call <code>tree.${fn}(tree.root)</code>.`, frames: [{ name: "global", vars: {} }], note: {}, tone: {} });
    function call(n, parent, side) {
      stack.push({ n, line: 0 });
      const top = stack[stack.length - 1];
      if (!n) {
        top.note = "returning " + base;
        push(3, `The ${side} spot under ${parent} is empty: return <b>${base}</b>.` + (isH ? " (−1, so that a leaf ends up at 0.)" : ""), parent);
        stack.pop();
        return base;
      }
      top.line = 5;
      push(5, `node is ${n.v}. First ask the left side: call on ${n.l ? n.l.v : "None"}. This call waits.`, n.v);
      top.lv = call(n.l, n.v, "left");
      top.line = 6;
      push(6, `Left gave back <b>${top.lv}</b>. Now ask the right side: call on ${n.r ? n.r.v : "None"}.`, n.v);
      top.rv = call(n.r, n.v, "right");
      const val = isH ? 1 + Math.max(top.lv, top.rv) : 1 + top.lv + top.rv;
      got[n.v] = val;
      top.note = "returning " + val;
      push(7, isH ? `1 + max(${top.lv}, ${top.rv}) = <b>${val}</b>. Give it back.` : `1 + ${top.lv} + ${top.rv} = <b>${val}</b>. Give it back.`, n.v);
      stack.pop();
      return val;
    }
    const ans = call(SAMPLE, null, "");
    S.push({ line: 0, label: "After the code", now: `The answer is <b>${ans}</b>.`, frames: [{ name: "global", vars: { answer: String(ans) } }], note: note(), tone: tones(null, [], Object.keys(got).map(Number)), print: String(ans) });
    return S;
  }

  // --- root_to_leaf_paths with one shared path (append / pop) ---
  function pathSteps() {
    const S = [], path = [], paths = [];
    const edgeOf = () => { const e = {}; path.slice(1).forEach(v => (e[v] = "accent")); return e; };
    const saved = () => paths.map(p => p[p.length - 1]);
    const push = (line, now, curV) => S.push({ line, now, path: path.slice(), paths: paths.map(p => p.slice()), edge: edgeOf(),
      tone: Object.assign(tones(null, [], saved()), Object.fromEntries(path.map(v => [v, "cmp"])), curV != null ? { [curV]: "accent" } : {}),
      vars: { current: curV != null ? "node " + curV : "None", path: L(path), paths: "[" + paths.map(L).join(", ") + "]" } });
    S.push({ line: 0, now: "We call <code>tree.root_to_leaf_paths(tree.root)</code>.", vars: {}, path: [], paths: [], edge: {}, tone: {} });
    S.push({ line: 2, now: "<code>paths</code> will hold the finished paths.", vars: { paths: "[]" }, path: [], paths: [], edge: {}, tone: {} });
    S.push({ line: 3, now: "<code>path</code> is the <b>one</b> list we grow on the way down and shrink on the way up.", vars: { path: "[]", paths: "[]" }, path: [], paths: [], edge: {}, tone: {} });
    S.push({ line: 19, now: "Start the walk at the root, 10.", vars: { path: "[]", paths: "[]" }, path: [], paths: [], edge: {}, tone: { 10: "accent" } });
    function walk(n) {
      path.push(n.v);
      push(9, `Step down to ${n.v}: append it. path is <code>${L(path)}</code>.`, n.v);
      if (!n.l && !n.r) {
        paths.push(path.slice());
        push(12, `${n.v} is a leaf. Save a <b>copy</b> of the path: <code>${L(path)}</code>.`, n.v);
      } else {
        push(14, `${n.v} is not a leaf. Walk the left side first (${n.l.v}).`, n.v);
        walk(n.l);
        push(15, `Back at ${n.v}. Now walk the right side (${n.r.v}).`, n.v);
        walk(n.r);
      }
      path.pop();
      push(17, `Done below ${n.v}: <code>pop()</code> removes it. path is <code>${L(path)}</code>.` + (path.length ? ` We are back at ${path[path.length - 1]}.` : " Empty again."), path.length ? path[path.length - 1] : null);
    }
    walk(SAMPLE);
    push(20, "Give back all four saved paths, left before right.");
    S[S.length - 1].print = "[" + paths.map(L).join(", ") + "]";
    return S;
  }

  // --- has_path_sum: remaining = target - value, checked only at leaves, `or` stops early ---
  function sumSteps(target) {
    const S = [], stack = [], rem = {};
    const frames = () => [{ name: "global", vars: {} }].concat(stack.map((f, i) => ({
      name: "has_path_sum(" + f.n.v + ", " + f.t + ")", vars: f.r != null ? { remaining: String(f.r) } : {},
      note: i === stack.length - 1 ? (f.note || "running now") : "waiting on line 10" })));
    const note = () => Object.fromEntries(Object.keys(rem).map(v => [v, "rem " + rem[v]]));
    const push = (line, now, curV, extra) => S.push(Object.assign({ line, now, frames: frames(), note: note(),
      tone: Object.assign(Object.fromEntries(stack.map(f => [f.n.v, "cmp"])), curV != null ? { [curV]: "accent" } : {}),
      edge: Object.fromEntries(stack.slice(1).map(f => [f.n.v, "accent"])) }, extra || {}));
    S.push({ line: 0, now: `We call <code>tree.has_path_sum(tree.root, ${target})</code>.`, frames: [{ name: "global", vars: {} }], note: {}, tone: {}, edge: {} });
    function call(n, t) {
      stack.push({ n, t });
      const top = stack[stack.length - 1];
      top.r = t - n.v; rem[n.v] = top.r;
      push(5, `remaining = ${t} − ${n.v} = <b>${top.r}</b>. The rest of the path must add up to ${top.r}.`, n.v);
      if (!n.l && !n.r) {
        const ok = top.r === 0;
        top.note = "returning " + (ok ? "True" : "False");
        push(8, `${n.v} is a leaf, so now we check: is ${top.r} == 0? <b>${ok ? "Yes: True" : "No: False"}</b>.`, n.v);
        stack.pop();
        return ok;
      }
      push(10, `${n.v} is not a leaf, so ${top.r === 0 ? "remaining 0 does <b>not</b> count here (the path must end at a leaf). " : ""}Try the left side with ${top.r}.`, n.v);
      const a = call(n.l, top.r);
      if (a) {
        top.note = "returning True";
        push(10, `Left gave <b>True</b>, so <code>or</code> stops: the right side is never tried. Return True.`, n.v);
        stack.pop();
        return true;
      }
      push(10, `Left gave False. <code>or</code> now tries the right side with ${top.r}.`, n.v);
      const b = call(n.r, top.r);
      top.note = "returning " + (b ? "True" : "False");
      push(10, `Right gave <b>${b ? "True" : "False"}</b>. Return ${b ? "True" : "False"}.`, n.v);
      stack.pop();
      return b;
    }
    const ans = call(SAMPLE, target);
    S.push({ line: 0, label: "After the code", now: `The answer is <b>${ans ? "True" : "False"}</b>.`, frames: [{ name: "global", vars: { answer: ans ? "True" : "False" } }], note: note(), tone: {}, edge: {}, print: ans ? "True" : "False" });
    return S;
  }

  // --- iterative DFS with an explicit stack ---
  function iterSteps(order) {
    const S = [], res = [];
    let stack = [], cur = null;
    const isPost = order === "post";
    const shown = () => stack.map(x => isPost ? "(" + x[0].v + ", " + (x[1] ? "T" : "F") + ")" : String(x.v));
    const marks = () => isPost ? Object.fromEntries(stack.map((x, i) => [i, x[1] ? "min" : null]).filter(p => p[1])) : {};
    const inStack = () => stack.map(x => isPost ? x[0].v : x.v);
    const V = extra => Object.assign({ current: cur ? "node " + cur.v : "None", stack: "[" + shown().join(", ") + "]", result: L(res) }, extra || {});
    const push = (line, now, extra) => S.push(Object.assign({ line, now, stack: shown(), smarks: marks(), result: res.slice(),
      tone: tones(cur ? cur.v : null, inStack(), res), vars: V() }, extra || {}));
    S.push({ line: 0, now: `We call <code>iterative_${order}order(tree.root)</code>. No recursion: we keep our own to-do pile.`, vars: {}, stack: [], smarks: {}, result: [], tone: {} });
    if (order === "pre") {
      stack = [SAMPLE];
      push(3, "result is empty. The pile starts with the root, 10.");
      while (stack.length) {
        cur = stack.pop();
        push(6, `Pile not empty. <code>pop()</code> takes the <b>top</b>: ${cur.v}.`);
        res.push(cur.v);
        push(7, `Visit ${cur.v} straight away. result is <code>${L(res)}</code>.`);
        if (!cur.l && !cur.r) { push(9, `${cur.v} is a leaf: nothing to push.`); continue; }
        if (cur.r) { stack.push(cur.r); push(10, `Push the <b>right</b> child ${cur.r.v} first, so it waits underneath.`); }
        if (cur.l) { stack.push(cur.l); push(12, `Push the <b>left</b> child ${cur.l.v} last, so it is on top and comes out next.`); }
      }
      cur = null;
      push(5, "The pile is empty. The loop ends.");
    } else if (order === "in") {
      cur = SAMPLE;
      push(4, "result and stack are empty. <code>current</code> starts at the root, 10.");
      while (stack.length || cur) {
        while (cur) {
          stack.push(cur);
          const was = cur;
          cur = cur.l;
          push(8, `Push ${was.v} (we come back to it later) and slide left to ${cur ? cur.v : "None"}.`);
        }
        push(7, "<code>current</code> is None: we cannot slide further left.");
        cur = stack.pop();
        push(11, `Pop the top: <b>${cur.v}</b>. Everything left of it is done.`);
        res.push(cur.v);
        push(12, `Visit ${cur.v}. result is <code>${L(res)}</code>.`);
        const was = cur;
        cur = cur.r;
        push(13, `Move to ${was.v}'s right child: ${cur ? cur.v : "None"}.` + (cur ? " Slide left from there." : " Nothing there, so the next pop gives the parent."));
      }
      push(6, "The pile is empty and current is None. The loop ends.");
    } else {
      stack = [[SAMPLE, false]];
      push(3, "result is empty. The pile holds <code>(10, False)</code>: node 10, children not pushed yet.");
      while (stack.length) {
        const [n, ex] = stack.pop();
        cur = n;
        push(6, `Pop the top: <code>(${n.v}, ${ex ? "True" : "False"})</code>.`);
        if (ex) {
          res.push(n.v);
          push(9, `True means its children are already done. Visit ${n.v} now. result is <code>${L(res)}</code>.`);
        } else {
          stack.push([n, true]);
          push(11, `First time we see ${n.v}. Push it back as <code>(${n.v}, True)</code>: "visit me after my children".`);
          if (n.r) { stack.push([n.r, false]); push(13, `Push the right child <code>(${n.r.v}, False)</code>.`); }
          if (n.l) { stack.push([n.l, false]); push(15, `Push the left child <code>(${n.l.v}, False)</code> last, so it is on top.`); }
          if (!n.l && !n.r) S[S.length - 1].now += " It is a leaf: no children to push.";
        }
      }
      cur = null;
      push(5, "The pile is empty. The loop ends.");
    }
    const endLine = { pre: 14, in: 15, post: 17 }[order];
    push(endLine, `Give back <code>${L(res)}</code>, the same as the recursive version.`, { print: L(res) });
    return S;
  }

  // --- one postorder pass: (height, diameter, balanced) per node ---
  function statsOf(n, out) {                     // out[v] = [h, d, b, lh, rh, ld, rd, lb, rb]
    if (!n) return [-1, 0, true];
    const [lh, ld, lb] = statsOf(n.l, out), [rh, rd, rb] = statsOf(n.r, out);
    const hh = 1 + Math.max(lh, rh), d = Math.max(lh + rh + 2, ld, rd), b = lb && rb && Math.abs(lh - rh) <= 1;
    out.push({ v: n.v, h: hh, d, b, lh, rh, ld, rd, lb, rb });
    return [hh, d, b];
  }
  const tf = b => (b ? "True" : "False");
  const statNote = s => "h" + s.h + " d" + s.d + (s.b ? " ✓" : " ✗");
  function analyzeSteps() {
    const order = [];
    statsOf(SAMPLE, order);
    const S = [], done = {};
    const note = () => Object.fromEntries(Object.keys(done).map(v => [v, statNote(done[v])]));
    S.push({ line: 0, now: "We call <code>stats(tree.root)</code>. Empty spots give back <code>(-1, 0, True)</code>.", note: {}, tone: {}, vars: {} });
    order.forEach(s => {
      const leaf = s.lh === -1 && s.rh === -1;
      const vars = { current: "node " + s.v, lh: String(s.lh), rh: String(s.rh), height: String(s.h), through_me: String(s.lh + s.rh + 2), diameter: String(s.d), balanced: tf(s.b) };
      const tone = tones(s.v, [], Object.keys(done).map(Number));
      if (leaf) {
        done[s.v] = s;
        S.push({ line: 12, now: `${s.v} is a leaf: both children give (-1, 0, True). height = 1 + max(-1, -1) = 0, through_me = -1 + -1 + 2 = 0. Return <b>(0, 0, True)</b>.`, vars, tone, note: note() });
      } else {
        S.push({ line: 6, now: `Both sides of ${s.v} are done (postorder: children first). Left gave (${s.lh}, ${s.ld}, ${tf(s.lb)}), right gave (${s.rh}, ${s.rd}, ${tf(s.rb)}).`, vars: { current: "node " + s.v, lh: String(s.lh), rh: String(s.rh) }, tone, note: note() });
        const v8 = { current: "node " + s.v, lh: String(s.lh), rh: String(s.rh), height: String(s.h) };
        S.push({ line: 8, now: `height = 1 + max(${s.lh}, ${s.rh}) = <b>${s.h}</b>.`, vars: v8, tone, note: note() });
        S.push({ line: 10, now: `through_me = ${s.lh} + ${s.rh} + 2 = ${s.lh + s.rh + 2}. diameter = max(${s.lh + s.rh + 2}, ${s.ld}, ${s.rd}) = <b>${s.d}</b>.`, vars: Object.assign({}, v8, { through_me: String(s.lh + s.rh + 2), diameter: String(s.d) }), tone, note: note() });
        done[s.v] = s;
        S.push({ line: 11, now: `balanced = ${tf(s.lb)} and ${tf(s.rb)} and |${s.lh} − ${s.rh}| ≤ 1 → <b>${tf(s.b)}</b>. Return (${s.h}, ${s.d}, ${tf(s.b)}).`, vars, tone, note: note() });
      }
    });
    const r = done[10];
    S.push({ line: 0, label: "After the code", now: `<code>analyze</code> packs it into a dict: <code>{'height': ${r.h}, 'diameter': ${r.d}, 'is_balanced': ${tf(r.b)}}</code>.`, vars: {}, note: note(), tone: tones(null, [], [3, 7, 5, 12, 18, 15, 10]), print: `{'height': ${r.h}, 'diameter': ${r.d}, 'is_balanced': ${tf(r.b)}}` });
    return S;
  }

  /* shared stepper visual: tree + optional panels */
  function treeVisual(el, st, extra) {
    el.appendChild(treeSvg(SAMPLE, { tone: st.tone, edge: st.edge, note: st.note || (extra && extra.note ? extra.note(st) : null), levels: extra && extra.levels }));
    if (extra && extra.panels) extra.panels(el, st);
  }

  /* ================================================================
     Shared Python text (starters mirror the exercise's setup cell)
     ================================================================ */
  const SETUP = [
    "# ---- the exercise's setup cell, shortened (don't change) ----",
    "from collections import deque",
    "",
    "class TreeNode:",
    "    def __init__(self, value):",
    "        self.value = value",
    "        self.left = None                         # no child yet",
    "        self.right = None",
    "",
    "def build_sample_tree():                         # 10 / (5: 3, 7) / (15: 12, 18)",
    "    root = TreeNode(10)",
    "    root.left, root.right = TreeNode(5), TreeNode(15)",
    "    root.left.left, root.left.right = TreeNode(3), TreeNode(7)",
    "    root.right.left, root.right.right = TreeNode(12), TreeNode(18)",
    "    return root",
    "",
    "def build_right_chain(values):                  # [1, 2, 3] -> 1 -> 2 -> 3 (right children)",
    "    root = None",
    "    for value in reversed(values):",
    "        node = TreeNode(value)",
    "        node.right = root",
    "        root = node",
    "    return root",
  ].join("\n");
  /* your code first, then the setup, then demo lines. Classes and functions only look names up when they are CALLED,
     so the setup may come after them. Model answers use the same layout, so "Put it in the editor" still runs. */
  const withSetup = (code, tail) => PADS.dedent(code) + "\n\n\n" + SETUP + (tail ? "\n\n\n" + PADS.dedent(tail) : "");

  /* ================================================================
     ETL stepper helpers (used on the ETL page)
     ================================================================ */
  const ETL_ROWS = [["101", "250.50"], ["102", "?"], ["101", "250.50"], ["103", "131.75"]];
  function etlSteps() {
    const S = [];
    let seen = [], clean = [], rej = [], status = ["", "", "", ""];
    const V = (extra) => Object.assign({ seen: seen.length ? "{" + seen.map(s => "'" + s + "'").join(", ") + "}" : "set()", clean: "[" + clean.map(c => "(" + c[0] + ", " + c[1] + ")").join(", ") + "]", rejected: "[" + rej.map(r => "'" + r + "'").join(", ") + "]" }, extra || {});
    const push = (line, now, cur, extra) => S.push({ line, now, cur, status: status.slice(), vars: V(extra) });
    S.push({ line: 0, now: "Four raw order rows arrive. Every field is <b>text</b>, like in a CSV file.", cur: null, status: status.slice(), vars: {} });
    S.push({ line: 1, now: "EXTRACT: we have the raw rows. Row 3 is the same order as row 1, and row 2 has a <code>?</code> amount.", cur: null, status: status.slice(), vars: { raw: "4 rows" } });
    S.push({ line: 8, now: "Three empty containers: ids we kept, clean rows, rejected ids.", cur: null, status: status.slice(), vars: V() });
    const pretty = { "250.50": "250.5", "131.75": "131.75" };
    ETL_ROWS.forEach(([id, amt], i) => {
      const iv = { order_id: "'" + id + "'", amount: "'" + amt + "'" };
      push(10, `Row ${i + 1}: <code>order_id = '${id}'</code>, <code>amount = '${amt}'</code>.`, i, iv);
      if (seen.includes(id)) {
        push(11, `Is '${id}' in seen? <b>Yes</b>: we already kept this order.`, i, iv);
        status[i] = "dup";
        push(12, "<code>continue</code>: skip the duplicate, go to the next row.", i, iv);
        return;
      }
      push(11, `Is '${id}' in seen? <b>No</b>.`, i, iv);
      seen.push(id);
      push(13, `Remember '${id}'.`, i, iv);
      if (amt === "?") {
        push(16, `<code>float('?')</code> fails: ValueError.`, i, iv);
        rej.push(id); status[i] = "rej";
        push(18, `Catch it and put '${id}' on the rejected list.`, i, iv);
        push(19, "<code>continue</code>: this row does not reach the clean data.", i, iv);
        return;
      }
      const ivv = Object.assign({}, iv, { value: pretty[amt] });
      push(16, `<code>float('${amt}')</code> is <b>${pretty[amt]}</b>, a real number now.`, i, ivv);
      clean.push([Number(id), pretty[amt]]); status[i] = "ok";
      push(21, `Keep it as <code>(${id}, ${pretty[amt]})</code>: the id as int, the amount as float.`, i, ivv);
    });
    S.push({ line: 23, now: "LOAD: a real pipeline writes a file or a table. Here we just print.", cur: null, status: status.slice(), vars: V(), print: "[(101, 250.5), (103, 131.75)]" });
    S.push({ line: 24, now: "And the rejected ids, so somebody can look at them.", cur: null, status: status.slice(), vars: V(), print: "['102']" });
    return S;
  }
  function etlVisual(el, st) {
    const lab = { ok: ["done", "kept ✓"], dup: ["dim", "duplicate, skipped"], rej: ["swap", "rejected ✗"], "": [null, "not read yet"] };
    const t = h("table", { class: "tbl tv-etl" }, h("thead", null, h("tr", null, h("th", null, "row"), h("th", null, "order_id"), h("th", null, "amount"), h("th", null, "result"))),
      h("tbody", null, ETL_ROWS.map((r, i) => {
        const [mk, txt] = lab[st.status[i]];
        return h("tr", { class: st.cur === i ? "tv-currow" : null }, h("td", null, String(i + 1) + (st.cur === i ? " ◀" : "")), h("td", { class: "mono" }, "'" + r[0] + "'"), h("td", { class: "mono" }, "'" + r[1] + "'"),
          h("td", null, h("span", { class: "tv-pill" + (mk ? " mk-" + mk : "") }, txt)));
      })));
    el.append(h("div", { class: "tablewrap" }, t));
  }

  function flowSvg() {
    const names = [["Generate", "apps, sensors"], ["Ingest", "files, APIs"], ["Store", "raw + curated"], ["Transform", "clean, join"], ["Serve", "reports, ML"]];
    const S = D.svg({ w: 600, h: 96, label: "engineering lifecycle: generate, ingest, store, transform, serve" });
    names.forEach(([t, sub], i) => {
      S.box(6 + i * 120, 18, 100, 58, { text: t, sub, tone: i === 2 ? "tile" : null });
      if (i < names.length - 1) S.arrow(108 + i * 120, 47, 124 + i * 120, 47, {});
    });
    return S.el;
  }

  /* ---------- shared bits for the data-engineering topics ---------- */
  function seg(labels, aria, onpick, start) {           // segmented control; returns the element
    const el = h("div", { class: "seg", role: "group", "aria-label": aria });
    const bs = labels.map((t, i) => h("button", { type: "button", "aria-pressed": String(i === (start || 0)), onclick: () => pick(i) }, t));
    function pick(i) { bs.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j))); onpick(i); }
    el.append(...bs);
    return el;
  }
  function chainSvg(names, label, tone) {                // boxes in a row with arrows: a → b → c
    const w = 600, n = names.length, bw = Math.min(110, (w - 12 - (n - 1) * 18) / n);
    const S = D.svg({ w, h: 86, label });
    names.forEach(([t, sub], i) => {
      const x = 6 + i * (bw + 18);
      S.box(x, 14, bw, 58, { text: t, sub, tone: (tone || {})[i] || null });
      if (i < n - 1) S.arrow(x + bw + 2, 43, x + bw + 16, 43, {});
    });
    return S.el;
  }
  const card = (node, note) => h("div", { class: "card tv-flow" }, node, note ? h("p", { class: "small muted", style: "margin:6px 0 0", html: note }) : null);

  /* ================================================================
     TOPIC 1: Data engineering overview
     ================================================================ */
  const lecture = {
    id: "lecture",
    title: "Data engineering at a glance",
    summary: "How data gets from where it is made to a clean table people can trust. Five pages, one per part. This page is the map.",
    sources: "L10 p1–6, p9",
    blocks: [
      { type: "h", text: "The five parts" },
      { type: "table", head: ["Part", "What it is about", "Learn it on"], rows: [
        ["1", "What data engineering is, the two lifecycles, how data comes in, quality", "<a href=\"#dataeng/de-lifecycle\">Lifecycle & ingestion</a>"],
        ["2", "CSV, JSON, XML, Parquet, Avro; schema drift; small format mistakes", "<a href=\"#dataeng/de-formats\">File formats</a>"],
        ["3", "Databases, warehouses, lakes, lakehouses; OLTP vs OLAP; NoSQL", "<a href=\"#dataeng/de-storage\">Storage</a>"],
        ["4", "APIs, HTTP, pagination, retries, duplicates", "<a href=\"#dataeng/de-apis\">APIs & collection</a>"],
        ["5", "ETL vs ELT, orchestration, contracts, idempotent loads", "<a href=\"#dataeng/de-etl\">ETL pipelines</a>"],
      ] },

      { type: "h", text: "The whole subject in one picture" },
      () => card(flowSvg(), "An online shop wants <b>daily revenue per product</b>. Data is made (orders), collected, kept, cleaned and summed, then shown. Each page above zooms in on one box."),
      { type: "table", caption: "What you should be able to do", head: ["Goal", "Tiny example", "Page"], rows: [
        ["Trace data from source to use and disposal", "an order: checkout → table → report → deleted after 5 years", "<a href=\"#dataeng/de-lifecycle\">Lifecycle</a>"],
        ["Compare file formats and storage", "CSV for a quick export, Parquet for a big column sum", "<a href=\"#dataeng/de-formats\">Formats</a> · <a href=\"#dataeng/de-storage\">Storage</a>"],
        ["Collect data from an API or file safely", "follow every page, drop repeated ids", "<a href=\"#dataeng/de-apis\">APIs</a>"],
        ["Explain and sketch a small ETL pipeline", "read CSV → parse amounts → drop duplicates → write", "<a href=\"#dataeng/de-etl\">ETL</a>"],
        ["Judge quality and trade-offs", "a missing amount is not 0; batch is cheaper, streaming is fresher", "all five"],
      ] },
      { type: "callout", kind: "exam", title: "Exam link", html: "<p>Last year's exam had no data-engineering question. Still, the Python inside these pages (loop over rows, check, keep or skip; a dict keyed by id) is the same skill as exam Q3–Q5. An explain question on ETL, formats or batch vs streaming is possible.</p>" },
    ],
    quiz: [
      { type: "mc", q: "Which job asks “Is the data reliable and ready?”", options: ["Data engineering", "Analytics", "Data science"], answer: 0,
        hint: "Three jobs, three questions.", explain: "Engineering makes the data reliable. Analytics asks what happened; data science asks what may happen next." },
      { type: "mc", q: "Put the engineering lifecycle in order.", options: ["Ingest → generate → transform → store → serve", "Generate → ingest → store → transform → serve", "Generate → transform → ingest → serve → store"], answer: 1,
        hint: "Data must be made before it can be collected.", explain: "Generate → ingest → store → transform → serve. Storage supports every step." },
      { type: "mc", q: "Which page would explain why <code>'250.50' * 2</code> gives <code>'250.50250.50'</code>?", options: ["Storage", "File formats", "APIs"], answer: 1,
        hint: "Where does the text come from?", explain: "CSV stores everything as text: that is a format question." },
      { type: "mc", q: "Raw files are loaded into the warehouse first and cleaned there later. Which page covers this?", options: ["Lifecycle & ingestion", "Storage", "ETL pipelines"], answer: 2,
        hint: "Extract, Load, then Transform.", explain: "That is ELT, on the ETL pipelines page." },
    ],
  };

  /* ================================================================
     TOPIC 2: Lifecycle & ingestion (L10 p4–16)
     ================================================================ */
  const LATE = [   // event time, arrival time, temperature
    { id: "e-1", ev: "09:10", arr: "09:11", t: 21.0 },
    { id: "e-2", ev: "09:35", arr: "09:36", t: 21.4 },
    { id: "e-3", ev: "09:58", arr: "10:04", t: 22.0, late: true },
    { id: "e-4", ev: "10:15", arr: "10:16", t: 22.5 },
    { id: "e-5", ev: "10:40", arr: "10:41", t: 22.9 },
  ];
  function lateWidget(el) {
    const box = h("div");
    const draw = mode => {
      const key = mode === 0 ? "ev" : "arr";
      const buckets = { "09": [], "10": [] };
      LATE.forEach(e => buckets[e[key].slice(0, 2)].push(e));
      const S = D.svg({ w: 600, h: 150, label: "five sensor events placed in hourly buckets" });
      const X = hm => { const [a, b] = hm.split(":").map(Number); return 30 + ((a - 9) * 60 + b) * 4.5; };
      S.box(30, 20, 270, 70, { tone: "tile", rx: 6 }); S.box(300, 20, 270, 70, { tone: "tile", rx: 6 });
      S.text(165, 14, "09:00–10:00", { small: true, muted: true }); S.text(435, 14, "10:00–11:00", { small: true, muted: true });
      LATE.forEach((e, i) => {
        const x = X(e[key]), y = 42 + (i % 2) * 26;
        S.circle(x, y, 11, { text: e.id.slice(2), tone: e.late ? "swap" : "accent" });
      });
      LATE.filter(e => e.late).forEach(e => { S.arrow(X(e.ev), 108, X(e.arr), 108, { tone: "swap", label: "arrives 6 min late" }); });
      S.text(30, 140, mode === 0 ? "placed by when it was measured" : "placed by when the pipeline got it", { anchor: "start", small: true, muted: true });
      const avg = a => (a.reduce((s, e) => s + e.t, 0) / a.length).toFixed(2);
      const tbl = ui.table({ head: ["Hour", "Events", "Average °C"], num: [2], rows: Object.keys(buckets).map(k => [k + ":00", buckets[k].map(e => e.id + (e.late ? " (late)" : "")).join(", "), avg(buckets[k])]) });
      box.replaceChildren(h("div", { style: "overflow-x:auto" }, S.el), tbl,
        h("p", { class: "tv-now", html: mode === 0
          ? "<b>Event time</b>: e-3 was measured at 09:58, so it belongs to 09:00. The 09:00 average is <b>21.47 °C</b>. But a report that ran at 10:00 had not seen e-3 yet, so it must be <b>updated</b> when late data arrives."
          : "<b>Processing time</b>: e-3 reached the pipeline at 10:04, so it lands in 10:00. The 09:00 average says <b>21.20 °C</b>: wrong for “what happened at 9?”, even though every record is correct (L10 p15)." }));
    };
    el.append(seg(["Bucket by event time", "Bucket by processing time"], "Which time to group by", draw), box);
    draw(0);
  }

  const lifecycle = {
    id: "de-lifecycle",
    title: "Lifecycle & ingestion",
    summary: "What data engineering does, the two lifecycles, how data comes in (snapshot, incremental, streaming), which time to trust, and the three quality checks.",
    sources: "L10 p4–16",
    blocks: [
      { type: "h", text: "What data engineering does", sub: "L10 p4–5" },
      { type: "table", head: ["Step", "Means", "Tiny example"], rows: [
        ["Collect", "bring data together from databases, devices, files, APIs", "orders from the shop DB + prices from an API"],
        ["Prepare", "clean, check, join, structure", "<code>'250.50'</code> → <code>250.5</code>; drop a repeated order"],
        ["Deliver", "make the clean data available, safely and on time", "a revenue table ready at 07:00"],
      ] },
      { type: "callout", kind: "rule", title: "Success = correct data + fresh enough + reliable access", html: "<p>If one order is counted twice, every number built on it is wrong. If the table is ready at noon but the meeting was at 9, it is too late.</p>" },
      { type: "table", head: ["Job", "Main question", "Output", "Tiny example"], rows: [
        ["Data engineering", "Is the data reliable and ready?", "pipelines, clean tables", "clean sales records"],
        ["Analytics", "What happened, and why?", "reports, dashboards", "weekly sales trend"],
        ["Data science", "What may happen next?", "models, predictions", "demand forecast"],
      ] },

      { type: "h", text: "Two lifecycles", sub: "L10 p7–9. They overlap, but they are not the same." },
      { type: "table", head: ["Lifecycle", "Steps", "Focus"], rows: [
        ["Data lifecycle", "create → store → process → analyse → visualise → share → archive → dispose", "the data itself, over time"],
        ["Engineering lifecycle", "generate → ingest → store → transform → serve", "the system that moves it"],
      ] },
      () => card(flowSvg(), "Engineering lifecycle (L10 p9). Storage supports every step."),
      { type: "table", caption: "The data lifecycle for one shop order (L10 p8)", head: ["Stage", "What happens to order 101"], rows: [
        ["1 Create", "the customer pays: a row is written"],
        ["2 Store", "kept in the orders database"],
        ["3 Process", "amount parsed, currency checked"],
        ["4 Analyse", "counted in “revenue per product”"],
        ["5 Visualise", "a bar in the daily chart"],
        ["6 Share", "the dashboard is sent to the sales team"],
        ["7 Archive", "after 1 year: moved to cheap storage"],
        ["8 Dispose", "after 5 years (the policy): deleted securely"],
      ] },
      { type: "callout", kind: "warn", title: "Keeping and deleting are part of the job", html: "<p>Retention (how long to keep) and secure disposal are lifecycle steps, not afterthoughts (L10 p8).</p>" },
      { type: "table", caption: "Undercurrents: they run under every step (L10 p10)", head: ["Area", "Means", "Tiny example"], rows: [
        ["Security", "least privilege, encryption, audit log", "the analyst can read orders, not card numbers"],
        ["Data management", "quality, owner, metadata, lineage, retention", "“revenue_dkk comes from orders.total, owner: sales team”"],
        ["DataOps", "tests, repeatable deploys, monitoring, recovery", "an alert when today's file has 0 rows"],
      ] },

      { type: "h", text: "Where raw data comes from", sub: "L10 p11–12" },
      { type: "table", head: ["Source", "Example"], rows: [
        ["Operational databases", "orders, customers"], ["Business apps", "ERP, CRM"], ["Sensors / IoT", "temperature, GPS"],
        ["External APIs", "weather, product prices"], ["Files", "CSV exports, images"], ["App events", "clicks, logs"],
      ] },
      `<p>Before collecting, find out three things: <b>who owns</b> the source, <b>how</b> you may access it, and <b>how often</b> it changes.</p>`,
      { type: "code", caption: "A record needs context (L10 p12)", code: `
          {
            "event_id": "e-042",                    # which event: the unique id
            "sensor_id": "s-17",                    # which device sent it
            "measured_at": "2026-11-05T08:00:00Z",  # when it happened (Z = UTC)
            "temperature_c": 21.4                   # the value, with its unit in the name
          }` },
      { type: "callout", kind: "tip", title: "Which field is the unique id?", html: "<p><code>event_id</code>. One sensor sends many readings, so <code>sensor_id</code> repeats. Two readings can have the same temperature. Only <code>event_id</code> says “this exact event”, so it is what you use to spot duplicates and to reprocess safely.</p>" },
      {
        type: "tryit",
        title: "Duplicates: by the right key",
        task: "The same event <code>e-1</code> was delivered twice (a retry). Run it. Which count is right? Then count by <code>temperature_c</code> instead and see why that is wrong too.",
        code: `
          readings = [{"event_id": "e-1", "sensor_id": "s-17", "temperature_c": 21.4},
                      {"event_id": "e-2", "sensor_id": "s-17", "temperature_c": 21.4},
                      {"event_id": "e-1", "sensor_id": "s-17", "temperature_c": 21.4},
                      {"event_id": "e-3", "sensor_id": "s-09", "temperature_c": 19.8}]

          by_event = set()
          by_sensor = set()
          for r in readings:
              by_event.add(r["event_id"])         # the real id
              by_sensor.add(r["sensor_id"])       # not an id: one sensor, many readings

          print("readings received:", len(readings))
          print("unique by event_id:", len(by_event))
          print("unique by sensor_id:", len(by_sensor))`,
        expectOutput: "readings received: 4\nunique by event_id: 3\nunique by sensor_id: 2",
        hint: "e-1 and e-2 have the same sensor and the same temperature, but they are two different events.",
        solutionNote: "3 real events. By sensor you get 2 (too few). By temperature you would also get 2, because e-1 and e-2 both read 21.4.",
      },

      { type: "h", text: "How data comes in", sub: "L10 p13–14" },
      { type: "table", head: ["Pattern", "How", "Tiny example"], rows: [
        ["Full snapshot", "copy everything each time", "a nightly CSV of all 10,000 products"],
        ["Incremental load", "copy only new or changed rows", "orders with <code>updated_at</code> after the last run: 120 rows"],
        ["Continuous (streaming)", "handle each event as it arrives", "a live sensor feed"],
      ] },
      { type: "table", caption: "Batch vs streaming: a trade-off", head: ["", "Batch", "Streaming"], rows: [
        ["Runs", "at intervals (every night)", "all the time"],
        ["Freshness", "hours old", "seconds old"],
        ["Cost and effort", "simpler, often cheaper", "more state, failures, cost"],
        ["Good for", "the daily revenue report", "an alert when a freezer gets warm"],
      ] },
      { type: "callout", kind: "rule", title: "Choose by how fresh it must be", html: "<p>Pick by the freshness you need, how reliable delivery must be, and total cost: not by speed alone (L10 p14). A report read once a day does not need streaming.</p>" },

      { type: "h", text: "Which time? Event, ingestion, processing", sub: "L10 p15" },
      { type: "table", head: ["Time", "Means", "Example"], rows: [
        ["Event time", "when it really happened", "measured at 09:58"],
        ["Ingestion time", "when the pipeline received it", "arrived 10:04 (network delay)"],
        ["Processing time", "when the computation handled it", "batch ran at 11:00"],
      ] },
      { type: "widget", title: "A late event lands in the wrong hour", intro: "Five sensor readings. e-3 is measured at 09:58 but arrives at 10:04. Switch how you group them and watch the 09:00 average.", render: lateWidget },

      { type: "h", text: "Quality runs through every stage", sub: "L10 p16" },
      { type: "table", head: ["Check", "Question", "Tiny failing example"], rows: [
        ["Completeness", "are the required fields there?", "<code>sensor_id</code> is None"],
        ["Validity", "do values follow the rules?", "950 °C in a living room"],
        ["Uniqueness", "no unintended duplicates?", "<code>e-1</code> twice"],
      ] },
      { type: "table", caption: "…and next to quality", head: ["Security", "Governance"], rows: [
        ["log in to read; encrypt stored and sent data; hide sensitive fields", "write down owner and lineage; define each field; apply retention and privacy rules"],
      ] },
      {
        type: "tryit",
        title: "Check every row for the three problems",
        task: "Run it. Then add a fifth row with <code>\"temperature_c\": None</code> and run again: it crashes. Fix the check so a missing temperature is reported as a completeness problem.",
        code: `
          rows = [
              {"event_id": "e-1", "sensor_id": "s-17", "temperature_c": 21.4},
              {"event_id": "e-2", "sensor_id": None, "temperature_c": 22.0},
              {"event_id": "e-3", "sensor_id": "s-17", "temperature_c": 950.0},
              {"event_id": "e-1", "sensor_id": "s-17", "temperature_c": 21.4},
          ]

          seen = set()
          for row in rows:
              problems = []
              if row["sensor_id"] is None:                     # completeness
                  problems.append("missing sensor_id")
              if not -50 <= row["temperature_c"] <= 60:        # validity
                  problems.append("temperature out of range")
              if row["event_id"] in seen:                      # uniqueness
                  problems.append("duplicate event_id")
              seen.add(row["event_id"])

              print(row["event_id"], problems or "ok")`,
        hint: "<code>-50 &lt;= None</code> is a TypeError. Check <code>is None</code> first, and only test the range when the value is there (<code>elif</code>).",
        solution: `
          rows = [
              {"event_id": "e-1", "sensor_id": "s-17", "temperature_c": 21.4},
              {"event_id": "e-2", "sensor_id": None, "temperature_c": 22.0},
              {"event_id": "e-3", "sensor_id": "s-17", "temperature_c": 950.0},
              {"event_id": "e-1", "sensor_id": "s-17", "temperature_c": 21.4},
              {"event_id": "e-4", "sensor_id": "s-09", "temperature_c": None},
          ]

          seen = set()
          for row in rows:
              problems = []
              if row["sensor_id"] is None:                     # completeness
                  problems.append("missing sensor_id")
              if row["temperature_c"] is None:                 # completeness
                  problems.append("missing temperature")
              elif not -50 <= row["temperature_c"] <= 60:      # validity, only if it is there
                  problems.append("temperature out of range")
              if row["event_id"] in seen:                      # uniqueness
                  problems.append("duplicate event_id")
              seen.add(row["event_id"])

              print(row["event_id"], problems or "ok")`,
        solutionNote: "Prints: e-1 ok · e-2 ['missing sensor_id'] · e-3 ['temperature out of range'] · e-1 ['duplicate event_id'] · e-4 ['missing temperature']. <code>problems or \"ok\"</code> prints \"ok\" when the list is empty (an empty list counts as False).",
      },
      { type: "mistakes", items: [
        { title: "Using the device as the id", wrong: "seen.add(r['sensor_id'])", right: "seen.add(r['event_id'])", why: "One sensor sends many readings. Only the event id is unique (L10 p12)." },
        { title: "Grouping by when it arrived", wrong: "hour = arrived_at[:2]", right: "hour = measured_at[:2]", why: "“What happened at 9?” needs event time. Late events would move to the wrong hour (L10 p15)." },
        { title: "Streaming because it is faster", wrong: "# daily report -> build a live stream", right: "# daily report -> a nightly batch is enough", why: "Choose by needed freshness and cost, not speed alone (L10 p14)." },
        { title: "Range check before the missing check", wrong: "if not -50 <= t <= 60:", right: "if t is None: ...\nelif not -50 <= t <= 60: ...", why: "Comparing None with a number is a TypeError." },
        { title: "Keeping everything forever", wrong: "# never delete old orders", right: "# archive after 1 year, delete after the policy's 5", why: "Retention and secure disposal are lifecycle steps (L10 p8)." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "Which field uniquely identifies the event?", code: `{"event_id": "e-042", "sensor_id": "s-17", "measured_at": "2026-11-05T08:00:00Z", "temperature_c": 21.4}`,
        options: ["<code>sensor_id</code>", "<code>event_id</code>", "<code>measured_at</code>", "<code>temperature_c</code>"], answer: 1,
        wrong: { 0: "One sensor sends many events.", 2: "Two sensors can measure at the same second.", 3: "Many readings share a temperature." },
        hint: "Which one can never repeat for a different event?", explain: "<code>event_id</code> names exactly one event: use it to drop duplicates (L10 p12)." },
      { type: "mc", q: "Each night you copy only the orders changed since the last run. What is this?", options: ["Full snapshot", "Incremental load", "Streaming", "Archiving"], answer: 1,
        hint: "All of it, or only what changed?", explain: "Only new or changed rows = incremental load (L10 p13)." },
      { type: "mc", q: "A reading measured at 09:58 arrives at 10:04. For “average temperature from 9 to 10”, which hour should it count in?", options: ["09:00, by event time", "10:00, by processing time", "Drop it: it is late"], answer: 0,
        hint: "When did the temperature happen?", explain: "It happened at 09:58, so it belongs to the 09:00 hour. Late is not wrong: the 09:00 result must be updated (L10 p15)." },
      { type: "mc", q: "Two rows have the same <code>order_id</code>. Which quality check fails?", options: ["Completeness", "Validity", "Uniqueness", "Security"], answer: 2,
        hint: "L10 p16 has three quality words.", explain: "Uniqueness: no unintended duplicates." },
      { type: "predict", q: "What does this print?", code: `
          rows = [{"id": 1, "t": 20}, {"id": 2, "t": None}, {"id": 1, "t": 20}]
          seen = set()
          bad = 0
          for r in rows:
              if r["t"] is None or r["id"] in seen:
                  bad += 1
              seen.add(r["id"])
          print(bad, len(seen))`, answer: "2 2",
        hint: "Row 2 has no t. Row 3 repeats id 1. How many different ids were added?", explain: "Row 2 (missing) and row 3 (duplicate) are bad: 2. The set holds ids 1 and 2: 2." },
      { type: "explain", q: "L10 p6: an online shop wants daily revenue by product. In 2–3 sentences: where would a wrong currency or a duplicate order affect the result, and where should you catch it?",
        answer: "<p>Both errors enter at the source or during ingestion, and every step after that (store, transform, the revenue report) carries them along: a duplicate counts the order twice, and a EUR amount added as DKK makes the total wrong. They should be caught in the Transform step with validation: drop duplicates by <code>order_id</code> and check or convert the currency before summing. Checking early is cheaper than fixing a report later.</p>",
        points: ["the error enters early and spreads to every later step", "duplicate → counted twice; currency → wrong sum", "catch it when transforming: dedupe by id, check the unit"],
        hint: "Follow one bad order from Sources to Serve." },
      { type: "explain", q: "In 2–3 sentences: what is the difference between batch and streaming, and when would you pick streaming?",
        answer: "<p>Batch runs at set times (for example every night) and handles everything that came in since the last run; it is simpler and cheaper, but the data is less fresh. Streaming handles each event as it arrives, so results are fresh within seconds, but it is harder to run (state, failures, cost). Pick streaming when you must react fast, for example an alert when a freezer sensor gets too warm.</p>",
        points: ["batch = at intervals, simpler, less fresh", "streaming = continuous, fresh, more complex", "pick by how fresh it must be, not by speed alone"],
        hint: "L10 p14: think about freshness vs complexity." },
    ],
  };

  /* ================================================================
     TOPIC 3: File formats (L10 p17–27)
     ================================================================ */
  const CSV_LINES = [
    { line: "101,Copenhagen,250.50", split: "['101', 'Copenhagen', '250.50']", csv: "['101', 'Copenhagen', '250.50']", note: "A clean line: both give 3 fields. But all three are <b>text</b>, even 250.50." },
    { line: "103,\"Odense, Fyn\",131.75", split: "['103', '\"Odense', ' Fyn\"', '131.75']", csv: "['103', 'Odense, Fyn', '131.75']", note: "<b>Quoting</b>: the comma inside quotes is part of the city. <code>split(',')</code> cuts it in two and gives 4 fields; the <code>csv</code> module knows the quotes.", bad: true },
    { line: "102,Aarhus,,99.00", split: "['102', 'Aarhus', '', '99.00']", csv: "['102', 'Aarhus', '', '99.00']", note: "This line from L10 p18 has <b>4 fields under a 3-column header</b>. Both readers agree; the file is broken. <code>csv.DictReader</code> puts the extra value under the key <code>None</code>.", bad: true },
    { line: "104,Aalborg,", split: "['104', 'Aalborg', '']", csv: "['104', 'Aalborg', '']", note: "<b>Missing value</b>: it is the empty text <code>''</code>, not 0. <code>float('')</code> is a ValueError." },
    { line: "105,Århus,80.00", split: "['105', 'Ã…rhus', '80.00']", csv: "['105', 'Ã…rhus', '80.00']", note: "<b>Encoding</b>: the file is UTF-8 but was opened as Windows cp1252, so Å becomes <code>Ã…</code>. Fix: <code>open(path, encoding='utf-8')</code>.", bad: true },
  ];
  function csvWidget(el) {
    const box = h("div");
    const draw = i => {
      const c = CSV_LINES[i];
      box.replaceChildren(
        h("pre", { class: "st-out", style: "margin:8px 0" }, c.line),
        ui.table({ head: ["Reader", "Fields you get"], code: [0, 1], rows: [["line.split(',')", c.split], ["next(csv.reader([line]))", c.csv]] }),
        h("p", { class: "tv-now", html: c.note }));
    };
    el.append(seg(["clean", "quotes", "extra field", "missing", "encoding"], "Pick a CSV line", draw), box);
    draw(0);
  }

  const COLS = ["id", "city", "amount"];
  const PQ = [[101, "CPH", 250], [102, "AAR", 99], [103, "ODE", 125], [104, "CPH", 80], [105, "AAR", 40], [106, "ODE", 60]];
  function parquetWidget(el) {
    let layout = 0, query = 0;
    const box = h("div");
    const draw = () => {
      const cells = [], marks = {};
      if (layout === 0) PQ.forEach(r => r.forEach((v, c) => cells.push({ v, c, r: r[0] })));
      else COLS.forEach((_, c) => PQ.forEach(r => cells.push({ v: r[c], c, r: r[0] })));
      cells.forEach((x, i) => {
        if (query === 0) marks[i] = layout === 0 ? (x.c === 2 ? "held" : "cmp") : (x.c === 2 ? "held" : "dim");
        else marks[i] = x.r === 103 ? "held" : "dim";
      });
      let read, jumps, text;
      if (query === 0 && layout === 0) { read = 18; jumps = 1; text = "Rows are stored one after another, so the amounts are mixed in with ids and cities. To sum them you read <b>every cell</b>: 18 of 18. Amber = read but not needed."; }
      if (query === 0 && layout === 1) { read = 6; jumps = 1; text = "All amounts sit together in one chunk. Read <b>only that chunk</b>: 6 of 18 cells. With 20 columns and 10 million rows you read 1/20 of the file. That is why analysis tools like Parquet (L10 p21)."; }
      if (query === 1 && layout === 0) { read = 3; jumps = 1; text = "Order 103 is in one place: 3 cells, one read. Fetching whole records is what row layouts (CSV, Avro, an app database) are good at."; }
      if (query === 1 && layout === 1) { read = 3; jumps = 3; text = "The three fields of order 103 are in three different chunks: 3 cells, but <b>3 jumps</b>. Column layouts are slower for “give me one whole record”."; }
      box.replaceChildren(
        h("div", { style: "overflow-x:auto;padding-bottom:4px" }, D.array(cells.map(x => String(x.v)), { name: layout === 0 ? "file, by row" : "file, by column", marks, index: false })),
        h("p", { class: "small muted", style: "margin:4px 0" }, layout === 0 ? "order: 101 CPH 250 | 102 AAR 99 | …" : "order: all ids | all cities | all amounts"),
        ui.table({ head: ["Cells read", "Places to jump to"], num: [0, 1], rows: [[read + " of 18", String(jumps)]] }),
        h("p", { class: "tv-now", html: text }),
        D.legend([["held", "needed and read"], ["cmp", "read, not needed"], ["dim", "skipped"]]));
    };
    el.append(row(seg(["Row layout (CSV)", "Column layout (Parquet)"], "Layout", i => { layout = i; draw(); }),
      seg(["SUM(amount)", "all of order 103"], "Query", i => { query = i; draw(); })), box);
    draw();
  }

  const formats = {
    id: "de-formats",
    title: "File formats",
    summary: "Structure vs format; CSV, JSON, XML, Parquet and Avro with their traps; serialization vs layout vs compression; schema drift; small mistakes that break big numbers.",
    sources: "L10 p17–27",
    blocks: [
      { type: "h", text: "Structure is not format", sub: "L10 p17. Structure = what the information looks like. Format = how it is written down." },
      { type: "table", head: ["Structure", "Means", "Tiny example"], rows: [
        ["Structured", "fixed columns, fixed types", "a sales table: order_id, city, total_dkk"],
        ["Semi-structured", "named fields, can nest, can vary", "a JSON answer from an API"],
        ["Unstructured", "no table shape", "images, PDFs, free text"],
      ] },
      `<p>A CSV file is a <b>format</b>; a relational table is a <b>data model</b>. The same table can be written as CSV, JSON or Parquet.</p>`,

      { type: "h", text: "CSV: simple, but every value is text", sub: "L10 p18" },
      { type: "widget", title: "split(',') vs the csv module", intro: "Pick a line. Each one hides a classic CSV trap.", render: csvWidget },
      {
        type: "tryit",
        title: "Read the slide's CSV",
        task: "This is the CSV from L10 p18, plus a quoted city. Run it and look at row 102. Then try <code>float(row['total_dkk'])</code> for each row.",
        code: `
          import csv
          import io

          text = """order_id,city,total_dkk
          101,Copenhagen,250.50
          102,Aarhus,,99.00
          103,"Odense, Fyn",131.75"""

          for row in csv.DictReader(io.StringIO(text)):     # io.StringIO: treat the text like a file
              print(row)`,
        expectOutput: "{'order_id': '101', 'city': 'Copenhagen', 'total_dkk': '250.50'}\n{'order_id': '102', 'city': 'Aarhus', 'total_dkk': '', None: ['99.00']}\n{'order_id': '103', 'city': 'Odense, Fyn', 'total_dkk': '131.75'}",
        hint: "Row 102 has an empty <code>total_dkk</code> (<code>''</code>), so <code>float('')</code> raises ValueError. The 99.00 went to the key <code>None</code>.",
      },
      { type: "callout", kind: "warn", title: "CSV has no schema contract", html: "<p>Nothing in the file says “total_dkk is a number” (L10 p18). Watch for quoting, missing values, encoding and types that a tool guesses for you.</p>" },

      { type: "h", text: "JSON: nested and flexible", sub: "L10 p19" },
      { type: "table", head: ["Situation", "JSON", "In Python", "<code>o.get('delivery')</code>"], rows: [
        ["key with a value", "<code>\"delivery\": {\"city\": \"Copenhagen\"}</code>", "a dict inside the dict", "<code>{'city': 'Copenhagen'}</code>"],
        ["key with null", "<code>\"delivery\": null</code>", "<code>None</code>", "<code>None</code>"],
        ["key missing", "(no delivery key)", "<code>'delivery' in o</code> is False", "<code>None</code>"],
      ] },
      `<p>Missing and null look the same through <code>.get()</code>, but they mean different things: “we sent no delivery info” vs “we know there is no delivery”. Use <code>in</code> to tell them apart.</p>`,
      {
        type: "tryit",
        title: "Missing key vs null",
        task: "Run it. Then print each order's city without crashing: <code>Copenhagen</code>, <code>no delivery</code> (null), <code>unknown</code> (missing key).",
        code: `
          import json

          text = '''[
            {"order_id": 101, "total_dkk": 250.5, "tags": ["new", "mobile"], "delivery": {"city": "Copenhagen"}},
            {"order_id": 102, "total_dkk": 99.0, "tags": [], "delivery": null},
            {"order_id": 103, "total_dkk": 131.75, "tags": ["new"]}
          ]'''

          orders = json.loads(text)                         # JSON text -> list of dicts
          for o in orders:
              print(o["order_id"], "delivery" in o, o.get("delivery"))

          print(orders[0]["delivery"]["city"])              # nested: dict inside a dict`,
        hint: "First ask <code>if \"delivery\" not in o</code>. Then <code>elif o[\"delivery\"] is None</code>. Else read <code>o[\"delivery\"][\"city\"]</code>.",
        solution: `
          import json

          text = '''[
            {"order_id": 101, "total_dkk": 250.5, "tags": ["new", "mobile"], "delivery": {"city": "Copenhagen"}},
            {"order_id": 102, "total_dkk": 99.0, "tags": [], "delivery": null},
            {"order_id": 103, "total_dkk": 131.75, "tags": ["new"]}
          ]'''

          orders = json.loads(text)
          for o in orders:
              if "delivery" not in o:                       # key missing
                  city = "unknown"
              elif o["delivery"] is None:                   # key there, value null
                  city = "no delivery"
              else:
                  city = o["delivery"]["city"]
              print(o["order_id"], city)`,
        solutionNote: "Prints 101 Copenhagen · 102 no delivery · 103 unknown. <code>o[\"delivery\"][\"city\"]</code> on order 102 would be <code>None[\"city\"]</code>: TypeError.",
      },

      { type: "h", text: "XML: the same idea with tags", sub: "L10 p20" },
      { type: "table", head: ["JSON", "XML"], code: [0, 1], rows: [[
        '{"order_id": 101, "city": "Copenhagen",\n "total": 250.50, "currency": "DKK"}',
        '<order id="101">\n  <city>Copenhagen</city>\n  <total currency="DKK">250.50</total>\n</order>',
      ]] },
      {
        type: "tryit",
        title: "Read XML with ElementTree",
        task: "Run it. Attributes (inside the tag) are read with <code>.get()</code>, child elements with <code>.find()</code>. Then print the currency only.",
        code: `
          import xml.etree.ElementTree as ET

          text = '<order id="101"><city>Copenhagen</city><total currency="DKK">250.50</total></order>'

          order = ET.fromstring(text)              # the <order> element
          print(order.get("id"))                   # an attribute: '101' (text!)
          print(order.find("city").text)           # a child element's text

          total = order.find("total")
          print(total.text, total.get("currency"))
          print(float(total.text) * 2)             # parse before maths`,
        expectOutput: "101\nCopenhagen\n250.50 DKK\n501.0",
      },

      { type: "h", text: "Parquet and Avro: binary formats", sub: "L10 p21–22" },
      { type: "widget", title: "Row vs column layout", intro: "Six orders, three columns, stored as one strip of cells. Change the layout and the question.", render: parquetWidget },
      { type: "code", caption: "Avro: every file carries a schema (L10 p22, simplified)", code: `
          record Order:
              order_id: long        # whole number
              city: string
              amount: double        # decimal number` },
      `<p>Avro stores <b>typed rows</b> with the writer's schema, so a reader knows <code>amount</code> is a number. Good for streams of events. The price: someone must manage schema changes.</p>`,
      { type: "table", caption: "Compare the five (L10 p23)", head: ["Format", "Shape", "Human-readable", "Best fit", "Main catch"], rows: [
        ["CSV", "flat rows", "yes", "simple export", "weak types"],
        ["JSON", "nested fields", "yes", "APIs, events", "schema can vary"],
        ["XML", "tree of tags", "yes", "system exchange", "wordy"],
        ["Parquet", "binary, by column", "no", "big analysis", "not for hand-editing"],
        ["Avro", "binary, by row", "no", "typed event records", "schema management"],
      ] },

      { type: "h", text: "Serialization, layout, compression", sub: "L10 p24. Three different problems." },
      { type: "table", head: ["Idea", "Solves", "Tiny example"], rows: [
        ["Serialization", "turn a Python value into bytes (and back)", "<code>json.dumps([1, 2])</code> → <code>'[1, 2]'</code>"],
        ["File layout", "which bytes sit next to each other", "by row (CSV) vs by column (Parquet)"],
        ["Compression", "fewer bytes to store and send", "58,100 bytes → about 2,600 (costs CPU)"],
      ] },
      {
        type: "tryit",
        title: "Serialize, compress, and back",
        task: "Run it. Repetitive data compresses very well. Then change <code>\"Copenhagen\"</code> to <code>f\"city{i}\"</code> and see the compressed size grow.",
        code: `
          import json
          import zlib

          orders = [{"order_id": 100 + i, "city": "Copenhagen", "amount": 250.5} for i in range(1000)]

          data = json.dumps(orders).encode("utf-8")      # serialize: list of dicts -> bytes
          small = zlib.compress(data)                    # compress: fewer bytes

          print(len(data), "bytes as JSON text")
          print(len(small), "bytes compressed")

          back = json.loads(zlib.decompress(small))      # and all the way back
          print(back[0], back == orders)`,
        solutionNote: "In Python 3.12 this prints 58100 bytes, about 2600 compressed (the exact number depends on the zlib version), then the first order and True.",
      },
      { type: "table", caption: "How to choose (L10 p25)", head: ["Ask", "Tiny example"], rows: [
        ["Who reads it?", "a spreadsheet user → CSV; a SQL engine → Parquet"],
        ["What shape is it?", "nested orders with item lists → JSON"],
        ["What is the workload?", "summing one column of 10 M rows → Parquet"],
        ["What are the limits?", "an old system only accepts XML"],
      ] },

      { type: "h", text: "Schema drift: the API changed", sub: "L10 p26" },
      { type: "table", head: ["Yesterday", "Today"], code: [0, 1], rows: [['{"id": 7, "price": 49.5}', '{"id": 7, "unit_price": "49.5"}']] },
      {
        type: "tryit",
        title: "Make get_price survive the change",
        task: "Run it, read the error, then make <code>get_price</code> work for <b>both</b> shapes.",
        code: `
          old = {"id": 7, "price": 49.5}               # yesterday
          new = {"id": 7, "unit_price": "49.5"}        # today: new name, and it is text

          def get_price(record):
              return record["price"]                   # only knows the old name

          print(get_price(old) * 2)
          print(get_price(new) * 2)`,
        hint: "Ask first with <code>if \"price\" in record:</code>. For the new shape, turn the text into a number with <code>float()</code>.",
        solution: `
          old = {"id": 7, "price": 49.5}
          new = {"id": 7, "unit_price": "49.5"}

          def get_price(record):
              if "price" in record:                    # old shape
                  return float(record["price"])
              return float(record["unit_price"])       # new shape: text -> number

          print(get_price(old) * 2)                    # 99.0
          print(get_price(new) * 2)                    # 99.0`,
        solutionNote: "Without <code>float()</code>, <code>'49.5' * 2</code> would give the text <code>'49.549.5'</code>. The slide's real answer: <b>contract-test</b> the expected fields and types, so a change fails loudly in a test, not silently in a report.",
      },

      { type: "h", text: "Small format mistakes, big errors", sub: "L10 p27" },
      { type: "table", head: ["Area", "Rule", "Tiny example"], rows: [
        ["Dates", "unambiguous format + explicit timezone", "<code>05/11/2026</code>: 5 Nov or 11 May? <code>2026-11-05T08:00:00+00:00</code> is clear"],
        ["Units", "keep currency and units explicit", "250 DKK + 250 EUR is not 500 of anything"],
        ["Types", "parse numbers before adding", "<code>'250.50' * 2</code> → <code>'250.50250.50'</code>"],
        ["Missing", "unknown is not zero: reject, impute or flag", "a missing amount as 0 pulls the average down"],
      ] },
      {
        type: "tryit",
        title: "Dates: ISO text sorts right, and timezones matter",
        task: "Run it. Day/month text sorts 5 Nov before 12 Oct. ISO (year-month-day) sorts correctly even as text.",
        code: `
          from datetime import datetime

          a = datetime.fromisoformat("2026-11-05T08:00:00+00:00")   # 08:00 in UTC
          b = datetime.fromisoformat("2026-11-05T09:00:00+01:00")   # 09:00 in Copenhagen
          print(a == b)                                             # the same moment?

          print(sorted(["05/11/2026", "12/10/2026"]))               # day/month/year as text
          print(sorted(["2026-11-05", "2026-10-12"]))               # ISO as text`,
        expectOutput: "True\n['05/11/2026', '12/10/2026']\n['2026-10-12', '2026-11-05']",
      },
      { type: "mistakes", items: [
        { title: "Splitting CSV by hand", wrong: "fields = line.split(',')", right: "fields = next(csv.reader([line]))", why: "A quoted <code>\"Odense, Fyn\"</code> becomes two fields with <code>split</code>." },
        { title: "Doing maths on CSV text", wrong: "row = '101,CPH,250.50'.split(',')\nprint(row[2] * 2)    # '250.50250.50'", right: "print(float(row[2]) * 2)   # 501.0", why: "Every CSV field is text. Parse it first." },
        { title: "Treating missing as zero", wrong: "amount = float(text or 0)   # '' becomes 0.0", right: "if text == '':\n    rejected.append(order_id)   # flag it", why: "Unknown is not 0. A zero would pull the average down (L10 p27)." },
        { title: "Adding different units", wrong: "total = 250 + 250   # DKK + EUR", right: "total = 250 + 250 * eur_to_dkk", why: "250 DKK + 250 EUR is not 500 of anything (L10 p27)." },
        { title: "Trusting a field name forever", wrong: "price = record['price']   # KeyError today", right: "price = record.get('price')\nif price is None:\n    price = float(record['unit_price'])", why: "APIs change (schema drift). Check the keys, test the contract (L10 p26)." },
        { title: "<code>.get(key, default)</code> on a null", wrong: "o.get('delivery', 'none')   # expect 'none'", right: "o.get('delivery') is None   # covers both", why: "The default is used only when the key is <b>missing</b>. A key with null gives None." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "A dashboard sums one column over 10 million rows every hour. Which format fits best?", options: ["CSV", "JSON", "Parquet", "XML"], answer: 2,
        wrong: { 0: "CSV is row-by-row text: it must read every column of every row.", 1: "JSON is for flexible, nested records, e.g. API answers.", 3: "XML is wordy markup for exchange between systems." },
        hint: "Which format stores data by column?", explain: "Parquet stores each column together and compressed, so summing one column reads only that column (L10 p21)." },
      { type: "mc", q: "An API answer like <code>{\"id\": 7, \"tags\": [\"new\"], \"delivery\": {\"city\": \"CPH\"}}</code> is…", options: ["structured", "semi-structured", "unstructured"], answer: 1,
        hint: "Named fields that can nest.", explain: "Named, nested, flexible fields = semi-structured (L10 p17)." },
      { type: "predict", q: "What does this print?", code: `
          import json
          o = json.loads('{"order_id": 102, "delivery": null}')
          print(o.get("delivery", "none"))`, answer: "None",
        hint: "The key <code>delivery</code> is there. When is the default used?", explain: "The key exists with the value null → <code>None</code>. The default <code>'none'</code> is only for a missing key." },
      { type: "predict", q: "What does this print?", code: "row = '101,CPH,250.50'.split(',')\nprint(row[2] * 2)", answer: "250.50250.50",
        hint: "What type is <code>row[2]</code>? What does <code>*</code> do to that type?", explain: "<code>split</code> gives text, so <code>row[2]</code> is <code>'250.50'</code>. Text times 2 repeats it. <code>float(row[2]) * 2</code> would give 501.0." },
      { type: "write", q: "Write <code>check_schema(record, schema)</code>. <code>schema</code> maps field names to types, e.g. <code>{\"id\": int, \"price\": float}</code>. <b>Return</b> a list of problems: <code>\"missing price\"</code> for a missing field, <code>\"price should be float\"</code> for a wrong type. Empty list = OK.",
        starter: `
          def check_schema(record, schema):
              problems = []
              # loop over schema.items(); check "in" first, then isinstance()
              return problems

          print(check_schema({"id": 7, "unit_price": "49.5"}, {"id": int, "price": float}))   # ['missing price']`,
        checks: [["check_schema({'id': 7, 'price': 49.5}, {'id': int, 'price': float})", "[]"], ["check_schema({'id': 7, 'unit_price': '49.5'}, {'id': int, 'price': float})", "['missing price']"], ["check_schema({'id': '7', 'price': 49.5}, {'id': int, 'price': float})", "['id should be int']"]],
        solution: `
          def check_schema(record, schema):
              problems = []

              for field, kind in schema.items():               # e.g. ('price', float)
                  if field not in record:
                      problems.append("missing " + field)
                  elif not isinstance(record[field], kind):
                      problems.append(field + " should be " + kind.__name__)   # float.__name__ is 'float'

              return problems`,
        hint: "<code>for field, kind in schema.items():</code>. Use <code>if field not in record</code>, then <code>elif not isinstance(record[field], kind)</code>. <code>kind.__name__</code> gives the text <code>'float'</code>.",
        explain: "This is a tiny <b>contract test</b> (L10 p26): it catches schema drift before the numbers go wrong." },
      { type: "mc", q: "Which word means “turn a Python dict into bytes to send”?", options: ["compression", "serialization", "partitioning", "layout"], answer: 1,
        hint: "L10 p24: three ideas.", explain: "Serialization encodes a value as bytes. Compression makes bytes fewer; layout decides their order." },
    ],
  };

  /* ================================================================
     TOPIC 4: Storage (L10 p28–36)
     ================================================================ */
  const GB_ORDERS = [[101, "Copenhagen", 250.5], [102, "Aarhus", 99.0], [103, "Odense", 125.0], [104, "Copenhagen", 80.0]];
  function gbSteps() {
    const S = [], tot = {}, fmt = v => (Number.isInteger(v) ? v.toFixed(1) : String(v));
    const T = () => "{" + Object.keys(tot).map(k => "'" + k + "': " + fmt(tot[k])).join(", ") + "}";
    S.push({ line: 0, now: "Four orders. We want <code>SELECT city, SUM(total_dkk) ... GROUP BY city</code>, written as a loop.", vars: {}, cur: null, tot: {} });
    S.push({ line: 6, now: "An empty dict: one key per city, the value is that city's sum.", vars: { totals: "{}" }, cur: null, tot: {} });
    GB_ORDERS.forEach(([id, city, amt], i) => {
      const iv = { order_id: String(id), city: "'" + city + "'", total_dkk: fmt(amt), totals: T() };
      S.push({ line: 7, now: `Row ${i + 1}: order ${id} from ${city}, ${fmt(amt)} DKK.`, vars: iv, cur: i, tot: Object.assign({}, tot) });
      if (!(city in tot)) {
        S.push({ line: 8, now: `Is '${city}' in totals? <b>No</b>: first order from this city.`, cur: i, tot: Object.assign({}, tot) });
        tot[city] = 0;
        S.push({ line: 9, now: `Start its sum at 0.`, vars: Object.assign({}, iv, { totals: T() }), cur: i, tot: Object.assign({}, tot), hot: city });
      } else {
        S.push({ line: 8, now: `Is '${city}' in totals? <b>Yes</b> (sum so far ${fmt(tot[city])}). Skip the start.`, cur: i, tot: Object.assign({}, tot), hot: city });
      }
      const before = tot[city];
      tot[city] += amt;
      S.push({ line: 10, now: `${fmt(before)} + ${fmt(amt)} = <b>${fmt(tot[city])}</b>.`, vars: Object.assign({}, iv, { totals: T() }), cur: i, tot: Object.assign({}, tot), hot: city });
    });
    S.push({ line: 12, now: "Print the groups. Same answer as the SQL query.", print: T(), cur: null, tot: Object.assign({}, tot) });
    return S;
  }
  function gbVisual(el, st) {
    el.append(ui.table({ head: ["order_id", "city", "total_dkk"], num: [0, 2], rows: GB_ORDERS.map((r, i) => [(st.cur === i ? "▶ " : "") + r[0], r[1], r[2].toFixed(2)]) }));
    const keys = Object.keys(st.tot);
    el.append(h("p", { class: "eyebrow", style: "margin:10px 0 4px" }, "totals (one group per city)"),
      keys.length ? h("div", { class: "row-wrap" }, keys.map(k => h("span", { class: "tv-pill" + (k === st.hot ? " mk-held" : "") }, k + ": " + st.tot[k].toFixed(1)))) : h("p", { class: "novars" }, "empty"));
  }

  const STAR = {
    products: { P1: ["Coffee beans", "Coffee"], P2: ["Mug", "Kitchen"], P3: ["Filter papers", "Coffee"] },
    dates: { 1: ["2026-11-02", "Nov"], 2: ["2026-12-01", "Dec"] },
    sales: [[1, "P1", 2, 100], [1, "P2", 1, 80], [2, "P1", 3, 150], [2, "P3", 1, 40]],
  };
  function starWidget(el) {
    const box = h("div");
    const draw = q => {
      const groups = {}, tag = [];
      STAR.sales.forEach(([d, p, , rev]) => {
        const g = q === 0 ? STAR.products[p][1] : STAR.dates[d][1];
        tag.push(g); groups[g] = (groups[g] || 0) + rev;
      });
      const S = D.svg({ w: 600, h: 150, label: "star schema: a sales fact table linked to a date and a product dimension" });
      S.box(220, 40, 160, 70, { text: "Sales fact", sub: "date_id, product_id, quantity, revenue_dkk", tone: "accent" });
      S.box(10, 50, 150, 50, { text: "Date dimension", sub: "date, month, year", tone: q === 1 ? "cmp" : "tile" });
      S.box(440, 50, 150, 50, { text: "Product dimension", sub: "product, category", tone: q === 0 ? "cmp" : "tile" });
      S.arrow(218, 75, 162, 75, { label: "date_id", tone: q === 1 ? "cmp" : null });
      S.arrow(382, 75, 438, 75, { label: "product_id", tone: q === 0 ? "cmp" : null });
      S.text(300, 140, "facts = measurable events · dimensions = context", { small: true, muted: true });
      box.replaceChildren(h("div", { style: "overflow-x:auto" }, S.el),
        h("div", { class: "tv-two" },
          ui.table({ caption: "Sales fact table", head: ["date_id", "product_id", "qty", "revenue_dkk", q === 0 ? "→ category" : "→ month"], num: [2, 3], rows: STAR.sales.map((r, i) => [String(r[0]), r[1], String(r[2]), String(r[3]), "<b>" + tag[i] + "</b>"]) }),
          ui.table({ caption: q === 0 ? "Product dimension" : "Date dimension", head: q === 0 ? ["product_id", "product", "category"] : ["date_id", "date", "month"],
            rows: q === 0 ? Object.keys(STAR.products).map(k => [k, ...STAR.products[k]]) : Object.keys(STAR.dates).map(k => [k, ...STAR.dates[k]]) })),
        ui.table({ caption: q === 0 ? "Revenue by category" : "Revenue by month", head: [q === 0 ? "category" : "month", "revenue_dkk"], num: [1], rows: Object.keys(groups).map(k => [k, String(groups[k])]) }));
    };
    el.append(seg(["Revenue by category", "Revenue by month"], "BI question", draw), box);
    draw(0);
  }

  const storage = {
    id: "de-storage",
    title: "Storage",
    summary: "Databases, warehouses, lakes and lakehouses; keys and GROUP BY; OLTP vs OLAP; four kinds of NoSQL; facts and dimensions; raw → curated layers and partitions.",
    sources: "L10 p28–36",
    blocks: [
      { type: "h", text: "Four storage families", sub: "L10 p28" },
      { type: "table", head: ["Store", "Best at", "Tiny example"], rows: [
        ["Operational database", "fast small reads and writes; the current state", "insert one order at checkout"],
        ["Data warehouse", "structured analytical queries", "revenue per month over a million orders"],
        ["Data lake", "cheap storage of raw files of any kind", "CSV, JSON, images side by side"],
        ["Lakehouse", "lake storage + managed, reliable tables", "raw files plus SQL tables with transactions"],
      ] },

      { type: "h", text: "Relational databases: rows, keys and SQL", sub: "L10 p29" },
      { type: "table", head: ["Key", "Means", "Tiny example"], rows: [
        ["Primary key", "identifies exactly one row", "<code>order_id</code> 101 in <code>orders</code>"],
        ["Foreign key", "points at a row in another table", "<code>orders.customer_id = 7</code> → customer 7 in <code>customers</code>"],
      ] },
      { type: "table", caption: "One question, three ways", head: ["SQL (slide)", "pandas", "plain Python"], code: [0, 1, 2], rows: [[
        "SELECT city, SUM(total_dkk)\nFROM orders\nGROUP BY city;",
        'orders.groupby("city")["total_dkk"].sum()',
        "totals = {}\nfor _, city, t in orders:\n    totals[city] = totals.get(city, 0) + t",
      ]] },
      {
        type: "stepper",
        title: "GROUP BY city, with a dict",
        code: `
          orders = [(101, "Copenhagen", 250.50),
                    (102, "Aarhus", 99.00),
                    (103, "Odense", 125.00),
                    (104, "Copenhagen", 80.00)]

          totals = {}                                   # city -> sum of total_dkk
          for order_id, city, total_dkk in orders:
              if city not in totals:                    # first order from this city
                  totals[city] = 0
              totals[city] += total_dkk

          print(totals)`,
        what: { 7: "Unpack each tuple into three names.", 8: "A new group? Then make it.", 10: "Add this row to its group." },
        steps: gbSteps(),
        visualTitle: "Rows and groups",
        visual: gbVisual,
      },
      {
        type: "tryit",
        title: "The same GROUP BY in pandas",
        task: "Run it (pandas loads the first time, a few seconds). Then change it to count the orders per city with <code>.count()</code>.",
        code: `
          import pandas as pd

          orders = pd.DataFrame({"order_id": [101, 102, 103, 104],
                                 "city": ["Copenhagen", "Aarhus", "Odense", "Copenhagen"],
                                 "total_dkk": [250.50, 99.00, 125.00, 80.00]})

          print(orders.groupby("city")["total_dkk"].sum())   # SELECT city, SUM(total_dkk) GROUP BY city`,
        solutionNote: "Prints Aarhus 99.0, Copenhagen 330.5, Odense 125.0 (pandas sorts the groups by name). <code>.count()</code> gives 1, 2, 1. More on groupby: <a href=\"#datasci/groupby\">groupby</a>.",
      },

      { type: "h", text: "OLTP vs OLAP", sub: "L10 p30. A workload, not a product." },
      { type: "table", head: ["", "OLTP (transactions)", "OLAP (analysis)"], rows: [
        ["Typical action", "insert one order", "sum a million orders"],
        ["Query shape", "short, touches a few rows", "scans, joins, summaries"],
        ["Priority", "correct updates while many users write", "insight over big data"],
        ["Example", "the shop's checkout database", "the monthly revenue dashboard (e.g. Amazon Redshift)"],
      ] },

      { type: "h", text: "NoSQL: four data models", sub: "L10 p31" },
      { type: "table", head: ["Type", "Data looks like", "Good for"], code: [1], rows: [
        ["Document", '{"order_id": 101, "items": [{"sku": "P1", "qty": 2}]}', "JSON-like business records"],
        ["Key-value", 'sessions["u42"] = "cart: 3 items"', "fast lookup by one key"],
        ["Wide-column", 's-17 | 08:00=21.4 | 08:01=21.5 | …', "huge, partitioned streams of records"],
        ["Graph", "(Ann) -follows-> (Bo)", "things and their relationships"],
      ] },
      { type: "callout", kind: "warn", title: "NoSQL does not mean “no schema”", html: "<p>Your code still expects fields and types. The rules just live in the application, not the database (L10 p31).</p>" },

      { type: "h", text: "Warehouses: facts and dimensions", sub: "L10 p32" },
      { type: "widget", title: "A tiny star schema", intro: "The fact table holds the sales. A BI question joins it to one dimension and sums. Switch the question.", render: starWidget },
      {
        type: "tryit",
        title: "Join a fact table to a dimension",
        task: "Run it: revenue by category. Then change it to revenue by month using <code>dates</code>.",
        code: `
          products = {"P1": ("Coffee beans", "Coffee"),       # product dimension: id -> (name, category)
                      "P2": ("Mug", "Kitchen"),
                      "P3": ("Filter papers", "Coffee")}
          dates = {1: ("2026-11-02", "Nov"), 2: ("2026-12-01", "Dec")}   # date dimension

          sales = [(1, "P1", 2, 100), (1, "P2", 1, 80),        # fact table: date_id, product_id, quantity, revenue_dkk
                   (2, "P1", 3, 150), (2, "P3", 1, 40)]

          by_category = {}
          for date_id, product_id, quantity, revenue_dkk in sales:
              name, category = products[product_id]           # the join: look up by foreign key
              if category not in by_category:
                  by_category[category] = 0
              by_category[category] += revenue_dkk

          print(by_category)`,
        expectOutput: "{'Coffee': 290, 'Kitchen': 80}",
        solution: `
          products = {"P1": ("Coffee beans", "Coffee"), "P2": ("Mug", "Kitchen"), "P3": ("Filter papers", "Coffee")}
          dates = {1: ("2026-11-02", "Nov"), 2: ("2026-12-01", "Dec")}
          sales = [(1, "P1", 2, 100), (1, "P2", 1, 80), (2, "P1", 3, 150), (2, "P3", 1, 40)]

          by_month = {}
          for date_id, product_id, quantity, revenue_dkk in sales:
              day, month = dates[date_id]                     # join to the date dimension instead
              if month not in by_month:
                  by_month[month] = 0
              by_month[month] += revenue_dkk

          print(by_month)                                     # {'Nov': 180, 'Dec': 190}`,
      },

      { type: "h", text: "Lakes and lakehouses", sub: "L10 p33–34" },
      { type: "table", head: ["", "Data lake", "Lakehouse"], rows: [
        ["Stores", "raw files of any kind (CSV, JSON, Parquet, images)", "the same files…"],
        ["Adds", "cheap, scalable, can replay old data", "…plus managed tables: metadata, transactions, schema checks"],
        ["Risk", "no metadata or access control → a “data swamp”", "the guarantees depend on the table format and its settings"],
      ] },
      { type: "table", caption: "Choose for the workload (L10 p35)", head: ["Question", "Database", "Warehouse", "Lake / lakehouse"], rows: [
        ["Main need", "run an app", "query curated metrics", "keep or analyse varied data"],
        ["Typical data", "current records", "integrated, historical", "raw and curated files"],
        ["Good fit", "checkout, inventory", "reports, dashboards", "exploration, ML"],
        ["Watch out", "big analytical scans", "keeping models and loads up to date", "governance and file layout"],
      ] },

      { type: "h", text: "Layers, partitions, retention", sub: "L10 p36" },
      () => card(chainSvg([["Raw", "as it came"], ["Staging", "checked, standard"], ["Curated", "trusted tables"], ["Serving", "shaped for users"]], "four storage layers from raw to serving", { 2: "done" })),
      { type: "table", head: ["Layer", "Order 101 looks like"], code: [1], rows: [
        ["Raw", "'101,CPH,250.50 '"],
        ["Staging", "{'order_id': 101, 'city': 'Copenhagen', 'amount_dkk': 250.5}"],
        ["Curated", "daily_revenue: ('2026-11-05', 'P1', 250.5)"],
        ["Serving", "dashboard tile: 'Revenue today: 250.5 DKK'"],
      ] },
      `<p>Keep the raw layer: if a cleaning rule was wrong, you can run it again from the original.</p>`,
      {
        type: "tryit",
        title: "Partition by date",
        task: "Files go into one folder per day. A query for one day opens one folder. Run it, then think: what if you partitioned by <code>order_id</code>?",
        code: `
          orders = [("2026-11-04", 101, 250.5), ("2026-11-05", 102, 99.0),
                    ("2026-11-05", 103, 131.75), ("2026-11-06", 104, 80.0)]

          partitions = {}                                     # folder -> rows in it
          for day, order_id, amount in orders:
              folder = "orders/date=" + day + "/"
              if folder not in partitions:
                  partitions[folder] = []
              partitions[folder].append((order_id, amount))

          for folder, rows in partitions.items():
              print(folder, rows)

          wanted = "orders/date=2026-11-05/"
          print("rows read for 5 Nov:", len(partitions[wanted]), "of", len(orders))`,
        expectOutput: "orders/date=2026-11-04/ [(101, 250.5)]\norders/date=2026-11-05/ [(102, 99.0), (103, 131.75)]\norders/date=2026-11-06/ [(104, 80.0)]\nrows read for 5 Nov: 2 of 4",
        solutionNote: "By <code>order_id</code> every order gets its own tiny folder: millions of tiny files, slow to list and open. Partition by a column you often filter on, like the date (L10 p36).",
      },
      { type: "mistakes", items: [
        { title: "Big reports on the checkout database", wrong: "# run the 5-year revenue query on the live shop DB", right: "# copy to a warehouse; query there", why: "Long scans slow down the app's small, urgent writes (OLTP vs OLAP)." },
        { title: "“NoSQL = no schema”", wrong: "doc['price'] * 2   # assume it is there", right: "price = doc.get('price')\nif price is None: ...", why: "The schema still exists; your code enforces it (L10 p31)." },
        { title: "A lake with no metadata", wrong: "s3://bucket/final_v2_REAL.csv", right: "orders/date=2026-11-05/part-0.parquet + owner + description", why: "Without metadata and access control a lake becomes a swamp (L10 p33)." },
        { title: "Too many tiny partitions", wrong: "orders/order_id=101/  orders/order_id=102/ …", right: "orders/date=2026-11-05/", why: "Partition by a frequently filtered column with few values, like the date (L10 p36)." },
        { title: "Overwriting the raw data", wrong: "raw = clean(raw)   # original gone", right: "staging = clean(raw)   # raw kept", why: "Keep raw so you can re-run a fixed rule." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "Pick the store: the shop must save each order the moment a customer pays.", options: ["Operational database (OLTP)", "Data warehouse", "Data lake", "A Parquet file"], answer: 0,
        hint: "Many small, safe writes.", explain: "Writing one order at checkout is a short transaction: OLTP (L10 p30)." },
      { type: "mc", q: "Pick the store: monthly revenue by category for the last 5 years, for a dashboard.", options: ["Operational database", "Data warehouse", "Key-value store", "Graph database"], answer: 1,
        hint: "Curated, historical, analytical.", explain: "Structured analytical queries over history: a warehouse (OLAP) (L10 p32, p35)." },
      { type: "mc", q: "Pick the store: keep raw CSV, JSON and product photos cheaply for later ML.", options: ["Data warehouse", "Data lake", "Operational database", "Key-value store"], answer: 1,
        hint: "Varied raw files, cheap, replayable.", explain: "A data lake keeps diverse raw files (L10 p33). A lakehouse adds managed tables on top." },
      { type: "mc", q: "Pick the store: “who follows whom” among users, to suggest friends.", options: ["Document", "Key-value", "Wide-column", "Graph"], answer: 3,
        hint: "Things and their relationships.", explain: "Nodes and edges: a graph database (L10 p31)." },
      { type: "predict", q: "What does this print?", code: `
          orders = [("CPH", 10), ("AAR", 5), ("CPH", 7)]
          totals = {}
          for city, t in orders:
              totals[city] = totals.get(city, 0) + t
          print(totals)`, answer: "{'CPH': 17, 'AAR': 5}",
        hint: "<code>.get(city, 0)</code> gives 0 the first time.", explain: "CPH: 0 + 10 = 10, then 10 + 7 = 17. AAR: 5. Keys keep the order they were first added." },
      { type: "explain", q: "In 2–3 sentences: in a star schema, what is a fact table and what is a dimension table? Give one example of each from a shop.",
        answer: "<p>A fact table stores measurable events, one row per event, with numbers you sum and keys pointing at dimensions: for example a sales table with date_id, product_id, quantity and revenue_dkk. A dimension table gives context to describe and group those facts: for example a product table with name and category. A BI query joins the facts to a dimension and groups by it, such as revenue by category.</p>",
        points: ["fact = measurable events (numbers + keys)", "dimension = context (who/what/when)", "query: join on the key, then group and sum"],
        hint: "L10 p32: “Dimensions describe context; facts store measurable events.”" },
    ],
  };

  /* ================================================================
     TOPIC 5: APIs & data collection (L10 p37–44)
     ================================================================ */
  const HTTP_PARTS = [
    { line: 0, t: "GET", what: "The <b>method</b>: what you want to do. GET = read. Collecting data is almost always GET (L10 p38)." },
    { line: 0, t: " " },
    { line: 0, t: "/v1/sensors", what: "The <b>path</b>: which resource. <code>v1</code> is the API version: a new v2 may change fields (schema drift)." },
    { line: 0, t: "?limit=2", what: "A <b>query parameter</b>: options after <code>?</code>, as <code>name=value</code>, joined by <code>&amp;</code>. Here: at most 2 items per page. In Python: <code>params={\"limit\": 2}</code>." },
    { line: 0, t: " HTTP/1.1", what: "The protocol version. You rarely touch it." },
    { line: 1, t: "Accept: application/json", what: "A <b>header</b>: extra info. Here the client says “please answer in JSON”. Login tokens also go in headers, never in the URL." },
    { line: 2, t: "" },
    { line: 3, t: "HTTP/1.1 " },
    { line: 3, t: "200 OK", what: "The <b>status code</b>: 200 means it worked. 2xx ok, 4xx your mistake, 5xx the server's problem. <code>r.raise_for_status()</code> raises an error for 4xx/5xx." },
    { line: 4, t: "Content-Type: application/json", what: "The <b>content type</b>: what the body is. JSON here, so <code>r.json()</code> can parse it." },
    { line: 5, t: "{\"items\": [{\"id\": 1, \"value\": 21.4}]}", what: "The <b>response body</b>: the data. <code>r.json()[\"items\"]</code> gives a list of dicts. Note: only 1 item, though we asked for 2 (L10 p39)." },
  ];
  function httpWidget(el) {
    const lines = [h("div"), h("div"), h("div"), h("div"), h("div"), h("div")];
    const panel = h("p", { class: "tv-now", "aria-live": "polite", html: "Click a highlighted part of the request or the response." });
    const all = [];
    HTTP_PARTS.forEach(p => {
      if (!p.what) { lines[p.line].append(h("span", null, p.t)); return; }
      const b = h("button", { type: "button", class: "tv-httpbtn", onclick: () => { all.forEach(x => x.classList.toggle("on", x === b)); panel.innerHTML = p.what; } }, p.t);
      all.push(b); lines[p.line].append(b);
    });
    lines[2].append(h("span", { class: "tv-httpsep" }, "— response —"));
    el.append(h("div", { class: "tv-http", role: "group", "aria-label": "HTTP request and response" }, ...lines), panel);
  }

  // the paginated collector, simulated step by step (matches API_CODE below)
  const API_PAGES = { None: [1, 2], c2: [2, 3], c3: [4] };
  const API_NEXT = { None: "c2", c2: "c3", c3: null };
  function apiSteps() {
    const S = [], rows = [], pages = { None: "", c2: "", c3: "" };
    let received = 0, checkpoint = "—", cursor = "None", failed = false;
    const q = c => c === "None" || c === null ? "None" : "'" + c + "'";
    const V = more => Object.assign({ cursor: q(cursor), received: String(received), rows: "{" + rows.map(i => i + ": {…}").join(", ") + "}", checkpoint: checkpoint === "—" ? "—" : q(checkpoint) }, more || {});
    const push = (line, now, more, extra) => S.push(Object.assign({ line, now, vars: V(more), pages: Object.assign({}, pages), rows: rows.slice(), checkpoint, cursor }, extra || {}));
    S.push({ line: 0, now: "A fake API with 3 pages. Page <code>c2</code> repeats id 2 (a re-delivery). Page <code>c3</code> fails once with 503.", vars: {}, pages: Object.assign({}, pages), rows: [], checkpoint, cursor: null });
    push(25, "Empty results. <code>cursor = None</code> means “give me the first page”.");
    for (const c of ["None", "c2", "c3"]) {
      cursor = c;
      push(27, `Ask for page ${q(c)} (with retries).`);
      let attempt = 0;
      if (c === "c3" && !failed) {
        failed = true; pages.c3 = "fail";
        push(16, `Try 1: <code>get_page('c3')</code> answers <b>503</b> (service unavailable). Temporary: worth a retry.`, { attempt: "0", status: "503" });
        push(17, "Is 503 == 200? <b>No</b>.", { attempt: "0", status: "503" });
        push(19, "Back off: wait 2 ** 0 = <b>1 second</b>. Next time 2, then 4. Waiting longer each time gives the server room to recover.", { attempt: "0", status: "503", wait: "1" });
        push(20, "Log it.", { attempt: "0", status: "503", wait: "1" }, { print: "  503 on page c3: wait 1 s, retry" });
        attempt = 1;
      }
      pages[c] = "ok";
      push(16, `Try ${attempt + 1}: <code>get_page(${q(c)})</code> answers <b>200</b> with ids ${API_PAGES[c].join(", ")}.`, { attempt: String(attempt), status: "200" });
      push(18, "200: give the page back to the loop.", { attempt: String(attempt), status: "200" });
      for (const id of API_PAGES[c]) {
        const dup = rows.includes(id);
        if (!dup) rows.push(id);
        received++;
        push(29, dup ? `id ${id} is <b>already</b> in <code>rows</code>: the same key is overwritten, not added. Still ${rows.length} unique.` : `Store <code>rows[${id}]</code>. ${rows.length} unique so far.`, { item: "{'id': " + id + ", …}" }, { dup: dup ? id : null });
      }
      checkpoint = API_NEXT[c];
      push(31, `Save the checkpoint: <code>${q(checkpoint)}</code>. If the job crashes now, a restart continues from here instead of page 1.`);
      push(32, "Log the page.", null, { print: `page ${c}: got ${API_PAGES[c].length}, unique so far ${rows.length}, checkpoint ${checkpoint === null ? "None" : checkpoint}` });
      if (checkpoint === null) { push(33, "Is the checkpoint None? <b>Yes</b>: no more pages."); push(34, "<code>break</code> out of the loop."); }
      else { push(33, `Is the checkpoint None? <b>No</b>.`); push(35, `Move on: <code>cursor = ${q(checkpoint)}</code>.`); }
    }
    push(37, "5 records arrived, 4 are unique. 200 OK on every page was <b>not</b> proof of a clean dataset.", null, { print: "received: 5 unique: 4" });
    return S;
  }
  function apiVisual(el, st) {
    el.append(h("div", { class: "row-wrap" }, ["None", "c2", "c3"].map(c => {
      const s = st.pages[c];
      return h("div", { class: "tv-page" + (st.cursor === c ? " mk-held" : s === "ok" ? " mk-done" : s === "fail" ? " mk-bad" : "") },
        h("b", null, "page " + c), h("div", { class: "mono small" }, "ids " + API_PAGES[c].join(", ")),
        h("div", { class: "small" }, s === "ok" ? "fetched ✓" : s === "fail" ? "503, retrying" : "not yet"));
    })));
    const marks = {};
    if (st.dup != null) marks[st.rows.indexOf(st.dup)] = "cmp";
    el.append(h("div", { style: "margin-top:10px" }, D.array(st.rows.map(String), { name: "rows (keys)", marks, index: false, emptyText: "empty" })),
      h("p", { class: "small", style: "margin:8px 0 0" }, "checkpoint: ", h("code", null, st.checkpoint === "—" ? "not saved yet" : st.checkpoint === null ? "None" : String(st.checkpoint))));
  }
  const API_CODE = `
    PAGES = {                                             # the fake API: cursor -> one page
        None: {"items": [{"id": 1, "value": 21.4}, {"id": 2, "value": 21.9}], "next": "c2"},
        "c2": {"items": [{"id": 2, "value": 21.9}, {"id": 3, "value": 22.3}], "next": "c3"},
        "c3": {"items": [{"id": 4, "value": 22.0}], "next": None},
    }
    failures = {"c3": 1}                                  # page c3 fails once, then works

    def get_page(cursor):                                 # stands in for requests.get(...)
        if failures.get(cursor, 0) > 0:
            failures[cursor] -= 1
            return 503, None                              # 503 = service unavailable
        return 200, PAGES[cursor]

    def fetch_with_retry(cursor, tries=3):
        for attempt in range(tries):
            status, body = get_page(cursor)
            if status == 200:
                return body
            wait = 2 ** attempt                           # backoff: 1, 2, 4 seconds
            print(f"  {status} on page {cursor}: wait {wait} s, retry")
        raise RuntimeError(f"page {cursor} failed {tries} times")

    rows = {}                                             # id -> record: a repeat overwrites itself
    received = 0
    cursor = None                                         # None = the first page
    while True:
        body = fetch_with_retry(cursor)
        for item in body["items"]:
            rows[item["id"]] = item                       # dedupe by the stable id
            received += 1
        checkpoint = body["next"]                         # save progress: a restart goes on from here
        print(f"page {cursor}: got {len(body['items'])}, unique so far {len(rows)}, checkpoint {checkpoint}")
        if checkpoint is None:                            # no more pages
            break
        cursor = checkpoint

    print("received:", received, "unique:", len(rows))`;

  const apis = {
    id: "de-apis",
    title: "APIs & data collection",
    summary: "What an API is, HTTP methods and status codes, reading a request and a response, pull/poll/push, and a collector that follows pages, retries with backoff, dedupes and checkpoints.",
    sources: "L10 p37–44",
    blocks: [
      { type: "h", text: "An API is a contract", sub: "L10 p37" },
      () => {
        const S = D.svg({ w: 600, h: 110, label: "a Python client sends an HTTP request to an API service and gets a response" });
        S.box(10, 25, 170, 60, { text: "Your Python code", sub: "the client / collector", tone: "accent" });
        S.box(420, 25, 170, 60, { text: "API service", sub: "checks, then answers", tone: "tile" });
        S.arrow(184, 42, 416, 42, { label: "HTTP request (GET …)" });
        S.arrow(416, 72, 184, 72, { label: "HTTP response (JSON …)" });
        return card(S.el, "The API defines what you may ask and what you get back. The answer may be JSON, XML or something else.");
      },
      { type: "table", head: ["HTTP method", "Means", "Example"], code: [2], rows: [
        ["GET", "read", "GET /v1/orders/101"],
        ["POST", "create / submit", "POST /v1/orders"],
        ["PUT / PATCH", "replace / change part of it", "PATCH /v1/orders/101"],
        ["DELETE", "remove", "DELETE /v1/orders/101"],
      ] },
      `<p>HTTP = HyperText Transfer Protocol. Collecting public records is mostly GET; always follow the API's documentation (L10 p38).</p>`,

      { type: "h", text: "Read a request and its response", sub: "L10 p39" },
      { type: "widget", title: "Click the parts", render: httpWidget },
      { type: "table", caption: "Status codes you will meet", head: ["Code", "Means", "Retry?"], rows: [
        ["200 OK", "worked", "—"],
        ["201 Created", "a POST made something", "—"],
        ["400 Bad Request", "your request is malformed", "no: fix the request"],
        ["401 / 403", "not logged in / not allowed", "no: fix the credentials"],
        ["404 Not Found", "no such resource", "no"],
        ["429 Too Many Requests", "rate limit hit", "<b>yes</b>, after waiting"],
        ["500 / 503", "server error / unavailable", "<b>yes</b>, with backoff"],
      ] },
      { type: "code", caption: "L10 p42 (shown only: the requests library does not run in this browser)", code: `
          import requests
          import pandas as pd

          url = "https://api.example.org/v1/sensors"               # 1. where to ask
          r = requests.get(url, params={"limit": 100}, timeout=10)  # 2. GET; give up after 10 s
          r.raise_for_status()                                     # 3. error if 4xx/5xx
          rows = r.json()["items"]                                 # 4. JSON text -> list of dicts
          df = pd.DataFrame(rows)                                  # 5. a table to analyse

          print(df["temperature"].mean())` },

      { type: "h", text: "Collecting needs care", sub: "L10 p40–41" },
      { type: "table", head: ["Area", "Do this", "Tiny example"], rows: [
        ["Access and safety", "approved credentials, least privilege; secrets outside the code; HTTPS; only the fields you may collect", "<code>key = os.environ[\"API_KEY\"]</code>, not typed in the notebook"],
        ["Completeness", "follow pagination; keep a last-updated cursor; handle null or changed fields", "page 1 has 100 of 2,350 rows"],
        ["Reliability", "timeouts; respect rate limits; retry temporary failures with backoff", "<code>timeout=10</code>; 429 → wait, then retry"],
      ] },
      { type: "table", caption: "Pull, poll or push", head: ["Pattern", "How", "Watch out"], rows: [
        ["Pull on demand", "you send GET when you need it", "fine for a bounded download"],
        ["Scheduled polling", "you ask every N minutes “anything new since X?”", "needs a cursor and rate-limit handling"],
        ["Push (webhook)", "the provider calls <b>your</b> endpoint when something changes", "check the sender; expect repeats"],
      ] },
      { type: "callout", kind: "rule", title: "Whatever the pattern", html: "<p>Paginate where needed, checkpoint your progress, and deduplicate deliveries (L10 p41). <b>A 200 response is not proof of a complete dataset</b> (L10 p40).</p>" },

      { type: "h", text: "A collector that survives the real world", sub: "L10 p40–44. Pages, a failure, a repeat, a checkpoint." },
      {
        type: "stepper",
        title: "Follow the pages",
        code: API_CODE,
        what: { 16: "One call to the (fake) API.", 19: "Exponential backoff: wait twice as long each time.", 29: "A dict keyed by id cannot hold the same id twice.", 31: "Remember where we are.", 33: "The last page has no next cursor." },
        steps: apiSteps(),
        visualTitle: "Pages, rows, checkpoint",
        visual: apiVisual,
        legend: [["held", "current page"], ["done", "fetched"], ["bad", "failed once"], ["cmp", "repeat overwritten"]],
      },
      {
        type: "tryit",
        title: "Run the collector, then break it",
        task: "Run it. Then try: (1) <code>failures = {\"c3\": 3}</code>: what happens after 3 tries? (2) replace <code>rows</code> with a list and <code>append</code>: how many rows now?",
        code: API_CODE,
        expectOutput: "page None: got 2, unique so far 2, checkpoint c2\npage c2: got 2, unique so far 3, checkpoint c3\n  503 on page c3: wait 1 s, retry\npage c3: got 1, unique so far 4, checkpoint None\nreceived: 5 unique: 4",
        solutionNote: "(1) Three 503s → <code>RuntimeError: page c3 failed 3 times</code>: stop loudly, and the checkpoint <code>c3</code> tells a restart where to go on. (2) A list keeps the repeat: 5 rows, so id 2 would be counted twice. A real collector would also <code>time.sleep(wait)</code>; it is skipped here so it runs fast.",
      },
      { type: "h", text: "Design for duplicates, failure and restart", sub: "L10 p43–44" },
      () => card(chainSvg([["Receive", "event id + data"], ["Validate", "schema, required"], ["Deduplicate", "stable key / upsert"], ["Checkpoint", "cursor or offset"]], "receive, validate, deduplicate, checkpoint")),
      { type: "table", caption: "Choose the right connector (L10 p43)", head: ["Source", "Collect with", "Risk", "Useful metadata"], rows: [
        ["CSV file", "scheduled import", "same file twice / bad encoding", "file name, upload time"],
        ["Database", "SQL / CDC connector", "missed updates / load on the source", "primary key, change time"],
        ["REST API", "HTTP requests", "pagination / rate limits", "request time, cursor"],
        ["Sensor events", "message stream", "out-of-order events", "event id, timestamp"],
      ] },
      { type: "callout", kind: "note", title: "Upsert", html: "<p>Update the row if the key exists, insert it if not (L10 p44). In Python: <code>table[row[\"id\"]] = row</code>. Demo on <a href=\"#dataeng/de-etl\">ETL pipelines</a>.</p>" },
      { type: "mistakes", items: [
        { title: "Only the first page", wrong: "rows = r.json()['items']   # done!", right: "while cursor is not None:\n    ...  # follow 'next'", why: "Page 1 is not the dataset. Follow the pages (L10 p40)." },
        { title: "No timeout", wrong: "requests.get(url)", right: "requests.get(url, timeout=10)", why: "Without it a dead server can hang your job forever." },
        { title: "Retrying everything, instantly", wrong: "while status != 200:\n    status = get()", right: "retry only 429/5xx, wait 1, 2, 4 s, give up after 3", why: "A 404 never gets better; hammering a busy server makes it worse." },
        { title: "Secrets in the notebook", wrong: "API_KEY = 'sk-12345'", right: "API_KEY = os.environ['API_KEY']", why: "Store secrets outside source code (L10 p40)." },
        { title: "Appending deliveries", wrong: "rows.append(item)", right: "rows[item['id']] = item", why: "Retries and replays deliver the same record again (L10 p44)." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "In <code>GET /v1/sensors?limit=2 HTTP/1.1</code>, what is <code>limit=2</code>?", options: ["the path", "a query parameter", "a header", "the status code"], answer: 1,
        hint: "It comes after the <code>?</code>.", explain: "Options after <code>?</code> are query parameters (L10 p39). In requests: <code>params={\"limit\": 2}</code>." },
      { type: "mc", q: "The API answers <b>429 Too Many Requests</b>. What should the collector do?", options: ["Stop: the data is gone", "Retry at once in a loop", "Wait (back off), then retry", "Switch to POST"], answer: 2,
        hint: "Rate limit = slow down.", explain: "Respect the rate limit: wait, then retry, waiting longer each time (L10 p40)." },
      { type: "mc", q: "The shop's payment provider calls <b>your</b> URL whenever a payment changes. Which pattern?", options: ["Pull on demand", "Scheduled polling", "Push / webhook"], answer: 2,
        hint: "Who starts the call?", explain: "The provider pushes to your endpoint: a webhook. Verify the sender and expect repeats (L10 p41)." },
      { type: "predict", q: "What does this print?", code: `
          deliveries = [{"id": 1}, {"id": 2}, {"id": 1}, {"id": 3}, {"id": 2}]
          rows = {}
          for d in deliveries:
              rows[d["id"]] = d
          print(len(deliveries), len(rows))`, answer: "5 3",
        hint: "A dict cannot hold the same key twice.", explain: "5 deliveries, but only ids 1, 2, 3: 3 unique rows." },
      { type: "write", q: "Write <code>collect(pages)</code>. <code>pages</code> maps a cursor to <code>{\"items\": [...], \"next\": ...}</code>; the first cursor is <code>None</code>. Follow <code>next</code> until it is None and <b>return</b> the list of unique ids in the order first seen.",
        starter: `
          def collect(pages):
              seen = []
              cursor = None
              # loop: take pages[cursor], add new ids, move cursor to "next"; stop when it is None
              return seen

          P = {None: {"items": [{"id": 1}, {"id": 2}], "next": "b"},
               "b": {"items": [{"id": 2}, {"id": 3}], "next": None}}
          print(collect(P))   # [1, 2, 3]`,
        checks: [["collect({None: {'items': [{'id': 1}, {'id': 2}], 'next': 'b'}, 'b': {'items': [{'id': 2}, {'id': 3}], 'next': None}})", "[1, 2, 3]"], ["collect({None: {'items': [], 'next': None}})", "[]"], ["collect({None: {'items': [{'id': 5}], 'next': 'x'}, 'x': {'items': [{'id': 5}], 'next': 'y'}, 'y': {'items': [{'id': 6}], 'next': None}})", "[5, 6]"]],
        solution: `
          def collect(pages):
              seen = []
              cursor = None

              while True:
                  page = pages[cursor]
                  for item in page["items"]:
                      if item["id"] not in seen:        # dedupe
                          seen.append(item["id"])
                  cursor = page["next"]
                  if cursor is None:                    # last page
                      break

              return seen`,
        hint: "<code>while True:</code> → <code>page = pages[cursor]</code> → loop the items → <code>cursor = page[\"next\"]</code> → <code>if cursor is None: break</code>. Return after the loop.",
        explain: "Same shape as the collector above: follow pages, dedupe by id. (A set for <code>seen</code> would be faster; the list keeps the order.)" },
      { type: "mc", q: "Every page answered 200 OK. Is the dataset complete?", options: ["Yes: 200 means success", "Not necessarily: you may have missed pages, got repeats, or changed fields"], answer: 1,
        hint: "L10 p40, last line.", explain: "A successful HTTP response is not proof of a complete dataset. Check counts, pages and duplicates." },
    ],
  };

  /* ================================================================
     TOPIC 6: ETL pipelines (L10 p45–51)
     ================================================================ */
  const RUNS = [
    { name: "Normal day", st: ["ok", "ok", "ok", "ok"], log: ["06:00 extract: orders_2026-11-05.csv, 1,000 rows", "06:01 validate: 3 rows quarantined (0.3 %), under the 5 % limit", "06:02 transform: revenue per product, 42 products", "06:03 load: wrote daily_revenue; row count checked; published ✓"],
      note: "Everything passed. The 3 bad rows are kept in a quarantine table, not thrown away." },
    { name: "Source late", st: ["wait", "ok", "ok", "ok"], log: ["06:00 extract: file not there yet (dependency not met) → retry in 15 min", "06:15 extract: still missing → retry", "06:30 extract: found, 1,000 rows", "06:31 validate ✓ · 06:32 transform ✓ · 06:33 load ✓ published"],
      note: "<b>Orchestration</b>: the scheduler waits for the dependency and retries. Nothing ran on missing data (L10 p49)." },
    { name: "Bad data spike", st: ["ok", "bad", "skip", "skip"], log: ["06:00 extract: 1,000 rows", "06:01 validate: 412 amounts are not numbers (41 %) > 5 % limit ✗", "06:01 STOP. Alert sent to the data team.", "yesterday's daily_revenue stays published"],
      note: "<b>Running without an exception is not proof</b>: pandas would have coerced the 412 rows to NaN and dropped them silently. A validation threshold turns that into a loud stop (L10 p50)." },
    { name: "Load crashes", st: ["ok", "ok", "ok", "bad"], log: ["06:00–06:02 extract, validate, transform ✓", "06:03 load: disk full after 600 of 1,000 rows ✗", "06:03 nothing published; alert sent", "07:00 re-run from the start: upsert by key, so no doubles → published ✓"],
      note: "Publish only validated output. Because the load is <b>idempotent</b> (upsert by key), the re-run is safe (L10 p50)." },
  ];
  function runWidget(el) {
    const box = h("div");
    const tone = { ok: "done", bad: "swap", wait: "cmp", skip: null };
    const word = { ok: "✓", bad: "✗ failed", wait: "waiting…", skip: "not run" };
    const draw = i => {
      const r = RUNS[i];
      const S = D.svg({ w: 600, h: 86, label: "pipeline stages: extract, validate, transform, load" });
      ["Extract", "Validate", "Transform", "Load"].forEach((t, k) => {
        S.box(6 + k * 150, 14, 128, 58, { text: t, sub: word[r.st[k]], tone: tone[r.st[k]], faded: r.st[k] === "skip" });
        if (k < 3) S.arrow(136 + k * 150, 43, 154 + k * 150, 43, {});
      });
      box.replaceChildren(h("div", { style: "overflow-x:auto" }, S.el), h("pre", { class: "st-out", style: "white-space:pre-wrap;margin:8px 0" }, r.log.join("\n")), h("p", { class: "tv-now", html: r.note }));
    };
    el.append(seg(RUNS.map(r => r.name), "Pick a run", draw), box);
    draw(0);
  }

  const etl = {
    id: "de-etl",
    title: "ETL pipelines",
    summary: "Extract → (validate) → transform → load, as a loop and in pandas; ETL vs ELT; orchestration and monitoring; the run contract; idempotent loads.",
    sources: "L10 p45–51",
    blocks: [
      { type: "h", text: "A pipeline is more than a script", sub: "L10 p45" },
      () => card(chainSvg([["Extract", "read sources"], ["Validate", "schema, quality"], ["Transform", "clean, join, sum"], ["Load", "write target"]], "extract, validate, transform, load"),
        "Around it: source contracts, retries, checkpoints, lineage, validation and alerts. A pipeline runs again tomorrow, unattended; a script ran once on your laptop."),

      { type: "h", text: "ETL step by step", sub: "L10 p46. A loop you could write yourself." },
      {
        type: "stepper",
        title: "Clean four raw order rows",
        code: `
          raw = [("101", "250.50"),           # EXTRACT: every field is text
                 ("102", "?"),
                 ("101", "250.50"),           # the same order again
                 ("103", "131.75")]

          seen = set()                        # order ids we already kept
          clean = []
          rejected = []

          for order_id, amount in raw:        # TRANSFORM, one row at a time
              if order_id in seen:            # duplicate: skip it
                  continue
              seen.add(order_id)

              try:
                  value = float(amount)       # '250.50' -> 250.5
              except ValueError:              # '?' is not a number
                  rejected.append(order_id)
                  continue

              clean.append((int(order_id), value))

          print(clean)                        # LOAD: here we just show it
          print(rejected)`,
        what: { 10: "Unpack each tuple into two names.", 11: "Deduplicate: a set answers “seen it?” fast.", 12: "continue jumps to the next row.", 16: "Parse: text that looks like a number becomes a float.", 17: "Only runs if float() failed.", 21: "Only rows that passed every check get here." },
        steps: etlSteps(),
        visualTitle: "The four rows",
        visual: etlVisual,
      },
      {
        type: "tryit",
        title: "A real mini ETL with the csv module",
        task: "Same idea on CSV text. Run it. Then add a row <code>104,CPH,</code> (empty amount) and see where it ends up.",
        code: `
          import csv
          import io

          raw_text = """order_id,city,amount
          101,CPH,250.50
          102,AAR,?
          101,CPH,250.50
          103,ODE,131.75"""

          rows = list(csv.DictReader(io.StringIO(raw_text)))   # EXTRACT: list of dicts, all text
          print("extracted:", len(rows), "rows")

          seen = set()
          clean = []
          rejected = []
          for row in rows:                                    # TRANSFORM
              if row["order_id"] in seen:                     # duplicate
                  continue
              seen.add(row["order_id"])

              try:
                  amount = float(row["amount"])               # text -> number
              except ValueError:
                  rejected.append(row["order_id"])
                  continue

              clean.append({"order_id": int(row["order_id"]), "city": row["city"], "amount": amount})

          print("clean:", clean)                              # LOAD (here: print)
          print("rejected:", rejected)
          print("total:", sum(r["amount"] for r in clean))`,
        expectOutput: "extracted: 4 rows\nclean: [{'order_id': 101, 'city': 'CPH', 'amount': 250.5}, {'order_id': 103, 'city': 'ODE', 'amount': 131.75}]\nrejected: ['102']\ntotal: 382.25",
      },
      { type: "h", text: "The slide's pandas version", sub: "L10 p47" },
      {
        type: "tryit",
        title: "ETL in pandas",
        task: "The slide reads <code>orders.csv</code>; here the CSV is a string so it runs in the browser. Run it. Then add a line that prints the rows that will be <b>dropped</b> because their amount is not a number.",
        code: `
          import io
          import pandas as pd

          csv_text = """order_id,city,amount
          101,CPH,250.50
          102,AAR,?
          101,CPH,250.50
          103,ODE,131.75"""

          raw = pd.read_csv(io.StringIO(csv_text))                       # EXTRACT ('?' makes amount text)

          clean = raw.drop_duplicates(subset="order_id").copy()          # TRANSFORM: one row per order
          clean["amount"] = pd.to_numeric(clean["amount"], errors="coerce")   # '?' -> NaN
          clean = clean.dropna(subset=["amount"])                        # drop rows with no amount

          print(clean)
          print("total:", clean["amount"].sum())
          print(clean.to_csv(index=False))                               # LOAD (slide: to_csv("orders_clean.csv"))`,
        hint: "Before <code>dropna</code>: <code>print(clean[clean[\"amount\"].isna()])</code>. Or on the raw data: <code>raw[pd.to_numeric(raw[\"amount\"], errors=\"coerce\").isna()]</code>.",
        solutionNote: "Output: rows 101 (250.50) and 103 (131.75), total 382.25, then the CSV text. Order 102 vanished <b>without a word</b>: that is why L10 p47 says a real pipeline needs more checks, like counting and logging rejected rows.",
      },
      { type: "table", head: ["pandas line", "Loop version"], code: [0, 1], rows: [
        ['raw.drop_duplicates(subset="order_id")', "if order_id in seen: continue"],
        ['pd.to_numeric(..., errors="coerce")', "try: float(amount) except ValueError: ..."],
        ['clean.dropna(subset=["amount"])', "rejected.append(order_id); continue"],
      ] },

      { type: "h", text: "ETL vs ELT", sub: "L10 p48" },
      { type: "table", head: ["", "ETL", "ELT"], rows: [
        ["Order", "Extract → <b>Transform</b> → Load", "Extract → Load → <b>Transform</b>"],
        ["Where cleaning runs", "before the target, in your code", "inside the warehouse or lake, e.g. with SQL"],
        ["Good when", "the target must only get clean data", "the warehouse has the compute; you want raw data kept"],
        ["Tiny example", "Python cleans orders.csv, then writes it", "load raw orders, then <code>CREATE TABLE clean AS SELECT …</code>"],
      ] },

      { type: "h", text: "Orchestrate, test and monitor", sub: "L10 p49" },
      { type: "table", head: ["Stage", "Check", "Tiny example"], rows: [
        ["Extract", "dependency: is the source ready?", "today's file exists"],
        ["Validate", "nulls, types, row counts", "1,000 rows expected, 0 arrived → stop"],
        ["Transform", "metric logic and joins", "every product_id finds its product"],
        ["Load", "write, verify, publish", "count rows in the target before publishing"],
      ] },
      `<p><b>Orchestration</b> = scheduling jobs, their order and their retries. <b>Observability</b> = logging status, volumes, freshness and failures.</p>`,
      { type: "widget", title: "Four pipeline runs", intro: "Pick a run and read its log.", render: runWidget },

      { type: "h", text: "A reliable pipeline has a contract", sub: "L10 p50" },
      { type: "table", head: ["When", "What", "Tiny example"], rows: [
        ["Before the run", "define keys, schema, units, freshness, access", "key = order_id; amount in DKK; ready by 07:00"],
        ["During the run", "validate types and totals; quarantine bad rows; checkpoint", "'?' rows go to a rejected list"],
        ["After the run", "reconcile counts and totals; publish only validated output; alert on failure", "in = clean + rejected + duplicates"],
      ] },
      {
        type: "tryit",
        title: "Reconcile the counts",
        task: "Every row that comes in must end up somewhere. Run it: the check fails. Find the row that disappears and fix it so the counts add up.",
        code: `
          raw = [("101", "CPH", "250.50"), ("102", "AAR", "?"), ("101", "CPH", "250.50"),
                 ("103", "ODE", "131.75"), ("104", "", "80.00"), ("105", "CPH", "40.00")]

          seen = set()
          clean = []
          rejected = []
          duplicates = 0

          for order_id, city, amount in raw:
              if order_id in seen:
                  duplicates += 1
                  continue
              seen.add(order_id)

              if city == "":                     # no city: skip it
                  continue

              try:
                  clean.append((int(order_id), city, float(amount)))
              except ValueError:
                  rejected.append(order_id)

          print("in:", len(raw), "clean:", len(clean), "rejected:", len(rejected), "duplicates:", duplicates)
          assert len(raw) == len(clean) + len(rejected) + duplicates, "rows went missing!"
          print("reconciled ✓")`,
        expectOutput: "in: 6 clean: 3 rejected: 2 duplicates: 1\nreconciled ✓",
        hint: "Order 104 has no city. It is skipped with <code>continue</code>, but not counted anywhere.",
        solution: `
          raw = [("101", "CPH", "250.50"), ("102", "AAR", "?"), ("101", "CPH", "250.50"),
                 ("103", "ODE", "131.75"), ("104", "", "80.00"), ("105", "CPH", "40.00")]

          seen = set()
          clean = []
          rejected = []
          duplicates = 0

          for order_id, city, amount in raw:
              if order_id in seen:
                  duplicates += 1
                  continue
              seen.add(order_id)

              if city == "":                     # no city: reject it, and count it
                  rejected.append(order_id)
                  continue

              try:
                  clean.append((int(order_id), city, float(amount)))
              except ValueError:
                  rejected.append(order_id)

          print("in:", len(raw), "clean:", len(clean), "rejected:", len(rejected), "duplicates:", duplicates)
          assert len(raw) == len(clean) + len(rejected) + duplicates, "rows went missing!"
          print("reconciled ✓")`,
        solutionNote: "Before the fix: 6 in, but 3 + 1 + 1 = 5 accounted for → AssertionError. The code ran fine otherwise: “running without an exception does not prove the data is correct” (L10 p50).",
      },
      {
        type: "tryit",
        title: "Idempotent: safe to run twice",
        task: "The load job runs twice (a retry after a crash). Run it and compare the totals. Then change the second run so order 103's amount is corrected to 130.0: what does the upsert table show?",
        code: `
          batch = [{"order_id": 101, "amount": 250.5}, {"order_id": 103, "amount": 131.75}]

          table_list = []                                  # append: not idempotent
          table_dict = {}                                  # upsert by key: idempotent

          for run in [1, 2]:                               # the same job, twice
              for row in batch:
                  table_list.append(row)
                  table_dict[row["order_id"]] = row       # insert, or overwrite if the key exists
              total_list = sum(r["amount"] for r in table_list)
              total_dict = sum(r["amount"] for r in table_dict.values())
              print(f"after run {run}: append {len(table_list)} rows, total {total_list} | upsert {len(table_dict)} rows, total {total_dict}")`,
        expectOutput: "after run 1: append 2 rows, total 382.25 | upsert 2 rows, total 382.25\nafter run 2: append 4 rows, total 764.5 | upsert 2 rows, total 382.25",
        solutionNote: "Append doubles the revenue on a re-run. The upsert keeps 2 rows; with a corrected amount it simply overwrites 131.75 with 130.0 (total 380.5). That is the “upsert” of L10 p44.",
      },
      { type: "h", text: "Design a small pipeline", sub: "L10 p51: try it in the quiz below." },
      { type: "table", head: ["Question", "For “daily sales CSV + product data from an API”"], rows: [
        ["01 Lifecycle", "where are records made, archived, deleted?"],
        ["02 Format", "which fields and types to validate?"],
        ["03 Collection", "how to fetch only what is needed?"],
        ["04 Storage", "where do raw and curated data live?"],
        ["05 ETL", "how to join, test, load and monitor?"],
      ] },
      { type: "mistakes", items: [
        { title: "Re-running doubles the data", wrong: "table.append(row)            # run twice = 2 copies", right: "table[row['order_id']] = row  # run twice = same", why: "Use a stable key so a re-run is safe (idempotent)." },
        { title: "“No error, so it worked”", wrong: "# the script finished -> publish", right: "assert len(raw) == len(clean) + len(rejected) + dups", why: "Reconcile counts and totals before publishing (L10 p50)." },
        { title: "Dropping bad rows silently", wrong: "clean = clean.dropna()", right: "bad = clean[clean['amount'].isna()]\nprint(len(bad), 'rejected')\nclean = clean.dropna()", why: "Quarantine and count them; alert if there are too many." },
        { title: "Cleaning in place of the raw data", wrong: "raw = transform(raw)", right: "clean = transform(raw)   # raw kept", why: "With the raw data kept, a fixed rule can be re-run (ELT, raw layer)." },
        { title: "Publishing half a load", wrong: "write rows one by one into the live table", right: "write to a new table, verify, then swap it in", why: "Readers must never see a half-finished table (L10 p49–50)." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "Raw order files are loaded into the warehouse first and cleaned there later with SQL. What is this?", options: ["ETL", "ELT", "OLTP", "Streaming"], answer: 1,
        hint: "In which order do Load and Transform happen here?", explain: "Extract → Load → Transform is <b>ELT</b>. In ETL the cleaning happens <i>before</i> loading (L10 p48)." },
      { type: "mc", q: "<code>pd.to_numeric(pd.Series([\"250.50\", \"?\"]), errors=\"coerce\")</code> gives…", options: ["a ValueError", "<code>[250.5, NaN]</code>", "<code>[250.5, 0.0]</code>", "<code>[250.5]</code>"], answer: 1,
        hint: "“coerce” = force: what does pandas put where it cannot make a number?", explain: "Anything that is not a number becomes NaN. Then <code>dropna</code> removes it (L10 p47)." },
      { type: "predict", q: "What does this print?", code: `
          table = {}
          for run in range(3):
              for oid, amt in [(1, 10), (2, 5)]:
                  table[oid] = amt
          print(len(table), sum(table.values()))`, answer: "2 15",
        hint: "Three runs, but how many different keys?", explain: "Each run overwrites keys 1 and 2: 2 rows, total 15. With a list you would have 6 rows and 45." },
      { type: "mc", q: "Yesterday's load wrote 0 rows, with no error. Which check would have caught it?", options: ["A row-count check / reconciliation", "A faster CPU", "Switching to JSON", "A bigger timeout"], answer: 0,
        hint: "L10 p49: validate nulls, types, <b>row counts</b>.", explain: "Observability: compare the row count to what you expect and alert. No exception ≠ correct data (L10 p50)." },
      { type: "write", q: "Write <code>clean_amounts(values)</code>. It gets a list of texts and <b>returns</b> a list of floats. Skip any text that is not a number.",
        starter: `
          def clean_amounts(values):
              result = []                      # the clean numbers
              # loop over values; try float(); skip it on ValueError
              return result

          print(clean_amounts(["250.50", "?", "99"]))   # [250.5, 99.0]`,
        checks: [["clean_amounts(['250.50', '?', '99'])", "[250.5, 99.0]"], ["clean_amounts([])", "[]"], ["clean_amounts(['x', '-1.5'])", "[-1.5]"]],
        solution: `
          def clean_amounts(values):
              result = []

              for text in values:              # one text at a time
                  try:
                      result.append(float(text))   # works for '250.50', '99', '-1.5'
                  except ValueError:           # '?', 'x' cannot be numbers
                      continue                 # skip it

              return result                    # after the loop, not inside it`,
        hint: "A <code>for</code> loop over <code>values</code>. Inside: <code>try:</code> append <code>float(text)</code>, <code>except ValueError:</code> do nothing (<code>continue</code>). Return after the loop.",
        explain: "This is the Transform step in miniature: parse, and reject what cannot be parsed." },
      { type: "explain", q: "L10 p51: design a small pipeline that combines a <b>daily sales CSV</b> with <b>product data from an API</b>. Answer the five questions (lifecycle, format, collection, storage, ETL) in a few sentences.",
        answer: "<p><b>Lifecycle:</b> sales are created at the tills each day and products in the product system; raw files are archived after a year and deleted after the retention period. <b>Format:</b> the CSV gives order_id, product_id, quantity and amount as text, so I validate that ids exist, quantity is a whole number and amount parses as a DKK number; the API gives JSON, where I check that product_id, name and category are present. <b>Collection:</b> import the CSV once a day; poll the API incrementally (only products updated since the last cursor), following pages, with timeouts and retries. <b>Storage:</b> keep the raw CSV and JSON in a raw area of a lake, and write the joined, curated revenue table to a warehouse, partitioned by date. <b>ETL:</b> parse and dedupe sales by order_id, join to products on product_id (rows with an unknown product go to quarantine), sum revenue per product and day, upsert by (date, product_id) so re-runs are safe, reconcile row counts and totals, and alert if a check fails.</p>",
        points: ["validate fields and types; amounts parsed, unit DKK", "incremental API pulls with pagination, retries, cursor", "raw kept (lake), curated table (warehouse), partition by date", "join on product_id; quarantine unknowns", "idempotent upsert; reconcile counts; alert"],
        hint: "Go through the five questions one by one; give one concrete choice for each." },
    ],
  };

  /* ================================================================
     TOPIC 2: BFS step by step
     ================================================================ */
  const bfs = {
    id: "bfs",
    title: "BFS step by step",
    summary: "Breadth-first search visits the tree <b>level by level</b>, left to right. A queue (first in, first out) does the work. This is the fixed version of the exercise's <code>bfs_level_order</code>.",
    exam: ["Q6 tree walk"],
    sources: "Ex10 §1; L9 p38–39",
    blocks: [
      { type: "callout", kind: "note", title: "The basics are elsewhere", html: "<p>BFS vs DFS side by side, and BFS on an adjacency matrix: <a href=\"#algorithms/dfs-bfs\">DFS & BFS</a>. Queues and <code>deque</code>: <a href=\"#algorithms/stacks-queues\">Stacks & queues</a>. This page uses the exercise's own <code>TreeNode</code> tree.</p>" },
      { type: "h", text: "The exercise's tree", sub: "Each node has a value and two links: left and right. None means “no child”." },
      () => h("div", { class: "tv-two" },
        ui.code({ code: `
          class TreeNode:
              def __init__(self, value):
                  self.value = value
                  self.left = None       # no child yet
                  self.right = None

          root = TreeNode(10)
          root.left = TreeNode(5)        # link a child
          root.right = TreeNode(15)
          # ... 3, 7 under 5; 12, 18 under 15` }),
        h("div", { class: "card" }, treeSvg(SAMPLE, { levels: true, label: "sample tree 10, 5, 15, 3, 7, 12, 18 with levels" }))),
      { type: "table", caption: "Expected outputs (from the exercise)", head: ["Walk", "Result"], code: [1], rows: [
        ["BFS / level order", "[10, 5, 15, 3, 7, 12, 18]"],
        ["DFS pre-order", "[10, 5, 3, 7, 15, 12, 18]"],
        ["DFS in-order", "[3, 5, 7, 10, 12, 15, 18]"],
        ["DFS post-order", "[3, 7, 5, 12, 18, 15, 10]"],
      ] },

      { type: "h", text: "A queue is a waiting line", sub: "New people join at the back. The one who waited longest leaves from the front." },
      { type: "table", head: ["Python", "Queue after it", "Gives back"], code: [0, 1], rows: [
        ["q = deque([1, 2])", "deque([1, 2])", "&nbsp;"],
        ["q.append(3)", "deque([1, 2, 3])", "nothing (3 joins the back)"],
        ["q.popleft()", "deque([2, 3])", "<code>1</code> (the front)"],
      ] },
      { type: "callout", kind: "rule", title: "BFS in three moves", html: "<ol><li>Put the root in the queue.</li><li>Take the <b>front</b> node out and store its value.</li><li>Put its children at the <b>back</b>: left first, then right. Repeat 2–3 until the queue is empty.</li></ol>" },
      {
        type: "stepper",
        title: "bfs_level_order on the sample tree",
        intro: "The queue really holds node objects. We show their values. <b>#k</b> under a node = the k-th value stored.",
        code: `
          def bfs_level_order(root):
              if root is None:                     # empty tree: nothing to visit
                  return []

              queue = deque([root])                # the line starts with the root
              result = []

              while queue:                         # until nobody is waiting
                  node = queue.popleft()           # take the OLDEST: the front
                  result.append(node.value)        # store the value, not the node

                  if node.left is not None:        # left child joins the back first
                      queue.append(node.left)
                  if node.right is not None:       # then the right child
                      queue.append(node.right)

              return result                        # after the loop`,
        what: { 2: "Guard: an empty tree must give [] and not crash.", 8: "An empty deque counts as False, so the loop stops when the line is empty.", 9: "popleft() is O(1). A list's pop(0) would shift every item: O(n).", 10: "The contract wants values, not TreeNode objects.", 12: "Never put None in the queue: it has no .left or .right.", 17: "Outside the while: return only when everything is visited." },
        steps: bfsSteps(),
        visualTitle: "Tree, queue and result",
        legend: LEG,
        visual: (el, st) => {
          el.appendChild(treeSvg(SAMPLE, { levels: true, tone: tones(st.cur, st.queue, st.result), note: Object.fromEntries(st.result.map((v, i) => [v, "#" + (i + 1)])) }));
          el.appendChild(arr("queue", st.queue, { ptrs: st.queue.length ? { 0: "front", [st.queue.length - 1]: st.queue.length > 1 ? "back" : "front" } : {}, empty: "deque([])  (empty)", marks: Object.fromEntries(st.queue.map((_, i) => [i, "cmp"])) }));
          el.appendChild(arr("result", st.result, { marks: Object.fromEntries(st.result.map((_, i) => [i, "done"])), empty: "[ ]" }));
        },
      },
      { type: "h", text: "How fast, how much memory", sub: "n = number of nodes, w = the widest level" },
      { type: "table", head: ["What", "Big-O", "On the sample tree"], rows: [
        ["Time", "O(n): each node joins and leaves the queue once", "7 nodes → 7 pops"],
        ["Queue memory", "O(w): at most one level or so waits at a time", "the queue never holds more than 4 (level 2)"],
        ["Output list", "O(n): it holds every value", "7 values"],
        ["<code>list.pop(0)</code> instead", "O(n) per pop → O(n²) in total", "every pop shifts all the others left"],
      ] },
      {
        type: "tryit",
        title: "Run BFS, then break it on purpose",
        task: "Run it. Then change <code>popleft()</code> to <code>pop()</code> and run again. Which order do you get now? (Hint: it is one of the DFS orders.)",
        code: withSetup(`
          def bfs_level_order(root):
              if root is None:
                  return []

              queue = deque([root])
              result = []

              while queue:
                  node = queue.popleft()           # try pop() here
                  result.append(node.value)

                  if node.left is not None:
                      queue.append(node.left)
                  if node.right is not None:
                      queue.append(node.right)

              return result`, `
          root = build_sample_tree()
          print(bfs_level_order(root))                    # [10, 5, 15, 3, 7, 12, 18]
          print(bfs_level_order(None))                         # []
          print(bfs_level_order(build_right_chain([1, 2, 3])))   # [1, 2, 3]`),
        solutionNote: "With <code>pop()</code> the newest node leaves first: the queue has become a <b>stack</b>, and you get <code>[10, 15, 18, 12, 5, 7, 3]</code>: depth-first, right side first.",
        solution: withSetup(`
          def bfs_level_order(root):
              if root is None:
                  return []

              queue = deque([root])
              result = []

              while queue:
                  node = queue.pop()               # newest out: now it is a STACK
                  result.append(node.value)

                  if node.left is not None:
                      queue.append(node.left)
                  if node.right is not None:
                      queue.append(node.right)

              return result`, `
          print(bfs_level_order(build_sample_tree()))   # [10, 15, 18, 12, 5, 7, 3]`),
      },
      {
        type: "tryit",
        title: "Challenge: one list per level",
        task: "Write <code>bfs_levels(root)</code> that gives back <code>[[10], [5, 15], [3, 7, 12, 18]]</code>. Not in the exercise, but a classic exam-style twist.",
        code: withSetup(`
          def bfs_levels(root):
              if root is None:
                  return []

              levels = []
              queue = deque([root])
              # TODO: while queue:
              #     level = []                   # values of this level only
              #     take exactly the nodes that are in the queue right now,
              #     store their values, and put their children at the back
              #     levels.append(level)
              return levels`, `
          print(bfs_levels(build_sample_tree()))   # [[10], [5, 15], [3, 7, 12, 18]]`),
        checks: [["bfs_levels(build_sample_tree())", "[[10], [5, 15], [3, 7, 12, 18]]"], ["bfs_levels(None)", "[]"], ["bfs_levels(build_right_chain([1, 2, 3]))", "[[1], [2], [3]]"]],
        hint: "At the start of each round, the queue holds exactly one level. Save <code>len(queue)</code> and pop that many times with <code>for _ in range(len(queue)):</code>.",
        solution: withSetup(`
          def bfs_levels(root):
              if root is None:
                  return []

              levels = []
              queue = deque([root])
              while queue:
                  level = []
                  for _ in range(len(queue)):      # exactly this level's nodes
                      node = queue.popleft()
                      level.append(node.value)

                      if node.left is not None:    # children wait for the next round
                          queue.append(node.left)
                      if node.right is not None:
                          queue.append(node.right)
                  levels.append(level)
              return levels`),
        solutionNote: "<code>range(len(queue))</code> is worked out once, before the inner loop starts, so children added during the round wait for the next one.",
      },
      { type: "mistakes", items: [
        { title: "<code>pop()</code> instead of <code>popleft()</code>", wrong: "node = queue.pop()        # newest out: a stack", right: "node = queue.popleft()    # oldest out: a queue", why: "Newest-first turns BFS into DFS." },
        { title: "<code>pop(0)</code> on a plain list", wrong: "queue = [root]\nnode = queue.pop(0)       # shifts every item", right: "queue = deque([root])\nnode = queue.popleft()    # O(1)", why: "Each <code>pop(0)</code> is O(n), so the whole walk becomes O(n²)." },
        { title: "Putting None in the queue", wrong: "queue.append(node.left)   # may be None", right: "if node.left is not None:\n    queue.append(node.left)", why: "Later <code>None.left</code> crashes: AttributeError." },
        { title: "Storing the node, not its value", wrong: "result.append(node)", right: "result.append(node.value)", why: "You would get <code>[&lt;__main__.TreeNode object at 0x…&gt;, …]</code>." },
        { title: "<code>return</code> inside the loop", wrong: "while queue:\n    ...\n    return result", right: "while queue:\n    ...\nreturn result", why: "It stops after the first node: <code>[10]</code>." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "The tree is 1 with children 2 (left) and 3 (right); 2 has a right child 4; 3 has a left child 5. What does <code>bfs_level_order(root)</code> give back? (This is the exercise's “sparse” test.)", answer: ["[1, 2, 3, 4, 5]", "[1,2,3,4,5]"], tryit: false,
        hint: "Level 0: 1. Level 1: 2, 3. Level 2: the children of 2, then the children of 3.", explain: "Level by level, left to right: 1 | 2, 3 | 4, 5. Missing children are simply skipped." },
      { type: "mc", q: "On the sample tree, what is the most nodes that wait in the queue at the same time?", options: ["2", "3", "4", "7"], answer: 2,
        hint: "Look at the stepper just after 15's children join.", explain: "After 15 is popped and 12, 18 join, the queue is <code>[3, 7, 12, 18]</code>: the whole bottom level. That is the O(w) space." },
      { type: "predict", q: "What does this print?", code: "from collections import deque\n\nq = deque([1, 2])\nq.append(3)\nprint(q.popleft(), list(q))", answer: "1 [2, 3]",
        hint: "<code>append</code> adds at the back, <code>popleft</code> takes from the front.", explain: "3 joins the back: <code>[1, 2, 3]</code>. <code>popleft()</code> gives back 1 and leaves <code>[2, 3]</code>." },
      { type: "mc", q: "What is the time Big-O of <code>bfs_level_order</code> with a deque, for a tree with n nodes?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2,
        wrong: { 3: "That is what you get with <code>list.pop(0)</code>, which shifts all items every time." },
        hint: "How many times does each node join and leave the queue?", explain: "Each node is appended once and popped once, and both are O(1) on a deque: O(n) in total." },
      { type: "write", q: "Write <code>bfs_levels(root)</code>: one list of values per level. Sample tree → <code>[[10], [5, 15], [3, 7, 12, 18]]</code>; empty tree → <code>[]</code>.",
        starter: withSetup(`
          def bfs_levels(root):
              # your code here
              pass`, `
          print(bfs_levels(build_sample_tree()))`),
        checks: [["bfs_levels(build_sample_tree())", "[[10], [5, 15], [3, 7, 12, 18]]"], ["bfs_levels(None)", "[]"], ["bfs_levels(TreeNode(42))", "[[42]]"], ["bfs_levels(build_right_chain([1, 2, 3]))", "[[1], [2], [3]]"]],
        solution: withSetup(`
          def bfs_levels(root):
              if root is None:                     # empty tree
                  return []

              levels = []
              queue = deque([root])
              while queue:
                  level = []
                  for _ in range(len(queue)):      # only this level's nodes
                      node = queue.popleft()
                      level.append(node.value)

                      if node.left is not None:
                          queue.append(node.left)
                      if node.right is not None:
                          queue.append(node.right)
                  levels.append(level)

              return levels`),
        hint: "Start from <code>bfs_level_order</code>. Wrap the pop-and-push part in <code>for _ in range(len(queue)):</code> and collect each round in its own list.",
        explain: "The size of the queue at the start of a round is exactly the size of that level." },
    ],
  };

  /* ================================================================
     TOPIC 3: Debugging BFS (runtime vs logical errors)
     ================================================================ */
  const BUGGY = `
    def bfs_level_order(root):
        queue = [root]
        result = []
        while queue:
            node = queue.pop()
            result.append(node)
            queue.append(node.right)
            queue.append(node.left_child)
        return result`;
  const BUG_NOTES = {
    1: { ok: true, text: "The signature is fine. Keep it: the tests call <code>bfs_level_order(root)</code>." },
    2: { kind: "runtime + speed", title: "No empty-tree check, and a plain list", text: "If <code>root</code> is None, the queue starts as <code>[None]</code> and <code>None.right</code> crashes. Repair: <code>if root is None: return []</code>, then <code>queue = deque([root])</code>." },
    3: { ok: true, text: "Fine: a fresh list on every call, so two calls do not share results." },
    4: { ok: true, text: "Fine: an empty queue counts as False and ends the loop." },
    5: { kind: "logical", title: "Removes the newest item", text: "<code>pop()</code> takes the item added <b>last</b>: that is a stack, so the walk goes deep (DFS). It runs without any error, but the order is wrong. Repair: <code>queue.popleft()</code> on a deque (not <code>pop(0)</code>, which shifts every item)." },
    6: { kind: "logical", title: "Stores node objects", text: "The result holds <code>TreeNode</code> objects, printed as <code>&lt;__main__.TreeNode object at 0x…&gt;</code>. Repair: <code>result.append(node.value)</code>." },
    7: { kind: "logical + runtime", title: "Right before left, and None goes in", text: "Right is added before left, so each level comes out right-to-left. And a missing child (None) is added; when it is popped, <code>None.right</code> raises AttributeError. Repair: add the left child first, and only when it is not None." },
    8: { kind: "runtime", title: "Wrong attribute name", text: "<code>TreeNode</code> has <code>.left</code>, not <code>.left_child</code>: <b>AttributeError: 'TreeNode' object has no attribute 'left_child'</b>. This is the first crash you see." },
    9: { ok: true, text: "Fine: after the loop. (It returns nodes, but that is line 6's fault.)" },
  };
  function bugHuntWidget(el) {
    const lines = PADS.lines(PADS.dedent(BUGGY));
    const found = new Set();
    const panel = h("div", { class: "tv-bugpanel", "aria-live": "polite" }, h("p", { class: "muted", style: "margin:0" }, "Click a line to inspect it."));
    const count = h("p", { class: "small", style: "margin:8px 0 0" });
    const real = Object.keys(BUG_NOTES).filter(k => !BUG_NOTES[k].ok).length;
    const box = h("div", { class: "code tv-bugcode", role: "group", "aria-label": "Buggy bfs_level_order, one button per line" });
    const btns = lines.map((l, i) => {
      const b = h("button", { type: "button", class: "ln tv-lnbtn", "aria-label": "Line " + (i + 1) + ": " + l.trim(), html: `<span class="no">${i + 1}</span><span>${PADS.highlight(l)}</span>` });
      b.onclick = () => pick(i + 1);
      box.appendChild(b);
      return b;
    });
    function pick(n) {
      const note = BUG_NOTES[n];
      btns.forEach((b, i) => b.classList.toggle("active", i + 1 === n));
      if (!note.ok) { found.add(n); btns[n - 1].classList.add("bad"); }
      else btns[n - 1].classList.add("good");
      panel.replaceChildren(
        h("p", { class: "eyebrow", style: "margin:0 0 4px" }, "Line " + n + (note.ok ? ": no defect" : ": " + note.kind + " error")),
        note.title ? h("p", { style: "margin:0 0 4px" }, h("b", null, note.title)) : null,
        h("p", { style: "margin:0", html: note.text }));
      count.textContent = `Defective lines found: ${found.size} of ${real}` + (found.size === real ? " ✓ all of them." : ".");
    }
    count.textContent = `Defective lines found: 0 of ${real}.`;
    el.append(h("div", { class: "tv-two" }, box, h("div", null, panel, count)));
  }

  const FIXES = [
    { title: "As given", note: "Run it: the first error you see.", good: [], code: BUGGY,
      out: "Observed exception: AttributeError: 'TreeNode' object has no attribute 'left_child'", bad: true },
    { title: "Fix 1: the attribute name", note: "Runtime error fixed... and a new one appears. When a leaf's children (None) are popped, <code>None.right</code> fails.", good: [8], code: `
      def bfs_level_order(root):
          queue = [root]
          result = []
          while queue:
              node = queue.pop()
              result.append(node)
              queue.append(node.right)
              queue.append(node.left)
          return result`,
      out: "Observed exception: AttributeError: 'NoneType' object has no attribute 'right'", bad: true },
    { title: "Fix 2: empty tree and missing children", note: "No more crashes. But look at the values: <b>10, 5, 3, 7, 15, 12, 18</b> is pre-order (DFS)! <code>pop()</code> made the queue a stack. A <b>logical</b> error: no message warns you.", good: [2, 3, 9, 10, 11, 12], code: `
      def bfs_level_order(root):
          if root is None:
              return []
          queue = [root]
          result = []
          while queue:
              node = queue.pop()
              result.append(node)
              if node.right is not None:
                  queue.append(node.right)
              if node.left is not None:
                  queue.append(node.left)
          return result`,
      out: "Observed output: [<__main__.TreeNode object at 0x…>, …]   (7 nodes; values 10, 5, 3, 7, 15, 12, 18)" },
    { title: "Fix 3: take the oldest (FIFO)", note: "Level by level now, but each level is right-to-left: <b>10, 15, 5, 18, 12, 7, 3</b>.", good: [7], code: `
      def bfs_level_order(root):
          if root is None:
              return []
          queue = [root]
          result = []
          while queue:
              node = queue.pop(0)
              result.append(node)
              if node.right is not None:
                  queue.append(node.right)
              if node.left is not None:
                  queue.append(node.left)
          return result`,
      out: "Observed output: [<__main__.TreeNode object at 0x…>, …]   (values 10, 15, 5, 18, 12, 7, 3)" },
    { title: "Fix 4: left child first", note: "The order is right: <b>10, 5, 15, 3, 7, 12, 18</b>. But the list still holds node objects.", good: [9, 10, 11, 12], code: `
      def bfs_level_order(root):
          if root is None:
              return []
          queue = [root]
          result = []
          while queue:
              node = queue.pop(0)
              result.append(node)
              if node.left is not None:
                  queue.append(node.left)
              if node.right is not None:
                  queue.append(node.right)
          return result`,
      out: "Observed output: [<__main__.TreeNode object at 0x…>, …]   (values 10, 5, 15, 3, 7, 12, 18)" },
    { title: "Fix 5: values, not nodes", note: "Correct output. One problem left: <code>pop(0)</code> shifts every item, O(n) per pop.", good: [8], code: `
      def bfs_level_order(root):
          if root is None:
              return []
          queue = [root]
          result = []
          while queue:
              node = queue.pop(0)
              result.append(node.value)
              if node.left is not None:
                  queue.append(node.left)
              if node.right is not None:
                  queue.append(node.right)
          return result`,
      out: "Observed output: [10, 5, 15, 3, 7, 12, 18]" },
    { title: "Fix 6: deque + popleft", note: "Same output, now O(n) time in total and O(w) queue memory. All the exercise's BFS tests pass.", good: [4, 7], code: `
      def bfs_level_order(root):
          if root is None:
              return []
          queue = deque([root])
          result = []
          while queue:
              node = queue.popleft()
              result.append(node.value)
              if node.left is not None:
                  queue.append(node.left)
              if node.right is not None:
                  queue.append(node.right)
          return result`,
      out: "Observed output: [10, 5, 15, 3, 7, 12, 18]\nAll BFS checks passed.", ok: true },
  ];
  function fixWidget(el) {
    let k = 0;
    const head = h("p", { class: "eyebrow", style: "margin:0 0 6px" });
    const codeBox = h("div");
    const out = h("pre", { class: "st-out", style: "margin:8px 0 0;white-space:pre-wrap" });
    const note = h("p", { style: "margin:8px 0 0" });
    const bBack = btn("◀ Back", () => go(k - 1));
    const bNext = btn("Next fix ▶", () => go(k + 1), "btn small primary");
    const count = h("span", { class: "small muted", "aria-live": "polite" });
    function go(n) {
      k = Math.max(0, Math.min(FIXES.length - 1, n));
      const f = FIXES[k];
      head.textContent = f.title;
      codeBox.replaceChildren(ui.code({ code: f.code, good: f.good }));
      out.textContent = f.out;
      out.className = "st-out " + (f.bad ? "tv-outbad" : f.ok ? "tv-outok" : "");
      note.innerHTML = f.note;
      bBack.disabled = k === 0; bNext.disabled = k === FIXES.length - 1;
      count.textContent = `Version ${k + 1} / ${FIXES.length}`;
    }
    el.append(row(bBack, bNext, count), h("div", { style: "margin-top:10px" }, head, codeBox, eyebrow("What the diagnostic cell shows", "margin:10px 0 0"), out, note));
    go(0);
  }

  const LOG_ROWS = [
    ["Invalid child attribute", "runtime", "<code>TreeNode</code> has no <code>left_child</code>: AttributeError", "<code>node.left</code>"],
    ["Missing-child / empty-tree handling", "runtime", "None goes into the queue; <code>None.right</code> raises AttributeError (also for <code>root = None</code>)", "<code>if root is None: return []</code>; append a child only if it is not None"],
    ["Queue removal policy", "logical", "<code>pop()</code> takes the newest: a stack, so the order is DFS-like. No error message", "<code>deque</code> + <code>popleft()</code> (FIFO, O(1))"],
    ["Child insertion order", "logical", "right is queued before left, so each level comes out right-to-left", "append left first, then right"],
    ["Output element type", "logical", "the list holds <code>TreeNode</code> objects, not ints", "<code>result.append(node.value)</code>"],
  ];

  const bfsDebug = {
    id: "bfs-debug",
    title: "Debugging BFS",
    summary: "Exercise 10 part 1: a colleague's <code>bfs_level_order</code> has several independent defects. Tell runtime errors from logical errors, fix one at a time, and fill in a debugging log.",
    exam: ["Q2/Q4 find the bug", "Q6 tree walk"],
    sources: "Ex10 §1",
    blocks: [
      { type: "h", text: "Two kinds of bugs" },
      { type: "table", head: ["", "Runtime error", "Logical error"], rows: [
        ["What happens", "Python <b>stops</b> with a message and a line number", "the code runs to the end, but the answer is <b>wrong</b>"],
        ["Tiny example", "<code>None.right</code> → AttributeError", "<code>queue.pop()</code> → wrong order, no message"],
        ["How you find it", "read the error (bottom line first)", "compare with the expected output: a test"],
      ] },
      { type: "callout", kind: "warn", title: "Fixing the first crash is not the end", html: "<p>The exercise says it: the defects are <b>independent</b>. Fixing <code>left_child</code> just lets the code run further, into the next crash, and then into silent wrong answers. Only the tests tell you when you are done.</p>" },

      { type: "h", text: "Inspect the colleague's code", sub: "Click every line. Which ones are defects, and of which kind?" },
      { type: "widget", render: bugHuntWidget },

      { type: "h", text: "Fix one defect at a time", sub: "This is the exercise's TODO order. Each version was run in real Python." },
      { type: "widget", render: fixWidget },
      { type: "callout", kind: "tip", title: "Funny but useful: the stack version is DFS", html: "<p>After fix 2, <code>pop()</code> + right-then-left gives <b>10, 5, 3, 7, 15, 12, 18</b>: exactly pre-order. Same loop, different container: <b>queue = BFS, stack = DFS</b>. You will use this in <a href=\"#traversal/iterative-dfs\">Iterative DFS</a>.</p>" },

      { type: "h", text: "The debugging log", sub: "The exercise wants this table filled in. Try it yourself first." },
      { type: "table", head: ["Defect", "Runtime or logical?", "Hint for “why it fails”"], rows: [
        ["Invalid child attribute", "?", "What does the error message name?"],
        ["Missing-child / empty-tree handling", "?", "What is put into the queue for a leaf's children?"],
        ["Queue removal policy", "?", "Which end does <code>pop()</code> take from?"],
        ["Child insertion order", "?", "Which child joins the line first?"],
        ["Output element type", "?", "What is printed for one element?"],
      ] },
      reveal("Show the filled-in log", [
        { type: "table", head: ["Defect", "Kind", "Why it fails", "Repair"], rows: LOG_ROWS },
        `<p><b>Why fixing only the first error is not enough:</b> each defect is independent. After the AttributeError is fixed, the code crashes on None; after that it runs, but in the wrong order and with the wrong element type. A run without errors is not a correct run.</p>`,
        `<p><b>Memory:</b> the output list always needs O(n), because it holds every value. The queue is <i>extra</i> (auxiliary) memory: it holds at most about one level, O(w). On the sample tree that is 4 nodes.</p>`,
      ]),

      {
        type: "tryit",
        title: "Repair it yourself",
        task: "This is the exercise's broken function. Repair it (keep the signature) until all checks pass. Don't deduplicate by value: two nodes may hold the same number.",
        code: withSetup(`
          def bfs_level_order(root):
              queue = [root]
              result = []
              while queue:
                  node = queue.pop()
                  result.append(node)
                  queue.append(node.right)
                  queue.append(node.left_child)
              return result`, `
          print(bfs_level_order(build_sample_tree()))`),
        checks: [["bfs_level_order(None)", "[]"], ["bfs_level_order(TreeNode(42))", "[42]"], ["bfs_level_order(build_sample_tree())", "[10, 5, 15, 3, 7, 12, 18]"], ["bfs_level_order(build_right_chain([1, 2, 3]))", "[1, 2, 3]"]],
        test: "_d = TreeNode(8)\n_d.left = TreeNode(8)\n_d.right = TreeNode(8)\nassert bfs_level_order(_d) == [8, 8, 8], 'duplicate values must all appear: [8, 8, 8]'",
        hint: "Go down the debugging log: <code>.left</code>; an empty-tree guard; <code>deque</code> + <code>popleft()</code>; left before right, only if not None; append <code>node.value</code>.",
        solution: withSetup(`
          def bfs_level_order(root):
              if root is None:                     # empty tree
                  return []

              queue = deque([root])                # deque: fast at both ends
              result = []

              while queue:
                  node = queue.popleft()           # FIFO: the oldest first
                  result.append(node.value)        # the value, not the node

                  if node.left is not None:        # left first, never None
                      queue.append(node.left)
                  if node.right is not None:
                      queue.append(node.right)

              return result`),
      },
      { type: "mistakes", items: [
        { title: "Stopping after the first error is gone", wrong: "# fixed left_child, it runs -> done!", right: "# fixed left_child -> run the tests again\n# -> fix the next defect -> repeat", why: "The defects are independent. Only passing tests mean done." },
        { title: "Fixing the symptom with try/except", wrong: "try:\n    queue.append(node.right)\nexcept AttributeError:\n    pass", right: "if node is not None: ...\n# better: never put None in the queue", why: "Hiding the error does not make the order right." },
        { title: "Skipping None after popping, but keeping pop()", wrong: "node = queue.pop()\nif node is None:\n    continue", right: "node = queue.popleft()", why: "No crash now, but the order is still DFS-like. A logical error stays." },
        { title: "Deduplicating by value", wrong: "if node.value not in result:\n    result.append(node.value)", right: "result.append(node.value)", why: "Two different nodes can both hold 8. The test wants <code>[8, 8, 8]</code>." },
        { title: "Using <code>pop(0)</code> on a list", wrong: "queue = [root]\nnode = queue.pop(0)", right: "queue = deque([root])\nnode = queue.popleft()", why: "Correct output, but O(n) per pop. The contract asks for <code>deque</code>." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "Which of these is a <b>runtime</b> error?", options: ["<code>queue.pop()</code> takes the newest node", "<code>node.left_child</code> on a <code>TreeNode</code>", "right child added before the left", "<code>result.append(node)</code>"], answer: 1,
        hint: "Which one makes Python stop with a message?", explain: "Only the wrong attribute name crashes (AttributeError). The other three run quietly and give a wrong answer: logical errors." },
      { type: "bug", q: "Exam style. This version runs but is wrong. Click every line with a defect.", code: `
          def bfs_level_order(root):
              if root is None:
                  return []
              queue = deque([root])
              result = []
              while queue:
                  node = queue.pop()
                  result.append(node)
                  if node.left is not None:
                      queue.append(node.left)
                  if node.right is not None:
                      queue.append(node.right)
                  return result`,
        bugs: [7, 8, 13], notes: { 7: "<code>pop()</code> takes the newest: use <code>popleft()</code>.", 8: "Stores nodes: use <code>node.value</code>.", 13: "<code>return</code> is inside the loop: it stops after one node." },
        fixed: `
          def bfs_level_order(root):
              if root is None:
                  return []
              queue = deque([root])
              result = []
              while queue:
                  node = queue.popleft()
                  result.append(node.value)
                  if node.left is not None:
                      queue.append(node.left)
                  if node.right is not None:
                      queue.append(node.right)
              return result`,
        hint: "Three lines. Check: which end is removed, what is stored, and how far the <code>return</code> is indented.", explain: "All three are logical errors: the code never crashes, it just returns <code>[node 10]</code>." },
      { type: "predict", q: "This version no longer crashes. Which values does it collect, in order, on the sample tree?", code: `
          queue = [root]
          while queue:
              node = queue.pop()                   # newest first
              result.append(node.value)
              if node.right is not None:
                  queue.append(node.right)
              if node.left is not None:
                  queue.append(node.left)`, options: ["[10, 5, 15, 3, 7, 12, 18]", "[10, 5, 3, 7, 15, 12, 18]", "[10, 15, 5, 18, 12, 7, 3]", "[3, 5, 7, 10, 12, 15, 18]"], answer: 1,
        hint: "With <code>pop()</code> the list is a stack. Left is pushed last, so it is on top.", explain: "Stack + push right then left = pre-order: <code>[10, 5, 3, 7, 15, 12, 18]</code>. That is DFS, not BFS." },
      { type: "mc", q: "Why does the contract ask for <code>deque.popleft()</code> instead of <code>list.pop(0)</code>?", options: ["<code>pop(0)</code> gives the wrong element", "<code>pop(0)</code> shifts all remaining items: O(n) per removal", "<code>deque</code> sorts the nodes", "<code>pop(0)</code> raises an error on an empty list but popleft does not"], answer: 1,
        hint: "Both give the same element. Think about the cost.", explain: "Both remove the front. A list must move every other item one step left, O(n); a deque removes from the front in O(1)." },
      { type: "explain", q: "In 3–4 sentences: why is fixing only the first runtime error not enough here, and what is the difference between the output list's O(n) and the queue's O(w)?",
        answer: "<p>The function has several independent defects. Fixing <code>left_child</code> only lets it run further, until it crashes on <code>None</code>; after that it runs without errors but gives the wrong order and node objects instead of values. Only the tests show when it is truly correct. The output list holds every value, so it is always O(n); the queue is extra memory that holds at most about one level at a time, O(w), where w is the widest level.</p>",
        points: ["defects are independent: one fix uncovers the next", "logical errors give no message; tests catch them", "output = O(n), needed anyway", "queue = auxiliary O(w), the widest level"],
        hint: "Think of the 6 versions in the fix widget." },
      { type: "write", q: "Repair <code>bfs_level_order</code> so it meets the contract (the exercise's BFS tests).",
        starter: withSetup(`
          def bfs_level_order(root):
              queue = [root]
              result = []
              while queue:
                  node = queue.pop()
                  result.append(node)
                  queue.append(node.right)
                  queue.append(node.left_child)
              return result`),
        checks: [["bfs_level_order(None)", "[]"], ["bfs_level_order(TreeNode(42))", "[42]"], ["bfs_level_order(build_sample_tree())", "[10, 5, 15, 3, 7, 12, 18]"], ["bfs_level_order(build_right_chain([1, 2, 3]))", "[1, 2, 3]"]],
        test: "_s = TreeNode(1)\n_s.left = TreeNode(2)\n_s.right = TreeNode(3)\n_s.left.right = TreeNode(4)\n_s.right.left = TreeNode(5)\nassert bfs_level_order(_s) == [1, 2, 3, 4, 5], 'sparse tree should give [1, 2, 3, 4, 5]'\n_d = TreeNode(8)\n_d.left = TreeNode(8)\n_d.right = TreeNode(8)\nassert bfs_level_order(_d) == [8, 8, 8], 'duplicates should give [8, 8, 8]'",
        solution: withSetup(`
          def bfs_level_order(root):
              if root is None:
                  return []

              queue = deque([root])
              result = []

              while queue:
                  node = queue.popleft()
                  result.append(node.value)

                  if node.left is not None:
                      queue.append(node.left)
                  if node.right is not None:
                      queue.append(node.right)

              return result`),
        hint: "Five repairs: guard for None, <code>deque</code>, <code>popleft()</code>, left-then-right only when not None, <code>node.value</code>.",
        explain: "Every repair maps to one row of the debugging log." },
    ],
  };

  /* ================================================================
     TOPIC 4: Recursive DFS orders + counting nodes (DFS Easy)
     ================================================================ */
  const recCode = order => {
    const body = {
      pre: ["result.append(node.value)                    # 1. root", "self.preorder_traversal(node.left, result)   # 2. left (same list)", "self.preorder_traversal(node.right, result)  # 3. right (same list)"],
      in: ["self.inorder_traversal(node.left, result)    # 1. left (same list)", "result.append(node.value)                    # 2. root", "self.inorder_traversal(node.right, result)   # 3. right (same list)"],
      post: ["self.postorder_traversal(node.left, result)  # 1. left (same list)", "self.postorder_traversal(node.right, result) # 2. right (same list)", "result.append(node.value)                    # 3. root"],
    }[order];
    return [
      `def ${order}order_traversal(self, node, result=None):`,
      "    if result is None:               # first call only: make ONE new list",
      "        result = []",
      "",
      "    if node is None:                 # base case: empty spot",
      "        return result",
      "",
      "    " + body[0], "    " + body[1], "    " + body[2],
      "    return result                    # the same list, filled in",
    ].join("\n");
  };
  const recStepper = order => ({
    type: "stepper",
    title: { pre: "Pre-order", in: "In-order", post: "Post-order" }[order] + " with one shared list",
    code: recCode(order),
    what: { 2: "Only the very first call has no list. Deeper calls get one passed in.", 5: "Every leaf has two None children. The recursion stops there.", 11: "Each call gives back the same list object it was handed." },
    steps: recSteps(order),
    visualTitle: "Tree and result",
    legend: [["held", "running now"], ["cmp", "waiting (on the call stack)"], ["done", "appended"]],
    visual: (el, st) => {
      el.appendChild(treeSvg(SAMPLE, { tone: st.tone, note: Object.fromEntries(st.result.map((v, i) => [v, "#" + (i + 1)])) }));
      el.appendChild(arr("result", st.result, { marks: Object.fromEntries(st.result.map((_, i) => [i, "done"])), empty: "[ ]" }));
    },
  });

  const EASY_STARTER = `
    class EasyDFSTree:
        def preorder_traversal(self, node, result=None):
            if result is None:
                result = []

            if node is None:
                return result

            result.append(node.value)                    # root
            self.preorder_traversal(node.left, result)   # left
            self.preorder_traversal(node.right, result)  # right
            return result

        def inorder_traversal(self, node, result=None):
            pass                                         # TODO: left, root, right

        def postorder_traversal(self, node, result=None):
            pass                                         # TODO: left, right, root

        def count_nodes(self, node):
            pass                                         # TODO: 0 for None, else 1 + left + right`;

  const dfsRecursive = {
    id: "dfs-recursive",
    title: "Recursive DFS & counting",
    summary: "DFS Easy: the three recursive orders with the exercise's <code>result=None</code> signature, and <code>count_nodes</code>. One list is shared by every call.",
    exam: ["Q6 recursion option"],
    sources: "Ex10 §2; L9 p33–37",
    blocks: [
      { type: "callout", kind: "note", title: "Orders are explained elsewhere", html: "<p>What pre-, in- and post-order mean, with the “where is the print?” trick: <a href=\"#algorithms/trees\">Trees & BST</a>. How a call stack works: <a href=\"#algorithms/recursion\">Recursion</a>. This page is about the <b>exercise's signature</b>: build one list and pass it down.</p>" },
      { type: "callout", kind: "tip", title: "How the code boxes are laid out", html: "<p>In the notebook, <code>EasyDFSTree(BinaryTree)</code> inherits from <code>BinaryTree</code>, and Medium/Hard inherit from the level before. In the boxes on this site each class stands alone, so you can run it by itself. <b>Your code is at the top</b>; the exercise's setup (<code>TreeNode</code>, <code>build_sample_tree()</code>, <code>build_right_chain()</code>) sits below it. Here <code>build_sample_tree()</code> gives back the <b>root node</b>.</p>" },
      { type: "h", text: "The rules for result=None", sub: "Straight from the exercise's requirements" },
      { type: "table", head: ["Rule", "Why", "Tiny example"], rows: [
        ["Make a new list only when <code>result is None</code>", "the first call has no list yet", "<code>t.preorder_traversal(t.root)</code> → new list"],
        ["Pass the <b>same</b> list to both recursive calls", "all calls fill one list", "<code>self.preorder_traversal(node.left, result)</code>"],
        ["Return that same list", "the caller can use it, or ignore it", "<code>acc = [-1]</code> → gives back <code>acc</code>, now <code>[-1, 10, 5, …]</code>"],
        ["<code>node is None</code> → return the list unchanged", "empty spot: nothing to add", "<code>t.preorder_traversal(None)</code> → <code>[]</code>"],
        ["Never write <code>result=[]</code> as the default", "Python makes that list <b>once</b> and reuses it", "see the Try-it below"],
      ] },
      {
        type: "tryit",
        title: "Why not result=[]?",
        task: "Predict both lines, then run. The default list is made once, when <code>def</code> runs, and every call shares it.",
        code: `
          def collect(x, result=[]):          # BAD: one list for all calls
              result.append(x)
              return result

          print(collect(1))                   # [1]
          print(collect(2))                   # you might expect [2] ...

          def collect_ok(x, result=None):
              if result is None:              # GOOD: a new list per first call
                  result = []
              result.append(x)
              return result

          print(collect_ok(1))
          print(collect_ok(2))`,
        expectOutput: "[1]\n[1, 2]\n[1]\n[2]",
      },

      { type: "h", text: "Watch one list fill up", sub: "Same code, three spots for the append. The call stack shows who is waiting." },
      { type: "switch", label: "Order", items: [
        { label: "Pre-order", blocks: [recStepper("pre")] },
        { label: "In-order", blocks: [recStepper("in")] },
        { label: "Post-order", blocks: [recStepper("post")] },
      ] },
      { type: "table", head: ["Order", "Append is", "Sample tree"], code: [2], rows: [
        ["Pre", "before both calls", "[10, 5, 3, 7, 15, 12, 18]"],
        ["In", "between the calls", "[3, 5, 7, 10, 12, 15, 18]"],
        ["Post", "after both calls", "[3, 7, 5, 12, 18, 15, 10]"],
      ] },

      { type: "h", text: "Counting nodes", sub: "A different shape of recursion: the answer comes back up as a return value." },
      { type: "callout", kind: "rule", title: "count = me + left + right", html: "<p>Empty spot: 0. A leaf: 1 + 0 + 0 = <b>1</b>. Node 5: 1 + 1 + 1 = <b>3</b>. Root 10: 1 + 3 + 3 = <b>7</b>.</p>" },
      {
        type: "stepper",
        title: "count_nodes on the sample tree",
        intro: "The note under a node is what its call gave back.",
        code: `
          def count_nodes(self, node):
              if node is None:                         # empty spot: 0 nodes
                  return 0

              left = self.count_nodes(node.left)       # count the left side
              right = self.count_nodes(node.right)     # count the right side
              return 1 + left + right                  # me + left + right`,
        what: { 2: "The base case. Without it the recursion never stops.", 5: "This call waits here until the whole left side is counted.", 7: "Only now, with both answers, can this node give back its count." },
        steps: aggSteps("count"),
        visualTitle: "Counts coming back up",
        legend: [["held", "running now"], ["cmp", "waiting for an answer"], ["done", "answered"]],
        visual: (el, st) => el.appendChild(treeSvg(SAMPLE, { tone: st.tone, note: st.note })),
      },
      { type: "table", head: ["", "Big-O", "Why"], rows: [
        ["Time", "O(n)", "every node is visited once"],
        ["Call stack", "O(h + 1)", "at most one call per level is waiting (h = height; 2 on the sample tree)"],
        ["A chain of 2000 nodes", "RecursionError", "h = 1999 is deeper than Python's limit of about 1000 calls; see <a href=\"#traversal/iterative-dfs\">Iterative DFS</a>"],
      ] },
      {
        type: "tryit",
        title: "Finish EasyDFSTree",
        task: "Pre-order is done for you. Write <code>inorder_traversal</code>, <code>postorder_traversal</code> and <code>count_nodes</code> the same way. The checks are the exercise's easy tests.",
        code: withSetup(EASY_STARTER, `
          tree = EasyDFSTree()
          root = build_sample_tree()
          print(tree.inorder_traversal(root))     # [3, 5, 7, 10, 12, 15, 18]
          print(tree.postorder_traversal(root))   # [3, 7, 5, 12, 18, 15, 10]
          print(tree.count_nodes(root))           # 7`),
        checks: [
          ["EasyDFSTree().inorder_traversal(build_sample_tree())", "[3, 5, 7, 10, 12, 15, 18]"],
          ["EasyDFSTree().postorder_traversal(build_sample_tree())", "[3, 7, 5, 12, 18, 15, 10]"],
          ["EasyDFSTree().inorder_traversal(None)", "[]"],
          ["EasyDFSTree().count_nodes(build_sample_tree())", "7"],
          ["EasyDFSTree().count_nodes(None)", "0"],
          ["EasyDFSTree().postorder_traversal(build_right_chain([1, 2, 3]))", "[3, 2, 1]"],
        ],
        test: "_t = EasyDFSTree()\n_r = build_sample_tree()\n_a = [-1]\nassert _t.postorder_traversal(_r, _a) is _a, 'return the SAME list you were given'\nassert _a == [-1, 3, 7, 5, 12, 18, 15, 10], 'append to the given list'\n_x = _t.inorder_traversal(_r)\nassert _t.inorder_traversal(_r) is not _x, 'each new call needs its own list: no result=[] default'",
        hint: "Copy the pre-order method and move the <code>append</code> line: between the two calls for in-order, after both for post-order. For counting: <code>if node is None: return 0</code>, then <code>return 1 + ... + ...</code>.",
        solution: withSetup(`
          class EasyDFSTree:
              def preorder_traversal(self, node, result=None):
                  if result is None:
                      result = []

                  if node is None:
                      return result

                  result.append(node.value)                    # root
                  self.preorder_traversal(node.left, result)   # left
                  self.preorder_traversal(node.right, result)  # right
                  return result


              def inorder_traversal(self, node, result=None):
                  if result is None:
                      result = []

                  if node is None:
                      return result

                  self.inorder_traversal(node.left, result)    # left
                  result.append(node.value)                    # root
                  self.inorder_traversal(node.right, result)   # right
                  return result

              def postorder_traversal(self, node, result=None):
                  if result is None:
                      result = []

                  if node is None:
                      return result

                  self.postorder_traversal(node.left, result)  # left
                  self.postorder_traversal(node.right, result) # right
                  result.append(node.value)                    # root
                  return result

              def count_nodes(self, node):
                  if node is None:
                      return 0

                  return 1 + self.count_nodes(node.left) + self.count_nodes(node.right)`),
      },
      { type: "mistakes", items: [
        { title: "A list as the default", wrong: "def preorder_traversal(self, node, result=[]):", right: "def preorder_traversal(self, node, result=None):\n    if result is None:\n        result = []", why: "The default list is made once and shared: the second call returns the first call's values too." },
        { title: "Not passing the list down", wrong: "self.preorder_traversal(node.left)", right: "self.preorder_traversal(node.left, result)", why: "Each child call makes its own new list and throws it away. You get only <code>[10]</code>." },
        { title: "Always making a new list", wrong: "result = []          # every call", right: "if result is None:\n    result = []", why: "Each call wipes what it was given. Again only <code>[10]</code>." },
        { title: "A bare return in the base case", wrong: "if node is None:\n    return", right: "if node is None:\n    return result", why: "<code>preorder_traversal(None)</code> must give <code>[]</code>, not None." },
        { title: "Counting an empty spot as 1", wrong: "if node is None:\n    return 1", right: "if node is None:\n    return 0", why: "Then each leaf counts 3 and the sample tree gives 15." },
        { title: "Printing instead of appending", wrong: "print(node.value)", right: "result.append(node.value)", why: "The contract: traversals <b>return</b> lists; they do not print." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "def collect(x, result=[]):\n    result.append(x)\n    return result\n\nprint(collect(1))\nprint(collect(2))", answer: "[1]\n[1, 2]",
        hint: "When is the default list made: at every call, or once?", explain: "The default <code>[]</code> is made once, when <code>def</code> runs. The second call appends to the same list: <code>[1, 2]</code>. That is why the exercise says <code>result=None</code>." },
      { type: "mc", q: "In <code>preorder_traversal</code> you wrote <code>self.preorder_traversal(node.left)</code>, without <code>result</code>. What does the sample tree give?", options: ["<code>[10, 5, 3, 7, 15, 12, 18]</code>", "<code>[10]</code>", "<code>[]</code>", "a RecursionError"], answer: 1,
        hint: "The child call gets <code>result=None</code>. What does it do then?", explain: "Each child call makes its own new list, fills it and returns it, but nobody keeps it. The top call's list only ever gets 10." },
      { type: "mc", q: "For the right chain 1 → 2 → 3, what is post-order?", options: ["<code>[1, 2, 3]</code>", "<code>[3, 2, 1]</code>", "<code>[2, 3, 1]</code>", "<code>[1, 3, 2]</code>"], answer: 1,
        hint: "Post-order: children first, then the node. 3 has no children.", explain: "3 is finished first, then 2, then 1: <code>[3, 2, 1]</code>. This is a test in the exercise." },
      { type: "mc", q: "What is the extra memory (the call stack) of the recursive traversal, for a tree of height h?", options: ["O(1)", "O(h + 1)", "O(n²)", "O(2ⁿ)"], answer: 1,
        hint: "How many calls are waiting at most, at the same time?", explain: "At any moment only the calls on one root-to-leaf path are waiting: about h + 1 of them (plus one None call). For a balanced tree that is small; for a chain it is n." },
      { type: "write", q: "Write <code>preorder_traversal(self, node, result=None)</code> exactly as the exercise asks (root, left, right; one shared list; return it).",
        starter: withSetup(`
          class EasyDFSTree:
              def preorder_traversal(self, node, result=None):
                  pass`, `
          tree = EasyDFSTree()
          root = build_sample_tree()
          print(tree.preorder_traversal(root))   # [10, 5, 3, 7, 15, 12, 18]`),
        checks: [["EasyDFSTree().preorder_traversal(build_sample_tree())", "[10, 5, 3, 7, 15, 12, 18]"], ["EasyDFSTree().preorder_traversal(None)", "[]"], ["EasyDFSTree().preorder_traversal(TreeNode(9))", "[9]"]],
        test: "_t = EasyDFSTree()\n_r = build_sample_tree()\n_a = [-1]\nassert _t.preorder_traversal(_r, _a) is _a, 'return the same list you were given'\nassert _a == [-1, 10, 5, 3, 7, 15, 12, 18], 'append to the given list'\nassert _t.preorder_traversal(None, _a) is _a, 'None: give the list back unchanged'\n_x = _t.preorder_traversal(_r)\nassert _t.preorder_traversal(_r) is not _x, 'two calls must not share one list'",
        solution: withSetup(`
          class EasyDFSTree:
              def preorder_traversal(self, node, result=None):
                  if result is None:                       # first call only
                      result = []

                  if node is None:                         # empty spot
                      return result

                  result.append(node.value)                    # root
                  self.preorder_traversal(node.left, result)   # left, same list
                  self.preorder_traversal(node.right, result)  # right, same list
                  return result`),
        hint: "Four parts: make the list if None; base case returns the list; append, then two calls that pass <code>result</code>; return the list.",
        explain: "The <code>is</code> checks are the exercise's: the list you are given must be the list you give back." },
      { type: "write", q: "Write <code>count_nodes(self, node)</code>: the number of nodes, including <code>node</code>. Empty tree: 0.",
        starter: withSetup(`
          class EasyDFSTree:
              def count_nodes(self, node):
                  pass`, `
          print(EasyDFSTree().count_nodes(build_sample_tree()))   # 7`),
        checks: [["EasyDFSTree().count_nodes(build_sample_tree())", "7"], ["EasyDFSTree().count_nodes(None)", "0"], ["EasyDFSTree().count_nodes(TreeNode(9))", "1"], ["EasyDFSTree().count_nodes(build_right_chain([1, 2, 3]))", "3"]],
        solution: withSetup(`
          class EasyDFSTree:
              def count_nodes(self, node):
                  if node is None:                         # empty spot: 0
                      return 0

                  return 1 + self.count_nodes(node.left) + self.count_nodes(node.right)   # me + left + right`),
        hint: "Base case first. Then: this node counts 1, plus whatever the two sides give back.",
        explain: "Same shape as <code>height</code> on the next page: ask both children, combine their answers." },
    ],
  };

  /* ================================================================
     TOPIC 5: Height, paths, path sums (DFS Medium)
     ================================================================ */
  const PATHS = [[10, 5, 3], [10, 5, 7], [10, 15, 12], [10, 15, 18]];
  function pathSumWidget(el) {
    const id = PADS.uid("tv-target");
    const inp = h("input", { type: "number", class: "input", id, value: "18", style: "width:7em" });
    const presets = h("div", { class: "row-wrap" }, [18, 15, 22, 40].map(t => btn(String(t), () => { inp.value = String(t); draw(); })));
    const pic = h("div", { class: "card tv-pic" });
    const list = h("div");
    const verdict = h("p", { style: "margin:8px 0 0", "aria-live": "polite" });
    function draw() {
      const t = Number(inp.value);
      const hits = PATHS.filter(p => p.reduce((a, b) => a + b, 0) === t);
      const tone = {}, edge = {};
      hits.forEach(p => p.forEach((v, i) => { tone[v] = "done"; if (i) edge[v] = "done"; }));
      const half = {};                                 // root-to-internal prefixes that hit the target (do not count)
      [[10], [10, 5], [10, 15]].forEach(p => { if (p.reduce((a, b) => a + b, 0) === t) half[p[p.length - 1]] = "stops here ✗"; });
      pic.replaceChildren(treeSvg(SAMPLE, { tone, edge, note: half, label: "paths that sum to the target" }));
      list.replaceChildren(ui.table({ head: ["Root-to-leaf path", "Sum", "= " + t + "?"], code: [0], rows: PATHS.map(p => {
        const s = p.reduce((a, b) => a + b, 0);
        return [L(p), p.join(" + ") + " = " + s, s === t ? "<span class='tv-yes'>yes ✓</span>" : "no"];
      }) }));
      verdict.innerHTML = `<code>has_path_sum(root, ${t})</code> → <b>${hits.length ? "True" : "False"}</b>` +
        (Object.keys(half).length ? `. ${Object.keys(half).map(v => "The path to " + v).join(", ")} adds up to ${t}, but ${Object.keys(half).length > 1 ? "they end" : "it ends"} at a node with children: that does <b>not</b> count.` : ".");
    }
    inp.oninput = draw;
    el.append(row(h("label", { for: id, class: "small muted" }, "target ="), inp, h("span", { class: "small muted" }, "try:"), presets), h("div", { class: "tv-two", style: "margin-top:10px" }, pic, h("div", null, list, verdict)));
    draw();
  }


  const heightPaths = {
    id: "height-paths",
    title: "Height, paths & path sums",
    summary: "DFS Medium: <code>height</code> in edges (empty = −1, leaf = 0), all root-to-leaf paths with append/pop <b>backtracking</b>, and <code>has_path_sum</code>.",
    exam: ["Q6 recursion option"],
    sources: "Ex10 §3",
    blocks: [
      { type: "h", text: "Height is counted in edges", sub: "Edges = the lines between nodes." },
      { type: "table", head: ["Tree", "Height", "Why"], rows: [
        ["empty (None)", "<b>−1</b>", "chosen so that the formula gives 0 for a leaf"],
        ["one leaf, e.g. 3", "<b>0</b>", "1 + max(−1, −1) = 0: no edges below it"],
        ["node 5 (children 3, 7)", "<b>1</b>", "1 + max(0, 0)"],
        ["root 10 of the sample", "<b>2</b>", "1 + max(1, 1)"],
        ["chain 1 → 2 → 3 → 4", "<b>3</b>", "three edges in a row"],
      ] },
      { type: "callout", kind: "rule", title: "height(node) = 1 + max(height(left), height(right))", html: "<p>Same shape as <code>count_nodes</code>: ask both children, then combine. Only the base case and the combine step change.</p>" },
      {
        type: "stepper",
        title: "height on the sample tree",
        code: `
          def height(self, node):
              if node is None:                         # empty spot: -1
                  return -1

              left_h = self.height(node.left)          # height of the left side
              right_h = self.height(node.right)        # height of the right side
              return 1 + max(left_h, right_h)          # one edge down to the taller side`,
        what: { 2: "−1, not 0. With 0, a leaf would get height 1 (that counts nodes, not edges).", 7: "+1 for the edge from this node down to its taller child." },
        steps: aggSteps("height"),
        visualTitle: "Heights coming back up",
        legend: [["held", "running now"], ["cmp", "waiting for an answer"], ["done", "answered"]],
        visual: (el, st) => el.appendChild(treeSvg(SAMPLE, { tone: st.tone, note: st.note })),
      },

      { type: "h", text: "Every root-to-leaf path: backtracking", sub: "One list goes down with you and comes back up with you." },
      { type: "table", head: ["Move", "Code", "path after it"], code: [1], rows: [
        ["step down to 10, 5, 3", "path.append(value)", "[10] → [10, 5] → [10, 5, 3]"],
        ["3 is a leaf: save it", "paths.append(path.copy())", "still [10, 5, 3]"],
        ["step back up from 3", "path.pop()", "[10, 5]"],
        ["step down to 7", "path.append(7)", "[10, 5, 7]"],
      ] },
      {
        type: "stepper",
        title: "root_to_leaf_paths: the path grows and shrinks",
        code: `
          def root_to_leaf_paths(self, node):
              paths = []                       # finished paths
              path = []                        # the ONE path we grow and shrink

              def walk(current):
                  if current is None:
                      return

                  path.append(current.value)   # step down: add me

                  if current.left is None and current.right is None:   # a leaf
                      paths.append(path.copy())                        # save a COPY
                  else:
                      walk(current.left)
                      walk(current.right)

                  path.pop()                   # step back up: remove me

              walk(node)
              return paths`,
        what: { 5: "A helper inside the method. It can see path and paths from the outer function.", 11: "A leaf has neither a left nor a right child.", 12: "copy(): later pops must not change the saved path.", 17: "Every append has exactly one pop. That is backtracking." },
        steps: pathSteps(),
        visualTitle: "The path on the tree",
        legend: [["held", "current"], ["cmp", "on the path"], ["done", "leaf already saved"]],
        visual: (el, st) => {
          el.appendChild(treeSvg(SAMPLE, { tone: st.tone, edge: st.edge }));
          el.appendChild(arr("path", st.path, { marks: Object.fromEntries(st.path.map((_, i) => [i, i === st.path.length - 1 ? "held" : "cmp"])), empty: "[ ]" }));
          el.appendChild(h("div", { class: "tv-saved" }, eyebrow("paths (saved copies)", "margin:10px 0 4px"),
            st.paths.length ? h("div", { class: "mono small" }, st.paths.map(p => h("div", null, L(p) + "  ✓"))) : h("p", { class: "small muted", style: "margin:0" }, "none yet")));
        },
      },
      {
        type: "tryit",
        title: "Why the copy matters",
        task: "Run it. Then change <code>paths.append(path)</code> to <code>paths.append(path.copy())</code> and run again.",
        code: `
          path = [10, 5, 3]
          paths = []

          paths.append(path)          # no copy: paths holds the SAME list
          path.pop()                  # step back up

          print(paths)                # did the saved path change?`,
        solution: `
          path = [10, 5, 3]
          paths = []

          paths.append(path.copy())   # a new list with the same values
          path.pop()

          print(paths)                # [[10, 5, 3]]`,
        solutionNote: "Without the copy you get <code>[[10, 5]]</code>. In the full function, every saved path would end up as <code>[]</code>, because the walk pops everything at the end: <code>[[], [], [], []]</code>.",
      },

      { type: "h", text: "Path sums: check only at a leaf" },
      { type: "callout", kind: "rule", title: "remaining = target − node.value", html: "<p>Target 18: 18 − 10 = 8, then 8 − 5 = 3, then 3 − 3 = <b>0 at leaf 3</b> → True. Target 15: 10 + 5 = 15, but 5 has children, so it does not count → False.</p>" },
      { type: "widget", title: "Which paths hit the target?", intro: "Type a target. The four root-to-leaf sums are 18, 22, 37 and 43.", render: pathSumWidget },
      { type: "switch", label: "Target", items: [
        { label: "target 18 (True)", blocks: [sumStepper(18)] },
        { label: "target 15 (False)", blocks: [sumStepper(15)] },
      ] },
      { type: "callout", kind: "warn", title: "Negative values: never stop early", html: "<p>The chain 5 → −8 → 2 sums to −1. After 5 the partial sum is already bigger than −1, but −8 brings it back down. So do not write <code>if remaining &lt; 0: return False</code>.</p>" },
      {
        type: "tryit",
        title: "Write MediumDFSTree",
        task: "Write all three methods. The checks are the exercise's medium tests (including the negative chain).",
        code: withSetup(`
        class MediumDFSTree:
            def height(self, node):
                pass                         # TODO: -1 for None, else 1 + max(...)

            def root_to_leaf_paths(self, node):
                pass                         # TODO: nested walk() with append / copy / pop

            def has_path_sum(self, node, target):
                pass                         # TODO: check remaining == 0 only at a leaf`, `
          tree = MediumDFSTree()
          root = build_sample_tree()
          print(tree.height(root))                  # 2
          print(tree.root_to_leaf_paths(root))
          print(tree.has_path_sum(root, 18))        # True`),
        checks: [
          ["MediumDFSTree().height(build_sample_tree())", "2"], ["MediumDFSTree().height(None)", "-1"], ["MediumDFSTree().height(TreeNode(4))", "0"],
          ["MediumDFSTree().root_to_leaf_paths(build_sample_tree())", "[[10, 5, 3], [10, 5, 7], [10, 15, 12], [10, 15, 18]]"], ["MediumDFSTree().root_to_leaf_paths(None)", "[]"],
          ["MediumDFSTree().has_path_sum(build_sample_tree(), 18)", "True"], ["MediumDFSTree().has_path_sum(build_sample_tree(), 15)", "False"],
          ["MediumDFSTree().has_path_sum(None, 0)", "False"], ["MediumDFSTree().has_path_sum(build_right_chain([5, -8, 2]), -1)", "True"],
        ],
        test: "_p = MediumDFSTree().root_to_leaf_paths(build_sample_tree())\nassert len({id(x) for x in _p}) == len(_p), 'each saved path must be its own list (copy it)'\n_p[0].append(999)\nassert _p[1] == [10, 5, 7], 'saved paths must not share one list'",
        hint: "Height: like count_nodes with −1 and max. Paths: copy the stepper's code. Sum: <code>remaining = target - node.value</code>; at a leaf return <code>remaining == 0</code>; otherwise <code>left or right</code>.",
        solution: withSetup(`
          class MediumDFSTree:
              def height(self, node):
                  if node is None:
                      return -1

                  return 1 + max(self.height(node.left), self.height(node.right))

              def root_to_leaf_paths(self, node):
                  paths = []
                  path = []

                  def walk(current):
                      if current is None:
                          return

                      path.append(current.value)       # down

                      if current.left is None and current.right is None:
                          paths.append(path.copy())    # leaf: save a copy
                      else:
                          walk(current.left)
                          walk(current.right)

                      path.pop()                       # up

                  walk(node)
                  return paths

              def has_path_sum(self, node, target):
                  if node is None:
                      return False

                  remaining = target - node.value

                  if node.left is None and node.right is None:   # leaf
                      return remaining == 0

                  return self.has_path_sum(node.left, remaining) or self.has_path_sum(node.right, remaining)`),
      },
      { type: "mistakes", items: [
        { title: "Height of None is 0", wrong: "if node is None:\n    return 0", right: "if node is None:\n    return -1", why: "That counts nodes, not edges: a leaf gets 1 and the sample tree gets 3 instead of 2." },
        { title: "Saving the path without a copy", wrong: "paths.append(path)", right: "paths.append(path.copy())", why: "All saved entries are the same list; after the last pop they all look like <code>[]</code>." },
        { title: "Forgetting the pop", wrong: "path.append(current.value)\n...\n# no pop", right: "path.append(current.value)\n...\npath.pop()", why: "The path keeps growing: the second path would be <code>[10, 5, 3, 7]</code>." },
        { title: "Checking the sum at any node", wrong: "if node.value == target:\n    return True", right: "if node.left is None and node.right is None:\n    return remaining == 0", why: "10 → 5 sums to 15 but stops at an internal node. Target 15 must give False." },
        { title: "Stopping when the sum gets too big", wrong: "if remaining < 0:\n    return False", right: "# no early stop: values can be negative", why: "5 → −8 → 2 sums to −1. The early stop says False." },
        { title: "Empty tree with target 0", wrong: "if node is None:\n    return target == 0", right: "if node is None:\n    return False", why: "An empty tree has no path at all, so no path can sum to 0." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "With the exercise's definition, what is <code>height</code> of the right chain 1 → 2 → 3 → 4?", answer: "3", tryit: false,
        hint: "Count the edges (lines), not the nodes.", explain: "Four nodes in a row have three edges between them: height 3. (A leaf alone is 0; an empty tree is −1.)" },
      { type: "mc", q: "In <code>root_to_leaf_paths</code> you write <code>paths.append(path)</code> without <code>.copy()</code>. What does the sample tree give?", options: ["<code>[[10, 5, 3], [10, 5, 7], [10, 15, 12], [10, 15, 18]]</code>", "<code>[[10, 15, 18]]</code>", "<code>[[], [], [], []]</code>", "an error"], answer: 2,
        hint: "All four entries point at one list. What does that list look like when the walk is over?", explain: "The four entries are the same list object. Every append has a pop, so at the end it is empty: <code>[[], [], [], []]</code>." },
      { type: "mc", q: "Why does <code>has_path_sum(root, 15)</code> give False on the sample tree, even though 10 + 5 = 15?", options: ["Because 15 is a node value", "Because the path 10 → 5 does not end at a leaf", "Because the sum is checked before subtracting", "Because <code>or</code> stops too early"], answer: 1,
        hint: "Which nodes count as the end of a path?", explain: "Only complete root-to-leaf paths count. 5 has children (3 and 7), so 10 → 5 is not complete; 10 → 5 → 3 is 18 and 10 → 5 → 7 is 22." },
      { type: "write", q: "Write <code>height(self, node)</code> in edges: empty tree −1, leaf 0.",
        starter: withSetup(`
        class MediumDFSTree:
            def height(self, node):
                pass`, `
          print(MediumDFSTree().height(build_sample_tree()))   # 2`),
        checks: [["MediumDFSTree().height(build_sample_tree())", "2"], ["MediumDFSTree().height(None)", "-1"], ["MediumDFSTree().height(TreeNode(4))", "0"], ["MediumDFSTree().height(build_right_chain([5, -8, 2]))", "2"]],
        solution: withSetup(`
          class MediumDFSTree:
              def height(self, node):
                  if node is None:                     # empty: -1
                      return -1

                  left_h = self.height(node.left)
                  right_h = self.height(node.right)
                  return 1 + max(left_h, right_h)      # edge to the taller side`),
        hint: "Base case −1. Then 1 + the bigger of the two child heights.", explain: "The −1 base case is what makes a leaf come out as 0." },
      { type: "write", q: "Write <code>root_to_leaf_paths(self, node)</code>: all root-to-leaf value lists, left before right. Use one shared path with append/pop, and save copies.",
        starter: withSetup(`
        class MediumDFSTree:
            def root_to_leaf_paths(self, node):
                paths = []
                path = []

                def walk(current):
                    pass                     # TODO

                walk(node)
                return paths`, `
          print(MediumDFSTree().root_to_leaf_paths(build_sample_tree()))`),
        checks: [["MediumDFSTree().root_to_leaf_paths(build_sample_tree())", "[[10, 5, 3], [10, 5, 7], [10, 15, 12], [10, 15, 18]]"], ["MediumDFSTree().root_to_leaf_paths(None)", "[]"], ["MediumDFSTree().root_to_leaf_paths(build_right_chain([5, -8, 2]))", "[[5, -8, 2]]"]],
        test: "_p = MediumDFSTree().root_to_leaf_paths(build_sample_tree())\nassert len({id(x) for x in _p}) == len(_p), 'each saved path must be its own list (copy it)'",
        solution: withSetup(`
          class MediumDFSTree:
              def root_to_leaf_paths(self, node):
                  paths = []
                  path = []

                  def walk(current):
                      if current is None:
                          return

                      path.append(current.value)       # down: add me

                      if current.left is None and current.right is None:
                          paths.append(path.copy())    # leaf: save a copy
                      else:
                          walk(current.left)
                          walk(current.right)

                      path.pop()                       # up: remove me

                  walk(node)
                  return paths`),
        hint: "Inside <code>walk</code>: return on None; append; if leaf save a copy, else walk left and right; pop.",
        explain: "One append and one pop per node: the path always shows exactly where you are." },
      { type: "write", q: "Write <code>has_path_sum(self, node, target)</code>: True if a complete root-to-leaf path sums to <code>target</code>. Empty tree: False.",
        starter: withSetup(`
        class MediumDFSTree:
            def has_path_sum(self, node, target):
                pass`, `
          print(MediumDFSTree().has_path_sum(build_sample_tree(), 18))   # True`),
        checks: [["MediumDFSTree().has_path_sum(build_sample_tree(), 18)", "True"], ["MediumDFSTree().has_path_sum(build_sample_tree(), 15)", "False"], ["MediumDFSTree().has_path_sum(None, 0)", "False"], ["MediumDFSTree().has_path_sum(TreeNode(0), 0)", "True"], ["MediumDFSTree().has_path_sum(build_right_chain([5, -8, 2]), -1)", "True"]],
        solution: withSetup(`
          class MediumDFSTree:
              def has_path_sum(self, node, target):
                  if node is None:                     # no path at all
                      return False

                  remaining = target - node.value      # still needed below me

                  if node.left is None and node.right is None:   # leaf: check now
                      return remaining == 0

                  return self.has_path_sum(node.left, remaining) or self.has_path_sum(node.right, remaining)`),
        hint: "Subtract this node's value from the target. At a leaf, is what is left exactly 0? Otherwise ask the left side <code>or</code> the right side.",
        explain: "<code>or</code> stops as soon as one side says True. Note there is no early stop for big sums: values can be negative." },
    ],
  };
  function sumStepper(target) {
    return {
      type: "stepper",
      title: "has_path_sum(root, " + target + ")",
      code: `
        def has_path_sum(self, node, target):
            if node is None:                 # empty tree: no path at all
                return False

            remaining = target - node.value  # what the rest must add up to

            if node.left is None and node.right is None:   # check only at a leaf
                return remaining == 0

            return self.has_path_sum(node.left, remaining) or self.has_path_sum(node.right, remaining)`,
      what: { 5: "Pass the smaller target down, instead of carrying a running sum.", 7: "Only a leaf ends a path.", 10: "<code>or</code> only tries the right side if the left side gave False." },
      steps: sumSteps(target),
      visualTitle: "remaining at each node",
      legend: [["held", "running now"], ["cmp", "on the current path"]],
      visual: (el, st) => el.appendChild(treeSvg(SAMPLE, { tone: st.tone, edge: st.edge, note: st.note })),
    };
  }

  /* ================================================================
     TOPIC 6: Iterative DFS with an explicit stack (DFS Hard, task A)
     ================================================================ */
  const ITER_CODE = {
    pre: `
      def iterative_preorder(node):            # node is not None here
          result = []
          stack = [node]                       # the to-do pile starts with the root

          while stack:                         # until the pile is empty
              current = stack.pop()            # take the top plate
              result.append(current.value)     # visit it at once

              if current.right is not None:    # push right FIRST ...
                  stack.append(current.right)
              if current.left is not None:     # ... so left lands on top
                  stack.append(current.left)

          return result`,
    in: `
      def iterative_inorder(node):
          result = []
          stack = []
          current = node

          while stack or current is not None:
              while current is not None:       # slide all the way left
                  stack.append(current)        # remember it for later
                  current = current.left

              current = stack.pop()            # leftmost node not yet visited
              result.append(current.value)     # visit it
              current = current.right          # then handle its right side

          return result`,
    post: `
      def iterative_postorder(node):           # node is not None here
          result = []
          stack = [(node, False)]              # (node, children pushed yet?)

          while stack:
              current, expanded = stack.pop()

              if expanded:                     # 2nd time: children are done
                  result.append(current.value)
              else:                            # 1st time: plan the work
                  stack.append((current, True))            # me again, LAST
                  if current.right is not None:
                      stack.append((current.right, False))
                  if current.left is not None:              # left on top: done first
                      stack.append((current.left, False))

          return result`,
  };
  const iterStepper = order => ({
    type: "stepper",
    title: { pre: "Pre-order", in: "In-order", post: "Post-order" }[order] + " with your own stack",
    code: ITER_CODE[order],
    what: {
      pre: { 6: "pop() takes the LAST item added: last in, first out.", 9: "Right goes in first so that it comes out last." },
      in: { 6: "Keep going while there is a node to slide from, or a remembered node to visit.", 7: "Every node on the way down waits on the stack.", 13: "After a node is visited, its right subtree is next." },
      post: { 3: "Each item is a pair: the node and a flag.", 8: "True = we have been here before, children are finished.", 11: "Pushed first, so it comes out after both children." },
    }[order],
    steps: iterSteps(order),
    visualTitle: "Tree, stack and result",
    legend: [["held", "current node"], ["cmp", "on the stack"], ["done", "visited"]].concat(order === "post" ? [["min", "(node, True): visit next time"]] : []),
    visual: (el, st) => {
      el.appendChild(treeSvg(SAMPLE, { tone: st.tone, note: Object.fromEntries(st.result.map((v, i) => [v, "#" + (i + 1)])) }));
      const n = st.stack.length;
      el.appendChild(arr("stack", st.stack, { ptrs: n ? { [n - 1]: "top" } : {}, marks: Object.assign(Object.fromEntries(st.stack.map((_, i) => [i, "cmp"])), st.smarks), empty: "[ ]  (empty)" }));
      el.appendChild(arr("result", st.result, { marks: Object.fromEntries(st.result.map((_, i) => [i, "done"])), empty: "[ ]" }));
    },
  });

  const iterativeDfs = {
    id: "iterative-dfs",
    title: "Iterative DFS (explicit stack)",
    summary: "DFS Hard, task A: all three orders <b>without recursion</b>, using a list as a stack. Post-order is the tricky one: a (node, flag) pair remembers “come back to me after my children”.",
    exam: ["Q6 iterative DFS"],
    sources: "Ex10 §4 task A",
    blocks: [
      { type: "h", text: "Why bother?" },
      `<p>Recursion keeps its to-do list on Python's call stack, and that stack is short. The exercise tests a chain of <b>2,000</b> nodes: the recursive version gives <b>RecursionError</b> (the default limit is about 1,000 calls). With your own list as a stack, 2,000 is no problem.</p>`,
      { type: "callout", kind: "note", title: "Seen before", html: "<p>Iterative DFS on an adjacency matrix (exam Q6) is on <a href=\"#algorithms/dfs-bfs\">DFS & BFS</a>. A stack is a list used with <code>append</code> and <code>pop()</code>: <a href=\"#algorithms/stacks-queues\">Stacks & queues</a>.</p>" },
      { type: "table", head: ["Order", "Recipe", "Tiny check on 10 / 5 / 15"], rows: [
        ["Pre", "pop, visit, push right, push left", "visit 10 → push 15, 5 → pop 5 first ✓"],
        ["In", "slide left pushing every node; pop, visit, go right", "push 10, 5, 3 → pop 3, 5, … ✓"],
        ["Post", "push <code>(node, False)</code>; on False push <code>(node, True)</code>, right, left; on True visit", "10 is visited last ✓"],
      ] },
      { type: "switch", label: "Order", items: [
        { label: "Pre-order", blocks: [iterStepper("pre")] },
        { label: "In-order", blocks: [iterStepper("in")] },
        { label: "Post-order", blocks: [iterStepper("post")] },
      ] },
      { type: "callout", kind: "warn", title: "Why post-order needs the flag", html: "<p>When you pop a node, you do not know yet whether its children are done. Pre-order does not care: it visits at once. Post-order must visit <b>after</b> both children, so the first pop only plans the work and pushes the node back as <code>(node, True)</code>. The second pop visits it.</p>" },
      { type: "h", text: "Check the order first", sub: "The exercise: raise ValueError for an unsupported order, even when the tree is empty." },
      { type: "table", head: ["Call", "Must give"], code: [0], rows: [
        ["iterative_dfs(None, 'preorder')", "<code>[]</code>"],
        ["iterative_dfs(None, 'levelorder')", "<b>ValueError</b>, not <code>[]</code>"],
        ["iterative_dfs(root, 'Preorder')", "<b>ValueError</b> (exact spelling only)"],
      ] },
      { type: "code", code: `
          if order not in ("preorder", "inorder", "postorder"):   # 1. validate FIRST
              raise ValueError("unsupported order: " + str(order))

          result = []
          if node is None:                                         # 2. then the empty tree
              return result` },
      { type: "table", head: ["", "Big-O"], rows: [
        ["Time", "O(n): each node is pushed and popped once (twice in post-order: still O(n))"],
        ["Stack", "O(h + 1) for a tree of height h; on the sample tree the pre-order stack never holds more than 3"],
      ] },
      {
        type: "tryit",
        title: "Write iterative_dfs",
        task: "One method, three branches. The checks are the exercise's task A tests, including the 2,000-node chain.",
        code: withSetup(`
          class HardDFSTree:                   # the exercise writes HardDFSTree(MediumDFSTree)
              def iterative_dfs(self, node, order="preorder"):
                  # TODO 1: raise ValueError for an unknown order (before anything else)
                  # TODO 2: return [] for an empty tree
                  # TODO 3: one branch per order, each with its own stack
                  pass`, `
          root = build_sample_tree()
          for order in ["preorder", "inorder", "postorder"]:
              print(order, HardDFSTree().iterative_dfs(root, order))`),
        checks: [
          ["HardDFSTree().iterative_dfs(build_sample_tree(), 'preorder')", "[10, 5, 3, 7, 15, 12, 18]"],
          ["HardDFSTree().iterative_dfs(build_sample_tree(), 'inorder')", "[3, 5, 7, 10, 12, 15, 18]"],
          ["HardDFSTree().iterative_dfs(build_sample_tree(), 'postorder')", "[3, 7, 5, 12, 18, 15, 10]"],
          ["HardDFSTree().iterative_dfs(None, 'inorder')", "[]"],
          ["HardDFSTree().iterative_dfs(TreeNode(6), 'postorder')", "[6]"],
          ["HardDFSTree().iterative_dfs(build_right_chain(list(range(2000))), 'postorder') == list(reversed(range(2000)))", "True"],
        ],
        test: "for _n in [None, build_sample_tree()]:\n    try:\n        HardDFSTree().iterative_dfs(_n, 'unsupported')\n    except ValueError:\n        pass\n    else:\n        raise AssertionError('an unsupported order must raise ValueError (also for an empty tree)')",
        hint: "Copy the three steppers' loops into three <code>if</code>/<code>elif</code> branches. Put the order check at the very top.",
        solution: withSetup(`
          class HardDFSTree:
              def iterative_dfs(self, node, order="preorder"):
                  if order not in ("preorder", "inorder", "postorder"):   # check FIRST
                      raise ValueError("unsupported order: " + str(order))

                  result = []
                  if node is None:
                      return result

                  if order == "preorder":
                      stack = [node]
                      while stack:
                          current = stack.pop()
                          result.append(current.value)
                          if current.right is not None:    # right first ...
                              stack.append(current.right)
                          if current.left is not None:     # ... left on top
                              stack.append(current.left)

                  elif order == "inorder":
                      stack = []
                      current = node
                      while stack or current is not None:
                          while current is not None:       # slide left
                              stack.append(current)
                              current = current.left
                          current = stack.pop()
                          result.append(current.value)
                          current = current.right

                  else:                                    # postorder
                      stack = [(node, False)]
                      while stack:
                          current, expanded = stack.pop()
                          if expanded:
                              result.append(current.value)
                          else:
                              stack.append((current, True))
                              if current.right is not None:
                                  stack.append((current.right, False))
                              if current.left is not None:
                                  stack.append((current.left, False))

                  return result`),
      },
      { type: "mistakes", items: [
        { title: "Pushing left before right (pre-order)", wrong: "stack.append(current.left)\nstack.append(current.right)", right: "stack.append(current.right)\nstack.append(current.left)", why: "The last one pushed comes out first. Wrong order gives <code>[10, 15, 18, 12, 5, 7, 3]</code>." },
        { title: "Visiting on the first pop (post-order)", wrong: "current = stack.pop()\nresult.append(current.value)", right: "current, expanded = stack.pop()\nif expanded:\n    result.append(current.value)", why: "That is pre-order again. The node must wait until both children are done." },
        { title: "Forgetting to move right (in-order)", wrong: "current = stack.pop()\nresult.append(current.value)\n# no current = current.right", right: "current = stack.pop()\nresult.append(current.value)\ncurrent = current.right", why: "<code>current</code> is the node just visited, so it slides left and pushes it again: an endless loop of 3s." },
        { title: "Checking the order too late", wrong: "if node is None:\n    return []\nif order not in (...):\n    raise ValueError", right: "if order not in (...):\n    raise ValueError\nif node is None:\n    return []", why: "<code>iterative_dfs(None, 'unsupported')</code> must raise, not give <code>[]</code>." },
        { title: "<code>pop(0)</code> instead of <code>pop()</code>", wrong: "current = stack.pop(0)", right: "current = stack.pop()", why: "Taking the oldest makes it a queue: you get a BFS-like order <code>[10, 15, 5, 18, 12, 7, 3]</code>." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "This pre-order pushes the children in the wrong order. What does it give on the sample tree?", code: `
          stack = [root]
          result = []
          while stack:
              current = stack.pop()
              result.append(current.value)
              if current.left is not None:
                  stack.append(current.left)
              if current.right is not None:
                  stack.append(current.right)`, options: ["[10, 5, 3, 7, 15, 12, 18]", "[10, 15, 18, 12, 5, 7, 3]", "[10, 5, 15, 3, 7, 12, 18]", "[3, 7, 5, 12, 18, 15, 10]"], answer: 1,
        hint: "Right is pushed last, so it is on top.", explain: "The right child always comes out first: 10, then 15, 18, 12, then 5, 7, 3. A mirror-image pre-order." },
      { type: "mc", q: "Iterative post-order. You pop <code>(5, False)</code>. What does the stack get, from bottom to top?", options: ["<code>(5, True)</code>, <code>(7, False)</code>, <code>(3, False)</code>", "<code>(3, False)</code>, <code>(7, False)</code>, <code>(5, True)</code>", "<code>(7, False)</code>, <code>(3, False)</code>", "nothing: 5 is visited now"], answer: 0,
        hint: "First time: push yourself back with True, then right, then left.", explain: "5 goes back first (bottom) so it comes out last; 3 is on top so it is done first. Order of visits: 3, 7, then 5." },
      { type: "mc", q: "Why does the exercise test a right chain of 2,000 nodes?", options: ["To check the result is sorted", "Because recursion that deep raises RecursionError, and the iterative version must not", "Because a chain has the biggest width", "To check that duplicates are kept"], answer: 1,
        hint: "How deep is a chain of 2,000 nodes, and how deep may Python's call stack go?", explain: "The chain has height 1,999. Python's default recursion limit is about 1,000 calls, so only a version with its own stack survives." },
      { type: "mc", q: "What should <code>tree.iterative_dfs(None, 'levelorder')</code> do?", options: ["Return <code>[]</code>", "Return <code>None</code>", "Raise <code>ValueError</code>", "Run BFS"], answer: 2,
        hint: "Which check comes first in the contract?", explain: "The order is validated first, even when the tree is empty. Only a valid order with an empty tree gives <code>[]</code>." },
      { type: "write", q: "Write <code>iterative_dfs(self, node, order=\"preorder\")</code> for all three orders, with no recursion.",
        starter: withSetup(`
          class HardDFSTree:
              def iterative_dfs(self, node, order="preorder"):
                  pass`, `
          print(HardDFSTree().iterative_dfs(build_sample_tree(), "postorder"))   # [3, 7, 5, 12, 18, 15, 10]`),
        checks: [
          ["HardDFSTree().iterative_dfs(build_sample_tree())", "[10, 5, 3, 7, 15, 12, 18]"],
          ["HardDFSTree().iterative_dfs(build_sample_tree(), 'inorder')", "[3, 5, 7, 10, 12, 15, 18]"],
          ["HardDFSTree().iterative_dfs(build_sample_tree(), 'postorder')", "[3, 7, 5, 12, 18, 15, 10]"],
          ["HardDFSTree().iterative_dfs(None, 'preorder')", "[]"],
          ["HardDFSTree().iterative_dfs(build_right_chain(list(range(2000))), 'inorder') == list(range(2000))", "True"],
        ],
        test: "try:\n    HardDFSTree().iterative_dfs(None, 'unsupported')\nexcept ValueError:\n    pass\nelse:\n    raise AssertionError('unsupported order must raise ValueError, even for None')",
        solution: withSetup(`
          class HardDFSTree:
              def iterative_dfs(self, node, order="preorder"):
                  if order not in ("preorder", "inorder", "postorder"):
                      raise ValueError("unsupported order: " + str(order))

                  result = []
                  if node is None:
                      return result

                  if order == "preorder":
                      stack = [node]
                      while stack:
                          current = stack.pop()
                          result.append(current.value)
                          if current.right is not None:
                              stack.append(current.right)
                          if current.left is not None:
                              stack.append(current.left)

                  elif order == "inorder":
                      stack = []
                      current = node
                      while stack or current is not None:
                          while current is not None:
                              stack.append(current)
                              current = current.left
                          current = stack.pop()
                          result.append(current.value)
                          current = current.right

                  else:
                      stack = [(node, False)]
                      while stack:
                          current, expanded = stack.pop()
                          if expanded:
                              result.append(current.value)
                          else:
                              stack.append((current, True))
                              if current.right is not None:
                                  stack.append((current.right, False))
                              if current.left is not None:
                                  stack.append((current.left, False))

                  return result`),
        hint: "Validate, handle None, then three branches: pre (pop, visit, push right then left), in (slide left, pop, visit, go right), post (pairs with a flag).",
        explain: "No call ever calls itself, so the 2,000-node chain is fine." },
    ],
  };

  /* ================================================================
     TOPIC 7: One-pass analysis (DFS Hard, task B)
     ================================================================ */
  const ATREES = [
    { name: "Sample tree", root: SAMPLE, why: "Balanced. The longest path 3 → 5 → 10 → 15 → 12 has 4 edges." },
    { name: "Chain of 4", root: chain([1, 2, 3, 4]), why: "Not balanced: at node 2 the heights are −1 and 1." },
    { name: "Hidden imbalance", root: N(0, chain([1, 2, 3]), chain([4, 5, 6])), why: "At the root both sides have height 2, but node 1 is already unbalanced. Checking only the root is not enough." },
    { name: "Diameter not through the root", root: N(0, N(1, N(2, N(3)), N(4, null, N(5)))), why: "The longest path 3 → 2 → 1 → 4 → 5 (4 edges) stays inside the left subtree. Through the root it is only 3." },
  ];
  function analyzeWidget(el) {
    let ti = 0, k = 0, order = [];
    const pick = h("div", { class: "seg", role: "group", "aria-label": "Pick a tree" });
    const bs = ATREES.map((t, i) => h("button", { type: "button", onclick: () => { ti = i; k = 0; build(); } }, t.name));
    pick.append(...bs);
    const pic = h("div", { class: "card tv-pic" });
    const info = h("div", { class: "tv-now", "aria-live": "polite" });
    const bBack = btn("◀ Back", () => { k = Math.max(0, k - 1); draw(); });
    const bNext = btn("Next node ▶", () => { k = Math.min(order.length, k + 1); draw(); }, "btn small primary");
    const bAll = btn("Finish", () => { k = order.length; draw(); });
    const count = h("span", { class: "small muted" });
    function build() {
      order = [];
      statsOf(ATREES[ti].root, order);
      bs.forEach((b, i) => b.setAttribute("aria-pressed", String(i === ti)));
      draw();
    }
    function draw() {
      const done = order.slice(0, k), cur = done[done.length - 1];
      const note = Object.fromEntries(done.map(s => [s.v, statNote(s)]));
      const tone = {};
      done.forEach(s => (tone[s.v] = s.b ? "done" : "swap"));
      if (cur) tone[cur.v] = "accent";
      pic.replaceChildren(treeSvg(ATREES[ti].root, { tone, note, label: ATREES[ti].name }));
      if (!cur) info.innerHTML = "Postorder: children before parents. Press <b>Next node</b>. Empty spots give <code>(-1, 0, True)</code>.";
      else {
        const thr = cur.lh + cur.rh + 2;
        info.innerHTML = `<b>Node ${cur.v}</b>: left gave (${cur.lh}, ${cur.ld}, ${tf(cur.lb)}), right gave (${cur.rh}, ${cur.rd}, ${tf(cur.rb)}).<br>` +
          `height = 1 + max(${cur.lh}, ${cur.rh}) = <b>${cur.h}</b> · through_me = ${cur.lh} + ${cur.rh} + 2 = ${thr} · diameter = max(${thr}, ${cur.ld}, ${cur.rd}) = <b>${cur.d}</b><br>` +
          `balanced = ${tf(cur.lb)} and ${tf(cur.rb)} and |${cur.lh} − ${cur.rh}| ≤ 1 → <b>${tf(cur.b)}</b>` +
          (k === order.length ? `<br><br>Result: <code>{'height': ${cur.h}, 'diameter': ${cur.d}, 'is_balanced': ${tf(cur.b)}}</code>. ${ATREES[ti].why}` : "");
      }
      bBack.disabled = k === 0; bNext.disabled = bAll.disabled = k === order.length;
      count.textContent = `${k} / ${order.length} nodes done`;
    }
    el.append(pick, h("div", { class: "tv-two", style: "margin-top:10px" }, pic, h("div", null, row(bBack, bNext, bAll, count), info,
      h("p", { class: "small muted", style: "margin:8px 0 0" }, "Note under a node: h = height, d = diameter, ✓ / ✗ = balanced. Red = not balanced."))));
    build();
  }

  const ANALYZE_CODE = `
    def stats(current):                      # gives back (height, diameter, balanced)
        if current is None:                  # empty spot
            return -1, 0, True

        lh, ld, lb = stats(current.left)     # left subtree first (postorder)
        rh, rd, rb = stats(current.right)    # then the right subtree

        height = 1 + max(lh, rh)
        through_me = lh + rh + 2             # longest path that bends at me
        diameter = max(through_me, ld, rd)   # or one fully inside a child
        balanced = lb and rb and abs(lh - rh) <= 1
        return height, diameter, balanced`;

  const analyze = {
    id: "analyze",
    title: "One-pass analysis",
    summary: "DFS Hard, task B: <code>analyze(node)</code> gives height, diameter and balance <b>in one postorder pass</b>. Each subtree reports three numbers to its parent.",
    exam: ["Q6 explain DFS"],
    sources: "Ex10 §4 task B",
    blocks: [
      { type: "h", text: "Three things to measure" },
      { type: "table", head: ["Word", "Meaning", "Sample tree"], rows: [
        ["height", "edges from the node down to its deepest leaf", "2"],
        ["diameter", "edges on the longest path between <b>any</b> two nodes (it may skip the root)", "4: 3 → 5 → 10 → 15 → 12"],
        ["balanced", "at <b>every</b> node, left and right heights differ by at most 1", "True"],
        ["empty tree", "<code>{'height': -1, 'diameter': 0, 'is_balanced': True}</code>", ""],
        ["single node", "<code>{'height': 0, 'diameter': 0, 'is_balanced': True}</code>", ""],
      ] },
      { type: "callout", kind: "rule", title: "Why one pass?", html: "<p>The slow way calls <code>height()</code> again at every node: on a chain that is n + (n−1) + … = <b>O(n²)</b>. The fast way lets each call give back <code>(height, diameter, balanced)</code>, so the parent only combines two small tuples: <b>O(n)</b>. Children must be finished first, so it is postorder.</p>" },
      { type: "table", head: ["Combine step", "Formula", "Tiny example (node 5)"], code: [1], rows: [
        ["height", "1 + max(lh, rh)", "1 + max(0, 0) = 1"],
        ["path that bends here", "lh + rh + 2", "0 + 0 + 2 = 2 (3 → 5 → 7)"],
        ["diameter", "max(through_me, ld, rd)", "max(2, 0, 0) = 2"],
        ["balanced", "lb and rb and abs(lh - rh) <= 1", "True and True and 0 ≤ 1"],
      ] },
      {
        type: "stepper",
        title: "stats on the sample tree",
        intro: "We skip the calls on empty spots: each gives back <code>(-1, 0, True)</code>.",
        code: ANALYZE_CODE,
        what: { 3: "−1 for height (edges). 0 for diameter. An empty tree is balanced.", 9: "+2: one edge to the left child and one to the right child.", 10: "The best path may stay inside one child; that child already measured it.", 11: "lb and rb carry any imbalance further down up to the root." },
        steps: analyzeSteps(),
        visualTitle: "Each node's (height, diameter, balanced)",
        legend: [["held", "combining now"], ["done", "finished"]],
        visual: (el, st) => el.appendChild(treeSvg(SAMPLE, { tone: st.tone, note: st.note })),
      },
      { type: "h", text: "Four test trees", sub: "These are the exercise's own tests. Step through each one." },
      { type: "widget", render: analyzeWidget },
      {
        type: "tryit",
        title: "Write analyze",
        task: "Use one inner helper. The checks are the exercise's task B tests.",
        code: withSetup(`
          class HardDFSTree:
              def analyze(self, node):
                  def stats(current):                  # gives back (height, diameter, balanced)
                      pass                             # TODO

                  h, d, b = stats(node)
                  return {"height": h, "diameter": d, "is_balanced": b}`, `
          print(HardDFSTree().analyze(build_sample_tree()))   # {'height': 2, 'diameter': 4, 'is_balanced': True}`),
        checks: [
          ["HardDFSTree().analyze(None)", "{'height': -1, 'diameter': 0, 'is_balanced': True}"],
          ["HardDFSTree().analyze(TreeNode(6))", "{'height': 0, 'diameter': 0, 'is_balanced': True}"],
          ["HardDFSTree().analyze(build_sample_tree())", "{'height': 2, 'diameter': 4, 'is_balanced': True}"],
          ["HardDFSTree().analyze(build_right_chain([1, 2, 3, 4]))", "{'height': 3, 'diameter': 3, 'is_balanced': False}"],
        ],
        test: "_h = TreeNode(0)\n_h.left = build_right_chain([1, 2, 3])\n_h.right = build_right_chain([4, 5, 6])\nassert HardDFSTree().analyze(_h) == {'height': 3, 'diameter': 6, 'is_balanced': False}, 'hidden imbalance: equal heights at the root are not enough'\n_i = TreeNode(0)\n_i.left = TreeNode(1)\n_i.left.left = TreeNode(2)\n_i.left.left.left = TreeNode(3)\n_i.left.right = TreeNode(4)\n_i.left.right.right = TreeNode(5)\nassert HardDFSTree().analyze(_i) == {'height': 3, 'diameter': 4, 'is_balanced': False}, 'the longest path can stay inside one subtree'",
        hint: "Copy the stepper's <code>stats</code>. Base case <code>return -1, 0, True</code>; unpack both children; combine with the four formulas; return a tuple.",
        solution: withSetup(`
          class HardDFSTree:
              def analyze(self, node):
                  def stats(current):
                      if current is None:
                          return -1, 0, True

                      lh, ld, lb = stats(current.left)
                      rh, rd, rb = stats(current.right)

                      height = 1 + max(lh, rh)
                      through_me = lh + rh + 2
                      diameter = max(through_me, ld, rd)
                      balanced = lb and rb and abs(lh - rh) <= 1
                      return height, diameter, balanced

                  h, d, b = stats(node)
                  return {"height": h, "diameter": d, "is_balanced": b}`),
      },
      { type: "mistakes", items: [
        { title: "Diameter only through the root", wrong: "diameter = lh + rh + 2", right: "diameter = max(lh + rh + 2, ld, rd)", why: "The “diameter not through the root” tree gives 3 instead of 4." },
        { title: "Balance checked only at the root", wrong: "balanced = abs(lh - rh) <= 1", right: "balanced = lb and rb and abs(lh - rh) <= 1", why: "In the hidden-imbalance tree both root sides have height 2, but node 1 is unbalanced." },
        { title: "Calling height() inside the pass", wrong: "lh = self.height(current.left)   # walks the subtree again", right: "lh, ld, lb = stats(current.left)  # reuse the answer", why: "That walks each subtree again and again: O(n²) on a chain." },
        { title: "Counting nodes instead of edges", wrong: "through_me = lh + rh + 3", right: "through_me = lh + rh + 2", why: "Two edges join the node to its children. With −1 for empty, a leaf correctly gets 0." },
        { title: "Wrong empty-tree values", wrong: "if current is None:\n    return 0, 0, True", right: "if current is None:\n    return -1, 0, True", why: "Height is in edges: empty = −1, so a leaf is 0 and the single-node test passes." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "What is the diameter (in edges) of the sample tree?", options: ["2", "3", "4", "6"], answer: 2,
        hint: "Find the longest path between two leaves.", explain: "3 → 5 → 10 → 15 → 12 has 4 edges. At the root: lh + rh + 2 = 1 + 1 + 2 = 4." },
      { type: "predict", q: "What does <code>analyze</code> give for the right chain 1 → 2 → 3 → 4?", options: ["{'height': 3, 'diameter': 3, 'is_balanced': False}", "{'height': 4, 'diameter': 4, 'is_balanced': False}", "{'height': 3, 'diameter': 3, 'is_balanced': True}", "{'height': 3, 'diameter': 6, 'is_balanced': False}"], answer: 0,
        hint: "Height and diameter count edges. Check node 2: left −1, right 1.", explain: "Three edges in a row: height 3, diameter 3. At node 2 the heights are −1 and 1, a difference of 2, so it is not balanced." },
      { type: "mc", q: "In the hidden-imbalance tree, the root's left and right heights are both 2. Why is it still not balanced?", options: ["Because the diameter is 6", "Because a node lower down (1) has heights −1 and 1", "Because the root has value 0", "Because the tree has 7 nodes"], answer: 1,
        hint: "Balanced must hold at <b>every</b> node.", explain: "Node 1 has no left child (−1) and a right subtree of height 1: difference 2. <code>lb</code> carries that False up to the root." },
      { type: "mc", q: "Calling <code>self.height()</code> at every node gives O(n²) on a chain. What does the one-pass version cost?", options: ["O(log n)", "O(n)", "O(n log n)", "O(n²)"], answer: 1,
        hint: "How many times is each node's <code>stats</code> called?", explain: "Each node is visited once and does a constant amount of work with its children's tuples: O(n)." },
      { type: "write", q: "Write <code>analyze(self, node)</code>: one postorder pass returning <code>{\"height\": …, \"diameter\": …, \"is_balanced\": …}</code>.",
        starter: withSetup(`
          class HardDFSTree:
              def analyze(self, node):
                  pass`, `
          print(HardDFSTree().analyze(build_sample_tree()))`),
        checks: [
          ["HardDFSTree().analyze(None)", "{'height': -1, 'diameter': 0, 'is_balanced': True}"],
          ["HardDFSTree().analyze(TreeNode(6))", "{'height': 0, 'diameter': 0, 'is_balanced': True}"],
          ["HardDFSTree().analyze(build_sample_tree())", "{'height': 2, 'diameter': 4, 'is_balanced': True}"],
          ["HardDFSTree().analyze(build_right_chain([1, 2, 3, 4]))", "{'height': 3, 'diameter': 3, 'is_balanced': False}"],
        ],
        test: "_i = TreeNode(0)\n_i.left = TreeNode(1)\n_i.left.left = TreeNode(2)\n_i.left.left.left = TreeNode(3)\n_i.left.right = TreeNode(4)\n_i.left.right.right = TreeNode(5)\nassert HardDFSTree().analyze(_i) == {'height': 3, 'diameter': 4, 'is_balanced': False}, 'the longest path can stay inside one subtree'",
        solution: withSetup(`
          class HardDFSTree:
              def analyze(self, node):
                  def stats(current):                      # (height, diameter, balanced)
                      if current is None:
                          return -1, 0, True

                      lh, ld, lb = stats(current.left)     # children first
                      rh, rd, rb = stats(current.right)

                      height = 1 + max(lh, rh)
                      diameter = max(lh + rh + 2, ld, rd)
                      balanced = lb and rb and abs(lh - rh) <= 1
                      return height, diameter, balanced

                  h, d, b = stats(node)
                  return {"height": h, "diameter": d, "is_balanced": b}`),
        hint: "An inner <code>stats</code> that returns a tuple of three. The outer method turns the root's tuple into the dict.",
        explain: "Diameter looks at three candidates; balance needs both children's flags as well as this node's height difference." },
    ],
  };

  /* ================================================================
     TOPIC 8: Exercise 10 walkthrough (every TODO → hints → answer)
     ================================================================ */
  const NB_SETUP = "# SETUP CELL RUN THIS\n\nfrom collections import deque\n\nclass TreeNode:\n    def __init__(self, value):\n        self.value = value\n        self.left = None\n        self.right = None\n\nclass BinaryTree:\n    def __init__(self, root_value=None):\n        self.root = None if root_value is None else TreeNode(root_value)\n\n\ndef build_sample_tree(tree_class=BinaryTree):\n    tree = tree_class(10)\n    tree.root.left = TreeNode(5)\n    tree.root.right = TreeNode(15)\n    tree.root.left.left = TreeNode(3)\n    tree.root.left.right = TreeNode(7)\n    tree.root.right.left = TreeNode(12)\n    tree.root.right.right = TreeNode(18)\n    return tree\n\n\ndef build_right_chain(values, tree_class=BinaryTree):\n    tree = tree_class()\n    if not values:\n        return tree\n    tree.root = TreeNode(values[0])\n    current = tree.root\n    for value in values[1:]:\n        current.right = TreeNode(value)\n        current = current.right\n    return tree\n\nsample_tree = build_sample_tree()";
  const NB_START = "def bfs_level_order(root):\n    # TODO: Repair this function while preserving its signature.\n    queue = [root]\n    result = []\n    while queue:\n        node = queue.pop()\n        result.append(node)\n        queue.append(node.right)\n        queue.append(node.left_child)\n    return result\n\n\nclass EasyDFSTree(BinaryTree):\n    def preorder_traversal(self, node, result=None):\n        # TODO: Initialize the accumulator, visit root, recurse left, recurse right.\n        raise NotImplementedError(\"Implement recursive preorder traversal\")\n\n    def inorder_traversal(self, node, result=None):\n        # TODO: Initialize the accumulator, recurse left, visit root, recurse right.\n        raise NotImplementedError(\"Implement recursive inorder traversal\")\n\n    def postorder_traversal(self, node, result=None):\n        # TODO: Initialize the accumulator, recurse left, recurse right, visit root.\n        raise NotImplementedError(\"Implement recursive postorder traversal\")\n\n    def count_nodes(self, node):\n        # TODO: Write the empty-tree base case and combine both subtree counts.\n        raise NotImplementedError(\"Implement recursive node counting\")\n\n\nclass MediumDFSTree(EasyDFSTree):\n    def height(self, node):\n        # TODO: Return -1 for None; combine child heights for a nonempty node.\n        raise NotImplementedError(\"Implement recursive height\")\n\n    def root_to_leaf_paths(self, node):\n        # TODO: Use a nested DFS helper with append/pop and copies at leaves.\n        raise NotImplementedError(\"Implement root-to-leaf path enumeration\")\n\n    def has_path_sum(self, node, target):\n        # TODO: Check the sum at leaves, not at internal nodes.\n        raise NotImplementedError(\"Implement root-to-leaf target-sum search\")\n\n\nclass HardDFSTree(MediumDFSTree):\n    def iterative_dfs(self, node, order=\"preorder\"):\n        # TODO: Validate order first, then implement the selected iterative traversal.\n        raise NotImplementedError(\"Implement iterative preorder, inorder, and postorder\")\n\n    def analyze(self, node):\n        # TODO: Compute height, diameter, and balance together in one postorder pass.\n        raise NotImplementedError(\"Implement single-pass structural analysis\")";
  const NB_TESTS = "def test_bfs():\n    assert bfs_level_order(None) == []\n    assert bfs_level_order(TreeNode(42)) == [42]\n    tree = build_sample_tree()\n    assert bfs_level_order(tree.root) == [10, 5, 15, 3, 7, 12, 18]\n    assert bfs_level_order(tree.root) == [10, 5, 15, 3, 7, 12, 18], \"Calls must be independent\"\n    assert bfs_level_order(build_right_chain([1, 2, 3]).root) == [1, 2, 3]\n    sparse = TreeNode(1)\n    sparse.left = TreeNode(2)\n    sparse.right = TreeNode(3)\n    sparse.left.right = TreeNode(4)\n    sparse.right.left = TreeNode(5)\n    assert bfs_level_order(sparse) == [1, 2, 3, 4, 5]\n    duplicates = TreeNode(8)\n    duplicates.left = TreeNode(8)\n    duplicates.right = TreeNode(8)\n    assert bfs_level_order(duplicates) == [8, 8, 8]\n    assert tree.root.left.value == 5 and tree.root.right.value == 15\n    print(\"All BFS checks passed.\")\n\n\ndef test_easy():\n    tree = build_sample_tree(EasyDFSTree)\n    cases = [\n        (\"preorder_traversal\", [10, 5, 3, 7, 15, 12, 18]),\n        (\"inorder_traversal\", [3, 5, 7, 10, 12, 15, 18]),\n        (\"postorder_traversal\", [3, 7, 5, 12, 18, 15, 10]),\n    ]\n    for name, expected in cases:\n        method = getattr(tree, name)\n        assert method(None) == []\n        assert method(TreeNode(9)) == [9]\n        first = method(tree.root)\n        assert first == expected\n        second = method(tree.root)\n        assert second == expected and second is not first\n        accumulator = [-1]\n        assert method(tree.root, accumulator) is accumulator\n        assert accumulator == [-1] + expected\n        assert method(None, accumulator) is accumulator\n    assert tree.count_nodes(None) == 0\n    assert tree.count_nodes(TreeNode(9)) == 1\n    assert tree.count_nodes(tree.root) == 7\n    chain = build_right_chain([1, 2, 3], EasyDFSTree)\n    assert chain.postorder_traversal(chain.root) == [3, 2, 1]\n    assert chain.count_nodes(chain.root) == 3\n    print(\"All easy DFS checks passed.\")\n\n\ndef test_medium():\n    tree = build_sample_tree(MediumDFSTree)\n    expected = [[10, 5, 3], [10, 5, 7], [10, 15, 12], [10, 15, 18]]\n    assert tree.height(None) == -1\n    assert tree.height(TreeNode(4)) == 0\n    assert tree.height(tree.root) == 2\n    assert tree.root_to_leaf_paths(None) == []\n    paths = tree.root_to_leaf_paths(tree.root)\n    assert paths == expected\n    assert len({id(path) for path in paths}) == len(paths)\n    paths[0].append(999)\n    assert paths[1] == [10, 5, 7]\n    assert tree.root_to_leaf_paths(tree.root) == expected\n    assert tree.has_path_sum(tree.root, 18) is True\n    assert tree.has_path_sum(tree.root, 15) is False\n    assert tree.has_path_sum(None, 0) is False\n    assert tree.has_path_sum(TreeNode(0), 0) is True\n    negative = build_right_chain([5, -8, 2], MediumDFSTree)\n    assert negative.has_path_sum(negative.root, -1) is True\n    assert negative.height(negative.root) == 2\n    assert negative.root_to_leaf_paths(negative.root) == [[5, -8, 2]]\n    print(\"All medium DFS checks passed.\")\n\n\ndef test_hard():\n    tree = build_sample_tree(HardDFSTree)\n    expected_orders = {\n        \"preorder\": [10, 5, 3, 7, 15, 12, 18],\n        \"inorder\": [3, 5, 7, 10, 12, 15, 18],\n        \"postorder\": [3, 7, 5, 12, 18, 15, 10],\n    }\n    for order, expected in expected_orders.items():\n        assert tree.iterative_dfs(tree.root, order) == expected\n        assert tree.iterative_dfs(None, order) == []\n        assert tree.iterative_dfs(TreeNode(6), order) == [6]\n    for node in [None, tree.root]:\n        try:\n            tree.iterative_dfs(node, \"unsupported\")\n        except ValueError:\n            pass\n        else:\n            raise AssertionError(\"Unsupported traversal order must raise ValueError\")\n    deep = build_right_chain(list(range(2000)), HardDFSTree)\n    assert deep.iterative_dfs(deep.root, \"preorder\") == list(range(2000))\n    assert deep.iterative_dfs(deep.root, \"inorder\") == list(range(2000))\n    assert deep.iterative_dfs(deep.root, \"postorder\") == list(reversed(range(2000)))\n    assert tree.analyze(None) == {\"height\": -1, \"diameter\": 0, \"is_balanced\": True}\n    assert tree.analyze(TreeNode(6)) == {\"height\": 0, \"diameter\": 0, \"is_balanced\": True}\n    assert tree.analyze(tree.root) == {\"height\": 2, \"diameter\": 4, \"is_balanced\": True}\n    chain = build_right_chain([1, 2, 3, 4], HardDFSTree)\n    assert chain.analyze(chain.root) == {\"height\": 3, \"diameter\": 3, \"is_balanced\": False}\n    # Equal heights at the root do not guarantee balance below it.\n    hidden = HardDFSTree(0)\n    hidden.root.left = build_right_chain([1, 2, 3]).root\n    hidden.root.right = build_right_chain([4, 5, 6]).root\n    assert hidden.analyze(hidden.root) == {\"height\": 3, \"diameter\": 6, \"is_balanced\": False}\n    # The longest path is entirely inside the left subtree, not through root.\n    internal = HardDFSTree(0)\n    internal.root.left = TreeNode(1)\n    internal.root.left.left = TreeNode(2)\n    internal.root.left.left.left = TreeNode(3)\n    internal.root.left.right = TreeNode(4)\n    internal.root.left.right.right = TreeNode(5)\n    assert internal.analyze(internal.root) == {\"height\": 3, \"diameter\": 4, \"is_balanced\": False}\n    assert tree.analyze(tree.root) == {\"height\": 2, \"diameter\": 4, \"is_balanced\": True}\n    print(\"All hard DFS checks passed.\")\n\n_failed = []\nfor _name, _fn in [(\"BFS\", test_bfs), (\"Easy DFS\", test_easy), (\"Medium DFS\", test_medium), (\"Hard DFS\", test_hard)]:\n    try:\n        _fn()\n    except Exception as _e:\n        _failed.append(_name)\n        print(_name + \" tests FAILED: \" + type(_e).__name__ + \": \" + str(_e))\n\nassert not _failed, \"failing sections: \" + \", \".join(_failed)";
  const NB_ANSWERS = "def bfs_level_order(root):\n    if root is None:                     # empty tree: nothing to visit\n        return []\n\n    queue = deque([root])                # the waiting line starts with the root\n    result = []\n\n    while queue:                         # until nobody is waiting\n        node = queue.popleft()           # take the OLDEST (front of the line)\n        result.append(node.value)        # store the value, not the node\n\n        if node.left is not None:        # left child joins the line first\n            queue.append(node.left)\n        if node.right is not None:       # then the right child\n            queue.append(node.right)\n\n    return result                        # after the loop, not inside it\n\n\nclass EasyDFSTree(BinaryTree):\n    def preorder_traversal(self, node, result=None):\n        if result is None:               # first call only: make ONE new list\n            result = []\n\n        if node is None:                 # base case: empty spot\n            return result\n\n        result.append(node.value)                 # 1. root\n        self.preorder_traversal(node.left, result)   # 2. left (same list)\n        self.preorder_traversal(node.right, result)  # 3. right (same list)\n        return result\n\n    def inorder_traversal(self, node, result=None):\n        if result is None:\n            result = []\n\n        if node is None:\n            return result\n\n        self.inorder_traversal(node.left, result)    # 1. left\n        result.append(node.value)                    # 2. root\n        self.inorder_traversal(node.right, result)   # 3. right\n        return result\n\n    def postorder_traversal(self, node, result=None):\n        if result is None:\n            result = []\n\n        if node is None:\n            return result\n\n        self.postorder_traversal(node.left, result)  # 1. left\n        self.postorder_traversal(node.right, result) # 2. right\n        result.append(node.value)                    # 3. root\n        return result\n\n    def count_nodes(self, node):\n        if node is None:                 # empty tree has 0 nodes\n            return 0\n\n        return 1 + self.count_nodes(node.left) + self.count_nodes(node.right)   # me + left + right\n\n\nclass MediumDFSTree(EasyDFSTree):\n    def height(self, node):\n        if node is None:                 # empty tree: -1, so a leaf gets 0\n            return -1\n\n        left_h = self.height(node.left)\n        right_h = self.height(node.right)\n        return 1 + max(left_h, right_h)  # one edge down to the taller side\n\n    def root_to_leaf_paths(self, node):\n        paths = []                       # finished paths\n        path = []                        # the ONE path we grow and shrink\n\n        def walk(current):\n            if current is None:\n                return\n\n            path.append(current.value)   # step down: add me\n\n            if current.left is None and current.right is None:   # a leaf\n                paths.append(path.copy())                        # save a COPY\n            else:\n                walk(current.left)\n                walk(current.right)\n\n            path.pop()                   # step back up: remove me\n\n        walk(node)\n        return paths\n\n    def has_path_sum(self, node, target):\n        if node is None:                 # empty tree: no path at all\n            return False\n\n        remaining = target - node.value  # what the rest of the path must add up to\n\n        if node.left is None and node.right is None:   # check only at a leaf\n            return remaining == 0\n\n        return self.has_path_sum(node.left, remaining) or self.has_path_sum(node.right, remaining)\n\n\nclass HardDFSTree(MediumDFSTree):\n    def iterative_dfs(self, node, order=\"preorder\"):\n        if order not in (\"preorder\", \"inorder\", \"postorder\"):   # check FIRST, even for None\n            raise ValueError(\"unsupported order: \" + str(order))\n\n        result = []\n        if node is None:\n            return result\n\n        if order == \"preorder\":\n            stack = [node]\n            while stack:\n                current = stack.pop()            # take the top plate\n                result.append(current.value)     # visit at once\n                if current.right is not None:    # push right FIRST ...\n                    stack.append(current.right)\n                if current.left is not None:     # ... so left is on top\n                    stack.append(current.left)\n\n        elif order == \"inorder\":\n            stack = []\n            current = node\n            while stack or current is not None:\n                while current is not None:       # slide all the way left\n                    stack.append(current)\n                    current = current.left\n                current = stack.pop()            # leftmost not-yet-visited node\n                result.append(current.value)     # visit it\n                current = current.right          # then do its right side\n\n        else:                                    # postorder\n            stack = [(node, False)]              # (node, children already pushed?)\n            while stack:\n                current, expanded = stack.pop()\n                if expanded:                     # second time we see it:\n                    result.append(current.value) # both children are done\n                else:\n                    stack.append((current, True))         # come back to me LAST\n                    if current.right is not None:\n                        stack.append((current.right, False))\n                    if current.left is not None:          # left on top: done first\n                        stack.append((current.left, False))\n\n        return result\n\n    def analyze(self, node):\n        def stats(current):                      # gives back (height, diameter, balanced)\n            if current is None:\n                return -1, 0, True\n\n            lh, ld, lb = stats(current.left)     # left subtree first (postorder)\n            rh, rd, rb = stats(current.right)    # then right subtree\n\n            height = 1 + max(lh, rh)\n            through_me = lh + rh + 2             # longest path that bends at me\n            diameter = max(through_me, ld, rd)   # or one fully inside a child\n            balanced = lb and rb and abs(lh - rh) <= 1\n            return height, diameter, balanced\n\n        h, d, b = stats(node)\n        return {\"height\": h, \"diameter\": d, \"is_balanced\": b}";
  const W = [
    { sec: "1. BFS", title: "Repair bfs_level_order (TODO 1–7)", link: "bfs-debug",
      task: "<p>Run the diagnostic cell, note the first exception, then repair one defect at a time: attribute, empty tree and missing children, FIFO, child order, values, <code>deque</code>.</p>",
      rungs: [
        { label: "Hint 1", html: "<p>The first error names the bad attribute: <code>left_child</code>. After fixing it, the next crash is <code>'NoneType' object has no attribute 'right'</code>: who put None in the queue?</p>" },
        { label: "Hint 2", html: "<p>Guard the empty tree with <code>if root is None: return []</code>. Only append children that are not None, <b>left first</b>. Use <code>queue = deque([root])</code> and <code>queue.popleft()</code>. Append <code>node.value</code>.</p>" },
        { label: "Model answer", code: `
          def bfs_level_order(root):
              if root is None:
                  return []

              queue = deque([root])
              result = []

              while queue:
                  node = queue.popleft()
                  result.append(node.value)

                  if node.left is not None:
                      queue.append(node.left)
                  if node.right is not None:
                      queue.append(node.right)

              return result` },
      ] },
    { sec: "1. BFS", title: "The debugging log (TODO 8)", link: "bfs-debug",
      task: "<p>Fill in the five rows: runtime or logical, why it fails, your repair. Then explain why fixing the first error is not enough, and O(n) output vs O(w) queue.</p>",
      rungs: [
        { label: "Hint 1", html: "<p>Runtime = Python stops with an error. Logical = it runs, the answer is wrong. Two of the five rows are runtime errors.</p>" },
        { label: "Hint 2", html: "<p>Runtime: the attribute name, and None in the queue. Logical: <code>pop()</code> (newest first), right before left, nodes instead of values.</p>" },
        { label: "Model answer", html: "<p>See the filled-in log on <a href=\"#traversal/bfs-debug\">Debugging BFS</a> (button “Show the filled-in log”).</p>" },
      ] },
    { sec: "2. DFS Easy", title: "Pre-, in- and post-order with result=None", link: "dfs-recursive",
      task: "<p>Three methods: make a list only when <code>result is None</code>, pass the same list down, return it.</p>",
      rungs: [
        { label: "Hint 1", html: "<p>Every method has the same four parts: create the list if None · base case <code>if node is None: return result</code> · the three moves · <code>return result</code>.</p>" },
        { label: "Hint 2", html: "<p>Only the position of <code>result.append(node.value)</code> changes: before both calls (pre), between them (in), after them (post).</p>" },
        { label: "Model answer", code: `
          def preorder_traversal(self, node, result=None):
              if result is None:
                  result = []

              if node is None:
                  return result

              result.append(node.value)                    # root
              self.preorder_traversal(node.left, result)   # left
              self.preorder_traversal(node.right, result)  # right
              return result

          # inorder: left call, append, right call
          # postorder: left call, right call, append` },
      ] },
    { sec: "2. DFS Easy", title: "count_nodes", link: "dfs-recursive",
      task: "<p>Return the number of nodes, including the one you are given. Empty tree: 0.</p>",
      rungs: [
        { label: "Hint 1", html: "<p>Base case: None has 0 nodes.</p>" },
        { label: "Hint 2", html: "<p>This node counts 1. Add what the left call and the right call give back.</p>" },
        { label: "Model answer", code: `
          def count_nodes(self, node):
              if node is None:
                  return 0

              return 1 + self.count_nodes(node.left) + self.count_nodes(node.right)` },
      ] },
    { sec: "3. DFS Medium", title: "height (in edges)", link: "height-paths",
      task: "<p>Empty tree −1, leaf 0.</p>",
      rungs: [
        { label: "Hint 1", html: "<p>Same shape as <code>count_nodes</code>. What must None give so that a leaf ends up at 0?</p>" },
        { label: "Hint 2", html: "<p>None → −1. A node → 1 + the bigger of the two child heights.</p>" },
        { label: "Model answer", code: `
          def height(self, node):
              if node is None:
                  return -1

              return 1 + max(self.height(node.left), self.height(node.right))` },
      ] },
    { sec: "3. DFS Medium", title: "root_to_leaf_paths (backtracking)", link: "height-paths",
      task: "<p>All root-to-leaf value lists, left before right. One shared path; append/pop; save copies.</p>",
      rungs: [
        { label: "Hint 1", html: "<p>Make <code>paths = []</code> and <code>path = []</code>, and a nested <code>def walk(current):</code> that can see both.</p>" },
        { label: "Hint 2", html: "<p>In <code>walk</code>: return on None · <code>path.append</code> · leaf? save <code>path.copy()</code> : walk left, walk right · <code>path.pop()</code>.</p>" },
        { label: "Model answer", code: `
          def root_to_leaf_paths(self, node):
              paths = []
              path = []

              def walk(current):
                  if current is None:
                      return

                  path.append(current.value)

                  if current.left is None and current.right is None:
                      paths.append(path.copy())
                  else:
                      walk(current.left)
                      walk(current.right)

                  path.pop()

              walk(node)
              return paths` },
      ] },
    { sec: "3. DFS Medium", title: "has_path_sum", link: "height-paths",
      task: "<p>True if a complete root-to-leaf path sums to <code>target</code>. Empty tree: False. Negative values allowed.</p>",
      rungs: [
        { label: "Hint 1", html: "<p>Pass a smaller target down: <code>remaining = target - node.value</code>.</p>" },
        { label: "Hint 2", html: "<p>Only at a leaf: <code>return remaining == 0</code>. Otherwise ask the left side <code>or</code> the right side. No early stop for big sums.</p>" },
        { label: "Model answer", code: `
          def has_path_sum(self, node, target):
              if node is None:
                  return False

              remaining = target - node.value

              if node.left is None and node.right is None:
                  return remaining == 0

              return self.has_path_sum(node.left, remaining) or self.has_path_sum(node.right, remaining)` },
      ] },
    { sec: "4. DFS Hard", title: "Task A: iterative_dfs", link: "iterative-dfs",
      task: "<p>All three orders with explicit stacks; ValueError for unknown orders (even with None); <code>[]</code> for an empty tree; 2,000-node chain must work.</p>",
      rungs: [
        { label: "Hint 1", html: "<p>Order check first, then the empty tree, then <code>if</code>/<code>elif</code>/<code>else</code> per order. Each branch has its own <code>stack</code> list.</p>" },
        { label: "Hint 2", html: "<p>Pre: pop, visit, push right then left. In: slide left pushing; pop, visit, <code>current = current.right</code>. Post: push <code>(node, False)</code>; on False push <code>(node, True)</code>, right, left; on True visit.</p>" },
        { label: "Model answer", html: "<p>Open “Show model answer” in the Try-it on <a href=\"#traversal/iterative-dfs\">Iterative DFS</a>, or in the final check below.</p>" },
      ] },
    { sec: "4. DFS Hard", title: "Task B: analyze in one pass", link: "analyze",
      task: "<p>Height, diameter and balance together, from one postorder helper.</p>",
      rungs: [
        { label: "Hint 1", html: "<p>The helper returns a tuple <code>(height, diameter, balanced)</code>; None returns <code>(-1, 0, True)</code>.</p>" },
        { label: "Hint 2", html: "<p>height = 1 + max(lh, rh) · diameter = max(lh + rh + 2, ld, rd) · balanced = lb and rb and abs(lh − rh) ≤ 1.</p>" },
        { label: "Model answer", code: `
          def analyze(self, node):
              def stats(current):
                  if current is None:
                      return -1, 0, True

                  lh, ld, lb = stats(current.left)
                  rh, rd, rb = stats(current.right)

                  height = 1 + max(lh, rh)
                  diameter = max(lh + rh + 2, ld, rd)
                  balanced = lb and rb and abs(lh - rh) <= 1
                  return height, diameter, balanced

              h, d, b = stats(node)
              return {"height": h, "diameter": d, "is_balanced": b}` },
      ] },
  ];

  const walkthrough = {
    id: "walkthrough",
    title: "Exercise 10 walkthrough",
    summary: "Every TODO in W46_Exercise.ipynb with two hints and then the model answer, plus a box that runs the notebook's own tests on your code.",
    sources: "Ex10 (W46)",
    blocks: [
      { type: "h", text: "The map" },
      { type: "table", head: ["Section", "TODO", "Learn it on"], rows: W.map(w => [w.sec, w.title, `<a href="#traversal/${w.link}">${{ "bfs-debug": "Debugging BFS", "dfs-recursive": "Recursive DFS", "height-paths": "Height, paths & sums", "iterative-dfs": "Iterative DFS", analyze: "One-pass analysis" }[w.link]}</a>`]) },
      { type: "callout", kind: "tip", title: "How the notebook works", html: "<ul><li>Run the setup cell first. Each section has a test cell with <code>RUN_..._TESTS = False</code>: set it to <code>True</code> when you are ready.</li><li>After editing a class, re-run that class cell <b>and every class cell below it</b> (see the quiz), then the tests.</li><li>At the end: Kernel → Restart &amp; Run All.</li></ul>" },
      { type: "h", text: "Hints first, answers last", sub: "Open one rung at a time. Try to write the code after each hint." },
      ...W.map(w => ({ type: "widget", title: w.sec + " · " + w.title, render: (el, api) => ladder(el, api, w.task, w.rungs) })),
      { type: "h", text: "Final check: the notebook's own tests", sub: "Paste your notebook code into this box (the setup cell is already at the top)." },
      {
        type: "tryit",
        title: "Run all four test cells",
        task: "This box holds the exercise's setup, the broken BFS and the empty classes. Replace them with your code and press Run. Each section prints whether its tests passed.",
        code: NB_SETUP + "\n\n\n" + NB_START,
        test: NB_TESTS,
        hint: "Work top to bottom. The first failing section shows the error; fix that one and run again.",
        solution: NB_SETUP + "\n\n\n" + NB_ANSWERS,
        solutionNote: "All four sections pass with this code (checked in real Python).",
      },
      { type: "mistakes", items: [
        { title: "Leaving the test flag off", wrong: "RUN_EASY_TESTS = False", right: "RUN_EASY_TESTS = True", why: "With False the cell runs but tests nothing, so it looks like success." },
        { title: "Re-running only the edited class", wrong: "# edited EasyDFSTree, re-ran only that cell", right: "# re-run EasyDFSTree, then MediumDFSTree, then HardDFSTree", why: "<code>MediumDFSTree(EasyDFSTree)</code> still points at the <b>old</b> class object until you re-run its cell." },
        { title: "Printing instead of returning", wrong: "def preorder_traversal(...):\n    print(node.value)", right: "def preorder_traversal(...):\n    result.append(node.value)\n    ...\n    return result", why: "The tests compare return values. A print gives back None." },
        { title: "Changing the tree while walking it", wrong: "node.left = None   # 'mark as visited'", right: "# never change the nodes; use a list or a set", why: "The contract: do not modify the input tree. Later tests reuse it." },
        { title: "Replacing BFS with a library", wrong: "import networkx  # just call bfs", right: "# repair the given function", why: "The task is to repair the existing function, keeping its signature." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "You fixed a bug in <code>EasyDFSTree</code> and re-ran only that cell. The medium tests still fail with the old behaviour. Why?", options: ["Python caches test results", "<code>MediumDFSTree</code> was built from the old <code>EasyDFSTree</code> class object and still uses it", "The flag is still False", "Jupyter needs a restart after every edit"], answer: 1,
        hint: "When is the parent class looked up: when the subclass cell runs, or later?", explain: "<code>class MediumDFSTree(EasyDFSTree)</code> stores the parent class object at the moment that cell runs. Re-run the Medium and Hard cells too (or Restart &amp; Run All)." },
      { type: "mc", q: "Which TODO needs a stack of <code>(node, flag)</code> pairs?", options: ["<code>count_nodes</code>", "<code>has_path_sum</code>", "Iterative post-order", "<code>bfs_level_order</code>"], answer: 2,
        hint: "Which order must visit a node only after both children?", explain: "Iterative post-order: the flag says whether the node's children were already pushed." },
      { type: "mc", q: "Which TODO uses append/pop <b>backtracking</b> on one shared list?", options: ["<code>height</code>", "<code>root_to_leaf_paths</code>", "<code>analyze</code>", "<code>iterative_dfs</code> in-order"], answer: 1,
        hint: "Which result is a list of lists that share a prefix?", explain: "<code>root_to_leaf_paths</code> appends on the way down, pops on the way up, and saves copies at the leaves." },
      { type: "explain", q: "In 4–5 sentences, describe how you would debug the broken BFS (as the exercise asks), and how you know you are finished.",
        answer: "<p>First I run the diagnostic cell unchanged and write down the first exception: an AttributeError for <code>left_child</code>. I fix that one thing and run again; now it crashes on <code>None</code>, because missing children were put into the queue, so I add the empty-tree guard and only append real children. After that it runs, so the remaining bugs are logical: I compare the output with the expected <code>[10, 5, 15, 3, 7, 12, 18]</code> and fix the removal order (<code>deque.popleft</code>), the child order (left first) and the element type (<code>node.value</code>). I log each defect in the table as runtime or logical. I am finished only when all the BFS tests pass, including the empty, single-node, chain, sparse and duplicate trees.</p>",
        points: ["run unchanged first, record the exception", "one fix at a time, re-run after each", "runtime vs logical errors", "compare with the expected output", "done = all tests pass, not 'no error'"],
        hint: "Think of the six versions on the Debugging BFS page." },
    ],
  };

  PADS.registerSubject({
    id: "traversal",
    title: "Tree traversal: BFS & DFS",
    order: 7,
    blurb: "Exercise 10: debug a BFS, then DFS from easy (recursive orders) to hard (iterative stacks and a one-pass analysis), all on the tree 10 / 5 / 15 / 3 / 7 / 12 / 18.",
    covers: ["BFS with a deque, and debugging it (runtime vs logical errors)", "Recursive DFS with <code>result=None</code>, counting, height, paths, path sums", "Iterative DFS for pre/in/post-order; height + diameter + balance in one pass"],
    exam: [
      "<b>Q6</b>: a DFS that returns a list of visited nodes, iterative (stack) or recursive, plus a short explanation. Exercise 10 is direct practice.",
      "<b>Q2/Q4</b>: find and fix bugs: the BFS debugging part trains exactly this (runtime vs logical).",
    ],
    topics: [bfs, bfsDebug, dfsRecursive, heightPaths, iterativeDfs, analyze, walkthrough],
  });

  PADS.registerSubject({
    id: "dataeng",
    title: "Data engineering",
    order: 9,
    blurb: "How data gets from a source to a clean, trusted table: lifecycle, file formats, storage, APIs and ETL pipelines.",
    covers: ["Lifecycle, ingestion, batch vs streaming, data quality", "CSV, JSON, XML, Parquet, Avro; schema drift", "Databases, warehouses, lakes; OLTP vs OLAP; NoSQL", "APIs: HTTP, pagination, retries, duplicates", "ETL vs ELT, contracts, idempotent loads"],
    exam: ["No data-engineering question last year; an explain question (ETL, formats, batch vs streaming) is possible, and the row-cleaning loops train Q3–Q5."],
    topics: [lecture, lifecycle, formats, storage, apis, etl],
  });
})();
