/* Subject 4: Algorithms & data structures (content map topics 10, 11, 15, 16).
   Built on the public API in AUTHORING.md. Local helpers that might be promoted later:
   llDraw (linked-list boxes with next-arrows), stepCtl (step/play controls for non-code widgets),
   matrixTable (clickable adjacency matrix). */
(function () {
  "use strict";
  const { h, ui, pyrepr } = PADS;
  const D = ui.draw;
  const SORT_SITE = "sorting/index.html";

  /* ---------- small helpers for this file only ---------- */
  const row = (...kids) => h("div", { class: "row-wrap" }, ...kids);
  const label = (text, forId) => h("label", { class: "small muted", for: forId }, text);
  const eyebrow = (text, style) => h("p", { class: "eyebrow", style: style || null }, text);
  const btn = (text, onclick, cls, extra) => h("button", Object.assign({ type: "button", class: cls || "btn small", onclick }, extra || {}), text);
  const SVGNS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  /* segmented control: seg(["A", "B"], i => ..., 0, "aria label") → { el, set(i) } */
  function seg(names, onPick, start, aria) {
    const el = h("div", { class: "seg", role: "group", "aria-label": aria || "Choose" });
    const bs = names.map((n, i) => h("button", { type: "button", onclick: () => { set(i); onPick(i); } }, n));
    el.append(...bs);
    function set(i) { bs.forEach((b, j) => b.setAttribute("aria-pressed", String(j === i))); }
    set(start || 0);
    return { el, set };
  }

  /* a tiny "step through a list of states" controller for widgets that are not code steppers */
  function stepCtl(onChange, opts) {
    opts = opts || {};
    let k = 0, n = 1, timer = null;
    const bReset = btn("⟲ Reset", () => go(0));
    const bBack = btn("◀ Back", () => go(k - 1));
    const bPlay = btn("▶ Play", () => play(), "btn small primary");
    const bNext = btn("Step ▶", () => go(k + 1));
    const count = h("span", { class: "small muted", "aria-live": "polite" });
    const el = h("div", { class: "row-wrap alg-ctl" }, bReset, bBack, bPlay, bNext, count);
    function stop() { if (timer) clearInterval(timer); timer = null; bPlay.textContent = "▶ Play"; }
    function play() {
      if (timer) return stop();
      if (k >= n - 1) k = 0;
      bPlay.textContent = "❚❚ Pause";
      timer = setInterval(() => { if (!el.isConnected || k >= n - 1) return stop(); k++; render(); }, opts.ms || 700);
      render();
    }
    function go(i) { stop(); k = Math.max(0, Math.min(n - 1, i)); render(); }
    function render() {
      count.textContent = "Step " + (k + 1) + " / " + n;
      bBack.disabled = k === 0; bNext.disabled = k >= n - 1;
      onChange(k);
    }
    return { el, stop, go, setLength(len) { n = Math.max(1, len); if (k > n - 1) k = n - 1; } };
  }

  /* ================================================================
     Linked-list drawing: boxes [data | next] with arrows.
     scene: { w, h, nodes: [{ id, data, x, y, tone, faded, sub }], nulls: [{ id, x, y, faded }],
              links: [{ from, to, tone, dashed, faded, over, under, prev }], ptrs: [{ name, at, tone }] }
     ================================================================ */
  const NW = 74, NH = 40, DW = 26;
  function llDraw(sc) {
    const S = D.svg({ w: sc.w || 610, h: sc.h || 120, label: sc.label || "linked list: boxes with arrows to the next box" });
    const at = {};
    (sc.nodes || []).forEach(n => (at[n.id] = Object.assign({ kind: "node" }, n)));
    (sc.nulls || []).forEach(n => (at[n.id] = Object.assign({ kind: "null" }, n)));
    (sc.links || []).forEach(l => {
      const a = at[l.from], b = at[l.to];
      if (!a || !b) return;
      const op = { tone: l.tone || "muted", dashed: l.dashed, faded: l.faded };
      const sx = a.x + NW - DW / 2, sy = a.y + NH / 2;
      if (l.prev) { S.arrow(a.x + 6, a.y + NH - 7, b.x + NW + 3, b.y + NH - 7, Object.assign(op, { tone: l.tone || "min" })); return; }
      if (a === b) { S.arrow(sx, a.y + NH, a.x + 20, a.y + NH + 3, Object.assign(op, { bend: -36 })); return; }
      if (l.over) { S.arrow(sx, a.y, b.x + 22, b.y - 3, Object.assign(op, { bend: l.over })); return; }
      if (l.under) { S.arrow(sx, a.y + NH, b.x + 22, b.y + NH + 3, Object.assign(op, { bend: l.under })); return; }
      if (Math.abs(b.y - a.y) < 5) S.arrow(sx, sy, b.x - 3, b.y + NH / 2, op);
      else if (b.y > a.y) S.arrow(sx, sy, b.x + (NW - DW) / 2, b.y - 3, op);
      else S.arrow(sx, sy, b.x + (NW - DW) / 2, b.y + NH + 3, op);
    });
    Object.values(at).forEach(n => {
      if (n.kind === "null") { S.text(n.x + 22, n.y + NH / 2, "None", { muted: true, faded: n.faded }); return; }
      const g = S.box(n.x, n.y, NW, NH, { tone: n.tone || null, faded: n.faded });
      g.appendChild(svgEl("line", { x1: n.x + NW - DW, y1: n.y, x2: n.x + NW - DW, y2: n.y + NH, class: "ln-plain" }));
      const t = svgEl("text", { x: n.x + (NW - DW) / 2, y: n.y + NH / 2, "text-anchor": "middle", "dominant-baseline": "central" });
      t.textContent = n.data; g.appendChild(t);
      g.appendChild(svgEl("circle", { cx: n.x + NW - DW / 2, cy: n.y + NH / 2, r: 3.5, class: "alg-dot" }));
      if (n.sub) S.text(n.x + NW / 2, n.y + NH + 14, n.sub, { muted: true });
    });
    (sc.ptrs || []).forEach(p => {
      const n = at[p.at];
      if (!n) return;
      const x = n.x + (n.kind === "null" ? 22 : (NW - DW) / 2);
      if (p.below) { S.text(x, n.y + NH + 27, p.name, { ui: true, cls: "alg-ptr", size: 13 }); S.arrow(x, n.y + NH + 18, x, n.y + NH + 3, { tone: p.tone || "accent" }); return; }
      S.text(x, n.y - 27, p.name, { ui: true, cls: "alg-ptr", size: 13 });
      S.arrow(x, n.y - 18, x, n.y - 3, { tone: p.tone || "accent" });
    });
    return S.el;
  }
  /* a plain row of values → scene */
  function llRow(vals, opts) {
    opts = opts || {};
    const y = opts.y || 40, gap = 104;
    const nodes = vals.map((v, i) => ({ id: "n" + i, data: String(v), x: 10 + i * gap, y, tone: (opts.tones || {})[i] }));
    const links = vals.map((_, i) => ({ from: "n" + i, to: i < vals.length - 1 ? "n" + (i + 1) : "nul" }));
    return { w: opts.w || 610, h: opts.h || 110, nodes, nulls: [{ id: "nul", x: 10 + vals.length * gap, y }], links, ptrs: opts.ptrs || [] };
  }

  /* ================================================================
     TOPIC 10a: Linked lists
     ================================================================ */

  // --- stepper: walk the list with current ---
  function travSteps() {
    const v = [3, 5, 13, 2], S = [];
    let out = "";
    S.push({ line: 1, now: "<code>current</code> starts at the <b>head</b>: the 3 box.", vars: { current: "Node(3)" }, cur: 0, out });
    for (let i = 0; i < 4; i++) {
      S.push({ line: 2, now: `Is <code>current</code> None? No, it is the ${v[i]} box. Run the block.`, cur: i, out });
      out += v[i] + " -> ";
      S.push({ line: 3, now: `Print ${v[i]} and then <code>" -> "</code>. <code>end=</code> means: no new line yet.`, cur: i, out });
      S.push({ line: 4, now: i < 3 ? `Hop: <code>current.next</code> is the ${v[i + 1]} box, so <code>current</code> moves there.` : "Hop: the 2 box's <code>next</code> is <b>None</b>, so <code>current</code> becomes None.", vars: { current: i < 3 ? `Node(${v[i + 1]})` : "None" }, cur: i + 1, out });
    }
    S.push({ line: 2, now: "Is <code>current</code> None? <b>Yes.</b> The loop stops.", cur: 4, out });
    out += "null";
    S.push({ line: 5, now: "After the loop: print <code>null</code>. Every node was visited once: O(n).", cur: 4, out });
    return S;
  }
  function travVisual(el, st) {
    el.append(llDraw(Object.assign(llRow([3, 5, 13, 2], { tones: { [st.cur]: "accent" } }), { ptrs: [{ name: "current", at: st.cur < 4 ? "n" + st.cur : "nul" }] })),
      eyebrow("Screen", "margin-top:8px"), h("pre", { class: "st-out" }, st.out || " "));
  }

  // --- steppers: insert (right order), insert (wrong order), delete ---
  const P = { n3: 10, n5: 114, n13: 218, n2: 322, nul: 426 };
  function insScene(o) {
    const nodes = [
      { id: "n3", data: "3", x: P.n3, y: 40 }, { id: "n5", data: "5", x: P.n5, y: 40, tone: o.cur ? "accent" : null },
      { id: "n13", data: "13", x: P.n13, y: 40, faded: o.lost, sub: o.lost ? "lost" : null }, { id: "n2", data: "2", x: P.n2, y: 40, faded: o.lost, sub: o.lost ? "lost" : null },
    ];
    const nulls = [{ id: "nul", x: P.nul, y: 40, faded: o.lost }];
    if (o.n10) { nodes.push({ id: "n10", data: "10", x: 170, y: 140, tone: "cmp" }); if (!o.l10) nulls.push({ id: "nul10", x: 290, y: 140 }); }
    const links = [{ from: "n3", to: "n5" }, { from: "n13", to: "n2", faded: o.lost }, { from: "n2", to: "nul", faded: o.lost }];
    if (o.l5 === "n10") { links.push({ from: "n5", to: "n10", tone: "done" }); if (o.cut) links.push({ from: "n5", to: "n13", faded: true, dashed: true, tone: "swap" }); }
    else links.push({ from: "n5", to: "n13" });
    if (o.n10) links.push({ from: "n10", to: o.l10 || "nul10", tone: o.l10 === "n10" ? "swap" : o.l10 ? "done" : null });
    const ptrs = [];
    if (o.cur) ptrs.push({ name: "current", at: "n5" });
    if (o.n10) ptrs.push({ name: "new_node", at: "n10", tone: "cmp", below: true });
    return { w: 520, h: 230, nodes, nulls, links, ptrs };
  }
  const insertRight = [
    { line: 0, now: "The list 3 → 5 → 13 → 2. We want 10 between 5 and 13.", scene: insScene({}) },
    { line: 1, now: "<code>current</code> points at the 5 box. We insert <b>after</b> it.", scene: insScene({ cur: 1 }) },
    { line: 2, now: "A brand-new box with 10. Its <code>next</code> is None. Nothing points at it yet.", scene: insScene({ cur: 1, n10: 1 }) },
    { line: 3, now: "<b>First</b> hook the new box onto the rest: 10 → 13. The list is still whole, because 5 → 13 is still there.", scene: insScene({ cur: 1, n10: 1, l10: "n13" }) },
    { line: 4, now: "<b>Then</b> move 5's arrow to 10. The old arrow 5 → 13 (red, dashed) is gone. Only two arrows changed: O(1).", scene: insScene({ cur: 1, n10: 1, l10: "n13", l5: "n10", cut: 1 }) },
    { line: 0, label: "Result", now: "Tidied up. Walking the list now prints <code>3 -> 5 -> 10 -> 13 -> 2 -> null</code>.", scene: llRow([3, 5, 10, 13, 2], { tones: { 2: "done" } }) },
  ];
  const insertWrong = [
    { line: 0, now: "Same list, same goal. But this time the two arrow lines are swapped.", scene: insScene({}) },
    { line: 1, now: "<code>current</code> points at the 5 box.", scene: insScene({ cur: 1 }) },
    { line: 2, now: "The new 10 box, not linked yet.", scene: insScene({ cur: 1, n10: 1 }) },
    { line: 3, now: "5 → 10 first. Now <b>nothing</b> points at 13 any more. 13 and 2 are <b>lost</b>: no name and no arrow reaches them.", scene: insScene({ cur: 1, n10: 1, l5: "n10", cut: 1, lost: 1 }) },
    { line: 4, now: "<code>current.next</code> is now the 10 box itself! So 10 points at <b>itself</b>.", scene: insScene({ cur: 1, n10: 1, l5: "n10", l10: "n10", lost: 1 }) },
    { line: 0, label: "Result", now: "Walking it prints <code>3 -> 5 -> 10 -> 10 -> 10 -> …</code> forever. Rule: <b>link the new node first</b>, then cut.", scene: insScene({ n10: 1, l5: "n10", l10: "n10", lost: 1 }) },
  ];
  function delScene(o) {
    const sc = llRow([3, 5, 13, 2], { w: 520, h: 130, y: 56 });
    if (o.prev) { sc.ptrs.push({ name: "previous", at: "n1" }); sc.nodes[1].tone = "accent"; }
    if (o.cur) { sc.ptrs.push({ name: "current", at: "n2" }); sc.nodes[2].tone = "cmp"; }
    if (o.cut) {
      sc.links[1] = { from: "n1", to: "n2", faded: true, dashed: true, tone: "swap" };
      sc.links.push({ from: "n1", to: "n3", over: -42, tone: "done" });
      sc.nodes[2].faded = true; sc.nodes[2].sub = "skipped";
      sc.ptrs = sc.ptrs.filter(p => p.name !== "current");
    }
    return sc;
  }
  const deleteSteps = [
    { line: 0, now: "Delete 13 from 3 → 5 → 13 → 2.", scene: delScene({}) },
    { line: 1, now: "<code>previous</code> is the box <b>before</b> the one to delete: 5.", scene: delScene({ prev: 1 }) },
    { line: 2, now: "<code>current</code> is the box to delete: 13.", scene: delScene({ prev: 1, cur: 1 }) },
    { line: 3, now: "One arrow changes: 5 now points at what 13 pointed at, the 2. The walk skips 13, and Python throws the box away.", scene: delScene({ prev: 1, cur: 1, cut: 1 }) },
    { line: 0, label: "Result", now: "Walking it prints <code>3 -> 5 -> 2 -> null</code>.", scene: llRow([3, 5, 2], { w: 520, h: 110 }) },
  ];
  // variable chips for the three steppers above ("Node(5)" = the box whose data is 5)
  [[insertRight, [{}, { current: "Node(5)", "current.next": "Node(13)" }, { current: "Node(5)", "current.next": "Node(13)", new_node: "Node(10)", "new_node.next": "None" },
    { current: "Node(5)", "current.next": "Node(13)", new_node: "Node(10)", "new_node.next": "Node(13)" }, { current: "Node(5)", "current.next": "Node(10)", new_node: "Node(10)", "new_node.next": "Node(13)" }]],
   [insertWrong, [{}, { current: "Node(5)", "current.next": "Node(13)" }, { current: "Node(5)", "current.next": "Node(13)", new_node: "Node(10)", "new_node.next": "None" },
    { current: "Node(5)", "current.next": "Node(10)", new_node: "Node(10)", "new_node.next": "None" }, { current: "Node(5)", "current.next": "Node(10)", new_node: "Node(10)", "new_node.next": "Node(10)" }]],
   [deleteSteps, [{}, { previous: "Node(5)", "previous.next": "Node(13)" }, { previous: "Node(5)", "previous.next": "Node(13)", current: "Node(13)", "current.next": "Node(2)" },
    { previous: "Node(5)", "previous.next": "Node(2)", current: "Node(13)", "current.next": "Node(2)" }]],
  ].forEach(([steps, vs]) => vs.forEach((v, i) => (steps[i].vars = v)));
  const sceneVisual = (el, st) => el.appendChild(llDraw(st.scene));

  // --- widget: singly / doubly / circular, with a walking cursor ---
  function kindsWidget(el) {
    let mode = 0, cur = 0, hops = 0, printed = [];
    const vals = [3, 5, 13, 2];
    const pic = h("div"), msg = h("p", { class: "small", style: "margin:8px 0 0", "aria-live": "polite" });
    const out = h("pre", { class: "st-out" });
    const s = seg(["Singly", "Doubly (prev too)", "Circular"], i => { mode = i; reset(); }, 0, "Kind of linked list");
    const bNext = btn("current = current.next", () => hop(1), "btn small mono");
    const bPrev = btn("current = current.prev", () => hop(-1), "btn small mono");
    const bReset = btn("⟲ Back to head", () => reset());
    function reset() { cur = 0; hops = 0; printed = [vals[0]]; draw(); }
    function hop(d) {
      if (cur === null) return;
      if (d > 0) cur = cur < 3 ? cur + 1 : mode === 2 ? 0 : null;
      else cur = cur > 0 ? cur - 1 : null;
      hops++;
      if (cur !== null) printed.push(vals[cur]);
      draw();
    }
    function draw() {
      const sc = llRow(vals, { w: 520, h: mode === 2 ? 160 : 120, y: 46, tones: cur === null ? {} : { [cur]: "accent" } });
      if (mode === 1) for (let i = 1; i < 4; i++) sc.links.push({ from: "n" + i, to: "n" + (i - 1), prev: true });
      if (mode === 2) { sc.links[3] = { from: "n3", to: "n0", under: -60, tone: "min" }; sc.nulls = []; }
      sc.ptrs = cur === null ? [] : [{ name: "current", at: "n" + cur }];
      pic.replaceChildren(llDraw(sc));
      bPrev.hidden = mode !== 1;
      bNext.disabled = bPrev.disabled = cur === null;
      out.textContent = printed.join(" -> ") + (cur === null ? " -> None" : "");
      const tips = [
        "Singly: each box knows only the <b>next</b> one. You can only walk forwards.",
        "Doubly: each box also has <code>prev</code> (purple). You can walk both ways, like undo / redo or a browser's back button.",
        "Circular: the last box points back to the head. Good for a playlist on repeat or taking turns (round-robin).",
      ];
      let m = tips[mode];
      if (cur === null) m += " <b>current is None</b>: a <code>while current is not None</code> loop stops here.";
      if (mode === 2 && hops >= 4) m += ` You have hopped ${hops} times and never met None. A loop must stop when it is <b>back at the start</b>: <code>while current != start</code>.`;
      msg.innerHTML = m;
    }
    el.append(s.el, h("div", { style: "margin-top:10px" }, pic), row(bNext, bPrev, bReset), eyebrow("Visited so far", "margin-top:10px"), out, msg);
    reset();
  }

  // indented by 10 spaces, like the quiz code it is glued in front of (dedent removes it)
  const NODE_CLASS = `
          class Node:
              def __init__(self, data):
                  self.data = data
                  self.next = None
`;
  const linkedLists = {
    id: "linked-lists",
    title: "Linked lists",
    summary: "A chain of <code>Node</code> boxes. Each box holds data and an arrow (<code>next</code>) to the next box. Insert and delete by moving arrows.",
    sources: "Ex7",
    blocks: [
      { type: "h", text: "A chain of boxes", sub: "Each node holds a value and a pointer to the next node. The last one points at None." },
      { type: "code", code: `
        class Node:
            def __init__(self, data):
                self.data = data             # the value in the box
                self.next = None             # the arrow; None = end of the chain

        node1 = Node(3)
        node2 = Node(5)
        node3 = Node(13)
        node4 = Node(2)

        node1.next = node2                   # 3 → 5
        node2.next = node3                   # 5 → 13
        node3.next = node4                   # 13 → 2`, caption: "From your Ex7 notebook" },
      () => h("div", { class: "card" }, llDraw(Object.assign(llRow([3, 5, 13, 2], { w: 520 }), { ptrs: [{ name: "node1 (head)", at: "n0" }] }))),
      { type: "table", caption: "Python list vs linked list", head: ["Job", "Python list", "Linked list", "Tiny example"], rows: [
        ["Get item number <i>i</i>", "O(1): jump straight there", "O(n): walk from the head", "the 4th item: the list jumps once, the linked list hops 3 times"],
        ["Insert at the front", "O(n): everyone shifts right", "O(1): one new arrow", "1,000 items: the list moves 1,000, the linked list sets 2 arrows"],
        ["Insert after a node you already have", "O(n)", "O(1)", "2 arrows change, nothing moves"],
        ["Memory", "one block", "each box + its arrow", "a bit more memory per item"],
      ] },

      { type: "h", text: "Walking the list", sub: "current hops from box to box until it is None." },
      {
        type: "stepper",
        title: "Traverse 3 → 5 → 13 → 2",
        intro: "<code>Node(5)</code> below is short for “the node whose data is 5”.",
        code: `
          current = node1                     # start at the head
          while current is not None:          # stop after the last box
              print(current.data, end=" -> ") # same line, then " -> "
              current = current.next          # hop to the next box
          print("null")`,
        what: {
          1: "A second name for the head box. We move this name, never node1.",
          2: "The loop runs as long as current points at a real box.",
          3: "Show this box's value. end=\" -> \" replaces the usual new line.",
          4: "Move current one box along. Forget this line and the loop never ends.",
          5: "After the loop. Prints null and finally ends the line.",
        },
        steps: travSteps(),
        visualTitle: "The chain and the current pointer",
        visual: travVisual,
      },

      { type: "h", text: "Insert: move two arrows, in the right order" },
      { type: "callout", kind: "rule", title: "Link the new node first, then cut", html: "<p><code>new_node.next = current.next</code> first, then <code>current.next = new_node</code>. Tiny example: to put 10 after 5, first 10 → 13, then 5 → 10.</p>" },
      { type: "switch", label: "Insert or delete", items: [
        { label: "Insert 10 (right order)", blocks: [{ type: "stepper", title: "Insert 10 after 5", code: `
            current = node1.next             # the 5 box
            new_node = Node(10)              # a new box, next is None
            new_node.next = current.next     # first: 10 → 13
            current.next = new_node          # then: 5 → 10`,
          what: { 1: "Find the box to insert after (here we know it is the 2nd).", 2: "Make the box. It is not in the chain yet.", 3: "Copy 5's arrow: the new box now points at 13.", 4: "Point 5 at the new box." },
          steps: insertRight, visualTitle: "Arrows (green = just set)", visual: sceneVisual }] },
        { label: "Insert 10 (wrong order)", blocks: [{ type: "stepper", title: "The same two lines, swapped", code: `
            current = node1.next             # the 5 box
            new_node = Node(10)
            current.next = new_node          # 5 → 10 first ...
            new_node.next = current.next     # ... but current.next is now 10!`,
          what: { 3: "Overwrites 5's arrow. The only way to reach 13 is gone.", 4: "Reads current.next AFTER it changed: that is new_node itself." },
          steps: insertWrong, visualTitle: "Arrows (red = broken)", visual: sceneVisual }] },
        { label: "Delete 13", blocks: [{ type: "stepper", title: "Delete 13", code: `
            previous = node1.next            # the 5 box (the one before)
            current = previous.next          # the 13 box (the one to delete)
            previous.next = current.next     # 5 skips 13 and points at 2`,
          what: { 1: "You need the box BEFORE the one you delete, because its arrow must change.", 2: "The box to remove.", 3: "One arrow jumps over the box. Nothing points at 13 any more, so Python frees it." },
          steps: deleteSteps, visualTitle: "Arrows", visual: sceneVisual }] },
      ] },

      { type: "h", text: "Singly, doubly, circular", sub: "Click the buttons to walk the chain." },
      { type: "widget", render: kindsWidget },
      { type: "table", head: ["Kind", "Extra arrow", "Used for"], rows: [
        ["Singly", "none", "the basic chain; stacks and queues"],
        ["Doubly", "<code>self.prev</code> to the box before", "walking back: undo/redo, browser back"],
        ["Circular", "last box → head", "playlist on repeat, round-robin CPU turns"],
      ] },

      {
        type: "tryit",
        title: "Build, walk, insert, delete",
        task: "Run it. Then write <code>insert_after(node, data)</code> yourself and use it to add a 7 after the 13.",
        code: `
          class Node:
              def __init__(self, data):
                  self.data = data
                  self.next = None

          def show(head):
              current = head
              while current is not None:      # walk until the end
                  print(current.data, end=" -> ")
                  current = current.next
              print("null")

          node1, node2, node3, node4 = Node(3), Node(5), Node(13), Node(2)
          node1.next, node2.next, node3.next = node2, node3, node4
          show(node1)

          new_node = Node(10)                 # insert 10 after 5
          new_node.next = node2.next          # first 10 → 13
          node2.next = new_node               # then 5 → 10
          show(node1)

          node2.next = node2.next.next        # delete the 10 again
          show(node1)`,
        solution: `
          class Node:
              def __init__(self, data):
                  self.data = data
                  self.next = None

          def show(head):
              current = head
              while current is not None:
                  print(current.data, end=" -> ")
                  current = current.next
              print("null")

          def insert_after(node, data):
              new_node = Node(data)
              new_node.next = node.next       # first link the new box
              node.next = new_node            # then cut over to it

          node1, node2, node3, node4 = Node(3), Node(5), Node(13), Node(2)
          node1.next, node2.next, node3.next = node2, node3, node4
          insert_after(node3, 7)
          show(node1)                         # 3 -> 5 -> 13 -> 7 -> 2 -> null`,
      },
      { type: "mistakes", items: [
        { title: "Cutting before linking", wrong: "current.next = new_node\nnew_node.next = current.next", right: "new_node.next = current.next\ncurrent.next = new_node", why: "The first line loses the rest of the list, and the new node ends up pointing at itself." },
        { title: "Making a new box instead of re-linking", wrong: "node2.next = Node(13)   # a second 13", right: "new_node.next = node2.next\nnode2.next = new_node", why: "Your first Ex7 attempt did this. The old 13 (and everything after it) is cut off; you just made a lonely copy." },
        { title: "Forgetting to hop", wrong: "while current is not None:\n    print(current.data)", right: "while current is not None:\n    print(current.data)\n    current = current.next", why: "<code>current</code> never changes, so the loop prints 3 forever." },
        { title: "Stopping one box too early", wrong: "while current.next is not None:", right: "while current is not None:", why: "<code>current.next is not None</code> stops <b>at</b> the last box, so its value is never printed." },
        { title: "Moving the head name while walking", wrong: "while node1 is not None:\n    node1 = node1.next", right: "current = node1\nwhile current is not None:\n    current = current.next", why: "Afterwards <code>node1</code> is None and the start of the list is lost. Walk with a second name." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: NODE_CLASS + `
          a, b, c = Node(1), Node(2), Node(3)
          a.next = b
          b.next = c
          print(a.next.next.data)`, answer: "3",
        hint: "Follow the arrows: <code>a.next</code> is b. What is <code>b.next</code>?", explain: "<code>a.next</code> is b, <code>a.next.next</code> is c, and c's data is 3." },
      { type: "mc", q: "You need the 500th item of a linked list with 1,000 nodes. How much work?", options: ["O(1): jump straight there", "O(n): hop from the head, about 500 hops", "O(log n)", "O(n²)"], answer: 1,
        hint: "A box only knows where the <b>next</b> box is.", explain: "There is no index to jump with. You must hop from the head one box at a time, so the work grows with n." },
      { type: "bug", q: "This should insert 10 after <code>current</code>. Click the line that is in the wrong place.", code: `
          new_node = Node(10)
          current.next = new_node
          new_node.next = current.next`,
        bugs: [2], notes: { 2: "this must come <b>after</b> line 3: it overwrites the only arrow to the rest of the list" },
        fixed: `
          new_node = Node(10)
          new_node.next = current.next     # first link the new box
          current.next = new_node          # then cut over`,
        hint: "After line 2 runs, what does <code>current.next</code> point at?", explain: "Swap lines 2 and 3. Then the new node first copies the old arrow, and only then does <code>current</code> point at it." },
      { type: "predict", q: "What does this print?", code: NODE_CLASS + `
          node1, node2, node3 = Node(3), Node(5), Node(13)
          node1.next = node2
          node2.next = node3

          node1.next = node1.next.next

          current = node1
          while current is not None:
              print(current.data, end=" ")
              current = current.next`, answer: "3 13",
        hint: "<code>node1.next.next</code> is the 13 box. What does node1 point at after that line?", explain: "The line deletes the 5: node1 now points straight at 13. The walk prints 3, then 13." },
      { type: "write", q: "Write <code>count_nodes(head)</code>. It <b>returns</b> how many boxes the chain has (0 if <code>head</code> is None).",
        starter: NODE_CLASS + `
          def count_nodes(head):
              # walk with a current pointer and count
              pass`,
        test: `
          a, b, c = Node(3), Node(5), Node(13)
          a.next, b.next = b, c
          assert count_nodes(a) == 3, "count_nodes(3 -> 5 -> 13) should be 3, got " + repr(count_nodes(a))
          assert count_nodes(c) == 1, "a single box should give 1"
          assert count_nodes(None) == 0, "an empty chain (None) should give 0"`,
        solution: `
          def count_nodes(head):
              count = 0
              current = head                   # start at the head
              while current is not None:       # until we fall off the end
                  count += 1
                  current = current.next       # hop
              return count                     # after the loop`,
        hint: "Same loop as printing, but add 1 instead of printing. Return after the loop.",
        explain: "It is the traversal pattern with a counter. When <code>head</code> is None, the loop never runs and 0 comes back." },
    ],
  };

  /* ================================================================
     TOPIC 10b: Stacks & queues
     ================================================================ */
  function stackQueueWidget(el) {
    let stack = ["A", "B"], queue = ["A", "B", "C", "D"], nextS = 2, nextQ = 4, listMode = false, moved = 0;
    const L = i => String.fromCharCode(65 + (i % 26));
    const sPic = h("div", { class: "alg-stack", role: "img", "aria-label": "stack, top at the top" });
    const sLog = h("pre", { class: "st-out alg-log" });
    const qPic = h("div");
    const qLog = h("pre", { class: "st-out alg-log" });
    const qNote = h("p", { class: "small", style: "margin:6px 0 0", "aria-live": "polite" });
    const sLines = ["stack = ['A', 'B']"], qLines = ["queue = deque(['A', 'B', 'C', 'D'])"];
    const logTo = (arr, box, line) => { arr.push(line); if (arr.length > 7) arr.shift(); box.textContent = arr.join("\n"); };
    function drawS(flash) {
      const top = stack.length - 1;
      sPic.replaceChildren(...(stack.length ? stack.map((v, i) => h("div", { class: "alg-plate" + (i === top ? " top" : "") + (flash && i === top ? " mk-done" : "") }, v, i === top ? h("span", { class: "alg-tag" }, "← top") : null)) : [h("p", { class: "novars" }, "empty")]));
    }
    function drawQ(marks) {
      const ptrs = {};
      if (queue.length) { ptrs[0] = queue.length === 1 ? "front/back" : "front"; if (queue.length > 1) ptrs[queue.length - 1] = "back"; }
      qPic.replaceChildren(D.array(queue, { name: "queue", quote: true, ptrs, marks: marks || {}, emptyText: "empty", index: false }));
    }
    const sBtns = row(
      btn("push", () => { const v = L(nextS++); stack.push(v); logTo(sLines, sLog, `stack.append('${v}')`); drawS(true); }),
      btn("pop", () => {
        if (!stack.length) { logTo(sLines, sLog, "stack.pop()   # IndexError: pop from empty list"); return; }
        const v = stack.pop(); logTo(sLines, sLog, `stack.pop()   # gives '${v}' (the newest)`); drawS();
      }),
      btn("peek", () => logTo(sLines, sLog, stack.length ? `stack[-1]     # '${stack[stack.length - 1]}' (stays)` : "stack[-1]     # IndexError: list index out of range")),
      btn("print", () => logTo(sLines, sLog, "print(stack)  # " + pyrepr(stack))));
    const mode = seg(["deque + popleft()", "list + pop(0)"], i => {
      listMode = i === 1; moved = 0;
      queue = ["A", "B", "C", "D"]; nextQ = 4;
      qLines.length = 0;
      logTo(qLines, qLog, listMode ? "queue = ['A', 'B', 'C', 'D']" : "queue = deque(['A', 'B', 'C', 'D'])");
      qNote.textContent = ""; drawQ();
    }, 0, "Queue made with");
    const qBtns = row(
      btn("enqueue", () => { const v = L(nextQ++); queue.push(v); logTo(qLines, qLog, `queue.append('${v}')`); drawQ({ [queue.length - 1]: "done" }); qNote.textContent = "Joins at the back."; }),
      btn("dequeue", () => {
        if (!queue.length) { logTo(qLines, qLog, listMode ? "queue.pop(0)     # IndexError: pop from empty list" : "queue.popleft()  # IndexError: pop from an empty deque"); return; }
        const v = queue.shift();
        logTo(qLines, qLog, (listMode ? "queue.pop(0)     " : "queue.popleft()  ") + `# gives '${v}' (the oldest)`);
        if (listMode) {
          moved += queue.length;
          const m = {}; queue.forEach((_, i) => (m[i] = "cmp"));
          drawQ(m);
          qNote.innerHTML = `A list keeps its items side by side, so the other <b>${queue.length}</b> item${queue.length === 1 ? "" : "s"} each moved one place left (orange). Moves so far: <b>${moved}</b>. That is O(n) per dequeue.`;
        } else { drawQ(); qNote.innerHTML = "A deque just lets go of the front item. Nothing moves: O(1)."; }
      }),
      btn("print", () => logTo(qLines, qLog, "print(queue)     # " + (listMode ? pyrepr(queue) : "deque(" + pyrepr(queue) + ")"))));
    el.append(h("div", { class: "alg-two" },
      h("div", null, eyebrow("Stack (LIFO): a pile of plates"), sBtns, h("div", { style: "margin-top:10px" }, sPic), eyebrow("Python", "margin-top:10px"), sLog),
      h("div", null, eyebrow("Queue (FIFO): a line at the counter"), mode.el, h("div", { style: "margin-top:8px" }, qBtns), h("div", { style: "margin-top:10px" }, qPic), qNote, eyebrow("Python", "margin-top:10px"), qLog)));
    sLog.textContent = sLines.join("\n"); qLog.textContent = qLines.join("\n");
    drawS(); drawQ();
  }

  // stepper: the Ex7 my_linked_list cells
  const sqSteps = (() => {
    const S = [{ line: 0, now: "A stack and a queue, made from your Ex7 cells.", st: [], q: null, vars: {} }];
    const st = [], q = [];
    S.push({ line: 1, now: "An empty list will be the stack.", st: [], q: null, vars: { stack: "[]" } });
    ["A", "B", "C"].forEach((v, i) => { st.push(v); S.push({ line: 2 + i, now: `Push '${v}' on <b>top</b> (the end of the list).`, st: st.slice(), q: null, vars: { stack: pyrepr(st) } }); });
    st.pop();
    S.push({ line: 5, now: "<code>pop()</code> takes the <b>last one in</b>: 'C'. Last in, first out.", print: "C", st: st.slice(), q: null, vars: { stack: pyrepr(st) }, gone: "C" });
    S.push({ line: 6, now: "A and B are still there.", print: "['A', 'B']", st: st.slice(), q: null });
    S.push({ line: 8, now: "Import <code>deque</code> (a double-ended queue).", st: st.slice(), q: null });
    S.push({ line: 9, now: "An empty queue.", st: st.slice(), q: [], vars: { stack: pyrepr(st), queue: "deque([])" } });
    ["A", "B", "C"].forEach((v, i) => { q.push(v); S.push({ line: 10 + i, now: `'${v}' joins at the <b>back</b>.`, st: st.slice(), q: q.slice(), vars: { stack: pyrepr(st), queue: "deque(" + pyrepr(q) + ")" } }); });
    q.shift();
    S.push({ line: 13, now: "<code>popleft()</code> takes the <b>first one in</b>: 'A'. First in, first out.", print: "A", st: st.slice(), q: q.slice(), vars: { stack: pyrepr(st), queue: "deque(" + pyrepr(q) + ")" }, goneQ: "A" });
    S.push({ line: 14, now: "B and C are still waiting.", print: "deque(['B', 'C'])", st: st.slice(), q: q.slice() });
    return S;
  })();
  function sqVisual(el, st) {
    const sp = {}; if (st.st.length) sp[st.st.length - 1] = "top";
    el.append(D.array(st.st, { name: "stack", quote: true, ptrs: sp, index: false }));
    if (st.gone) el.append(h("p", { class: "small", style: "margin:4px 0 8px" }, "popped: '" + st.gone + "'"));
    if (st.q) {
      const qp = {}; if (st.q.length) { qp[0] = "front"; if (st.q.length > 1) qp[st.q.length - 1] = "back"; }
      el.append(h("div", { style: "margin-top:10px" }, D.array(st.q, { name: "queue", quote: true, ptrs: qp, index: false })));
      if (st.goneQ) el.append(h("p", { class: "small", style: "margin:4px 0 0" }, "left the queue: '" + st.goneQ + "'"));
    }
  }

  const stacksQueues = {
    id: "stacks-queues",
    title: "Stacks & queues",
    summary: "A stack takes from the top (last in, first out). A queue takes from the front (first in, first out). DFS uses a stack, BFS uses a queue.",
    exam: ["Q3 queue", "Q6 DFS stack"],
    sources: "Ex7",
    blocks: [
      { type: "h", text: "Two ways to take turns" },
      { type: "table", head: ["", "Stack (LIFO)", "Queue (FIFO)"], rows: [
        ["Picture", "a pile of plates", "a line at a counter"],
        ["Add", "push: <code>stack.append(x)</code>", "enqueue: <code>queue.append(x)</code>"],
        ["Take", "pop: <code>stack.pop()</code> gives the <b>newest</b>", "dequeue: <code>queue.popleft()</code> gives the <b>oldest</b>"],
        ["Look without taking", "peek: <code>stack[-1]</code>", "peek: <code>queue[0]</code>"],
        ["Tiny example", "push A, B, C → pop gives <b>C</b>", "add A, B, C → popleft gives <b>A</b>"],
        ["Python type", "a plain list", "<code>collections.deque</code>"],
        ["Used in", "undo, the call stack, <b>DFS</b>", "printer jobs, waiting lists, <b>BFS</b>"],
      ] },
      { type: "widget", title: "Push, pop, enqueue, dequeue", intro: "Press the buttons. The Python line for each press appears below. Try dequeue in both queue modes and watch the move counter.", render: stackQueueWidget },
      {
        type: "stepper",
        title: "Your Ex7 cells, step by step",
        code: `
          stack = []
          stack.append("A")
          stack.append("B")
          stack.append("C")
          print(stack.pop())       # the newest
          print(stack)

          from collections import deque
          queue = deque()
          queue.append("A")        # join at the back
          queue.append("B")
          queue.append("C")
          print(queue.popleft())   # the oldest
          print(queue)`,
        what: { 2: "push", 5: "pop() with no index takes the LAST item.", 10: "enqueue at the back", 13: "dequeue from the front" },
        steps: sqSteps,
        visualTitle: "Stack and queue",
        visual: sqVisual,
      },
      { type: "callout", kind: "warn", title: "Why not list.pop(0)?", html: "<p>It works, but a list has to slide every other item one place left. 1,000 people in the line → 999 moves for every dequeue. <code>deque.popleft()</code> moves nothing: O(1).</p>" },
      { type: "callout", kind: "exam", title: "Exam Q3 and Q6", html: "<p><b>Q3</b> kept a <code>low_stock_queue</code>: when an item ran out, its index joined the back with <code>low_stock_queue.append(item_index)</code>. <b>Q6</b> (DFS) can be written with a stack: <code>stack.append(...)</code> and <code>stack.pop()</code>.</p>" },
      { type: "h", text: "Built from linked lists", sub: "The Ex7 demo builds both on Node boxes." },
      { type: "table", head: ["", "Stack on a linked list", "Queue on a linked list"], rows: [
        ["Keeps", "<code>self.head</code> (the top)", "<code>self.front</code> and <code>self.rear</code>"],
        ["Add", "new box points at the old head; head = new box", "old rear points at the new box; rear = new box"],
        ["Take", "head = head.next", "front = front.next"],
        ["Cost", "O(1)", "O(1)"],
      ] },
      {
        type: "tryit",
        title: "A Stack class (like the Ex7 demo, on a list)",
        task: "Run it. Then add a method <code>size()</code>, and try popping from an empty stack.",
        code: `
          class Stack:
              def __init__(self):
                  self.items = []              # top = end of the list

              def push(self, value):
                  self.items.append(value)

              def pop(self):
                  if self.is_empty():
                      return "Stack is empty"
                  return self.items.pop()      # newest first

              def peek(self):
                  return self.items[-1]        # look, don't take

              def is_empty(self):
                  return len(self.items) == 0

          s = Stack()
          s.push("A")
          s.push("B")
          s.push("C")
          print("Pop:", s.pop())
          print("Peek:", s.peek())
          print("Empty?", s.is_empty())

          from collections import deque
          q = deque(["A", "B", "C"])
          q.append("D")                        # join at the back
          print("Dequeue:", q.popleft())       # leave at the front
          print(q)`,
      },
      { type: "mistakes", items: [
        { title: "Using a list's <code>pop(0)</code> as a queue", wrong: "queue = []\nqueue.pop(0)", right: "queue = deque()\nqueue.popleft()", why: "Same result, but <code>pop(0)</code> moves every other item: O(n). <code>popleft()</code> is O(1)." },
        { title: "<code>deque.pop()</code> for a queue", wrong: "queue.pop()       # 'C'", right: "queue.popleft()   # 'A'", why: "<code>pop()</code> takes from the right end: that is stack behaviour." },
        { title: "Peeking at the wrong end of a stack", wrong: "stack[0]", right: "stack[-1]", why: "The top of a list-stack is the <b>end</b>. <code>stack[0]</code> is the bottom plate." },
        { title: "Popping an empty stack", wrong: "stack = []\nstack.pop()", right: "if stack:\n    stack.pop()", why: "<code>IndexError: pop from empty list</code>. Check first, or loop with <code>while stack:</code>." },
        { title: "Forgetting the brackets", wrong: "x = queue.popleft", right: "x = queue.popleft()", why: "Without <code>()</code> you get the method itself, and nothing leaves the queue." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: `
          stack = []
          stack.append(1)
          stack.append(2)
          stack.append(3)
          stack.pop()
          stack.append(4)
          print(stack.pop(), stack)`, answer: "4 [1, 2]",
        hint: "Draw the pile after each line. The pop that is not printed throws away 3.", explain: "After the pushes: [1, 2, 3]. pop → 3 is gone. Push 4: [1, 2, 4]. The last pop gives 4 and leaves [1, 2]." },
      { type: "predict", q: "What does this print?", code: `
          from collections import deque
          q = deque()
          q.append("x")
          q.append("y")
          q.append("z")
          q.popleft()
          print(q.popleft())`, answer: ["y", "'y'"],
        hint: "First in, first out. Which one went first?", explain: "x leaves first (not printed), then y leaves and is printed." },
      { type: "mc", q: "BFS visits a graph level by level. Which structure holds the nodes waiting to be visited?", options: ["A stack (list with <code>append</code>/<code>pop</code>)", "A queue (<code>deque</code> with <code>append</code>/<code>popleft</code>)", "A dictionary", "A set"], answer: 1,
        hint: "Level by level means: the ones found first are visited first.", explain: "BFS = queue (FIFO). DFS = stack (LIFO), or recursion, which uses Python's own call stack." },
      { type: "mc", q: "A queue has 10,000 people. Each dequeue is done with <code>list.pop(0)</code>. Roughly how many item moves does ONE dequeue cost?", options: ["1", "about 14", "about 10,000", "about 100,000,000"], answer: 2,
        hint: "Everyone behind the front person shifts one place.", explain: "The other 9,999 items all move one place left: O(n). <code>deque.popleft()</code> moves none." },
      { type: "write", q: "Exam Q3 style. Write <code>process_inventory(stock, item_index, min_stock, low_stock_queue)</code>. If <code>stock[item_index]</code> is more than 0, take one away and <b>return</b> <code>True</code>. Otherwise add <code>item_index</code> to the back of <code>low_stock_queue</code> and return <code>False</code>.",
        starter: `
          def process_inventory(stock, item_index, min_stock, low_stock_queue):
              pass

          stock = [3, 0, 5]
          low = []
          print(process_inventory(stock, 0, 1, low), stock)
          print(process_inventory(stock, 1, 1, low), low)`,
        test: `
          s = [3, 0, 5]; lq = []
          assert process_inventory(s, 0, 1, lq) is True, "item 0 has stock: should return True"
          assert s == [2, 0, 5], "stock[0] should go from 3 to 2, got " + repr(s)
          assert process_inventory(s, 1, 1, lq) is False, "item 1 has 0: should return False"
          assert lq == [1], "index 1 should be added to the queue, got " + repr(lq)
          assert s == [2, 0, 5], "stock must not change when it is 0"`,
        solution: `
          def process_inventory(stock, item_index, min_stock, low_stock_queue):
              if stock[item_index] > 0:                 # in stock
                  stock[item_index] -= 1                # sell one
                  return True
              low_stock_queue.append(item_index)        # enqueue at the back
              return False`,
        hint: "An <code>if</code> on <code>stock[item_index] &gt; 0</code>. Enqueue with <code>append</code>.",
        explain: "The queue is just a list you <code>append</code> to. <code>min_stock</code> is never needed: the exam spec was loose, so say so in a Markdown note." },
    ],
  };

  /* ================================================================
     TOPIC 11a: Recursion
     ================================================================ */

  // --- the chain picture for factorial / balance_after: one box per call ---
  function chainVisual(el, st) {
    const lv = st.levels || [];
    if (!lv.length) { el.appendChild(h("p", { class: "novars" }, "No calls yet.")); return; }
    const rowH = 62, W = 380, H = lv.length * rowH + 6;
    const S = D.svg({ w: W, h: H, label: "one box per call, the newest at the bottom" });
    lv.forEach((c, i) => {
      const y = 4 + i * rowH, x = 8 + i * 14;
      const tone = c.state === "run" ? "accent" : c.state === "done" ? "done" : c.state === "err" ? "swap" : c.state === "wait" ? "cmp" : null;
      S.box(x, y, 236, 46, { text: c.call, sub: c.sub, tone, faded: c.state === "gone" });
      if (i > 0) S.arrow(x - 4, y - 16, x + 10, y - 2, { tone: "muted" });
      if (c.ret != null) S.text(x + 246, y + 23, "→ " + c.ret, { anchor: "start", cls: "alg-ret" });
    });
    el.appendChild(S.el);
  }

  function factSteps() {
    const G = { name: "global", vars: {} };
    const f = (n, note) => ({ name: `factorial(${n})`, vars: { n: String(n) }, note });
    const W = (n, sub) => ({ call: `factorial(${n})`, sub, state: "wait" });
    return [
      { line: 0, now: "Nothing has run yet. Python reads the <code>def</code> and remembers the function.", frames: [G], levels: [] },
      { line: 6, now: "<code>factorial(3)</code> is called. Python makes a new <b>frame</b> with its own <code>n = 3</code>.", frames: [G, f(3)], levels: [{ call: "factorial(3)", sub: "n = 3", state: "run" }] },
      { line: 2, now: "Is 3 equal to 0 or 1? <b>No</b>. Not the base case.", levels: [{ call: "factorial(3)", sub: "n = 3", state: "run" }] },
      { line: 4, now: "It needs <code>3 * factorial(2)</code>. Python can't multiply yet, so factorial(3) <b>pauses</b> and calls factorial(2).", frames: [G, f(3, "waiting: 3 * ?"), f(2)],
        levels: [W(3, "3 * factorial(2) = 3 * ?"), { call: "factorial(2)", sub: "n = 2", state: "run" }] },
      { line: 2, now: "A new frame: here <code>n</code> is 2. Is 2 equal to 0 or 1? <b>No</b>.", levels: [W(3, "3 * ?"), { call: "factorial(2)", sub: "n = 2", state: "run" }] },
      { line: 4, now: "It needs <code>2 * factorial(1)</code>. factorial(2) pauses too. Now <b>three</b> frames are open, each with its own n.", frames: [G, f(3, "waiting: 3 * ?"), f(2, "waiting: 2 * ?"), f(1)],
        levels: [W(3, "3 * ?"), W(2, "2 * factorial(1) = 2 * ?"), { call: "factorial(1)", sub: "n = 1", state: "run" }] },
      { line: 2, now: "Is 1 equal to 0 or 1? <b>Yes!</b> The <b>base case</b>: the answer is known without calling again.", levels: [W(3, "3 * ?"), W(2, "2 * ?"), { call: "factorial(1)", sub: "base case", state: "run" }] },
      { line: 3, now: "Give back <b>1</b>. This is where the calls stop going down and start coming back up.", frames: [G, f(3, "waiting: 3 * ?"), f(2, "waiting: 2 * ?"), f(1, "returning 1")],
        levels: [W(3, "3 * ?"), W(2, "2 * ?"), { call: "factorial(1)", sub: "base case", state: "done", ret: 1 }] },
      { line: 4, now: "factorial(1)'s frame is gone. Back in factorial(2): the ? is now 1, so <code>2 * 1</code> = <b>2</b>. Give back 2.", frames: [G, f(3, "waiting: 3 * ?"), f(2, "returning 2")],
        levels: [W(3, "3 * ?"), { call: "factorial(2)", sub: "2 * 1 = 2", state: "done", ret: 2 }, { call: "factorial(1)", sub: "finished", state: "gone", ret: 1 }] },
      { line: 4, now: "Back in factorial(3): <code>3 * 2</code> = <b>6</b>. Give back 6.", frames: [G, f(3, "returning 6")],
        levels: [{ call: "factorial(3)", sub: "3 * 2 = 6", state: "done", ret: 6 }, { call: "factorial(2)", sub: "finished", state: "gone", ret: 2 }, { call: "factorial(1)", sub: "finished", state: "gone", ret: 1 }] },
      { line: 6, now: "All frames are gone. <code>print</code> shows 6.", frames: [G], print: "6",
        levels: [{ call: "factorial(3)", sub: "finished", state: "gone", ret: 6 }, { call: "factorial(2)", sub: "finished", state: "gone", ret: 2 }, { call: "factorial(1)", sub: "finished", state: "gone", ret: 1 }] },
    ];
  }

  function balanceSteps(bad) {
    const G = { name: "global", vars: {} };
    const S = [{ line: 0, now: bad ? "Same function. This time we call it with <code>years = -1</code>." : "Nothing has run yet.", frames: [G], levels: [] }];
    const fr = [G], lv = [];
    const copyF = () => fr.map(x => Object.assign({}, x));
    const copyL = () => lv.map(c => Object.assign({}, c));
    if (!bad) {
      const vals = ["100", "105.0", "110.25", "115.7625"];
      for (let k = 0; k <= 3; k++) {
        const yrs = 3 - k;
        fr.forEach((x, i) => { if (i > 0) x.note = "waiting"; });
        fr.push({ name: `balance_after(${vals[k]}, ${yrs})`, vars: { balance: vals[k], years: String(yrs) } });
        lv.forEach(c => (c.state = "wait"));
        lv.push({ call: `balance_after(${vals[k]}, ${yrs})`, sub: yrs ? "not done yet" : "years == 0", state: "run" });
        S.push({ line: k === 0 ? 6 : 4, now: k === 0 ? "Call with 100 and 3 years. A new frame." : `Call again with <b>one year less</b>, and the new balance ${vals[k - 1]} × 1.05 = <b>${vals[k]}</b>.`, frames: copyF(), levels: copyL() });
        S.push({ line: 2, now: `Is years (${yrs}) == 0? ${yrs ? "<b>No.</b>" : "<b>Yes: the base case.</b>"}`, levels: copyL() });
      }
      const top = copyF(); top[4].note = "returning 115.7625";
      const L1 = copyL(); L1[3] = Object.assign(L1[3], { state: "done", ret: "115.7625" });
      S.push({ line: 3, now: "Give back the balance, <b>115.7625</b>. Now every waiting frame just hands the same value up.", frames: top, levels: L1 });
      for (let k = 2; k >= 0; k--) {
        const F = copyF().slice(0, k + 2); F[k + 1].note = "returning 115.7625";
        S.push({ line: 4, now: `balance_after(${vals[k]}, ${3 - k}) gets 115.7625 back and returns it straight away.`, frames: F,
          levels: lv.map((c, i) => Object.assign({}, c, i > k ? { state: "gone", ret: "115.7625" } : i === k ? { state: "done", ret: "115.7625" } : {})) });
      }
      S.push({ line: 6, now: "Print it.", frames: [G], print: "115.7625", levels: lv.map(c => Object.assign({}, c, { state: "gone", ret: "115.7625" })) });
      return S;
    }
    for (let k = 0; k < 4; k++) {
      const yrs = -1 - k;
      fr.forEach((x, i) => { if (i > 0) x.note = "waiting"; });
      fr.push({ name: `balance_after(…, ${yrs})`, vars: { years: String(yrs) } });
      lv.forEach(c => (c.state = "wait"));
      lv.push({ call: `balance_after(…, ${yrs})`, sub: `${yrs} == 0? No`, state: "run" });
      S.push({ line: k === 0 ? 6 : 4, now: k === 0 ? "Call with years = −1. Is −1 == 0? No." : `Call again with years = ${yrs}. Is ${yrs} == 0? <b>No.</b> It went <b>past</b> 0 and will never land on it.`, frames: copyF(), levels: copyL() });
    }
    lv.forEach(c => (c.state = "wait"));
    lv.push({ call: "… about 1000 frames …", sub: "the stack is full", state: "err" });
    S.push({ line: 4, now: "This goes on: −5, −6, −7 … Python allows about 1000 frames, then it stops the program.", levels: copyL() });
    S.push({ line: 4, now: "<b>RecursionError</b>. Fix: <code>if years &lt;= 0:</code>, or <code>raise ValueError</code> for a negative input (NB §24.1).", print: "RecursionError: maximum recursion depth exceeded", levels: copyL() });
    return S;
  }

  // --- widget: fibonacci call tree, plain vs memo ---
  function fibBuild(n, memo) {
    const nodes = [], events = [];
    const known = { 0: 0, 1: 1 };
    function call(k, parent, depth) {
      const nd = { id: nodes.length, k, parent, depth, kids: [] };
      nodes.push(nd);
      if (parent != null) nodes[parent].kids.push(nd.id);
      events.push({ t: "in", id: nd.id });
      let v;
      if (memo && k in known) { nd.kind = "lookup"; v = known[k]; }
      else if (!memo && k <= 1) { nd.kind = "base"; v = k; }
      else { nd.kind = "call"; v = call(k - 1, nd.id, depth + 1) + call(k - 2, nd.id, depth + 1); if (memo) known[k] = v; }
      nd.value = v;
      events.push({ t: "out", id: nd.id });
      return v;
    }
    call(n, null, 0);
    // layout: leaves left to right, parents centred over their children
    let leaf = 0;
    const place = id => { const nd = nodes[id]; if (!nd.kids.length) nd.x = leaf++; else { nd.kids.forEach(place); nd.x = nd.kids.reduce((s, c) => s + nodes[c].x, 0) / nd.kids.length; } };
    place(0);
    return { nodes, events, leaves: leaf, depth: Math.max(...nodes.map(d => d.depth)) };
  }
  function fibWidget(el, api) {
    let n = 5, memo = false, T = null;
    const pic = h("div", { class: "alg-scroll" });
    const now = h("p", { class: "alg-now", "aria-live": "polite" });
    const stackBox = h("div"), knownBox = h("div"), countBox = h("p", { class: "small", style: "margin:6px 0 0" });
    const codeBox = h("div");
    const ctl = stepCtl(render, { ms: 650 });
    const nSeg = seg(["n = 3", "n = 4", "n = 5", "n = 6"], i => { n = i + 3; build(); }, 2, "Which n");
    const mSeg = seg(["Plain recursion", "With a memo (known)"], i => { memo = i === 1; build(); }, 0, "Memo on or off");
    api.onCleanup(ctl.stop);
    function build() {
      T = fibBuild(n, memo);
      ctl.setLength(T.events.length + 1); ctl.go(0);
      codeBox.replaceChildren(ui.code({ code: memo ? `
        known = {0: 0, 1: 1}                     # the memo
        def fibonacci_memo(n):
            if n in known:                       # seen before? look it up
                return known[n]
            known[n] = fibonacci_memo(n - 1) + fibonacci_memo(n - 2)
            return known[n]` : `
        def fibonacci(n):
            if n == 0:                           # base case 1
                return 0
            if n == 1:                           # base case 2
                return 1
            return fibonacci(n - 1) + fibonacci(n - 2)` }));
    }
    function render(k) {
      const seen = new Set(), done = new Set(), stack = [];
      let cur = null;
      for (let i = 0; i < k; i++) {
        const e = T.events[i];
        if (e.t === "in") { seen.add(e.id); stack.push(e.id); } else { done.add(e.id); stack.pop(); }
        cur = e;
      }
      const top = stack[stack.length - 1];
      const fn = memo ? "fibonacci_memo" : "fibonacci";
      const nodes = T.nodes.map(d => {
        let tone = null, faded = false, dashed = false, sub = null;
        if (!seen.has(d.id)) { faded = true; dashed = true; }
        else if (done.has(d.id)) { tone = d.kind === "lookup" ? "min" : "done"; sub = "= " + d.value; }
        else tone = d.id === top ? "accent" : "cmp";
        return { id: "f" + d.id, x: 26 + d.x * 50, y: 26 + d.depth * 62, label: "f(" + d.k + ")", tone, faded, dashed, sub };
      });
      const edges = T.nodes.filter(d => d.parent != null).map(d => ({ from: "f" + d.parent, to: "f" + d.id, faded: !seen.has(d.id) }));
      pic.replaceChildren(D.graph({ w: 52 + (T.leaves - 1) * 50, h: 70 + T.depth * 62, nodes, edges, r: 21, label: "call tree of " + fn + "(" + n + ")" }));
      if (!cur) now.innerHTML = `Press <b>Step</b> to call <code>${fn}(${n})</code>. Each circle will be one call. f(k) is short for ${fn}(k).`;
      else {
        const d = T.nodes[cur.id], par = d.parent != null ? T.nodes[d.parent] : null;
        if (cur.t === "in") {
          if (d.kind === "base") now.innerHTML = `Call f(${d.k}). It is a <b>base case</b>: the answer is ${d.value}, no more calls.`;
          else if (d.kind === "lookup") now.innerHTML = `Call f(${d.k}). ${d.k} is <b>already in known</b>: just look it up (${d.value}). No calls below it.`;
          else now.innerHTML = `Call f(${d.k}). Not a base case, so it first calls f(${d.k - 1}), and later f(${d.k - 2}).`;
        } else if (d.kind === "call") now.innerHTML = `f(${d.k}) adds its two answers: ${T.nodes[d.kids[0]].value} + ${T.nodes[d.kids[1]].value} = <b>${d.value}</b>` + (memo ? `, <b>stores</b> it in known,` : "") + (par ? ` and gives it back to f(${par.k}).` : ". That is the final answer.");
        else now.innerHTML = `f(${d.k}) gives back <b>${d.value}</b>` + (par ? ` to f(${par.k}).` : ".");
      }
      stackBox.replaceChildren(D.frames(stack.map((id, i) => ({ name: fn + "(" + T.nodes[id].k + ")", note: i === stack.length - 1 ? "running now" : "waiting for an answer" }))));
      const rep = {};
      T.nodes.forEach(d => { if (seen.has(d.id) && d.kind === "call") rep[d.k] = (rep[d.k] || 0) + 1; });
      const repTxt = Object.keys(rep).filter(x => rep[x] > 1).sort((a, b) => b - a).map(x => `f(${x}) ×${rep[x]}`).join(", ");
      countBox.innerHTML = `Calls so far: <b>${seen.size}</b> of ${T.nodes.length}.` + (repTxt ? ` Worked out more than once: ${repTxt}.` : "");
      if (memo) {
        const kn = { 0: 0, 1: 1 };
        for (let i = 0; i < k; i++) { const e = T.events[i], d = T.nodes[e.id]; if (e.t === "out" && d.kind === "call") kn[d.k] = d.value; }
        knownBox.replaceChildren(eyebrow("known (the memo)", "margin-top:10px"), h("code", null, "{" + Object.keys(kn).map(x => x + ": " + kn[x]).join(", ") + "}"));
      } else knownBox.replaceChildren();
    }
    el.append(row(nSeg.el, mSeg.el), h("div", { style: "margin-top:10px" }, codeBox), h("div", { style: "margin-top:10px" }, ctl.el), now,
      h("div", { class: "alg-two" }, h("div", null, pic, D.legend([["held", "running"], ["cmp", "waiting"], ["done", "returned"], ["min", "looked up in known"]])), h("div", null, eyebrow("Call stack (newest on top)"), stackBox, countBox, knownBox)));
    build();
  }

  // --- Tower of Hanoi: stepper with the call stack, and a play-it-yourself widget ---
  const DISC_TONE = { 1: "accent", 2: "cmp", 3: "done", 4: "min" };
  function hanoiPic(pegs, n, op) {
    op = op || {};
    const W = 420, H = 60 + n * 20 + 34;
    const S = D.svg({ w: W, h: H, label: "three pegs with discs" });
    const base = H - 26, px = [70, 210, 350];
    S.line(10, base, W - 10, base, { tone: "muted" });
    px.forEach((x, i) => {
      S.line(x, base, x, base - n * 20 - 14, { tone: "muted" });
      S.text(x, base + 14, "peg " + i, { muted: true });
      pegs[i].forEach((d, j) => {
        const w = 34 + d * 24;
        S.box(x - w / 2, base - (j + 1) * 20, w, 18, { text: String(d), tone: DISC_TONE[d], rx: 6 });
      });
      if (op.pick === i && pegs[i].length) S.text(x, base - n * 20 - 26, "picked up ▲", { ui: true, cls: "alg-ptr" });
    });
    if (op.from != null) {
      const a = px[op.from], b = px[op.to];
      S.arrow(a, base - n * 20 - 20, b, base - n * 20 - 20, { tone: "cmp", bend: a < b ? -18 : 18 });
    }
    return S.el;
  }
  function hanoiSteps(n) {
    const S = [], pegs = [Array.from({ length: n }, (_, i) => n - i), [], []];
    const frames = [{ name: "global", vars: { "len(moves)": "0" } }];
    let moves = 0;
    const fr = () => frames.map(f => ({ name: f.name, vars: Object.assign({}, f.vars), note: f.note }));
    const add = o => S.push(Object.assign({ frames: fr(), pegs: pegs.map(p => p.slice()), n }, o));
    const s = k => (k === 1 ? "" : "s");
    add({ line: 8, now: `An empty list for the moves. All ${n} disc${s(n)} start on peg 0. Goal: peg 2.` });
    function rec(k, a, t, x, depth) {
      if (frames.length > 1) frames[frames.length - 1].note = "waiting";
      frames.push({ name: `solve_hanoi(${k}, ${a}, ${t}, ${x})`, vars: { n: String(k), source: String(a), target: String(t), auxiliary: String(x) } });
      if (k === 0) {
        frames[frames.length - 1].note = "base case";
        add({ line: 3, now: `solve_hanoi(0, …): n is 0, the <b>base case</b>. Nothing to move, so it returns at once.` });
        frames.pop(); frames[frames.length - 1].note = "running now";
        return;
      }
      frames[frames.length - 1].note = "running now";
      add({ line: 4, now: (depth === 0 ? `Move ${k} disc${s(k)} from peg ${a} to peg ${t}. ` : `New call: move ${k} disc${s(k)} from ${a} to ${t}. n is ${k}, not 0. `) + `Step 1: first move the <b>${k - 1}</b> smaller disc${s(k - 1)} from ${a} out of the way, to peg ${x}. Same problem, one disc smaller.` });
      rec(k - 1, a, x, t, depth + 1);
      pegs[t].push(pegs[a].pop()); moves++;
      frames[0].vars["len(moves)"] = String(moves);
      add({ line: 5, now: `Step 2: the way is clear. Move <b>disc ${k}</b> from peg ${a} to peg ${t}. That is move ${moves}.`, from: a, to: t });
      add({ line: 6, now: `Step 3: put the ${k - 1} smaller disc${s(k - 1)} from peg ${x} back on top of disc ${k}, at peg ${t}.` });
      rec(k - 1, x, t, a, depth + 1);
      frames[frames.length - 1].note = "done, returning None";
      add({ line: 6, now: `solve_hanoi(${k}, ${a}, ${t}, ${x}) is finished: ${k} disc${s(k)} now on peg ${t}. Its frame is removed.` });
      frames.pop();
      if (frames.length > 1) frames[frames.length - 1].note = "running now";
    }
    rec(n, 0, 2, 1, 0);
    add({ line: 10, now: `Done in <b>${moves}</b> moves. That is 2<sup>${n}</sup> − 1 = ${2 ** n - 1}, the fewest possible.`, print: "Total moves: " + moves });
    return S;
  }
  const HANOI_CODE = `
    def solve_hanoi(n, source, target, auxiliary, moves):
        if n == 0:                                                 # base case: no disc
            return
        solve_hanoi(n - 1, source, auxiliary, target, moves)       # 1. smaller ones out of the way
        moves.append(f"move disk {n} from {source} to {target}")   # 2. move the biggest
        solve_hanoi(n - 1, auxiliary, target, source, moves)       # 3. smaller ones back on top

    moves = []
    solve_hanoi(NUM, 0, 2, 1, moves)
    print("Total moves:", len(moves))`;
  function hanoiWidget(el, api) {
    const box = h("div");
    const s = seg(["1 disc", "2 discs", "3 discs", "4 discs"], i => build(i + 1), 1, "Number of discs");
    function build(n) {
      box.replaceChildren(ui.stepper({
        title: `solve_hanoi(${n}, 0, 2, 1, moves)`,
        code: HANOI_CODE.replace("NUM", String(n)),
        what: { 2: "The base case: zero discs means there is nothing to do.", 4: "Recursive call 1. Note that target and auxiliary swap places.", 5: "The only line that actually moves a disc.", 6: "Recursive call 2. Now source and auxiliary swap." },
        steps: hanoiSteps(n),
        visualTitle: "The pegs (the arrow shows the move)",
        visual: (v, st) => v.appendChild(hanoiPic(st.pegs, st.n, { from: st.from, to: st.to })),
      }, api));
    }
    el.append(s.el, h("div", { style: "margin-top:12px" }, box));
    build(2);
  }
  function hanoiPlay(el) {
    let n = 3, pegs, pick = null, moves = 0;
    const pic = h("div"), msg = h("p", { class: "small", "aria-live": "polite", style: "margin:8px 0 0" });
    const s = seg(["3 discs", "4 discs"], i => { n = i + 3; reset(); }, 0, "Number of discs");
    const pegBtns = [0, 1, 2].map(i => btn("Peg " + i, () => click(i), "btn"));
    function reset() { pegs = [Array.from({ length: n }, (_, i) => n - i), [], []]; pick = null; moves = 0; msg.textContent = "Click a peg to pick up its top disc, then click where to put it."; draw(); }
    function click(i) {
      if (pick === null) {
        if (!pegs[i].length) { msg.textContent = "Peg " + i + " is empty."; return; }
        pick = i; msg.textContent = "Picked up disc " + pegs[i][pegs[i].length - 1] + ". Where to?";
      } else if (pick === i) { pick = null; msg.textContent = "Put back."; }
      else {
        const d = pegs[pick][pegs[pick].length - 1], top = pegs[i][pegs[i].length - 1];
        if (top !== undefined && top < d) { msg.textContent = `Not allowed: disc ${d} can't go on the smaller disc ${top}.`; pick = null; draw(); return; }
        pegs[i].push(pegs[pick].pop()); moves++; pick = null;
        const best = 2 ** n - 1;
        msg.innerHTML = pegs[2].length === n ? `<b>Solved in ${moves} moves ✓</b> The fewest possible is 2<sup>${n}</sup> − 1 = ${best}.` + (moves === best ? " Perfect!" : " Can you do it in fewer?") : `Moves: ${moves}. Tip: disc 1 moves every other turn.`;
      }
      draw();
    }
    function draw() { pic.replaceChildren(hanoiPic(pegs, n, { pick })); pegBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(pick === i))); }
    el.append(row(s.el, btn("⟲ Restart", reset)), h("div", { style: "margin-top:10px" }, pic), row(...pegBtns), msg);
    reset();
  }

  const recursion = {
    id: "recursion",
    title: "Recursion",
    summary: "A function that calls itself on a smaller problem, until it hits a base case. Each call gets its own frame on the call stack.",
    exam: ["Q6 recursive DFS"],
    sources: "NB §24; Ex7",
    blocks: [
      { type: "h", text: "Two parts, always", sub: "A base case that stops, and a recursive case that makes the problem smaller." },
      { type: "table", head: ["Part", "What it does", "factorial(n)"], rows: [
        ["Base case", "answers straight away, no more calls", "<code>factorial(1)</code> is 1"],
        ["Recursive case", "does one bit of work, calls itself on a <b>smaller</b> input", "<code>factorial(3)</code> is <code>3 * factorial(2)</code>"],
      ] },
      { type: "callout", kind: "rule", title: "Each call has its own variables", html: "<p>While <code>factorial(3)</code> waits for <code>factorial(2)</code>, there are <b>two different</b> <code>n</code>s: 3 in one frame and 2 in the other. The newest frame is on top of the stack. When it returns, it is thrown away and the one below carries on from where it paused.</p>" },
      { type: "switch", label: "Example", items: [
        { label: "factorial(3)", blocks: [{ type: "stepper", title: "factorial(3): down to the base case, then back up",
          code: `
            def factorial(n):
                if n == 0 or n == 1:         # base case: answer known
                    return 1
                return n * factorial(n - 1)  # smaller problem, then multiply

            print(factorial(3))`,
          what: { 2: "Check for the base case first, every time.", 3: "The base case: no more calls.", 4: "Pauses this call until factorial(n - 1) answers, then multiplies.", 6: "The first call. Its answer gets printed." },
          steps: factSteps(), visualTitle: "One box per call (orange = paused, waiting)", visual: chainVisual }] },
        { label: "balance_after(100, 3)", blocks: [{ type: "stepper", title: "balance_after: one year at a time (NB §24)",
          code: `
            def balance_after(balance, years):
                if years == 0:                                    # base case: no years left
                    return balance
                return balance_after(balance * 1.05, years - 1)   # one year, then ask again

            print(balance_after(100, 3))`,
          what: { 2: "The base case.", 3: "Hand the balance back up.", 4: "One year of 5% interest, and one year fewer to go." },
          steps: balanceSteps(false), visualTitle: "One box per call", visual: chainVisual }] },
        { label: "balance_after(100, -1)", blocks: [{ type: "stepper", title: "Stepping past the base case",
          code: `
            def balance_after(balance, years):
                if years == 0:                                    # never true for -1, -2, ...
                    return balance
                return balance_after(balance * 1.05, years - 1)

            print(balance_after(100, -1))`,
          steps: balanceSteps(true), visualTitle: "The stack keeps growing", visual: chainVisual }] },
      ] },

      { type: "h", text: "Fibonacci: calling itself twice", sub: "Watch the call tree grow. Then switch the memo on." },
      { type: "widget", render: fibWidget },
      { type: "table", caption: "Number of calls (counted in Python)", head: ["n", "plain fibonacci(n)", "fibonacci_memo(n), fresh memo"], num: [0, 1, 2], rows: [
        ["5", "15", "9"], ["10", "177", "19"], ["20", "21,891", "39"], ["30", "2,692,537", "59"],
      ] },
      { type: "callout", kind: "tip", title: "Why the memo helps", html: "<p>Plain: f(20) asks for f(19) and f(18), and f(19) asks for f(18) <b>again</b>, and so on. The work roughly doubles with every +1 in n: O(2ⁿ). With <code>known</code>, every value is worked out once and then looked up: O(n). That is dynamic programming.</p>" },

      { type: "h", text: "Tower of Hanoi", sub: "Move all discs to peg 2. One disc at a time, never a big one on a small one." },
      `<p>The trick (Ex7): to move <b>n</b> discs, move the <b>n − 1</b> smaller ones out of the way, move the biggest, then move the n − 1 back on top. “Move n − 1 discs” is the same problem, one smaller. With 0 discs there is nothing to do: that is the base case.</p>`,
      { type: "widget", title: "Watch the recursion", intro: "Pick the number of discs. Each step shows the pegs and the open calls. Start with 2 discs, then try 3.", render: hanoiWidget },
      { type: "widget", title: "Play it yourself", render: hanoiPlay },
      { type: "table", head: ["discs n", "1", "2", "3", "4", "10"], rows: [["moves 2ⁿ − 1", "1", "3", "7", "15", "1,023"]] },

      { type: "h", text: "Recursion or a loop?" },
      { type: "table", head: ["", "Recursion", "Loop"], rows: [
        ["Looks like", "the maths definition", "a running total"],
        ["Memory", "one frame per call (up to ~1000)", "a few variables"],
        ["Good for", "things inside things: trees, DFS, merge sort, Hanoi", "counting, summing, walking a list"],
        ["Tiny example", "<code>return n * factorial(n - 1)</code>", "<code>for i in range(1, n + 1): result *= i</code>"],
      ] },
      {
        type: "tryit",
        title: "Factorial both ways, and a call counter",
        task: "Run it. Then try <code>factorial(-1)</code> in the recursive version: what happens, and why?",
        code: `
          def factorial(n):
              if n == 0 or n == 1:            # base case
                  return 1
              return n * factorial(n - 1)     # recursive case

          def factorial_loop(n):
              result = 1
              for i in range(1, n + 1):       # 1, 2, ..., n
                  result = result * i
              return result

          print(factorial(5), factorial_loop(5))

          calls = 0
          def fibonacci(n):
              global calls
              calls += 1                      # count every call
              if n <= 1:
                  return n
              return fibonacci(n - 1) + fibonacci(n - 2)

          print(fibonacci(20), "calls:", calls)`,
        hint: "With -1, the base case <code>n == 0 or n == 1</code> is never true: -1, -2, -3, …",
      },
      { type: "mistakes", items: [
        { title: "No base case", wrong: "def factorial(n):\n    return n * factorial(n - 1)", right: "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)", why: "It never stops: <code>RecursionError: maximum recursion depth exceeded</code>." },
        { title: "A base case the input can jump over", wrong: "if years == 0:", right: "if years <= 0:", why: "<code>balance_after(100, -1)</code> goes −1, −2, … and never equals 0." },
        { title: "Forgetting <code>return</code> on the recursive call", wrong: "n * factorial(n - 1)", right: "return n * factorial(n - 1)", why: "The value is computed and dropped. The call gives back None, and the caller crashes on <code>3 * None</code>: TypeError." },
        { title: "Not making the problem smaller", wrong: "return n * factorial(n)", right: "return n * factorial(n - 1)", why: "The same input forever is the same as no base case." },
        { title: "Printing instead of returning", wrong: "if n == 1:\n    print(1)", right: "if n == 1:\n    return 1", why: "The caller needs a value to multiply. <code>print</code> only shows it on the screen." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: `
          def countdown(n):
              if n == 0:
                  print("Go!")
                  return
              print(n)
              countdown(n - 1)
              print("back in", n)

          countdown(2)`, answer: "2\n1\nGo!\nback in 1\nback in 2",
        hint: "Each call prints its <code>n</code>, then <b>waits</b> for the smaller call to finish, then prints “back in”. Which call finishes first?", explain: "Going down: 2, 1, then the base case prints Go!. Coming back up, the newest frame finishes first: back in 1, then back in 2." },
      { type: "predict", q: "What does this print?", code: `
          def total(n):
              if n == 0:
                  return 0
              return n + total(n - 1)

          print(total(4))`, answer: "10",
        hint: "total(4) = 4 + total(3) = 4 + 3 + total(2) …", explain: "4 + 3 + 2 + 1 + 0 = 10. The base case adds the 0." },
      { type: "bug", q: "<code>factorial(3)</code> should give 6 but crashes. Click the line with the bug.", code: `
          def factorial(n):
              if n <= 1:
                  return 1
              n * factorial(n - 1)

          print(factorial(3))`,
        bugs: [4], notes: { 4: "the result is never returned, so the call gives back None" },
        fixed: `
          def factorial(n):
              if n <= 1:
                  return 1
              return n * factorial(n - 1)

          print(factorial(3))`,
        hint: "What does factorial(2) give back to factorial(3)?", explain: "factorial(1) is fine (it returns 1), but factorial(2) computes 2 * 1 and drops it, so it gives back None. Then factorial(3) does the same with <code>3 * None</code>: TypeError." },
      { type: "mc", q: "A recursive function has no base case. What happens?", options: ["It returns None", "It loops forever without an error", "RecursionError: maximum recursion depth exceeded", "SyntaxError"], answer: 2,
        hint: "Each call adds a frame. Is there room for infinitely many?", explain: "Python allows about 1000 frames, then stops with a RecursionError." },
      { type: "mc", q: "How many moves does Tower of Hanoi need for 5 discs?", options: ["5", "10", "25", "31"], answer: 3,
        hint: "The pattern is 1, 3, 7, 15, …", explain: "2⁵ − 1 = 31. Each extra disc doubles the work and adds one." },
      { type: "write", q: "Write a <b>recursive</b> <code>sum_list(nums)</code> that returns the sum of a list. Base case: the empty list has sum 0.",
        starter: `
          def sum_list(nums):
              # base case: empty list
              # recursive case: first item + sum of the rest (nums[1:])
              pass

          print(sum_list([2, 4, 6]))`,
        checks: [["sum_list([2, 4, 6])", "12"], ["sum_list([])", "0"], ["sum_list([5])", "5"]],
        solution: `
          def sum_list(nums):
              if len(nums) == 0:                  # base case
                  return 0
              return nums[0] + sum_list(nums[1:]) # one item + the smaller rest`,
        hint: "<code>nums[1:]</code> is the list without its first item, so it is one shorter each time.",
        explain: "sum_list([2, 4, 6]) = 2 + sum_list([4, 6]) = 2 + 4 + sum_list([6]) = 2 + 4 + 6 + sum_list([]) = 12." },
    ],
  };

  /* ================================================================
     TOPIC 11b: Big-O
     ================================================================ */
  const GROW = [
    { o: "O(1)", f: () => 1, ex: "<code>nums[0]</code>", dbl: () => "×1 (the same)" },
    { o: "O(log n)", f: n => Math.log2(n), ex: "binary search", dbl: () => "+1 step" },
    { o: "O(n)", f: n => n, ex: "one loop over the list", dbl: () => "×2" },
    { o: "O(n log n)", f: n => n * Math.log2(n), ex: "merge sort, <code>sorted()</code>", dbl: n => "×" + ((2 * Math.log2(2 * n)) / Math.log2(n)).toFixed(2) },
    { o: "O(n²)", f: n => n * n, ex: "a loop inside a loop", dbl: () => "×4" },
    { o: "O(2ⁿ)", f: n => Math.pow(2, n), ex: "plain recursive Fibonacci", dbl: n => "×2<sup>" + n + "</sup> (it squares)" },
  ];
  const fmt = x => x >= 1e15 ? x.toExponential(1).replace("e+", " × 10^") : x >= 100 ? Math.round(x).toLocaleString("en-US") : String(+x.toFixed(1));
  function growWidget(el) {
    let e = 3;
    const sl = h("input", { type: "range", min: "1", max: "10", value: "3", id: "alg-grow-n" });
    const nTxt = h("b", { class: "mono" });
    const body = h("div");
    const draw = () => {
      const n = 2 ** e;
      nTxt.textContent = n;
      body.replaceChildren(ui.table({ head: ["Big-O", "Example", `work at n = ${n}`, `at n = ${2 * n}`, "double n →", "size (log scale)"],
        rows: GROW.map(g => [g.o, g.ex, fmt(g.f(n)), fmt(g.f(2 * n)), g.dbl(n), ""]) }));
      // bars in the last column: width ~ number of digits
      body.querySelectorAll("tbody tr").forEach((tr, i) => {
        const w = Math.min(100, (Math.log10(Math.max(GROW[i].f(n), 1)) / 8) * 100) + 2;
        tr.lastElementChild.replaceChildren(h("span", { class: "alg-bar", style: `width:${w}%` }));
        tr.lastElementChild.style.minWidth = "110px";
      });
    };
    sl.oninput = () => { e = +sl.value; draw(); };
    const dbl = btn("Double n", () => { e = Math.min(10, e + 1); sl.value = e; draw(); });
    const half = btn("Halve n", () => { e = Math.max(1, e - 1); sl.value = e; draw(); });
    el.append(row(label("n =", "alg-grow-n"), sl, nTxt, dbl, half), h("div", { style: "margin-top:10px" }, body),
      h("p", { class: "small muted", style: "margin:8px 0 0", html: `Bars use a log scale (each step is ×10), otherwise O(2ⁿ) would not fit on any screen. For the curves, open the <a href="#sortviz/bigo">Big-O page in the Sorting visualizer tab</a>.` }));
    draw();
  }

  const SNIPS = [
    { name: "One line", o: "O(1)", code: "first = nums[0]                  # one step, whatever n is", count: () => 1, why: "No loop. A list jumps straight to any index." },
    { name: "One loop", o: "O(n)", code: "total = 0\nfor x in nums:                   # n rounds\n    total += x", count: n => n, why: "One round per item." },
    { name: "Loop in a loop", o: "O(n²)", code: "count = 0\nfor i in range(n):               # n rounds ...\n    for j in range(n):           # ... of n rounds each\n        count += 1", count: n => n * n, why: "n rounds of n rounds: n × n. Bubble, selection and insertion sort look like this." },
    { name: "Two loops in a row", o: "O(n)", code: "for x in nums:                   # n rounds\n    print(x)\nfor x in nums:                   # another n rounds\n    print(x)", count: n => 2 * n, why: "n + n = 2n. Drop the constant 2: still O(n). One after the other <b>adds</b>; one inside the other <b>multiplies</b>." },
    { name: "Halving", o: "O(log n)", code: "steps = 0\nwhile n > 1:\n    n = n // 2                   # throw away half\n    steps += 1", count: n => Math.floor(Math.log2(n)), why: "16 → 8 → 4 → 2 → 1 is 4 steps. Doubling n adds only one step. That is binary search." },
    { name: "Hidden loop: in", o: "O(n²)", code: "for x in a:                      # n rounds ...\n    if x in b:                   # ... 'in' on a list scans b\n        print(x)", count: n => n * n, why: "<code>x in b</code> walks through the list b, so it is a loop too (worst case: not found, both lists n long). With a <b>set</b> b it would be O(1) each, O(n) in total." },
  ];
  function snipWidget(el) {
    const box = h("div");
    const s = seg(SNIPS.map(x => x.name), i => draw(i), 0, "Code snippet");
    function draw(i) {
      const sn = SNIPS[i];
      box.replaceChildren(h("div", { class: "alg-two" }, ui.code({ code: sn.code, nonum: true }),
        h("div", null, ui.table({ head: ["n", "steps"], num: [0, 1], rows: [8, 16, 32].map(n => [String(n), sn.count(n).toLocaleString("en-US")]) }),
          h("p", { style: "margin:8px 0 0", html: `<b>${sn.o}</b>. ${sn.why}` }))));
    }
    el.append(s.el, h("div", { style: "margin-top:10px" }, box));
    draw(0);
  }

  const bigO = {
    id: "big-o",
    title: "Big-O",
    summary: "Big-O says how the work grows when the input grows. The easy test: <b>double n</b> and see what happens to the work.",
    sources: "Ex9",
    blocks: [
      { type: "h", text: "Double the input: what happens to the work?" },
      { type: "table", head: ["Big-O", "Name", "Double n →", "Tiny example (n = 8 → 16)"], rows: [
        ["O(1)", "constant", "same work", "1 step → 1 step"],
        ["O(log n)", "logarithmic", "+1 step", "3 steps → 4 steps"],
        ["O(n)", "linear", "×2", "8 → 16"],
        ["O(n log n)", "n log n", "a bit more than ×2", "24 → 64"],
        ["O(n²)", "quadratic", "×4", "64 → 256"],
        ["O(2ⁿ)", "exponential", "it squares", "256 → 65,536"],
      ] },
      { type: "widget", title: "The growth table", intro: "Slide n or press Double n. Look at the “double n →” column: that is what Big-O promises.", render: growWidget },
      { type: "callout", kind: "tip", title: "Your own Ex9 benchmark said exactly this", html: "<p>When n doubled (50 → 100 → 200 → 400), bubble, selection and insertion sort took about <b>×4</b> longer: O(n²). Merge sort and <code>sorted()</code> took about <b>×2.3</b> longer: O(n log n).</p>" },

      { type: "h", text: "Three rules for writing it down" },
      { type: "table", head: ["Rule", "Tiny example", "Big-O"], rows: [
        ["Drop constants", "3n + 5 steps", "O(n)"],
        ["Keep only the biggest term", "n² + n steps", "O(n²)"],
        ["Assume the worst case", "linear search: found at once, or at the very end", "O(n)"],
      ] },
      { type: "h", text: "Read it from the code", sub: "Pick a snippet. The table counts the steps." },
      { type: "widget", render: snipWidget },
      { type: "table", caption: "Costs you should know", head: ["Operation", "Big-O", "Why"], code: [0], rows: [
        ["nums[i]", "O(1)", "jump to a position"],
        ["nums.append(x)", "O(1)", "add at the end"],
        ["x in nums", "O(n)", "scans the list"],
        ["x in my_set", "O(1)", "hash lookup (on average)"],
        ["nums.pop(0)", "O(n)", "everyone shifts left"],
        ["queue.popleft()", "O(1)", "a deque lets go of the front"],
        ["sorted(nums)", "O(n log n)", "Python's built-in sort"],
        ["binary search", "O(log n)", "halves the range each step"],
      ] },
      {
        type: "tryit",
        title: "Count the work, then double n",
        task: "Run it and look at the last column. Then change <code>pairs</code> to a single loop and run again.",
        code: `
          def pairs(n):
              count = 0
              for i in range(n):           # n rounds
                  for j in range(n):       # n rounds each
                      count += 1
              return count

          previous = None
          for n in [100, 200, 400, 800]:
              work = pairs(n)
              ratio = work / previous if previous else 0
              print(n, work, f"x{ratio:.1f}")
              previous = work`,
      },
      { type: "mistakes", items: [
        { title: "Keeping the constant", wrong: "O(3n + 5)", right: "O(n)", why: "Big-O is about the shape of growth. ×3 doesn't change the shape." },
        { title: "Two loops in a row are not n²", wrong: "for ...: ...\nfor ...: ...     # O(n²)?", right: "# O(n) + O(n) = O(n)", why: "Only a loop <b>inside</b> a loop multiplies." },
        { title: "Missing the hidden loop", wrong: "for x in a:\n    if x in b_list:   # looks like O(n)", right: "# O(n²); faster: b = set(b_list)", why: "<code>in</code> on a list walks through it." },
        { title: "Thinking O(log n) is slow", wrong: "log n ≈ n", right: "log₂ of 1,000,000 ≈ 20", why: "A million items, about 20 halvings. Almost as good as O(1)." },
        { title: "Using time to measure memory", wrong: "\"It ran fast, so it uses little memory\"", right: "time and memory are separate questions", why: "Ex9 H3: timing says nothing about extra space (merge sort is fast but needs O(n) extra)." },
      ] },
      { type: "callout", kind: "note", title: "Next", html: "<p>Best vs worst case, memory and recursion trees: <a href=\"#algorithms/big-o-cases\">Big-O: best/worst, space & recursion</a>. Every cost on one page plus a 17-snippet drill and the exam answer template: <a href=\"#algorithms/big-o-drill\">Big-O: cheat sheet & exam drill</a>.</p>" },
    ],
    quiz: [
      { type: "mc", q: "What is the Big-O of this function?", code: `
          def has_duplicate(nums):
              for i in range(len(nums)):
                  for j in range(i + 1, len(nums)):
                      if nums[i] == nums[j]:
                          return True
              return False`, options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 3,
        hint: "A loop inside a loop. The inner one is shorter, but how many pairs are there?", explain: "About n²/2 pairs. Drop the ½: O(n²)." },
      { type: "mc", q: "An O(n²) sort takes 2 seconds for 1,000 items. About how long for 2,000?", options: ["2 s", "4 s", "8 s", "16 s"], answer: 2,
        hint: "Double n with O(n²): ×4.", explain: "2 × 4 = 8 seconds." },
      { type: "mc", q: "What is the Big-O of this loop?", code: `
          steps = 0
          while n > 1:
              n = n // 2
              steps += 1`, options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 1,
        hint: "How many times can you halve 1,024 before you reach 1?", explain: "1024 → 512 → … → 1 is 10 halvings. log₂ 1024 = 10." },
      { type: "predict", q: "What does this print?", code: `
          count = 0
          for i in range(4):
              for j in range(3):
                  count += 1
          for k in range(5):
              count += 1
          print(count)`, answer: "17",
        hint: "4 rounds of 3, then 5 more.", explain: "4 × 3 = 12, then + 5 = 17. Nested multiplies, one after the other adds." },
      { type: "mc", q: "Simplify <code>5n² + 100n + 7</code> to Big-O.", options: ["O(5n²)", "O(n² + n)", "O(n²)", "O(100n)"], answer: 2,
        hint: "Drop constants, keep the biggest term.", explain: "For big n, n² wins over 100n. Drop the 5: O(n²)." },
      { type: "explain", q: "In 3–4 sentences: why is merge sort (O(n log n)) much faster than bubble sort (O(n²)) for 100,000 items?",
        answer: "<p>Bubble sort compares pairs in a loop inside a loop, so its work grows with n²: for 100,000 items that is about 10,000,000,000 steps. Merge sort halves the list about 17 times (log₂ 100,000 ≈ 17), and each level does about n steps of merging, so about 1,700,000 steps. Doubling n makes bubble sort about ×4 slower but merge sort only a bit more than ×2. The bigger the list, the bigger the gap.</p>",
        points: ["bubble = nested loops = n²", "merge = about log n levels × n work per level", "numbers: 10¹⁰ vs about 1.7 × 10⁶", "double n: ×4 vs a bit more than ×2"],
        hint: "Count the steps for n = 100,000 in each case." },
    ],
  };

  /* ================================================================
     TOPIC 11b-2: Big-O: best/worst case, space, recursion
     ================================================================ */
  // a tiny seeded shuffle so "random" gives the same list every time (and the numbers can be checked)
  function seededPerm(n, seed) {
    const a = Array.from({ length: n }, (_, i) => i + 1);
    let s = seed;
    for (let i = n - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2147483648; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const CASE_INPUTS = {
    search: [
      ["target first", n => ({ list: Array.from({ length: n }, (_, i) => i + 1), target: 1 })],
      ["target in the middle", n => ({ list: Array.from({ length: n }, (_, i) => i + 1), target: n / 2 })],
      ["target last", n => ({ list: Array.from({ length: n }, (_, i) => i + 1), target: n })],
      ["not there", n => ({ list: Array.from({ length: n }, (_, i) => i + 1), target: 0 })],
    ],
    sort: [
      ["sorted", n => Array.from({ length: n }, (_, i) => i + 1)],
      ["nearly sorted", n => { const a = Array.from({ length: n }, (_, i) => i + 1); [a[1], a[2]] = [a[2], a[1]]; [a[n - 3], a[n - 2]] = [a[n - 2], a[n - 3]]; return a; }],
      ["random", n => seededPerm(n, 7)],
      ["reversed", n => Array.from({ length: n }, (_, i) => n - i)],
    ],
  };
  const CASE_ALGOS = [
    { name: "Linear search", kind: "search",
      code: `
        def linear_search(nums, target):
            count = 0
            for i, x in enumerate(nums):
                count += 1           # 1 comparison
                if x == target:
                    return i, count  # found: stop
            return -1, count         # checked all n`,
      count: ({ list, target }) => { const i = list.indexOf(target); return i < 0 ? list.length : i + 1; },
      mark: ({ list, target }) => { const i = list.indexOf(target); const m = {}; list.forEach((_, k) => { if (i < 0 || k < i) m[k] = "cmp"; }); if (i >= 0) m[i] = "done"; return m; },
      verdict: ["Best case: found at once. 1 comparison, whatever n is: <b>O(1)</b>.", "Average case: about n/2 comparisons. Drop the ½: <b>O(n)</b>.", "Worst case: n comparisons: <b>O(n)</b>.", "Worst case too: you only know it is missing after checking all n: <b>O(n)</b>."] },
    { name: "Insertion sort", kind: "sort",
      code: `
        def insertion_sort(nums):
            a = nums.copy()
            count = 0
            for i in range(1, len(a)):
                key = a[i]
                j = i - 1
                while j >= 0:
                    count += 1       # 1 comparison
                    if a[j] > key:
                        a[j + 1] = a[j]  # slide right
                        j -= 1
                    else:
                        break        # spot found
                a[j + 1] = key
            return a, count`,
      count: a0 => { const a = a0.slice(); let c = 0; for (let i = 1; i < a.length; i++) { const key = a[i]; let j = i - 1; while (j >= 0) { c++; if (a[j] > key) { a[j + 1] = a[j]; j--; } else break; } a[j + 1] = key; } return c; },
      verdict: ["Best case: each card is already in place, 1 comparison each: n − 1 in total: <b>O(n)</b>.", "Nearly sorted: only a few cards slide. Still about n: <b>O(n)</b>.", "Average case: about n²/4. Drop the ¼: <b>O(n²)</b>.", "Worst case: card i slides past all i cards before it. 1 + 2 + … + (n − 1) = n(n − 1)/2: <b>O(n²)</b>."] },
    { name: "Bubble sort", kind: "sort",
      code: `
        def bubble_sort(nums):
            a = nums.copy()
            count = 0
            n = len(a)
            for p in range(n - 1):
                swapped = False
                for j in range(n - 1 - p):
                    count += 1       # 1 comparison
                    if a[j] > a[j + 1]:
                        a[j], a[j + 1] = a[j + 1], a[j]
                        swapped = True
                if not swapped:
                    break            # early exit
            return a, count`,
      count: a0 => { const a = a0.slice(), n = a.length; let c = 0; for (let p = 0; p < n - 1; p++) { let sw = false; for (let j = 0; j < n - 1 - p; j++) { c++; if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; sw = true; } } if (!sw) break; } return c; },
      verdict: ["Best case: one pass with no swap, then <code>break</code>: n − 1 comparisons: <b>O(n)</b>.", "Nearly sorted: two passes here, about 2n: <b>O(n)</b>.", "Average case: <b>O(n²)</b>.", "Worst case: every pass runs to the end. n(n − 1)/2: <b>O(n²)</b>."] },
  ];
  function casesWidget(el) {
    let ai = 1, ii = 0;
    const codeBox = h("div"), pic = h("div", { class: "alg-scroll" }), body = h("div"), verdict = h("p", { class: "alg-now", "aria-live": "polite" });
    const inputRow = h("div");
    const algoSeg = seg(CASE_ALGOS.map(a => a.name), i => { ai = i; ii = 0; buildInputs(); draw(); }, ai, "Algorithm");
    function buildInputs() {
      const ins = CASE_INPUTS[CASE_ALGOS[ai].kind];
      inputRow.replaceChildren(seg(ins.map(x => x[0]), i => { ii = i; draw(); }, ii, "Input").el);
    }
    function draw() {
      const A = CASE_ALGOS[ai], mk = CASE_INPUTS[A.kind][ii][1];
      codeBox.replaceChildren(ui.code({ code: A.code, nonum: true }));
      const small = mk(8);
      if (A.kind === "search") pic.replaceChildren(D.array(small.list, { name: "nums (target " + small.target + ")", marks: A.mark(small) }));
      else pic.replaceChildren(D.array(small, { name: "nums" }));
      let prev = null;
      body.replaceChildren(ui.table({ head: ["n", "comparisons", "double n →"], num: [0, 1], rows: [8, 16, 32, 64].map(n => {
        const c = A.count(mk(n)), r = prev ? "×" + (c / prev).toFixed(1) : "";
        prev = c; return [String(n), c.toLocaleString("en-US"), r];
      }) }));
      verdict.innerHTML = A.verdict[ii];
    }
    buildInputs();
    el.append(row(algoSeg.el), h("div", { style: "margin-top:6px" }, inputRow), h("div", { style: "margin-top:10px" }, pic),
      h("div", { class: "alg-two" }, codeBox, h("div", null, body, verdict)),
      h("p", { class: "small muted", style: "margin:6px 0 0" }, "×1.0 = O(1), ×2 = O(n), ×4 = O(n²). The list above is the n = 8 version."));
    draw();
  }

  // deepest call stack for a few recursive functions
  const STACKS = [
    { name: "countdown(n)", depth: n => n, frame: (n, k) => `countdown(${n - k})`, o: "O(n)", why: "Each call waits for the next one, one smaller. n calls are open at the same time." },
    { name: "binary search", depth: n => Math.floor(Math.log2(n)) + 1, frame: (n, k) => `search(${Math.max(1, n >> k)} items)`, o: "O(log n)", why: "Each call throws half away, so only about log₂ n calls are ever open." },
    { name: "DFS, balanced tree", depth: n => Math.floor(Math.log2(n)) + 1, frame: (n, k) => `dfs(level ${k})`, o: "O(h) = O(log n)", why: "The stack holds one path from the root down: h levels. A balanced tree has h ≈ log₂ n." },
    { name: "DFS, chain tree", depth: n => n, frame: (n, k) => `dfs(node ${k + 1})`, o: "O(h) = O(n)", why: "A chain (every node has one child) is n levels tall. With 2,000 nodes Python stops with RecursionError (limit about 1,000). Exercise 10's iterative DFS avoids this." },
  ];
  function stackWidget(el) {
    let fi = 0, n = 8;
    const pic = h("div"), txt = h("p", { class: "alg-now", "aria-live": "polite" });
    const fSeg = seg(STACKS.map(s => s.name), i => { fi = i; draw(); }, 0, "Function");
    const nSeg = seg(["n = 8", "n = 16", "n = 32"], i => { n = [8, 16, 32][i]; draw(); }, 0, "Input size");
    function draw() {
      const F = STACKS[fi], d = F.depth(n);
      const ks = d <= 7 ? [...Array(d).keys()] : [0, 1, 2, -1, d - 3, d - 2, d - 1];   // bottom → top, -1 = gap
      const plates = ks.map(k => k < 0 ? h("div", { class: "alg-plate", style: "background:var(--surface-2);color:var(--muted)" }, `⋮ ${d - 6} more`)
        : h("div", { class: "alg-plate" + (k === d - 1 ? " top" : "") }, F.frame(n, k)));
      pic.replaceChildren(h("div", { class: "alg-stack" }, ...plates));
      txt.innerHTML = `Deepest point: <b>${d} frames</b> for n = ${n}. Extra memory: <b>${F.o}</b>. ${F.why}`;
    }
    el.append(row(fSeg.el), h("div", { style: "margin-top:6px" }, nSeg.el), h("div", { class: "alg-two" }, h("div", null, eyebrow("Call stack at its deepest (newest on top)"), pic), txt));
    draw();
  }

  // merge sort as a tree of levels: level k has 2^k pieces of n / 2^k items
  function mergeTreeWidget(el) {
    let n = 8;
    const pic = h("div", { class: "alg-scroll" }), txt = h("p", { class: "alg-now", "aria-live": "polite" });
    const nSeg = seg(["n = 4", "n = 8", "n = 16"], i => { n = [4, 8, 16][i]; draw(); }, 1, "List size");
    function draw() {
      const L = Math.log2(n), W = 600, top = 10, rowH = 46, cell = Math.min(28, (W - 150 - (n - 1) * 6) / n);
      const S = D.svg({ w: W, h: top + (L + 1) * rowH + 6, label: `merge sort tree for ${n} items: ${L + 1} levels` });
      for (let k = 0; k <= L; k++) {
        const pieces = 2 ** k, size = n / pieces, y = top + k * rowH;
        const gap = 6, total = n * cell + (pieces - 1) * gap, x0 = (W - 150 - total) / 2;
        for (let p = 0; p < pieces; p++) S.box(x0 + p * (size * cell + gap), y, size * cell, 28, { text: String(size), tone: k === L ? "done" : "tile", rx: 5, size: 12 });
        S.text(W - 140, y + 14, `level ${k}: ${pieces} × ${size}`, { anchor: "start", small: true, muted: true });
        S.text(W - 140, y + 30, k < L ? `merge work ≈ ${n}` : "size 1: base case", { anchor: "start", small: true, ui: true, cls: k < L ? "alg-ptr" : null });
      }
      pic.replaceChildren(S.el);
      txt.innerHTML = `${n} items → halve ${L} times to reach size 1 (log₂ ${n} = ${L}). Every merging level touches all ${n} items once. Work ≈ <b>${L} levels × ${n} = ${L * n}</b> = n log₂ n. Double n to ${2 * n}: ${L + 1} × ${2 * n} = ${(L + 1) * 2 * n}, that is ×${(((L + 1) * 2 * n) / (L * n)).toFixed(2)}: a bit more than ×2.`;
    }
    el.append(row(nSeg.el), h("div", { style: "margin-top:10px" }, pic), txt);
    draw();
  }

  const bigOCases = {
    id: "big-o-cases",
    title: "Big-O: best/worst, space & recursion",
    summary: "One algorithm can be quick on one list and slow on another. Memory grows too. And recursion has its own counting rule: <b>levels × work per level</b>.",
    sources: "Ex7; Ex9 E4, M4, H3–H4",
    blocks: [
      { type: "callout", kind: "note", title: "Start with the basics", html: "<p>Double n → ×2 or ×4, the three rules and reading loops: <a href=\"#algorithms/big-o\">Big-O</a>. The curves: <a href=\"#sortviz/bigo\">Sorting visualizer → Big-O</a>. All costs on one page and a drill: <a href=\"#algorithms/big-o-drill\">Big-O cheat sheet & drill</a>.</p>" },

      { type: "h", text: "Best, average and worst case", sub: "Big-O normally means the worst case." },
      { type: "table", head: ["Algorithm", "Best case", "Worst case", "Tiny example (n = 8)"], rows: [
        ["Linear search", "O(1): target first", "O(n): last or missing", "1 check vs 8 checks"],
        ["Binary search (sorted list)", "O(1): target in the middle", "O(log n)", "1 check vs 4 checks (8 → 4 → 2 → 1)"],
        ["Bubble (early exit), insertion", "O(n): already sorted", "O(n²): reversed", "7 vs 28 comparisons"],
        ["Selection", "O(n²)", "O(n²)", "always 28: it scans the rest every time"],
        ["Merge", "O(n log n)", "O(n log n)", "always about 3 levels × 8 = 24"],
        ["Quick", "O(n log n): pivots split in half", "O(n²): pivot is always the smallest or biggest", "3 levels × 8 vs 8 levels × up to 8"],
      ] },
      { type: "widget", title: "Same algorithm, different input", intro: "Pick an algorithm and an input. The table counts real comparisons for n = 8, 16, 32 and 64.", render: casesWidget },
      { type: "callout", kind: "tip", title: "Say which case you mean", html: "<p>“Insertion sort is O(n²)” means the worst case. If you mean another case, say it: “insertion sort is O(n) in the <b>best</b> case, when the list is already sorted”. So a nearly sorted list → insertion sort.</p>" },

      { type: "h", text: "Space: how much extra memory?", sub: "analyse time and space. Ex9 M4 asks for “auxiliary space”: memory on top of the input." },
      { type: "table", head: ["Code", "Extra memory", "Why (n = 8)"], code: [0], rows: [
        ["total = 0\nfor x in nums: total += x", "O(1)", "one number, also when n = 1,000,000"],
        ["doubled = [x * 2 for x in nums]", "O(n)", "a new list of 8 items"],
        ["seen = set()  # filled in a loop", "O(n)", "up to 8 items"],
        ["bubble / selection / insertion in place", "O(1)", "only i, j and key"],
        ["merge sort", "O(n)", "the halves and the merged lists"],
        ["F = [0] * (n + 1)  # fib table", "O(n)", "9 boxes"],
        ["def countdown(n): ... countdown(n - 1)", "O(n)", "8 frames wait on the call stack"],
      ] },
      { type: "widget", title: "Recursion costs memory too", intro: "Every open call is a frame on the call stack. Pick a function and n: this is the stack at its deepest point.", render: stackWidget },
      { type: "callout", kind: "warn", title: "Time and memory are separate questions", html: "<p>Ex9 H3: a stopwatch measures time only. Merge sort is fast <b>and</b> needs O(n) extra memory. Naive Fibonacci is slow (O(2ⁿ) time) but its stack is only n deep (O(n) space).</p>" },

      { type: "h", text: "Recursion: levels × work per level", sub: "Your notes: merge/quick recursion was the hard part. This is the one rule you need." },
      { type: "callout", kind: "rule", title: "Draw the call tree, then multiply", html: "<ol><li>How many <b>levels</b> does the tree have?</li><li>How much <b>work on one level</b> (all calls on that level together)?</li><li>Multiply. Merge sort, n = 8: 3 levels × 8 = <b>24 = n log₂ n</b>.</li></ol>" },
      { type: "widget", title: "Merge sort: the tree of halves", intro: "Each row is one level of calls. The numbers are the piece sizes.", render: mergeTreeWidget },
      { type: "table", caption: "Read the Big-O off the call tree", head: ["Function", "Levels", "Work per level", "Total"], rows: [
        ["<code>factorial(n)</code>: one call per level", "n", "O(1)", "<b>O(n)</b>"],
        ["binary search (recursive)", "log n", "O(1)", "<b>O(log n)</b>"],
        ["merge sort", "log n", "n (merging)", "<b>O(n log n)</b>"],
        ["quick sort, good pivot", "log n", "n (splitting into less / equal / greater)", "<b>O(n log n)</b>"],
        ["quick sort, bad pivot (e.g. [1, 2, 3, 4, 5] and the first item)", "n", "up to n", "<b>O(n²)</b>"],
        ["naive <code>fib(n)</code>: two calls each", "n", "doubles each level: 1, 2, 4, 8 …", "<b>O(2ⁿ)</b>"],
        ["<code>fib(n)</code> with memo or a table", "n", "each value once", "<b>O(n)</b>"],
        ["Tower of Hanoi", "n", "doubles each level", "<b>O(2ⁿ)</b>: 2ⁿ − 1 moves"],
        ["<code>sum_list(nums[1:])</code>", "n", "the slice copies up to n items", "<b>O(n²)</b>: a hidden cost"],
      ] },
      { type: "callout", kind: "note", title: "See it move", html: "<p>The Fibonacci call tree with a memo switch: <a href=\"#algorithms/recursion\">Recursion</a>. Merge and quick sort with their call stack, line by line: <a href=\"#sortviz/merge\">merge sort</a> · <a href=\"#sortviz/quick\">quick sort</a>.</p>" },
      { type: "table", caption: "How many calls? (counted in Python)", head: ["n", "naive fib calls", "memo fib calls"], num: [0, 1, 2], rows: [
        ["5", "15", "9"], ["10", "177", "19"], ["15", "1,973", "29"], ["20", "21,891", "39"], ["25", "242,785", "49"],
      ] },
      `<p>Naive: +5 to n gives about ×11 the calls, which explodes. Memo: +5 to n gives +10 calls, a straight line: O(n). (The real naive factor is about ×1.6 per +1. The course writes O(2ⁿ), an upper bound: still exponential.)</p>`,
      {
        type: "tryit",
        title: "Count the calls yourself",
        task: "Run it. Then add 30 to the list of sizes (naive needs a few seconds for that one).",
        code: `
          calls = 0                              # how many times fib was called

          def fib(n):
              global calls
              calls += 1
              if n <= 1:
                  return n
              return fib(n - 1) + fib(n - 2)    # two calls: the tree doubles

          memo_calls = 0

          def fib_memo(n, memo):
              global memo_calls
              memo_calls += 1
              if n in memo:                      # already known: no new work
                  return memo[n]
              if n <= 1:
                  result = n
              else:
                  result = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
              memo[n] = result                   # save it for next time
              return result

          for n in [5, 10, 15, 20]:
              calls = 0
              memo_calls = 0
              fib(n)
              fib_memo(n, {})
              print(n, calls, memo_calls)`,
        expectOutput: "5 15 9\n10 177 19\n15 1973 29\n20 21891 39",
      },
      { type: "mistakes", items: [
        { title: "Quoting the best case as the Big-O", wrong: "Linear search is O(1): sometimes it finds it at once.", right: "Linear search is O(n) (worst case);\nO(1) only in the best case.", why: "Without a word added, Big-O means the worst case." },
        { title: "Thinking recursion needs no memory", wrong: "factorial(n), recursive: O(1) space", right: "O(n) space: n frames on the call stack", why: "Every call waits until the one below it returns." },
        { title: "Counting calls, not work", wrong: "merge sort makes about 2n calls → O(n)", right: "log n levels × n work per level → O(n log n)", why: "The merging inside the calls is where the work is." },
        { title: "Slicing looks free", wrong: "return nums[0] + sum_list(nums[1:])   # O(n)", right: "# O(n²): each nums[1:] copies the rest\n# O(n) with an index: sum_list(nums, i + 1)", why: "A slice builds a new list: n − 1, then n − 2, … items." },
        { title: "2ⁿ calls means 2ⁿ memory", wrong: "naive fib: O(2ⁿ) space", right: "naive fib: O(2ⁿ) time, O(n) space", why: "Only one path of the call tree is on the stack at a time." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "Insertion sort gets a list of 1,000 items that is <b>already sorted</b>. Which Big-O describes this run?", options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 1,
        wrong: { 0: "It still has to look at each item once to see it is in place.", 2: "No halving happens in insertion sort.", 3: "That is the worst case (reversed). Here nothing slides." },
        hint: "How many comparisons does each card need if it is already in place?", explain: "One comparison per card: 999 in total. That is the best case, O(n). This is why insertion sort is the pick for an almost sorted list." },
      { type: "mc", q: "What is the extra memory of this function?", code: `
          def squares(nums):
              return [x * x for x in nums]`, options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2,
        wrong: { 0: "The comprehension builds a whole new list.", 3: "One new item per input item, not per pair." },
        hint: "How long is the list it gives back?", explain: "A new list with n items: O(n) extra memory." },
      { type: "mc", q: "Recursive binary search on a sorted list of 1,024 items. About how many calls are open at the deepest point?", options: ["about 10", "512", "1,024", "2"], answer: 0,
        wrong: { 1: "That would be halving only once.", 2: "That is linear: one call per item." },
        hint: "1024 → 512 → … → 1: how many halvings?", explain: "log₂ 1024 = 10 halvings, so about 10–11 frames. O(log n) space for the recursive version; the loop version needs O(1)." },
      { type: "mc", q: "Merge sort on 16 items. How many levels merge, and about how much work is that?", options: ["4 levels, about 64 steps", "16 levels, about 256 steps", "2 levels, about 32 steps", "4 levels, about 16 steps"], answer: 0,
        wrong: { 1: "That is n × n: the O(n²) sorts.", 3: "Each level touches all 16 items, not one per level." },
        hint: "16 → 8 → 4 → 2 → 1: count the halvings. Each level touches every item once.", explain: "log₂ 16 = 4 levels × 16 items = 64 = n log₂ n." },
      { type: "predict", q: "How many times is <code>fib</code> called? Type the number.", code: `
          calls = 0
          def fib(n):
              global calls
              calls += 1
              if n <= 1:
                  return n
              return fib(n - 1) + fib(n - 2)

          fib(4)
          print(calls)`, answer: "9",
        hint: "fib(4) calls fib(3) and fib(2). fib(3) makes 5 calls, fib(2) makes 3.", explain: "1 (for fib(4)) + 5 + 3 = 9. fib(2) is worked out twice: the repeated work that DP removes." },
      { type: "explain", q: "Ex9 H4 style. In 3–4 sentences: compare merge sort and quick sort on time (best and worst) and on memory.",
        answer: "<p>Merge sort always halves the list, so it has log n levels with n work each: O(n log n) in every case. It needs O(n) extra memory for the halves and the merged list. Quick sort is O(n log n) on average when the pivots split the list in about half, but if the pivot is always the smallest or biggest item, each level only removes one item: n levels × n work = O(n²). The list version from Ex9 also builds new less/equal/greater lists, so it uses O(n) extra memory on average.</p>",
        points: ["merge: O(n log n) always, guaranteed", "merge: O(n) extra memory", "quick: O(n log n) average, O(n²) with bad pivots", "reason: levels × work per level", "quick list version: extra memory for less/equal/greater"],
        hint: "Use “levels × work per level” for both. Then say what each one stores." },
    ],
  };

  /* ================================================================
     TOPIC 11b-3: Big-O cheat sheet and drill
     ================================================================ */
  const DRILL = [
    { code: `
        count = 0
        for i in range(n):
            for j in range(i):               # 0, 1, 2, … n − 1 rounds
                count += 1`, options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"], answer: 2,
      wrong: { 0: "There is a loop inside a loop. The inner one is shorter, but it still grows with n.", 1: "Nothing halves here. The inner loop grows by one each round." },
      hint: "n = 4: the inner loop runs 0 + 1 + 2 + 3 times.", explain: "0 + 1 + … + (n − 1) = n(n − 1)/2. Drop the ½ and the lower term: O(n²). n = 4 gives 6." },
    { code: `
        for i in range(n):
            for j in range(5):               # always 5 rounds
                print(i, j)`, options: ["O(1)", "O(n)", "O(n²)", "O(5n²)"], answer: 1,
      wrong: { 2: "The inner loop does not grow with n. It is always 5.", 3: "Never keep constants, and the inner loop is not n long." },
      hint: "Does the inner loop get longer when n doubles?", explain: "5 × n steps. Drop the 5: O(n)." },
    { code: `
        i = 1
        while i < n:
            i = i * 2                        # 1, 2, 4, 8, …`, options: ["O(1)", "O(log n)", "O(n)", "O(2ⁿ)"], answer: 1,
      wrong: { 2: "i does not go up by 1. It doubles.", 3: "i grows like 2ᵏ, so the number of rounds k is small: log n." },
      hint: "n = 1,024: how many doublings to get from 1 to 1,024?", explain: "10 doublings for 1,024. Doubling (or halving) each round: O(log n)." },
    { code: `
        for i in range(n):                   # n rounds …
            j = n
            while j > 1:                     # … of halving
                j = j // 2`, options: ["O(log n)", "O(n)", "O(n log n)", "O(n²)"], answer: 2,
      wrong: { 0: "The halving loop runs again in every one of the n rounds.", 3: "The inner loop halves: it is log n long, not n." },
      hint: "Outer: n rounds. Inner: how many halvings of n?", explain: "n rounds × log n halvings = O(n log n). Same shape as merge sort." },
    { code: `
        for x in a:                          # a and b: both n long
            if x in b:                       # b is a list
                print(x)`, options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 3,
      wrong: { 1: "<code>x in b</code> looks like one step, but on a list it walks through b." },
      hint: "What does <code>in</code> do on a list?", explain: "<code>in</code> on a list scans it: up to n checks, done n times. O(n²)." },
    { code: `
        b_set = set(b)                       # n steps, once
        for x in a:
            if x in b_set:                   # hash lookup
                print(x)`, options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 1,
      wrong: { 3: "<code>in</code> on a <b>set</b> is O(1) on average: no scan.", 2: "Building a set does not sort anything." },
      hint: "Cost of <code>set(b)</code> + n lookups of O(1) each.", explain: "n to build the set + n × O(1) lookups = 2n: O(n). The same task as the last one, made fast." },
    { code: `
        queue = list(range(n))
        while queue:
            item = queue.pop(0)              # take the front
            print(item)`, options: ["O(n)", "O(n log n)", "O(n²)", "O(1)"], answer: 2,
      wrong: { 0: "Each <code>pop(0)</code> shifts all the other items one to the left." },
      hint: "What does <code>pop(0)</code> cost on a list of k items?", explain: "n pops, each shifting up to n items: O(n²). With <code>deque</code> and <code>popleft()</code> it is O(n)." },
    { code: `
        for i in range(n):
            ranked = sorted(nums)            # nums has n items
            print(ranked[0])`, options: ["O(n)", "O(n log n)", "O(n² log n)", "O(n²)"], answer: 2,
      wrong: { 1: "That is one sort. Here it sorts again in every round.", 3: "<code>sorted()</code> is O(n log n), not O(n)." },
      hint: "n rounds × the cost of one <code>sorted()</code>.", explain: "n × O(n log n) = O(n² log n). Fix: sort once before the loop (O(n log n)), or use <code>min(nums)</code> (O(n))." },
    { code: `
        out = []
        for x in nums:
            out = out + [x]                  # builds a NEW list`, options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 3,
      wrong: { 1: "<code>out + [x]</code> copies the whole list each time. <code>out.append(x)</code> would be O(n)." },
      hint: "How many items are copied in round 1, 2, 3 …?", explain: "Copies 1, 2, 3, … n items: n(n + 1)/2 = O(n²). <code>out.append(x)</code> adds in place: O(n) in total." },
    { code: `
        for x in nums:
            print(x / sum(nums))             # share of the total`, options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 3,
      wrong: { 1: "<code>sum(nums)</code> is a loop too, and it runs in every round." },
      hint: "What does <code>sum(nums)</code> cost, and how often does it run?", explain: "n rounds × an O(n) sum = O(n²). Fix: <code>total = sum(nums)</code> once, before the loop: O(n)." },
    { code: `
        for x in a:                          # a has n items
            print(x)
        for y in b:                          # b has m items
            print(y)`, options: ["O(n)", "O(n + m)", "O(n × m)", "O(n²)"], answer: 1,
      wrong: { 0: "b has its own size m. Keep both if they can differ.", 2: "The loops are one <b>after</b> the other, not one inside the other.", 3: "Not nested, and the sizes differ." },
      hint: "One after the other adds; one inside the other multiplies.", explain: "n + m. If both are n long, that is 2n = O(n)." },
    { code: `
        def total(nums):
            if not nums:
                return 0
            return nums[0] + total(nums[1:])`, options: ["O(log n)", "O(n)", "O(n²)", "O(2ⁿ)"], answer: 2,
      wrong: { 1: "n calls, yes. But each <code>nums[1:]</code> copies the rest of the list.", 3: "Only one recursive call per call: the tree does not branch." },
      hint: "Levels × work per level. What does the slice cost?", explain: "n levels × a slice of up to n items = O(n²)." },
    { code: `
        def search(nums, target, lo, hi):    # nums is sorted
            if lo > hi:
                return -1
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                return search(nums, target, mid + 1, hi)
            return search(nums, target, lo, mid - 1)`, options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 1,
      wrong: { 2: "Each call keeps only half the range. And no slicing: it passes lo and hi.", 3: "Only one of the two calls runs each time." },
      hint: "How much of the range is left after each call?", explain: "Half is thrown away per call: log n levels × O(1) work = O(log n). Passing lo/hi instead of slicing keeps each call O(1)." },
    { code: `
        def fib(n):
            if n <= 1:
                return n
            return fib(n - 1) + fib(n - 2)`, options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"], answer: 3,
      wrong: { 0: "That is the memo or table version. This one repeats work.", 2: "The call tree doubles on each level; it is much worse than n²." },
      hint: "Two calls per call, about n levels.", explain: "The call tree roughly doubles each level: O(2ⁿ). With a memo: O(n)." },
    { code: `
        # Exam w25 Q3
        def process_inventory(stock, item_index, min_stock, low_stock_queue):
            if stock[item_index] > 0:
                stock[item_index] -= 1
                return True
            else:
                low_stock_queue.append(item_index)
                return False`, options: ["O(1)", "O(n)", "O(n log n)", "O(n²)"], answer: 0,
      wrong: { 1: "<code>stock</code> has n items, but the function only touches one index. No loop." },
      hint: "Is there a loop? What do indexing and <code>append</code> cost?", explain: "One index read, one write or one append: all O(1). It does not depend on how many items there are." },
    { code: `
        # Exam w25 Q5: m machines (rows), d days (columns)
        def high_demand_machines(usage_matrix, usage_threshold):
            totals = np.sum(usage_matrix, axis=1)
            is_high = totals > usage_threshold
            return np.where(is_high)[0]`, options: ["O(1)", "O(m)", "O(m × d)", "O(m²)"], answer: 2,
      wrong: { 0: "Short code is not O(1). NumPy still visits every cell, just very fast.", 1: "Each row total adds d numbers. Only the last two lines are O(m)." },
      hint: "How many cells does <code>np.sum(…, axis=1)</code> add up?", explain: "The sum touches all m × d cells. The compare and <code>np.where</code> are O(m). Total O(m × d): linear in the size of the matrix." },
    { code: `
        # Exam w25 Q6: adj_matrix is n × n, a tree with n machines
        def dfs_route(adj_matrix, start):
            n = len(adj_matrix)
            visited = []
            stack = [start]
            while stack:
                node = stack.pop()
                visited.append(node)
                for nb in range(n - 1, -1, -1):
                    if adj_matrix[node][nb] == 1 and nb not in visited:
                        stack.append(nb)
            return visited`, options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"], answer: 2,
      wrong: { 0: "A tree has only n − 1 edges, but the code still reads a full row of n for each machine.", 3: "Each machine is popped once; nothing branches exponentially." },
      hint: "How many machines are popped? How long is each row scan?", explain: "n machines × a row of n = O(n²). <code>nb not in visited</code> is O(n) on a list, but <code>and</code> only runs it for real neighbours (2(n − 1) times in a tree), so that adds another O(n²) at most. With an adjacency list it would be O(n + edges)." },
  ];
  function drillWidget(el, api) {
    const KEY = "alg:bigo-drill";
    let done = api.store.get(KEY, {}) || {}, k = 0;
    const nav = h("div", { class: "row-wrap", role: "group", "aria-label": "Snippet" });
    const codeBox = h("div"), opts = h("div", { class: "row-wrap", style: "margin-top:10px" });
    const fb = h("p", { class: "alg-now", "aria-live": "polite" }), score = h("p", { class: "small muted", style: "margin:6px 0 0" });
    const navBtns = DRILL.map((_, i) => btn(String(i + 1), () => show(i), "btn small"));
    nav.append(...navBtns);
    const hintBtn = btn("Hint", () => { fb.innerHTML = "<b>Hint:</b> " + DRILL[k].hint; });
    const nextBtn = btn("Next ▶", () => show((k + 1) % DRILL.length));
    function paint() {
      navBtns.forEach((b, i) => { b.setAttribute("aria-pressed", String(i === k)); b.textContent = String(i + 1) + (done[i] ? " ✓" : ""); });
      const first = Object.values(done).filter(v => v === "first").length, any = Object.keys(done).length;
      score.textContent = `${any} / ${DRILL.length} solved, ${first} right on the first try.`;
    }
    function show(i) {
      k = i; let tries = 0;
      const d = DRILL[i];
      codeBox.replaceChildren(ui.code({ code: d.code, nonum: true }));
      fb.innerHTML = `Snippet ${i + 1} of ${DRILL.length}. What is the Big-O (time)? Assume n = len(nums) unless the code says otherwise.`;
      opts.replaceChildren(...d.options.map((o, j) => {
        const b = btn(o, () => {
          tries++;
          if (j === d.answer) {
            b.classList.add("mk-ok"); fb.innerHTML = "<b>Right ✓</b> " + d.explain;
            if (!done[i]) { done[i] = tries === 1 ? "first" : "later"; api.store.set(KEY, done); }
            opts.querySelectorAll("button").forEach(x => (x.disabled = true));
            paint();
          } else {
            b.classList.add("mk-bad"); b.disabled = true;
            fb.innerHTML = "<b>Not " + o + " ✗</b> " + ((d.wrong || {})[j] || "Count again: how many rounds, and what does each round cost?");
          }
        }, "btn");
        return b;
      }));
      paint();
    }
    const reset = btn("Reset score", () => { done = {}; api.store.set(KEY, done); show(0); }, "btn small ghost");
    el.append(nav, h("div", { style: "margin-top:10px" }, codeBox), opts, fb, row(hintBtn, nextBtn, reset), score);
    show(0);
  }

  const bigODrill = {
    id: "big-o-drill",
    title: "Big-O: cheat sheet & exam drill",
    summary: "Every cost on this site in one place, then 17 snippets to practise on, then how to write the answer in the exam.",
    sources: "Ex7; Ex9 M4; Exam w25 Q3, Q5, Q6",
    exam: ["Q3", "Q5", "Q6 analyse"],
    blocks: [
      { type: "callout", kind: "note", title: "First time here?", html: "<p>Start with <a href=\"#algorithms/big-o\">Big-O</a> (double n → ×2, ×4) and <a href=\"#algorithms/big-o-cases\">best/worst, space & recursion</a>.</p>" },

      { type: "h", text: "Cost cheat sheet", sub: "Time unless it says otherwise. “avg” = on average." },
      { type: "switch", label: "Cheat sheet part", items: [
        { label: "Python built-ins", blocks: [{ type: "table", head: ["Operation", "Big-O", "Tiny example"], code: [0], rows: [
          ["nums[i]   nums[i] = x", "O(1)", "nums[3] jumps straight to box 3"],
          ["len(nums)", "O(1)", "Python stores the length"],
          ["nums.append(x)   nums.pop()", "O(1)", "work at the end: nobody moves"],
          ["nums.pop(0)   nums.insert(0, x)", "O(n)", "8 items: the other 7 shift"],
          ["x in nums   nums.index(x)   nums.count(x)", "O(n)", "scans up to all 8"],
          ["nums[a:b]   nums.copy()   out + [x]", "O(k) / O(n)", "copies every item it keeps"],
          ["min(nums)   max(nums)   sum(nums)", "O(n)", "looks at every item once"],
          ["sorted(nums)   nums.sort()", "O(n log n)", "Python's own sort"],
          ["d[key]   d[key] = v   key in d", "O(1) avg", "hash: jumps to the right box"],
          ["x in s   s.add(x)", "O(1) avg", "same idea as a dict"],
          ["dq.append(x)   dq.popleft()", "O(1)", "a deque is open at both ends"],
          ["np.sum(arr)   arr > t   np.where(mask)", "O(n)", "n = number of cells; fast, but not O(1)"],
        ] }] },
        { label: "Data structures", blocks: [{ type: "table", head: ["Structure", "Operation", "Big-O", "Why"], rows: [
          ["Linked list", "insert at the head", "O(1)", "move two arrows"],
          ["Linked list", "find a value / go to position k", "O(n)", "walk from the head, box by box"],
          ["Linked list", "insert after a node you already hold", "O(1)", "no walking needed"],
          ["Stack (list)", "push <code>append</code> / pop <code>pop()</code>", "O(1)", "both at the end"],
          ["Queue (deque)", "<code>append</code> / <code>popleft()</code>", "O(1)", "both ends are cheap"],
          ["Queue (plain list)", "<code>pop(0)</code>", "O(n)", "everyone shifts left"],
          ["BST, balanced", "search / insert", "O(log n)", "1,000 items ≈ 10 levels"],
          ["BST, a chain (built from sorted input)", "search / insert", "O(n)", "every node has one child: n levels"],
          ["Graph, adjacency list", "BFS / DFS", "O(V + E)", "each node once, each edge once or twice"],
          ["Graph, adjacency matrix (exam Q6)", "BFS / DFS", "O(V²)", "each node scans a whole row of V"],
        ] }] },
        { label: "Algorithms", blocks: [{ type: "table", head: ["Algorithm", "Time", "Extra space", "Source"], rows: [
          ["Linear search", "O(n), best O(1)", "O(1)", ""],
          ["Binary search (sorted list!)", "O(log n), best O(1)", "O(1) loop, O(log n) recursive", ""],
          ["Fibonacci, naive recursion", "O(2ⁿ)", "O(n) call stack", ""],
          ["Fibonacci, DP table", "O(n)", "O(n) table", ""],
          ["<code>factorial_sum</code>: no memo / memo", "O(n²) / O(n)", "O(1) / O(n)", "Ex7 Ex2 Hard"],
          ["Tower of Hanoi", "O(2ⁿ): 2ⁿ − 1 moves", "O(n) call stack", "Ex7 Ex1"],
          ["Activity selection (greedy)", "O(n log n): the sort wins over the O(n) pass", "O(n)", "Ex7 Ex3"],
          ["Weighted activities (DP)", "O(n log n): the sorts again", "O(n)", "Ex7 Ex3 Hard"],
          ["Dijkstra (matrix, scan for the nearest, as on this site)", "O(V²)", "O(V)", "<a href=\"#algorithms/dp-greedy\">DP, greedy & Dijkstra</a>"],
          ["BFS / DFS", "O(V + E) list, O(V²) matrix", "O(V)", "<a href=\"#algorithms/dfs-bfs\">DFS & BFS</a>"],
        ] }] },
        { label: "The five sorts", blocks: [() => sortTable(), `<p class="small muted">Ex9 M4 asks for exactly this table. Quick sort's best case is O(n) only when all keys are equal (3-way split).</p>`] },
      ] },

      { type: "h", text: "Drill: state the Big-O", sub: "17 snippets, from easy to exam-shaped. A wrong answer tells you why." },
      { type: "widget", render: drillWidget },

      { type: "h", text: "Writing it in the exam", sub: "The exam says it tests whether you can “design, analyse, debug, and implement”." },
      { type: "callout", kind: "rule", title: "Three sentences", html: "<ol><li><b>Name n</b>: “Let n be the number of machines.”</li><li><b>Count</b>: “The loop runs n times, and each round does … (O(1) work / a scan of n).”</li><li><b>Conclude</b>: “So about n × n steps: O(n²) time. Extra memory: … O(n).”</li></ol>" },
      { type: "callout", kind: "exam", title: "Worked example: exam Q6, dfs_route", html: "<p>“Let n be the number of machines, so the matrix is n × n. Each machine is pushed and popped once, and for each one the for loop reads its whole row: n checks. So n × n = O(n²) time. <code>visited</code> and <code>stack</code> hold at most n machines: O(n) extra memory.”</p>" },
      `<p>A second, shorter one, for Q3: “<code>process_inventory</code> reads one index, then either subtracts 1 or appends one item. There is no loop, so it takes the same time for 3 items or 3 million: O(1) time and O(1) extra memory.”</p>`,
      {
        type: "tryit",
        title: "Measure it: list vs set",
        task: "Same task, two containers. Run it and read the last column: about ×4 for the list (O(n²)), about ×2 for the set (O(n)). Your times will differ; the ratios are what matter.",
        code: `
          import time

          def count_common(a, b):                # b may be a list or a set
              count = 0
              for x in a:
                  if x in b:                     # list: scan; set: jump
                      count += 1
              return count

          for kind in ["list", "set"]:
              previous = None
              for n in [1000, 2000, 4000]:
                  a = list(range(n))
                  b = list(range(n)) if kind == "list" else set(range(n))
                  start = time.perf_counter()
                  count_common(a, b)
                  t = time.perf_counter() - start
                  ratio = f"x{t / previous:.1f}" if previous else ""
                  print(kind, n, f"{t * 1000:.2f} ms", ratio)
                  previous = t`,
      },
      { type: "mistakes", items: [
        { title: "Not saying what n is", wrong: "It is O(n).", right: "Let n be the number of machines. It is O(n²).", why: "In Q5 there are two sizes (machines and days). The marker needs to know which one you mean." },
        { title: "Treating one line as one step", wrong: "if nb not in visited:   # O(1)", right: "# O(n) on a list; O(1) on a set", why: "<code>in</code>, <code>sum</code>, <code>sorted</code>, slices and <code>pop(0)</code> hide a loop." },
        { title: "Matrix DFS as O(V + E)", wrong: "dfs_route on a tree: n − 1 edges → O(n)", right: "O(n²): each popped machine scans a row of n", why: "With a matrix you pay for the zeros too." },
        { title: "NumPy is O(1)", wrong: "np.sum(usage_matrix, axis=1)   # one line → O(1)", right: "# O(m × d): it adds every cell", why: "NumPy is fast because it loops in C, not because it skips work." },
        { title: "Sorting inside a loop", wrong: "for i in range(n):\n    best = sorted(nums)[-1]", right: "best = max(nums)          # O(n), once", why: "n sorts = O(n² log n)." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "What is the Big-O?", code: `
          for i in range(n):
              for j in range(i, n):
                  print(i, j)`, options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"], answer: 2,
        wrong: { 0: "There is a loop inside a loop, and both depend on n.", 1: "Nothing halves." },
        hint: "n = 4: the inner loop runs 4 + 3 + 2 + 1 times.", explain: "n + (n − 1) + … + 1 = n(n + 1)/2: O(n²)." },
      { type: "mc", q: "Exam Q6 uses an n × n adjacency matrix. What is the time of DFS on it?", options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"], answer: 2,
        wrong: { 0: "That would need an adjacency list. A matrix row is always n long, even for a leaf.", 3: "Each machine is visited once; nothing explodes." },
        hint: "How long is one row? How many rows are read?", explain: "n rows × n columns = O(n²). With an adjacency list it would be O(V + E)." },
      { type: "predict", q: "What does this print?", code: `
          count = 0
          i = 64
          while i > 1:
              i = i // 2
              count += 1
          print(count)`, answer: "6",
        hint: "64 → 32 → 16 → 8 → 4 → 2 → 1.", explain: "6 halvings: log₂ 64 = 6. That is O(log n)." },
      { type: "mc", q: "Which of these is O(1) on average?", options: ["<code>x in my_list</code>", "<code>x in my_set</code>", "<code>my_list.pop(0)</code>", "<code>sorted(my_list)</code>"], answer: 1,
        wrong: { 0: "A list is scanned: O(n).", 2: "Everyone shifts left: O(n).", 3: "Sorting is O(n log n)." },
        hint: "Which container jumps straight to the answer with a hash?", explain: "A set (like a dict) hashes the value and jumps to its box: O(1) on average." },
      { type: "write", q: "This version is O(n²). Write <code>common(a, b)</code> in <b>O(n)</b>: return the items of <code>a</code> (in a's order) that are also in <code>b</code>.",
        starter: `
          def common(a, b):
              result = []
              for x in a:
                  if x in b:                       # O(n) on a list: make this O(1)
                      result.append(x)
              return result

          print(common([1, 2, 3, 4], [4, 1]))      # [1, 4]`,
        checks: [["common([1, 2, 3, 4], [4, 1])", "[1, 4]"], ["common([], [1])", "[]"], ["common([5, 5, 6], [5])", "[5, 5]"]],
        test: "class NoScan(list):\n    def __contains__(self, x):\n        raise AssertionError('x in b still scans the list: make a set from b before the loop')\nassert common([1, 2, 3], NoScan([3, 1])) == [1, 3]",
        solution: `
          def common(a, b):
              b_set = set(b)                       # O(n), once
              result = []
              for x in a:                          # n rounds
                  if x in b_set:                   # O(1) on average
                      result.append(x)
              return result                        # after the loop`,
        hint: "Before the loop: <code>b_set = set(b)</code>. Then ask <code>x in b_set</code>.",
        explain: "Building the set is O(n) once; each lookup is O(1): n + n = O(n)." },
      { type: "explain", q: "Exam style. In 3–4 sentences, state and justify the time and space complexity of <code>dfs_route(adj_matrix, start)</code> (the iterative version with a stack).",
        answer: "<p>Let n be the number of machines, so the adjacency matrix is n × n. Each machine is pushed onto the stack and popped once, because the network is a tree and visited machines are skipped. For every popped machine the for loop reads its whole row of n entries, so the total is n × n = O(n²) time (the <code>not in visited</code> check on a list only runs for real neighbours and adds at most O(n²) more). The visited list and the stack each hold at most n machines, so the extra memory is O(n).</p>",
        points: ["define n = number of machines (n × n matrix)", "each machine popped once", "each pop scans a row of n → O(n²) time", "visited + stack ≤ n → O(n) space", "bonus: a set for visited, or an adjacency list (O(V + E))"],
        hint: "Use the three sentences: name n, count, conclude. Then one line for memory." },
    ],
  };

  /* ================================================================
     TOPIC 11c: Dynamic programming, greedy, Dijkstra
     ================================================================ */
  function tabSteps() {
    const n = 8, F = Array(n + 1).fill(0), S = [];
    S.push({ line: 9, now: "Call <code>fib_table(8)</code>.", vars: { n: "8" }, F: null });
    S.push({ line: 2, now: "A list of 9 zeros: one box per answer, F[0] … F[8].", vars: { n: "8", F: pyrepr(F) }, F: F.slice(), cur: -1 });
    F[1] = 1;
    S.push({ line: 3, now: "Fill in the base cases: F[0] is already 0, and F[1] = 1.", vars: { n: "8", F: pyrepr(F) }, F: F.slice(), cur: 1, upto: 1 });
    for (let i = 2; i <= n; i++) {
      S.push({ line: 4, now: `i = ${i}.`, vars: { n: "8", F: pyrepr(F), i: String(i) }, F: F.slice(), cur: i, look: true, upto: i - 1 });
      F[i] = F[i - 1] + F[i - 2];
      S.push({ line: 5, now: `F[${i}] = F[${i - 1}] + F[${i - 2}] = ${F[i - 1]} + ${F[i - 2]} = <b>${F[i]}</b>. Both were already in the table: no recursion, no repeats.`, vars: { n: "8", F: pyrepr(F), i: String(i) }, F: F.slice(), cur: i, look: true, set: true, upto: i - 1 });
    }
    S.push({ line: 6, now: "Give back F[8] = 21. Seven additions instead of dozens of calls: O(n).", F: F.slice(), cur: 8, upto: 8 });
    S.push({ line: 9, now: "Print it.", print: "21", F: F.slice(), cur: -1, upto: 8 });
    return S;
  }
  function tabVisual(el, st) {
    if (!st.F) { el.appendChild(h("p", { class: "novars" }, "No table yet.")); return; }
    const marks = {}, ptrs = {};
    st.F.forEach((_, i) => { if (st.upto != null && i <= st.upto) marks[i] = "sorted"; });
    if (st.cur >= 0) { marks[st.cur] = st.set ? "done" : "held"; ptrs[st.cur] = "i"; }
    if (st.look) { marks[st.cur - 1] = "cmp"; marks[st.cur - 2] = "cmp"; ptrs[st.cur - 1] = "i-1"; ptrs[st.cur - 2] = "i-2"; }
    el.appendChild(h("div", { class: "alg-scroll" }, D.array(st.F, { name: "F", marks, ptrs })));
  }

  // --- activity selection (Ex7) ---
  const ACTS = [[1, 3], [2, 4], [3, 5], [0, 6], [5, 7], [8, 9], [5, 9], [6, 10]];
  function actWidget(el, api) {
    const sorted = ACTS.slice().sort((a, b) => a[1] - b[1]);   // JS sort is stable, like Python's
    const pr = a => "(" + a.join(", ") + ")";
    const states = [{ cur: -1, picked: [], skip: [], now: "Sorted by <b>finish</b> time. The first one always gets picked: it frees the room earliest." }];
    const picked = [0], skip = [];
    states.push({ cur: 0, picked: [0], skip: [], now: `Pick ${pr(sorted[0])}: it finishes first, at ${sorted[0][1]}.` });
    for (let i = 1; i < sorted.length; i++) {
      const last = sorted[picked[picked.length - 1]];
      const ok = sorted[i][0] >= last[1];
      if (ok) picked.push(i); else skip.push(i);
      states.push({ cur: i, picked: picked.slice(), skip: skip.slice(), now: `${pr(sorted[i])} starts at ${sorted[i][0]}. The last pick ends at ${last[1]}. Is ${sorted[i][0]} ≥ ${last[1]}? ` + (ok ? "<b>Yes: pick it.</b>" : "<b>No: it overlaps. Skip.</b>") });
    }
    states.push({ cur: -1, picked: picked.slice(), skip: skip.slice(), now: `Done: <b>${picked.length} activities</b>: ${picked.map(i => pr(sorted[i])).join(", ")}. One sort O(n log n) + one pass O(n) = O(n log n).` });
    const pic = h("div"), now = h("p", { class: "alg-now", "aria-live": "polite" });
    const ctl = stepCtl(k => {
      const st = states[k];
      const S = D.svg({ w: 480, h: sorted.length * 28 + 34, label: "activities as bars on a time line" });
      const X = t => 96 + t * 36;
      for (let t = 0; t <= 10; t++) { S.line(X(t), 6, X(t), sorted.length * 28 + 10, { tone: "muted", dashed: true, cls: "alg-grid" }); S.text(X(t), sorted.length * 28 + 22, String(t), { muted: true }); }
      sorted.forEach((a, i) => {
        const y = 8 + i * 28, isP = st.picked.includes(i), isS = st.skip.includes(i);
        const tone = isP ? "done" : i === st.cur ? "cmp" : isS ? "swap" : "tile";
        S.text(6, y + 11, pr(a), { anchor: "start", small: true });
        S.box(X(a[0]), y, X(a[1]) - X(a[0]), 22, { tone, faded: isS && i !== st.cur, rx: 5, text: isP ? "picked" : isS ? "skip" : "", size: 11 });
      });
      pic.replaceChildren(S.el); now.innerHTML = st.now;
    }, { ms: 900 });
    api.onCleanup(ctl.stop);
    ctl.setLength(states.length);
    el.append(ctl.el, now, pic, D.legend([["done", "picked"], ["cmp", "looking at"], ["swap", "overlaps: skipped"]]));
    ctl.go(0);
  }

  // --- Dijkstra (part of the Ex7 demo graph: A–G) ---
  const DJ = {
    names: ["A", "B", "C", "D", "E", "F", "G"],
    pos: [[150, 40], [370, 40], [260, 130], [40, 130], [150, 220], [430, 150], [320, 230]],
    edges: [[3, 0, 4], [3, 4, 2], [0, 2, 3], [0, 4, 4], [4, 2, 4], [4, 6, 5], [2, 5, 5], [2, 1, 2], [1, 5, 2], [6, 5, 5]],
  };
  function djSteps() {
    const n = 7, INF = Infinity, M = DJ.names.map(() => Array(n).fill(0));
    DJ.edges.forEach(([a, b, w]) => { M[a][b] = w; M[b][a] = w; });
    const dist = Array(n).fill(INF), visited = Array(n).fill(false), S = [];
    const dtxt = () => "[" + dist.map(d => d === INF ? "inf" : d).join(", ") + "]";
    const snap = o => Object.assign({ dist: dist.slice(), visited: visited.slice(), vars: { dist: dtxt() } }, o);
    dist[3] = 0;
    S.push(snap({ line: 4, now: "Start at D (index 3). Its distance is 0. Every other distance is unknown: infinity.", u: null }));
    for (let r = 0; r < n; r++) {
      let u = null;
      for (let i = 0; i < n; i++) if (!visited[i] && (u === null || dist[i] < dist[u])) u = i;
      visited[u] = true;
      S.push(snap({ line: 12, now: `Round ${r + 1}: the nearest unvisited node is <b>${DJ.names[u]}</b> (distance ${dist[u]}). Its distance is now final.`, u }));
      const ups = [];
      for (let v = 0; v < n; v++) {
        const w = M[u][v];
        if (w !== 0 && !visited[v]) {
          const alt = dist[u] + w, old = dist[v];
          if (alt < old) { dist[v] = alt; ups.push(`${DJ.names[v]}: ${old === INF ? "∞" : old} → <b>${alt}</b> (${dist[u]} + ${w})`); }
          else ups.push(`${DJ.names[v]}: ${dist[u]} + ${w} = ${alt} is not shorter than ${old}, keep ${old}`);
        }
      }
      if (ups.length) S.push(snap({ line: ups.some(x => x.includes("→")) ? 17 : 16, now: "Relax the unvisited neighbours: " + ups.join("; ") + ".", u, relax: true }));
    }
    S.push(snap({ line: 18, now: "All nodes are final. From D: A 4, B 8, C 6, E 2, F 10, G 7.", u: null, print: dtxt() }));
    return S;
  }
  function djVisual(el, st) {
    const nodes = DJ.names.map((nm, i) => ({ id: nm, x: DJ.pos[i][0], y: DJ.pos[i][1], tone: i === st.u ? "accent" : st.visited[i] ? "done" : null }));
    const edges = DJ.edges.map(([a, b, w]) => ({ from: DJ.names[a], to: DJ.names[b], label: String(w), tone: st.relax && ((a === st.u && !st.visited[b]) || (b === st.u && !st.visited[a])) ? "cmp" : null }));
    const svg = D.graph({ w: 470, h: 270, nodes, edges, r: 18, label: "weighted graph A to G" });
    DJ.pos.forEach(([x, y], i) => {   // distance badge at the top-left of each node
      const t = svgEl("text", { x: x - 22, y: y - 20, "text-anchor": "end", class: "alg-dist" });
      t.textContent = st.dist[i] === Infinity ? "∞" : String(st.dist[i]);
      svg.appendChild(t);
    });
    el.append(svg,
      ui.table({ head: ["", ...DJ.names], rows: [["dist", ...st.dist.map((d, i) => (d === Infinity ? "∞" : String(d)) + (st.visited[i] ? " ✓" : ""))]] }));
  }

  const dpGreedy = {
    id: "dp-greedy",
    title: "DP, greedy & Dijkstra",
    summary: "Dynamic programming stores answers to small problems so they are never solved twice. Greedy takes the best-looking choice at each step. Dijkstra is greedy on a graph.",
    sources: "Ex7",
    blocks: [
      { type: "h", text: "Dynamic programming: never solve the same thing twice" },
      { type: "table", head: ["Way", "How", "Fibonacci example"], rows: [
        ["Memoization (top-down)", "normal recursion + a dict of answers already found", "<code>known = {0: 0, 1: 1}</code>; look up before you compute"],
        ["Tabulation (bottom-up)", "a loop fills a table from the smallest case up", "<code>F[i] = F[i - 1] + F[i - 2]</code> for i = 2, 3, …"],
      ] },
      `<p>DP works when a problem has <b>overlapping subproblems</b> (fib(18) is needed by both fib(20) and fib(19)) and <b>optimal substructure</b> (the best answer is built from the best answers to smaller problems). The memo version has its own call-tree widget in <b>Recursion</b>: switch the memo on there.</p>`,
      {
        type: "stepper",
        title: "Tabulation: fill the table left to right",
        code: `
          def fib_table(n):
              F = [0] * (n + 1)              # one box per answer
              F[1] = 1                       # the base cases (F[0] is already 0)
              for i in range(2, n + 1):
                  F[i] = F[i - 1] + F[i - 2] # the two answers before
              return F[n]


          print(fib_table(8))`,
        what: { 2: "n + 1 boxes, because we need F[0] up to F[n].", 4: "From 2, because 0 and 1 are filled in already.", 5: "Both answers it needs are already in the table." },
        steps: tabSteps(),
        visualTitle: "The table F",
        legend: [["held", "being filled"], ["cmp", "the two it reads"], ["sorted", "finished"]],
        visual: tabVisual,
      },

      { type: "h", text: "Greedy: take the best-looking choice and never look back" },
      `<p><b>Activity selection</b> (Ex7): one room, many activities <code>(start, finish)</code>. Fit in as many as possible. The greedy rule: always take the one that <b>finishes first</b> and doesn't overlap.</p>`,
      { type: "widget", title: "Activity selection, step by step", intro: "Ex7's list: <code>[(1, 3), (2, 4), (3, 5), (0, 6), (5, 7), (8, 9), (5, 9), (6, 10)]</code>", render: actWidget },
      { type: "code", code: `
          def activity_selection(activities):
              sorted_activities = sorted(activities, key=lambda a: a[1])   # by finish time
              selected = [sorted_activities[0]]                            # earliest finish

              for i in range(1, len(sorted_activities)):
                  if sorted_activities[i][0] >= selected[-1][1]:           # starts after the last ends
                      selected.append(sorted_activities[i])
              return selected`, caption: "Ex7, Easy" },
      { type: "callout", kind: "warn", title: "When greedy fails: weights (Ex7 Hard)", html: "<p>Give each activity a value, like Ex7's <code>(0, 6, 20)</code> among small ones. Greedy-by-finish still picks <code>(1, 3, 2), (3, 5, 2), (5, 7, 3), (8, 9, 4)</code>: total <b>11</b>. The best plan is <code>(0, 6, 20)</code> + <code>(8, 9, 4)</code>: total <b>24</b>. To find it you need DP: a table <code>best[i]</code> = the best total using only the first i activities.</p>" },

      { type: "h", text: "Dijkstra: shortest paths, greedily", sub: "Always finish the nearest node you haven't finished yet. Weights must not be negative." },
      {
        type: "stepper",
        title: "Dijkstra from D (graph from the Ex7 demo, A–G)",
        code: `
          def dijkstra(adj_matrix, start):
              n = len(adj_matrix)
              dist = [float('inf')] * n            # every distance unknown
              dist[start] = 0                      # the start costs nothing
              visited = [False] * n

              for _ in range(n):
                  u = None                         # find the nearest unvisited node
                  for i in range(n):
                      if not visited[i] and (u is None or dist[i] < dist[u]):
                          u = i
                  visited[u] = True                # its distance is now final

                  for v in range(n):               # look at every neighbour
                      w = adj_matrix[u][v]
                      if w != 0 and not visited[v] and dist[u] + w < dist[v]:
                          dist[v] = dist[u] + w    # found a shorter way
              return dist`,
        what: { 3: "inf means “no path found yet”.", 12: "The greedy choice: the smallest distance among the unvisited nodes.", 17: "Relaxing: a shorter route to v goes through u." },
        steps: djSteps(),
        visualTitle: "Graph (blue number by a node = its distance so far; grey = edge weight)",
        legend: [["held", "chosen now"], ["done", "final"], ["cmp", "edges being relaxed"]],
        visual: djVisual,
      },
      { type: "table", caption: "Recursion vs DP vs greedy", head: ["", "Plain recursion", "Dynamic programming", "Greedy"], rows: [
        ["Idea", "split into smaller copies", "split, and store every answer", "take the best choice now"],
        ["Stores", "nothing", "a memo dict or a table", "only the choices made"],
        ["Looks back?", "no", "yes, reads stored answers", "never"],
        ["Example", "Hanoi, tree DFS", "Fibonacci, weighted activities", "activity selection, Dijkstra"],
        ["Risk", "repeats work (2ⁿ)", "memory for the table", "wrong answer if the problem lacks the greedy property"],
      ] },
      {
        type: "tryit",
        title: "Memo, table and greedy",
        code: `
          known = {0: 0, 1: 1}
          def fibonacci_memo(n):
              if n in known:                  # already solved?
                  return known[n]
              known[n] = fibonacci_memo(n - 1) + fibonacci_memo(n - 2)
              return known[n]

          def fib_table(n):
              F = [0] * (n + 1)
              F[1] = 1
              for i in range(2, n + 1):
                  F[i] = F[i - 1] + F[i - 2]
              return F[n]

          print(fibonacci_memo(50), fib_table(50))

          def activity_selection(activities):
              sorted_activities = sorted(activities, key=lambda a: a[1])
              selected = [sorted_activities[0]]
              for i in range(1, len(sorted_activities)):
                  if sorted_activities[i][0] >= selected[-1][1]:
                      selected.append(sorted_activities[i])
              return selected

          print(activity_selection([(1, 3), (2, 4), (3, 5), (0, 6), (5, 7), (8, 9), (5, 9), (6, 10)]))`,
      },
      { type: "mistakes", items: [
        { title: "Making the memo inside the function", wrong: "def fib_memo(n):\n    known = {0: 0, 1: 1}", right: "known = {0: 0, 1: 1}\ndef fib_memo(n):", why: "Inside, a fresh memo is made on every call, so nothing is ever remembered between calls." },
        { title: "Greedy by start time", wrong: "sorted(activities, key=lambda a: a[0])", right: "sorted(activities, key=lambda a: a[1])", why: "Starting early can mean finishing late: (0, 6) would block three others." },
        { title: "Forgetting a base case in the table", wrong: "F = [0] * (n + 1)\nfor i in range(2, n + 1): ...", right: "F = [0] * (n + 1)\nF[1] = 1", why: "Without F[1] = 1 every box stays 0." },
        { title: "Table one box too short", wrong: "F = [0] * n\nreturn F[n]", right: "F = [0] * (n + 1)", why: "Indexes go 0 … n: that is n + 1 boxes. Otherwise IndexError." },
        { title: "Dijkstra with negative weights", wrong: "an edge with weight -3", right: "all weights ≥ 0", why: "Dijkstra marks a node final early. A negative edge found later could still make it shorter." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: `
          def fib_table(n):
              F = [0] * (n + 1)
              F[1] = 1
              for i in range(2, n + 1):
                  F[i] = F[i - 1] + F[i - 2]
              return F

          print(fib_table(6))`, answer: "[0, 1, 1, 2, 3, 5, 8]",
        hint: "Each box is the sum of the two before it.", explain: "0, 1, then 0+1 = 1, 1+1 = 2, 1+2 = 3, 2+3 = 5, 3+5 = 8. This version returns the whole list." },
      { type: "mc", q: "Activities <code>[(0, 5), (1, 2), (3, 4), (5, 6)]</code>. Which does greedy (earliest finish) pick?", options: ["(0, 5), (5, 6)", "(1, 2), (3, 4), (5, 6)", "(0, 5) only", "all four"], answer: 1,
        hint: "Sort by finish: (1, 2), (3, 4), (0, 5), (5, 6).", explain: "(1, 2) first. (3, 4) starts at 3 ≥ 2: pick. (0, 5) starts at 0 &lt; 4: skip. (5, 6) starts at 5 ≥ 4: pick. Three activities." },
      { type: "mc", q: "Which problem is a good fit for dynamic programming?", options: ["Finding the largest item in a list", "Fibonacci, where the same smaller answers are needed again and again", "Printing a list", "Reading a CSV file"], answer: 1,
        hint: "DP pays off when subproblems overlap.", explain: "Fibonacci needs fib(k) many times. Storing each once turns O(2ⁿ) into O(n)." },
      { type: "mc", q: "In the Dijkstra stepper, after D (0) is finished, the distances are E 2, A 4, the rest ∞. Which node does Dijkstra finish next?", options: ["A", "E", "C", "G"], answer: 1,
        hint: "Greedy: the smallest distance among the unvisited nodes.", explain: "E has 2, the smallest. It can never get shorter, because every other route already costs at least 2 to start." },
      { type: "write", q: "Write <code>climb(n)</code>: the number of ways to climb <code>n</code> stairs taking 1 or 2 steps at a time. <code>climb(1)</code> is 1, <code>climb(2)</code> is 2, and <code>climb(n) = climb(n - 1) + climb(n - 2)</code>. Use a table or a memo so that <code>climb(40)</code> is fast.",
        starter: `
          def climb(n):
              pass

          print(climb(4))     # 5`,
        checks: [["climb(1)", "1"], ["climb(2)", "2"], ["climb(4)", "5"], ["climb(10)", "89"], ["climb(40)", "165580141"]],
        solution: `
          def climb(n):
              if n <= 2:                       # base cases: 1 way, 2 ways
                  return n
              ways = [0] * (n + 1)             # the table
              ways[1], ways[2] = 1, 2
              for i in range(3, n + 1):
                  ways[i] = ways[i - 1] + ways[i - 2]   # the last step was 1 or 2
              return ways[n]`,
        hint: "It is Fibonacci in disguise. Copy <code>fib_table</code> and change the base cases.",
        explain: "Your last step was 1 stair (with climb(n − 1) ways before it) or 2 stairs (climb(n − 2) ways). Without a table, climb(40) would make hundreds of millions of calls." },
    ],
  };

  /* ================================================================
     TOPIC 15a: Searching
     ================================================================ */
  const SV = [3, 7, 11, 14, 18, 21, 25, 29, 33, 38, 41, 47, 52, 58, 63, 70];
  function linStates(t) {
    const S = [];
    for (let i = 0; i < SV.length; i++) { S.push({ i, hit: SV[i] === t }); if (SV[i] === t) return S; }
    S.push({ i: SV.length, miss: true });
    return S;
  }
  function binStates(t) {
    const S = [];
    let l = 0, r = SV.length - 1;
    while (l <= r) {
      const m = Math.floor((l + r) / 2);
      const rel = SV[m] === t ? "eq" : SV[m] < t ? "lt" : "gt";
      S.push({ l, r, m, rel });
      if (rel === "eq") return S;
      if (rel === "lt") l = m + 1; else r = m - 1;
    }
    S.push({ l, r, miss: true });
    return S;
  }
  const addPtr = (ptrs, i, s) => { if (i >= 0 && i < SV.length) ptrs[i] = ptrs[i] ? ptrs[i] + "/" + s : s; };
  function raceWidget(el, api) {
    let t = 47, L = [], B = [];
    const sel = h("select", { class: "input", id: "alg-race-t" }, SV.concat([40]).map(v => h("option", { value: String(v) }, v === 40 ? "40 (not in the list)" : String(v))));
    sel.value = "47";
    const linBox = h("div", { class: "alg-scroll" }), binBox = h("div", { class: "alg-scroll" });
    const linTxt = h("p", { class: "small", "aria-live": "polite" }), binTxt = h("p", { class: "small", "aria-live": "polite" });
    const ctl = stepCtl(render, { ms: 800 });
    api.onCleanup(ctl.stop);
    sel.onchange = () => { t = +sel.value; build(); };
    function build() { L = linStates(t); B = binStates(t); ctl.setLength(Math.max(L.length, B.length) + 1); ctl.go(0); }
    function render(k) {
      const lm = {}, lp = {};
      const li = Math.min(k, L.length) - 1, ls = L[li];
      for (let j = 0; j < li && j < SV.length; j++) lm[j] = "dim";
      if (ls && ls.i < SV.length) { lm[ls.i] = ls.hit ? "done" : "cmp"; lp[ls.i] = "i"; }
      if (ls && ls.miss) SV.forEach((_, j) => (lm[j] = "dim"));
      linBox.replaceChildren(D.array(SV, { marks: lm, ptrs: lp }));
      const lc = Math.min(k, L.filter(s => !s.miss).length);
      linTxt.innerHTML = !ls ? "Starts at index 0." : ls.miss ? `Reached the end: <b>not found</b>, return -1. Checks: <b>${lc}</b>.` : ls.hit ? `values[${ls.i}] is ${t}: <b>found ✓</b> after <b>${lc}</b> check${lc === 1 ? "" : "s"}.` : `values[${ls.i}] = ${SV[ls.i]} is not ${t}. Next one. Checks: ${lc}.`;
      const bm = {}, bp = {};
      const bs = B[Math.min(k, B.length) - 1];
      if (bs) {
        SV.forEach((_, j) => { if (j < bs.l || j > bs.r) bm[j] = "dim"; });
        if (!bs.miss) { bm[bs.m] = bs.rel === "eq" ? "done" : "cmp"; addPtr(bp, bs.l, "L"); addPtr(bp, bs.r, "R"); addPtr(bp, bs.m, "mid"); }
      }
      binBox.replaceChildren(D.array(SV, { marks: bm, ptrs: bp }));
      const bc = Math.min(k, B.filter(s => !s.miss).length);
      binTxt.innerHTML = !bs ? "left = 0, right = 15: the whole list." : bs.miss ? `left (${bs.l}) is past right (${bs.r}): nothing left to look at. <b>Not found</b>, return -1. Checks: <b>${bc}</b>.` :
        bs.rel === "eq" ? `mid = (${bs.l} + ${bs.r}) // 2 = ${bs.m}. values[${bs.m}] is ${t}: <b>found ✓</b> after <b>${bc}</b> check${bc === 1 ? "" : "s"}.` :
        `mid = (${bs.l} + ${bs.r}) // 2 = ${bs.m}. values[${bs.m}] = ${SV[bs.m]} is ${bs.rel === "lt" ? "smaller" : "bigger"} than ${t}, so throw away the ${bs.rel === "lt" ? "left" : "right"} half: ${bs.rel === "lt" ? `left = ${bs.m + 1}` : `right = ${bs.m - 1}`}.`;
    }
    el.append(row(label("Look for", "alg-race-t"), sel), h("div", { style: "margin-top:8px" }, ctl.el),
      eyebrow("Linear search: one by one", "margin-top:12px"), linBox, linTxt,
      eyebrow("Binary search: halve the range", "margin-top:12px"), binBox, binTxt,
      D.legend([["cmp", "checking"], ["done", "found"], ["dim", "ruled out"]]));
    build();
  }
  function guessWidget(el) {
    let secret, lo, hi, tries, over;
    const hist = [];
    const inp = h("input", { type: "number", class: "input", id: "alg-guess", min: "1", max: "100", style: "width:6em" });
    const out = h("p", { "aria-live": "polite", style: "margin:8px 0 0" });
    const bar = h("div", { class: "alg-range", "aria-hidden": "true" });
    const log = h("p", { class: "small muted mono", style: "margin:6px 0 0" });
    function reset() { secret = 1 + Math.floor(Math.random() * 100); lo = 1; hi = 100; tries = 0; over = false; hist.length = 0; inp.value = ""; out.innerHTML = "I picked a whole number from 1 to 100. Guess it. The best plan: always guess the <b>middle</b> of what is left."; draw(); }
    function guess(g) {
      if (over || !(g >= 1 && g <= 100)) return;
      tries++; hist.push(g);
      if (g === secret) { over = true; lo = hi = g; out.innerHTML = `<b>${g} is right ✓</b> in ${tries} guess${tries === 1 ? "" : "es"}. Always guessing the middle never needs more than <b>7</b>, because 100 → 50 → 25 → 12 → 6 → 3 → 1.`; }
      else if (g < secret) { lo = Math.max(lo, g + 1); out.innerHTML = `${g} is too <b>low</b>. It is between ${lo} and ${hi}.`; }
      else { hi = Math.min(hi, g - 1); out.innerHTML = `${g} is too <b>high</b>. It is between ${lo} and ${hi}.`; }
      draw();
    }
    function draw() {
      bar.replaceChildren(h("span", { class: "alg-range-in", style: `left:${lo - 1}%;width:${hi - lo + 1}%` }));
      log.textContent = hist.length ? "guesses: " + hist.join(", ") + `   (${hi - lo + 1} number${hi === lo ? "" : "s"} left)` : "";
    }
    const go = btn("Guess", () => guess(Math.trunc(+inp.value)), "btn small primary");
    inp.addEventListener("keydown", e => { if (e.key === "Enter") guess(Math.trunc(+inp.value)); });
    const mid = btn("Guess the middle for me", () => { if (!over) { const m = Math.floor((lo + hi) / 2); inp.value = m; guess(m); } });
    el.append(row(label("Your guess", "alg-guess"), inp, go, mid, btn("New number", reset)), out, bar, log);
    reset();
  }
  function bsSteps(t) {
    const S = [{ line: 13, now: `Call <code>binary_search(values, ${t})</code>.`, vars: { target: String(t) }, st: null }];
    let l = 0, r = 15;
    const V = m => Object.assign({ target: String(t), left: String(l), right: String(r) }, m != null ? { mid: String(m) } : {});
    S.push({ line: 2, now: "The whole list is still possible: left = 0, right = 15.", vars: V(), st: { l, r } });
    for (;;) {
      if (!(l <= r)) { S.push({ line: 3, now: `Is ${l} &lt;= ${r}? <b>No.</b> The range is empty.`, st: { l, r, empty: true } }); break; }
      S.push({ line: 3, now: `Is ${l} &lt;= ${r}? Yes: ${r - l + 1} item${r === l ? "" : "s"} still possible.`, st: { l, r } });
      const m = Math.floor((l + r) / 2);
      S.push({ line: 4, now: `mid = (${l} + ${r}) // 2 = <b>${m}</b>. values[${m}] is ${SV[m]}.`, vars: V(m), st: { l, r, m } });
      if (SV[m] === t) {
        S.push({ line: 5, now: `${SV[m]} == ${t}? <b>Yes!</b>`, st: { l, r, m, hit: true } });
        S.push({ line: 6, now: `Give back the index ${m}.`, st: { l, r, m, hit: true } });
        S.push({ line: 13, now: "Print it.", print: String(m), st: { l, r, m, hit: true } });
        return S;
      }
      S.push({ line: 5, now: `${SV[m]} == ${t}? No.`, st: { l, r, m } });
      if (SV[m] < t) { S.push({ line: 7, now: `${SV[m]} &lt; ${t}: the target must be to the <b>right</b> of mid.`, st: { l, r, m } }); l = m + 1; S.push({ line: 8, now: `left = ${m} + 1 = <b>${l}</b>. Everything up to mid is thrown away.`, vars: V(m), st: { l, r } }); }
      else { S.push({ line: 9, now: `${SV[m]} &gt; ${t}: the target must be to the <b>left</b> of mid.`, st: { l, r, m } }); r = m - 1; S.push({ line: 10, now: `right = ${m} − 1 = <b>${r}</b>. Everything from mid on is thrown away.`, vars: V(m), st: { l, r } }); }
    }
    S.push({ line: 11, now: "Not in the list: give back -1.", st: { l, r, empty: true } });
    S.push({ line: 13, now: "Print it.", print: "-1", st: { l, r, empty: true } });
    return S;
  }
  function bsVisual(el, st) {
    const marks = {}, ptrs = {};
    if (st.st) {
      const { l, r, m, hit } = st.st;
      SV.forEach((_, j) => { if (j < l || j > r) marks[j] = "dim"; });
      if (m != null) marks[m] = hit ? "done" : "cmp";
      addPtr(ptrs, l, "L"); addPtr(ptrs, r, "R"); if (m != null) addPtr(ptrs, m, "mid");
    }
    el.append(h("div", { class: "alg-scroll" }, D.array(SV, { name: "values", marks, ptrs })),
      h("p", { class: "small muted", style: "margin:6px 0 0" }, "Rule: if the target is in the list at all, it is between L and R."));
  }
  const BS_FN = `
    def binary_search(values, target):
        left, right = 0, len(values) - 1
        while left <= right:                 # something left to look at
            mid = (left + right) // 2        # the middle (a whole number)
            if values[mid] == target:
                return mid                   # found: give back the index
            if values[mid] < target:
                left = mid + 1               # throw away the left half
            else:
                right = mid - 1              # throw away the right half
        return -1                            # after the loop: not found`;
  const BS_CODE = BS_FN + `

    values = [3, 7, 11, 14, 18, 21, 25, 29, 33, 38, 41, 47, 52, 58, 63, 70]
    print(binary_search(values, TARGET))`;

  const searching = {
    id: "searching",
    title: "Searching",
    summary: "Linear search checks one item at a time: O(n). Binary search halves a <b>sorted</b> list each step: O(log n).",
    sources: "",
    blocks: [
      { type: "h", text: "Two ways to find something" },
      { type: "table", head: ["", "Linear search", "Binary search"], rows: [
        ["Needs", "any list", "a <b>sorted</b> list"],
        ["How", "check index 0, 1, 2, … until found", "check the middle, throw away the half it can't be in"],
        ["Best case", "O(1): it is the first one", "O(1): it is the middle one"],
        ["Worst case", "O(n): look at everything", "O(log n): halve until nothing is left"],
        ["16 items, worst", "16 checks", "5 checks"],
        ["1,024 items, worst", "1,024 checks", "11 checks"],
        ["1,000,000 items, worst", "1,000,000 checks", "20 checks"],
      ] },
      { type: "widget", title: "Guess my number", intro: "This is binary search, with you as the computer.", render: guessWidget },
      { type: "widget", title: "Linear vs binary, side by side", intro: "Pick a target and press Step. Both searches make one check per step.", render: raceWidget },
      { type: "h", text: "Binary search, line by line" },
      { type: "switch", label: "Target", items: [
        { label: "Find 47 (found)", blocks: [{ type: "stepper", title: "binary_search(values, 47)", code: BS_CODE.replace("TARGET", "47"), steps: bsSteps(47), visualTitle: "The range [L, R]", legend: [["cmp", "values[mid]"], ["done", "found"], ["dim", "thrown away"]], visual: bsVisual,
          what: { 2: "L and R mark the part of the list where the target can still be.", 4: "// keeps it a whole number: an index must be an int." } }] },
        { label: "Find 40 (missing)", blocks: [{ type: "stepper", title: "binary_search(values, 40)", code: BS_CODE.replace("TARGET", "40"), steps: bsSteps(40), visualTitle: "The range [L, R]", legend: [["cmp", "values[mid]"], ["dim", "thrown away"]], visual: bsVisual,
          what: { 3: "When left passes right, the range is empty: the target is not there.", 11: "Only after the loop. Inside the loop it would be too early." } }] },
      ] },
      { type: "code", code: `
          def linear_search(values, target):
              for i, value in enumerate(values):   # index and value together
                  if value == target:
                      return i                     # found: stop right here
              return -1                            # after the loop: checked them all`, caption: "Linear search" },
      { type: "callout", kind: "tip", title: "Sort first?", html: "<p>Sorting costs O(n log n), more than one linear search (O(n)). So for <b>one</b> search, don't sort. For <b>many</b> searches in the same data, sort once and use binary search every time. Tiny example: 1,000 searches in 1,000,000 items: linear is up to 1,000,000,000 checks; sorting once (about 20,000,000 steps) + 1,000 binary searches (20,000 checks) is far less.</p>" },
      {
        type: "tryit",
        title: "Count the checks",
        task: "Run it. Then search for a number that is not there, like 7.",
        code: `
          def linear_search(values, target):
              checks = 0
              for i, value in enumerate(values):
                  checks += 1
                  if value == target:
                      return i, checks
              return -1, checks

          def binary_search(values, target):
              checks = 0
              left, right = 0, len(values) - 1
              while left <= right:
                  mid = (left + right) // 2
                  checks += 1
                  if values[mid] == target:
                      return mid, checks
                  if values[mid] < target:
                      left = mid + 1
                  else:
                      right = mid - 1
              return -1, checks

          values = list(range(0, 2_000_000, 2))      # 1,000,000 even numbers
          print(linear_search(values, 1_999_998))    # (index, checks)
          print(binary_search(values, 1_999_998))`,
      },
      { type: "mistakes", items: [
        { title: "<code>return -1</code> inside the loop", wrong: "for i, v in enumerate(values):\n    if v == target:\n        return i\n    else:\n        return -1", right: "for i, v in enumerate(values):\n    if v == target:\n        return i\nreturn -1", why: "The else version gives up after looking at index 0. “Not found” is only known <b>after</b> the loop." },
        { title: "Binary search on an unsorted list", wrong: "binary_search([5, 1, 4], 1)", right: "binary_search(sorted([5, 1, 4]), 1)", why: "Throwing away a half only works if smaller items are on the left. Here it gives -1 although 1 is there." },
        { title: "<code>/</code> instead of <code>//</code>", wrong: "mid = (left + right) / 2", right: "mid = (left + right) // 2", why: "<code>/</code> gives a float: <code>TypeError: list indices must be integers or slices, not float</code>." },
        { title: "<code>left = mid</code>", wrong: "left = mid", right: "left = mid + 1", why: "mid was already checked. With <code>left = mid</code> the range can stop shrinking: an infinite loop." },
        { title: "<code>while left &lt; right</code>", wrong: "while left < right:", right: "while left <= right:", why: "When one item is left (left == right) it is never checked." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "A sorted list has 1,000,000 items. About how many checks does binary search need in the worst case?", options: ["about 20", "about 1,000", "about 500,000", "1,000,000"], answer: 0,
        hint: "How many times can you halve a million? 2¹⁰ ≈ 1,000.", explain: "2²⁰ ≈ 1,000,000, so about 20 halvings." },
      { type: "predict", q: "Binary search for 21 in <code>[3, 7, 11, 14, 18, 21, 25]</code>. What does this print?", code: `
          values = [3, 7, 11, 14, 18, 21, 25]
          left, right = 0, 6
          while left <= right:
              mid = (left + right) // 2
              print(mid, end=" ")
              if values[mid] == 21:
                  break
              if values[mid] < 21:
                  left = mid + 1
              else:
                  right = mid - 1`, answer: "3 5",
        hint: "mid = (0 + 6) // 2 = 3 first. values[3] is 14.", explain: "mid 3: 14 &lt; 21, so left = 4. mid = (4 + 6) // 2 = 5: values[5] is 21. Found." },
      { type: "bug", q: "This linear search returns -1 for <code>linear_search([4, 8, 15], 8)</code>. Click the buggy line(s).", code: `
          def linear_search(values, target):
              for i, value in enumerate(values):
                  if value == target:
                      return i
                  else:
                      return -1`,
        bugs: [5, 6], notes: { 5: "the else makes it give up on the very first item", 6: "<code>return -1</code> belongs after the loop, not inside it" },
        fixed: `
          def linear_search(values, target):
              for i, value in enumerate(values):
                  if value == target:
                      return i
              return -1                    # after the loop`,
        hint: "What happens on the very first item, 4?", explain: "4 is not 8, so the else runs and the function ends after one check. Drop the else and move <code>return -1</code> out of the loop." },
      { type: "mc", q: "You will search the same 50,000 customer IDs 10,000 times today. Best plan?", options: ["Linear search every time", "Sort once, then binary search every time", "Sort before every search", "Binary search without sorting"], answer: 1,
        hint: "Sorting costs something once. Searching happens 10,000 times.", explain: "One O(n log n) sort, then 10,000 × about 16 checks. Linear would be 10,000 × up to 50,000 checks." },
      { type: "write", q: "Write <code>binary_search(values, target)</code>. Return the index of <code>target</code> in the sorted list <code>values</code>, or <code>-1</code> if it isn't there.",
        starter: `
          def binary_search(values, target):
              left, right = 0, len(values) - 1
              # loop while there is something left to look at

              return -1

          print(binary_search([3, 7, 11, 14, 18], 14))   # 3`,
        checks: [["binary_search([3, 7, 11, 14, 18], 14)", "3"], ["binary_search([3, 7, 11, 14, 18], 3)", "0"], ["binary_search([3, 7, 11, 14, 18], 18)", "4"], ["binary_search([3, 7, 11, 14, 18], 10)", "-1"], ["binary_search([], 5)", "-1"]],
        solution: BS_FN,
        hint: "<code>while left &lt;= right:</code>, then <code>mid = (left + right) // 2</code> and three cases: equal, smaller, bigger.",
        explain: "Each round either finds it or throws away half the range. <code>return -1</code> sits after the loop." },
    ],
  };

  /* ================================================================
     TOPIC 15b: Sorting (summary; the line-by-line steppers live on the sorting site)
     ================================================================ */
  const SORTS = [
    ["bubble", "Bubble", "swap neighbours that are in the wrong order; the biggest bubbles to the end", "O(n)", "O(n²)", "O(n²)", "O(1)", "yes"],
    ["selection", "Selection", "find the smallest of the rest, swap it to the front", "O(n²)", "O(n²)", "O(n²)", "O(1)", "<b>no</b>"],
    ["insertion", "Insertion", "pick up the next card, slide bigger ones right, drop it in the gap", "O(n)", "O(n²)", "O(n²)", "O(1)", "yes"],
    ["merge", "Merge", "split in halves, sort each half (recursion), merge them", "O(n log n)", "O(n log n)", "O(n log n)", "O(n)", "yes (with <code>&lt;=</code>)"],
    ["quick", "Quick", "pick a pivot, split into less / equal / greater, sort those (recursion)", "O(n log n)", "O(n log n)", "O(n²)", "O(n) for the list version", "list version yes; in-place no"],
  ];
  const sortTable = () => ui.table({ head: ["Sort", "Idea", "Best", "Average", "Worst", "Extra space", "Stable?", ""], rows: SORTS.map(s => [`<b>${s[1]}</b>`, s[2], s[3], s[4], s[5], s[6], s[7], `<a href="#sortviz/${s[0]}">step through</a>`]) });

  // merge sort as a recursion tree
  const MS_NODES = {
    r: { list: "[3, 1, 4, 2]", res: "[1, 2, 3, 4]", x: 160, y: 8, w: 130 },
    L: { list: "[3, 1]", res: "[1, 3]", x: 60, y: 76, w: 90 }, R: { list: "[4, 2]", res: "[2, 4]", x: 290, y: 76, w: 90 },
    LL: { list: "[3]", res: "[3]", x: 10, y: 144, w: 70 }, LR: { list: "[1]", res: "[1]", x: 120, y: 144, w: 70 },
    RL: { list: "[4]", res: "[4]", x: 250, y: 144, w: 70 }, RR: { list: "[2]", res: "[2]", x: 360, y: 144, w: 70 },
  };
  const MS_KIDS = { r: ["L", "R"], L: ["LL", "LR"], R: ["RL", "RR"] };
  function msSteps() {
    const G = { name: "global", vars: {} };
    const F = (list, vars, note) => ({ name: `merge_sort(${list})`, vars: Object.assign({ items: list }, vars), note });
    const top = (v, note) => F("[3, 1, 4, 2]", Object.assign({ mid: "2" }, v || {}), note);
    return [
      { line: 0, now: "<code>merge</code> (glue two sorted lists) is on your sorting site. Here we watch only the <b>recursion</b>.", frames: [G], open: [], done: [] },
      { line: 9, now: "Call merge_sort on the whole list. A new frame.", frames: [G, F("[3, 1, 4, 2]")], open: ["r"], done: [] },
      { line: 4, now: "4 items: not the base case. mid = 4 // 2 = 2.", frames: [G, top()], open: ["r"], done: [] },
      { line: 5, now: "Sort the left half <code>[3, 1]</code> first. This call <b>waits</b> on line 5 until that answer comes back.", frames: [G, top({}, "waiting on line 5"), F("[3, 1]")], open: ["r", "L"], done: [] },
      { line: 4, now: "2 items: not the base case either. mid = 1.", frames: [G, top({}, "waiting on line 5"), F("[3, 1]", { mid: "1" })], open: ["r", "L"], done: [] },
      { line: 3, now: "Its left half <code>[3]</code>: one item is the <b>base case</b>. Return [3] at once.", frames: [G, top({}, "waiting on line 5"), F("[3, 1]", { mid: "1" }, "waiting on line 5"), F("[3]", {}, "base case: returning [3]")], open: ["r", "L", "LL"], done: [] },
      { line: 3, now: "Back in merge_sort([3, 1]): left = [3]. Now its right half <code>[1]</code>: base case, returns [1].", frames: [G, top({}, "waiting on line 5"), F("[3, 1]", { mid: "1", left: "[3]" }, "waiting on line 6"), F("[1]", {}, "base case: returning [1]")], open: ["r", "L", "LR"], done: ["LL"] },
      { line: 7, now: "Both halves are sorted. merge([3], [1]) gives <b>[1, 3]</b>. Return it.", frames: [G, top({}, "waiting on line 5"), F("[3, 1]", { mid: "1", left: "[3]", right: "[1]" }, "returning [1, 3]")], open: ["r", "L"], done: ["LL", "LR"] },
      { line: 6, now: "Back at the top: left = [1, 3]. Now the right half <code>[4, 2]</code>, the same way.", frames: [G, top({ left: "[1, 3]" }, "waiting on line 6"), F("[4, 2]")], open: ["r", "R"], done: ["LL", "LR", "L"] },
      { line: 3, now: "mid = 1. <code>[4]</code>: base case, returns [4].", frames: [G, top({ left: "[1, 3]" }, "waiting on line 6"), F("[4, 2]", { mid: "1" }, "waiting on line 5"), F("[4]", {}, "base case: returning [4]")], open: ["r", "R", "RL"], done: ["LL", "LR", "L"] },
      { line: 3, now: "<code>[2]</code>: base case, returns [2].", frames: [G, top({ left: "[1, 3]" }, "waiting on line 6"), F("[4, 2]", { mid: "1", left: "[4]" }, "waiting on line 6"), F("[2]", {}, "base case: returning [2]")], open: ["r", "R", "RR"], done: ["LL", "LR", "L", "RL"] },
      { line: 7, now: "merge([4], [2]) gives <b>[2, 4]</b>. Return it.", frames: [G, top({ left: "[1, 3]" }, "waiting on line 6"), F("[4, 2]", { mid: "1", left: "[4]", right: "[2]" }, "returning [2, 4]")], open: ["r", "R"], done: ["LL", "LR", "L", "RL", "RR"] },
      { line: 7, now: "Top call: left = [1, 3], right = [2, 4]. merge gives <b>[1, 2, 3, 4]</b>.", frames: [G, top({ left: "[1, 3]", right: "[2, 4]" }, "returning [1, 2, 3, 4]")], open: ["r"], done: ["LL", "LR", "L", "RL", "RR", "R"] },
      { line: 9, now: "All frames are gone. 7 calls in total: 4 base cases and 3 merges.", frames: [G], print: "[1, 2, 3, 4]", open: [], done: ["LL", "LR", "L", "RL", "RR", "R", "r"] },
    ];
  }
  function msVisual(el, st) {
    const S = D.svg({ w: 440, h: 196, label: "merge sort split tree" });
    const topId = st.open[st.open.length - 1];
    Object.keys(MS_KIDS).forEach(p => MS_KIDS[p].forEach(c => { const a = MS_NODES[p], b = MS_NODES[c]; S.line(a.x + a.w / 2, a.y + 46, b.x + b.w / 2, b.y, { tone: "muted", faded: !st.open.includes(c) && !st.done.includes(c) }); }));
    Object.keys(MS_NODES).forEach(id => {
      const n = MS_NODES[id], done = st.done.includes(id), open = st.open.includes(id);
      S.box(n.x, n.y, n.w, 46, { text: n.list, sub: done ? "→ " + n.res : open ? (id === topId ? "running" : "waiting") : "", tone: done ? "done" : id === topId ? "accent" : open ? "cmp" : null, faded: !done && !open, dashed: !done && !open });
    });
    el.appendChild(S.el);
  }

  // stability demo
  const STAB = [["B", 2], ["D", 1], ["C", 2], ["A", 1]];
  function selectionPasses(recs, less) {
    const a = recs.slice(), passes = [];
    for (let i = 0; i < a.length - 1; i++) {
      let m = i;
      for (let j = i + 1; j < a.length; j++) if (less(a[j], a[m])) m = j;
      [a[i], a[m]] = [a[m], a[i]];
      passes.push({ i, m, swapped: m !== i, after: a.slice() });
    }
    return passes;
  }
  function stabilityWidget(el) {
    const box = h("div");
    const chip = (r, mark) => h("span", { class: "alg-rec alg-rec-" + r[0] + (mark ? " mk-" + mark : "") }, r[0] + r[1]);
    const recRow = (recs, marks) => h("div", { class: "alg-recs" }, recs.map((r, i) => chip(r, (marks || {})[i])));
    const s = seg(["sorted() (stable)", "selection sort", "selection + tie-break key"], i => draw(i), 0, "Sort used");
    function draw(i) {
      const kids = [eyebrow("Start: records (letter, number). Sort by the number."), recRow(STAB)];
      if (i === 0) {
        const out = STAB.map((r, k) => [r, k]).sort((x, y) => x[0][1] - y[0][1] || x[1] - y[1]).map(x => x[0]);
        kids.push(h("div", { style: "margin-top:10px" }, ui.code({ code: "sorted(records, key=lambda r: r[1])", nonum: true })), eyebrow("Result", "margin-top:10px"), recRow(out),
          h("p", { html: "<b>Stable ✓</b> In the input, D1 came before A1, and B2 before C2. They still do." }));
      } else {
        const less = i === 1 ? (a, b) => a[1] < b[1] : (a, b) => a[1] < b[1] || (a[1] === b[1] && a[0] < b[0]);
        const passes = selectionPasses(STAB, less);
        kids.push(h("div", { style: "margin-top:10px" }, ui.code({ code: i === 1 ? "selection_sort(records, key=lambda r: r[1])" : "selection_sort(records, key=lambda r: (r[1], r[0]))   # ties: by letter", nonum: true })));
        passes.forEach(p => {
          const m = { [p.i]: "held" }; if (p.swapped) m[p.m] = "swap";
          kids.push(h("div", { class: "alg-pass" }, h("span", { class: "small muted" }, `pass ${p.i + 1}: ` + (p.swapped ? `swap index ${p.i} ↔ ${p.m}` : "no swap")), recRow(p.after, m)));
        });
        const fin = passes[passes.length - 1].after;
        kids.push(h("p", { html: i === 1 ? "<b>Not stable ✗</b> B2 started before C2, but ends up <b>after</b> it. Pass 2 swapped B2 over a long distance, jumping past C2." : `Same algorithm, but now no two keys are equal: (2, 'B') &lt; (2, 'C'). The key decides the whole order, so stability no longer matters: ${fin.map(r => r[0] + r[1]).join(", ")}.` }));
      }
      box.replaceChildren(...kids);
    }
    el.append(s.el, h("div", { style: "margin-top:10px" }, box));
    draw(0);
  }

  // key=lambda explorer (Ex9 sensor records)
  const RECS = [["S03", 45], ["S07", 79], ["S01", 45], ["S05", 13], ["S02", 79], ["S04", 21]];
  const KEYS = [
    { code: "sorted(records, key=lambda r: r[1])", key: r => [r[1]], show: r => String(r[1]), note: "Low volume first. Ties (45 and 45) keep their input order: S03 before S01." },
    { code: "sorted(records, key=lambda r: r[1], reverse=True)", key: r => [r[1]], rev: true, show: r => String(r[1]), note: "Busiest first. Ties still keep their input order (S07 before S02), not ID order." },
    { code: "sorted(records, key=lambda r: (-r[1], r[0]))", key: r => [-r[1], r[0]], show: r => `(${-r[1]}, '${r[0]}')`, note: "<b>Ex9's priority_key.</b> −79 &lt; −45, so busy comes first. Ties are broken by ID, A→Z: S02 before S07." },
    { code: "sorted(records, key=lambda r: (r[1], r[0]))[::-1]", key: r => [r[1], r[0]], flip: true, show: r => `(${r[1]}, '${r[0]}')`, note: "Reversing the whole result also reverses the ties: S07 before S02. Ex9 H1 warned: don't do this." },
    { code: "sorted(records, key=lambda r: r[0])", key: r => [r[0]], show: r => `'${r[0]}'`, note: "By sensor ID only. Strings compare letter by letter." },
  ];
  const cmp1 = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
  function keyWidget(el) {
    const box = h("div");
    const s = seg(KEYS.map((_, i) => "key " + (i + 1)), i => draw(i), 2, "Key function");
    function draw(i) {
      const K = KEYS[i];
      const cmp = (a, b) => { const x = K.key(a), y = K.key(b); for (let j = 0; j < x.length; j++) { const c = cmp1(x[j], y[j]); if (c) return c; } return 0; };
      let out = RECS.map((r, k) => [r, k]).sort((a, b) => (K.rev ? -cmp(a[0], b[0]) : cmp(a[0], b[0])) || a[1] - b[1]).map(x => x[0]);
      if (K.flip) out = out.reverse();
      box.replaceChildren(ui.code({ code: K.code, nonum: true }),
        h("div", { class: "alg-two", style: "margin-top:10px" },
          ui.table({ caption: "Input, and the key Python compares", head: ["record", "key(record)"], code: [0, 1], rows: RECS.map(r => [`('${r[0]}', ${r[1]})`, K.show(r)]) }),
          ui.table({ caption: "Result", head: ["#", "record"], code: [1], rows: out.map((r, k) => [String(k + 1), `('${r[0]}', ${r[1]})`]) })),
        h("p", { style: "margin:8px 0 0", html: K.note }));
    }
    el.append(s.el, h("div", { style: "margin-top:10px" }, box));
    draw(2);
  }

  const sorting = {
    id: "sorting",
    title: "Sorting",
    summary: "The five sorts in one table, merge sort's recursion, stability, and <code>key=lambda</code>. Step through each sort line by line on your sorting site.",
    sources: "NB §27; Ex9",
    blocks: [
      { type: "callout", kind: "note", title: "Line-by-line steppers", html: `<p>The Sorting visualizer tab has a stepper for every sort below, plus a Big-O tab with curves. <a href="#sortviz">Open the Sorting visualizer</a> · <a href="#sortviz/bigo">Big-O curves</a></p>` },
      { type: "h", text: "The five sorts at a glance" },
      sortTable,
      { type: "table", caption: "What Big-O meant in your Ex9 benchmark", head: ["Sort", "Big-O", "n doubled (50 → 100 → 200 → 400)"], rows: [
        ["bubble, selection, insertion", "O(n²)", "about <b>×4</b> each time"],
        ["merge, <code>sorted()</code>", "O(n log n)", "about <b>×2.3</b> each time"],
      ] },
      { type: "table", caption: "Which sort when", head: ["Situation", "Pick", "Why"], rows: [
        ["Real code", "<code>sorted()</code> / <code>.sort()</code>", "O(n log n), stable, already written"],
        ["Nearly sorted list", "insertion", "O(n) best case: almost nothing slides"],
        ["Must be O(n log n) every time", "merge", "never worse; costs O(n) extra space"],
        ["Small list, teaching", "bubble / selection", "simple; O(n²) is fine for 10 items"],
      ] },

      { type: "h", text: "Merge sort is recursion", sub: "Your notes said merge/quick recursion was not clear yet. Here is only the recursion, nothing else." },
      { type: "stepper", title: "merge_sort([3, 1, 4, 2]): the calls",
        code: `
          def merge_sort(items):
              if len(items) <= 1:              # base case: 0 or 1 item is sorted
                  return items
              mid = len(items) // 2
              left = merge_sort(items[:mid])   # sort the left half (a smaller problem)
              right = merge_sort(items[mid:])  # sort the right half
              return merge(left, right)        # glue two sorted halves

          print(merge_sort([3, 1, 4, 2]))`,
        what: { 2: "Same shape as factorial: check the base case first.", 5: "This call waits here until the whole left half is sorted.", 6: "Then it waits here for the right half.", 7: "Both halves are sorted now: merge them in O(n)." },
        steps: msSteps(), visualTitle: "The split tree (→ = what the call gave back)", legend: [["held", "running"], ["cmp", "waiting"], ["done", "returned"]], visual: msVisual },
      { type: "table", caption: "Quick sort: one split, by hand", head: ["items", "pivot", "less", "equal", "greater"], code: [0, 2, 3, 4], rows: [
        ["[4, 7, 2, 5, 1, 6, 3]", "5 (the middle item)", "[4, 2, 1, 3]", "[5]", "[7, 6]"],
        ["[2, 3, 4, 5]", "2 (if the first item is used)", "[]", "[2]", "[3, 4, 5]"],
      ] },
      `<p>Then quick sort calls itself on <code>less</code> and <code>greater</code>, and glues <code>less + equal + greater</code>. Base case: 0 or 1 item. Lopsided splits like the second row, every time, make it O(n²).</p>`,

      { type: "h", text: "Stable or not?", sub: "Stable = items with equal keys keep the order they had in the input." },
      { type: "widget", render: stabilityWidget },

      { type: "h", text: "key=lambda: tell sorted() what to compare" },
      { type: "table", head: ["You write", "Python compares", "Tiny example"], code: [0], rows: [
        ["key=lambda r: r[1]", "the 2nd field", "('S05', 13) comes before ('S04', 21)"],
        ["key=lambda r: -r[1]", "minus the 2nd field: big first", "−79 &lt; −45"],
        ["key=lambda r: (-r[1], r[0])", "a tuple: the first part, and on a tie the second", "(−79, 'S02') &lt; (−79, 'S07')"],
        ["reverse=True", "the same key, backwards", "ties keep their input order"],
      ] },
      { type: "widget", title: "Ex9's sensor records", intro: "Pick a key. The left table shows what Python actually compares.", render: keyWidget },
      {
        type: "tryit",
        title: "priority_key on Ex9's sensors",
        code: `
          import random
          RNG = random.Random(42)
          VOLUMES = [RNG.randint(10, 95) for _ in range(16)]
          SENSORS = [(f"S{i:02d}", volume) for i, volume in enumerate(VOLUMES)]

          priority_key = lambda r: (-r[1], r[0])   # busiest first, ties by ID

          ranked = sorted(SENSORS, key=priority_key)
          print(ranked[:5])

          nums = [3, 1, 2]
          print(nums.sort())                        # .sort() changes nums, gives back None
          print(nums)`,
      },
      { type: "mistakes", items: [
        { title: "A key that is not a function", wrong: "sorted(records, key=r[1])", right: "sorted(records, key=lambda r: r[1])", why: "<code>key=</code> needs a function to call on each item. <code>r</code> doesn't exist out here: NameError." },
        { title: "Storing the result of <code>.sort()</code>", wrong: "nums = nums.sort()", right: "nums.sort()\n# or: nums = sorted(nums)", why: "<code>.sort()</code> sorts in place and gives back None, so nums becomes None." },
        { title: "Reversing the whole result for “descending”", wrong: "sorted(recs, key=lambda r: (r[1], r[0]))[::-1]", right: "sorted(recs, key=lambda r: (-r[1], r[0]))", why: "Reversing also flips the ID tie-break (Ex9 H1)." },
        { title: "Merge with <code>&lt;</code> instead of <code>&lt;=</code>", wrong: "if left[i] < right[j]:", right: "if left[i] <= right[j]:", why: "On a tie, <code>&lt;</code> takes from the right pile first, so equal items swap order: not stable." },
        { title: "Missing base case in merge sort", wrong: "def merge_sort(items):\n    mid = len(items) // 2", right: "def merge_sort(items):\n    if len(items) <= 1:\n        return items", why: "A 1-item list splits into [] and [x] forever: RecursionError." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: `
          pets = [("cat", 3), ("dog", 1), ("emu", 3), ("ant", 2)]
          print(sorted(pets, key=lambda p: p[1]))`, answer: "[('dog', 1), ('ant', 2), ('cat', 3), ('emu', 3)]",
        hint: "Sort by the number. <code>sorted()</code> is stable: what happens to the two 3s?", explain: "1, 2, 3, 3. cat was before emu in the input, so it stays before emu." },
      { type: "predict", q: "What does this print?", code: `
          nums = [3, 1, 2]
          result = nums.sort()
          print(result, nums)`, answer: "None [1, 2, 3]",
        hint: "Does <code>.sort()</code> give back a list?", explain: "<code>.sort()</code> changes the list itself and gives back None. Use <code>sorted(nums)</code> if you want a new list back." },
      { type: "mc", q: "Which of these sorts is <b>not</b> stable?", options: ["Bubble sort", "Insertion sort", "Selection sort", "Merge sort (with <code>&lt;=</code>)"], answer: 2,
        hint: "Which one swaps items over a long distance?", explain: "Selection sort swaps the minimum to the front, and that swap can throw an item past an equal one." },
      { type: "mc", q: "A list of 10,000 timestamps is already sorted except for 3 new ones at the end. Which sort is fastest?", options: ["Selection sort", "Insertion sort", "Bubble sort without early exit", "Quick sort with the first item as pivot"], answer: 1,
        hint: "Which sort does almost nothing on sorted data?", explain: "Insertion sort is close to O(n) on nearly sorted data: most items don't slide at all. Selection sort is O(n²) always, and a first-item pivot on sorted data gives quick sort its worst case." },
      { type: "mc", q: "What is the base case of merge sort?", options: ["When the list is sorted", "<code>len(items) &lt;= 1</code>", "When mid is 0", "There is none"], answer: 1,
        hint: "Which list is sorted without doing anything?", explain: "A list with 0 or 1 items is already sorted. Every split makes the list smaller, so it always gets there." },
      { type: "write", q: "Ex9 H1. Write <code>priority_key(record)</code> for records <code>(sensor_id, volume)</code>: highest volume first, ties by <code>sensor_id</code> A→Z, when used as <code>sorted(records, key=priority_key)</code>.",
        starter: `
          def priority_key(record):
              pass

          records = [("S03", 45), ("S07", 79), ("S01", 45), ("S02", 79)]
          print(sorted(records, key=priority_key))`,
        checks: [["sorted([('S03', 45), ('S07', 79), ('S01', 45), ('S02', 79)], key=priority_key)", "[('S02', 79), ('S07', 79), ('S01', 45), ('S03', 45)]"], ["priority_key(('S02', 90))", "(-90, 'S02')"]],
        solution: `
          def priority_key(record):
              return (-record[1], record[0])     # minus = biggest first; then the ID`,
        hint: "Return a tuple. Python compares the first parts, and only on a tie the second parts.",
        explain: "<code>-volume</code> turns “big first” into “small first”, which is what <code>sorted()</code> does. The ID stays as it is, so ties go A→Z." },
    ],
  };

  /* ================================================================
     TOPIC: Exercise 9 walkthrough (traffic feed: easy, medium, hard)
     ================================================================ */
  const EX9_SORTS = `
    def bubble_sort(items, key=lambda x: x):       # neighbours swap; early exit
        out = list(items)                          # copy: the input stays unchanged
        for end in range(len(out) - 1):
            swapped = False
            for i in range(len(out) - 1):
                if key(out[i]) > key(out[i + 1]):
                    out[i], out[i + 1] = out[i + 1], out[i]
                    swapped = True
            if not swapped:                        # a pass with no swaps: done
                break
        return out

    def selection_sort(items, key=lambda x: x):    # swap the smallest of the rest to the front
        out = list(items)
        for i in range(len(out) - 1):
            min_idx = i
            for j in range(i + 1, len(out)):
                if key(out[j]) < key(out[min_idx]):
                    min_idx = j
            out[i], out[min_idx] = out[min_idx], out[i]
        return out

    def insertion_sort(items, key=lambda x: x):    # hold a card, slide bigger ones right
        out = list(items)
        for i in range(1, len(out)):
            current = out[i]
            j = i - 1
            while j >= 0 and key(out[j]) > key(current):
                out[j + 1] = out[j]
                j = j - 1
            out[j + 1] = current
        return out

    def merge(left, right, key=lambda x: x):       # glue two sorted lists
        result = []
        i = j = 0
        while i < len(left) and j < len(right):
            if key(left[i]) <= key(right[j]):      # <= : ties take the left = stable
                result.append(left[i]); i += 1
            else:
                result.append(right[j]); j += 1
        return result + left[i:] + right[j:]

    def merge_sort(items, key=lambda x: x):
        if len(items) <= 1:                        # base case
            return list(items)
        mid = len(items) // 2
        return merge(merge_sort(items[:mid], key), merge_sort(items[mid:], key), key)

    def quick_sort(items, key=lambda x: x):        # middle pivot, 3-way lists
        if len(items) <= 1:                        # base case
            return list(items)
        pivot = key(items[len(items) // 2])
        less = [x for x in items if key(x) < pivot]
        equal = [x for x in items if key(x) == pivot]
        greater = [x for x in items if key(x) > pivot]
        return quick_sort(less, key) + equal + quick_sort(greater, key)`;
  const EX9_DATA = `
    import random
    RNG = random.Random(42)                        # fixed seed: same numbers every run
    VOLUMES = [RNG.randint(10, 95) for _ in range(16)]
    SENSORS = [(f"S{i:02d}", volume) for i, volume in enumerate(VOLUMES)]`;
  const ex9Code = (...parts) => parts.map(p => PADS.dedent(p)).join("\n\n");   // glue code pieces for one Try-it

  const ex9 = {
    id: "ex9",
    title: "Exercise 9 walkthrough",
    summary: "The traffic-feed exercise, all of it: clean and trace (easy), five sorts on the same words (medium), then the <b>hard part</b>: rank sensors, a green-light schedule, a fair benchmark and a written recommendation.",
    sources: "Ex9 E1–E4, M1–M4, H1–H4",
    blocks: [
      { type: "callout", kind: "note", title: "How to use this page", html: "<p>Each part gives the task in one line, then a Try-it with a <b>Hint</b> and a <b>model answer</b>. Try first. The sorts themselves are explained on <a href=\"#algorithms/sorting\">Sorting</a> and stepped line by line on the <a href=\"#sortviz\">Sorting visualizer</a>.</p>" },
      { type: "table", caption: "The exercise at a glance", head: ["Part", "Task", "Below"], rows: [
        ["E1–E4", "clean letters, bubble + selection with <code>key=</code>, state after 4 passes, invariants", "Easy"],
        ["M1–M4", "split words, insertion + merge + quick, all five agree, Big-O table", "Medium"],
        ["<b>H1</b>", "<code>priority_key</code>: busiest first, ties by ID; all five sorts agree", "Hard"],
        ["<b>H2</b>", "<code>light_duration</code> and a schedule; why this is not a safe controller", "Hard"],
        ["<b>H3</b>", "a fair benchmark: same input, several runs, median ms", "Hard"],
        ["<b>H4</b>", "a 3–5 sentence recommendation", "Hard"],
      ] },
      { type: "callout", kind: "rule", title: "The contract every sort follows", html: "<p>Take <code>items</code> and an optional <code>key</code>. <b>Return a new list</b>, ascending by <code>key</code>. Never change <code>items</code>. Same contract → you can check all five against <code>sorted()</code> with one loop.</p>" },

      { type: "h", text: "Easy: clean, sort, trace (E1–E4)" },
      {
        type: "tryit",
        title: "E1 + E3: clean_letters and selection_first_k",
        task: "Write <code>clean_letters(text)</code>: only letters, lowercase, as a new list. Then <code>selection_first_k(items, k)</code>: the list after exactly <code>k</code> selection passes.",
        code: `
          from collections import Counter

          def clean_letters(text):
              result = []
              # keep c only if c.isalpha(), lowercased
              return result

          def selection_first_k(items, k, key=lambda x: x):
              out = list(items)                    # copy first
              # k rounds of: find the smallest in out[i:], swap it to position i
              return out

          ALERT = "CDSCO2402U.LA_E24 (Programming, Algorithms and Data Structures)"
          letters = clean_letters(ALERT)
          print(len(letters))                      # 47
          print(Counter(letters).most_common(3))
          print(selection_first_k([3, 1, 4, 2], 2))   # [1, 2, 4, 3]`,
        hint: "Letters: <code>if c.isalpha(): result.append(c.lower())</code>. Selection: <code>for i in range(k):</code>, then <code>min_idx = i</code> and an inner loop <code>for j in range(i + 1, len(out))</code>.",
        solution: `
          from collections import Counter

          def clean_letters(text):
              result = []
              for c in text:
                  if c.isalpha():                  # skip digits, spaces, punctuation
                      result.append(c.lower())
              return result

          def selection_first_k(items, k, key=lambda x: x):
              out = list(items)
              for i in range(k):                   # exactly k rounds
                  min_idx = i
                  for j in range(i + 1, len(out)):
                      if key(out[j]) < key(out[min_idx]):
                          min_idx = j
                  out[i], out[min_idx] = out[min_idx], out[i]
              return out

          ALERT = "CDSCO2402U.LA_E24 (Programming, Algorithms and Data Structures)"
          letters = clean_letters(ALERT)
          print(len(letters))                      # 47
          print(Counter(letters).most_common(3))   # [('a', 6), ('r', 5), ('s', 4)]
          print(selection_first_k([3, 1, 4, 2], 2))   # [1, 2, 4, 3]`,
        solutionNote: "After 4 passes on the letters of “Programming, Algorithms and Data Structures” the front is <code>['a', 'a', 'a', 'a', …]</code> and the rest is still messy. A partial state is not the sorted result.",
      },
      { type: "table", caption: "E4: the invariant after one pass (on [3, 1, 4, 2])", head: ["Sort", "After each pass", "Tiny example"], rows: [
        ["Bubble", "the biggest of the rest is at the <b>end</b>, final", "<code>[1, 3, 2, 4]</code>: 4 is done"],
        ["Selection", "the smallest of the rest is at the <b>front</b>, final", "<code>[1, 3, 4, 2]</code>: 1 is done"],
      ] },
      { type: "table", caption: "E4: cost (the output copy is O(n) on top, because of our contract)", head: ["Sort", "Best", "Average", "Worst", "Extra space"], rows: [
        ["Bubble (early exit)", "O(n)", "O(n²)", "O(n²)", "O(1): <code>swapped</code>, <code>i</code>"],
        ["Selection", "O(n²)", "O(n²)", "O(n²)", "O(1): <code>min_idx</code>, <code>i</code>, <code>j</code>"],
      ] },

      { type: "h", text: "Medium: five sorts, one answer (M1–M4)" },
      {
        type: "tryit",
        title: "M1 + M3: extract_words, then all five must agree",
        task: "Write <code>extract_words(text)</code>: lowercase words in order, any non-letter splits words, no sorting. Then run the check loop.",
        code: ex9Code(EX9_SORTS, `
          def extract_words(text):
              result = []
              word = ""                            # the word being built
              # letter: add it; non-letter: save the word (if any) and start again
              return result

          POEM = ("OF Mans First Disobedience, and the Fruit Of that Forbidden Tree, "
                  "whose mortal tast Brought Death into the World, and all our woe")
          words = extract_words(POEM)
          print(len(words))                        # 23

          expected = sorted(words, key=str.casefold)
          for sort_fn in [bubble_sort, selection_sort, insertion_sort, merge_sort, quick_sort]:
              assert sort_fn(words, key=str.casefold) == expected, sort_fn.__name__
          print(expected[:15])`),
        hint: "Do not forget the last word: after the loop, <code>if word != \"\": result.append(word)</code>. Without it you get 22 words (no “woe”).",
        solution: ex9Code(EX9_SORTS, `
          def extract_words(text):
              result = []
              word = ""
              for c in text:
                  if c.isalpha():
                      word = word + c.lower()      # build the word
                  else:
                      if word != "":               # a word just ended
                          result.append(word)
                          word = ""
              if word != "":                       # the text ended mid-word ("woe")
                  result.append(word)
              return result

          POEM = ("OF Mans First Disobedience, and the Fruit Of that Forbidden Tree, "
                  "whose mortal tast Brought Death into the World, and all our woe")
          words = extract_words(POEM)
          print(len(words))                        # 23

          expected = sorted(words, key=str.casefold)
          for sort_fn in [bubble_sort, selection_sort, insertion_sort, merge_sort, quick_sort]:
              assert sort_fn(words, key=str.casefold) == expected, sort_fn.__name__
          print(expected[:15])`),
        expectOutput: "23\n['all', 'and', 'and', 'brought', 'death', 'disobedience', 'first', 'forbidden', 'fruit', 'into', 'mans', 'mortal', 'of', 'of', 'our']",
      },
      { type: "table", caption: "M3: stable or not? Base case?", head: ["Sort", "Stable?", "Why"], rows: [
        ["Bubble", "yes", "swaps only on strict <code>&gt;</code>"],
        ["Selection", "<b>no</b>", "the long swap: <code>[2a, 2b, 1]</code> → <code>[1, 2b, 2a]</code>"],
        ["Insertion", "yes", "slides only past strictly bigger cards"],
        ["Merge", "yes", "<code>&lt;=</code> takes from the left pile on a tie"],
        ["Quick (ours)", "yes", "<code>less/equal/greater</code> are built left to right. In-place quick sort is <b>not</b> stable"],
      ] },
      `<p>Base case for merge and quick: <code>if len(items) &lt;= 1: return list(items)</code>. Every call works on a shorter list, so it always gets there. M4's Big-O table is on <a href="#algorithms/big-o-drill">Big-O: cheat sheet & drill</a> and <a href="#sortviz/bigo">Sorting visualizer → Big-O</a>.</p>`,

      { type: "h", text: "Hard H1: rank the sensors", sub: "Highest volume first, ties by sensor ID ascending. Every sort must give the same answer." },
      { type: "table", caption: "The 16 sensors (seed 42)", head: ["", "Sensors"], code: [1], rows: [
        ["data", "S00 91, S01 24, S02 13, S03 45, S04 41, S05 38, S06 27, S07 23, S08 79, S09 21, S10 85, S11 64, S12 14, S13 13, S14 21, S15 37"],
        ["ties", "S09 and S14 both 21; S02 and S13 both 13"],
      ] },
      { type: "callout", kind: "rule", title: "priority_key = lambda r: (-r[1], r[0])", html: "<p><code>('S09', 21)</code> → <code>(-21, 'S09')</code>. Ascending on <code>-volume</code> puts 91 first. On a tie, <code>'S09' &lt; 'S14'</code> decides. See what Python compares in the <a href=\"#algorithms/sorting\">key widget on Sorting</a>.</p>" },
      {
        type: "tryit",
        title: "H1: priority_key and the five-way check",
        task: "Write <code>priority_key</code>. Run it: it must print <code>All 5 match!</code> and then the ranking.",
        code: ex9Code(EX9_DATA, EX9_SORTS, `
          def priority_key(record):
              pass                                 # return a tuple: busiest first, ties by ID

          expected = sorted(SENSORS, key=priority_key)    # the built-in is the reference
          for sort_fn in [bubble_sort, selection_sort, insertion_sort, merge_sort, quick_sort]:
              assert sort_fn(SENSORS, key=priority_key) == expected, sort_fn.__name__
          print("All 5 match!")
          print(expected[:4], "...", expected[-4:])`),
        hint: "Negate the number so “bigger” sorts first, keep the ID as is: <code>return (-record[1], record[0])</code>.",
        solution: ex9Code(EX9_DATA, EX9_SORTS, `
          def priority_key(record):
              return (-record[1], record[0])       # ('S02', 13) -> (-13, 'S02')

          expected = sorted(SENSORS, key=priority_key)
          for sort_fn in [bubble_sort, selection_sort, insertion_sort, merge_sort, quick_sort]:
              assert sort_fn(SENSORS, key=priority_key) == expected, sort_fn.__name__
          print("All 5 match!")
          print(expected[:4], "...", expected[-4:])`),
        expectOutput: "All 5 match!\n[('S00', 91), ('S10', 85), ('S08', 79), ('S11', 64)] ... [('S14', 21), ('S12', 14), ('S02', 13), ('S13', 13)]",
      },
      { type: "table", caption: "Why not just reverse? Look at the ties", head: ["Way", "The tail of the ranking", "Right?"], code: [1], rows: [
        ["sorted(SENSORS, key=priority_key)", "... ('S09', 21), ('S14', 21), ('S12', 14), ('S02', 13), ('S13', 13)", "✓"],
        ["sorted(SENSORS, key=lambda r: (r[1], r[0]))[::-1]", "... ('S14', 21), ('S09', 21), ('S12', 14), ('S13', 13), ('S02', 13)", "✗ IDs flipped"],
      ] },
      { type: "callout", kind: "tip", title: "Stability stops mattering here", html: "<p>The key <code>(-volume, id)</code> never has two equal keys (IDs are unique). So even selection sort, which is not stable, gives the same order. Stability only matters when you leave ties equal.</p>" },

      { type: "h", text: "Hard H2: a green-light schedule", sub: "≤ 30 → 15 s, ≤ 60 → 30 s, otherwise 45 s. A teaching simulation, not a real controller." },
      {
        type: "tryit",
        title: "H2: light_duration and the schedule",
        task: "Write <code>light_duration(volume)</code>, then build <code>(sensor_id, volume, green_seconds)</code> for the ranked sensors.",
        code: ex9Code(EX9_DATA, `
          def priority_key(record):
              return (-record[1], record[0])

          def light_duration(volume):
              pass                                 # 15, 30 or 45

          ranked = sorted(SENSORS, key=priority_key)
          schedule = []
          # one tuple per sensor: (sensor_id, volume, light_duration(volume))

          for row in schedule[:5]:
              print(row)`),
        hint: "Check the small limit first: <code>if volume &lt;= 30</code>, then <code>elif volume &lt;= 60</code>, then <code>else</code>. For the schedule: <code>for sensor_id, volume in ranked:</code>.",
        solution: ex9Code(EX9_DATA, `
          def priority_key(record):
              return (-record[1], record[0])

          def light_duration(volume):
              if volume <= 30:                     # quiet road
                  return 15
              elif volume <= 60:                   # medium (31-60)
                  return 30
              else:                                # busy (over 60)
                  return 45

          ranked = sorted(SENSORS, key=priority_key)
          schedule = []
          for sensor_id, volume in ranked:         # ('S00', 91) -> sensor_id, volume
              schedule.append((sensor_id, volume, light_duration(volume)))

          for row in schedule[:5]:
              print(row)`),
        expectOutput: "('S00', 91, 45)\n('S10', 85, 45)\n('S08', 79, 45)\n('S11', 64, 45)\n('S03', 45, 30)",
      },
      { type: "callout", kind: "warn", title: "Sorting is not a traffic light", html: "<p>The schedule only says who is busiest and how long their green <i>could</i> be. A safe controller also needs yellow and red phases, a rule that crossing roads are never green together, pedestrian signals, minimum and maximum times, and live updates (this list is sorted once).</p>" },

      { type: "h", text: "Hard H3: evidence, not guesses", sub: "Same input for every sort, several runs, report the median." },
      { type: "table", caption: "Your benchmark (median ms; times depend on the computer)", head: ["Sort", "n = 50 → 100 → 200 → 400", "Reads as"], rows: [
        ["bubble, selection, insertion", "about <b>×4</b> per doubling", "O(n²)"],
        ["merge, quick, <code>sorted()</code>", "about <b>×2.3</b> per doubling", "O(n log n)"],
        ["<code>sorted()</code> at n = 400", "0.11 ms vs 38 ms for bubble", "same Big-O as merge, but written in C"],
      ] },
      {
        type: "tryit",
        title: "H3: a fair benchmark",
        task: "Run it (it takes a few seconds in the browser). Read the ×-column: which sorts go about ×4 and which about ×2?",
        code: ex9Code(EX9_SORTS, `
          import random
          from time import perf_counter
          from statistics import median

          def priority_key(record):
              return (-record[1], record[0])

          def make_records(n):                     # same n sensors every time (seed 42)
              rng = random.Random(42)
              return [(f"S{i:02d}", rng.randint(10, 95)) for i in range(n)]

          for sort_fn in [bubble_sort, insertion_sort, merge_sort, quick_sort, sorted]:
              previous = None
              for n in [100, 200, 400]:
                  records = make_records(n)        # identical input for every sort
                  times = []
                  for _ in range(3):               # several runs, keep the median
                      start = perf_counter()
                      sort_fn(records, key=priority_key)   # returns a new list: records stays fresh
                      times.append((perf_counter() - start) * 1000)
                  ms = median(times)
                  ratio = f"x{ms / previous:.1f}" if previous else ""
                  print(f"{sort_fn.__name__:15} n={n:4}  {ms:7.2f} ms  {ratio}")
                  previous = ms`),
      },
      `<p class="small muted">On a laptop: bubble ×4.6 then ×4.2, insertion ×3.9, merge ×2.2, quick ×2.3–2.6, <code>sorted</code> ×2.1–2.4. Your numbers will differ; the ratios are what to read.</p>`,
      { type: "callout", kind: "warn", title: "A stopwatch measures time, not memory", html: "<p>Merge sort is fast but makes new lists: O(n) extra. Bubble is slow but needs O(1) extra. The benchmark cannot see that. Memory comes from reading the code (<a href=\"#algorithms/big-o-cases\">Big-O: space</a>).</p>" },

      { type: "h", text: "Hard H4: the recommendation" },
      { type: "table", caption: "What the 3–5 sentences must cover", head: ["Point", "Your answer in a few words"], rows: [
        ["(a) time", "quadratic sorts ×4 per doubling; merge/quick/<code>sorted()</code> about ×2.3"],
        ["(b) extra space", "bubble/selection/insertion O(1); merge O(n); our quick O(n) average (new lists); in-place quick O(log n) for the waiting calls"],
        ["(c) stability, ties", "the key <code>(-volume, id)</code> breaks every tie, so all five agree"],
        ["(d) input shape, pivot", "sorted input: bubble/insertion O(n); quick drops to O(n²) if the pivot is always the smallest or biggest"],
        ["(e) why <code>sorted()</code>", "fastest, stable, O(n log n) worst case, tested, one line"],
      ] },
      { type: "mistakes", items: [
        { title: "Reversing the whole result", wrong: "sorted(SENSORS, key=lambda r: (r[1], r[0]))[::-1]", right: "sorted(SENSORS, key=lambda r: (-r[1], r[0]))", why: "Reversing flips the ID order of ties too: S14 before S09." },
        { title: "Sorting inside the function you test", wrong: "def bubble_sort(items, key=...):\n    return sorted(items, key=key)", right: "# write the loops yourself;\n# sorted() is only the reference", why: "The rules say no <code>sorted()</code> inside your own sorts." },
        { title: "Wrong boundary in light_duration", wrong: "if volume < 30:\n    return 15", right: "if volume <= 30:\n    return 15", why: "Volume 30 must give 15 s, not 30 s." },
        { title: "One run, different inputs", wrong: "records = make_records(n)   # new seed each sort\nt = one timing", right: "# same seed for every sort,\n# 3-5 runs, take the median", why: "Different inputs or one noisy run make the comparison unfair." },
        { title: "Benchmark as memory proof", wrong: "\"merge was fast, so it uses little memory\"", right: "\"merge needs O(n) extra: it builds new lists\"", why: "Time and memory are separate questions." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "H1. Which key gives highest volume first and ties by ID ascending?", options: ["<code>lambda r: (r[1], r[0])</code>", "<code>lambda r: (-r[1], r[0])</code>", "<code>lambda r: (-r[1], -r[0])</code>", "<code>lambda r: r[1]</code> with <code>[::-1]</code>"], answer: 1,
        wrong: { 0: "That is lowest volume first.", 2: "You cannot negate a string: TypeError.", 3: "Reversing flips the tie order too." },
        hint: "Make big numbers small, keep the ID as it is.", explain: "<code>(-volume, id)</code>: −91 is the smallest, so 91 comes first; equal volumes fall back to the ID, A→Z." },
      { type: "predict", q: "H1. What does this print?", code: "recs = [('S14', 21), ('S09', 21), ('S12', 14)]\nprint(sorted(recs, key=lambda r: (-r[1], r[0]))[0])", answer: "('S09', 21)",
        hint: "Two records have 21. Which ID is smaller?", explain: "Both 21s become −21; then <code>'S09' &lt; 'S14'</code>." },
      { type: "write", q: "H2. Write <code>light_duration(volume)</code>: ≤ 30 → 15, ≤ 60 → 30, otherwise 45.",
        starter: `
          def light_duration(volume):
              pass

          print(light_duration(31))   # 30`,
        checks: [["light_duration(30)", "15"], ["light_duration(31)", "30"], ["light_duration(60)", "30"], ["light_duration(61)", "45"], ["light_duration(10)", "15"]],
        solution: `
          def light_duration(volume):
              if volume <= 30:            # 30 itself is still quiet
                  return 15
              elif volume <= 60:
                  return 30
              else:
                  return 45`,
        hint: "Test the smallest limit first, with <code>&lt;=</code>.", explain: "The boundaries 30 and 60 belong to the lower group, so use <code>&lt;=</code>." },
      { type: "mc", q: "H3. Insertion sort took 2.6 ms for 200 sensors. About how long for 400?", options: ["2.6 ms", "5 ms", "10 ms", "40 ms"], answer: 2,
        hint: "O(n²): double n → ×4.", explain: "2.6 × 4 ≈ 10 ms. The real run gave 10.1 ms." },
      { type: "mc", q: "H3. Why run each sort several times and take the median?", options: ["To measure memory", "One run can be slowed by other programs; the median ignores the odd slow run", "Because the sorts change the input", "To make the sorts stable"], answer: 1,
        hint: "What makes one timing noisy?", explain: "The computer does other things too. The median of 3–5 runs is a stable number; a stopwatch never shows memory." },
      { type: "mc", q: "H4. Which sort uses the most extra memory in this exercise's versions?", options: ["Bubble", "Selection", "Insertion", "Merge"], answer: 3,
        hint: "Which one builds new lists at every level?", explain: "Merge slices and merges into new lists: O(n) extra. The three simple sorts only use a few variables: O(1)." },
      { type: "explain", q: "H2. In 2–3 sentences: why does sorting sensor volumes not give a safe green → yellow → red controller?",
        answer: "<p>Sorting only tells us which sensor is busiest and how long its green could be. It doesn't make a safe traffic light: there's no yellow or red phase, nothing stops two crossing roads from being green at the same time, and the list is sorted once instead of updating as traffic changes. A real controller also needs fixed phase order, pedestrian signals and minimum/maximum times.</p>",
        points: ["no yellow/red phases", "crossing roads could both be green", "sorted once, not live", "needs phase order, pedestrians, min/max times"],
        hint: "What does a real traffic light do that a sorted list cannot?" },
      { type: "explain", q: "H4. Write your 3–5 sentence recommendation: which sort for the traffic feed, and why? Cover time, extra space, ties, input shape and the built-in.",
        answer: "<p>Pick Python's built-in <code>sorted()</code>: it was the fastest at every size (0.11 ms for 400 sensors vs 38 ms for bubble sort), it's stable, and it's always O(n log n). Theory and measurements match: when n doubles, bubble, selection and insertion take about 4× longer (O(n²)), while merge and <code>sorted()</code> take about 2.3× longer (O(n log n)). Merge is guaranteed O(n log n) but needs O(n) extra memory; quick is usually as fast, but drops to O(n²) if the pivot is always the smallest or biggest item. The key <code>(-volume, id)</code> puts equal-volume sensors in ID order, so even an unstable sort gives the same result, and the benchmark measures time only, not memory.</p>",
        points: ["recommend sorted(): fastest, stable, O(n log n)", "×4 vs ×2.3 when n doubles", "merge O(n) extra; quick worst O(n²) with a bad pivot", "the key breaks ties", "timing ≠ memory"],
        hint: "Use the five rows of the H4 table, one sentence each." },
    ],
  };


  /* ================================================================
     TOPIC 16a: Trees & BST
     ================================================================ */
  // A–G tree
  const AG = { A: ["B", "C"], B: ["D", "E"], C: ["F", "G"], D: [], E: [], F: [], G: [] };
  const AG_POS = { A: [200, 30], B: [110, 100], C: [290, 100], D: [60, 175], E: [160, 175], F: [240, 175], G: [340, 175] };
  function agOrder(kind) {
    const out = [];
    const go = n => {
      if (!n) return;
      const [l, r] = AG[n];
      if (kind === 0) out.push(n);
      go(l);
      if (kind === 1) out.push(n);
      go(r);
      if (kind === 2) out.push(n);
    };
    go("A");
    return out;
  }
  function ordersWidget(el, api) {
    let kind = 0, order = agOrder(0);
    const pic = h("div"), strip = h("div"), now = h("p", { class: "alg-now", "aria-live": "polite" }), codeBox = h("div");
    const CODES = [
      "def preorder(node):\n    if node is None:\n        return\n    print(node.value)        # 1. the node first\n    preorder(node.left)      # 2. then left\n    preorder(node.right)     # 3. then right",
      "def inorder(node):\n    if node is None:\n        return\n    inorder(node.left)       # 1. left first\n    print(node.value)        # 2. then the node\n    inorder(node.right)      # 3. then right",
      "def postorder(node):\n    if node is None:\n        return\n    postorder(node.left)     # 1. left first\n    postorder(node.right)    # 2. then right\n    print(node.value)        # 3. the node last",
    ];
    const RULE = ["root, left, right", "left, root, right", "left, right, root"];
    const ctl = stepCtl(render, { ms: 800 });
    api.onCleanup(ctl.stop);
    const s = seg(["Pre-order", "In-order", "Post-order"], i => { kind = i; order = agOrder(i); codeBox.replaceChildren(ui.code({ code: CODES[i] })); ctl.setLength(order.length + 1); ctl.go(0); }, 0, "Traversal order");
    function render(k) {
      const shown = order.slice(0, k);
      const nodes = Object.keys(AG_POS).map(n => {
        const i = shown.indexOf(n);
        return { id: n, x: AG_POS[n][0], y: AG_POS[n][1], tone: i === k - 1 ? "accent" : i >= 0 ? "done" : null, sub: i >= 0 ? "#" + (i + 1) : null };
      });
      const edges = [];
      Object.keys(AG).forEach(p => AG[p].forEach(c => edges.push({ from: p, to: c })));
      pic.replaceChildren(D.graph({ w: 400, h: 215, nodes, edges, label: "tree A to G" }));
      strip.replaceChildren(D.array(order.map((n, i) => (i < k ? n : "?")), { index: false, name: "printed", marks: Object.fromEntries(order.map((_, i) => [i, i < k ? (i === k - 1 ? "held" : "done") : "gap"])) }));
      now.innerHTML = k === 0 ? `Rule: <b>${RULE[kind]}</b>. Press Step.` : `Visit <b>${order[k - 1]}</b>.` + (k === order.length ? ` Done: ${order.join(" ")}.` : "");
    }
    el.append(s.el, h("div", { class: "alg-two", style: "margin-top:10px" }, h("div", null, pic, strip), h("div", null, codeBox)), h("div", { style: "margin-top:10px" }, ctl.el), now);
    codeBox.replaceChildren(ui.code({ code: CODES[0] }));
    ctl.setLength(order.length + 1); ctl.go(0);
  }

  // BST builder
  function bstWidget(el) {
    const START = [8, 3, 10, 1, 6, 14, 4, 7, 13];
    let root = null, count = 0, path = [], hit = null;
    const inp = h("input", { type: "number", class: "input", id: "alg-bst-v", style: "width:6em", value: "5" });
    const pic = h("div", { class: "alg-scroll" }), msg = h("p", { class: "small", "aria-live": "polite", style: "margin:8px 0 0" }), inBox = h("div");
    function insert(v, quiet) {
      const steps = [];
      if (!root) { root = { v, l: null, r: null }; count++; if (!quiet) { path = [v]; hit = v; msg.innerHTML = `The tree is empty: ${v} becomes the root.`; } return; }
      let n = root;
      const p = [];
      for (;;) {
        p.push(n.v);
        if (v === n.v) { if (!quiet) { path = p; hit = null; msg.innerHTML = `${v} is already in the tree. A BST keeps each value once.`; } return; }
        const side = v < n.v ? "l" : "r";
        steps.push(`${v} ${v < n.v ? "&lt;" : "&gt;"} ${n.v}: go ${side === "l" ? "left" : "right"}`);
        if (!n[side]) {
          if (count >= 15) { if (!quiet) msg.textContent = "The tree is full (15 values). Press Clear."; return; }
          n[side] = { v, l: null, r: null }; count++;
          p.push(v);
          if (!quiet) { path = p; hit = v; msg.innerHTML = steps.join(" → ") + ` → empty spot: put <b>${v}</b> here.`; }
          return;
        }
        n = n[side];
      }
    }
    function search(v) {
      let n = root; const p = [], steps = [];
      while (n) {
        p.push(n.v);
        if (v === n.v) { path = p; hit = v; msg.innerHTML = (steps.length ? steps.join(" → ") + " → " : "") + `<b>${v} found ✓</b> after ${p.length} comparison${p.length === 1 ? "" : "s"}.`; draw(); return; }
        steps.push(`${v} ${v < n.v ? "&lt;" : "&gt;"} ${n.v}: go ${v < n.v ? "left" : "right"}`);
        n = v < n.v ? n.l : n.r;
      }
      path = p; hit = null; msg.innerHTML = (steps.length ? steps.join(" → ") + " → " : "") + `empty spot: <b>${v} is not in the tree</b>.`; draw();
    }
    function draw() {
      if (!root) { pic.replaceChildren(h("p", { class: "novars" }, "Empty tree. Insert a number.")); inBox.replaceChildren(); return; }
      const nodes = [], edges = [], ino = [];
      let x = 0, maxD = 0;
      const walk = (n, d, parent) => {
        if (!n) return;
        walk(n.l, d + 1, n.v);
        nodes.push({ id: "b" + n.v, label: String(n.v), x: 24 + x++ * 42, y: 24 + d * 54, tone: n.v === hit ? "done" : path.includes(n.v) ? "cmp" : null });
        ino.push(n.v); maxD = Math.max(maxD, d);
        walk(n.r, d + 1, n.v);
        if (parent != null) edges.push({ from: "b" + parent, to: "b" + n.v });
      };
      walk(root, 0, null);
      pic.replaceChildren(D.graph({ w: Math.max(200, 48 + (x - 1) * 42), h: 50 + maxD * 54, nodes, edges, r: 17, label: "binary search tree" }));
      inBox.replaceChildren(eyebrow("In-order (left, root, right) prints", "margin-top:10px"), D.array(ino, { index: false, marks: Object.fromEntries(ino.map((_, i) => [i, "sorted"])) }),
        h("p", { class: "small muted", style: "margin:4px 0 0" }, "Always sorted, because everything left of a node is smaller and everything right is bigger."));
    }
    const read = () => { const v = Math.trunc(+inp.value); return Number.isFinite(v) && inp.value !== "" ? Math.max(-99, Math.min(999, v)) : null; };
    const bIns = btn("Insert", () => { const v = read(); if (v !== null) { insert(v); draw(); } }, "btn small primary");
    const bFind = btn("Search", () => { const v = read(); if (v !== null) search(v); });
    const bStart = btn("Reset to 8, 3, 10, 1, 6, 14, 4, 7, 13", () => { root = null; count = 0; START.forEach(v => insert(v, true)); path = []; hit = null; msg.textContent = "Inserted in this order. Try inserting 5, or search for 7."; draw(); });
    const bClear = btn("Clear", () => { root = null; count = 0; path = []; hit = null; msg.textContent = ""; draw(); });
    inp.addEventListener("keydown", e => { if (e.key === "Enter") bIns.click(); });
    el.append(row(label("Value", "alg-bst-v"), inp, bIns, bFind), row(bStart, bClear), h("div", { style: "margin-top:10px" }, pic), msg, inBox);
    bStart.click();
  }

  // recursive in-order on Node(8, Node(3), Node(10))
  function inorderSteps() {
    const S = [], frames = [{ name: "global", vars: { root: "Node(8)" } }];
    const fr = () => frames.map(f => Object.assign({}, f));
    const printed = [];
    const T = { v: 8, l: { v: 3, l: null, r: null, id: "3" }, r: { v: 10, l: null, r: null, id: "10" }, id: "8" };
    const add = o => S.push(Object.assign({ frames: fr(), printed: printed.slice(), open: frames.slice(1).map(f => f.id) }, o));
    S.push({ line: 14, now: "Build the tree: 8 with 3 on the left and 10 on the right.", frames: fr(), printed: [], open: [] });
    function rec(n, from) {
      if (frames.length > 1) frames[frames.length - 1].note = "waiting";
      frames.push({ name: `inorder(${n ? "Node(" + n.v + ")" : "None"})`, vars: { node: n ? `Node(${n.v})` : "None" }, id: n ? n.id : from });
      if (!n) {
        frames[frames.length - 1].note = "base case";
        add({ line: 9, now: "<code>node</code> is None: an empty spot. <b>Base case</b>: return straight away.", cur: from });
        frames.pop(); frames[frames.length - 1].note = "running now";
        return;
      }
      add({ line: 10, now: `At ${n.v}. Not None. In-order says: <b>left side first</b>, so call inorder(${n.l ? "Node(" + n.l.v + ")" : "None"}) and wait.`, cur: n.id });
      rec(n.l, n.id + "L");
      printed.push(n.v);
      add({ line: 11, now: `Left side is done. Now print <b>${n.v}</b>.`, cur: n.id, print: String(n.v) });
      add({ line: 12, now: `Then the right side: inorder(${n.r ? "Node(" + n.r.v + ")" : "None"}).`, cur: n.id });
      rec(n.r, n.id + "R");
      frames[frames.length - 1].note = "done, returning None";
      add({ line: 12, now: `inorder(Node(${n.v})) is finished. Back to whoever called it.`, cur: n.id });
      frames.pop();
      if (frames.length > 1) frames[frames.length - 1].note = "running now";
    }
    rec(T, "root");
    add({ line: 15, now: "All calls are done. Printed 3, 8, 10: sorted, because this is a BST." });
    return S;
  }
  function inorderVisual(el, st) {
    const pos = { 8: [170, 30], 3: [90, 105], 10: [250, 105] };
    const nodes = [8, 3, 10].map(v => ({ id: String(v), x: pos[v][0], y: pos[v][1], tone: st.cur === String(v) ? "accent" : st.printed.includes(v) ? "done" : (st.open || []).includes(String(v)) ? "cmp" : null }));
    const nones = [["3L", 50, 175], ["3R", 130, 175], ["10L", 210, 175], ["10R", 290, 175]];
    nones.forEach(([id, x, y]) => nodes.push({ id, x, y, label: "None", r: 18, dashed: st.cur !== id, faded: st.cur !== id, tone: st.cur === id ? "min" : null }));
    const edges = [["8", "3"], ["8", "10"], ["3", "3L"], ["3", "3R"], ["10", "10L"], ["10", "10R"]].map(([a, b]) => ({ from: a, to: b, dashed: b.length > 2 }));
    el.append(D.graph({ w: 340, h: 205, nodes, edges, label: "tree 8, 3, 10 with empty spots" }),
      D.array(st.printed.length ? st.printed : [], { name: "printed", index: false, emptyText: "nothing yet" }));
  }

  const trees = {
    id: "trees",
    title: "Trees & BST",
    summary: "A tree is a root with children, and no cycles. A binary search tree keeps smaller values left and bigger right. Pre-, in- and post-order are three ways to walk one.",
    exam: ["Q6 tree"],
    sources: "",
    blocks: [
      { type: "h", text: "Words for trees" },
      { type: "table", head: ["Word", "Meaning", "In the A–G tree below"], rows: [
        ["root", "the top node, no parent", "A"],
        ["child / parent", "a node directly below / above", "B and C are A's children"],
        ["leaf", "a node with no children", "D, E, F, G"],
        ["height", "the number of levels below the root", "2"],
        ["binary tree", "every node has <b>at most two</b> children, in any order", "the A–G tree"],
        ["binary search tree (BST)", "left subtree smaller, right subtree bigger, at every node", "8 with 3 left and 10 right"],
      ] },

      { type: "h", text: "Three depth-first orders", sub: "Same tree, same recursion; only the position of print changes." },
      { type: "widget", render: ordersWidget },
      { type: "table", caption: "The A–G tree", head: ["Order", "Rule", "Result"], rows: [
        ["Pre-order", "root, left, right", "<code>A B D E C F G</code>"],
        ["In-order", "left, root, right", "<code>D B E A F C G</code>"],
        ["Post-order", "left, right, root", "<code>D E B F G C A</code>"],
      ] },
      { type: "callout", kind: "tip", title: "Trick: where is the print?", html: "<p>Pre = print <b>before</b> both calls. In = print <b>in between</b>. Post = print <b>after</b> both calls.</p>" },

      { type: "h", text: "The recursion behind it", sub: "Watch the None spots: they are the base case." },
      {
        type: "stepper",
        title: "inorder(root) on 8 / 3 / 10",
        code: `
          class Node:
              def __init__(self, value, left=None, right=None):
                  self.value = value
                  self.left = left                 # smaller side (in a BST)
                  self.right = right               # bigger side

          def inorder(node):
              if node is None:                     # base case: empty spot
                  return
              inorder(node.left)                   # 1. everything on the left
              print(node.value)                    # 2. the node itself
              inorder(node.right)                  # 3. everything on the right

          root = Node(8, Node(3), Node(10))
          inorder(root)`,
        what: { 8: "Every leaf has two None children. The recursion stops there.", 10: "This call waits here until the whole left side is printed.", 11: "Print only after the left side is finished.", 12: "Then the right side, the same way." },
        steps: inorderSteps(),
        visualTitle: "The tree (purple = the None spot being checked)",
        legend: [["held", "running"], ["cmp", "waiting"], ["done", "printed"]],
        visual: inorderVisual,
      },

      { type: "h", text: "Build a binary search tree", sub: "Smaller goes left, bigger goes right, at every node, until an empty spot." },
      { type: "widget", render: bstWidget },
      { type: "table", head: ["", "Balanced BST", "Lopsided BST"], rows: [
        ["Looks like", "bushy, both sides similar", "a long chain (insert 1, 2, 3, 4 in order)"],
        ["Height", "about log₂ n", "n − 1"],
        ["Search", "O(log n): like binary search", "O(n): like a linked list"],
      ] },
      { type: "callout", kind: "warn", title: "In-order is sorted only for a BST", html: "<p>The A–G tree is a plain binary tree: in-order gives <code>D B E A F C G</code>, not alphabetical. For the BST above it always comes out sorted.</p>" },
      { type: "h", text: "Breadth-first: level by level", sub: "Not recursion: a queue. Full details in the next topic." },
      { type: "code", code: `
          from collections import deque

          def level_order(root):
              queue = deque([root])
              while queue:
                  node = queue.popleft()           # the oldest waiting node
                  print(node.value, end=" ")
                  if node.left:                    # children join at the back
                      queue.append(node.left)
                  if node.right:
                      queue.append(node.right)     # A-G tree: A B C D E F G` },
      {
        type: "tryit",
        title: "Build the A–G tree and walk it",
        task: "Run it. Then write <code>postorder</code> and check it prints <code>D E B F G C A</code>.",
        code: `
          class Node:
              def __init__(self, value, left=None, right=None):
                  self.value = value
                  self.left = left
                  self.right = right

          root = Node("A",
                      Node("B", Node("D"), Node("E")),
                      Node("C", Node("F"), Node("G")))

          def preorder(node):
              if node is None:                     # base case
                  return
              print(node.value, end=" ")           # root first
              preorder(node.left)
              preorder(node.right)

          def inorder(node):
              if node is None:
                  return
              inorder(node.left)
              print(node.value, end=" ")           # root in the middle
              inorder(node.right)

          preorder(root)
          print()
          inorder(root)
          print()`,
        solution: `
          def postorder(node):
              if node is None:
                  return
              postorder(node.left)
              postorder(node.right)
              print(node.value, end=" ")           # root last

          postorder(root)                          # D E B F G C A`,
      },
      { type: "mistakes", items: [
        { title: "No base case", wrong: "def inorder(node):\n    inorder(node.left)", right: "def inorder(node):\n    if node is None:\n        return\n    inorder(node.left)", why: "At a leaf, <code>node.left</code> is None, and <code>None.left</code> is an AttributeError." },
        { title: "Calling on the same node", wrong: "inorder(node)", right: "inorder(node.left)", why: "The problem never gets smaller: RecursionError." },
        { title: "Print in the wrong place", wrong: "print(node.value)\ninorder(node.left)   # meant in-order", right: "inorder(node.left)\nprint(node.value)", why: "The position of print is the only difference between pre, in and post." },
        { title: "Expecting sorted output from any tree", wrong: "inorder(plain_tree)  # sorted?", right: "inorder(bst)         # sorted", why: "Only the BST rule (left smaller, right bigger) makes in-order sorted." },
        { title: "Going the wrong way in a BST", wrong: "if value < node.value:\n    node = node.right", right: "if value < node.value:\n    node = node.left", why: "Smaller values live on the <b>left</b>." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print (pre-order)?", code: `
          class Node:
              def __init__(self, value, left=None, right=None):
                  self.value = value
                  self.left = left
                  self.right = right

          def preorder(node):
              if node is None:
                  return
              print(node.value, end=" ")
              preorder(node.left)
              preorder(node.right)

          root = Node(8, Node(3, Node(1), Node(6)), Node(10))
          preorder(root)`, answer: "8 3 1 6 10",
        hint: "Root first, then the whole left side, then the right side.", explain: "8, then the left subtree (3, then 1, then 6), then the right subtree (10)." },
      { type: "predict", q: "Same tree, but in-order. What is printed?", code: `
          root = Node(8, Node(3, Node(1), Node(6)), Node(10))
          inorder(root)     # left, root, right`, answer: "1 3 6 8 10",
        hint: "It is a BST.", explain: "In-order of a BST is sorted: 1 3 6 8 10." },
      { type: "mc", q: "Insert 5 into the BST 8 (3 (1, 6), 10). Where does it go?", options: ["Right child of 10", "Left child of 6", "Right child of 1", "Left child of 3"], answer: 1,
        hint: "5 &lt; 8: left. 5 &gt; 3: right. 5 &lt; 6: …", explain: "8 → left to 3 → right to 6 → left of 6 is empty, so 5 goes there." },
      { type: "mc", q: "Which order prints a node <b>after</b> both of its children?", options: ["Pre-order", "In-order", "Post-order", "Level order"], answer: 2,
        hint: "post = after.", explain: "Post-order: left, right, root. Useful when children must be done first (like deleting a folder's contents before the folder)." },
      { type: "write", q: "Write a recursive <code>count_nodes(node)</code> that returns how many nodes a tree has. An empty tree (None) has 0.",
        starter: `
          class Node:
              def __init__(self, value, left=None, right=None):
                  self.value = value
                  self.left = left
                  self.right = right

          def count_nodes(node):
              pass

          root = Node(8, Node(3, Node(1), Node(6)), Node(10))
          print(count_nodes(root))     # 5`,
        test: `
          r = Node(8, Node(3, Node(1), Node(6)), Node(10))
          assert count_nodes(None) == 0, "count_nodes(None) should be 0"
          assert count_nodes(Node(1)) == 1, "a single node should give 1"
          assert count_nodes(r) == 5, "the 5-node tree should give 5, got " + repr(count_nodes(r))`,
        solution: `
          def count_nodes(node):
              if node is None:                     # base case: empty
                  return 0
              return 1 + count_nodes(node.left) + count_nodes(node.right)   # me + both sides`,
        hint: "Base case: None gives 0. Otherwise: 1 for this node + the count on each side.",
        explain: "Same skeleton as the traversals: base case for None, then one call per side." },
    ],
  };

  /* ================================================================
     TOPIC 16b: DFS & BFS (exam Q6)
     ================================================================ */
  const GRAPHS = [
    { name: "Machine tree (exam Q6 style)", labels: ["0", "1", "2", "3", "4", "5", "6"], edges: [[0, 1], [0, 4], [1, 2], [1, 3], [4, 5], [3, 6]],
      pos: [[200, 30], [110, 100], [60, 175], [160, 175], [290, 100], [290, 175], [160, 245]], w: 360, h: 275 },
    { name: "Course graph (has cycles)", labels: ["A", "B", "C", "D", "E", "F"], edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 4]],
      pos: [[180, 30], [90, 110], [270, 110], [40, 210], [180, 200], [320, 210]], w: 360, h: 245 },
  ];
  const matrixOf = g => { const M = g.labels.map(() => g.labels.map(() => 0)); g.edges.forEach(([a, b]) => { M[a][b] = 1; M[b][a] = 1; }); return M; };
  const lab = (g, i) => g.labels[i] === String(i) ? String(i) : `${i} (${g.labels[i]})`;
  const labs = (g, arr) => "[" + arr.map(i => lab(g, i)).join(", ") + "]";

  const DFS_CODE = `
    def dfs_route(adj_matrix, start):
        visited = []                             # the visit order
        stack = [start]                          # to-do pile; top = the end
        while stack:
            node = stack.pop()                   # take the newest
            if node in visited:
                continue                         # already done: skip it
            visited.append(node)
            for nb in range(len(adj_matrix) - 1, -1, -1):    # read the row right to left
                if adj_matrix[node][nb] == 1 and nb not in visited:
                    stack.append(nb)             # so the smallest ends on top
        return visited`;
  const BFS_CODE = `
    from collections import deque

    def bfs_route(adj_matrix, start):
        visited = [start]                        # mark when it joins the queue
        queue = deque([start])
        while queue:
            node = queue.popleft()               # take the oldest
            for nb in range(len(adj_matrix)):    # read the row left to right
                if adj_matrix[node][nb] == 1 and nb not in visited:
                    visited.append(nb)
                    queue.append(nb)             # join at the back
        return visited`;

  function dfsSteps(g, start) {
    const M = matrixOf(g), n = M.length, S = [], visited = [], stack = [start];
    const V = (o) => Object.assign({ vars: Object.assign({ stack: pyrepr(stack), visited: pyrepr(visited) }, o.node != null ? { node: String(o.node) } : {}), pile: stack.slice(), order: visited.slice() }, o);
    S.push(V({ line: 3, now: `Start: the pile holds only the start node ${lab(g, start)}. Nothing is visited yet.` }));
    while (stack.length) {
      const node = stack.pop();
      S.push(V({ line: 5, node, cur: node, now: `Pile is not empty. <code>pop()</code> takes the <b>top</b> (newest): ${lab(g, node)}.` }));
      if (visited.includes(node)) { S.push(V({ line: 7, node, cur: node, dup: true, now: `${lab(g, node)} is already visited (it was pushed twice, via two different neighbours). Skip it.` })); continue; }
      visited.push(node);
      S.push(V({ line: 8, node, cur: node, now: `Visit ${lab(g, node)}. Visit order so far: ${labs(g, visited)}.` }));
      const nbs = [], push = [];
      for (let nb = n - 1; nb >= 0; nb--) if (M[node][nb] === 1) { nbs.unshift(nb); if (!visited.includes(nb)) { stack.push(nb); push.push(nb); } }
      S.push(V({ line: 11, node, cur: node, row: node, pushed: push, now: `Read row ${lab(g, node)}: <code>${pyrepr(M[node])}</code>. The 1s are at ${nbs.map(x => lab(g, x)).join(", ") || "none"}. ` + (push.length ? `Not visited yet: ${push.slice().reverse().map(x => lab(g, x)).join(", ")}. Pushed right to left, so <b>${lab(g, push[push.length - 1])}</b> is on top.` : "All of them are visited already: push nothing. Next pop goes <b>back up</b> the tree (backtracking).") }));
    }
    S.push(V({ line: 4, now: "The pile is empty: every node reachable from the start was visited." }));
    S.push(V({ line: 12, now: `Return <code>${pyrepr(visited)}</code>, that is <b>${labs(g, visited)}</b>.`, ret: pyrepr(visited) }));
    return S;
  }
  function bfsSteps(g, start) {
    const M = matrixOf(g), n = M.length, S = [], visited = [start], queue = [start];
    const V = (o) => Object.assign({ vars: Object.assign({ queue: "deque(" + pyrepr(queue) + ")", visited: pyrepr(visited) }, o.node != null ? { node: String(o.node) } : {}), pile: queue.slice(), order: visited.slice() }, o);
    const done = [];
    S.push(V({ line: 5, now: `Start: ${lab(g, start)} is marked visited and waits in the queue.`, done: [] }));
    while (queue.length) {
      const node = queue.shift();
      done.push(node);
      S.push(V({ line: 7, node, cur: node, done: done.slice(), now: `<code>popleft()</code> takes the <b>front</b> (oldest): ${lab(g, node)}.` }));
      const nbs = [], add = [];
      for (let nb = 0; nb < n; nb++) if (M[node][nb] === 1) { nbs.push(nb); if (!visited.includes(nb)) { visited.push(nb); queue.push(nb); add.push(nb); } }
      S.push(V({ line: 11, node, cur: node, row: node, pushed: add, done: done.slice(), now: `Read row ${lab(g, node)}: <code>${pyrepr(M[node])}</code>. The 1s are at ${nbs.map(x => lab(g, x)).join(", ")}. ` + (add.length ? `New: ${add.map(x => lab(g, x)).join(", ")}. They are marked and join the <b>back</b> of the queue.` : "None of them are new.") }));
    }
    S.push(V({ line: 6, now: "The queue is empty.", done: done.slice() }));
    S.push(V({ line: 12, now: `Return <code>${pyrepr(visited)}</code>, that is <b>${labs(g, visited)}</b>. Nodes come out level by level: first the start, then everything 1 step away, then 2 steps…`, done: done.slice(), ret: pyrepr(visited) }));
    return S;
  }
  function matrixTable(g, M, o) {
    o = o || {};
    const t = h("table", { class: "alg-mat", "aria-label": "adjacency matrix" });
    t.appendChild(h("tr", null, h("th", null, ""), g.labels.map((l, j) => h("th", { class: o.col === j ? "on" : null }, l))));
    M.forEach((r, i) => t.appendChild(h("tr", { class: o.row === i ? "on" : null }, h("th", null, g.labels[i]),
      r.map((v, j) => {
        const cls = [v ? "one" : "", o.row === i && (o.pushed || []).includes(j) ? "mk-cmp" : "", o.cell && o.cell[0] === i && o.cell[1] === j ? "mk-held" : ""].join(" ").trim();
        const td = h("td", { class: cls || null }, String(v));
        if (o.onCell) { td.tabIndex = 0; td.setAttribute("role", "button"); td.setAttribute("aria-label", `row ${g.labels[i]}, column ${g.labels[j]}: ${v}`); td.onclick = () => o.onCell(i, j); td.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.onCell(i, j); } }; }
        return td;
      }))));
    return h("div", { class: "alg-scroll" }, t);
  }
  function graphPic(g, st, onPick) {
    const order = st.order || [];
    const nodes = g.labels.map((l, i) => ({
      id: "g" + i, label: l, x: g.pos[i][0], y: g.pos[i][1],
      tone: i === st.cur ? "accent" : (st.isBfs ? (st.done || []).includes(i) : order.includes(i)) ? "done" : (st.pile || []).includes(i) ? "cmp" : null,
      sub: order.includes(i) ? "#" + (order.indexOf(i) + 1) : null,
    }));
    const edges = g.edges.map(([a, b]) => ({ from: "g" + a, to: "g" + b, tone: st.row != null && (a === st.row || b === st.row) ? "cmp" : null }));
    const svg = D.graph({ w: g.w, h: g.h, nodes, edges, label: g.name });
    if (onPick) {
      [...svg.querySelectorAll("g")].filter(x => x.querySelector("circle")).forEach((el, i) => {
        el.setAttribute("tabindex", "0"); el.setAttribute("role", "button"); el.setAttribute("aria-label", "Start at " + g.labels[i]);
        el.classList.add("alg-click");
        el.addEventListener("click", () => onPick(i));
        el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(i); } });
      });
    }
    return svg;
  }
  function traversalWidget(el, api) {
    let gi = 0, algo = 0, start = 0;
    const box = h("div");
    const startRow = h("div", { class: "row-wrap" });
    const gSeg = seg(GRAPHS.map(g => g.name), i => { gi = i; start = 0; build(); }, 0, "Graph");
    const aSeg = seg(["DFS (stack)", "BFS (queue)"], i => { algo = i; build(); }, 0, "Algorithm");
    function build() {
      const g = GRAPHS[gi], M = matrixOf(g);
      startRow.replaceChildren(h("span", { class: "small muted" }, "Start at:"), ...g.labels.map((l, i) => { const b = btn(l, () => { start = i; build(); }, "btn small mono alg-start", { "aria-label": "Start at " + l }); b.setAttribute("aria-pressed", String(i === start)); return b; }));
      const steps = (algo ? bfsSteps : dfsSteps)(g, start).map(s => Object.assign(s, { isBfs: !!algo }));
      box.replaceChildren(ui.stepper({
        title: (algo ? "bfs_route" : "dfs_route") + "(adj_matrix, " + start + ")",
        intro: "Click a node in the picture (or a Start button) to start somewhere else.",
        code: algo ? BFS_CODE : DFS_CODE,
        what: algo ? { 4: "Mark at enqueue time, so no node joins the queue twice.", 7: "FIFO: the node that waited longest.", 8: "Row node of the matrix lists its neighbours: a 1 means an edge.", 11: "Join at the back: it waits behind everyone found earlier." }
          : { 3: "A plain list used as a stack.", 5: "LIFO: the node pushed last comes out first. That makes DFS go deep.", 6: "Graphs with cycles can push a node twice. Trees never need this, but it is safe.", 9: "range(n - 1, -1, -1) is n-1, n-2, …, 0.", 11: "Pushing the biggest first leaves the smallest on top, so smaller neighbours are visited first." },
        steps,
        varsTitle: "Variables (node indexes)",
        visualTitle: "Graph, matrix and " + (algo ? "queue" : "stack"),
        legend: [["held", "current node"], ["cmp", algo ? "waiting in the queue" : "on the stack"], ["done", algo ? "taken out" : "visited"]],
        visual: (v, st) => {
          v.append(h("div", { class: "alg-gm1" }, graphPic(g, st, i => { start = i; build(); }), matrixTable(g, M, { row: st.row, pushed: st.pushed })));
          const pp = {};
          if (st.pile.length) { if (algo) { pp[0] = "front"; if (st.pile.length > 1) pp[st.pile.length - 1] = "back"; } else pp[st.pile.length - 1] = "top"; }
          v.append(h("div", { style: "margin-top:8px" }, D.array(st.pile.map(i => g.labels[i]), { name: algo ? "queue" : "stack", ptrs: pp, index: false })),
            h("div", { style: "margin-top:6px" }, D.array(st.order.map(i => g.labels[i]), { name: "visited", index: false, marks: Object.fromEntries(st.order.map((x, k) => [k, algo && !(st.done || []).includes(x) ? "cmp" : "done"])) })));
        },
      }, api));
    }
    el.append(row(gSeg.el, aSeg.el), h("div", { style: "margin-top:8px" }, startRow), h("div", { style: "margin-top:10px" }, box));
    build();
  }

  function recDfsSteps() {
    const g = GRAPHS[0], M = matrixOf(g), S = [], visited = [];
    const frames = [{ name: "global", vars: {} }];
    const fr = () => frames.map(f => Object.assign({}, f, { vars: Object.assign({}, f.vars) }));
    const add = o => S.push(Object.assign({ frames: fr(), order: visited.slice(), path: frames.slice(1).map(f => f.node) }, o));
    add({ line: 10, now: "Call <code>dfs_route(adj_matrix, 0)</code>: the van starts at machine 0." });
    function rec(node, parent) {
      if (frames.length > 1) frames[frames.length - 1].note = "waiting";
      frames.push({ name: `dfs_route(…, ${node})`, vars: { start: String(node) }, node });
      if (parent == null) add({ line: 3, now: "First call: <code>visited</code> is None, so make an empty list. Every deeper call gets this <b>same</b> list passed in.", cur: node });
      visited.push(node);
      frames[frames.length - 1].note = "running now";
      add({ line: 4, now: `Restock machine <b>${node}</b>. Visited: ${pyrepr(visited)}.`, cur: node });
      for (let nb = 0; nb < M.length; nb++) {
        if (M[node][nb] === 1 && !visited.includes(nb)) {
          add({ line: 7, now: `Row ${node} has a 1 at column ${nb}, and ${nb} is not visited: drive on to ${nb} <b>right away</b>. This call waits.`, cur: node, go: nb });
          rec(nb, node);
          frames[frames.length - 1].note = "running now";
          add({ line: 5, now: `Back at ${node}. Keep reading row ${node} after column ${nb}.`, cur: node });
        }
      }
      frames[frames.length - 1].note = "returning";
      add({ line: 8, now: parent == null ? `Row 0 has nothing new left. The whole tree is done.` : `Machine ${node} has no unvisited neighbours left: a dead end. <b>Backtrack</b> to ${parent}.`, cur: node });
      frames.pop();
    }
    rec(0, null);
    add({ line: 10, now: `Print the route: ${pyrepr(visited)}.`, print: pyrepr(visited) });
    return S;
  }
  function recDfsVisual(el, st) {
    const g = GRAPHS[0];
    const nodes = g.labels.map((l, i) => ({ id: "g" + i, label: l, x: g.pos[i][0], y: g.pos[i][1], tone: i === st.cur ? "accent" : st.path.includes(i) ? "cmp" : st.order.includes(i) ? "done" : null, sub: st.order.includes(i) ? "#" + (st.order.indexOf(i) + 1) : null }));
    const edges = g.edges.map(([a, b]) => ({ from: "g" + a, to: "g" + b, tone: st.path.includes(a) && st.path.includes(b) ? "cmp" : null }));
    if (st.go != null) edges.push({ from: "g" + st.cur, to: "g" + st.go, directed: true, tone: "accent" });
    el.append(D.graph({ w: g.w, h: g.h, nodes, edges, label: "machine tree" }),
      D.array(st.order, { name: "visited", index: false }));
  }

  function adjWidget(el) {
    const g = GRAPHS[1], M = matrixOf(g);
    let cell = null;
    const box = h("div"), msg = h("p", { "aria-live": "polite", style: "margin:8px 0 0" });
    function draw() {
      const st = { order: [], pile: [], row: cell ? cell[0] : null, cur: cell ? cell[0] : null };
      const pic = graphPic(g, st);
      if (cell && M[cell[0]][cell[1]]) {
        // light up the clicked edge
        const nodes = g.labels.map((l, i) => ({ id: "g" + i, label: l, x: g.pos[i][0], y: g.pos[i][1], tone: i === cell[0] ? "accent" : i === cell[1] ? "cmp" : null }));
        const edges = g.edges.map(([a, b]) => ({ from: "g" + a, to: "g" + b, tone: (a === cell[0] && b === cell[1]) || (b === cell[0] && a === cell[1]) ? "accent" : null, faded: !((a === cell[0] && b === cell[1]) || (b === cell[0] && a === cell[1])) }));
        box.replaceChildren(h("div", { class: "alg-gm" }, D.graph({ w: g.w, h: g.h, nodes, edges, label: g.name }), matrixTable(g, M, { row: cell[0], cell, onCell: pick })));
      } else box.replaceChildren(h("div", { class: "alg-gm" }, pic, matrixTable(g, M, { row: cell ? cell[0] : null, cell, onCell: pick })));
      if (!cell) { msg.innerHTML = "Click any cell of the matrix."; return; }
      const [i, j] = cell, A = g.labels[i], B = g.labels[j];
      const nbs = M[i].map((v, k) => v ? g.labels[k] : null).filter(Boolean);
      msg.innerHTML = (M[i][j] ? `<code>adj_matrix[${i}][${j}]</code> is <b>1</b>: there is an edge ${A}–${B}. Because the graph is undirected, <code>adj_matrix[${j}][${i}]</code> is 1 too.` : `<code>adj_matrix[${i}][${j}]</code> is <b>0</b>: no edge between ${A} and ${B}.`) +
        `<br>The whole row ${i} (${A}) lists ${A}'s neighbours: ${nbs.join(", ")}. As an adjacency list that is <code>graph["${A}"] = ${pyrepr(nbs)}</code>.`;
    }
    function pick(i, j) { cell = [i, j]; draw(); }
    el.append(box, msg);
    draw();
  }

  const dfsBfs = {
    id: "dfs-bfs",
    title: "DFS & BFS",
    summary: "Depth-first goes down one branch to the end, then backtracks (a stack or recursion). Breadth-first goes level by level (a queue). Exam Q6 asked for DFS on an adjacency matrix.",
    exam: ["Q6 DFS on an adjacency matrix"],
    sources: "Ex7 demo",
    blocks: [
      { type: "callout", kind: "exam", title: "Exam Q6 (last year)", html: "<p>“You are given a tree of vending machines, represented by an <b>adjacency matrix</b>. Compute a DFS traversal order starting from a specified machine. Implement DFS either iteratively or recursively. Return a list of machine indices in the order they are visited.” Plus a 4–5 sentence explanation of DFS as a restocking strategy. Signature: <code>def dfs_route(adj_matrix, start):</code></p>" },
      { type: "h", text: "Two ways to explore" },
      { type: "table", head: ["", "DFS (depth-first)", "BFS (breadth-first)"], rows: [
        ["Idea", "go as deep as possible, then back up", "visit everything 1 step away, then 2 steps, …"],
        ["Holds the to-do list in", "a <b>stack</b> (<code>pop()</code>), or recursion", "a <b>queue</b> (<code>popleft()</code>)"],
        ["Machine tree from 0", "<code>0 1 2 3 6 4 5</code>", "<code>0 1 4 2 3 5 6</code>"],
        ["Course graph from A", "<code>A B D E C F</code>", "<code>A B C D E F</code>"],
        ["Good for", "following a route to the end: mazes, restock routes, puzzles", "fewest hops in an unweighted graph"],
        ["Big-O", "O(V + E) with a list; O(V²) with a matrix", "same"],
      ] },

      { type: "h", text: "The adjacency matrix", sub: "Row i, column j is 1 when there is an edge between node i and node j." },
      { type: "widget", render: adjWidget },
      { type: "table", head: ["You want", "Matrix", "Adjacency list"], code: [1, 2], rows: [
        ["Is there an edge A–C?", "adj_matrix[0][2] == 1", "\"C\" in graph[\"A\"]"],
        ["A's neighbours", "[j for j in range(n) if adj_matrix[0][j] == 1]", "graph[\"A\"]"],
        ["Number of nodes", "len(adj_matrix)", "len(graph)"],
      ] },

      { type: "h", text: "DFS vs BFS, step by step", sub: "Pick a graph and a start node. Watch the stack or queue, and which matrix row is being read." },
      { type: "widget", render: traversalWidget },

      { type: "h", text: "The recursive version: the van and the call stack", sub: "Each call is one machine. Returning is driving back up the branch." },
      {
        type: "stepper",
        title: "Recursive dfs_route on the machine tree",
        code: `
          def dfs_route(adj_matrix, start, visited=None):
              if visited is None:
                  visited = []                         # one fresh list per route
              visited.append(start)                    # restock this machine
              for nb in range(len(adj_matrix)):        # read its row, left to right
                  if adj_matrix[start][nb] == 1 and nb not in visited:
                      dfs_route(adj_matrix, nb, visited)   # go deeper first
              return visited                           # dead end: back up

          print(dfs_route(adj_matrix, 0))`,
        what: { 1: "visited=None, not visited=[]: a list default would be shared between separate calls.", 6: "A 1 in the row = a road to that machine.", 7: "The recursion IS the stack: Python's call stack remembers where to come back to.", 8: "Returning = backtracking to the machine we came from." },
        steps: recDfsSteps(),
        visualTitle: "The van's route (orange = calls still open, the path back)",
        legend: [["held", "van is here"], ["cmp", "open calls: the way back"], ["done", "finished"]],
        visual: recDfsVisual,
      },

      { type: "h", text: "Traces to know", sub: "graph = {'A': ['B', 'C'], 'B': ['A', 'D', 'E'], 'C': ['A', 'E', 'F'], 'D': ['B', 'E'], 'E': ['B', 'C', 'D'], 'F': ['C']}" },
      { type: "table", caption: "Recursive DFS from A", head: ["Step", "Visit", "Recursion stack", "Why"], rows: [
        ["1", "A", "A", "start"],
        ["2", "B", "A → B", "A's first neighbour"],
        ["3", "D", "A → B → D", "B's first new neighbour (A is done)"],
        ["4", "E", "A → B → D → E", "D's next new neighbour"],
        ["5", "C", "A → B → D → E → C", "E's first new neighbour (B is done)"],
        ["6", "F", "A → B → D → E → C → F", "C's only new neighbour"],
        ["…", "", "unwinds back to A", "nothing new anywhere: done"],
      ] },
      { type: "table", caption: "BFS from A", head: ["Step", "Take from the front", "Queue after", "Visited"], rows: [
        ["0", "", "[A]", "A"],
        ["1", "A", "[B, C]", "A B C"],
        ["2", "B", "[C, D, E]", "A B C D E"],
        ["3", "C", "[D, E, F]", "A B C D E F"],
        ["4", "D", "[E, F]", "same"],
        ["5", "E", "[F]", "same"],
        ["6", "F", "[ ]", "same: done"],
      ] },
      { type: "code", code: `
          def dfs(graph, start, visited=None):          # adjacency list
              if visited is None:
                  visited = set()
              visited.add(start)
              print(start)
              for neighbour in graph[start]:
                  if neighbour not in visited:
                      dfs(graph, neighbour, visited)
              return visited`, caption: "The course version uses a dict of lists and a set" },

      {
        type: "tryit",
        title: "Exam Q6: run both versions on the same matrix",
        task: "Run it. Then change <code>start</code> to 3 and predict the order before you run again.",
        code: `
          adj_matrix = [
              [0, 1, 0, 0, 1, 0, 0],   # 0: 1, 4
              [1, 0, 1, 1, 0, 0, 0],   # 1: 0, 2, 3
              [0, 1, 0, 0, 0, 0, 0],   # 2: 1
              [0, 1, 0, 0, 0, 0, 1],   # 3: 1, 6
              [1, 0, 0, 0, 0, 1, 0],   # 4: 0, 5
              [0, 0, 0, 0, 1, 0, 0],   # 5: 4
              [0, 0, 0, 1, 0, 0, 0],   # 6: 3
          ]

          def dfs_route(adj_matrix, start):              # iterative, with a stack
              visited = []
              stack = [start]
              while stack:
                  node = stack.pop()
                  if node in visited:
                      continue
                  visited.append(node)
                  for nb in range(len(adj_matrix) - 1, -1, -1):
                      if adj_matrix[node][nb] == 1 and nb not in visited:
                          stack.append(nb)
              return visited

          def dfs_route_rec(adj_matrix, start, visited=None):   # recursive
              if visited is None:
                  visited = []
              visited.append(start)
              for nb in range(len(adj_matrix)):
                  if adj_matrix[start][nb] == 1 and nb not in visited:
                      dfs_route_rec(adj_matrix, nb, visited)
              return visited

          start = 0
          print(dfs_route(adj_matrix, start))
          print(dfs_route_rec(adj_matrix, start))`,
      },
      { type: "mistakes", items: [
        { title: "No visited check on a graph with cycles", wrong: "for nb in ...:\n    if adj_matrix[node][nb] == 1:\n        stack.append(nb)", right: "    if adj_matrix[node][nb] == 1 and nb not in visited:", why: "A → B → A → B … forever. Even in a tree, the parent is a neighbour, so you would walk back up." },
        { title: "<code>pop(0)</code> in DFS", wrong: "node = stack.pop(0)", right: "node = stack.pop()", why: "Taking from the front makes it a queue: that is BFS, not DFS." },
        { title: "A list as the default argument", wrong: "def dfs_route(adj_matrix, start, visited=[]):", right: "def dfs_route(adj_matrix, start, visited=None):\n    if visited is None:\n        visited = []", why: "The default list is made once and shared: a second call starts with the first call's nodes already visited." },
        { title: "Reading a column instead of a row", wrong: "if adj_matrix[nb][node] == 1", right: "if adj_matrix[node][nb] == 1", why: "For an undirected graph both are equal, but the habit breaks on directed graphs. Row = from, column = to." },
        { title: "Returning inside the loop", wrong: "for nb in range(n):\n    ...\n    return visited", right: "for nb in range(n):\n    ...\nreturn visited", why: "It stops after the first neighbour: the route is cut short." },
        { title: "Forgetting to pass <code>visited</code> down", wrong: "dfs_route(adj_matrix, nb)", right: "dfs_route(adj_matrix, nb, visited)", why: "Each call makes its own empty list, so nothing is remembered and nodes are visited again." },
      ] },
    ],
    quiz: [
      { type: "write", q: "Exam Q6. Write <code>dfs_route(adj_matrix, start)</code> that returns the list of node indexes in DFS order. Iterative or recursive. When a node has several unvisited neighbours, go to the <b>smallest index</b> first.",
        starter: `
          def dfs_route(adj_matrix, start):
              # your code here
              pass

          adj_matrix = [
              [0, 1, 0, 0, 1, 0, 0],
              [1, 0, 1, 1, 0, 0, 0],
              [0, 1, 0, 0, 0, 0, 0],
              [0, 1, 0, 0, 0, 0, 1],
              [1, 0, 0, 0, 0, 1, 0],
              [0, 0, 0, 0, 1, 0, 0],
              [0, 0, 0, 1, 0, 0, 0],
          ]
          print(dfs_route(adj_matrix, 0))     # [0, 1, 2, 3, 6, 4, 5]`,
        test: `
          T = [[0,1,0,0,1,0,0],[1,0,1,1,0,0,0],[0,1,0,0,0,0,0],[0,1,0,0,0,0,1],[1,0,0,0,0,1,0],[0,0,0,0,1,0,0],[0,0,0,1,0,0,0]]
          r = dfs_route(T, 0)
          assert r is not None, "dfs_route returned None: did you forget return?"
          assert list(r) == [0, 1, 2, 3, 6, 4, 5], "from 0 expected [0, 1, 2, 3, 6, 4, 5], got " + repr(r)
          r = dfs_route(T, 3)
          assert list(r) == [3, 1, 0, 4, 5, 2, 6], "from 3 expected [3, 1, 0, 4, 5, 2, 6], got " + repr(r)
          G = [[0,1,1,0,0,0],[1,0,0,1,1,0],[1,0,0,0,1,1],[0,1,0,0,1,0],[0,1,1,1,0,0],[0,0,1,0,0,0]]
          r = dfs_route(G, 0)
          assert list(r) == [0, 1, 3, 4, 2, 5], "on the course graph (with a cycle) expected [0, 1, 3, 4, 2, 5], got " + repr(r)
          assert dfs_route([[0]], 0) == [0], "a single node should give [0]"`,
        solution: `
          def dfs_route(adj_matrix, start):
              visited = []                              # the visit order
              stack = [start]                           # to-do pile
              while stack:
                  node = stack.pop()                    # newest first: go deep
                  if node in visited:
                      continue
                  visited.append(node)
                  for nb in range(len(adj_matrix) - 1, -1, -1):   # right to left ...
                      if adj_matrix[node][nb] == 1 and nb not in visited:
                          stack.append(nb)              # ... so the smallest is on top
              return visited

          # or recursively:
          def dfs_route_rec(adj_matrix, start, visited=None):
              if visited is None:
                  visited = []
              visited.append(start)
              for nb in range(len(adj_matrix)):
                  if adj_matrix[start][nb] == 1 and nb not in visited:
                      dfs_route_rec(adj_matrix, nb, visited)
              return visited`,
        hint: "Recursive is shortest: append <code>start</code>, loop <code>nb</code> over <code>range(len(adj_matrix))</code>, and recurse when <code>adj_matrix[start][nb] == 1</code> and <code>nb</code> is not visited. Pass <code>visited</code> along.",
        explain: "Both versions give the same order. With a stack you push neighbours right to left so the smallest comes out first. The test also uses a graph with a cycle, so the visited check is needed." },
      { type: "predict", q: "DFS (smallest neighbour first) from node 0. What list comes back?", code: `
          adj_matrix = [
              [0, 1, 1, 0],
              [1, 0, 0, 1],
              [1, 0, 0, 0],
              [0, 1, 0, 0],
          ]
          print(dfs_route(adj_matrix, 0))`, answer: "[0, 1, 3, 2]",
        hint: "Row 0 has 1s at 1 and 2. Go to 1 first, and all the way down from there.", explain: "0 → 1 (first neighbour) → 3 (1's only new neighbour) → dead end, back to 1, back to 0 → 2." },
      { type: "predict", q: "Same matrix, BFS from node 0. What list comes back?", code: `
          print(bfs_route(adj_matrix, 0))`, answer: "[0, 1, 2, 3]",
        hint: "Everything 1 step from 0 first.", explain: "0, then its neighbours 1 and 2, then 3 (a neighbour of 1)." },
      { type: "mc", q: "In the iterative <code>dfs_route</code>, which single change turns it into a BFS order?", options: ["<code>stack.append(nb)</code> → <code>stack.insert(0, nb)</code> on line 11 only", "<code>stack.pop()</code> → <code>stack.pop(0)</code> (take from the front)", "Remove the <code>visited</code> check", "Loop the row left to right"], answer: 1,
        hint: "Stack vs queue is just which end you take from.", explain: "Taking the oldest item makes the list a queue (FIFO), which is BFS. A <code>deque</code> with <code>popleft()</code> does the same faster." },
      { type: "bug", q: "Called twice, the second call returns a wrong route. Click the line that causes it.", code: `
          def dfs_route(adj_matrix, start, visited=[]):
              visited.append(start)
              for nb in range(len(adj_matrix)):
                  if adj_matrix[start][nb] == 1 and nb not in visited:
                      dfs_route(adj_matrix, nb, visited)
              return visited`,
        bugs: [1], notes: { 1: "<code>visited=[]</code> is made once, when the def runs, and shared by every call" },
        fixed: `
          def dfs_route(adj_matrix, start, visited=None):
              if visited is None:
                  visited = []                  # a fresh list for each new route
              visited.append(start)
              for nb in range(len(adj_matrix)):
                  if adj_matrix[start][nb] == 1 and nb not in visited:
                      dfs_route(adj_matrix, nb, visited)
              return visited`,
        hint: "When is the default value <code>[]</code> created: at every call, or once?", explain: "Python makes the default list once. The second route starts with every node already “visited”. That is why the course version uses <code>visited=None</code>." },
      { type: "explain", q: "Exam Q6, part 2. In 4–5 sentences, explain how DFS corresponds to a restocking strategy where you follow one branch of the tree completely before backtracking.",
        answer: "<p>DFS starts at the depot machine and always drives on to an unvisited neighbouring machine, so the van follows one branch all the way to its end (a leaf) before doing anything else. When it reaches a machine with no unvisited neighbours, it backtracks to the last machine that still has an unvisited branch and continues from there. The stack (or the recursion's call stack) remembers exactly which machines to go back to, in the right order. Because the network is a tree, every machine is reached exactly once and the van never loops. This finishes one neighbourhood completely before moving to the next, which keeps the route compact, although it does not promise the shortest total distance.</p>",
        points: ["go deep: always continue to an unvisited neighbour", "backtrack at a dead end (leaf) to the last branching machine", "the stack / call stack remembers where to go back", "tree: no cycles, each machine visited exactly once", "finishes one branch before the next (not necessarily shortest)"],
        hint: "Use the words: branch, leaf, backtrack, stack, visited once." },
    ],
  };

  PADS.registerSubject({
    id: "algorithms",
    title: "Algorithms & data structures",
    order: 4,
    blurb: "Linked lists, stacks and queues, recursion and Big-O, DP and greedy, searching and sorting, trees, and DFS/BFS on an adjacency matrix (exam Q6).",
    covers: ["Linked lists, stacks, queues", "Recursion (call stack, Fibonacci tree, Hanoi), Big-O: cases, space, recursion trees, a 17-snippet drill", "DP, greedy, Dijkstra", "Binary search, sorting, stability, <code>key=lambda</code>", "Exercise 9 walkthrough: <code>priority_key</code>, green-light schedule, benchmark, recommendation", "Trees, BST, DFS and BFS"],
    exam: [
      "<b>Q6</b>: <code>dfs_route(adj_matrix, start)</code>: DFS on a tree given as an adjacency matrix, iterative (stack) or recursive, plus a 4–5 sentence explanation.",
      "<b>Q3</b>: the queue idea: <code>low_stock_queue.append(item_index)</code>.",
      "The exam says it tests whether you can <i>analyse</i> code: be ready to state a Big-O in a sentence.",
    ],
    topics: [linkedLists, stacksQueues, recursion, bigO, bigOCases, bigODrill, dpGreedy, searching, sorting, ex9, trees, dfsBfs],
  });
})();
