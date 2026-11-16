/* Subject 6: Exam. Format and strategy, one drill page per question of Exam w25 (Q1–Q6), and a two-part mock exam.
   Uses only the public API in AUTHORING.md. Local helpers: reveal() (step-by-step solution), dfsSteps() + dfsVisual()
   (DFS trace on an adjacency matrix), matrixWidget, foodWidget, usageWidget, planWidget, timerWidget. */
(function () {
  "use strict";
  const { h, ui, pyrepr } = PADS;
  const D = ui.draw;
  const py = s => PADS.dedent(s);              // Python test code must not keep the JS indentation
  // ui.switch in a wrapper whose CSS lets wide code shrink on phones (the shared .switch grid has no minmax column)
  const sw = o => api => h("div", { class: "exam-sw" }, ui.switch(o, api));

  /* ================================================================
     Shared helpers
     ================================================================ */

  // A "worked solution" card: hints first, then the parts of the answer, opened one at a time.
  // parts: [{ label, html?, code?, hint?: true }]
  function reveal(parts, title) {
    return {
      type: "widget",
      title: title || "Worked solution, one step at a time",
      intro: "Try each step on paper first. Then open the next one. Hints come first.",
      render(el) {
        let shown = 0;
        const list = h("ol", { class: "exam-steps" });
        const items = parts.map((p, i) => {
          const body = h("div", { class: "exam-step-body" });
          if (p.html) body.appendChild(h("div", { html: p.html }));
          if (p.code) body.appendChild(ui.code({ code: p.code }));
          const li = h("li", { class: "exam-step" + (p.hint ? " hint" : ""), tabindex: "-1" },
            h("p", { class: "exam-step-t" }, h("span", { class: "exam-tag" }, p.hint ? "Hint" : "Step " + (i + 1 - parts.filter(q => q.hint).length)), " " + p.label), body);
          li.hidden = true;
          return li;
        });
        list.append(...items);
        const bNext = h("button", { type: "button", class: "btn primary small" });
        const bAll = h("button", { type: "button", class: "btn small" }, "Show all");
        const bHide = h("button", { type: "button", class: "btn small ghost" }, "Hide all");
        const count = h("span", { class: "small muted exam-count", "aria-live": "polite" });
        function draw() {
          items.forEach((li, i) => (li.hidden = i >= shown));
          const next = parts[shown];
          bNext.textContent = next ? (next.hint ? "Show hint: " : "Show next: ") + next.label : "All steps shown";
          bNext.disabled = !next;
          bAll.disabled = !next;
          count.textContent = shown + " of " + parts.length + " shown";
        }
        bNext.onclick = () => { shown++; draw(); items[shown - 1].focus(); };
        bAll.onclick = () => { shown = parts.length; draw(); };
        bHide.onclick = () => { shown = 0; draw(); };
        el.append(list, h("div", { class: "row-wrap" }, bNext, bAll, bHide, count));
        draw();
      },
    };
  }

  // Adjacency matrix of an undirected tree with n nodes.
  function matrixOf(n, edges) {
    const m = Array.from({ length: n }, () => Array(n).fill(0));
    edges.forEach(([a, b]) => { m[a][b] = 1; m[b][a] = 1; });
    return m;
  }

  // Trees used on the pages. Positions are viewBox units for D.graph.
  const TREE_A = {   // Q6: 6 vending machines
    n: 6, edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5]], w: 270, h: 190,
    pos: { 0: [140, 28], 1: [75, 92], 2: [210, 92], 3: [35, 158], 4: [115, 158], 5: [210, 158] },
  };
  const TREE_B = {   // Mock M6: 7 bike stations
    n: 7, edges: [[0, 1], [0, 2], [1, 3], [2, 4], [2, 5], [5, 6]], w: 300, h: 250,
    pos: { 0: [150, 28], 1: [70, 92], 2: [220, 92], 3: [70, 158], 4: [175, 158], 5: [262, 158], 6: [262, 222] },
  };
  TREE_A.m = matrixOf(TREE_A.n, TREE_A.edges);
  TREE_B.m = matrixOf(TREE_B.n, TREE_B.edges);

  // Matrix as an HTML table. opts: { row: highlighted row, hit: Set of columns to mark in that row }
  function matrixTable(m, opts) {
    opts = opts || {};
    const t = h("table", { class: "exam-mx", "aria-label": "adjacency matrix" });
    t.appendChild(h("tr", null, h("th", null, ""), m.map((_, j) => h("th", { scope: "col" }, String(j)))));
    m.forEach((r, i) => t.appendChild(h("tr", { class: i === opts.row ? "on" : null },
      h("th", { scope: "row" }, String(i)),
      r.map((v, j) => h("td", { class: i === opts.row && opts.hit && opts.hit.has(j) ? "hit" : null }, String(v))))));
    return h("div", { class: "exam-mx-wrap" }, t);
  }

  // The tree drawing. tones: { node: tone }, subs: { node: "text" }
  function treeDraw(T, tones, subs, label) {
    return D.graph({
      w: T.w, h: T.h, r: 18, label: label || "tree",
      nodes: Object.keys(T.pos).map(k => ({ id: k, x: T.pos[k][0], y: T.pos[k][1], tone: (tones || {})[k], sub: (subs || {})[k] })),
      edges: T.edges.map(([a, b]) => ({ from: String(a), to: String(b) })),
    });
  }

  // Code used by the DFS stepper (iterative, with a stack).
  const DFS_CODE = `
    def dfs_route(adj_matrix, start):
        n = len(adj_matrix)                      # number of machines
        visited = []                             # visit order: the answer
        stack = [start]                          # machines waiting for a visit

        while stack:                             # until nobody is waiting
            node = stack.pop()                   # take the LAST one added
            visited.append(node)                 # restock it now

            for nb in range(n - 1, -1, -1):      # every machine, high to low
                if adj_matrix[node][nb] == 1 and nb not in visited:
                    stack.append(nb)             # a neighbour: visit it later

        return visited                           # after the loop, not inside`;

  // Simulate DFS_CODE and make one stepper step per moment.
  function dfsSteps(T, start) {
    const m = T.m, n = T.n;
    const S = [];
    const snap = (o) => Object.assign({ visited: visited.slice(), stack: stack.slice(), node: cur, row: null, hit: null }, o);
    let visited = [], stack = [], cur = null;
    const vars = () => ({ n: String(n), start: String(start), node: cur == null ? "–" : String(cur), stack: pyrepr(stack), visited: pyrepr(visited) });
    S.push(snap({ line: 0, now: `We call <code>dfs_route(adj_matrix, ${start})</code>. Press <b>Step</b>.`, vars: { start: String(start) } }));
    S.push(snap({ line: 2, now: `<code>len(adj_matrix)</code> counts the rows: <b>${n}</b> machines.`, vars: { n: String(n), start: String(start) } }));
    S.push(snap({ line: 3, now: "An empty list. It will hold the visit order.", vars: { n: String(n), start: String(start), visited: "[]" } }));
    stack = [start];
    S.push(snap({ line: 4, now: `The stack starts with the start machine: <code>[${start}]</code>.`, vars: vars() }));
    while (stack.length) {
      S.push(snap({ line: 6, now: `The stack is <code>${pyrepr(stack)}</code>: not empty, so go round.`, vars: vars() }));
      cur = stack.pop();
      S.push(snap({ line: 7, now: `<code>pop()</code> takes the <b>last</b> item: <b>${cur}</b>. Stack left: <code>${pyrepr(stack)}</code>.`, vars: vars() }));
      visited.push(cur);
      S.push(snap({ line: 8, now: `Restock machine ${cur}. <code>visited</code> is now <code>${pyrepr(visited)}</code>.`, vars: vars() }));
      const ones = [], fresh = [];
      for (let j = 0; j < n; j++) if (m[cur][j] === 1) { ones.push(j); if (!visited.includes(j)) fresh.push(j); }
      S.push(snap({ line: 11, row: cur, hit: new Set(fresh), now: `Row ${cur} of the matrix is <code>${pyrepr(m[cur])}</code>. The 1s are in columns <b>${ones.join(", ")}</b>. Not visited yet: <b>${fresh.length ? fresh.join(", ") : "none"}</b>.`, vars: vars() }));
      if (!fresh.length) {
        S.push(snap({ line: 11, row: cur, hit: new Set(), now: `Machine ${cur} has no unvisited neighbour: this branch is finished. Back to the <code>while</code>: that is the <b>backtracking</b>.`, vars: vars() }));
      }
      for (let j = n - 1; j >= 0; j--) {
        if (m[cur][j] === 1 && !visited.includes(j)) {
          stack.push(j);
          S.push(snap({ line: 12, row: cur, hit: new Set(fresh), pushed: j, now: `Push <b>${j}</b>. Stack: <code>${pyrepr(stack)}</code>.` + (fresh.length > 1 && j === Math.min(...fresh) ? " The lowest number went on <b>last</b>, so it comes off <b>first</b>." : ""), vars: vars() }));
        }
      }
    }
    cur = null;
    S.push(snap({ line: 6, now: "The stack is empty. Every machine has been visited, so the loop ends.", vars: vars() }));
    S.push(snap({ line: 14, now: `Return the order: <b><code>${pyrepr(visited)}</code></b>.`, vars: vars(), done: true }));
    return S;
  }

  function dfsVisual(T) {
    return (el, st) => {
      const tones = {}, subs = {};
      st.stack.forEach(k => { tones[k] = "accent"; subs[k] = "waiting"; });
      st.visited.forEach((k, i) => { tones[k] = "done"; subs[k] = "#" + (i + 1); });
      if (st.node != null && !st.done) { tones[st.node] = "cmp"; subs[st.node] = "now #" + (st.visited.indexOf(st.node) + 1); }
      el.append(
        h("div", { class: "exam-two" },
          treeDraw(T, tones, subs, "tree of machines, coloured by DFS state"),
          h("div", { class: "exam-vis" },
            h("p", { class: "eyebrow", style: "margin:0" }, "adj_matrix (row = from, column = to)"),
            matrixTable(T.m, { row: st.row, hit: st.hit }))),
        h("div", { class: "exam-vis", style: "margin-top:10px" },
          D.array(st.stack, { name: "stack", marks: st.stack.length ? { [st.stack.length - 1]: "held" } : {}, ptrs: st.stack.length ? { [st.stack.length - 1]: "top" } : {}, emptyText: "[ ]  empty" }),
          D.array(st.visited, { name: "visited", marks: Object.fromEntries(st.visited.map((_, i) => [i, "done"])), emptyText: "[ ]  nothing yet" })));
    };
  }
  const DFS_LEGEND = [["cmp", "visiting now"], ["held", "waiting on the stack"], ["done", "visited (with its number)"]];

  // Click a row of the matrix and see which machines it connects.
  function matrixWidget(T, word) {
    return el => {
      let row = 0;
      const seg = h("div", { class: "seg", role: "group", "aria-label": "Pick a row of the matrix" });
      for (let i = 0; i < T.n; i++) seg.appendChild(h("button", { type: "button", onclick: () => { row = i; draw(); } }, "row " + i));
      const pic = h("div"), out = h("p", { class: "exam-msg", "aria-live": "polite" });
      function draw() {
        [...seg.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === row)));
        const nb = [];
        T.m[row].forEach((v, j) => { if (v === 1) nb.push(j); });
        const tones = { [row]: "cmp" };
        nb.forEach(j => (tones[j] = "accent"));
        pic.replaceChildren(h("div", { class: "exam-two" }, treeDraw(T, tones, {}, "tree"), matrixTable(T.m, { row, hit: new Set(nb) })));
        out.innerHTML = `<code>adj_matrix[${row}]</code> is <code>${pyrepr(T.m[row])}</code>. The 1s sit in columns <b>${nb.join(", ")}</b>, so ${word} ${row} is joined to ${word}${nb.length > 1 ? "s" : ""} <b>${nb.join(" and ")}</b>. Check one cell: <code>adj_matrix[${row}][${nb[0]}]</code> is 1, and <code>adj_matrix[${nb[0]}][${row}]</code> is 1 too (a path goes both ways).`;
      }
      el.append(seg, h("div", { style: "margin-top:12px" }, pic), out);
      draw();
    };
  }

  // numpy-style printing of a 1-D array of ints or bools
  function npInts(a) { const w = Math.max(1, ...a.map(x => String(x).length)); return "[" + a.map(x => String(x).padStart(w)).join(" ") + "]"; }
  function npBools(a) { return "[" + a.map(x => (x ? "True" : "False").padStart(a.some(y => !y) ? 5 : 4)).join(" ") + "]"; }

  const randint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const choice = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ================================================================
     TOPIC 0: Format & strategy
     ================================================================ */

  function planWidget(el) {
    const id = "exam-plan-min";
    const PLAN = [
      ["Read all 6 questions first", 5, true],
      ["Q1 classes", 20], ["Q2 syntax errors", 8], ["Q3 inventory function", 12], ["Q4 debug + explain", 15],
      ["Q5 NumPy", 12], ["Q6 DFS + explain", 18],
      ["Restart & run all, export PDF, upload both files", 10, true],
    ];
    const s = h("input", { type: "range", min: "60", max: "240", step: "15", value: "120", id });
    const v = h("b", { class: "mono" });
    const rows = h("div", { class: "exam-plan" });
    function draw() {
      const T = +s.value;
      v.textContent = T + " min";
      rows.replaceChildren(...PLAN.map(([name, pct, alt]) => h("div", { class: "exam-plan-row" },
        h("span", null, name), h("b", { class: "mono" }, Math.round(T * pct / 100) + " min"),
        h("span", { class: "bar" + (alt ? " alt" : ""), style: `width:${pct * 4}%`, "aria-hidden": "true" }))));
    }
    s.oninput = draw;
    el.append(h("div", { class: "row-wrap" }, h("label", { class: "small muted", for: id }, "Total exam time"), s, v), rows,
      h("p", { class: "small muted", style: "margin:10px 0 0" }, "The split is a suggestion: Q1 and Q6 are the longest to write; Q2 is quick if you scan line by line. If you are stuck for more than 5 minutes, move on and come back."));
    draw();
  }

  const format = {
    id: "format",
    title: "Format & strategy",
    summary: "What the exam looks like, what to hand in, the six question types and where to revise each one.",
    exam: ["All 6 questions"],
    sources: "Exam w25 intro",
    blocks: [
      { type: "h", text: "What the exam looks like", sub: "From last year's paper (Final exam, Winter 2025–26)" },
      { type: "table", head: ["Part", "Last year"], rows: [
        ["Type", "Written sit-in, in <b>Jupyter</b>. Course code CDSCO2402E."],
        ["Time", "Not printed on the paper. Check Digital Exam for your sitting."],
        ["Story", "One scenario runs through all six questions: a network of <b>Smart Vending Machines</b> (items, stock, coins, usage, restock routes)."],
        ["Setup", "Only <code>import numpy as np</code> is given. No pandas, no plots."],
        ["Questions", "6 questions, no marks shown. 4 are “write a short function”, 2 are “find the bugs”. 3 also want a written explanation."],
        ["Explanations", "In a <b>separate Markdown cell</b>, not as comments in the code cell."],
        ["Missing values", "“If exact values are NOT provided then use own relevant values.” Make up a small example and say so."],
      ] },
      { type: "callout", kind: "exam", title: "Hand-in checklist", html: `<ul>
        <li>Your <b>student ID</b> at the top of the notebook.</li>
        <li>The <b>.ipynb</b> file, uploaded as an <b>attachment</b>.</li>
        <li>A <b>PDF</b> export of the notebook, uploaded as the <b>main document</b>. If PDF export fails: paste the code into Word and export that as PDF.</li>
        <li>Comments in your code, so the marker can follow it.</li></ul>` },

      { type: "h", text: "The six questions, and where to revise", sub: "Each Q has a drill page in this subject. The last column links to the teaching pages." },
      { type: "table", head: ["Q", "Topic", "Type", "Drill", "Revise"], rows: [
        ["Q1", "Classes, inheritance, abstract method, unique ID, <code>random</code>", "write code", "<a href='#exam/q1-oop'>Q1 drill</a>", "<a href='#oop'>Classes (OOP)</a>"],
        ["Q2", "Syntax errors <b>with line numbers</b>", "find + fix", "<a href='#exam/q2-syntax'>Q2 drill</a>", "<a href='#foundations/basics'>Basics</a>, <a href='#oop'>errors &amp; debugging</a>"],
        ["Q3", "Function with <code>if/else</code>, NumPy indexing, list as a queue", "write code", "<a href='#exam/q3-inventory'>Q3 drill</a>", "<a href='#foundations/functions'>Functions</a>, <a href='#data'>Lists</a>, <a href='#algorithms'>queues</a>"],
        ["Q4", "Debugging: syntax + runtime + logic", "find + explain", "<a href='#exam/q4-debug'>Q4 drill</a>", "<a href='#oop'>errors &amp; debugging</a>, <a href='#foundations/basics'><code>=</code> vs <code>==</code></a>"],
        ["Q5", "NumPy row totals, compare, indices", "write code", "<a href='#exam/q5-numpy'>Q5 drill</a>", "<a href='#datasci'>NumPy</a>"],
        ["Q6", "DFS on a tree given as an adjacency matrix", "write code + explain", "<a href='#exam/q6-dfs'>Q6 drill</a>", "<a href='#algorithms'>Trees, DFS &amp; BFS</a>"],
      ] },
      `<p>Then try the <a href="#exam/mock-1">mock exam, part 1</a> and <a href="#exam/mock-2">part 2</a>: same six types, new story.</p>`,

      { type: "h", text: "Plan your time", sub: "Drag to your real exam length. Minutes per part update." },
      { type: "widget", render: planWidget },

      { type: "h", text: "Exam-day tips" },
      { type: "table", head: ["Do this", "Tiny example"], rows: [
        ["Copy the given names <b>exactly</b>.", "<code>process_inventory</code>, <code>low_stock_queue</code>, not <code>inventory</code> or <code>queue</code>"],
        ["<b>Return</b>, don't print, unless the task says print.", "<code>return True</code>, then <code>print(process_inventory(...))</code> outside"],
        ["Always add a <b>small example call</b> and leave its output showing.", "<code>print(high_demand_machines(usage_matrix, 25))  # [1 3]</code>"],
        ["Line numbers count from the <b>first line of the cell</b>, comment lines too.", "In Q2 the first line is <code># Your code here for Q2</code>, so <code>retrun False</code> is line 6"],
        ["Quote the line when you name it.", "“Line 3, <code>if stock_array[item_index] &gt; 0</code>: missing <code>:</code>”"],
        ["State your assumptions in Markdown.", "“<code>min_stock</code> is not used by the rules, so my function ignores it.”"],
        ["Before export: <b>Kernel → Restart &amp; Run All</b>.", "Catches a NameError hidden by an old cell you deleted"],
      ] },
      { type: "callout", kind: "rule", title: "The 3–4 sentence explanation: what, why, fix", html: `<p>Use the same three moves for every bug: <b>what</b> is wrong (line + kind of error), <b>why</b> it is wrong (the rule it breaks, what happens), and the <b>fix</b>.</p>
        <p><i>Example for <code>if total = price:</code></i>: “Line 4 is a syntax error. <code>=</code> stores a value, but a condition must ask a question, and asking “equal?” is <code>==</code>. Because it is a syntax error, Python does not run any of the cell. Fix: <code>if total == price:</code>.”</p>` },

      { type: "h", text: "Warm-up: the exam's own data" },
      {
        type: "tryit",
        title: "Look at the vending-machine arrays",
        task: "This is what Q2 and Q3 work with. Run it, then change <code>stock</code> and run again.",
        code: `
          import numpy as np                             # the exam's only setup cell

          items = np.array(["cola", "chips", "water"])   # item names
          stock = np.array([3, 0, 5])                    # how many of each are left

          print(stock[1])                                # stock of chips: 0
          print(stock > 0)                               # which items can be sold
          print(items[stock > 0])                        # their names`,
      },
      { type: "mistakes", title: "Mistakes that cost marks for free", items: [
        { title: "Explanation as a code comment", wrong: "# line 4 is wrong because = stores", right: "(a Markdown cell)\nLine 4 is a syntax error: ...", why: "The paper says: explanations go in a <b>separate Markdown cell</b>." },
        { title: "Renaming what was given", wrong: "def inventory(s, i, q):", right: "def process_inventory(stock, item_index, min_stock, low_stock_queue):", why: "The marker looks for the given signature. Keep every parameter, even an unused one." },
        { title: "Printing instead of returning", wrong: "if stock[item_index] > 0:\n    print(True)", right: "if stock[item_index] > 0:\n    return True", why: "<code>print</code> only shows it. The caller gets <code>None</code> back." },
        { title: "No example call", wrong: "def high_demand_machines(m, t):\n    ...\n# (nothing else)", right: "result = high_demand_machines(usage_matrix, 25)\nprint(result)   # [1 3]", why: "Q5 asks for an example call and a print. Every other Q also looks better with one." },
        { title: "Forgetting the setup cell", wrong: "stock = np.array([3, 0, 5])\n# NameError: name 'np' is not defined", right: "import numpy as np\nstock = np.array([3, 0, 5])", why: "Run the <code>import numpy as np</code> cell first. Restart &amp; Run All catches this." },
      ] },
    ],
    quiz: [
      { type: "mc", q: "What do you upload to Digital Exam?", options: ["Only the .ipynb file", "Only a PDF", "The .ipynb as an attachment <b>and</b> a PDF as the main document", "A .py file"], answer: 2,
        hint: "The paper lists two files.", explain: "Both: the notebook (.ipynb) as attachment, its PDF export as the main document." },
      { type: "mc", q: "Q4 asks you to explain each bug. Where does the explanation go?", options: ["As <code>#</code> comments next to the code", "In a separate Markdown cell", "In a <code>print()</code> call", "In the docstring"], answer: 1,
        hint: "Read instruction 3 of the paper.", explain: "“Write the explanation in a separate Markdown cell, not in the same code cell.”" },
      { type: "mc", q: "In this cell, which line number is <code>retrun False</code>?", code: `
          # Your code here for Q2
          def has_stock(stock_array, item_index):
              if stock_array[item_index] > 0
                  return True
              else
                  retrun False`,
        options: ["4", "5", "6", "7"], answer: 2,
        hint: "Count from the very first line of the cell, the comment line too.", explain: "Line 1 is the comment, line 2 the <code>def</code>, … , line 6 is <code>retrun False</code>." },
      { type: "mc", q: "Q5 says “provide a short example” but gives no values for one part. What do you do?", options: ["Skip that part", "Make up small values of your own and say so", "Ask the invigilator for values", "Use random numbers without saying"], answer: 1,
        hint: "There is a red line about this on the paper.", explain: "“If exact values are NOT provided then use own relevant values.” Keep them small so the result is easy to check." },
      { type: "explain", q: "Write the Markdown explanation (3–4 sentences) for this bug: line 5 is <code>else</code> with no colon.",
        answer: "<p>Line 5 is a syntax error: <code>else</code> has no colon. Every line that opens a block (<code>if</code>, <code>elif</code>, <code>else</code>, <code>for</code>, <code>while</code>, <code>def</code>, <code>class</code>) must end with <code>:</code>. Because it is a syntax error, Python does not run any line of the cell. The fix is <code>else:</code>.</p>",
        points: ["names the line and says “syntax error”", "the rule: block lines end with <code>:</code>", "what happens: nothing in the cell runs", "the fix: <code>else:</code>"],
        hint: "What, why, fix." },
    ],
  };

  /* ================================================================
     TOPIC Q1: Classes
     ================================================================ */

  function foodWidget(el) {
    let nextId = 1, objs = [], msg = "Press a button to build an object.", err = false;
    const blue = h("div", { class: "exam-blue", "aria-live": "polite" });
    const box = h("div", { class: "exam-objs" });
    const out = h("p", { class: "exam-msg" });
    const make = kind => {
      const id = nextId;
      const o = { kind, id, cal: randint(50, 300), cat: kind === "Snacks" ? choice(["vegan", "non-vegan"]) : choice(["normal", "diet", "zero"]) };
      nextId++;
      objs.push(o);
      if (objs.length > 12) objs.shift();
      err = false;
      msg = `<code>${kind}()</code>: <code>Food.next_id</code> was <b>${id}</b>, so <code>self.id = ${id}</code>. Then <code>Food.next_id += 1</code> makes it <b>${nextId}</b> for the next object. Calories: <code>randint(50, 300)</code> gave ${o.cal}. Category: <code>choice(...)</code> gave '${o.cat}'.`;
      draw(o);
    };
    const btns = h("div", { class: "row-wrap" },
      h("button", { type: "button", class: "btn small", onclick: () => make("Snacks") }, "Snacks()"),
      h("button", { type: "button", class: "btn small", onclick: () => make("Beverages") }, "Beverages()"),
      h("button", { type: "button", class: "btn small", onclick: () => { err = true; msg = "<b>TypeError:</b> Can't instantiate abstract class Food without an implementation for abstract method 'assign_category'. <br>Good: that is what <code>@abstractmethod</code> is for. Only the subclasses can be built."; draw(); } }, "Food()"),
      h("button", { type: "button", class: "btn small ghost", onclick: () => { nextId = 1; objs = []; err = false; msg = "Back to the start: <code>Food.next_id = 1</code>, no objects."; draw(); } }, "Reset"));
    function draw(fresh) {
      blue.innerHTML = `<span>class <b>Food</b> (the blueprint)</span><span><code>Food.next_id</code> = <b>${nextId}</b></span><span class="small muted">one copy, shared by every object</span>`;
      box.replaceChildren(...(objs.length ? objs.map(o => h("div", { class: "exam-obj" + (o === fresh ? " new" : "") },
        h("b", null, o.kind + " object"),
        h("span", { class: "mono" }, "id = " + o.id),
        h("span", { class: "mono" }, "calories = " + o.cal),
        h("span", { class: "mono" }, "category = '" + o.cat + "'"))) : [h("p", { class: "small muted", style: "margin:0" }, "No objects yet.")]));
      out.className = "exam-msg" + (err ? " err" : "");
      out.innerHTML = msg;
    }
    el.append(btns, blue, box, out);
    draw();
  }

  const Q1_MODEL = `
    import random                                # randint and choice
    from abc import ABC, abstractmethod          # for the abstract method

    class Food(ABC):                             # the parent class
        next_id = 1                              # class variable: ONE shared counter

        def __init__(self):
            self.id = Food.next_id               # this object gets the current number
            Food.next_id += 1                    # through the CLASS, so the next object gets +1
            self.calories = self.assign_calories()   # a method gives the value
            self.category = self.assign_category()   # each subclass decides

        def assign_calories(self):
            return random.randint(50, 300)       # 50 and 300 are both possible

        @abstractmethod
        def assign_category(self):               # no body: each subclass must write it
            pass

        def __str__(self):                       # used by print(); must RETURN a string
            return f"{self.kind} #{self.id}: {self.calories} kcal, {self.category}"


    class Snacks(Food):
        kind = "Snack"                           # used by __str__

        def assign_category(self):
            return random.choice(["vegan", "non-vegan"])


    class Beverages(Food):
        kind = "Beverage"

        def assign_category(self):
            return random.choice(["normal", "diet", "zero"])


    snacks = [Snacks() for i in range(200)]          # 200 separate objects
    beverages = [Beverages() for i in range(200)]    # 200 more

    print(len(snacks), len(beverages))           # 200 200
    for item in snacks[:3] + beverages[:3]:      # a small selection
        print(item)`;

  const Q1_TEST = py(`
    s = [Snacks() for i in range(200)]
    b = [Beverages() for i in range(200)]
    ids = [x.id for x in s + b]
    assert len(set(ids)) == len(ids), 'every object needs its own id (check Food.next_id += 1)'
    assert all(50 <= x.calories <= 300 for x in s + b), 'calories must be between 50 and 300'
    assert set(x.category for x in s) == {'vegan', 'non-vegan'}, "Snacks: 'vegan' or 'non-vegan'"
    assert set(x.category for x in b) == {'normal', 'diet', 'zero'}, "Beverages: 'normal', 'diet' or 'zero'"
    assert isinstance(s[0], Food) and isinstance(b[0], Food), 'Snacks and Beverages must inherit from Food'
    try:
        Food()
        built = True
    except TypeError:
        built = False
    assert not built, 'Food() should fail: make assign_category an @abstractmethod and Food(ABC)'`);

  const q1 = {
    id: "q1-oop",
    title: "Q1 · Classes",
    summary: "Write <code>Food</code> with subclasses <code>Snacks</code> and <code>Beverages</code>: unique ID, random calories, an abstract category method, 200 objects each.",
    exam: ["Q1 write code"],
    sources: "Exam w25 Q1; L4 p18–25; NB §20",
    blocks: [
      { type: "h", text: "The task in plain words" },
      { type: "table", head: ["The paper asks for…", "In Python that is…"], rows: [
        ["a parent class <code>Food</code> and two subclasses <code>Snacks</code>, <code>Beverages</code>", "<code>class Food(ABC):</code> and <code>class Snacks(Food):</code>"],
        ["a <b>unique ID</b> for every object", "a class counter: <code>Food.next_id</code>, copied into <code>self.id</code>, then <code>+= 1</code>"],
        ["calories from a <b>method</b>, random 50–300", "<code>def assign_calories(self): return random.randint(50, 300)</code>"],
        ["an <b>abstract method</b> in the parent that sets the category", "<code>@abstractmethod</code> <code>def assign_category(self)</code>; each subclass writes its own"],
        ["Snacks: “vegan” or “non-vegan”; Beverages: “normal”, “diet” or “zero”", "<code>random.choice([...])</code>"],
        ["200 objects of each subclass", "<code>[Snacks() for i in range(200)]</code>"],
        ["print a small selection", "a <code>__str__</code> method, then <code>for item in snacks[:3]: print(item)</code>"],
      ] },
      { type: "callout", kind: "tip", title: "The two random tools you need", html: `<p><code>random.randint(50, 300)</code> gives a whole number from 50 to 300, <b>both ends included</b>. Tiny example: <code>randint(1, 3)</code> gives 1, 2 or 3.</p>
        <p><code>random.choice(["vegan", "non-vegan"])</code> picks one item of the list. Tiny example: <code>choice([10, 20])</code> gives 10 or 20.</p>` },

      { type: "h", text: "How to attack it", sub: "Small steps. Run after each one." },
      `<ol>
        <li><b>Imports</b>: <code>random</code>, and <code>ABC, abstractmethod</code> from <code>abc</code>.</li>
        <li><b>Food</b> with the counter <code>next_id = 1</code> in the class body (not in <code>__init__</code>).</li>
        <li><b>__init__</b>: copy the counter into <code>self.id</code>, add 1 to <code>Food.next_id</code>, then call the two methods.</li>
        <li><b>assign_calories</b> (normal method) and <b>assign_category</b> (abstract, body <code>pass</code>).</li>
        <li><b>Snacks</b> and <b>Beverages</b>: each writes only its own <code>assign_category</code>.</li>
        <li><b>__str__</b> so <code>print(item)</code> looks nice.</li>
        <li><b>200 each</b> with a list comprehension, then print a few with a slice.</li>
      </ol>`,
      reveal([
        { hint: true, label: "Where does the counter live?", html: "<p>It must be <b>one</b> number shared by all objects. A variable written in the class body (not after <code>self.</code>) is shared. Update it with <code>Food.next_id += 1</code>, never <code>self.next_id += 1</code>.</p>" },
        { hint: true, label: "What does “abstract” look like?", html: "<p>Exactly like <code>Shape.area</code> from the Classes subject: the parent inherits from <code>ABC</code>, the method gets <code>@abstractmethod</code> on the line above, and its body is just <code>pass</code>.</p>" },
        { label: "Imports and the counter", code: `
            import random                            # randint and choice
            from abc import ABC, abstractmethod      # for the abstract method

            class Food(ABC):
                next_id = 1                          # ONE shared counter, on the class` },
        { label: "__init__: give out the ID, then fill the attributes", code: `
                def __init__(self):
                    self.id = Food.next_id           # copy the current number into this object
                    Food.next_id += 1                # move the shared counter on
                    self.calories = self.assign_calories()
                    self.category = self.assign_category()`,
          html: "<p>Note: <code>__init__</code> calls <code>self.assign_category()</code>. For a <code>Snacks</code> object, Python finds the Snacks version: that is inheritance doing the work.</p>" },
        { label: "The two methods in Food", code: `
                def assign_calories(self):
                    return random.randint(50, 300)   # both ends included

                @abstractmethod
                def assign_category(self):           # subclasses MUST write this
                    pass` },
        { label: "The subclasses", code: `
            class Snacks(Food):
                kind = "Snack"

                def assign_category(self):
                    return random.choice(["vegan", "non-vegan"])


            class Beverages(Food):
                kind = "Beverage"

                def assign_category(self):
                    return random.choice(["normal", "diet", "zero"])` },
        { label: "__str__, 200 objects, a small print", code: `
                def __str__(self):                   # inside Food; RETURN the text
                    return f"{self.kind} #{self.id}: {self.calories} kcal, {self.category}"

            snacks = [Snacks() for i in range(200)]
            beverages = [Beverages() for i in range(200)]

            for item in snacks[:3] + beverages[:3]:  # first 3 of each
                print(item)`,
          html: "<p>Output looks like <code>Snack #1: 173 kcal, vegan</code> … <code>Beverage #201: 88 kcal, zero</code>. The beverages start at 201 because the counter is shared.</p>" },
      ]),

      { type: "h", text: "Watch the shared counter", sub: "Build objects. The blueprint holds one counter; each object keeps its own id." },
      { type: "widget", render: foodWidget },
      { type: "tryit", title: "The full model answer", task: "Run it. Run it again: the IDs stay the same, the calories and categories change. Then try <code>Food()</code> at the end and read the error.", code: Q1_MODEL },
      { type: "mistakes", items: [
        { title: "Counting through <code>self</code>", wrong: "self.id = self.next_id\nself.next_id += 1", right: "self.id = Food.next_id\nFood.next_id += 1", why: "<code>self.next_id += 1</code> makes a <b>new</b> attribute on this one object. The class counter stays 1, so every object gets id 1." },
        { title: "One object, 200 times", wrong: "snacks = [Snacks()] * 200", right: "snacks = [Snacks() for i in range(200)]", why: "<code>* 200</code> repeats the <b>same</b> object 200 times: one id, one calorie value. The comprehension calls <code>Snacks()</code> 200 times." },
        { title: "<code>__str__</code> that prints", wrong: "def __str__(self):\n    print(self.id)", right: "def __str__(self):\n    return f\"Snack #{self.id}\"", why: "<code>__str__</code> must <b>return</b> a string. Printing inside it makes <code>print(item)</code> crash with a TypeError." },
        { title: "Abstract method that is not abstract", wrong: "class Food:\n    def assign_category(self):\n        pass", right: "class Food(ABC):\n    @abstractmethod\n    def assign_category(self):\n        pass", why: "Both parts are needed: <code>Food(ABC)</code> and the <code>@abstractmethod</code> line. Then <code>Food()</code> is refused." },
        { title: "Forgetting <code>self</code>", wrong: "def assign_calories():\n    return random.randint(50, 300)", right: "def assign_calories(self):\n    return random.randint(50, 300)", why: "Python passes the object in as the first argument. Without <code>self</code>: TypeError “takes 0 positional arguments but 1 was given”." },
        { title: "Off-by-range randoms", wrong: "random.randrange(50, 300)", right: "random.randint(50, 300)", why: "<code>randrange</code> stops <b>before</b> 300 (like <code>range</code>). <code>randint</code> includes both ends." },
      ] },
    ],
    quiz: [
      { type: "write", q: "Exam Q1. Write <code>Food</code>, <code>Snacks</code> and <code>Beverages</code>. Use the attribute names <code>id</code>, <code>calories</code>, <code>category</code> and the abstract method <code>assign_category</code>. The checks build 200 of each and test the IDs, the ranges, the categories, and that <code>Food()</code> is refused.",
        starter: `
          import random
          from abc import ABC, abstractmethod

          class Food(ABC):
              next_id = 1                      # shared counter

              def __init__(self):
                  pass                         # set self.id, self.calories, self.category

              def assign_calories(self):
                  pass                         # a random whole number 50..300

              # the abstract method assign_category goes here


          class Snacks(Food):
              pass                             # "vegan" or "non-vegan"


          class Beverages(Food):
              pass                             # "normal", "diet" or "zero"`,
        test: Q1_TEST,
        solution: Q1_MODEL,
        hint: "Counter: <code>self.id = Food.next_id</code> then <code>Food.next_id += 1</code>. Abstract: <code>@abstractmethod</code> above <code>def assign_category(self): pass</code>. Each subclass: <code>return random.choice([...])</code>.",
        explain: "The class counter gives unique IDs; <code>__init__</code> calls the methods; the subclasses only write the part that differs." },
      { type: "predict", q: "What does this print?", code: `
          class Counter:
              next_id = 1

              def __init__(self):
                  self.id = Counter.next_id
                  Counter.next_id += 1

          a = Counter()
          b = Counter()
          c = Counter()
          print(a.id, c.id, Counter.next_id)`,
        answer: "1 3 4",
        hint: "Each new object takes the current counter, then the counter goes up by 1.", explain: "a gets 1, b gets 2, c gets 3. After c the counter is 4." },
      { type: "mc", q: "In <code>__init__</code> someone writes <code>self.id = self.next_id</code> and <code>self.next_id += 1</code>. What ids do the first three objects get?",
        options: ["1, 2, 3", "1, 1, 1", "0, 1, 2", "An AttributeError"], answer: 1,
        wrong: { 0: "That would need the class counter to change. Does <code>self.next_id += 1</code> change the class?" },
        hint: "<code>self.next_id += 1</code> reads the class value, then <b>stores</b> the result on this one object.", explain: "The class counter never moves, so each new object reads 1. The <code>+= 1</code> only puts a private 2 on that one object." },
      { type: "mc", q: "<code>snacks = [Snacks()] * 200</code>. How many <b>different</b> Snacks objects are there?",
        options: ["200", "1", "0", "201"], answer: 1,
        hint: "How many times is <code>Snacks()</code> actually called?", explain: "<code>Snacks()</code> runs once; <code>* 200</code> copies the <b>reference</b> 200 times. Use <code>[Snacks() for i in range(200)]</code>." },
      { type: "explain", q: "In 2–3 sentences: why make <code>assign_category</code> an abstract method in <code>Food</code>?",
        answer: "<p>Every food must have a category, but the parent cannot know the choices: Snacks and Beverages use different lists. An abstract method says “every subclass must write this method”, and Python refuses to build a plain <code>Food()</code>. So <code>__init__</code> can safely call <code>self.assign_category()</code>, and each subclass fills in its own version.</p>",
        points: ["parent does not know the categories", "subclass must implement it", "<code>Food()</code> itself cannot be built (TypeError)", "<code>__init__</code> calls the subclass's version"],
        hint: "Think of <code>Shape.area</code> from the Classes subject." },
    ],
  };

  /* ================================================================
     TOPIC Q2: Syntax errors
     ================================================================ */

  const Q2_CODE = `
    # Your code here for Q2
    def has_stock(stock_array, item_index):
        if stock_array[item_index] > 0
            return True
        else
            retrun False

    items = np.array(["cola", "chips", "water"])
    stock = np.array([3, 0, 5])

    print(has_stock(stock 1))`;
  const Q2_FIXED = `
    # Your code here for Q2
    def has_stock(stock_array, item_index):
        if stock_array[item_index] > 0:          # line 3: added :
            return True
        else:                                    # line 5: added :
            return False                         # line 6: retrun -> return

    items = np.array(["cola", "chips", "water"])
    stock = np.array([3, 0, 5])

    print(has_stock(stock, 1))                   # line 11: added the comma`;

  // "Run, fix the line Python points at, run again" widget for Q2.
  function q2Widget(el) {
    const base = PADS.lines(Q2_CODE);
    const FIX = { 3: "    if stock_array[item_index] > 0:", 5: "    else:", 6: "        return False", 11: "print(has_stock(stock, 1))" };
    const MSG = { 3: "SyntaxError: expected ':'", 5: "SyntaxError: expected ':'", 6: "SyntaxError: invalid syntax", 11: "SyntaxError: invalid syntax. Perhaps you forgot a comma?" };
    const order = [3, 5, 6, 11];
    let fixed = new Set(), ran = false, runs = 0;
    const codeBox = h("div"), out = h("pre", { class: "st-out exam-out", "aria-live": "polite" }), note = h("p", { class: "small", style: "margin:8px 0 0" });
    const bRun = h("button", { type: "button", class: "btn primary small" }, "Run the cell");
    const bFix = h("button", { type: "button", class: "btn small" }, "Fix the line Python points at");
    const bReset = h("button", { type: "button", class: "btn small ghost" }, "Reset");
    const first = () => order.find(n => !fixed.has(n));
    function draw() {
      const lines = base.map((l, i) => (fixed.has(i + 1) ? FIX[i + 1] : l));
      const f = first();
      codeBox.replaceChildren(ui.code({ code: lines, bad: ran && f ? [f] : [], good: [...fixed] }));
      if (!ran) { out.textContent = "(not run yet)"; note.innerHTML = ""; }
      else if (f) {
        out.textContent = `  File "cell", line ${f}\n    ${lines[f - 1].trim()}\n${MSG[f]}`;
        note.innerHTML = `Run ${runs}: Python stops at the <b>first</b> problem it meets (line ${f}). <b>Nothing</b> in the cell ran, not even line 2. ${4 - fixed.size} error${4 - fixed.size > 1 ? "s" : ""} left.`;
      } else {
        out.textContent = "False";
        note.innerHTML = `Run ${runs}: it works. Chips (index 1) has stock 0, so <code>has_stock</code> returns False. It took <b>${runs}</b> runs to find 4 errors one by one: in the exam, read every line yourself instead.`;
      }
      bFix.disabled = !ran || !f;
    }
    bRun.onclick = () => { ran = true; runs++; draw(); };
    bFix.onclick = () => { const f = first(); if (f) { fixed.add(f); ran = false; draw(); } };
    bReset.onclick = () => { fixed = new Set(); ran = false; runs = 0; draw(); };
    el.append(h("p", { class: "small muted", style: "margin:0 0 8px" }, "The exam cell needs the setup cell first (import numpy as np); here we pretend it ran."),
      codeBox, h("div", { class: "row-wrap", style: "margin-top:10px" }, bRun, bFix, bReset), out, note);
    draw();
  }

  const q2 = {
    id: "q2-syntax",
    title: "Q2 · Syntax errors",
    summary: "List every syntax error in <code>has_stock</code> <b>with its line number</b>, then write the corrected code.",
    exam: ["Q2 find + fix"],
    sources: "Exam w25 Q2; L5 p6–7",
    blocks: [
      { type: "h", text: "The task in plain words" },
      `<p>You get 11 lines of code that will not even start. Write down <b>each</b> syntax error with its <b>line number</b>, then write the whole corrected cell below. The function should return True if the item at <code>item_index</code> has stock above 0.</p>`,
      { type: "code", code: Q2_CODE, caption: "The exam cell (line 1 is the comment)" },
      { type: "callout", kind: "exam", title: "Line numbers start at the top of the cell", html: "<p>Line 1 is <code># Your code here for Q2</code>. Say which way you count if you are unsure (“counting the comment as line 1”).</p>" },

      { type: "h", text: "How to attack it", sub: "Read every line against this checklist. Don't trust the first error message alone." },
      { type: "table", head: ["Look for", "Broken", "Fixed"], code: [1, 2], rows: [
        ["<code>:</code> at the end of <code>def if elif else for while class</code>", "else", "else:"],
        ["keywords spelled right", "retrun False", "return False"],
        ["a comma between arguments", "has_stock(stock 1)", "has_stock(stock, 1)"],
        ["brackets and quotes in pairs", "print(\"hi)", "print(\"hi\")"],
        ["<code>==</code> (ask) in a condition, not <code>=</code> (store)", "if x = 0:", "if x == 0:"],
        ["indentation: 4 spaces per level", "def f():\nreturn 1", "def f():\n    return 1"],
      ] },
      reveal([
        { hint: true, label: "How many are there?", html: "<p>Four. Two are the same kind.</p>" },
        { hint: true, label: "Where to look", html: "<p>Check the end of lines 3 and 5, the spelling on line 6, and the gap between the two arguments on line 11.</p>" },
        { label: "Write the list (this is the answer to part 1)", html: "" },
        { label: "Write the corrected code (part 2)", code: Q2_FIXED,
          html: "<p>Not syntax errors, but worth one line in Markdown: <code>np</code> comes from the exam's setup cell (<code>import numpy as np</code>), and <code>items</code> is never used.</p>" },
      ].map((p, i) => (i === 2 ? Object.assign(p, { html: ui.table({ head: ["Line", "Code", "Error", "Fix"], rows: [
        ["3", "<code>if stock_array[item_index] &gt; 0</code>", "missing <code>:</code> after the <code>if</code>", "add <code>:</code>"],
        ["5", "<code>else</code>", "missing <code>:</code> after <code>else</code>", "<code>else:</code>"],
        ["6", "<code>retrun False</code>", "misspelled keyword", "<code>return False</code>"],
        ["11", "<code>has_stock(stock 1)</code>", "missing comma between the arguments", "<code>has_stock(stock, 1)</code>"],
      ] }).outerHTML }) : p))),

      { type: "h", text: "Run, fix, run again", sub: "This is how Python reports them: one at a time." },
      { type: "widget", render: q2Widget },
      { type: "tryit", title: "Fix it yourself", task: "Run it, read the error and its line, fix that line, run again. Stop when it prints <code>False</code>.",
        code: `
          import numpy as np                       # the exam's setup cell

          def has_stock(stock_array, item_index):
              if stock_array[item_index] > 0
                  return True
              else
                  retrun False

          items = np.array(["cola", "chips", "water"])
          stock = np.array([3, 0, 5])

          print(has_stock(stock 1))`,
        solution: `
          import numpy as np                       # the exam's setup cell

          def has_stock(stock_array, item_index):
              if stock_array[item_index] > 0:      # added :
                  return True
              else:                                # added :
                  return False                     # return, not retrun

          items = np.array(["cola", "chips", "water"])
          stock = np.array([3, 0, 5])

          print(has_stock(stock, 1))               # added the comma`,
        expectOutput: "False",
        solutionNote: "Here the line numbers are 2 higher than in the exam, because of the import line and the blank line at the top." },
      { type: "mistakes", items: [
        { title: "Trusting the first message", wrong: "# Python said line 3, so I list only line 3", right: "# read every line: 3, 5, 6 and 11", why: "Python stops at the first error. Your answer must list <b>all</b> of them." },
        { title: "Wrong line numbers", wrong: "Line 5: retrun", right: "Line 6: retrun False", why: "Count from the first line of the cell, the comment line too. Quote the line so the marker can find it anyway." },
        { title: "Calling it a runtime error", wrong: "retrun is a NameError", right: "retrun False is a SyntaxError", why: "<code>retrun False</code> is two names in a row: bad grammar. Python refuses before running anything." },
        { title: "“Fixing” things that are fine", wrong: "if stock_array[item_index] >= 1:", right: "if stock_array[item_index] > 0:", why: "Only fix what is broken. Changing working logic can cost marks and adds risk." },
        { title: "Only listing, not rewriting", wrong: "(a list of errors and nothing else)", right: "(the list, then the full corrected cell)", why: "Part 2 asks for the corrected code. Paste the whole cell, fixed, and run it." },
      ] },
    ],
    quiz: [
      { type: "bug", q: "The real exam cell. Click every line with a syntax error.", code: Q2_CODE,
        bugs: [3, 5, 6, 11],
        notes: { 3: "missing <code>:</code> after the <code>if</code>", 5: "missing <code>:</code> after <code>else</code>", 6: "<code>retrun</code> is not a keyword: <code>return</code>", 11: "missing comma: <code>has_stock(stock, 1)</code>" },
        fixed: Q2_FIXED,
        hint: "Four lines. Check line ends for <code>:</code>, keyword spelling, and commas between arguments.", explain: "Three kinds: missing colons (twice), a misspelled keyword, a missing comma." },
      { type: "write", q: "Write the corrected cell. The checks call <code>has_stock</code> on <code>np.array([3, 0, 5])</code>.",
        starter: `
          import numpy as np

          def has_stock(stock_array, item_index):
              if stock_array[item_index] > 0
                  return True
              else
                  retrun False

          stock = np.array([3, 0, 5])
          print(has_stock(stock 1))`,
        checks: [["has_stock(np.array([3, 0, 5]), 0)", "True"], ["has_stock(np.array([3, 0, 5]), 1)", "False"], ["has_stock(np.array([3, 0, 5]), 2)", "True"]],
        solution: `
          import numpy as np

          def has_stock(stock_array, item_index):
              if stock_array[item_index] > 0:      # added :
                  return True
              else:                                # added :
                  return False                     # return, not retrun

          stock = np.array([3, 0, 5])
          print(has_stock(stock, 1))               # added the comma`,
        hint: "Four small fixes: two colons, one spelling, one comma.", explain: "With all four fixed the cell runs and prints False for chips." },
      { type: "mc", q: "You run a cell with 4 syntax errors. How many does Python report?",
        options: ["All 4, with line numbers", "Only 1, and no line runs", "Only 1, after running the lines above it", "None: it prints a warning"], answer: 1,
        hint: "Does Python start running a cell it cannot read?", explain: "Python must read the whole cell before it runs anything. It stops at the first error it finds and runs nothing. That is why you must read every line yourself." },
      { type: "predict", q: "After all four fixes (and <code>import numpy as np</code>), what does the cell print?", code: Q2_FIXED.replace("# Your code here for Q2", "import numpy as np"), packages: ["numpy"], answer: "False",
        hint: "Index 1 is chips. How many chips are left?", explain: "<code>stock[1]</code> is 0, and <code>0 &gt; 0</code> is False, so the <code>else</code> branch returns False." },
      { type: "bug", q: "Same idea, new code. Click every line with a syntax error.", code: `
          def restock(stock, item_index, amount)
              if amount <= 0:
                  print("Nothing to add)
                  return stock
              stock[item_index] = stock[item_index] + amount
              return stock

          stock = np.array([3, 0, 5])
          print(restock(stock, 1, 4)`,
        bugs: [1, 3, 9],
        notes: { 1: "missing <code>:</code> after the <code>def</code> line", 3: "the string is never closed: <code>\"Nothing to add\"</code>", 9: "one <code>(</code> is never closed: add <code>)</code>" },
        fixed: `
          def restock(stock, item_index, amount):
              if amount <= 0:
                  print("Nothing to add")
                  return stock
              stock[item_index] = stock[item_index] + amount
              return stock

          stock = np.array([3, 0, 5])
          print(restock(stock, 1, 4))`,
        hint: "Count brackets and quotes in pairs. And check the very first line.", explain: "Fun fact: Python reports line 3 first here, not line 1. An unclosed string is found before the grammar is checked. Another reason not to rely on the order of messages." },
    ],
  };

  /* ================================================================
     TOPIC Q3: Inventory function
     ================================================================ */

  const Q3_RUN = `
    import numpy as np

    def process_inventory(stock, item_index, min_stock, low_stock_queue):
        if stock[item_index] > 0:                  # anything left?
            stock[item_index] -= 1                 # sell one
            return True                            # sale OK
        else:                                      # stock is 0
            low_stock_queue.append(item_index)     # put the item in the refill queue
            return False                           # sale failed

    stock = np.array([3, 0, 5])                    # cola, chips, water
    low_stock_queue = []                           # empty queue to start

    print(process_inventory(stock, 0, 1, low_stock_queue))   # buy a cola
    print(process_inventory(stock, 1, 1, low_stock_queue))   # buy chips
    print(stock, low_stock_queue)`;

  const q3Steps = [
    { line: 0, now: "Nothing has run yet. Press <b>Step</b>.", vars: {}, st: null, q: null },
    { line: 3, now: "The <code>def</code> only stores the function. Its body runs later, when it is called.", vars: {}, st: null, q: null },
    { line: 11, now: "A NumPy array of stock counts: 3 colas, 0 chips, 5 waters.", vars: { stock: "[3 0 5]" }, st: [3, 0, 5], q: null },
    { line: 12, now: "An empty Python list. It will be the queue.", vars: { stock: "[3 0 5]", low_stock_queue: "[]" }, st: [3, 0, 5], q: [] },
    { line: 14, now: "Call with <code>item_index = 0</code>. Inside, <code>stock</code> is the <b>same</b> array as outside (no copy).", vars: { stock: "[3 0 5]", item_index: "0", low_stock_queue: "[]" }, st: [3, 0, 5], q: [], cur: 0 },
    { line: 4, now: "<code>stock[0]</code> is 3. Is 3 &gt; 0? <b>Yes</b>.", st: [3, 0, 5], q: [], cur: 0 },
    { line: 5, now: "<code>stock[0] -= 1</code>: 3 − 1 = <b>2</b>. The array outside changes too.", vars: { stock: "[2 0 5]", item_index: "0", low_stock_queue: "[]" }, st: [2, 0, 5], q: [], cur: 0, chg: true },
    { line: 6, now: "Return True. Back on line 14, <code>print</code> shows it.", print: "True", st: [2, 0, 5], q: [], cur: 0 },
    { line: 15, now: "Call again with <code>item_index = 1</code> (chips).", vars: { stock: "[2 0 5]", item_index: "1", low_stock_queue: "[]" }, st: [2, 0, 5], q: [], cur: 1 },
    { line: 4, now: "<code>stock[1]</code> is 0. Is 0 &gt; 0? <b>No</b>.", st: [2, 0, 5], q: [], cur: 1 },
    { line: 7, now: "So the <code>else</code> block runs.", st: [2, 0, 5], q: [], cur: 1 },
    { line: 8, now: "Append the <b>index</b> 1 (not the stock value 0) to the end of the queue.", vars: { stock: "[2 0 5]", item_index: "1", low_stock_queue: "[1]" }, st: [2, 0, 5], q: [1], cur: 1, qnew: true },
    { line: 9, now: "Return False. Back on line 15, <code>print</code> shows it.", print: "False", st: [2, 0, 5], q: [1], cur: 1 },
    { line: 16, now: "Both changes are visible outside: the array and the list were changed <b>in place</b>.", print: "[2 0 5] [1]", vars: { stock: "[2 0 5]", low_stock_queue: "[1]" }, st: [2, 0, 5], q: [1] },
  ];
  function q3Visual(el, st) {
    if (!st.st) { el.appendChild(h("p", { class: "novars" }, "No data yet.")); return; }
    const marks = {}, ptrs = {};
    if (st.cur != null) { marks[st.cur] = st.chg ? "swap" : "held"; ptrs[st.cur] = "item_index"; }
    el.appendChild(D.array(st.st, { name: "stock", marks, ptrs }));
    if (st.q) el.appendChild(h("div", { style: "margin-top:10px" }, D.array(st.q, { name: "low_stock_queue", marks: st.qnew ? { [st.q.length - 1]: "done" } : {}, ptrs: st.q.length ? { [st.q.length - 1]: "back" } : {}, emptyText: "[ ]  empty" })));
  }

  const Q3_TEST = py(`
    import numpy as np
    stock = np.array([2, 0, 1])
    q = []
    assert process_inventory(stock, 0, 1, q) == True, 'item 0 has stock 2: should return True'
    assert stock[0] == 1, 'stock[0] should go down from 2 to 1 (change the array itself)'
    assert q == [], 'nothing should be queued when the sale works'
    assert process_inventory(stock, 1, 1, q) == False, 'item 1 has stock 0: should return False'
    assert q == [1], 'append the INDEX 1 to the queue'
    assert list(stock) == [1, 0, 1], 'a failed sale must not change the stock'
    process_inventory(stock, 2, 1, q)
    assert process_inventory(stock, 2, 1, q) == False and q == [1, 2], 'item 2: 1 -> 0, then the next call queues index 2'`);

  const q3 = {
    id: "q3-inventory",
    title: "Q3 · Inventory function",
    summary: "Write <code>process_inventory</code>: sell one if there is stock, otherwise put the item's index in <code>low_stock_queue</code>.",
    exam: ["Q3 write code"],
    sources: "Exam w25 Q3; L7 p20–22",
    blocks: [
      { type: "h", text: "The task in plain words" },
      { type: "table", head: ["If…", "then…", "and return"], rows: [
        ["<code>stock[item_index] &gt; 0</code>", "lower that stock by 1", "<code>True</code>"],
        ["the stock is 0", "append <code>item_index</code> to the list <code>low_stock_queue</code>", "<code>False</code>"],
      ] },
      `<p>The signature is given: <code>process_inventory(stock, item_index, min_stock, low_stock_queue)</code>. <code>stock</code> is a NumPy array; <code>low_stock_queue</code> is a plain Python list used as a <b>queue</b> (new items join at the back).</p>`,
      { type: "callout", kind: "note", title: "min_stock is never used", html: "<p>The two rules don't mention <code>min_stock</code>. Keep the parameter (the signature is given), and write one Markdown line: “The rules don't use <code>min_stock</code>, so my function only keeps it in the signature.” If you want to use it, say how, e.g. “I also queue the item when the stock falls below <code>min_stock</code>.”</p>" },

      { type: "h", text: "How to attack it" },
      `<ol>
        <li>Copy the signature exactly.</li>
        <li>Write the <code>if</code> / <code>else</code> skeleton with <code>pass</code> in both.</li>
        <li>True branch: lower the stock, <b>then</b> <code>return True</code> (order matters).</li>
        <li>False branch: <code>.append(item_index)</code>, then <code>return False</code>.</li>
        <li>Test it: make a small <code>stock</code> and an empty list, call it twice, print the results and the array.</li>
      </ol>`,
      reveal([
        { hint: true, label: "How do you lower one item of an array?", html: "<p>Index it and use <code>-= 1</code>: <code>stock[item_index] -= 1</code>. Tiny example: if <code>stock</code> is <code>[3, 0, 5]</code>, then <code>stock[0] -= 1</code> makes it <code>[2, 0, 5]</code>.</p>" },
        { hint: true, label: "Does the change reach the caller?", html: "<p>Yes. The function gets the <b>same</b> array, not a copy. Changing an item changes it for everyone. Same for <code>.append</code> on the list.</p>" },
        { label: "The skeleton", code: `
            def process_inventory(stock, item_index, min_stock, low_stock_queue):
                if stock[item_index] > 0:          # anything left?
                    pass
                else:                              # stock is 0
                    pass` },
        { label: "The True branch", code: `
                if stock[item_index] > 0:
                    stock[item_index] -= 1         # sell one FIRST
                    return True                    # then leave the function` },
        { label: "The False branch", code: `
                else:
                    low_stock_queue.append(item_index)   # the index, at the back of the queue
                    return False` },
        { label: "A test call (always add one)", code: `
            stock = np.array([3, 0, 5])
            low_stock_queue = []

            print(process_inventory(stock, 0, 1, low_stock_queue))   # True
            print(process_inventory(stock, 1, 1, low_stock_queue))   # False
            print(stock, low_stock_queue)                            # [2 0 5] [1]` },
      ]),

      { type: "h", text: "Step through two sales" },
      { type: "stepper", title: "One sale works, one fails", code: Q3_RUN, steps: q3Steps,
        what: { 4: "Read the stock of this item and compare with 0.", 5: "Lower that one item by 1, in the same array the caller has.", 8: "Add the index at the back of the list: that is “enqueue”.", 6: "Hand True back and leave the function.", 9: "Hand False back and leave the function." },
        visualTitle: "The array and the queue", legend: [["held", "item_index"], ["swap", "just changed"], ["done", "just queued"]], visual: q3Visual },
      { type: "tryit", title: "Run and extend it", task: "Add a third call that buys the last water… after selling 5 waters first. Hint: a <code>for</code> loop with <code>range(6)</code>. What ends up in the queue?", code: Q3_RUN },
      { type: "mistakes", items: [
        { title: "<code>return</code> before the change", wrong: "if stock[item_index] > 0:\n    return True\n    stock[item_index] -= 1", right: "if stock[item_index] > 0:\n    stock[item_index] -= 1\n    return True", why: "<code>return</code> leaves the function at once. The line after it never runs, so the stock never goes down." },
        { title: "Computing but not storing", wrong: "stock[item_index] - 1", right: "stock[item_index] -= 1", why: "<code>stock[item_index] - 1</code> makes the number 2 and throws it away. <code>-= 1</code> stores it back." },
        { title: "Storing the result of <code>append</code>", wrong: "low_stock_queue = low_stock_queue.append(item_index)", right: "low_stock_queue.append(item_index)", why: "<code>.append()</code> changes the list and returns <code>None</code>. The first version replaces your list with None." },
        { title: "Queueing the stock, not the index", wrong: "low_stock_queue.append(stock[item_index])", right: "low_stock_queue.append(item_index)", why: "The stock is always 0 here, so the queue would be <code>[0, 0, 0]</code>: useless. The index says <b>which</b> item." },
        { title: "A new list inside the function", wrong: "low_stock_queue = []\nlow_stock_queue.append(item_index)", right: "low_stock_queue.append(item_index)", why: "<code>= []</code> makes a new local list. The caller's queue stays empty." },
      ] },
    ],
    quiz: [
      { type: "write", q: "Exam Q3. Write <code>process_inventory(stock, item_index, min_stock, low_stock_queue)</code>.",
        starter: `
          import numpy as np

          def process_inventory(stock, item_index, min_stock, low_stock_queue):
              pass                             # your code here


          stock = np.array([3, 0, 5])
          low_stock_queue = []
          print(process_inventory(stock, 0, 1, low_stock_queue))
          print(stock, low_stock_queue)`,
        test: Q3_TEST, packages: ["numpy"],
        solution: `
          import numpy as np

          def process_inventory(stock, item_index, min_stock, low_stock_queue):
              if stock[item_index] > 0:                  # anything left?
                  stock[item_index] -= 1                 # sell one
                  return True
              else:                                      # stock is 0
                  low_stock_queue.append(item_index)     # queue the INDEX
                  return False


          stock = np.array([3, 0, 5])
          low_stock_queue = []
          print(process_inventory(stock, 0, 1, low_stock_queue))   # True
          print(stock, low_stock_queue)                            # [2 0 5] []`,
        hint: "<code>if stock[item_index] &gt; 0:</code> → <code>-= 1</code> then <code>return True</code>. <code>else:</code> → <code>.append(item_index)</code> then <code>return False</code>.",
        explain: "The array and the list are changed in place, so the caller sees both changes." },
      { type: "predict", q: "What does this print? (Three lines.)", code: Q3_RUN, packages: ["numpy"], answer: "True\nFalse\n[2 0 5] [1]",
        hint: "Step through it in the stepper above if you are unsure.", explain: "Cola: 3 → 2, True. Chips: 0, so index 1 joins the queue, False. NumPy prints arrays without commas: <code>[2 0 5]</code>." },
      { type: "mc", q: "A student swaps two lines so <code>return True</code> comes <b>before</b> <code>stock[item_index] -= 1</code>. What happens?",
        options: ["SyntaxError", "The stock never goes down, but True is returned", "The stock goes down twice", "It returns None"], answer: 1,
        hint: "What does <code>return</code> do to the lines below it?", explain: "<code>return</code> ends the function at once. The line after it is never reached. No error: a silent logic bug." },
      { type: "mc", q: "The function returns only True or False. Why does <code>stock</code> outside the function still change?",
        options: ["Because of <code>global stock</code>", "NumPy arrays are copied back automatically", "The function received the same array object, and changed one of its items", "It does not change"], answer: 2,
        hint: "Is the array copied when you pass it in?", explain: "Passing an array (or list) passes the object itself. Changing an <b>item</b> of it changes the one object both names point at." },
      { type: "explain", q: "Write the Markdown note (1–3 sentences) you would add about <code>min_stock</code>.",
        answer: "<p>The two rules in the task never use <code>min_stock</code>, so I kept it in the signature but my function does not use it. (Optional extension: after selling, I could also queue the item when <code>stock[item_index] &lt; min_stock</code>, so it gets refilled before it runs out.)</p>",
        points: ["says it is not used by the rules", "kept because the signature is given", "optional: how it <i>could</i> be used"],
        hint: "State the assumption; don't silently ignore it." },
    ],
  };

  /* ================================================================
     TOPIC Q4: Debugging
     ================================================================ */

  const Q4_CODE = `
    # Your code here for Q4
    def process_payment(price, coins_inserted):
        total = np.sum(coins_inserted)
        if total = price:
            print("Exact amount received.")
            return True
        elif total < price:
            print("Insufficient payment, refunding", total)
            return False
        else:
            print("Overpaid, refunding", total - price)
            return True

    coins = np.array([5, 10, 10])  # total 25
    price = 20

    success = process_payment(price, coins)
    print("Payment success:", succes)`;

  const Q4_FIXED = `
    import numpy as np

    def process_payment(price, coins_inserted):
        print("Price:", price)                       # the spec starts by showing the price
        total = np.sum(coins_inserted)               # add up the coins

        if total == price:                           # == asks; = would store
            print("Exact amount received.")
            return True
        elif total < price:
            print("Insufficient payment, refunding", total)   # give all coins back
            return False
        else:
            change = total - price                   # what the customer gets back
            print("Payment received, change:", change)
            return True

    coins = np.array([5, 10, 10])                    # total 25
    price = 20

    success = process_payment(price, coins)
    print("Payment success:", success)               # the right name`;

  const q4Code = PADS.lines(Q4_CODE).map((l, i) => (i === 3 ? "    if total == price:               # line 4 fixed" : l));
  const F_GLOBAL = (extra) => Object.assign({ coins: "[ 5 10 10]", price: "20" }, extra || {});
  const q4Steps = [
    { line: 0, now: "Line 4 is already fixed here, so the cell can start. Press <b>Step</b>.", vars: {} },
    { line: 2, now: "Store the function. Its body does not run yet.", vars: {} },
    { line: 14, now: "Three coins. The comment says their total is 25.", vars: { coins: "[ 5 10 10]" } },
    { line: 15, now: "The price is 20.", vars: F_GLOBAL() },
    { line: 17, now: "Call <code>process_payment(20, coins)</code>. A new frame opens.", frames: [{ name: "global", vars: F_GLOBAL() }, { name: "process_payment(20, coins)", vars: { price: "20", coins_inserted: "[ 5 10 10]" } }] },
    { line: 3, now: "<code>np.sum</code> adds the coins: 5 + 10 + 10 = <b>25</b>.", frames: [{ name: "global", vars: F_GLOBAL() }, { name: "process_payment(20, coins)", vars: { price: "20", coins_inserted: "[ 5 10 10]", total: "25" } }] },
    { line: 4, now: "Is 25 == 20? <b>No.</b>" },
    { line: 7, now: "Is 25 &lt; 20? <b>No.</b>" },
    { line: 10, now: "Nothing above was True, so the <code>else</code> block runs." },
    { line: 11, now: "Print the change: 25 − 20 = 5. (It says “refunding”, but it is <b>change</b>; and the 5 is only printed, never handed back.)", print: "Overpaid, refunding 5" },
    { line: 12, now: "Return True. The frame closes.", frames: [{ name: "global", vars: F_GLOBAL() }, { name: "process_payment(20, coins)", vars: { price: "20", coins_inserted: "[ 5 10 10]", total: "25" }, note: "returning True" }] },
    { line: 17, now: "<code>success</code> gets the returned True.", frames: [{ name: "global", vars: F_GLOBAL({ success: "True" }) }] },
    { line: 18, now: "<b>Crash.</b> There is no variable called <code>succes</code> (one s short). This is a <b>runtime</b> error: everything above already ran.", print: "NameError: name 'succes' is not defined. Did you mean: 'success'?", bad: true },
  ];

  const q4 = {
    id: "q4-debug",
    title: "Q4 · Debug and explain",
    summary: "Find the syntax error and the runtime/logic problems in <code>process_payment</code>, and explain each one in 3–4 sentences.",
    exam: ["Q4 find + explain"],
    sources: "Exam w25 Q4; L5 p5–15",
    blocks: [
      { type: "h", text: "The task in plain words" },
      `<p>The code should: <b>show the price → take the coins → decide if payment worked → go on, or refund and stop</b>. It has at least one syntax error and at least one logical or runtime error. List them all and explain each one (max 3–4 sentences).</p>`,
      { type: "code", code: Q4_CODE, caption: "The exam cell (line 1 is the comment)" },
      { type: "table", caption: "The three kinds of error (the “Museum of Errors”)", head: ["Kind", "When you notice", "Tiny example"], code: [2], rows: [
        ["<b>Syntax</b>", "Python won't start. Nothing in the cell runs.", "if x = 1:"],
        ["<b>Runtime</b>", "It starts, then crashes on one line.", "print(succes)   # NameError"],
        ["<b>Logic</b>", "It finishes, but does the wrong thing.", "change = price - total   # wrong sign"],
      ] },

      { type: "h", text: "How to attack it" },
      `<ol>
        <li><b>Syntax pass</b>: read each line with the Q2 checklist (colons, <code>=</code> vs <code>==</code>, brackets, spelling).</li>
        <li><b>Run it in your head</b> with the given example (coins 5, 10, 10 and price 20). Note every variable on paper.</li>
        <li>Every name used: was it created first, with the same spelling? That finds the <b>NameError</b>.</li>
        <li><b>Compare with the spec</b> arrow by arrow: is the price shown? Is the right amount handed back?</li>
        <li>Write a table: line, kind, what, why, fix. Then one short paragraph per row.</li>
      </ol>`,
      reveal([
        { hint: true, label: "The syntax error", html: "<p>Look at the <code>if</code> on line 4. Does it <i>ask</i> or <i>store</i>?</p>" },
        { hint: true, label: "The runtime error", html: "<p>Compare the name made on line 17 with the name used on line 18, letter by letter.</p>" },
        { hint: true, label: "The logic", html: "<p>Read the four arrows of the spec. Which step does the code never do? And where does the change of 5 go?</p>" },
        { label: "Write the list", html: ui.table({ head: ["Line", "Kind", "What is wrong", "Fix"], rows: [
          ["4", "syntax", "<code>if total = price:</code> uses <code>=</code> (store) in a condition", "<code>if total == price:</code>"],
          ["18", "runtime (NameError)", "<code>succes</code> was never created; the variable is <code>success</code>", "<code>print(\"Payment success:\", success)</code>"],
          ["–", "logic (spec)", "the price is never displayed, but the spec starts with “display the item price”", "<code>print(\"Price:\", price)</code> first"],
          ["11", "logic (judgement)", "overpaying prints “refunding 5” but the 5 is change, and it is only printed: nobody gets it back", "call it change; return or hand it back"],
        ] }).outerHTML },
        { label: "Explain each one (3–4 sentences, what → why → fix)", html: `
          <p><b>Line 4.</b> This is a syntax error: <code>=</code> assigns a value, but an <code>if</code> needs a condition that is True or False. To compare we must use <code>==</code>. Because of this error, Python cannot run any line of the cell. Fix: <code>if total == price:</code>.</p>
          <p><b>Line 18.</b> After fixing line 4, the cell runs until line 18 and then crashes with a NameError. The result was stored as <code>success</code> on line 17, but line 18 asks for <code>succes</code>, a name that does not exist. It is a runtime error because Python only finds it when it reaches that line. Fix: use <code>success</code>.</p>
          <p><b>Logic.</b> The spec says the machine first displays the price, but the function never shows it, so the customer does not know what to pay. Also, when they overpay, the message says “refunding” although the purchase goes through; the 5 is change, and it is only printed, never returned. I would print the price first and print or return the change clearly.</p>` },
        { label: "The corrected code", code: Q4_FIXED, html: "<p>Output: <code>Price: 20</code>, <code>Payment received, change: 5</code>, <code>Payment success: True</code>.</p>" },
      ]),

      { type: "h", text: "Watch it crash at line 18", sub: "With line 4 fixed, the code runs until the misspelled name." },
      { type: "stepper", title: "process_payment(20, [5, 10, 10])", code: q4Code, steps: q4Steps,
        what: { 4: "Compare total with price. With == it asks a question.", 18: "Look up the name succes… it does not exist." } },
      { type: "tryit", title: "Debug it for real", task: "Run it: first the SyntaxError. Fix it, run again: now the NameError. Fix that too. Then add the missing “show the price” step.",
        code: `
          import numpy as np

          def process_payment(price, coins_inserted):
              total = np.sum(coins_inserted)
              if total = price:
                  print("Exact amount received.")
                  return True
              elif total < price:
                  print("Insufficient payment, refunding", total)
                  return False
              else:
                  print("Overpaid, refunding", total - price)
                  return True

          coins = np.array([5, 10, 10])  # total 25
          price = 20

          success = process_payment(price, coins)
          print("Payment success:", succes)`,
        solution: Q4_FIXED },
      { type: "mistakes", items: [
        { title: "Calling the NameError a syntax error", wrong: "Line 18: syntax error", right: "Line 18: runtime error (NameError)", why: "<code>succes</code> is a valid name, just not one that exists. Python only notices when it runs that line." },
        { title: "Finding only one error per kind", wrong: "(stop after line 4)", right: "(fix line 4, then keep tracing to line 18)", why: "A syntax error hides everything else. After you fix it in your head, run the example again." },
        { title: "Explaining only <i>what</i>", wrong: "Line 4 is wrong.", right: "Line 4: = stores, but a condition must compare with ==. Nothing runs. Fix: ==.", why: "Marks come from <b>why</b> and the <b>fix</b>. Use what → why → fix." },
        { title: "Writing an essay", wrong: "(10 sentences per bug)", right: "(3–4 sentences per bug)", why: "The paper says max 3–4 sentences. Short and exact wins." },
        { title: "Silently rewriting the logic", wrong: "(a new function with no comment)", right: "(a fix plus one sentence: what you assumed)", why: "The logic part is open to judgement. Say what you think the spec means, then fix to match." },
      ] },
    ],
    quiz: [
      { type: "bug", q: "The real exam cell. Click every line that has an <b>error Python will report</b> (syntax or runtime).", code: Q4_CODE,
        bugs: [4, 18],
        notes: { 4: "syntax: <code>=</code> in a condition; use <code>==</code>", 18: "runtime: NameError, <code>succes</code> should be <code>success</code>" },
        fixed: Q4_FIXED,
        hint: "One line stops Python from starting. Another crashes once the first is fixed.", explain: "The logic issues (no price shown, change only printed) are not crashes: you explain them in Markdown." },
      { type: "explain", q: "Explain the error on line 4 in 3–4 sentences.",
        answer: "<p>Line 4 is a syntax error. <code>=</code> assigns a value, but an <code>if</code> needs a condition that is True or False, so it must compare with <code>==</code>. Because it is a syntax error, none of the cell runs. Fix: <code>if total == price:</code>.</p>",
        points: ["syntax error", "<code>=</code> stores, <code>==</code> compares", "nothing runs", "the fix"], hint: "What, why, fix." },
      { type: "explain", q: "Explain the error on line 18 in 3–4 sentences.",
        answer: "<p>Line 18 raises a NameError at runtime. The result was stored in <code>success</code> on line 17, but line 18 uses <code>succes</code>, which was never created. Python only finds this when it reaches line 18, after the payment already ran. Fix: <code>print(\"Payment success:\", success)</code>.</p>",
        points: ["runtime error, NameError", "the misspelled name vs the real one", "found only when that line runs", "the fix"], hint: "Which kind of error appears only while running?" },
      { type: "explain", q: "Name one <b>logic</b> problem (it doesn't crash) and explain it in 3–4 sentences.",
        answer: "<p>The spec says the machine first displays the item price, but <code>process_payment</code> never prints it, so the customer cannot see what to pay. This does not crash, it just behaves differently from the spec. Fix: add <code>print(\"Price:\", price)</code> as the first line of the function.</p><p><i>Also fine:</i> when the customer overpays, the message says “refunding” although the sale goes through; the 5 is change, and it is only printed, never returned, so the rest of the program cannot give it back.</p>",
        points: ["names a behaviour that differs from the spec", "says why it is wrong (no crash)", "gives a fix", "states the assumption if it is a judgement call"], hint: "Compare with: display price → coins → decide → proceed or refund." },
      { type: "write", q: "Fix the two errors (and show the price first). The checks call <code>process_payment</code> with three different payments.",
        starter: `
          import numpy as np

          def process_payment(price, coins_inserted):
              total = np.sum(coins_inserted)
              if total = price:
                  print("Exact amount received.")
                  return True
              elif total < price:
                  print("Insufficient payment, refunding", total)
                  return False
              else:
                  print("Overpaid, refunding", total - price)
                  return True

          coins = np.array([5, 10, 10])
          price = 20
          success = process_payment(price, coins)
          print("Payment success:", succes)`,
        checks: [["process_payment(20, np.array([5, 10, 10]))", "True"], ["process_payment(20, np.array([5, 10]))", "False"], ["process_payment(20, np.array([10, 10]))", "True"]],
        packages: ["numpy"],
        solution: Q4_FIXED,
        hint: "Line with <code>if total = price</code>: one character. Last line: one letter.", explain: "The program now runs to the end and prints <code>Payment success: True</code>." },
      { type: "mc", q: "You run the exam cell exactly as given. What is the <b>first</b> thing you see?",
        options: ["<code>Overpaid, refunding 5</code>", "NameError on line 18", "SyntaxError on line 4, and nothing else", "<code>Payment success: True</code>"], answer: 2,
        hint: "Can Python run anything while one line is bad grammar?", explain: "A syntax error stops the whole cell before it starts. The NameError only shows up once line 4 is fixed." },
    ],
  };

  /* ================================================================
     TOPIC Q5: NumPy
     ================================================================ */

  const USAGE = [[10, 5, 3], [25, 10, 4], [2, 1, 0], [15, 12, 7]];

  function usageWidget(el) {
    const id = "exam-usage-t";
    let axis = 1;
    const seg = h("div", { class: "seg", role: "group", "aria-label": "Choose the axis" },
      h("button", { type: "button", onclick: () => { axis = 1; s.max = "60"; draw(); } }, "axis=1 (per machine)"),
      h("button", { type: "button", onclick: () => { axis = 0; s.max = "60"; draw(); } }, "axis=0 (per item)"));
    const s = h("input", { type: "range", min: "0", max: "60", value: "25", id });
    const tv = h("b", { class: "mono" });
    const grid = h("div", { class: "exam-mx-wrap" });
    const lines = h("div", { style: "margin-top:12px" });
    const note = h("p", { class: "small", style: "margin:8px 0 0" });
    function draw() {
      [...seg.children].forEach((b, i) => b.setAttribute("aria-pressed", String((i === 0) === (axis === 1))));
      const T = +s.value;
      tv.textContent = T;
      const rowT = USAGE.map(r => r.reduce((a, b) => a + b, 0));
      const colT = USAGE[0].map((_, j) => USAGE.reduce((a, r) => a + r[j], 0));
      const totals = axis === 1 ? rowT : colT;
      const mask = totals.map(x => x > T);
      const idx = mask.map((m, i) => (m ? i : -1)).filter(i => i >= 0);
      const t = h("table", { class: "exam-mx", "aria-label": "usage matrix with totals" });
      t.appendChild(h("tr", null, h("th", null, ""), USAGE[0].map((_, j) => h("th", { scope: "col" }, "item " + j)), axis === 1 ? h("th", { class: "tot", scope: "col" }, "row total") : null));
      USAGE.forEach((r, i) => t.appendChild(h("tr", null, h("th", { scope: "row" }, "machine " + i), r.map(v => h("td", null, String(v))),
        axis === 1 ? h("td", { class: "tot " + (mask[i] ? "hi" : "lo") }, String(rowT[i]) + (mask[i] ? " ✓" : "")) : null)));
      if (axis === 0) t.appendChild(h("tr", null, h("th", { class: "tot", scope: "row" }, "column total"), colT.map((v, j) => h("td", { class: "tot " + (mask[j] ? "hi" : "lo") }, String(v) + (mask[j] ? " ✓" : "")))));
      grid.replaceChildren(t);
      lines.replaceChildren(ui.table({ head: ["Code", "Gives"], code: [0], rows: [
        [`totals = np.sum(usage_matrix, axis=${axis})`, `<code>${npInts(totals)}</code>`],
        [`is_high = totals > ${T}`, `<code>${npBools(mask)}</code>`],
        [`np.where(is_high)[0]`, `<code>${npInts(idx)}</code>`],
      ] }));
      note.innerHTML = axis === 1
        ? `<code>axis=1</code> adds <b>across</b> each row, so you get one total per <b>machine</b>. Above ${T}: machine${idx.length === 1 ? "" : "s"} <b>${idx.join(", ") || "none"}</b>.`
        : `<code>axis=0</code> adds <b>down</b> each column: one total per <b>item</b>. That answers a different question. Q5 wants machines, so it needs <code>axis=1</code>.`;
    }
    s.oninput = draw;
    el.append(seg, h("div", { class: "row-wrap", style: "margin-top:10px" }, h("label", { class: "small muted", for: id }, "usage_threshold"), s, tv), h("div", { style: "margin-top:10px" }, grid), lines, note);
    draw();
  }

  const Q5_MODEL = `
    import numpy as np

    def high_demand_machines(usage_matrix, usage_threshold):
        totals = np.sum(usage_matrix, axis=1)        # one total per row (machine)
        is_high = totals > usage_threshold           # True/False per machine
        return np.where(is_high)[0]                  # the indices where it is True

    usage_matrix = np.array([
        [10,  5,  3],   # Machine 0
        [25, 10,  4],   # Machine 1
        [ 2,  1,  0],   # Machine 2
        [15, 12,  7],   # Machine 3
    ])
    usage_threshold = 25

    print(np.sum(usage_matrix, axis=1))                          # [18 39  3 34]
    print(high_demand_machines(usage_matrix, usage_threshold))   # [1 3]

    small = np.array([[1, 2], [30, 0]])                          # my own small example
    print(high_demand_machines(small, 5))                        # [1]`;

  const Q5_TEST = py(`
    import numpy as np
    m = np.array([[10, 5, 3], [25, 10, 4], [2, 1, 0], [15, 12, 7]])
    r = [int(i) for i in high_demand_machines(m, 25)]
    assert r == [1, 3], f'the exam matrix should give [1, 3], got {r}'
    r = [int(i) for i in high_demand_machines(np.array([[20, 5], [1, 1]]), 25)]
    assert r == [], f'a total of exactly 25 is NOT greater than 25, got {r}'
    r = [int(i) for i in high_demand_machines(np.array([[20, 6], [1, 1], [30, 0]]), 25)]
    assert r == [0, 2], f'expected [0, 2], got {r}'`);

  const q5 = {
    id: "q5-numpy",
    title: "Q5 · NumPy totals",
    summary: "Return the indices of machines whose total usage is above a threshold, using NumPy only (<code>np.sum</code> with <code>axis=1</code>, a comparison, <code>np.where</code>).",
    exam: ["Q5 write code"],
    sources: "Exam w25 Q5; L8 p3–8",
    blocks: [
      { type: "h", text: "The task in plain words" },
      `<p><code>usage_matrix</code> has one <b>row per machine</b> and one <b>column per item</b>. Add up each row. Give back the <b>row numbers</b> (indices) whose total is <b>greater than</b> <code>usage_threshold</code> (25). Use only NumPy: no <code>for</code> loop. Then show an example call and print the result.</p>`,
      { type: "table", head: ["Machine", "Row", "Total", "&gt; 25?"], num: [2], rows: [
        ["0", "<code>[10, 5, 3]</code>", "18", "no"],
        ["1", "<code>[25, 10, 4]</code>", "39", "<b>yes</b>"],
        ["2", "<code>[2, 1, 0]</code>", "3", "no"],
        ["3", "<code>[15, 12, 7]</code>", "34", "<b>yes</b>"],
      ] },
      `<p>So the answer for the exam's data is <code>[1 3]</code>.</p>`,

      { type: "h", text: "How to attack it", sub: "Three NumPy moves, one line each." },
      { type: "table", head: ["Step", "Code", "Gives (exam data)"], code: [1], rows: [
        ["1. one total per row", "totals = np.sum(usage_matrix, axis=1)", "<code>[18 39  3 34]</code>"],
        ["2. compare every total at once", "is_high = totals > usage_threshold", "<code>[False  True False  True]</code>"],
        ["3. turn True positions into indices", "np.where(is_high)[0]", "<code>[1 3]</code>"],
      ] },
      { type: "callout", kind: "rule", title: "axis=1 squashes the columns", html: "<p>Think “<code>axis=1</code> walks along a row”. Tiny example: <code>np.sum([[1, 2], [3, 4]], axis=1)</code> is <code>[3 7]</code> (1+2, 3+4). With <code>axis=0</code> it is <code>[4 6]</code> (1+3, 2+4). With no axis it is just <code>10</code>.</p>" },
      reveal([
        { hint: true, label: "Which axis?", html: "<p>You want one number per <b>machine</b>, and machines are <b>rows</b>. So you add across a row: <code>axis=1</code>.</p>" },
        { hint: true, label: "Why the [0] after np.where?", html: "<p><code>np.where(mask)</code> gives a <b>tuple</b> with one array per dimension: <code>(array([1, 3]),)</code>. For a 1-D mask you want the first (only) one: <code>[0]</code>.</p>" },
        { label: "The function", code: `
            def high_demand_machines(usage_matrix, usage_threshold):
                totals = np.sum(usage_matrix, axis=1)    # one total per machine
                is_high = totals > usage_threshold       # True / False per machine
                return np.where(is_high)[0]              # indices of the True ones` },
        { label: "The example call the task asks for", code: `
            usage_matrix = np.array([[10, 5, 3], [25, 10, 4], [2, 1, 0], [15, 12, 7]])
            usage_threshold = 25

            result = high_demand_machines(usage_matrix, usage_threshold)
            print("High-demand machines:", result)       # High-demand machines: [1 3]` },
        { label: "Another correct way", code: `
                return np.arange(len(totals))[is_high]   # [0 1 2 3] filtered by the mask`,
          html: "<p>Boolean indexing on the list of indices gives the same <code>[1 3]</code>.</p>" },
      ]),

      { type: "h", text: "See the axis and the threshold", sub: "Switch the axis and drag the threshold. The three code lines update." },
      { type: "widget", render: usageWidget },
      { type: "tryit", title: "The model answer", task: "Run it. Then change the threshold to 30 and to 15 and predict the result first.", code: Q5_MODEL },
      { type: "mistakes", items: [
        { title: "The wrong axis", wrong: "np.sum(usage_matrix, axis=0)   # [52 28 14]", right: "np.sum(usage_matrix, axis=1)   # [18 39  3 34]", why: "<code>axis=0</code> gives one total per <b>item</b> (column). Machines are rows." },
        { title: "<code>&gt;=</code> instead of <code>&gt;</code>", wrong: "totals >= usage_threshold", right: "totals > usage_threshold", why: "“Exceeds” and “greater than” mean <code>&gt;</code>. A machine with exactly 25 is <b>not</b> high-demand." },
        { title: "Returning rows, not indices", wrong: "return usage_matrix[is_high]", right: "return np.where(is_high)[0]", why: "<code>usage_matrix[is_high]</code> gives the rows themselves. The task asks for the machine <b>numbers</b>." },
        { title: "Forgetting <code>[0]</code>", wrong: "return np.where(is_high)      # (array([1, 3]),)", right: "return np.where(is_high)[0]   # [1 3]", why: "<code>np.where</code> returns a tuple of arrays. Take the first." },
        { title: "A Python loop", wrong: "for i in range(len(usage_matrix)):\n    if sum(usage_matrix[i]) > t: ...", right: "totals = np.sum(usage_matrix, axis=1)", why: "It works, but the task says “use only NumPy operations”. That can cost marks." },
      ] },
    ],
    quiz: [
      { type: "write", q: "Exam Q5. Write <code>high_demand_machines(usage_matrix, usage_threshold)</code>. It returns the indices of the machines whose total is <b>greater than</b> the threshold. NumPy only.",
        starter: `
          import numpy as np

          def high_demand_machines(usage_matrix, usage_threshold):
              pass                             # 1. totals  2. compare  3. indices


          usage_matrix = np.array([[10, 5, 3], [25, 10, 4], [2, 1, 0], [15, 12, 7]])
          print(high_demand_machines(usage_matrix, 25))`,
        test: Q5_TEST, packages: ["numpy"],
        solution: Q5_MODEL,
        hint: "<code>np.sum(..., axis=1)</code>, then <code>&gt;</code>, then <code>np.where(...)[0]</code>.",
        explain: "Three vectorised steps: total per row, compare all at once, positions of the True values." },
      { type: "mc", q: "<code>usage_matrix</code> has shape <code>(4, 3)</code>: 4 machines, 3 items. Which call gives one total per machine?",
        options: ["<code>np.sum(usage_matrix)</code>", "<code>np.sum(usage_matrix, axis=0)</code>", "<code>np.sum(usage_matrix, axis=1)</code>", "<code>usage_matrix.sum(4)</code>"], answer: 2,
        wrong: { 0: "No axis adds <b>everything</b> into one number: 94.", 1: "That gives one total per <b>column</b> (item): 3 numbers." },
        hint: "The result should have 4 numbers.", explain: "<code>axis=1</code> adds along each row and gives 4 totals: <code>[18 39  3 34]</code>." },
      { type: "predict", q: "What does this print?", code: `
          import numpy as np
          m = np.array([[1, 2], [3, 4]])
          print(np.sum(m, axis=1))`,
        answer: "[3 7]", hint: "Row 0 is 1 and 2; row 1 is 3 and 4.", explain: "1 + 2 = 3 and 3 + 4 = 7. NumPy prints arrays without commas." },
      { type: "mc", q: "A machine's total is exactly 25 and the threshold is 25. Is it in the answer?",
        options: ["Yes", "No", "It depends on the axis", "It causes an error"], answer: 1,
        hint: "The task says the total must <b>exceed</b> the threshold.", explain: "25 &gt; 25 is False. Use <code>&gt;</code>, not <code>&gt;=</code>." },
      { type: "predict", q: "What does this print?", code: `
          import numpy as np
          totals = np.array([18, 39, 3, 34])
          print(np.where(totals > 25))`,
        answer: "(array([1, 3]),)", hint: "<code>np.where</code> on its own gives a tuple.", explain: "A tuple with one array inside (one per dimension). That is why the model answer adds <code>[0]</code>." },
    ],
  };

  /* ================================================================
     TOPIC Q6: DFS
     ================================================================ */

  const DFS_REC = `
    def dfs_route(adj_matrix, start, visited=None):
        if visited is None:                      # first call: make a fresh list
            visited = []
        visited.append(start)                    # restock this machine

        for nb in range(len(adj_matrix)):        # every machine, low to high
            if adj_matrix[start][nb] == 1 and nb not in visited:
                dfs_route(adj_matrix, nb, visited)   # go deep down this branch first

        return visited                           # after the loop`;

  const ADJ_A_SRC = `
    adj_matrix = [
        [0, 1, 1, 0, 0, 0],   # machine 0 is joined to 1 and 2
        [1, 0, 0, 1, 1, 0],   # machine 1 is joined to 0, 3 and 4
        [1, 0, 0, 0, 0, 1],   # machine 2 is joined to 0 and 5
        [0, 1, 0, 0, 0, 0],   # machine 3: a leaf
        [0, 1, 0, 0, 0, 0],   # machine 4: a leaf
        [0, 0, 1, 0, 0, 0],   # machine 5: a leaf
    ]`;

  const Q6_MODEL = PADS.dedent(DFS_CODE) + "\n\n\n" + PADS.dedent(ADJ_A_SRC) + "\n\nprint(dfs_route(adj_matrix, 0))   # [0, 1, 3, 4, 2, 5]\nprint(dfs_route(adj_matrix, 3))   # [3, 1, 0, 2, 5, 4]";

  // Accepts ANY valid DFS order (any neighbour order), so both the stack and the recursive versions pass.
  const DFS_CHECKER = `
    import numpy as np
    def __is_dfs(m, start, order):
        n = len(m)
        if sorted(order) != list(range(n)) or order[0] != start:
            return False
        seen = {start}
        path = [start]
        for v in order[1:]:
            while path and m[path[-1]][v] != 1:
                top = path[-1]
                if any(m[top][u] == 1 and u not in seen for u in range(n)):
                    return False
                path.pop()
            if not path:
                return False
            seen.add(v)
            path.append(v)
        return True`;
  function dfsTest(fn, T, starts) {
    const M = "[" + T.m.map(r => "[" + r.join(", ") + "]").join(", ") + "]";
    return py(DFS_CHECKER) + "\n" + starts.map(s => [
      `__r = [int(x) for x in ${fn}(${M}, ${s})]`,
      `assert __is_dfs(${M}, ${s}, __r), f'from ${s}: {__r} is not a depth-first order of every machine'`,
      `__r = [int(x) for x in ${fn}(np.array(${M}), ${s})]`,
      `assert __is_dfs(${M}, ${s}, __r), f'with a NumPy matrix, from ${s}: got {__r}'`,
    ].join("\n")).join("\n");
  }

  const DFS_EXPLAIN = "<p>DFS starts at one machine and always moves on to an unvisited neighbour, so the van follows one branch of the tree all the way to a machine with no unvisited neighbours (a leaf). Only then does it backtrack to the last machine that still has an unvisited branch, and continues from there. My code keeps the machines still to visit on a stack (in the recursive version, the call stack), so the most recently found machine is handled first: that is what makes it go deep first. Because the network is a tree, each machine is reached by exactly one path and appears exactly once in the returned list. For restocking this means the van finishes one whole area before moving to the next, instead of jumping between areas level by level as BFS would.</p>";

  const q6 = {
    id: "q6-dfs",
    title: "Q6 · DFS route",
    summary: "Write <code>dfs_route(adj_matrix, start)</code> on a tree of machines given as an adjacency matrix, and explain DFS as a restocking plan in 4–5 sentences.",
    exam: ["Q6 write + explain"],
    sources: "Exam w25 Q6; L9 p40–46; L7 p17–19",
    blocks: [
      { type: "h", text: "The task in plain words" },
      `<p>The machines form a <b>tree</b> (no loops; one path between any two machines). It is given as an <b>adjacency matrix</b>. Starting from <code>start</code>, return a <b>list of machine numbers in the order DFS visits them</b>. Iterative or recursive, your choice. Then explain in 4–5 sentences why “follow one branch to the end, then backtrack” is a restocking strategy.</p>`,
      { type: "table", head: ["Adjacency matrix rule", "Tiny example (the tree below)"], rows: [
        ["one row and one column per machine", "6 machines → 6 × 6"],
        ["<code>adj_matrix[i][j] == 1</code> means i and j are joined", "<code>adj_matrix[0][2]</code> is 1: machines 0 and 2 are joined"],
        ["it is symmetric", "<code>adj_matrix[2][0]</code> is 1 too"],
        ["the neighbours of i are the columns with a 1 in row i", "row 1 is <code>[1, 0, 0, 1, 1, 0]</code> → 0, 3, 4"],
      ] },
      { type: "h", text: "Read the matrix", sub: "Pick a row. The machine and its neighbours light up." },
      { type: "widget", render: matrixWidget(TREE_A, "machine") },

      { type: "h", text: "How to attack it" },
      `<ol>
        <li>Pick a version. <b>Stack</b> (a <code>while</code> loop) or <b>recursion</b>. Both are fine; pick the one you can write from memory.</li>
        <li>Make <code>visited = []</code>: it is both the “already been there” check and the answer.</li>
        <li>Neighbours of <code>node</code>: loop <code>nb</code> over <code>range(n)</code> and test <code>adj_matrix[node][nb] == 1</code>.</li>
        <li>Skip neighbours already in <code>visited</code> (else you walk back to the parent forever).</li>
        <li><code>return visited</code> <b>after</b> the loop.</li>
        <li>Test with a 6-machine example, then write the 4–5 sentences.</li>
      </ol>`,
      reveal([
        { hint: true, label: "What makes it “depth first”?", html: "<p>A <b>stack</b>: last in, first out. The machine you found most recently is visited next, so you keep going deeper. (A queue, first in first out, would give BFS.)</p>" },
        { hint: true, label: "How to get the neighbours from a matrix", html: "<p><code>for nb in range(n):</code> and <code>if adj_matrix[node][nb] == 1:</code>. Looping over <code>adj_matrix[node]</code> directly gives you the 0s and 1s, not the machine numbers.</p>" },
        { label: "Set up", code: `
            def dfs_route(adj_matrix, start):
                n = len(adj_matrix)              # number of machines
                visited = []                     # the answer
                stack = [start]                  # waiting to be visited` },
        { label: "The loop: take the newest, visit it", code: `
                while stack:                     # until nobody is waiting
                    node = stack.pop()           # LAST one added
                    visited.append(node)` },
        { label: "Push the unvisited neighbours", code: `
                    for nb in range(n - 1, -1, -1):          # high to low...
                        if adj_matrix[node][nb] == 1 and nb not in visited:
                            stack.append(nb)                 # ...so the lowest comes off first`,
          html: "<p>Going high to low is only so the lowest-numbered branch is visited first (nicer to read). Low to high is also a correct DFS, just in a different branch order.</p>" },
        { label: "Return after the loop, and test", code: `
                return visited

            print(dfs_route(adj_matrix, 0))      # [0, 1, 3, 4, 2, 5]` },
        { label: "The 4–5 sentence explanation", html: DFS_EXPLAIN },
      ]),

      { type: "h", text: "Trace it: stack, matrix row and tree together" },
      { type: "stepper", title: "dfs_route(adj_matrix, 0)", code: DFS_CODE, steps: dfsSteps(TREE_A, 0),
        what: { 6: "Keep going while something is waiting on the stack.", 7: "pop() with no index takes the last item: the newest.", 8: "Add it to the answer.", 10: "Look at every column of this machine's row.", 11: "A 1 means “joined”. Skip machines already visited (the parent).", 12: "Put the neighbour on top of the stack." },
        visualTitle: "Tree, matrix, stack", legend: DFS_LEGEND, visual: dfsVisual(TREE_A) },
      { type: "callout", kind: "tip", title: "More on DFS and BFS", html: "<p>The <a href='#algorithms'>Algorithms</a> subject has trees, DFS and BFS step by step, with adjacency lists too.</p>" },
      sw({ label: "Two correct versions", items: [
        { label: "With a stack (iterative)", blocks: [{ type: "code", code: DFS_CODE }] },
        { label: "With recursion", blocks: [{ type: "code", code: DFS_REC }, "<p>Each call visits one machine, then calls itself on each unvisited neighbour. The call stack does the job of <code>stack</code>. <code>visited=None</code> (not <code>[]</code>) so a second call starts fresh.</p>"] },
      ] }),
      { type: "tryit", title: "Run DFS on the example tree", task: "Try other start machines. Then swap <code>pop()</code> for <code>pop(0)</code> and see the order change: that is BFS.", code: Q6_MODEL },
      { type: "mistakes", items: [
        { title: "Forgetting <code>visited</code> in the check", wrong: "if adj_matrix[node][nb] == 1:\n    stack.append(nb)", right: "if adj_matrix[node][nb] == 1 and nb not in visited:\n    stack.append(nb)", why: "The parent is also a neighbour. Without the check you walk back and forth forever." },
        { title: "Looping over the row values", wrong: "for nb in adj_matrix[node]:", right: "for nb in range(len(adj_matrix)):", why: "The row holds 0s and 1s. You need the <b>column numbers</b> where the 1s are." },
        { title: "<code>pop(0)</code>", wrong: "node = stack.pop(0)", right: "node = stack.pop()", why: "<code>pop(0)</code> takes the oldest: that is a queue, so you get BFS, not DFS." },
        { title: "Mutable default", wrong: "def dfs_route(adj_matrix, start, visited=[]):", right: "def dfs_route(adj_matrix, start, visited=None):\n    if visited is None:\n        visited = []", why: "A <code>[]</code> default is made once and kept. The second call starts with the first call's machines already “visited”." },
        { title: "<code>return</code> inside the loop", wrong: "while stack:\n    ...\n    return visited", right: "while stack:\n    ...\nreturn visited", why: "It returns after the first machine. Put <code>return</code> after the loop, at the function's indent." },
      ] },
    ],
    quiz: [
      { type: "write", q: "Exam Q6. Write <code>dfs_route(adj_matrix, start)</code> that returns the DFS visit order. The checks accept any correct depth-first order, from several start machines, with a list or a NumPy matrix.",
        starter: `
          def dfs_route(adj_matrix, start):
              pass                             # stack or recursion


          adj_matrix = [
              [0, 1, 1, 0, 0, 0],
              [1, 0, 0, 1, 1, 0],
              [1, 0, 0, 0, 0, 1],
              [0, 1, 0, 0, 0, 0],
              [0, 1, 0, 0, 0, 0],
              [0, 0, 1, 0, 0, 0],
          ]
          print(dfs_route(adj_matrix, 0))`,
        test: dfsTest("dfs_route", TREE_A, [0, 3, 2]), packages: ["numpy"],
        solution: Q6_MODEL,
        hint: "<code>visited = []</code>, <code>stack = [start]</code>, <code>while stack:</code> pop, append to visited, push neighbours with a 1 in the row that are not visited yet. Return after the loop.",
        explain: "The stack makes the newest machine go first, so you go deep before you go wide." },
      { type: "mc", q: "Same tree as above. DFS from <b>machine 2</b>, lowest neighbour first. What is the order?",
        options: ["<code>[2, 0, 1, 3, 4, 5]</code>", "<code>[2, 0, 5, 1, 3, 4]</code>", "<code>[2, 5, 0, 1, 3, 4]</code>", "<code>[2, 1, 0, 3, 4, 5]</code>"], answer: 0,
        wrong: { 1: "That visits both neighbours of 2 before going deeper: that is BFS.", 3: "2 and 1 are not joined." },
        hint: "Machine 2 is joined to 0 and 5. Lowest first: go to 0 and finish that whole side before 5.", explain: "2 → 0 → 1 → 3 → 4 (that side is done), back to 2 → 5." },
      { type: "mc", q: "In the iterative version, which line makes it depth-first rather than breadth-first?",
        options: ["<code>visited.append(node)</code>", "<code>node = stack.pop()</code>", "<code>n = len(adj_matrix)</code>", "<code>return visited</code>"], answer: 1,
        hint: "Which item comes out: the newest or the oldest?", explain: "<code>pop()</code> takes the newest (stack, LIFO). <code>pop(0)</code> would take the oldest (queue, FIFO) and give BFS." },
      { type: "mc", q: "Row 4 of a matrix is <code>[0, 1, 0, 0, 0, 0]</code>. What does that tell you?",
        options: ["Machine 4 has 1 item", "Machine 4 is joined only to machine 1: it is a leaf", "Machine 1 is joined to 4 machines", "Machine 4 is the root"], answer: 1,
        hint: "Which column holds the 1?", explain: "The only 1 is in column 1, so machine 4 has one neighbour, machine 1. One neighbour in a tree means a leaf (an end of a branch)." },
      { type: "explain", q: "Exam Q6, part 2. In 4–5 sentences: how does DFS match a restocking strategy that follows one branch completely before backtracking?",
        answer: DFS_EXPLAIN,
        points: ["go to an unvisited neighbour, as deep as possible", "backtrack only at a leaf / dead end", "a stack (or recursion) makes the newest machine go first", "tree: each machine visited exactly once", "practical: finish one area before the next (vs BFS level by level)"],
        hint: "Mention: deep first, backtrack, the stack, each machine once, why that is good for a van." },
    ],
  };

  /* ================================================================
     MOCK EXAM (two pages)
     ================================================================ */

  function timerWidget(defMin) {
    return (el, api) => {
      const id = PADS.uid("exam-timer");
      const inp = h("input", { type: "number", class: "input", id, min: "1", max: "240", value: String(defMin), style: "width:5.5em" });
      const clock = h("div", { class: "exam-clock", role: "timer", "aria-label": "time left" });
      const say = h("p", { class: "small muted", "aria-live": "polite", style: "margin:0" });
      let left = defMin * 60, timer = null;
      const bStart = h("button", { type: "button", class: "btn primary small" }, "Start");
      const bReset = h("button", { type: "button", class: "btn small ghost" }, "Reset");
      const show = () => {
        const m = Math.floor(left / 60), s = left % 60;
        clock.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
        clock.classList.toggle("low", left <= 300);
      };
      const stop = () => { if (timer) clearInterval(timer); timer = null; bStart.textContent = "Start"; };
      bStart.onclick = () => {
        if (timer) { stop(); say.textContent = "Paused."; return; }
        if (left <= 0) left = Math.max(1, +inp.value || defMin) * 60;
        bStart.textContent = "Pause";
        say.textContent = "Running. Close your notes.";
        timer = setInterval(() => {
          left--; show();
          if (left === 300) say.textContent = "5 minutes left: make sure every answer has an example call.";
          if (left <= 0) { stop(); say.textContent = "Time is up. Pens down, then check your answers below."; }
        }, 1000);
      };
      bReset.onclick = () => { stop(); left = Math.max(1, +inp.value || defMin) * 60; show(); say.textContent = ""; };
      inp.oninput = () => { if (!timer) { left = Math.max(1, +inp.value || defMin) * 60; show(); } };
      api.onCleanup(stop);
      el.append(h("div", { class: "row-wrap" }, h("label", { class: "small muted", for: id }, "Minutes"), inp, bStart, bReset), clock, say);
      show();
    };
  }

  const MOCK_STORY = { type: "callout", kind: "exam", label: "Mock", title: "The story: CityCycle bike-share", html: "<p>CityCycle runs bike stations around town. Each station has docks with bikes in them; riders pay per minute from a balance; trip counts are logged per station per day; and one van moves bikes along bike paths that form a <b>tree</b>. Only <code>numpy</code> (and <code>random</code>, <code>abc</code>) may be used.</p>" };
  const MOCK_HABITS = { type: "mistakes", title: "Exam habits to check before time is up", items: [
    { title: "Every function has an example call", wrong: "def busy_days(trips, threshold):\n    ...", right: "def busy_days(trips, threshold):\n    ...\n\nprint(busy_days(trips, 40))   # [0 1]", why: "Proves it runs, and the marker sees the output." },
    { title: "Given names kept", wrong: "def return_bike(d, c, s, q):", right: "def return_bike(docks, capacity, station, overflow_queue):", why: "Use the exact names from the task." },
    { title: "Return, not print", wrong: "print(True)", right: "return True", why: "Unless the task says “print”." },
    { title: "Explanations in Markdown", wrong: "# because balanse is misspelled", right: "(a Markdown cell with 3–4 sentences)", why: "Instruction 3 on the paper." },
    { title: "Restart & Run All", wrong: "(cells run in a random order)", right: "Kernel → Restart & Run All, then export", why: "Finds hidden NameErrors before the marker does." },
  ] };

  const M1_TEST = py(`
    c = [CityBike() for i in range(100)]
    e = [EBike() for i in range(100)]
    ids = [x.id for x in c + e]
    assert len(set(ids)) == len(ids), 'every bike needs its own id'
    assert all(1 <= x.condition <= 10 for x in c + e), 'condition must be a whole number 1..10'
    assert all(isinstance(x.condition, int) for x in c + e), 'condition should be an int (randint)'
    assert set(x.size for x in c) == {'small', 'medium', 'large'}, "CityBike size: 'small', 'medium' or 'large'"
    assert set(x.size for x in e) == {'standard', 'cargo'}, "EBike size: 'standard' or 'cargo'"
    assert all(x.needs_service() == (x.condition <= 3) for x in c + e), 'needs_service() is True exactly when condition <= 3'
    assert isinstance(c[0], Bike) and isinstance(e[0], Bike), 'CityBike and EBike must inherit from Bike'
    try:
        Bike()
        built = True
    except TypeError:
        built = False
    assert not built, 'Bike() should fail: make assign_size abstract'`);

  const M1_MODEL = `
    import random
    from abc import ABC, abstractmethod

    class Bike(ABC):
        next_id = 1                              # shared counter

        def __init__(self):
            self.id = Bike.next_id               # this bike's number
            Bike.next_id += 1                    # next bike gets +1
            self.condition = self.assign_condition()
            self.size = self.assign_size()

        def assign_condition(self):
            return random.randint(1, 10)         # 1 = broken, 10 = new

        @abstractmethod
        def assign_size(self):                   # each subclass decides
            pass

        def needs_service(self):
            return self.condition <= 3           # already True or False

        def __str__(self):
            return f"{self.kind} #{self.id}: condition {self.condition}, {self.size}"


    class CityBike(Bike):
        kind = "CityBike"

        def assign_size(self):
            return random.choice(["small", "medium", "large"])


    class EBike(Bike):
        kind = "EBike"

        def assign_size(self):
            return random.choice(["standard", "cargo"])


    city_bikes = [CityBike() for i in range(100)]
    e_bikes = [EBike() for i in range(100)]

    for bike in city_bikes[:2] + e_bikes[:2]:    # a small selection
        print(bike, "| service:", bike.needs_service())`;

  const M2_CODE = `
    # Mock Q2
    def bikes_free(docks, station)
        free = docks[station]
        if free = 0:
            return "empty"
        elif free < 3
            return "low"
        else:
            return "ok

    docks = np.array([4, 0, 2])
    print(bikes_free(docks, 2)))`;
  const M2_FIXED = `
    # Mock Q2
    def bikes_free(docks, station):              # line 2: added :
        free = docks[station]
        if free == 0:                            # line 4: == compares
            return "empty"
        elif free < 3:                           # line 6: added :
            return "low"
        else:
            return "ok"                          # line 9: closed the string

    docks = np.array([4, 0, 2])
    print(bikes_free(docks, 2))                  # line 12: one ) too many`;

  const M3_TEST = py(`
    import numpy as np
    docks = np.array([4, 0, 2])
    capacity = np.array([6, 5, 2])
    q = []
    assert return_bike(docks, capacity, 0, q) == True, 'station 0 has 4 of 6 docks used: should return True'
    assert docks[0] == 5, 'docks[0] should go up from 4 to 5'
    assert return_bike(docks, capacity, 2, q) == False, 'station 2 is full (2 of 2): should return False'
    assert q == [2], 'append the station index 2 to overflow_queue'
    assert list(docks) == [5, 0, 2], 'a full station must not change'
    assert return_bike(docks, capacity, 0, q) == True and docks[0] == 6, 'station 0: 5 -> 6 still fits'
    assert return_bike(docks, capacity, 0, q) == False and q == [2, 0], 'station 0 is now full'`);

  const mock1 = {
    id: "mock-1",
    title: "Mock exam, part 1 (M1–M3)",
    summary: "A new story, the same pattern as Q1–Q3: classes, syntax errors, a stock-style function. Time yourself, then check in the boxes.",
    exam: ["Q1", "Q2", "Q3 pattern"],
    sources: "New questions",
    blocks: [
      MOCK_STORY,
      { type: "h", text: "How to use this page" },
      { type: "table", head: ["Step", "What you do"], rows: [
        ["1", "Set the timer (about 45 minutes for M1–M3) and press Start."],
        ["2", "Write each answer in your own Jupyter, or on paper. No peeking at the drill pages."],
        ["3", "When time is up, paste your code into the boxes below and press Run: the checks mark it."],
        ["4", "Open the hint only if stuck; open the model answer last. Compare line by line."],
      ] },
      { type: "widget", title: "Exam clock", intro: "Counts down in this tab. It stops if you leave the page.", render: timerWidget(45) },
      { type: "h", text: "Scratch cell with the story's data" },
      { type: "tryit", title: "Scratch cell", task: "Use this to test small ideas. It is not marked.", code: `
          import numpy as np

          docks = np.array([4, 0, 2, 5])           # bikes parked at stations 0..3
          capacity = np.array([6, 5, 2, 5])        # how many docks each station has

          print(docks < capacity)                  # which stations still have a free dock
          print(capacity - docks)                  # how many free docks each` },
      MOCK_HABITS,
      { type: "callout", kind: "tip", title: "Stuck?", html: "<p>Each mock question mirrors a drill: M1 ↔ <a href='#exam/q1-oop'>Q1</a>, M2 ↔ <a href='#exam/q2-syntax'>Q2</a>, M3 ↔ <a href='#exam/q3-inventory'>Q3</a>. Go there <b>after</b> your timed attempt.</p>" },
    ],
    quiz: [
      { type: "write", kindLabel: "M1 · Write code", q: `<p><b>M1. Model the bikes with classes.</b></p><ol>
          <li>A parent class <code>Bike</code> and two subclasses <code>CityBike</code> and <code>EBike</code>.</li>
          <li>Every bike gets a unique <code>id</code> (start at 1), and a <code>condition</code> from 1 to 10, set by a method <code>assign_condition</code> that picks it at random.</li>
          <li>An abstract method <code>assign_size</code> in <code>Bike</code> sets <code>size</code>: CityBike picks “small”, “medium” or “large”; EBike picks “standard” or “cargo”.</li>
          <li>A method <code>needs_service()</code> that returns True when the condition is 3 or lower.</li>
          <li>Create 100 of each subclass and print two of each.</li></ol>`,
        starter: `
          import random
          from abc import ABC, abstractmethod

          class Bike(ABC):
              pass


          class CityBike(Bike):
              pass


          class EBike(Bike):
              pass`,
        test: M1_TEST, solution: M1_MODEL,
        hint: "Copy the Q1 shape: a class counter <code>Bike.next_id</code>; <code>__init__</code> calls <code>self.assign_condition()</code> and <code>self.assign_size()</code>; <code>needs_service</code> returns <code>self.condition &lt;= 3</code>.",
        explain: "Same skeleton as exam Q1, plus one ordinary method that every subclass inherits." },
      { type: "bug", kindLabel: "M2 · Find the errors", q: "<b>M2, part 1.</b> This function should say how full a station is. List every syntax error with its line number: click each line.", code: M2_CODE,
        bugs: [2, 4, 6, 9, 12],
        notes: { 2: "missing <code>:</code> after the <code>def</code> line", 4: "<code>=</code> in a condition: use <code>==</code>", 6: "missing <code>:</code> after the <code>elif</code>", 9: "string never closed: <code>\"ok\"</code>", 12: "one <code>)</code> too many" },
        fixed: M2_FIXED,
        hint: "Five lines. Colons, <code>=</code> vs <code>==</code>, quotes in pairs, brackets in pairs.", explain: "Real Python reports line 9 first (unclosed string), then 12, then 2: not top to bottom. Read every line yourself." },
      { type: "write", kindLabel: "M2 · Fix it", q: "<b>M2, part 2.</b> Write the corrected code. The checks call <code>bikes_free</code> for each station of <code>np.array([4, 0, 2])</code>.",
        starter: M2_CODE.replace("# Mock Q2", "import numpy as np"),
        checks: [["bikes_free(np.array([4, 0, 2]), 0)", "'ok'"], ["bikes_free(np.array([4, 0, 2]), 1)", "'empty'"], ["bikes_free(np.array([4, 0, 2]), 2)", "'low'"]],
        packages: ["numpy"],
        solution: M2_FIXED.replace("# Mock Q2", "import numpy as np"),
        hint: "Fix the five lines from part 1. Run after each fix.", explain: "With 2 bikes, station 2 is “low” (2 &lt; 3)." },
      { type: "write", kindLabel: "M3 · Write code", q: `<p><b>M3. Return a bike.</b> Write <code>return_bike(docks, capacity, station, overflow_queue)</code>. <code>docks</code> and <code>capacity</code> are NumPy arrays (bikes parked / docks available per station).</p><ul>
          <li>If the station has a free dock (<code>docks[station] &lt; capacity[station]</code>): add 1 to <code>docks[station]</code> and return True.</li>
          <li>Otherwise: append <code>station</code> to the list <code>overflow_queue</code> (the van will collect bikes there) and return False.</li></ul>`,
        starter: `
          import numpy as np

          def return_bike(docks, capacity, station, overflow_queue):
              pass


          docks = np.array([4, 0, 2])
          capacity = np.array([6, 5, 2])
          overflow_queue = []
          print(return_bike(docks, capacity, 2, overflow_queue))
          print(docks, overflow_queue)`,
        test: M3_TEST, packages: ["numpy"],
        solution: `
          import numpy as np

          def return_bike(docks, capacity, station, overflow_queue):
              if docks[station] < capacity[station]:     # a free dock?
                  docks[station] += 1                    # park the bike
                  return True
              else:                                      # station is full
                  overflow_queue.append(station)         # queue the station INDEX
                  return False


          docks = np.array([4, 0, 2])
          capacity = np.array([6, 5, 2])
          overflow_queue = []
          print(return_bike(docks, capacity, 2, overflow_queue))   # False
          print(docks, overflow_queue)                             # [4 0 2] [2]`,
        hint: "Exactly the Q3 shape, with <code>&lt; capacity[station]</code> instead of <code>&gt; 0</code>, and <code>+= 1</code> instead of <code>-= 1</code>.",
        explain: "Change first, then return. The array and the list are changed in place." },
    ],
  };

  const M4_CODE = `
    # Mock Q4
    def charge_ride(minutes, rate, balance):
        cost = minutes * rate
        if balance >= cost
            balance = balance - cost
            print("Ride paid. New balance:", balanse)
            return True
        else:
            print("Not enough money, missing", balance - cost)
            return False

    ok = charge_ride(30, 2, 50)
    print("Paid:", ok)`;
  const M4_FIXED = `
    def charge_ride(minutes, rate, balance):
        cost = minutes * rate                        # e.g. 30 min * 2 = 60
        if balance >= cost:                          # line 4: added :
            balance = balance - cost
            print("Ride paid. New balance:", balance)    # line 6: balance, not balanse
            return True
        else:
            print("Not enough money, missing", cost - balance)   # line 9: cost - balance
            return False

    ok = charge_ride(30, 2, 50)
    print("Paid:", ok)                               # Not enough money, missing 10 / Paid: False`;

  const M5_TEST = py(`
    import numpy as np
    t = np.array([[12, 30, 8], [5, 22, 9], [20, 41, 3], [7, 15, 6]])
    r = [int(i) for i in busy_days(t, 40)]
    assert r == [0, 1], f'column totals are 44, 108, 26: expected [0, 1], got {r}'
    r = [int(i) for i in busy_days(t, 44)]
    assert r == [1], f'a total of exactly 44 is NOT greater than 44, got {r}'
    r = [int(i) for i in busy_days(np.array([[1, 50], [2, 0]]), 10)]
    assert r == [1], f'expected [1], got {r}'`);

  const MOCK6_STEPS = dfsSteps(TREE_B, 0);

  const mock2 = {
    id: "mock-2",
    title: "Mock exam, part 2 (M4–M6)",
    summary: "Debug and explain, NumPy column totals, and a DFS van route. Same pattern as Q4–Q6.",
    exam: ["Q4", "Q5", "Q6 pattern"],
    sources: "New questions",
    blocks: [
      MOCK_STORY,
      { type: "h", text: "How to use this page" },
      `<p>Same as part 1: set the timer (about 45 minutes), answer M4–M6 in your own notebook, then paste and check below. M4 and M6 also want <b>written</b> answers: write them before you open the model answers.</p>`,
      { type: "widget", title: "Exam clock", intro: "Counts down in this tab. It stops if you leave the page.", render: timerWidget(45) },
      { type: "h", text: "The data for M5 and M6" },
      { type: "code", caption: "M5: trips per station (rows) per day (columns)", code: `
          trips = np.array([[12, 30,  8],   # station 0: day 0, day 1, day 2
                            [ 5, 22,  9],   # station 1
                            [20, 41,  3],   # station 2
                            [ 7, 15,  6]])  # station 3` },
      { type: "h", text: "M6: the bike-path tree as a matrix", sub: "Click the rows to read the matrix (no spoilers: this shows neighbours, not the route)." },
      { type: "widget", render: matrixWidget(TREE_B, "station") },
      { type: "tryit", title: "Scratch cell", task: "Test small ideas here. It is not marked.", code: `
          import numpy as np

          trips = np.array([[12, 30, 8], [5, 22, 9], [20, 41, 3], [7, 15, 6]])
          paths = [
              [0, 1, 1, 0, 0, 0, 0],
              [1, 0, 0, 1, 0, 0, 0],
              [1, 0, 0, 0, 1, 1, 0],
              [0, 1, 0, 0, 0, 0, 0],
              [0, 0, 1, 0, 0, 0, 0],
              [0, 0, 1, 0, 0, 0, 1],
              [0, 0, 0, 0, 0, 1, 0],
          ]

          print(trips.shape)          # (stations, days)
          print(paths[2])             # row 2: who is station 2 joined to?` },
      MOCK_HABITS,
      { type: "h", text: "After you finish: check M6 with a trace", sub: "Only open this once you have your own answer." },
      sw({ label: "Show the M6 trace", items: [
        { label: "Hidden", blocks: ["<p class='muted'>Choose “Show trace” when you are done with M6.</p>"] },
        { label: "Show trace", blocks: [{ type: "stepper", title: "van_route(paths, 0)", code: DFS_CODE.replace("def dfs_route", "def van_route"), steps: MOCK6_STEPS, visualTitle: "Tree, matrix, stack", legend: DFS_LEGEND, visual: dfsVisual(TREE_B) }] },
      ] }),
    ],
    quiz: [
      { type: "bug", kindLabel: "M4 · Find the errors", q: "<b>M4, part 1.</b> <code>charge_ride</code> should charge <code>minutes * rate</code> from the balance if there is enough money, otherwise say how much is missing. Click every line with an error: syntax, runtime <b>or logic</b>.", code: M4_CODE,
        bugs: [4, 6, 9],
        notes: { 4: "syntax: missing <code>:</code> after the <code>if</code>", 6: "runtime: NameError, <code>balanse</code> should be <code>balance</code>", 9: "logic: missing money is <code>cost - balance</code>; this prints −10" },
        fixed: M4_FIXED,
        hint: "One syntax, one runtime, one logic. For the logic one, run the example in your head: cost 60, balance 50.",
        explain: "Note: the given call (balance 50 &lt; cost 60) never reaches line 6, so the NameError hides until someone can afford a ride. Test both branches!" },
      { type: "explain", kindLabel: "M4 · Explain", q: "<b>M4, part 2.</b> Explain each of the three errors in 3–4 sentences (what → why → fix). Also: is there a design problem with <code>balance</code>?",
        answer: `<p><b>Line 4 (syntax).</b> The <code>if</code> line has no colon. Every line that opens a block must end with <code>:</code>, so Python refuses to run the cell at all. Fix: <code>if balance &gt;= cost:</code>.</p>
          <p><b>Line 6 (runtime).</b> <code>balanse</code> is misspelled, so Python raises a NameError when it reaches this line. With the given call the rider cannot pay, so this branch never runs and the bug stays hidden; it crashes for the first rider who can pay. Fix: <code>balance</code>.</p>
          <p><b>Line 9 (logic).</b> When the money is short, <code>balance - cost</code> is 50 − 60 = −10, so it reports “missing −10”. The missing amount is <code>cost - balance</code> = 10. No crash: the program just gives a wrong message.</p>
          <p><b>Design.</b> <code>balance = balance - cost</code> only changes the local name inside the function; the caller's balance is not updated. The function should return the new balance (or the object should store it).</p>`,
        points: ["line 4: syntax, colon", "line 6: NameError, only when that branch runs", "line 9: sign wrong, should be cost − balance", "local <code>balance</code> is lost after return"],
        hint: "What, why, fix, for each line." },
      { type: "write", kindLabel: "M5 · Write code", q: "<p><b>M5. Busy days.</b> <code>trips</code> has one row per station and one column per day. Write <code>busy_days(trips, threshold)</code> that returns the indices of the <b>days</b> whose total trips (all stations together) are greater than <code>threshold</code>. NumPy only. Add an example call with the data above and threshold 40.</p>",
        starter: `
          import numpy as np

          def busy_days(trips, threshold):
              pass


          trips = np.array([[12, 30, 8], [5, 22, 9], [20, 41, 3], [7, 15, 6]])
          print(busy_days(trips, 40))`,
        test: M5_TEST, packages: ["numpy"],
        solution: `
          import numpy as np

          def busy_days(trips, threshold):
              totals = np.sum(trips, axis=0)       # one total per COLUMN (day)
              is_busy = totals > threshold         # True / False per day
              return np.where(is_busy)[0]          # indices of the busy days


          trips = np.array([[12, 30, 8], [5, 22, 9], [20, 41, 3], [7, 15, 6]])
          print(np.sum(trips, axis=0))             # [ 44 108  26]
          print(busy_days(trips, 40))              # [0 1]`,
        hint: "Days are <b>columns</b> this time. Which axis adds down a column?",
        explain: "The twist: <code>axis=0</code> (down the columns), not <code>axis=1</code> as in the exam's Q5." },
      { type: "write", kindLabel: "M6 · Write code", q: "<p><b>M6. Van route.</b> The bike paths form a tree, given as the adjacency matrix <code>paths</code> above (7 stations). Write <code>van_route(adj_matrix, start)</code> that returns the stations in DFS order from <code>start</code>. Iterative or recursive.</p>",
        starter: `
          def van_route(adj_matrix, start):
              pass


          paths = [
              [0, 1, 1, 0, 0, 0, 0],
              [1, 0, 0, 1, 0, 0, 0],
              [1, 0, 0, 0, 1, 1, 0],
              [0, 1, 0, 0, 0, 0, 0],
              [0, 0, 1, 0, 0, 0, 0],
              [0, 0, 1, 0, 0, 0, 1],
              [0, 0, 0, 0, 0, 1, 0],
          ]
          print(van_route(paths, 0))`,
        test: dfsTest("van_route", TREE_B, [0, 2, 6]), packages: ["numpy"],
        solution: `
          def van_route(adj_matrix, start, visited=None):
              if visited is None:                  # first call: fresh list
                  visited = []
              visited.append(start)                # the van stops here

              for nb in range(len(adj_matrix)):    # every station, low to high
                  if adj_matrix[start][nb] == 1 and nb not in visited:
                      van_route(adj_matrix, nb, visited)   # finish this branch first

              return visited


          paths = [
              [0, 1, 1, 0, 0, 0, 0],
              [1, 0, 0, 1, 0, 0, 0],
              [1, 0, 0, 0, 1, 1, 0],
              [0, 1, 0, 0, 0, 0, 0],
              [0, 0, 1, 0, 0, 0, 0],
              [0, 0, 1, 0, 0, 0, 1],
              [0, 0, 0, 0, 0, 1, 0],
          ]
          print(van_route(paths, 0))               # [0, 1, 3, 2, 4, 5, 6]`,
        hint: "Same as Q6. This model answer is the recursive version; the stack version from the Q6 page also passes.",
        explain: "Recursive DFS: visit, then call yourself on each unvisited neighbour. The call stack does the backtracking." },
      { type: "explain", kindLabel: "M6 · Explain", q: "<b>M6, part 2.</b> In 4–5 sentences: why is DFS a sensible route for one van, and what would BFS do differently here? Use the order your code returns from station 0.",
        answer: "<p>From station 0 my code returns <code>[0, 1, 3, 2, 4, 5, 6]</code>. DFS takes one branch to its end (0 → 1 → 3), then backtracks to the last station with an unvisited path and continues (2 → 4, then 5 → 6). For a single van this means it finishes one part of town before going to the next, so it never has to jump back and forth between areas. BFS would instead visit by distance from the start: 0, then 1 and 2, then 3, 4 and 5, then 6, which keeps switching between the two sides of the tree. BFS is better for “closest stations first”; DFS is better for “clear one branch, then the next”.</p>",
        points: ["quotes the DFS order", "deep first, then backtrack", "why that suits one van", "BFS = level by level / by distance", "when each is better"],
        hint: "Compare 0 → 1 → 3 … with 0, 1, 2, …" },
    ],
  };

  /* ================================================================
     Register
     ================================================================ */
  PADS.registerSubject({
    id: "exam",
    title: "Exam",
    order: 8,
    blurb: "How the exam works, a drill page for each of last year's six questions, and a fresh two-part mock exam you can check in the browser.",
    covers: ["Format, hand-in and time plan", "Q1–Q6 drills: task, plan, worked solution, checked practice", "Mock exam: new story, same six question types"],
    exam: [
      "<b>Q1</b> classes · <b>Q2</b> syntax errors · <b>Q3</b> stock function · <b>Q4</b> debug + explain · <b>Q5</b> NumPy totals · <b>Q6</b> DFS + explain.",
      "Every page ends with exam-style questions that run real Python and check your answer.",
    ],
    topics: [format, q1, q2, q3, q4, q5, q6, mock1, mock2],
  });
})();
