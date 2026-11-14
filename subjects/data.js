/* Subject 2: Working with data (content map topics 5–6).
   Lists, tuples, dicts, sets, aliasing and copies, files and CSV.
   Built like subjects/foundations.js: only the public API in AUTHORING.md. */
(function () {
  "use strict";
  const { h, ui, pyrepr } = PADS;
  const D = ui.draw;

  /* small helpers for this file only */
  const row = (...kids) => h("div", { class: "row-wrap" }, ...kids);
  const eyebrow = (text, style) => h("p", { class: "eyebrow", style: style || "margin-top:12px" }, text);
  const press = (seg, i) => [...seg.children].forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
  const segOf = (labels, aria, onPick) => {
    const seg = h("div", { class: "seg", role: "group", "aria-label": aria });
    labels.forEach((t, i) => seg.appendChild(h("button", { type: "button", onclick: () => onPick(i) }, t)));
    return seg;
  };
  const esc = s => PADS.esc(String(s));
  const q = s => "'" + s + "'";                                   // Python-style text for a plain word
  const dictRepr = pairs => "{" + pairs.map(([k, v]) => (typeof k === "number" ? k : q(k)) + ": " + v).join(", ") + "}";

  // a code block inside a switch pane; min-width 0 lets a long line scroll instead of widening the page
  const paneCode = code => el => { el.style.minWidth = "0"; el.appendChild(ui.code({ code })); };

  /* ================================================================
     TOPIC 1: Lists & comprehensions
     ================================================================ */

  // --- widget: grow and shrink a list ---
  function listOpsWidget(el) {
    const START = ["milk", "eggs", "bread"];
    const APP = ["coffee", "tea", "jam", "rice"], INS = ["butter", "salt", "figs"];
    let items, nApp, nIns, last;
    const btns = h("div", { class: "row-wrap", role: "group", "aria-label": "List operations" });
    const codeBox = h("div"), pic = h("div", { style: "margin-top:10px" }), gave = h("div", { class: "data-gave", "aria-live": "polite" });
    function reset() { items = START.slice(); nApp = 0; nIns = 0; last = null; draw(); }
    function run(kind) {
      const before = items.slice();
      let code, ret = null, err = null, marks = {}, below = {};
      if (kind === "append") {
        const x = APP[nApp++ % APP.length];
        code = `groceries.append('${x}')`;
        items.push(x); marks[items.length - 1] = "done"; below[items.length - 1] = "new";
        ret = ["None", "<code>.append()</code> changes the list and gives back <b>None</b>. It adds ONE item at the end."];
      } else if (kind === "insert") {
        const x = INS[nIns++ % INS.length], at = Math.min(1, items.length);
        code = `groceries.insert(1, '${x}')`;
        items.splice(at, 0, x); marks[at] = "done"; below[at] = "new";
        for (let k = at + 1; k < items.length; k++) { marks[k] = "cmp"; below[k] = "→ moved"; }
        ret = ["None", at < 1 ? "The list was empty, so it just goes in at the end." : "It goes in <b>before</b> index 1. Everything from there slides one place to the right."];
      } else if (kind === "del") {
        code = "del groceries[0]";
        if (!items.length) err = "IndexError: list assignment index out of range";
        else {
          items.shift();
          items.forEach((_, k) => { marks[k] = "cmp"; below[k] = "← moved"; });
          ret = ["nothing", "<code>del</code> is a statement: it removes by <b>position</b> and gives nothing back. Everything after slides left."];
        }
      } else if (kind === "pop") {
        code = "groceries.pop()";
        if (!items.length) err = "IndexError: pop from empty list";
        else { const x = items.pop(); ret = [q(x), "<code>.pop()</code> removes the <b>last</b> item <b>and gives it back</b>, so you can store it: <code>last_item = groceries.pop()</code>."]; }
      } else if (kind === "set") {
        code = "groceries[1] = 'oat milk'";
        if (items.length < 2) err = "IndexError: list assignment index out of range";
        else { items[1] = "oat milk"; marks[1] = "done"; below[1] = "changed"; ret = ["nothing", "Overwrite one item in place. The list is still the same list (same <code>id</code>)."]; }
      }
      last = { code, ret, err, marks, below, before };
      draw();
    }
    const ops = [["append", () => `.append('${APP[nApp % APP.length]}')`], ["insert", () => `.insert(1, '${INS[nIns % INS.length]}')`], ["del", () => "del groceries[0]"], ["pop", () => ".pop()"], ["set", () => "groceries[1] = 'oat milk'"]];
    const opBtns = ops.map(([k]) => h("button", { type: "button", class: "btn small mono", onclick: () => run(k) }));
    btns.append(...opBtns, h("button", { type: "button", class: "btn small ghost", onclick: reset }, "Reset"));
    function draw() {
      ops.forEach(([, t], i) => (opBtns[i].textContent = t()));
      codeBox.replaceChildren(ui.code({ code: last ? last.code : "groceries = ['milk', 'eggs', 'bread']", nonum: true }));
      pic.replaceChildren(D.array(items, { name: "groceries", quote: true, marks: last && !last.err ? last.marks : {}, below: last && !last.err ? last.below : {} }),
        h("p", { class: "small muted", style: "margin:6px 0 0" }, `len(groceries) is ${items.length}. id(groceries) never changes: it is the same list the whole time.`));
      if (!last) gave.innerHTML = "<p class='small muted'>Press a button to run that line.</p>";
      else if (last.err) gave.innerHTML = `<p><span class="data-bad">${esc(last.err)}</span><br><span class="small">The list was not changed.</span></p>`;
      else gave.innerHTML = `<p>Gives back: <code>${esc(last.ret[0])}</code>. ${last.ret[1]}</p>`;
    }
    el.append(btns, h("div", { style: "margin-top:12px" }, codeBox), pic, gave);
    reset();
  }

  // --- stepper data: change in place vs make a new value ---
  const inPlaceSteps = [
    { line: 0, now: "Nothing exists yet. Press <b>Step</b>.", vars: {}, names: [], values: [] },
    { line: 1, now: "Python makes a list and sticks the name <code>groceries</code> on it. Say its id is 1001 (real ids are long numbers).", vars: { groceries: "['milk', 'eggs']" },
      names: [{ name: "groceries", to: "L" }], values: [{ id: "L", text: "['milk', 'eggs']", sub: "id 1001" }] },
    { line: 2, now: "A list is <b>mutable</b>: Python changes item 1 <b>inside the same box</b>. The id is still 1001.", vars: { groceries: "['milk', 'oat milk']" },
      names: [{ name: "groceries", to: "L" }], values: [{ id: "L", text: "['milk', 'oat milk']", sub: "id 1001 (same box)", tone: "cmp" }] },
    { line: 3, now: "A string: the name <code>name</code> points at <code>'ana'</code>, id 2001.", vars: { groceries: "['milk', 'oat milk']", name: "'ana'" },
      names: [{ name: "groceries", to: "L" }, { name: "name", to: "S" }], values: [{ id: "L", text: "['milk', 'oat milk']", sub: "id 1001" }, { id: "S", text: "'ana'", sub: "id 2001" }] },
    { line: 4, now: "A string is <b>immutable</b>. <code>.upper()</code> cannot change it, so it makes a <b>new</b> string (id 2002), and the name moves to it.", vars: { groceries: "['milk', 'oat milk']", name: "'ANA'" },
      names: [{ name: "groceries", to: "L" }, { name: "name", to: "S2", tone: "cmp" }], values: [{ id: "L", text: "['milk', 'oat milk']", sub: "id 1001" }, { id: "S", text: "'ana'", sub: "id 2001", faded: true }, { id: "S2", text: "'ANA'", sub: "id 2002 (new box)" }] },
  ];

  // --- widget: comprehension decoder ---
  const COMPS = [
    { label: "evens", name: "evens", expr: "num", v: "num", src: "range(10)", cond: "num % 2 == 0",
      items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], keep: x => x % 2 === 0, condTxt: x => `${x} % 2 == 0`, out: x => x },
    { label: "squares", name: "squares", expr: "n ** 2", v: "n", src: "[1, 2, 3, 4]", cond: null,
      items: [1, 2, 3, 4], keep: () => true, out: x => x * x, exprTxt: x => `${x} ** 2` },
    { label: "upper", name: "shout", expr: "w.upper()", v: "w", src: "['hi', 'yo', 'cbs']", cond: null, quote: true,
      items: ["hi", "yo", "cbs"], keep: () => true, out: x => q(x.toUpperCase()), exprTxt: x => `'${x}'.upper()` },
    { label: "low stock (Q3 idea)", name: "low", pre: "stock = [3, 0, 5, 0]", expr: "i", v: "i", src: "range(len(stock))", cond: "stock[i] == 0",
      items: [0, 1, 2, 3], stock: [3, 0, 5, 0], keep: x => [3, 0, 5, 0][x] === 0, condTxt: x => `stock[${x}] == 0  →  ${[3, 0, 5, 0][x]} == 0`, out: x => x },
  ];
  function compWidget(el) {
    let ci = 0, k = 0;
    const seg = segOf(COMPS.map(c => c.label), "Pick an example", i => { ci = i; k = 0; draw(); });
    const one = h("div"), loop = h("div"), pic = h("div"), note = h("p", { style: "margin:8px 0 0", "aria-live": "polite" });
    const next = h("button", { type: "button", class: "btn small primary", onclick: () => { if (k < COMPS[ci].items.length) k++; draw(); } }, "Next item");
    const all = h("button", { type: "button", class: "btn small", onclick: () => { k = COMPS[ci].items.length; draw(); } }, "Run all");
    const rst = h("button", { type: "button", class: "btn small ghost", onclick: () => { k = 0; draw(); } }, "Reset");
    const sp = (cls, t) => `<span class="data-cx data-cx-${cls}">${esc(t)}</span>`;
    function draw() {
      press(seg, ci);
      const c = COMPS[ci];
      const pre = c.pre ? esc(c.pre) + "\n" : "";
      one.innerHTML = `<pre class="data-cxcode">${pre}${esc(c.name)} = [${sp("e", c.expr)} ${sp("f", "for " + c.v + " in " + c.src)}${c.cond ? " " + sp("i", "if " + c.cond) : ""}]</pre>`;
      loop.innerHTML = `<pre class="data-cxcode">${pre}${esc(c.name)} = []\n${sp("f", "for " + c.v + " in " + c.src)}:\n` +
        (c.cond ? `    ${sp("i", "if " + c.cond)}:\n        ${esc(c.name)}.append(${sp("e", c.expr)})` : `    ${esc(c.name)}.append(${sp("e", c.expr)})`) + "</pre>";
      const marks = {}, below = {}, res = [];
      c.items.forEach((x, i) => {
        if (i < k) {
          if (c.keep(x)) { marks[i] = "done"; below[i] = "kept"; res.push(c.out(x)); }
          else { marks[i] = "dim"; below[i] = "dropped"; }
        }
      });
      if (k > 0 && k <= c.items.length) { marks[k - 1] = c.keep(c.items[k - 1]) ? "held" : "cmp"; }
      pic.replaceChildren(
        D.array(c.items, { name: "items", quote: c.quote, index: !!c.stock, marks, below }),
        c.stock ? h("p", { class: "small muted", style: "margin:4px 0 0" }, "Here i is an index. stock = [3, 0, 5, 0]") : null,
        h("div", { style: "margin-top:10px" }, D.array(res.map(String), { name: c.name, emptyText: "[ ]  (empty so far)" })));
      if (k === 0) note.innerHTML = "Press <b>Next item</b>. Each item goes through the <span class='data-cx data-cx-f'>for part</span>, then the <span class='data-cx data-cx-i'>if part</span> (if there is one), then the <span class='data-cx data-cx-e'>front part</span> says what to keep.";
      else {
        const x = c.items[k - 1], kept = c.keep(x), xs = c.quote ? q(x) : x;
        const condHtml = c.cond ? `<code>${esc(c.condTxt(x))}</code>? <b>${kept ? "True" : "False"}</b>. ` : "No <code>if</code> part, so every item is kept. ";
        const keepHtml = !kept ? "Dropped." : c.exprTxt ? `Keep <code>${esc(c.exprTxt(x))}</code> = <b>${esc(c.out(x))}</b>.` : `Keep it: <b>${esc(c.out(x))}</b>.`;
        note.innerHTML = `<code>${c.v} = ${esc(xs)}</code>. ${condHtml}${keepHtml}${k === c.items.length ? ` <br>Done: <code>${esc(c.name)}</code> is <code>${esc("[" + res.join(", ") + "]")}</code>.` : ""}`;
      }
      next.disabled = k >= c.items.length;
    }
    el.append(seg,
      h("div", { class: "data-two", style: "margin-top:12px" },
        h("div", null, eyebrow("One line (comprehension)", "margin:0 0 6px"), one), h("div", null, eyebrow("The same as a loop", "margin:0 0 6px"), loop)),
      row(next, all, rst), h("div", { style: "margin-top:10px" }, pic), note);
    draw();
  }

  const lists = {
    id: "lists",
    title: "Lists & comprehensions",
    summary: "A list is a row of numbered boxes you can change. Grow and shrink it, use the built-ins, and build lists in one line.",
    exam: ["Q1 list of objects", "Q3 low_stock_queue"],
    sources: "NB §13; L3 p5–9",
    blocks: [
      { type: "h", text: "A list: numbered boxes in square brackets" },
      `<p>Indexing and slicing work exactly like strings. Items can be any type, even mixed.</p>`,
      { type: "table", head: ["Python", "Result", "Why"], code: [0], rows: [
        ["groceries = ['milk', 'eggs', 'bread', 'coffee']", "", "4 items, indexes 0 to 3"],
        ["groceries[0]", "<code>'milk'</code>", "the first item is index 0"],
        ["groceries[-1]", "<code>'coffee'</code>", "−1 is the last one"],
        ["groceries[1:3]", "<code>['eggs', 'bread']</code>", "a slice is a new list; stop 3 is not included"],
        ["len(groceries)", "<code>4</code>", "how many items"],
        ["['coffee', 3, True]", "a list", "mixed types are fine"],
      ] },

      { type: "h", text: "Grow and shrink a list", sub: "Press the buttons. Green = new or changed, amber = slid over." },
      { type: "widget", render: listOpsWidget },
      { type: "table", head: ["You write", "What it does", "Gives back"], code: [0], rows: [
        ["L.append(x)", "add <b>one</b> item at the end", "<code>None</code>"],
        ["L.insert(1, x)", "put x <b>before</b> index 1; the rest slide right", "<code>None</code>"],
        ["del L[0]", "remove by <b>position</b>", "nothing (it is a statement)"],
        ["L.pop()", "remove the last item", "<b>that item</b>"],
        ["L.remove('eggs')", "remove the first item <b>equal to</b> 'eggs'", "<code>None</code>"],
        ["L[1] = 'oat milk'", "overwrite one item", "nothing"],
      ] },

      { type: "h", text: "Mutable: a list changes in place", sub: "A string never changes. You get a new one." },
      {
        type: "stepper",
        title: "Same box or new box?",
        code: `
          groceries = ['milk', 'eggs']
          groceries[1] = 'oat milk'
          name = 'ana'
          name = name.upper()`,
        what: {
          1: "Make a list and give it a name.",
          2: "Change one item of the list. Allowed: lists are mutable.",
          3: "Make a string and give it a name.",
          4: "Strings are immutable. upper() makes a new string; the name moves to it.",
        },
        steps: inPlaceSteps,
        visualTitle: "Names (left) point at values (right)",
        visual: (el, st) => el.appendChild(st.names.length ? D.bindings({ names: st.names, values: st.values, w: 380, valW: 190, nameW: 100 }) : h("p", { class: "novars" }, "No names yet.")),
      },

      { type: "h", text: "Handy built-ins", sub: "transactions = [200, -20, 50, -5, 30]" },
      { type: "table", head: ["Python", "Result", "Note"], code: [0], rows: [
        ["sum(transactions)", "<code>255</code>", "adds them up"],
        ["min(transactions), max(transactions)", "<code>(-20, 200)</code>", "smallest, biggest"],
        ["50 in transactions", "<code>True</code>", "checks every item, one by one"],
        ["transactions.index(50)", "<code>2</code>", "where is it? ValueError if absent"],
        ["sorted(transactions)", "<code>[-20, -5, 30, 50, 200]</code>", "a <b>new</b> sorted list; the old one is unchanged"],
        ["transactions.sort()", "<code>None</code>", "sorts the list <b>itself</b>, gives back None"],
        ["[1, 2] + [3]", "<code>[1, 2, 3]</code>", "glue two lists into a new one"],
      ] },
      { type: "callout", kind: "warn", title: "Never write L = L.sort()", html: "<p><code>.sort()</code> and <code>.append()</code> change the list and give back <b>None</b>. So <code>L = L.sort()</code> throws your list away: <code>L</code> becomes None.</p>", code: "nums = [3, 1, 2]\nnums.sort()          # right: nums is now [1, 2, 3]\nnums = nums.sort()   # wrong: nums is now None" },

      { type: "h", text: "List comprehension: build a list in one line", sub: "Pick an example, then walk through it item by item." },
      `<p>Shape: <code>[<i>what to keep</i> for <i>item</i> in <i>list</i> if <i>condition</i>]</code>. The <code>if</code> part is optional. The square brackets are <b>not</b> optional.</p>`,
      { type: "widget", render: compWidget },
      { type: "callout", kind: "exam", title: "Where lists show up in the exam", html: "<ul><li><b>Q3</b>: when an item is out of stock, <code>low_stock_queue.append(item_index)</code>. A list used as a queue.</li><li><b>Q1</b>: make 200 objects: <code>snacks = [Snacks() for _ in range(200)]</code>. The <code>_</code> means “a loop variable I don't use”. Then print a few with a slice: <code>for s in snacks[:3]: print(s)</code>.</li><li><b>Q6</b>: return the visited nodes as a list, in order.</li></ul>" },
      {
        type: "tryit",
        title: "List playground",
        task: "Predict each print before you run it. Then add your own lines.",
        code: `
          groceries = ['milk', 'eggs', 'bread']

          groceries.append('coffee')        # one item at the end
          groceries.insert(1, 'butter')     # before index 1
          print(groceries)

          last_item = groceries.pop()       # removes and gives back the last item
          print(last_item, groceries)

          del groceries[0]                  # remove by position
          print(groceries, len(groceries))`,
      },
      {
        type: "tryit",
        title: "Exercise 3 Q1: evens and odds",
        task: "Fill in the two comprehensions so the program prints <code>[8, 6, 10]</code> and then <code>[3, 1, 7]</code>.",
        code: `
          numbers = [3, 8, 1, 6, 10, 7]

          evens = []      # replace [] with a comprehension
          odds = []       # replace [] with a comprehension

          print(evens)
          print(odds)`,
        expectOutput: "[8, 6, 10]\n[3, 1, 7]",
        hint: "Even: <code>n % 2 == 0</code>. Odd: <code>n % 2 == 1</code>. Keep <code>n</code> itself.",
        solution: `
          numbers = [3, 8, 1, 6, 10, 7]

          evens = [n for n in numbers if n % 2 == 0]   # remainder 0
          odds = [n for n in numbers if n % 2 == 1]    # remainder 1

          print(evens)
          print(odds)`,
      },
      { type: "mistakes", items: [
        { title: "Storing what <code>.sort()</code> gives back", wrong: "nums = nums.sort()\nprint(nums)     # None", right: "nums.sort()\nprint(nums)     # [1, 2, 3]", why: "<code>.sort()</code>, <code>.append()</code> and <code>.insert()</code> change the list and give back None." },
        { title: "Comprehension without square brackets", wrong: "evens = n for n in nums if n % 2 == 0", right: "evens = [n for n in nums if n % 2 == 0]", why: "Without <code>[ ]</code> it is not a list: SyntaxError." },
        { title: "Two items in one <code>.append()</code>", wrong: "queue.append(3, 4)", right: "queue.append(3)\nqueue.append(4)", why: "<code>TypeError: list.append() takes exactly one argument (2 given)</code>." },
        { title: "<code>del</code> vs <code>.remove()</code>", wrong: "L = [10, 20, 30]\nL.remove(1)     # ValueError", right: "L = [10, 20, 30]\ndel L[1]        # by position: [10, 30]\nL.remove(10)    # by value:    [30]", why: "<code>del L[i]</code> removes by position. <code>.remove(x)</code> looks for the value x." },
        { title: "Index equal to the length", wrong: "L = ['a', 'b', 'c']\nL[3]", right: "L = ['a', 'b', 'c']\nL[2]     # or L[-1]", why: "The last index is <code>len(L) - 1</code>. <code>IndexError: list index out of range</code>." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "groceries = ['milk', 'eggs', 'bread']\ngroceries.insert(1, 'butter')\ngroceries.pop()\nprint(groceries)", answer: "['milk', 'butter', 'eggs']",
        hint: "After the insert the list has 4 items. Which one does <code>.pop()</code> remove?", explain: "insert gives <code>['milk', 'butter', 'eggs', 'bread']</code>. pop removes the last item, <code>'bread'</code>." },
      { type: "predict", q: "What does this print?", code: "nums = [3, 1, 2]\nresult = nums.sort()\nprint(result, nums)", answer: "None [1, 2, 3]",
        hint: "What does <code>.sort()</code> give back? What does it do to <code>nums</code>?", explain: "<code>.sort()</code> sorts <code>nums</code> itself and gives back None. So <code>result</code> is None." },
      { type: "predict", q: "What does this print?", code: "print([n * 2 for n in range(5) if n % 2 == 1])", answer: "[2, 6]",
        hint: "range(5) is 0, 1, 2, 3, 4. Which are odd? Then double them.", explain: "The odd ones are 1 and 3. Doubled: 2 and 6." },
      { type: "bug", q: "Exam Q2 style. Click every line with a syntax error.", code: `
          stock = [3, 0, 5, 0]
          low_stock_queue = []
          for i in range(len(stock))
              if stock[i] == 0:
                  low_stock_queue.append(i]
          print(low_stock_queue)`,
        bugs: [3, 5], notes: { 3: "missing <code>:</code> at the end of the <code>for</code> line", 5: "the bracket opened with <code>(</code> must close with <code>)</code>" },
        fixed: `
          stock = [3, 0, 5, 0]
          low_stock_queue = []
          for i in range(len(stock)):
              if stock[i] == 0:
                  low_stock_queue.append(i)
          print(low_stock_queue)      # [1, 3]`,
        hint: "Check the end of every line that starts a block, and that every bracket closes with the same kind.", explain: "In the exam, give each error with its line number, then the fixed code." },
      { type: "write", q: "Exam Q3 (with a list). Write <code>process_inventory(stock, item_index, min_stock, low_stock_queue)</code>. If <code>stock[item_index]</code> is more than 0: take 1 off it and <b>return</b> <code>True</code>. Otherwise: append <code>item_index</code> to <code>low_stock_queue</code> and <b>return</b> <code>False</code>. (<code>min_stock</code> is in the exam's signature; these two rules don't need it.)",
        starter: `
          def process_inventory(stock, item_index, min_stock, low_stock_queue):
              # your code here
              pass

          stock = [2, 0, 5]
          queue = []
          print(process_inventory(stock, 0, 1, queue), stock, queue)
          print(process_inventory(stock, 1, 1, queue), stock, queue)`,
        test: `
          s = [2, 0, 5]
          qq = []
          assert process_inventory(s, 0, 1, qq) == True, 'item 0 has stock, so it should return True'
          assert s == [1, 0, 5], 'stock[0] should go down from 2 to 1, got ' + str(s)
          assert process_inventory(s, 1, 1, qq) == False, 'item 1 has 0 left, so it should return False'
          assert qq == [1], 'index 1 should be appended to low_stock_queue, got ' + str(qq)
          assert s == [1, 0, 5], 'an empty item must not go below 0'`,
        solution: `
          def process_inventory(stock, item_index, min_stock, low_stock_queue):
              if stock[item_index] > 0:
                  stock[item_index] -= 1                # take one off, in place
                  return True

              low_stock_queue.append(item_index)        # out of stock: queue its index
              return False`,
        hint: "An <code>if</code> on <code>stock[item_index] &gt; 0</code>. Inside: <code>-= 1</code> and <code>return True</code>. After it: <code>.append(item_index)</code> and <code>return False</code>.",
        explain: "The function changes the caller's <code>stock</code> and <code>low_stock_queue</code> because lists are passed by name, not copied (see “Names, aliasing &amp; copies”)." },
      { type: "mc", q: "Which line makes the list <code>[0, 1, 4, 9]</code>?", options: ["<code>[x ** 2 for x in range(4)]</code>", "<code>[x ** 2 for x in range(1, 4)]</code>", "<code>x ** 2 for x in range(4)</code>", "<code>[x * 2 for x in range(4)]</code>"], answer: 0,
        wrong: { 1: "range(1, 4) starts at 1, so 0 is missing: [1, 4, 9].", 2: "Without square brackets this is not a list (SyntaxError on its own line).", 3: "x * 2 doubles: [0, 2, 4, 6]." },
        hint: "You need 0, 1, 2, 3 squared.", explain: "<code>range(4)</code> is 0, 1, 2, 3 and <code>x ** 2</code> squares each one." },
    ],
  };

  /* ================================================================
     TOPIC 2: Tuples & unpacking (with enumerate and zip)
     ================================================================ */

  // --- stepper data: swap with tuple unpacking ---
  const swapSteps = [
    { line: 0, now: "Nothing yet. Press <b>Step</b>.", vars: {}, names: [], values: [] },
    { line: 1, now: "<code>a</code> points at 1.", vars: { a: "1" }, names: [{ name: "a", to: "one" }], values: [{ id: "one", text: "1" }] },
    { line: 2, now: "<code>b</code> points at 2.", vars: { a: "1", b: "2" }, names: [{ name: "a", to: "one" }, { name: "b", to: "two" }], values: [{ id: "one", text: "1" }, { id: "two", text: "2" }] },
    { line: 3, now: "<b>Right side first.</b> <code>b, a</code> makes a tuple of the current values: <b>(2, 1)</b>. Nothing has moved yet.",
      names: [{ name: "a", to: "one" }, { name: "b", to: "two" }], values: [{ id: "one", text: "1" }, { id: "two", text: "2" }, { id: "t", text: "(2, 1)", sub: "a tuple", tone: "cmp" }] },
    { line: 3, now: "<b>Then unpack</b>, left to right: the first item goes to <code>a</code>, the second to <code>b</code>. Swapped, with no helper variable.", vars: { a: "2", b: "1" },
      names: [{ name: "a", to: "two", tone: "cmp" }, { name: "b", to: "one", tone: "cmp" }], values: [{ id: "one", text: "1" }, { id: "two", text: "2" }, { id: "t", text: "(2, 1)", sub: "used up", faded: true }] },
    { line: 4, now: "Print both.", print: "2 1", names: [{ name: "a", to: "two" }, { name: "b", to: "one" }], values: [{ id: "one", text: "1" }, { id: "two", text: "2" }, { id: "t", text: "(2, 1)", faded: true }] },
  ];

  // --- stepper data: enumerate ---
  function enumSteps() {
    const g = ["milk", "eggs", "bread"];
    const S = [{ line: 1, now: "A list of 3 items.", vars: { groceries: "['milk', 'eggs', 'bread']" }, cur: -1 }];
    g.forEach((x, i) => {
      S.push({ line: 2, now: `<code>enumerate</code> hands back the tuple <b>(${i}, '${x}')</b>. Unpacking: <code>position = ${i}</code>, <code>item = '${x}'</code>.`, vars: { groceries: "[…]", position: String(i), item: q(x) }, cur: i, tup: `(${i}, '${x}')` });
      S.push({ line: 3, now: `Print ${i} and ${x}.`, print: `${i} ${x}`, cur: i, tup: `(${i}, '${x}')` });
    });
    S.push({ line: 2, now: "No more items. The loop is over.", cur: -1, tup: null, done: true });
    return S;
  }
  const enumVisual = (el, st) => {
    const marks = {}, ptrs = {};
    if (st.cur >= 0) { marks[st.cur] = "held"; ptrs[st.cur] = "item"; }
    el.append(D.array(["milk", "eggs", "bread"], { name: "groceries", quote: true, marks, ptrs }),
      h("p", { class: "small", style: "margin:8px 0 0", html: st.tup ? `enumerate gives <code>${esc(st.tup)}</code> → <code>position, item</code>` : (st.done ? "Done." : "enumerate(groceries) will give (0, 'milk'), (1, 'eggs'), (2, 'bread').") }));
  };

  // --- stepper data: zip(a, a[1:]) neighbour sums (Exercise 3 Q2) ---
  const ZA = [7, 5, 6, 45, 23, 1, 4, 90];
  function zipSteps() {
    const S = [
      { line: 1, now: "Exercise 3 Q2: add every number to the one after it.", vars: { a: "[7, 5, 6, 45, 23, 1, 4, 90]" }, cur: -1, sums: [] },
      { line: 2, now: "An empty list for the answers.", vars: { a: "[…]", sums: "[]" }, cur: -1, sums: [] },
    ];
    const sums = [];
    for (let i = 0; i < ZA.length - 1; i++) {
      const x = ZA[i], y = ZA[i + 1];
      S.push({ line: 3, now: `zip pairs item ${i} of <code>a</code> with item ${i} of <code>a[1:]</code>: <b>(${x}, ${y})</b>. So <code>x = ${x}</code>, <code>y = ${y}</code>.`, vars: { a: "[…]", sums: pyrepr(sums), x: String(x), y: String(y) }, cur: i, sums: sums.slice() });
      sums.push(x + y);
      S.push({ line: 4, now: `${x} + ${y} = <b>${x + y}</b>. Append it.`, vars: { a: "[…]", sums: pyrepr(sums), x: String(x), y: String(y) }, cur: i, sums: sums.slice() });
    }
    S.push({ line: 3, now: "<code>a[1:]</code> has run out (it is one shorter). <b>zip stops at the shorter list</b>, so there is no error and no half pair.", cur: 7, sums: sums.slice() });
    S.push({ line: 5, now: "7 sums from 8 numbers.", print: pyrepr(sums), cur: 8, sums: sums.slice() });
    return S;
  }
  const zipVisual = (el, st) => {
    const m1 = {}, m2 = {}, p1 = {}, p2 = {};
    if (st.cur >= 0 && st.cur < 7) { m1[st.cur] = "held"; p1[st.cur] = "x"; m2[st.cur] = "cmp"; p2[st.cur] = "y"; }
    for (let i = 0; i < Math.min(st.cur, 7); i++) { m1[i] = "done"; m2[i] = "done"; }
    if (st.cur === 7) { m1[7] = "dim"; p1[7] = "no partner"; }
    el.append(D.array(ZA, { name: "a", marks: m1, ptrs: p1 }),
      h("div", { style: "margin-top:6px" }, D.array(ZA.slice(1), { name: "a[1:]", marks: m2, ptrs: p2 })),
      h("div", { style: "margin-top:10px" }, D.array(st.sums, { name: "sums", emptyText: "[ ]  (empty)" })));
  };

  const tuples = {
    id: "tuples",
    title: "Tuples & unpacking",
    summary: "Tuples are lists that cannot change. Unpack them into names, and walk lists with <code>enumerate()</code> and <code>zip()</code>.",
    sources: "NB §13.6, 14; L3 p10",
    blocks: [
      { type: "h", text: "A tuple: round brackets, fixed for ever" },
      `<p>Indexing and slicing work like a list. But a tuple is <b>immutable</b>, like a string: no <code>.append()</code>, no changing an item.</p>`,
      { type: "table", head: ["Python", "Result", "Why"], code: [0], rows: [
        ["point = (10, 20)", "", "a tuple of 2 items"],
        ["point[0]", "<code>10</code>", "indexing like a list"],
        ["point[0:2]", "<code>(10, 20)</code>", "a slice of a tuple is a tuple"],
        ["point[0] = 5", "<span class='bad'>TypeError</span>", "'tuple' object does not support item assignment"],
        ["point.append(30)", "<span class='bad'>AttributeError</span>", "a tuple has no .append()"],
        ["list(point)", "<code>[10, 20]</code>", "cast to a list"],
        ["tuple(['a', 'b'])", "<code>('a', 'b')</code>", "cast to a tuple"],
      ] },
      { type: "callout", kind: "rule", title: "One item needs a comma", html: "<p><code>(5)</code> is just the number 5 in brackets. <code>(5,)</code> is a tuple with one item. The comma makes the tuple, not the brackets.</p>" },
      { type: "table", caption: "Why use something that can do less?", head: ["Use", "Tiny example"], code: [1], rows: [
        ["a record that should not change", "point = (10, 20)"],
        ["a dictionary key (a list is not allowed)", "cities = {(55.7, 12.6): 'Copenhagen'}"],
        ["give back two values from a function", "return evens, odds     # one tuple"],
      ] },

      { type: "h", text: "Unpacking: one tuple → several names" },
      { type: "table", head: ["Python", "Result"], code: [0, 1], rows: [
        ["x, y = (10, 20)", "x = 10, y = 20"],
        ["evens, odds = split_even_odd(numbers)", "a function gave back a tuple of 2"],
        ["x, y = (1, 2, 3)", "ValueError: too many values to unpack (expected 2)"],
      ] },
      {
        type: "stepper",
        title: "Swap two values in one line",
        code: `
          a = 1
          b = 2
          a, b = b, a
          print(a, b)`,
        what: {
          1: "a points at 1.",
          2: "b points at 2.",
          3: "Right side first: build the tuple (b, a). Then unpack it into a and b.",
          4: "Show both.",
        },
        steps: swapSteps,
        visualTitle: "Names (left) point at values (right)",
        visual: (el, st) => el.appendChild(st.names.length ? D.bindings({ names: st.names, values: st.values, w: 320, nameW: 70 }) : h("p", { class: "novars" }, "No names yet.")),
      },

      { type: "h", text: "enumerate() and zip(): loops that hand you tuples" },
      { type: "table", head: ["Tool", "Each round gives", "Tiny example"], code: [2], rows: [
        ["<code>enumerate(L)</code>", "(position, item)", "list(enumerate(['milk', 'eggs']))   # [(0, 'milk'), (1, 'eggs')]"],
        ["<code>zip(A, B)</code>", "(item of A, item of B)", "list(zip([1, 2, 3], ['a', 'b']))   # [(1, 'a'), (2, 'b')]"],
        ["<code>zip(a, a[1:])</code>", "(item, the next item)", "list(zip([7, 5, 6], [5, 6]))       # [(7, 5), (5, 6)]"],
      ] },
      { type: "switch", label: "enumerate or zip", items: [
        { label: "enumerate", blocks: [{
          type: "stepper",
          title: "Position and item",
          code: `
            groceries = ['milk', 'eggs', 'bread']
            for position, item in enumerate(groceries):
                print(position, item)`,
          what: { 1: "The list.", 2: "Each round, enumerate hands back (position, item). Two names unpack it.", 3: "Print both." },
          steps: enumSteps(),
          visualTitle: "The list",
          visual: enumVisual,
        }] },
        { label: "zip (neighbours)", blocks: [{
          type: "stepper",
          title: "Exercise 3 Q2: sums of neighbours",
          code: `
            a = [7, 5, 6, 45, 23, 1, 4, 90]
            sums = []
            for x, y in zip(a, a[1:]):
                sums.append(x + y)
            print(sums)`,
          what: { 1: "The numbers.", 2: "Start with an empty answer list.", 3: "a[1:] is a without its first item. zip pairs each item with the next one.", 4: "Add the pair and keep the sum.", 5: "After the loop." },
          steps: zipSteps(),
          visualTitle: "Two lists, side by side",
          legend: [["held", "x"], ["cmp", "y (the next one)"], ["done", "used"]],
          visual: zipVisual,
        }] },
      ] },
      `<p>The whole Q2 loop as a comprehension: <code>[x + y for x, y in zip(a, a[1:])]</code>.</p>`,
      {
        type: "tryit",
        title: "Tuples, unpacking, enumerate, zip",
        code: `
          point = (10, 20)
          x, y = point                       # unpack the tuple
          print(x, y)

          names = ['Sine', 'Bo']
          cities = ['Copenhagen', 'Aarhus']
          for name, city in zip(names, cities):
              print(name, 'lives in', city)

          for position, name in enumerate(names, start=1):   # count from 1
              print(position, name)

          a = [7, 5, 6, 45, 23, 1, 4, 90]
          print([x + y for x, y in zip(a, a[1:])])`,
      },
      { type: "mistakes", items: [
        { title: "Changing a tuple", wrong: "point = (10, 20)\npoint[0] = 15", right: "point = (10, 20)\npoint = (15, point[1])   # build a new one", why: "<code>TypeError: 'tuple' object does not support item assignment</code>." },
        { title: "Forgetting the comma in a one-item tuple", wrong: "t = (5)\ntype(t)    # int", right: "t = (5,)\ntype(t)    # tuple", why: "The comma makes a tuple. Brackets alone just group." },
        { title: "Wrong number of names when unpacking", wrong: "x, y = (1, 2, 3)", right: "x, y, z = (1, 2, 3)", why: "<code>ValueError: too many values to unpack (expected 2)</code>." },
        { title: "A list as a dictionary key", wrong: "d = {[55.7, 12.6]: 'Copenhagen'}", right: "d = {(55.7, 12.6): 'Copenhagen'}", why: "Keys must not be able to change. <code>TypeError: unhashable type: 'list'</code>." },
        { title: "Expecting zip to warn you", wrong: "list(zip([1, 2, 3], ['a', 'b']))\n# the 3 silently disappears", right: "len([1, 2, 3]) == len(['a', 'b'])   # check first", why: "zip stops at the shorter list, without an error." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "a, b = 1, 2\na, b = b, a + b\nprint(a, b)", answer: "2 3",
        hint: "The whole right side is worked out first, with the <b>old</b> a and b.", explain: "Right side: <code>b</code> is 2, <code>a + b</code> is 1 + 2 = 3. Then a = 2 and b = 3." },
      { type: "predict", q: "What does this print?", code: "print(list(zip([1, 2, 3], ['a', 'b'])))", answer: "[(1, 'a'), (2, 'b')]",
        hint: "zip makes pairs. What happens when one list runs out?", explain: "zip stops at the shorter list, so 3 has no partner and is left out." },
      { type: "mc", q: "What is <code>type((5))</code>?", options: ["<code>int</code>", "<code>tuple</code>", "<code>list</code>", "An error"], answer: 0,
        hint: "What makes a tuple: the brackets or the comma?", explain: "<code>(5)</code> is the number 5 in brackets. <code>(5,)</code> would be a tuple." },
      { type: "bug", q: "This should print <code>(15, 20)</code>. Click the line that crashes.", code: "point = (10, 20)\npoint[0] = 15\nprint(point)",
        bugs: [2], notes: { 2: "tuples are immutable: TypeError: 'tuple' object does not support item assignment" },
        fixed: "point = (10, 20)\npoint = (15, point[1])    # build a new tuple\nprint(point)",
        hint: "Which line tries to change a tuple in place?", explain: "A runtime error: line 1 runs, then line 2 crashes." },
      { type: "predict", q: "What does this print?", code: "for i, ch in enumerate('hey'):\n    print(i, ch)", answer: "0 h\n1 e\n2 y",
        hint: "enumerate works on a string too. It counts from 0.", explain: "Each round gives (position, character): (0, 'h'), (1, 'e'), (2, 'y')." },
      { type: "write", q: "Exercise 3 Q2. Write <code>neighbour_sums(a)</code>: it <b>returns</b> a list with each number added to the next one. <code>neighbour_sums([7, 5, 6])</code> is <code>[12, 11]</code>.",
        starter: `
          def neighbour_sums(a):
              # use zip(a, a[1:])
              pass

          print(neighbour_sums([7, 5, 6, 45, 23, 1, 4, 90]))`,
        checks: [["neighbour_sums([7, 5, 6])", "[12, 11]"], ["neighbour_sums([7, 5, 6, 45, 23, 1, 4, 90])", "[12, 11, 51, 68, 24, 5, 94]"], ["neighbour_sums([4])", "[]"]],
        solution: `
          def neighbour_sums(a):
              return [x + y for x, y in zip(a, a[1:])]    # each item with the next one`,
        hint: "<code>zip(a, a[1:])</code> gives the pairs (7, 5), (5, 6) … Add each pair.",
        explain: "With one item, <code>a[1:]</code> is empty, so zip gives no pairs and the answer is <code>[]</code>." },
    ],
  };

  /* ================================================================
     TOPIC 3: Dicts & counting
     ================================================================ */

  // --- widget: look things up in a dictionary ---
  const PERSON = [["name", "Ana"], ["job", "analyst"], ["city", "Copenhagen"]];
  function lookupWidget(el) {
    const KEYS = ["'job'", "'city'", "'analyst'", "0", "'zebra'"];
    const OPS = ["person[k]", "person.get(k)", "person.get(k, 0)", "k in person", "k in person.values()"];
    let ki = 0, oi = 0;
    const kseg = segOf(KEYS, "Pick k", i => { ki = i; draw(); });
    const oseg = segOf(OPS, "Pick what to do", i => { oi = i; draw(); });
    kseg.classList.add("mono"); oseg.classList.add("mono");
    const tbl = h("div"), res = h("div", { class: "data-gave", "aria-live": "polite" });
    function draw() {
      press(kseg, ki); press(oseg, oi);
      const kTxt = KEYS[ki], kRaw = kTxt.replace(/'/g, "");
      const hitKey = PERSON.findIndex(p => p[0] === kRaw && kTxt !== "0");
      const hitVal = PERSON.findIndex(p => p[1] === kRaw);
      const expr = OPS[oi].replace("k", kTxt);
      let out, cls = "data-ok", why, hl = -1, col = 0;
      if (oi === 0) {
        if (hitKey >= 0) { out = q(PERSON[hitKey][1]); why = "Found the key, so you get its value."; hl = hitKey; }
        else { out = "KeyError: " + kTxt; cls = "data-bad"; why = kTxt === "0" ? "A dictionary has no positions. <code>person[0]</code> looks for a <b>key</b> called 0, and there is none." : kRaw === "analyst" ? "'analyst' is a <b>value</b>, not a key. Square brackets only look at keys." : "No such key, so Python crashes."; }
      } else if (oi === 1 || oi === 2) {
        if (hitKey >= 0) { out = q(PERSON[hitKey][1]); why = "Found, so <code>.get</code> works just like square brackets."; hl = hitKey; }
        else { out = oi === 1 ? "None" : "0"; cls = "data-ok"; why = oi === 1 ? "Not a key. <code>.get</code> does <b>not</b> crash: it gives back None." : "Not a key, so you get the default you gave: 0. This is the counting trick."; }
      } else if (oi === 3) {
        out = hitKey >= 0 ? "True" : "False"; why = "<code>in</code> on a dictionary only checks the <b>keys</b>." + (hitVal >= 0 ? " 'analyst' is a value, so this is False!" : ""); hl = hitKey;
      } else {
        out = hitVal >= 0 ? "True" : "False"; why = "<code>.values()</code> searches the values instead."; hl = hitVal; col = 1;
      }
      tbl.replaceChildren(h("table", { class: "tbl data-dtbl" },
        h("thead", null, h("tr", null, h("th", null, "key"), h("th", null, "value"))),
        h("tbody", null, PERSON.map(([k, v], i) => h("tr", null,
          h("td", { class: "mono" + (i === hl && col === 0 ? " data-hit" : "") }, q(k)),
          h("td", { class: "mono" + (i === hl && (col === 1 || oi < 3) ? " data-hit" : "") }, q(v)))))));
      res.innerHTML = `<p><code>${esc(expr)}</code> → <code class="${cls}">${esc(out)}</code></p><p class="small" style="margin:4px 0 0">${why}</p>`;
    }
    el.append(h("p", { class: "small muted", style: "margin:0 0 6px" }, "1. Pick k"), kseg,
      h("p", { class: "small muted", style: "margin:12px 0 6px" }, "2. Pick what to do"), oseg,
      h("div", { class: "data-two", style: "margin-top:12px" }, h("div", null, eyebrow("person", "margin:0 0 6px"), tbl), res));
    draw();
  }

  // --- stepper data: the counting pattern ---
  const SENT = "the fox and the dog and the cat";
  function countSteps() {
    const words = SENT.split(" ");
    const counts = [];
    const snap = () => counts.map(c => c.slice());
    const repr = () => dictRepr(counts);
    const S = [{ line: 1, now: "Start with an <b>empty</b> dictionary: no buckets yet.", vars: { word_counts: "{}" }, cur: -1, counts: [], hot: null }];
    words.forEach((w, i) => {
      S.push({ line: 2, now: `Next word: <b>word = '${w}'</b>.`, vars: { word_counts: repr(), word: q(w) }, cur: i, counts: snap(), hot: null });
      const e = counts.find(c => c[0] === w), old = e ? e[1] : 0;
      if (e) e[1]++; else counts.push([w, 1]);
      S.push({ line: 3, now: e
        ? `'${w}' is already a key. <code>word_counts.get('${w}', 0)</code> gives <b>${old}</b>. ${old} + 1 = <b>${old + 1}</b>.`
        : `'${w}' is not a key yet. <code>word_counts.get('${w}', 0)</code> gives the default <b>0</b>. 0 + 1 = <b>1</b>: a new bucket.`,
        vars: { word_counts: repr(), word: q(w) }, cur: i, counts: snap(), hot: w, isNew: !e });
    });
    S.push({ line: 4, now: "After the loop. Keys keep the order they were <b>first added</b>.", print: repr(), cur: -1, counts: snap(), hot: null, end: true });
    return S;
  }
  function buckets(counts, hot, isNew, keyFmt) {
    const wrap = h("div", { class: "data-buckets" });
    if (!counts.length) wrap.append(h("span", { class: "novars" }, "{ }  (no keys yet)"));
    counts.forEach(([k, n]) => wrap.append(h("div", { class: "data-bucket" + (k === hot ? (isNew ? " data-new" : " data-bump") : "") },
      h("span", { class: "data-bk" }, keyFmt ? keyFmt(k) : q(k)), h("span", { class: "data-bv" }, String(n)),
      k === hot ? h("span", { class: "data-btag" }, isNew ? "new key" : "+") : null)));
    return wrap;
  }
  const countVisual = (el, st) => {
    const words = SENT.split(" "), marks = {}, ptrs = {};
    words.forEach((_, i) => { if (i < st.cur || st.end) marks[i] = "done"; });
    if (st.cur >= 0) { marks[st.cur] = "held"; ptrs[st.cur] = "word"; }
    el.append(D.array(words, { quote: true, marks, ptrs, index: false }), eyebrow("word_counts: one bucket per key"), buckets(st.counts, st.hot, st.isNew));
  };

  // --- stepper data: likes per year (list of dicts, A1 pattern) ---
  const POSTS = [[2021, 10], [2022, 3], [2021, 7]];
  function yearSteps() {
    const acc = [];
    const snap = () => acc.map(c => c.slice());
    const S = [
      { line: 1, now: "A list of 3 dicts: one dict per post, like the rows of a table.", vars: { posts: "[…]" }, cur: -1, acc: [], hot: null },
      { line: 5, now: "An empty dict. Keys will be years, values the total likes.", vars: { posts: "[…]", likes_by_year: "{}" }, cur: -1, acc: [], hot: null },
    ];
    POSTS.forEach(([y, l], i) => {
      S.push({ line: 6, now: `<code>post</code> is row ${i}: <code>{'year': ${y}, 'likes': ${l}}</code>.`, vars: { posts: "[…]", likes_by_year: dictRepr(acc), post: `{'year': ${y}, 'likes': ${l}}` }, cur: i, acc: snap(), hot: null });
      S.push({ line: 7, now: `<code>year = post['year']</code> = <b>${y}</b>. This is the <b>label</b> of the bucket.`, vars: { posts: "[…]", likes_by_year: dictRepr(acc), post: "{…}", year: String(y) }, cur: i, acc: snap(), hot: null, look: "year" });
      const e = acc.find(c => c[0] === y), old = e ? e[1] : 0;
      if (e) e[1] += l; else acc.push([y, l]);
      S.push({ line: 8, now: `<code>.get(${y}, 0)</code> gives ${old}. Add the <b>contents</b> <code>post['likes']</code> = ${l}: ${old} + ${l} = <b>${old + l}</b>.`, vars: { posts: "[…]", likes_by_year: dictRepr(acc), post: "{…}", year: String(y) }, cur: i, acc: snap(), hot: y, isNew: !e, look: "likes" });
    });
    S.push({ line: 9, now: "2021 got 10 + 7 = 17. 2022 got 3.", print: dictRepr(acc), cur: -1, acc: snap(), hot: null });
    return S;
  }
  const yearVisual = (el, st) => {
    el.append(h("table", { class: "tbl data-rows" },
      h("thead", null, h("tr", null, h("th", null, "row"), h("th", null, "'year'"), h("th", null, "'likes'"))),
      h("tbody", null, POSTS.map(([y, l], i) => h("tr", { class: i === st.cur ? "data-currow" : "" },
        h("td", null, String(i)),
        h("td", { class: "mono" + (i === st.cur && st.look === "year" ? " data-hit" : "") }, String(y)),
        h("td", { class: "mono" + (i === st.cur && st.look === "likes" ? " data-hit" : "") }, String(l)))))),
    eyebrow("likes_by_year"), buckets(st.acc, st.hot, st.isNew, k => String(k)));
  };

  const dicts = {
    id: "dicts",
    title: "Dicts & counting",
    summary: "Store values under keys, look them up, and count things with <code>d[k] = d.get(k, 0) + 1</code>.",
    exam: ["A1 count by year"],
    sources: "NB §15; L3 p11–14",
    blocks: [
      { type: "h", text: "A dictionary: values stored under keys" },
      `<p>Curly brackets, <code>key: value</code> pairs. You look things up by <b>key</b>, never by position.</p>`,
      { type: "code", code: `
          person = {'name': 'Ana',
                    'job': 'analyst',
                    'city': 'Copenhagen'}` },
      { type: "table", head: ["Python", "Result", "Why"], code: [0], rows: [
        ["person['job']", "<code>'analyst'</code>", "look up by key"],
        ["person[0]", "<span class='bad'>KeyError: 0</span>", "there is no key 0. No positions!"],
        ["person['age'] = 29", "adds a pair", "a new key: add it"],
        ["person['city'] = 'Aarhus'", "overwrites", "an old key: replace its value"],
        ["del person['age']", "removes a pair", "by key"],
        ["len(person)", "<code>3</code>", "how many pairs"],
      ] },
      { type: "h", text: "Looking up, safely", sub: "Pick a key and a way to look. in checks keys only." },
      { type: "widget", render: lookupWidget },

      { type: "h", text: "The counting pattern", sub: "The most useful 3 lines in this course" },
      {
        type: "stepper",
        title: "Count words into a dictionary",
        code: `
          word_counts = {}
          for word in "the fox and the dog and the cat".split():
              word_counts[word] = word_counts.get(word, 0) + 1
          print(word_counts)`,
        what: {
          1: "The empty dictionary. It must exist BEFORE the loop.",
          2: ".split() cuts the sentence into a list of words. One word per round.",
          3: "Look up the old count (0 if the word is new), add 1, store it back under the same key.",
          4: "After the loop: show the counts.",
        },
        steps: countSteps(),
        visualTitle: "Words and buckets",
        legend: [["held", "word now"], ["done", "already counted"]],
        visual: countVisual,
      },
      { type: "switch", label: "Two ways to count", items: [
        { label: "with .get (short)", render: paneCode(`
            word_counts = {}
            for word in words:
                word_counts[word] = word_counts.get(word, 0) + 1   # 0 if new`) },
        { label: "with if / else (long)", render: paneCode(`
            word_counts = {}
            for word in words:
                if word in word_counts:        # seen it before
                    word_counts[word] += 1
                else:                          # first time
                    word_counts[word] = 1`) },
      ] },
      { type: "h", text: "Looping over a dictionary", sub: "word_counts = {'the': 3, 'fox': 1}" },
      { type: "table", head: ["Loop", "Each round gives", "Tiny example"], code: [0, 2], rows: [
        ["for word in word_counts:", "the keys", "'the', then 'fox'"],
        ["for n in word_counts.values():", "the values", "3, then 1"],
        ["for word, n in word_counts.items():", "(key, value) tuples, unpacked", "('the', 3), then ('fox', 1)"],
      ] },
      { type: "code", caption: "Most common first (Exercise 3 bonus): sort the pairs by their count, pair[1]", code: `
          top = sorted(word_counts.items(),
                       key=lambda pair: pair[1],   # sort by the count
                       reverse=True)               # biggest first
          print(top)                               # [('the', 3), ('fox', 1)]` },

      { type: "h", text: "A list of dicts → a dict per category", sub: "Assignment 1, Part 3: counts by year" },
      `<p>Each row of a table becomes one dict. Then you add things up per category. Watch the difference between the <b>label</b> (<code>year</code>, the key) and the <b>contents</b> (<code>post['likes']</code>, what you add).</p>`,
      {
        type: "stepper",
        title: "Likes per year",
        code: `
          posts = [{'year': 2021, 'likes': 10},
                   {'year': 2022, 'likes': 3},
                   {'year': 2021, 'likes': 7}]

          likes_by_year = {}
          for post in posts:
              year = post['year']
              likes_by_year[year] = likes_by_year.get(year, 0) + post['likes']
          print(likes_by_year)`,
        what: {
          1: "A list of dicts: one dict per post.",
          5: "The result dict, empty, before the loop.",
          6: "post is one whole dict per round.",
          7: "The key: which bucket this post goes in.",
          8: "Old total for that year (0 if new) plus this post's likes.",
          9: "After the loop.",
        },
        steps: yearSteps(),
        visualTitle: "Rows and buckets",
        visual: yearVisual,
      },
      {
        type: "tryit",
        title: "Count words",
        task: "Run it. Then change the sentence, or count letters instead: loop over <code>sentence</code> without <code>.split()</code>.",
        code: `
          sentence = "the quick brown fox jumps over the lazy dog the fox runs"

          word_counts = {}
          for word in sentence.split():
              word_counts[word] = word_counts.get(word, 0) + 1

          print(word_counts)
          print(word_counts['the'], word_counts.get('zebra', 0))

          top = sorted(word_counts.items(), key=lambda pair: pair[1], reverse=True)
          print(top[:2])                       # the two most common`,
      },
      {
        type: "tryit",
        title: "Assignment 1 style: tweets per year",
        task: "Write the loop so it prints <code>{'2019': 2, '2020': 1}</code>. The year is the first 4 characters of <code>created_at</code>.",
        code: `
          tweets = [{'text': 'Rocket test', 'created_at': '2019-03-02'},
                    {'text': 'Launch!', 'created_at': '2019-07-14'},
                    {'text': 'Python lab', 'created_at': '2020-01-09'}]

          tweets_by_year = {}
          # your loop here

          print(tweets_by_year)`,
        expectOutput: "{'2019': 2, '2020': 1}",
        hint: "<code>year = tweet['created_at'][:4]</code>, then the counting line with <code>+ 1</code>.",
        solution: `
          tweets = [{'text': 'Rocket test', 'created_at': '2019-03-02'},
                    {'text': 'Launch!', 'created_at': '2019-07-14'},
                    {'text': 'Python lab', 'created_at': '2020-01-09'}]

          tweets_by_year = {}
          for tweet in tweets:
              year = tweet['created_at'][:4]                          # the label: '2019'
              tweets_by_year[year] = tweets_by_year.get(year, 0) + 1  # count one tweet

          print(tweets_by_year)`,
        solutionNote: "Use <code>int(tweet['created_at'][:4])</code> if you want the keys to be numbers (then it prints <code>{2019: 2, 2020: 1}</code>).",
      },
      { type: "mistakes", items: [
        { title: "<code>+= 1</code> on a key that is not there yet", wrong: "counts = {}\ncounts['the'] += 1", right: "counts = {}\ncounts['the'] = counts.get('the', 0) + 1", why: "<code>KeyError: 'the'</code>: there is no old value to add 1 to." },
        { title: "Looking up by position", wrong: "person[0]", right: "person['name']", why: "A dict has no positions: <code>KeyError: 0</code>." },
        { title: "Expecting <code>in</code> to search the values", wrong: "'analyst' in person      # False", right: "'analyst' in person.values()   # True", why: "<code>in</code> on a dict only checks keys." },
        { title: "Reusing the dict's name as the loop variable", wrong: "word_counts = {}\nfor word_counts in text.split():\n    ...", right: "word_counts = {}\nfor word in text.split():\n    ...", why: "The loop sticks the name on each word, so your dict is lost." },
        { title: "Adding the label instead of the contents", wrong: "totals[year] = totals.get(year, 0) + year", right: "totals[year] = totals.get(year, 0) + post['likes']", why: "<code>year</code> says <b>which</b> bucket. <code>post['likes']</code> is <b>what</b> goes in it." },
        { title: "<code>.get()</code> without a default, then maths", wrong: "counts[w] = counts.get(w) + 1", right: "counts[w] = counts.get(w, 0) + 1", why: "A new word gives None, and <code>None + 1</code> is a TypeError." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "counts = {}\nfor ch in 'banana':\n    counts[ch] = counts.get(ch, 0) + 1\nprint(counts)", answer: "{'b': 1, 'a': 3, 'n': 2}",
        hint: "Keys appear in the order they are first seen: b, a, n.", explain: "b once, a three times, n twice. Keys keep the order they were added." },
      { type: "mc", q: "<code>person = {'name': 'Ana', 'job': 'analyst'}</code>. What is <code>'analyst' in person</code>?", options: ["<code>True</code>", "<code>False</code>", "KeyError", "<code>'job'</code>"], answer: 1,
        hint: "What does <code>in</code> look at in a dictionary?", explain: "<code>in</code> checks the keys only. 'analyst' is a value. Use <code>person.values()</code> to search values." },
      { type: "predict", q: "What does this print?", code: "person = {'name': 'Ana', 'job': 'analyst'}\nprint(person.get('age', 30), len(person))", answer: "30 2",
        hint: "Is 'age' a key? What does .get do when it is not?", explain: "'age' is not a key, so .get gives the default 30. It does <b>not</b> add the key, so there are still 2 pairs." },
      { type: "bug", q: "This should count the words. Click the line that crashes.", code: `
          word_counts = {}
          for word in 'to be or not to be'.split():
              word_counts[word] += 1
          print(word_counts)`,
        bugs: [3], notes: { 3: "KeyError: 'to': the first time, the key does not exist yet" },
        fixed: `
          word_counts = {}
          for word in 'to be or not to be'.split():
              word_counts[word] = word_counts.get(word, 0) + 1
          print(word_counts)`,
        hint: "What is <code>word_counts['to']</code> in the very first round?", explain: "<code>+= 1</code> needs an old value. <code>.get(word, 0)</code> supplies 0 for new words." },
      { type: "write", q: "Write <code>count_words(text)</code>: it <b>returns</b> a dictionary with how often each word appears. <code>count_words('a b a')</code> is <code>{'a': 2, 'b': 1}</code>.",
        starter: `
          def count_words(text):
              counts = {}
              # your loop here

              return counts

          print(count_words("the fox and the dog"))`,
        checks: [["count_words('a b a')", "{'a': 2, 'b': 1}"], ["count_words('the fox and the dog')", "{'the': 2, 'fox': 1, 'and': 1, 'dog': 1}"], ["count_words('')", "{}"]],
        solution: `
          def count_words(text):
              counts = {}
              for word in text.split():                   # one word per round
                  counts[word] = counts.get(word, 0) + 1  # 0 if new, then add 1

              return counts                               # after the loop`,
        hint: "<code>for word in text.split():</code> and the <code>.get(word, 0) + 1</code> line.",
        explain: "<code>''.split()</code> is an empty list, so the loop never runs and you return <code>{}</code>." },
      { type: "write", q: "Assignment 1 style. Write <code>likes_by_year(posts)</code>: <code>posts</code> is a list of dicts with keys <code>'year'</code> and <code>'likes'</code>. <b>Return</b> a dict: year → total likes.",
        starter: `
          def likes_by_year(posts):
              totals = {}
              # your loop here

              return totals

          posts = [{'year': 2021, 'likes': 10}, {'year': 2022, 'likes': 3}, {'year': 2021, 'likes': 7}]
          print(likes_by_year(posts))`,
        checks: [["likes_by_year([{'year': 2021, 'likes': 10}, {'year': 2022, 'likes': 3}, {'year': 2021, 'likes': 7}])", "{2021: 17, 2022: 3}"], ["likes_by_year([])", "{}"], ["likes_by_year([{'year': 2020, 'likes': 0}])", "{2020: 0}"]],
        solution: `
          def likes_by_year(posts):
              totals = {}
              for post in posts:
                  year = post['year']                                  # the label
                  totals[year] = totals.get(year, 0) + post['likes']   # add the contents

              return totals`,
        hint: "Same as counting, but add <code>post['likes']</code> instead of 1.",
        explain: "This is the shape of every <code>count_*_by_year</code> function in Assignment 1." },
    ],
  };

  /* ================================================================
     TOPIC 4: Sets
     ================================================================ */

  // --- stepper data: set() drops duplicates ---
  const TAGS = ["python", "cbs", "python", "data", "cbs", "python"];
  function setSteps() {
    const seen = [];
    const S = [
      { line: 1, now: "6 hashtags, with repeats.", vars: { hashtags: "[…]" }, cur: -1, seen: [], hot: null },
      { line: 2, now: "An empty set. Careful: <code>set()</code>, not <code>{}</code>.", vars: { hashtags: "[…]", unique_tags: "set()" }, cur: -1, seen: [], hot: null },
    ];
    TAGS.forEach((t, i) => {
      S.push({ line: 3, now: `<code>tag = '${t}'</code>.`, vars: { hashtags: "[…]", unique_tags: seen.length ? "{" + seen.map(q).join(", ") + "}" : "set()", tag: q(t) }, cur: i, seen: seen.slice(), hot: null });
      const dup = seen.includes(t);
      if (!dup) seen.push(t);
      S.push({ line: 4, now: dup ? `'${t}' is already in the set. <code>.add</code> does <b>nothing</b>, and there is no error.` : `'${t}' is new: it goes in.`, vars: { hashtags: "[…]", unique_tags: "{" + seen.map(q).join(", ") + "}", tag: q(t) }, cur: i, seen: seen.slice(), hot: t, dup });
    });
    S.push({ line: 5, now: "6 items in the list, 3 in the set.", print: "6 3", cur: -1, seen: seen.slice(), hot: null, end: true });
    return S;
  }
  const setVisual = (el, st) => {
    const marks = {}, below = {};
    TAGS.forEach((t, i) => {
      const dup = TAGS.indexOf(t) < i;
      if (i < st.cur || (st.end)) { marks[i] = dup ? "dim" : "done"; below[i] = dup ? "repeat" : "added"; }
    });
    if (st.cur >= 0) { marks[st.cur] = st.dup ? "cmp" : "held"; below[st.cur] = "tag"; }
    const bag = h("div", { class: "data-setbag", "aria-label": "the set" });
    if (!st.seen.length) bag.append(h("span", { class: "novars" }, "set()  (empty)"));
    st.seen.forEach(t => bag.append(h("span", { class: "data-chip" + (t === st.hot ? (st.dup ? " data-bump" : " data-new") : "") }, q(t) + (t === st.hot && st.dup ? "  already here" : ""))));
    el.append(D.array(TAGS, { name: "hashtags", quote: true, marks, below }), eyebrow("unique_tags (a set: no order, no repeats)"), bag);
  };

  // --- widget: Venn diagram for set operations ---
  function vennWidget(el) {
    const ZONES = [["data", "coffee"], ["python", "cbs"], ["ml", "cycling"]];     // anand only, both, coen only
    const OPS = [
      { sym: "anand_tags | coen_tags", meth: "anand_tags.union(coen_tags)", words: "in <b>either</b> set (union)", keep: [1, 1, 1] },
      { sym: "anand_tags & coen_tags", meth: "anand_tags.intersection(coen_tags)", words: "in <b>both</b> (intersection): the tags they share", keep: [0, 1, 0] },
      { sym: "anand_tags - coen_tags", meth: "anand_tags.difference(coen_tags)", words: "in anand_tags but <b>not</b> in coen_tags", keep: [1, 0, 0] },
      { sym: "coen_tags - anand_tags", meth: "coen_tags.difference(anand_tags)", words: "in coen_tags but not in anand_tags. Order matters for <code>-</code>", keep: [0, 0, 1] },
      { sym: "anand_tags ^ coen_tags", meth: "anand_tags.symmetric_difference(coen_tags)", words: "in <b>exactly one</b> of them, not both", keep: [1, 0, 1] },
    ];
    let oi = 1;
    const seg = segOf(["|", "&", "a - b", "b - a", "^"], "Pick a set operation", i => { oi = i; draw(); });
    seg.classList.add("mono");
    const pic = h("div", { class: "data-venn" }), txt = h("div", { "aria-live": "polite" });
    const R = 90, CY = 125, AX = 150, BX = 250, HY = Math.sqrt(R * R - 50 * 50);
    const top = `200,${(CY - HY).toFixed(2)}`, bot = `200,${(CY + HY).toFixed(2)}`;
    const PATHS = [
      `M${top} A${R},${R} 0 1 0 ${bot} A${R},${R} 0 0 1 ${top} Z`,     // anand only
      `M${top} A${R},${R} 0 0 0 ${bot} A${R},${R} 0 0 0 ${top} Z`,     // both
      `M${top} A${R},${R} 0 1 1 ${bot} A${R},${R} 0 0 0 ${top} Z`,     // coen only
    ];
    const circ = (cx) => `M${cx - R},${CY} a${R},${R} 0 1,0 ${2 * R},0 a${R},${R} 0 1,0 ${-2 * R},0`;
    function draw() {
      press(seg, oi);
      const op = OPS[oi];
      const S = D.svg({ w: 400, h: 230, label: "Venn diagram of anand_tags and coen_tags" });
      PATHS.forEach((d, z) => S.path(d, { cls: "data-venn-r" + (op.keep[z] ? " on" : "") }));
      S.path(circ(AX), { tone: "accent" }); S.path(circ(BX), { tone: "accent" });
      S.text(AX - 30, 16, "anand_tags", { ui: true, weight: 600 });
      S.text(BX + 30, 16, "coen_tags", { ui: true, weight: 600 });
      const X = [105, 200, 295];
      ZONES.forEach((ws, z) => ws.forEach((w, j) => S.text(X[z], CY - 14 + j * 28, w, { cls: op.keep[z] ? "data-venn-in" : "data-venn-out" })));
      pic.replaceChildren(S.el);
      const res = ZONES.filter((_, z) => op.keep[z]).flat().sort();
      txt.innerHTML = `<p style="margin:0"><code>${esc(op.sym)}</code> → <code>{${esc(res.map(q).join(", "))}}</code></p>
        <p class="small" style="margin:6px 0 0">${op.words}. ${res.length} tag${res.length === 1 ? "" : "s"}.</p>
        <p class="small muted" style="margin:6px 0 0">Same as <code>${esc(op.meth)}</code>. Shown sorted; a real <code>print</code> may list them in any order.</p>`;
    }
    el.append(h("pre", { class: "st-out", style: "margin-bottom:10px" }, "anand_tags = {'python', 'cbs', 'data', 'coffee'}\ncoen_tags = {'python', 'ml', 'cbs', 'cycling'}"),
      seg, h("div", { class: "data-two", style: "margin-top:12px;align-items:center" }, pic, txt));
    draw();
  }

  const sets = {
    id: "sets",
    title: "Sets",
    summary: "A bag of items with no repeats and no order. Fast <code>in</code>, and union / intersection / difference.",
    exam: ["Q6 visited"],
    sources: "NB §26; L3 p36",
    blocks: [
      { type: "h", text: "A set: no repeats, no order" },
      { type: "table", head: ["Python", "Result", "Why"], code: [0], rows: [
        ["set(['python', 'cbs', 'python'])", "<code>{'python', 'cbs'}</code>", "repeats vanish (order may differ)"],
        ["len(set('banana'))", "<code>3</code>", "the different letters: b, a, n"],
        ["'cbs' in tags", "<code>True</code>", "fast, even for a huge set"],
        ["tags.add('ai')", "adds it", "already there? nothing happens"],
        ["tags.discard('zzz')", "no error", "silent if it is not there"],
        ["tags.remove('zzz')", "<span class='bad'>KeyError: 'zzz'</span>", "remove crashes if it is not there"],
        ["tags[0]", "<span class='bad'>TypeError</span>", "'set' object is not subscriptable: no positions"],
      ] },
      { type: "callout", kind: "warn", title: "{} is an empty dict, not a set", html: "<p><code>type({})</code> is <code>dict</code>. For an empty set write <code>set()</code>. <code>{'a', 'b'}</code> with items is a set.</p>" },
      {
        type: "stepper",
        title: "Throwing out repeats",
        code: `
          hashtags = ['python', 'cbs', 'python', 'data', 'cbs', 'python']
          unique_tags = set()
          for tag in hashtags:
              unique_tags.add(tag)
          print(len(hashtags), len(unique_tags))`,
        what: { 1: "A list with repeats.", 2: "An empty set.", 3: "One tag per round.", 4: "Put it in the bag. A repeat changes nothing.", 5: "Compare the sizes." },
        steps: setSteps(),
        visualTitle: "The list and the set",
        legend: [["held", "new tag"], ["cmp", "repeat"], ["done", "added"], ["dim", "ignored"]],
        visual: setVisual,
      },
      `<p>The whole stepper in one line: <code>unique_tags = set(hashtags)</code>.</p>`,

      { type: "h", text: "Set operations", sub: "Pick an operation. Shaded = in the result." },
      { type: "widget", render: vennWidget },
      { type: "table", head: ["Symbol", "Method", "Meaning", "Tiny example"], code: [0, 1, 3], rows: [
        ["a | b", "a.union(b)", "in either", "{1, 2} | {2, 3}   # {1, 2, 3}"],
        ["a & b", "a.intersection(b)", "in both", "{1, 2} & {2, 3}   # {2}"],
        ["a - b", "a.difference(b)", "in a, not in b", "{1, 2} - {2, 3}   # {1}"],
        ["a ^ b", "a.symmetric_difference(b)", "in exactly one", "{1, 2} ^ {2, 3}   # {1, 3}"],
      ] },

      { type: "h", text: "Fast in: the visited set", sub: "Exam Q6 keeps track of what it has already seen" },
      `<p><code>x in some_list</code> checks items one by one. <code>x in some_set</code> jumps straight to the answer. If you ask “have I seen this?” a lot, use a set. If you also need the <b>order</b>, keep a list too.</p>`,
      { type: "code", code: `
          order = []                     # the answer: the order we visited
          visited = set()                # fast "seen it already?" check

          for node in [0, 1, 0, 2, 1]:
              if node not in visited:
                  visited.add(node)
                  order.append(node)

          print(order)                   # [0, 1, 2]` },
      { type: "callout", kind: "exam", title: "Exam Q6", html: "<p>Q6 asks you to <b>return a list</b> of visited machine indices, in order. A set has no order, so return the list. In a tree there are no cycles, so the visited check is only a safety net; in a graph it stops you going round in circles.</p>" },
      {
        type: "tryit",
        title: "Sets playground",
        task: "Sets print in any order, so this code wraps them in <code>sorted()</code> to get a list in a fixed order.",
        code: `
          hashtags = ['python', 'cbs', 'python', 'data', 'cbs', 'python']
          unique_tags = set(hashtags)
          print(len(hashtags), len(unique_tags))

          anand_tags = {'python', 'cbs', 'data', 'coffee'}
          coen_tags = {'python', 'ml', 'cbs', 'cycling'}

          print(sorted(anand_tags | coen_tags))    # in either
          print(sorted(anand_tags & coen_tags))    # in both
          print(sorted(anand_tags - coen_tags))    # only Anand's
          print(sorted(anand_tags ^ coen_tags))    # in exactly one

          print(type({}), type(set()))             # careful!

          words = {w.lower() for w in 'The cat and THE dog and the bird'.split()}   # a set comprehension
          print(sorted(words))`,
      },
      { type: "mistakes", items: [
        { title: "<code>{}</code> for an empty set", wrong: "seen = {}\nseen.add(3)", right: "seen = set()\nseen.add(3)", why: "<code>{}</code> is a dict. <code>AttributeError: 'dict' object has no attribute 'add'</code>." },
        { title: "Indexing a set", wrong: "tags = {'a', 'b'}\ntags[0]", right: "tags = {'a', 'b'}\nsorted(tags)[0]", why: "A set has no positions: <code>TypeError: 'set' object is not subscriptable</code>." },
        { title: "Expecting a fixed order", wrong: "print({'python', 'cbs'})   # order can change", right: "print(sorted({'python', 'cbs'}))   # ['cbs', 'python']", why: "Sets have no order. Sort them before printing or comparing printouts." },
        { title: "Using a set when you need counts or order", wrong: "visited = set()   # and return visited", right: "order = []        # return the list\nvisited = set()   # only for checking", why: "A set forgets how many times and in which order. Q6 wants the order." },
        { title: "<code>.remove()</code> on something that is not there", wrong: "tags.remove('zzz')", right: "tags.discard('zzz')", why: "<code>.remove</code> raises <code>KeyError</code>; <code>.discard</code> stays silent." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "print(len(set([3, 1, 3, 2, 1, 3])))", answer: "3",
        hint: "Which different numbers are there?", explain: "The set is {1, 2, 3}: 3 items. Repeats vanish." },
      { type: "mc", q: "What is <code>type({})</code>?", options: ["<code>set</code>", "<code>dict</code>", "<code>tuple</code>", "<code>list</code>"], answer: 1,
        hint: "Curly brackets were used for dictionaries first.", explain: "<code>{}</code> is an empty dict. An empty set is <code>set()</code>." },
      { type: "predict", q: "What does this print?", code: "a = {1, 2, 3, 4}\nb = {3, 4, 5}\nprint(sorted(a & b), sorted(a - b))", answer: "[3, 4] [1, 2]",
        hint: "<code>&</code>: in both. <code>-</code>: in a but not in b.", explain: "Both have 3 and 4. Only a has 1 and 2. <code>sorted</code> turns each set into a sorted list." },
      { type: "predict", q: "What does this print?", code: "a = {1, 2, 3, 4}\nb = {3, 4, 5}\nprint(sorted(a ^ b))", answer: "[1, 2, 5]",
        hint: "<code>^</code> keeps the items in exactly one set.", explain: "3 and 4 are in both, so they go. 1 and 2 (only a) and 5 (only b) stay." },
      { type: "write", q: "Write <code>has_duplicates(items)</code>: it <b>returns</b> <code>True</code> if any item appears more than once, otherwise <code>False</code>.",
        starter: `
          def has_duplicates(items):
              # hint: compare two lengths
              pass

          print(has_duplicates([1, 2, 1]))`,
        checks: [["has_duplicates([1, 2, 1])", "True"], ["has_duplicates([1, 2, 3])", "False"], ["has_duplicates([])", "False"], ["has_duplicates(['cbs', 'python', 'cbs'])", "True"]],
        solution: `
          def has_duplicates(items):
              return len(set(items)) != len(items)    # the set lost some repeats`,
        hint: "A set drops repeats. If the set is shorter than the list, something was repeated.",
        explain: "No loop needed. A loop with a <code>seen</code> set also works: return True the moment you meet an item already in <code>seen</code>." },
      { type: "explain", q: "Exam Q6 style. In 2–3 sentences: a DFS keeps a <code>visited</code> set <b>and</b> an <code>order</code> list. Why both?",
        answer: "<p>The set answers “have I been here already?” quickly, because <code>in</code> on a set does not check items one by one. But a set has no order, and the task asks for the visit order, so the list records each node the moment it is visited. The list is what the function returns.</p>",
        points: ["set: fast membership check", "set has no order", "list keeps the visit order and is returned"],
        hint: "What is each one good at? What does the question ask you to return?" },
    ],
  };

  /* ================================================================
     TOPIC 5: Names, aliasing & copies
     ================================================================ */

  // --- stepper data: c = a is a second name ---
  const aliasSteps = (() => {
    const L = (t, tone) => ({ id: "A", text: t, tone });
    return [
      { line: 0, now: "Nothing yet. Press <b>Step</b>.", vars: {}, names: [], values: [] },
      { line: 1, now: "A list [1, 2, 3] gets the name <code>a</code>.", vars: { a: "[1, 2, 3]" }, names: [{ name: "a", to: "A" }], values: [L("[1, 2, 3]")] },
      { line: 2, now: "A <b>second</b> list that looks the same gets the name <code>b</code>. Two boxes.", vars: { a: "[1, 2, 3]", b: "[1, 2, 3]" },
        names: [{ name: "a", to: "A" }, { name: "b", to: "B" }], values: [L("[1, 2, 3]"), { id: "B", text: "[1, 2, 3]" }] },
      { line: 3, now: "<code>==</code> asks “same contents?”: <b>True</b>. <code>is</code> asks “the same box?”: <b>False</b>.", print: "True False",
        names: [{ name: "a", to: "A" }, { name: "b", to: "B" }], values: [L("[1, 2, 3]"), { id: "B", text: "[1, 2, 3]" }] },
      { line: 4, now: "<code>c = a</code> makes <b>no copy</b>. <code>c</code> is a second name tag on the <b>same</b> box. This is <b>aliasing</b>.", vars: { a: "[1, 2, 3]", b: "[1, 2, 3]", c: "[1, 2, 3]" },
        names: [{ name: "a", to: "A" }, { name: "b", to: "B" }, { name: "c", to: "A", tone: "cmp" }], values: [L("[1, 2, 3]"), { id: "B", text: "[1, 2, 3]" }] },
      { line: 5, now: "Change the list <b>through</b> <code>c</code>. There is only one box, so…", vars: { a: "[1, 2, 3, 4]", b: "[1, 2, 3]", c: "[1, 2, 3, 4]" },
        names: [{ name: "a", to: "A" }, { name: "b", to: "B" }, { name: "c", to: "A", tone: "cmp" }], values: [L("[1, 2, 3, 4]", "cmp"), { id: "B", text: "[1, 2, 3]" }] },
      { line: 6, now: "…<code>a</code> sees the 4 too.", print: "[1, 2, 3, 4]",
        names: [{ name: "a", to: "A", tone: "cmp" }, { name: "b", to: "B" }, { name: "c", to: "A" }], values: [L("[1, 2, 3, 4]"), { id: "B", text: "[1, 2, 3]" }] },
      { line: 7, now: "<code>b</code> is its own box, so it did not change.", print: "[1, 2, 3]",
        names: [{ name: "a", to: "A" }, { name: "b", to: "B", tone: "done" }, { name: "c", to: "A" }], values: [L("[1, 2, 3, 4]"), { id: "B", text: "[1, 2, 3]", tone: "done" }] },
    ];
  })();

  // --- stepper data: lists as arguments (mutate vs rebind) ---
  function argSteps() {
    const G = { my_transactions: "[200, 50, 30]", charge_fee: "<function>", reset_broken: "<function>" };
    const g = v => Object.assign({}, G, { my_transactions: v });
    const S = [
      { line: 1, now: "<code>def</code> only defines the function. Skip its body.", frames: [{ name: "global", vars: { charge_fee: "<function>" } }], names: [], values: [] },
      { line: 5, now: "Another definition.", frames: [{ name: "global", vars: { charge_fee: "<function>", reset_broken: "<function>" } }], names: [], values: [] },
      { line: 8, now: "The caller's list.", frames: [{ name: "global", vars: G }], names: [{ name: "my_transactions", to: "L" }], values: [{ id: "L", text: "[200, 50, 30]" }] },
      { line: 9, now: "The call. The parameter <code>transactions</code> becomes a <b>second name for the same list</b>. Nothing is copied.",
        frames: [{ name: "global", vars: G }, { name: "charge_fee(my_transactions, 5)", vars: { transactions: "[200, 50, 30]", fee: "5" } }],
        names: [{ name: "my_transactions", to: "L" }, { name: "transactions", to: "L", tone: "cmp" }], values: [{ id: "L", text: "[200, 50, 30]" }] },
    ];
    let t = [200, 50, 30];
    for (let i = 0; i < 3; i++) {
      S.push({ line: 2, now: `<b>i = ${i}</b>.`, frames: [{ name: "global", vars: g(pyrepr(t)) }, { name: "charge_fee(my_transactions, 5)", vars: { transactions: pyrepr(t), fee: "5", i: String(i) } }],
        names: [{ name: "my_transactions", to: "L" }, { name: "transactions", to: "L", tone: "cmp" }], values: [{ id: "L", text: pyrepr(t) }] });
      const old = t[i]; t = t.slice(); t[i] = old - 5;
      S.push({ line: 3, now: `${old} − 5 = <b>${t[i]}</b>, written <b>into</b> the list. This is a <b>mutation</b>: the caller's list changes too.`,
        frames: [{ name: "global", vars: g(pyrepr(t)) }, { name: "charge_fee(my_transactions, 5)", vars: { transactions: pyrepr(t), fee: "5", i: String(i) } }],
        names: [{ name: "my_transactions", to: "L" }, { name: "transactions", to: "L", tone: "cmp" }], values: [{ id: "L", text: pyrepr(t), tone: "cmp" }] });
    }
    const T = pyrepr(t);
    S.push({ line: 10, now: "The function is done; its local name is gone. But the list itself was changed.", print: T, frames: [{ name: "global", vars: g(T) }],
      names: [{ name: "my_transactions", to: "L" }], values: [{ id: "L", text: T }] });
    S.push({ line: 11, now: "Call <code>reset_broken</code>. Again <code>transactions</code> is a second name for the same list.",
      frames: [{ name: "global", vars: g(T) }, { name: "reset_broken(my_transactions)", vars: { transactions: T } }],
      names: [{ name: "my_transactions", to: "L" }, { name: "transactions", to: "L", tone: "cmp" }], values: [{ id: "L", text: T }] });
    S.push({ line: 6, now: "<code>transactions = []</code> is a <b>rebind</b>: the local name moves to a new, empty list. The caller's list is not touched.",
      frames: [{ name: "global", vars: g(T) }, { name: "reset_broken(my_transactions)", vars: { transactions: "[]" } }],
      names: [{ name: "my_transactions", to: "L" }, { name: "transactions", to: "E", tone: "swap" }], values: [{ id: "L", text: T }, { id: "E", text: "[]", tone: "swap" }] });
    S.push({ line: 12, now: "Unchanged. To really empty it, mutate it: <code>my_transactions.clear()</code>.", print: T, frames: [{ name: "global", vars: g(T) }],
      names: [{ name: "my_transactions", to: "L" }], values: [{ id: "L", text: T }, { id: "E", text: "[]", faded: true }] });
    return S;
  }

  // --- widget: alias vs shallow copy vs deep copy ---
  function copyWidget(el) {
    const MODES = [
      { label: "twin = original", code: "twin = original", kind: "alias", note: "No copy at all: one list, two names." },
      { label: "original[:]", code: "twin = original[:]", kind: "shallow", note: "A <b>shallow</b> copy: a new outer list, but the dicts inside are <b>shared</b>. Same as <code>list(original)</code>, <code>original.copy()</code>, <code>copy.copy(original)</code>." },
      { label: "copy.deepcopy", code: "twin = copy.deepcopy(original)", kind: "deep", note: "A <b>deep</b> copy: a new outer list <b>and</b> new dicts inside, all the way down." },
    ];
    const ACTS = [
      { label: "twin.append(…)", code: "twin.append({'text': 'new', 'likes': 0})" },
      { label: "twin[0]['likes'] = 999", code: "twin[0]['likes'] = 999" },
    ];
    let mi = 1, st;
    const mseg = segOf(MODES.map(m => m.label), "How twin is made", i => { mi = i; reset(); });
    mseg.classList.add("mono");
    const abtns = h("div", { class: "row-wrap", role: "group", "aria-label": "Change twin" });
    ACTS.forEach((a, i) => abtns.append(h("button", { type: "button", class: "btn small mono", onclick: () => act(i) }, a.label)));
    abtns.append(h("button", { type: "button", class: "btn small ghost", onclick: () => reset() }, "Reset"));
    const codeBox = h("div"), pic = h("div", { style: "margin-top:10px" }), outBox = h("div"), note = h("p", { class: "small", style: "margin:8px 0 0" });
    function reset() {
      const d0 = { id: 0, text: "hello", likes: 1 }, d1 = { id: 1, text: "world", likes: 2 };
      const orig = [d0, d1];
      const kind = MODES[mi].kind;
      let twin;
      if (kind === "alias") twin = orig;
      else if (kind === "shallow") twin = [d0, d1];
      else twin = [{ id: 2, text: "hello", likes: 1 }, { id: 3, text: "world", likes: 2 }];
      st = { orig, twin, lines: [], changed: null, added: null };
      draw();
    }
    function act(i) {
      st.lines.push(ACTS[i].code);
      if (i === 0) { const d = { id: 10 + st.lines.length, text: "new", likes: 0 }; st.twin.push(d); st.added = d.id; st.changed = null; }
      else { st.twin[0].likes = 999; st.changed = st.twin[0].id; st.added = null; }
      draw();
    }
    const dRepr = d => `{'text': '${d.text}', 'likes': ${d.likes}}`;
    const lRepr = L => "[" + L.map(dRepr).join(", ") + "]";
    function draw() {
      press(mseg, mi);
      const m = MODES[mi];
      codeBox.replaceChildren(ui.code({ code: ["import copy", "", "original = [{'text': 'hello', 'likes': 1},", "            {'text': 'world', 'likes': 2}]", m.code].concat(st.lines) }));
      // layout: names | lists | dicts
      const lists = st.orig === st.twin ? [st.orig] : [st.orig, st.twin];
      const dictsSeen = [];
      lists.forEach(L => L.forEach(d => { if (!dictsSeen.includes(d)) dictsSeen.push(d); }));
      const H = Math.max(230, dictsSeen.length * 52 + 16);
      const S = D.svg({ w: 480, h: H, label: "names, lists and dicts" });
      const dy = i => 8 + i * 52;
      const LX = 118, LW = 112, DX = 300, DW = 176;
      const ly = [];
      lists.forEach((L, i) => {
        const y = lists.length === 1 ? H / 2 - 22 : (i === 0 ? 30 : H - 74);
        ly.push(y + 22);
        S.box(LX, y, LW, 44, { text: "list", sub: L.length + " items", tone: i === 1 ? "min" : "accent" });
      });
      const nameY = [40, H - 64];
      S.box(4, nameY[0] - 18, 92, 36, { text: "original", rx: 18 });
      S.box(4, nameY[1] - 18, 92, 36, { text: "twin", rx: 18, tone: "cmp" });
      S.arrow(98, nameY[0], LX - 4, ly[0], { tone: "accent" });
      S.arrow(98, nameY[1], LX - 4, ly[lists.length - 1], { tone: "cmp" });
      dictsSeen.forEach((d, i) => {
        const tone = d.id === st.changed ? "swap" : d.id === st.added ? "done" : "tile";
        S.box(DX, dy(i), DW, 44, { text: `'${d.text}'`, sub: "likes: " + d.likes, tone });
      });
      lists.forEach((L, li) => L.forEach(d => {
        const i = dictsSeen.indexOf(d);
        S.arrow(LX + LW + 2, ly[li], DX - 4, dy(i) + 22, { tone: li === 1 ? "min" : "accent" });
      }));
      pic.replaceChildren(S.el);
      const origChanged = st.lines.length && (st.orig.length !== 2 || st.orig[0].likes !== 1);
      outBox.replaceChildren(eyebrow("print(original)  and  print(twin)", "margin:10px 0 6px"),
        h("pre", { class: "st-out" }, lRepr(st.orig) + "\n" + lRepr(st.twin)));
      note.innerHTML = m.note + (st.lines.length ? (origChanged ? " <b class='data-bad'>original changed too!</b>" : " <b class='data-okb'>original is untouched.</b>") : " Now change <code>twin</code> with a button.");
    }
    el.append(h("p", { class: "small muted", style: "margin:0 0 6px" }, "1. How is twin made?"), mseg,
      h("p", { class: "small muted", style: "margin:12px 0 6px" }, "2. Change twin"), abtns,
      h("div", { class: "data-two", style: "margin-top:12px" }, h("div", null, codeBox, outBox, note), pic));
    reset();
  }

  // --- stepper data: removing while looping skips items ---
  function removeSteps() {
    const L2 = [1, 2, 5, 6];
    let L = [1, 2, 3, 4];
    const S = [
      { line: 6, now: "The list we will clean.", vars: { L1: "[1, 2, 3, 4]" }, L: L.slice(), pos: -1 },
      { line: 7, now: "Call the function. Inside, <code>L1</code> is the <b>same</b> list (an alias).", vars: { L1: "[1, 2, 3, 4]", L2: "[1, 2, 5, 6]" }, L: L.slice(), pos: -1 },
    ];
    let pos = 0;
    while (pos < L.length) {
      const item = L[pos];
      S.push({ line: 2, now: `The loop is at <b>position ${pos}</b>, so <code>item = ${item}</code>.`, vars: { L1: pyrepr(L), L2: "[1, 2, 5, 6]", item: String(item) }, L: L.slice(), pos });
      if (L2.includes(item)) {
        S.push({ line: 3, now: `Is ${item} in L2? <b>Yes</b>.`, L: L.slice(), pos, hit: true });
        L = L.filter((x, k) => k !== pos);
        S.push({ line: 4, now: `Remove ${item}. Everything after it <b>slides left</b>: ${L[pos]} is now at position ${pos}, the spot the loop has already done.`, vars: { L1: pyrepr(L), L2: "[1, 2, 5, 6]", item: String(item) }, L: L.slice(), pos, slid: true });
      } else S.push({ line: 3, now: `Is ${item} in L2? No.`, L: L.slice(), pos });
      pos++;
    }
    S.push({ line: 2, now: `Next would be position ${pos}, but the list only has ${L.length} items. The loop ends. <b>2 was never looked at.</b>`, L: L.slice(), pos, skipped: true });
    S.push({ line: 8, now: "2 survived, even though it is in L2.", print: pyrepr(L), L: L.slice(), pos: -1, skipped: true });
    return S;
  }
  const removeVisual = (el, st) => {
    const marks = {}, ptrs = {};
    if (st.pos >= 0 && st.pos < st.L.length) { marks[st.pos] = st.hit ? "swap" : st.slid ? "cmp" : "held"; ptrs[st.pos] = "position " + st.pos; }
    if (st.skipped) { const k = st.L.indexOf(2); if (k >= 0) { marks[k] = "cmp"; ptrs[k] = "skipped!"; } }
    el.append(D.array(st.L, { name: "L1", marks, ptrs }));
  };

  const copies = {
    id: "copies",
    title: "Names, aliasing & copies",
    summary: "<code>c = a</code> makes a second name, not a copy. Mutate vs rebind, shallow vs deep copies, and two traps.",
    sources: "NB §28; L4 p16",
    blocks: [
      { type: "h", text: "Same contents or same box?" },
      { type: "table", head: ["Python", "Asks", "a = [1, 2, 3]; b = [1, 2, 3]"], code: [0], rows: [
        ["a == b", "same <b>contents</b>?", "<code>True</code>"],
        ["a is b", "the <b>same box</b> (object)?", "<code>False</code>: two boxes that look alike"],
      ] },
      {
        type: "stepper",
        title: "Aliasing: two names, one list",
        code: `
          a = [1, 2, 3]
          b = [1, 2, 3]
          print(a == b, a is b)
          c = a
          c.append(4)
          print(a)
          print(b)`,
        what: {
          1: "Make a list; name it a.",
          2: "Make a second list with the same contents; name it b.",
          3: "== compares contents. is compares boxes.",
          4: "No copy. c is stuck on the same box as a.",
          5: "Mutate the box through the name c.",
          6: "a points at that same box.",
          7: "b is a different box.",
        },
        steps: aliasSteps,
        visualTitle: "Names (left) point at values (right)",
        visual: (el, st) => el.appendChild(st.names.length ? D.bindings({ names: st.names, values: st.values, w: 340, nameW: 60, valW: 150 }) : h("p", { class: "novars" }, "No names yet.")),
      },
      { type: "callout", kind: "rule", title: "Mutate vs rebind", html: "<p><b>Mutate</b> = change the box: <code>c.append(4)</code>, <code>c[0] = 9</code>, <code>del c[0]</code>. Every name on that box sees it.</p><p><b>Rebind</b> = move one name to another box: <code>c = [9]</code>. The other names don't notice.</p>" },

      { type: "h", text: "A list passed to a function is the same list", sub: "Mutating the parameter changes the caller's list. Rebinding it does not." },
      {
        type: "stepper",
        title: "Course example: charge a fee",
        code: `
          def charge_fee(transactions, fee):
              for i in range(len(transactions)):
                  transactions[i] = transactions[i] - fee

          def reset_broken(transactions):
              transactions = []

          my_transactions = [200, 50, 30]
          charge_fee(my_transactions, 5)
          print(my_transactions)
          reset_broken(my_transactions)
          print(my_transactions)`,
        what: {
          1: "Defines a function that MUTATES its list.",
          2: "Go through the positions 0, 1, 2.",
          3: "Write a new number into position i of the same list.",
          5: "Defines a function that only REBINDS its local name.",
          6: "The local name moves to a new empty list. The caller's list is not affected.",
          8: "The caller's list.",
          9: "Pass the list: the parameter is an alias.",
          10: "Changed by charge_fee.",
          11: "Pass it again.",
          12: "Not changed by reset_broken.",
        },
        steps: argSteps(),
        visualTitle: "Names and the list",
        visual: (el, st) => el.appendChild(st.names.length ? D.bindings({ names: st.names, values: st.values, w: 400, nameW: 150, valW: 150 }) : h("p", { class: "novars" }, "Only functions so far.")),
      },

      { type: "h", text: "Shallow vs deep copy", sub: "Pick how twin is made, then change twin. Watch original." },
      { type: "table", head: ["You write", "New outer list?", "New inner items?"], code: [0], rows: [
        ["twin = original", "no", "no"],
        ["twin = original[:]   # or list(original), original.copy()", "yes", "<b>no</b>: shared"],
        ["twin = copy.deepcopy(original)", "yes", "yes"],
      ] },
      { type: "widget", render: copyWidget },
      { type: "callout", kind: "tip", title: "When does shallow matter?", html: "<p>Only when the items inside are <b>mutable</b> (lists, dicts, objects). A shallow copy of <code>[1, 2, 3]</code> is fine: you can't change a number in place, you can only replace it.</p>" },

      { type: "h", text: "Two traps that are really aliasing" },
      {
        type: "stepper",
        title: "Trap 1: removing items while looping",
        code: `
          def remove_shared_buggy(L1, L2):
              for item in L1:
                  if item in L2:
                      L1.remove(item)

          L1 = [1, 2, 3, 4]
          remove_shared_buggy(L1, [1, 2, 5, 6])
          print(L1)`,
        what: {
          1: "Meant to remove from L1 every item that is also in L2.",
          2: "Python keeps a hidden position counter: 0, 1, 2, …",
          3: "Is this item one to remove?",
          4: "Removing shifts everything after it one place left.",
          6: "The list.",
          7: "The call: L1 inside is the same list.",
          8: "Expected [3, 4].",
        },
        steps: removeSteps(),
        visualTitle: "The list and the loop's position",
        legend: [["held", "position now"], ["swap", "about to go"], ["cmp", "slid into a done spot"]],
        visual: removeVisual,
      },
      `<p><b>Fix:</b> build a new list instead: <code>L1 = [item for item in L1 if item not in L2]</code> gives <code>[3, 4]</code>. Or loop over a copy: <code>for item in L1[:]:</code>.</p>`,
      { type: "callout", kind: "warn", title: "Trap 2: a list as a default value", html: "<p>The default list is made <b>once</b>, when <code>def</code> runs. Every call that uses it shares that one list.</p>",
        code: "def add_tag_buggy(tag, tags=[]):\n    tags.append(tag)\n    return tags\n\nprint(add_tag_buggy('python'))   # ['python']\nprint(add_tag_buggy('cbs'))      # ['python', 'cbs']  ← remembered!\n\ndef add_tag(tag, tags=None):\n    if tags is None:\n        tags = []                    # a fresh list every call\n    tags.append(tag)\n    return tags" },
      {
        type: "tryit",
        title: "See it for yourself",
        code: `
          import copy

          original = [{'text': 'hello', 'likes': 1}, {'text': 'world', 'likes': 2}]

          shallow = original[:]                 # new outer list, same dicts
          shallow.append({'text': 'new', 'likes': 0})
          print(len(original), len(shallow))    # the outer lists are separate

          shallow[0]['likes'] = 999             # the dicts are shared...
          print(original[0])

          deep = copy.deepcopy(original)
          deep[1]['likes'] = -1                 # ...but not after deepcopy
          print(original[1])

          print(original == shallow[:2], original is shallow)`,
      },
      {
        type: "tryit",
        title: "Fix the remove-while-looping bug",
        task: "Make <code>remove_shared</code> <b>return</b> a new list without the shared items. It should print <code>[3, 4]</code>.",
        code: `
          def remove_shared(L1, L2):
              for item in L1:
                  if item in L2:
                      L1.remove(item)
              return L1

          print(remove_shared([1, 2, 3, 4], [1, 2, 5, 6]))`,
        expectOutput: "[3, 4]",
        hint: "Use a comprehension that keeps only the items <code>not in L2</code>.",
        solution: `
          def remove_shared(L1, L2):
              return [item for item in L1 if item not in L2]   # a new list: no skipping

          print(remove_shared([1, 2, 3, 4], [1, 2, 5, 6]))`,
      },
      { type: "mistakes", items: [
        { title: "Thinking <code>=</code> makes a copy", wrong: "backup = scores\nscores.append(0)   # backup changed too", right: "backup = scores[:]\nscores.append(0)   # backup is safe", why: "<code>=</code> only adds a name tag. Use <code>[:]</code>, <code>list()</code> or <code>.copy()</code> to copy." },
        { title: "A shallow copy of a list of dicts", wrong: "twin = posts[:]\ntwin[0]['likes'] = 0   # posts changed", right: "import copy\ntwin = copy.deepcopy(posts)", why: "<code>[:]</code> copies the outer list only. The dicts inside are shared." },
        { title: "Removing from the list you loop over", wrong: "for x in L:\n    if x < 0:\n        L.remove(x)", right: "L = [x for x in L if x >= 0]", why: "Removing shifts items left and the loop skips the next one." },
        { title: "Rebinding a parameter and expecting the caller to see it", wrong: "def clear_all(L):\n    L = []", right: "def clear_all(L):\n    L.clear()", why: "<code>L = []</code> only moves the local name. <code>.clear()</code> mutates the shared list." },
        { title: "A mutable default value", wrong: "def add(x, items=[]):", right: "def add(x, items=None):\n    if items is None:\n        items = []", why: "The default list is made once and shared by every call." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "a = [1, 2, 3]\nc = a\nc.append(4)\nprint(len(a))", answer: "4",
        hint: "How many lists exist here?", explain: "Only one list, with two names. Appending through <code>c</code> changes what <code>a</code> sees." },
      { type: "predict", q: "What does this print?", code: "a = [1, 2, 3]\nc = a\nc = [9]\nprint(a)", answer: "[1, 2, 3]",
        hint: "Is line 3 a mutation or a rebind?", explain: "<code>c = [9]</code> moves only the name <code>c</code> to a new list. <code>a</code>'s list is untouched." },
      { type: "mc", q: "<code>a = [1, 2]</code> and <code>b = a[:]</code>. What is <code>print(a == b, a is b)</code>?", options: ["<code>True True</code>", "<code>True False</code>", "<code>False False</code>", "<code>False True</code>"], answer: 1,
        hint: "<code>[:]</code> makes a new list with the same contents.", explain: "Same contents, so <code>==</code> is True. Two different boxes, so <code>is</code> is False." },
      { type: "predict", q: "What does this print?", code: "rows = [[1, 2], [3, 4]]\ntwin = rows[:]\ntwin[0].append(99)\ntwin.append([5])\nprint(rows)", answer: "[[1, 2, 99], [3, 4]]",
        hint: "<code>rows[:]</code> is a shallow copy. Which change goes into a shared inner list, and which into the new outer list?", explain: "The inner lists are shared, so the 99 shows up in <code>rows</code>. The <code>[5]</code> went into the new outer list only." },
      { type: "predict", q: "What does this print?", code: "def add_bonus(scores):\n    for i in range(len(scores)):\n        scores[i] += 10\n\nmine = [50, 60]\nadd_bonus(mine)\nprint(mine)", answer: "[60, 70]",
        hint: "Does the function mutate the list or rebind its name?", explain: "<code>scores</code> is an alias for <code>mine</code>, and <code>scores[i] += 10</code> writes into that list." },
      { type: "explain", q: "In 3–4 sentences, explain what aliasing is, and why <code>backup = scores</code> is not a backup.",
        answer: "<p>Aliasing means two names point at the same object. <code>backup = scores</code> does not copy the list: it sticks a second name tag on the same list. So if the list is mutated through either name (append, assignment to an index, remove), both names see the change. A real backup needs a copy: <code>scores[:]</code>, <code>list(scores)</code>, or <code>copy.deepcopy(scores)</code> if the items are themselves mutable.</p>",
        points: ["two names, one object", "= never copies", "mutation is seen through every name", "copy with [:] or deepcopy"],
        hint: "Think of name tags and boxes." },
    ],
  };

  /* ================================================================
     TOPIC 6: Files & CSV
     ================================================================ */

  // --- widget: file modes r / w / a ---
  function modesWidget(el) {
    const START = ["workin nine to five\n", "what a way to make a livin\n"];
    const MODES = [
      { m: "r", code: "with open('lyrics.txt', 'r') as file:\n    lines = file.readlines()" },
      { m: "w", code: "with open('lyrics.txt', 'w') as file:\n    file.writelines(['new start\\n'])" },
      { m: "a", code: "with open('lyrics.txt', 'a') as file:\n    file.writelines(['and something that rhymes\\n'])" },
    ];
    let mi = 2, file, before, result;
    const seg = segOf(["'r' read", "'w' write", "'a' append"], "Pick a mode", i => { mi = i; result = null; draw(); });
    const runB = h("button", { type: "button", class: "btn small primary", onclick: run }, "Run it");
    const resetB = h("button", { type: "button", class: "btn small ghost", onclick: () => { file = START.slice(); result = null; draw(); } }, "Reset file");
    const delB = h("button", { type: "button", class: "btn small ghost", onclick: () => { file = null; result = null; draw(); } }, "Delete the file");
    const codeBox = h("div"), pages = h("div", { class: "data-pages" }), msg = h("div", { "aria-live": "polite" });
    function run() {
      before = file ? file.slice() : null;
      const m = MODES[mi].m;
      if (m === "r") result = file ? { lines: file.slice() } : { err: "FileNotFoundError: [Errno 2] No such file or directory: 'lyrics.txt'" };
      else if (m === "w") { file = ["new start\n"]; result = { wrote: true, wiped: before && before.length }; }
      else { file = (file || []).concat(["and something that rhymes\n"]); result = { wrote: true, created: !before }; }
      draw();
    }
    const page = (lines, title, cursor, stamp) => {
      const p = h("div", { class: "data-page" + (lines ? "" : " data-nofile") }, h("div", { class: "data-ptitle" }, title));
      if (!lines) { p.append(h("div", { class: "data-pline muted" }, "no such file")); return p; }
      if (cursor === "start") p.append(h("span", { class: "data-cursor", title: "read position" }, "▸ start reading here"));
      if (!lines.length) p.append(h("div", { class: "data-pline muted" }, "(empty)"));
      lines.forEach((l, i) => p.append(h("div", { class: "data-pline" + (stamp && stamp(i) ? " data-plnew" : "") }, l.replace("\n", ""), h("span", { class: "data-nl", "aria-label": "newline" }, "\\n"))));
      if (cursor === "end") p.append(h("span", { class: "data-cursor" }, "▸ write position: the end"));
      return p;
    };
    function draw() {
      press(seg, mi);
      const m = MODES[mi].m;
      codeBox.replaceChildren(ui.code({ code: MODES[mi].code, nonum: true }));
      if (!result) {
        pages.replaceChildren(page(file, "lyrics.txt now", m === "r" ? "start" : m === "a" ? "end" : null));
        msg.innerHTML = m === "w" ? "<p class='small'><b>'w'</b> wipes the file <b>the moment it is opened</b>, then writes. Press Run.</p>"
          : m === "a" ? "<p class='small'><b>'a'</b> keeps everything and writes at the end. Press Run.</p>"
          : "<p class='small'><b>'r'</b> (the default) only reads. The file is not changed. Press Run.</p>";
        return;
      }
      if (result.err) {
        pages.replaceChildren(page(null, "lyrics.txt"));
        msg.innerHTML = `<p><span class="data-bad">${esc(result.err)}</span></p><p class="small">You can only read a file that exists, in the folder Python is looking in. <code>'w'</code> and <code>'a'</code> create it.</p>`;
        return;
      }
      if (result.lines) {
        pages.replaceChildren(page(file, "lyrics.txt (unchanged)", "start"));
        msg.replaceChildren(h("p", { class: "small", style: "margin:0 0 6px", html: "<code>lines</code> is a plain list of strings. Each one still ends in <code>\\n</code>:" }),
          ui.table({ head: ["Python", "Value"], code: [0, 1], rows: result.lines.map((l, i) => ["lines[" + i + "]", pyrepr(l)]) }),
          h("p", { class: "small", style: "margin:6px 0 0", html: "Use <code>line.strip()</code> to drop the <code>\\n</code>." }));
        return;
      }
      const nOld = before ? before.length : 0;
      pages.replaceChildren(page(before, "before"), h("span", { class: "data-arrow", "aria-hidden": "true" }, "→"),
        page(file, "after", m === "a" ? "end" : null, i => m === "w" || i >= nOld));
      msg.innerHTML = m === "w"
        ? `<p class="small">${result.wiped ? "<b>The old lines are gone.</b> " : ""}'w' emptied the file, then wrote 1 line. ${result.wiped ? "This is how the original CSV got overwritten in Exercise 3." : ""}</p>`
        : `<p class="small">${result.created ? "The file did not exist, so 'a' created it. " : "The old lines are kept. "}The new line went at the end. Run again to add another.</p>`;
    }
    el.append(seg, h("div", { style: "margin-top:10px" }, codeBox), row(runB, resetB, delB), h("div", { style: "margin-top:12px" }, pages), msg);
    file = START.slice(); result = null; draw();
  }

  // --- widget: CSV row → dict ---
  const CSVROWS = [
    { label: "Sine,29,Copenhagen", head: ["name", "age", "city"], line: "Sine,29,Copenhagen", split: ["Sine", "29", "Copenhagen"], csv: ["Sine", "29", "Copenhagen"] },
    { label: "Bo,34,Aarhus", head: ["name", "age", "city"], line: "Bo,34,Aarhus", split: ["Bo", "34", "Aarhus"], csv: ["Bo", "34", "Aarhus"] },
    { label: "a tweet with a comma", head: ["id", "text", "likes"], line: '1,"Hello, world",5', split: ["1", '"Hello', ' world"', "5"], csv: ["1", "Hello, world", "5"] },
  ];
  function csvWidget(el) {
    let ri = 0, mi = 0;
    const rseg = segOf(CSVROWS.map(r => r.label), "Pick a line", i => { ri = i; draw(); });
    const mseg = segOf(['line.split(",")', "csv.reader"], "Pick how to cut it", i => { mi = i; draw(); });
    mseg.classList.add("mono");
    const lineBox = h("div"), cells = h("div"), mapBox = h("div"), note = h("div", { "aria-live": "polite" });
    function draw() {
      press(rseg, ri); press(mseg, mi);
      const r = CSVROWS[ri], f = mi === 0 ? r.split : r.csv;
      lineBox.innerHTML = `<p class="small muted" style="margin:0 0 4px">header: <code>${esc(r.head.join(","))}</code></p><pre class="data-csvline">${esc(r.line).replace(/,/g, "<span class='data-comma'>,</span>")}</pre>`;
      const marks = {};
      if (f.length > r.head.length) f.forEach((_, i) => { if (i >= 1) marks[i] = "swap"; });
      cells.replaceChildren(eyebrow(mi === 0 ? 'fields = line.split(",")' : "row (from csv.reader)", "margin:10px 0 6px"), D.array(f, { quote: true, marks }));
      const pairs = r.head.map((k, i) => [k, f[i]]);
      mapBox.replaceChildren(eyebrow("then each piece gets its column name", "margin:12px 0 6px"),
        h("table", { class: "tbl data-dtbl" }, h("tbody", null, pairs.map(([k, v], i) => h("tr", null,
          h("td", { class: "mono" }, q(k)), h("td", { class: "muted" }, "→"),
          h("td", { class: "mono" + (marks[i] ? " data-badcell" : "") }, pyrepr(v)))))),
        h("p", { class: "mono small", style: "margin:8px 0 0;overflow-wrap:anywhere" }, "{" + pairs.map(([k, v]) => q(k) + ": " + pyrepr(v)).join(", ") + "}"));
      if (f.length > r.head.length) note.innerHTML = `<p class="data-bad" style="margin:10px 0 0">${f.length} pieces but only ${r.head.length} column names: <b>one column too many</b>.</p><p class="small">The comma inside the text was cut too. <code>likes</code> got <code>${esc(pyrepr(f[2]))}</code> and the real 5 fell off the end. Switch to <b>csv.reader</b>: it knows that commas inside quotes belong to the text.</p>`;
      else note.innerHTML = `<p class="small" style="margin:10px 0 0">Every value is a <b>string</b>, even <code>${esc(pyrepr(f[1]))}</code>${r.head[1] === "age" ? `. Cast it: <code>int(fields[1])</code> is ${f[1]}` : ""}.</p>`;
    }
    el.append(h("p", { class: "small muted", style: "margin:0 0 6px" }, "1. Pick a line from the file"), rseg,
      h("p", { class: "small muted", style: "margin:12px 0 6px" }, "2. Pick how to cut it"), mseg,
      h("div", { style: "margin-top:12px" }, lineBox), cells, mapBox, note);
    draw();
  }

  // --- stepper data: read → keep → write pipeline (Exercise 3 Q6) ---
  const NIKE = ["Fbid;PostType;Message;LikeCount", "101;photo;New shoes;25", "102;video;Run fast;40"];
  function pipeSteps() {
    const rows = NIKE.map(l => l.split(";"));
    const sel = [];
    const S = [
      { line: 1, now: "Bring in the csv module.", vars: {}, inRow: -1, sel: [], out: null, focus: null },
      { line: 3, now: "An empty list. It will hold the columns we keep.", vars: { selected: "[]" }, inRow: -1, sel: [], out: null, focus: "sel" },
      { line: 4, now: "Open <code>posts.csv</code> for reading (mode 'r' is the default). <code>in_file</code> is the open file.", vars: { selected: "[]", in_file: "<file>" }, inRow: -1, sel: [], out: null, focus: "in" },
      { line: 5, now: "This file uses <code>;</code> between fields, so tell the reader: <code>delimiter=';'</code>.", vars: { selected: "[]", in_file: "<file>", reader: "<reader>" }, inRow: -1, sel: [], out: null, focus: "in" },
    ];
    rows.forEach((r, i) => {
      const v = { selected: pyrepr(sel), in_file: "<file>", reader: "<reader>", row: pyrepr(r) };
      S.push({ line: 6, now: `Next line, cut at <code>;</code>: <code>row = ${esc(pyrepr(r))}</code>.`, vars: v, inRow: i, sel: sel.map(x => x.slice()), out: null, focus: "in" });
      sel.push([r[0], r[1], r[3]]);
      S.push({ line: 7, now: `Keep fields 0, 1 and 3: <code>${esc(pyrepr(sel[sel.length - 1]))}</code>. Field 2 (Message) is left out.`, vars: Object.assign({}, v, { selected: pyrepr(sel) }), inRow: i, sel: sel.map(x => x.slice()), out: null, focus: "sel" });
    });
    S.push({ line: 9, now: "The <code>with</code> block ended, so <code>posts.csv</code> is closed. Open a <b>new</b> file with 'w'. Never 'w' on your input file: it would be wiped!", vars: { selected: pyrepr(sel), out_file: "<file>" }, inRow: -1, sel: sel.map(x => x.slice()), out: [], focus: "out" });
    S.push({ line: 10, now: "A writer for that file. It puts commas between fields (the default).", vars: { selected: pyrepr(sel), out_file: "<file>", writer: "<writer>" }, inRow: -1, sel: sel.map(x => x.slice()), out: [], focus: "out" });
    S.push({ line: 11, now: "<code>writerows</code> takes the <b>list of rows</b>, here <code>selected</code>, not a file name.", inRow: -1, sel: sel.map(x => x.slice()), out: sel.map(r => r.join(",")), focus: "out" });
    return S;
  }
  const pipeVisual = (el, st) => {
    const box = (title, key, lines, hl) => h("div", { class: "data-pbox" + (st.focus === key ? " data-pfocus" : "") }, h("div", { class: "data-ptitle" }, title),
      lines == null ? h("div", { class: "data-pline muted" }, "not made yet") : !lines.length ? h("div", { class: "data-pline muted" }, "(empty)") :
        lines.map((l, i) => h("div", { class: "data-pline" + (i === hl ? " data-plhit" : "") }, l)));
    el.append(h("div", { class: "data-pipe" },
      box("posts.csv (file)", "in", NIKE, st.inRow),
      h("span", { class: "data-arrow", "aria-hidden": "true" }, "→"),
      box("selected (a list)", "sel", st.sel.map(r => pyrepr(r)), st.focus === "sel" ? st.sel.length - 1 : -1),
      h("span", { class: "data-arrow", "aria-hidden": "true" }, "→"),
      box("small.csv (file)", "out", st.out, -1)));
  };

  const files = {
    id: "files",
    title: "Files & CSV",
    summary: "Read and write text files with modes <code>'r'</code>, <code>'w'</code>, <code>'a'</code>. Cut CSV lines by hand, then with the <code>csv</code> module and <code>DictReader</code>.",
    exam: ["A1 load_tweets"],
    sources: "NB §16; L3 p15–22",
    blocks: [
      { type: "callout", kind: "exam", title: "Exam weight: low, Assignment weight: high", html: "<p>Files were not in last year's exam, but Assignment 1 starts with <code>load_tweets(filename)</code>, and Exercise 3 Q5–Q6 are file tasks.</p>" },
      { type: "h", text: "Open, use, close: the with block" },
      { type: "code", code: `
          with open('lyrics.txt') as file:    # open; 'file' is the open file
              lines = file.readlines()        # use it inside the block

          print(lines)                        # the file is closed again here` },
      { type: "table", head: ["To read", "Gives", "Tiny example"], code: [0, 2], rows: [
        ["file.readlines()", "a list of strings, one per line, each ending in \\n", "['a\\n', 'b\\n']"],
        ["file.read()", "the whole file as one string", "'a\\nb\\n'"],
        ["for line in file:", "one line per round", "line = 'a\\n'"],
      ] },

      { type: "h", text: "Modes: 'r', 'w' and 'a'", sub: "Pick a mode and press Run. Try 'w' twice, and 'r' after deleting the file." },
      { type: "widget", render: modesWidget },
      { type: "table", head: ["Mode", "File exists", "File missing", "Use it for"], code: [0], rows: [
        ["'r'", "read from the start", "<span class='bad'>FileNotFoundError</span>", "reading (the default)"],
        ["'w'", "<b>wiped</b>, then written", "created", "a new output file"],
        ["'a'", "kept; write at the end", "created", "adding to a log"],
      ] },
      { type: "callout", kind: "warn", title: "writelines() adds no newlines", html: "<p><code>file.writelines(['a', 'b'])</code> writes <code>ab</code> on one line. Put <code>\\n</code> at the end of each string yourself: <code>['a\\n', 'b\\n']</code>.</p>" },
      {
        type: "tryit",
        title: "Write a file, then read it back",
        task: "Python here runs in your browser, so it can't see your own files. Write one first, then read it.",
        code: `
          first_two_lines = ['workin nine to five\\n', 'what a way to make a livin\\n']

          with open('lyrics.txt', 'w') as file:          # 'w': make it (or wipe it)
              file.writelines(first_two_lines)

          with open('lyrics.txt', 'a') as file:          # 'a': add at the end
              file.writelines(['and something that rhymes\\n'])

          with open('lyrics.txt') as file:               # 'r' is the default
              lines = file.readlines()

          print(lines)                                   # each line keeps its \\n
          print(len(lines), lines[0].strip())`,
      },

      { type: "h", text: "CSV by hand: split and join", sub: "A CSV line is just text with commas. Pick a line and a way to cut it." },
      { type: "widget", render: csvWidget },
      { type: "table", head: ["Python", "Result", "Note"], code: [0, 1], rows: [
        ["'Sine,29,Copenhagen'.split(',')", "['Sine', '29', 'Copenhagen']", "cut at every comma"],
        ["'Sine,29,Copenhagen\\n'.split(',')", "['Sine', '29', 'Copenhagen\\n']", "lines from a file keep \\n: <code>.strip()</code> first"],
        ["','.join(['Bo', '34', 'Aarhus'])", "'Bo,34,Aarhus'", "the mirror image of split"],
        ["','.join(['Bo', 34])", "TypeError: sequence item 1: expected str instance, int found", "join needs strings: <code>str(34)</code>"],
      ] },

      { type: "h", text: "The csv module", sub: "It handles commas inside quotes for you" },
      { type: "table", head: ["You write", "What it does"], code: [0], rows: [
        ["csv.reader(file)", "each row comes out as a list of strings"],
        ["csv.reader(file, delimiter=';')", "fields are separated by ; instead of ,"],
        ["header = next(reader)", "take the first row (the header) out of the way"],
        ["csv.DictReader(file)", "each row comes out as a dict keyed by the header"],
        ["open(name, 'w', newline='')", "for csv.writer: stops blank lines between rows on Windows"],
        ["writer.writerow(['Bo', 34])", "write <b>one</b> row (a list)"],
        ["writer.writerows(rows)", "write <b>many</b> rows (a list of lists)"],
      ] },
      { type: "callout", kind: "rule", title: "newline= and delimiter= are different things", html: "<p><code>newline=''</code> goes in <code>open()</code> when writing a CSV. <code>delimiter=';'</code> goes in <code>csv.reader()</code> / <code>csv.writer()</code> and says what is <b>between</b> the fields.</p>" },
      {
        type: "stepper",
        title: "Exercise 3 Q6: read → keep → write",
        intro: "A tiny stand-in for the Nike file: <code>;</code> between fields. Keep Fbid, PostType and LikeCount.",
        code: `
          import csv

          selected = []
          with open('posts.csv') as in_file:
              reader = csv.reader(in_file, delimiter=';')
              for row in reader:
                  selected.append([row[0], row[1], row[3]])

          with open('small.csv', 'w', newline='') as out_file:
              writer = csv.writer(out_file)
              writer.writerows(selected)`,
        what: {
          1: "The csv tools.",
          3: "The list in the middle: it links the two files.",
          4: "Open the input file for reading.",
          5: "A reader that cuts each line at ;",
          6: "One row (a list of strings) per round. The header is a row too.",
          7: "Keep 3 of the 4 fields.",
          9: "Open a NEW file for writing.",
          10: "A writer for it.",
          11: "Write all kept rows at once.",
        },
        steps: pipeSteps(),
        visualTitle: "File → list → file",
        visual: pipeVisual,
      },
      {
        type: "tryit",
        title: "csv.writer, csv.reader and DictReader",
        code: `
          import csv

          with open('people2.csv', 'w', newline='') as file:
              writer = csv.writer(file)
              writer.writerow(['name', 'age', 'city'])                     # header row
              writer.writerows([['Sine', 29, 'Copenhagen'], ['Bo', 34, 'Aarhus']])

          with open('people2.csv') as file:
              reader = csv.reader(file)
              header = next(reader)                  # skip the header
              for row in reader:
                  print(row)                         # numbers came back as strings

          with open('people2.csv', encoding='utf-8') as file:
              people = []
              for row in csv.DictReader(file):       # one dict per row
                  row['age'] = int(row['age'])       # cast what you need
                  people.append(row)

          print(people)
          print(people[1]['city'])`,
      },
      {
        type: "tryit",
        title: "Exercise 3 Q6 on a small file",
        task: "The first part makes <code>posts.csv</code>. Finish the code so <code>small.csv</code> holds Fbid, PostType and LikeCount, and the last loop prints three lines: <code>Fbid,PostType,LikeCount</code>, <code>101,photo,25</code>, <code>102,video,40</code>. Until your code writes <code>small.csv</code>, the last part stops with a FileNotFoundError.",
        code: `
          import csv

          with open('posts.csv', 'w') as f:                        # make the input file
              f.write('Fbid;PostType;Message;LikeCount\\n101;photo;New shoes;25\\n102;video;Run fast;40\\n')

          selected = []
          # read posts.csv (delimiter ';') and keep fields 0, 1 and 3

          # write selected to small.csv with csv.writer

          with open('small.csv') as f:                             # check the result
              for line in f:
                  print(line.strip())`,
        expectOutput: "Fbid,PostType,LikeCount\n101,photo,25\n102,video,40",
        hint: "Copy the shape from the stepper above: a reader with <code>delimiter=';'</code>, <code>selected.append([row[0], row[1], row[3]])</code>, then a writer and <code>writerows(selected)</code>.",
        solution: `
          import csv

          with open('posts.csv', 'w') as f:
              f.write('Fbid;PostType;Message;LikeCount\\n101;photo;New shoes;25\\n102;video;Run fast;40\\n')

          selected = []
          with open('posts.csv') as in_file:
              reader = csv.reader(in_file, delimiter=';')
              for row in reader:
                  selected.append([row[0], row[1], row[3]])   # Fbid, PostType, LikeCount

          with open('small.csv', 'w', newline='') as out_file:
              writer = csv.writer(out_file)
              writer.writerows(selected)                    # the list, not the file name

          with open('small.csv') as f:
              for line in f:
                  print(line.strip())`,
      },
      { type: "callout", kind: "note", title: "input() is like reading one line", html: "<p>Like a line from a file, <code>input()</code> always gives a <b>string</b>. <code>int(input())</code> to get a number. See Python foundations → Basics.</p>" },
      { type: "mistakes", items: [
        { title: "Opening your input file with 'w'", wrong: "with open('data.csv', 'w') as f:\n    reader = csv.reader(f)", right: "with open('data.csv') as f:      # 'r'\n    reader = csv.reader(f)", why: "'w' wipes the file the moment it opens. The original data is gone. (This really happened in Exercise 3.)" },
        { title: "Giving the writer a file name instead of the file", wrong: "writer = csv.writer('out.csv')", right: "with open('out.csv', 'w', newline='') as f:\n    writer = csv.writer(f)", why: "<code>TypeError: argument 1 must have a \"write\" method</code>. A name is just text; you need the open file." },
        { title: "Passing the wrong thing to <code>writerows</code>", wrong: "writer.writerows('out.csv')", right: "writer.writerows(selected)", why: "It wants your list of rows. With a string it writes one letter per row: o, u, t, …" },
        { title: "Mixing up <code>newline=</code> and <code>delimiter=</code>", wrong: "open('out.csv', 'w', delimiter=';')", right: "f = open('out.csv', 'w', newline='')\nwriter = csv.writer(f, delimiter=';')", why: "<code>newline</code> belongs to <code>open()</code>; <code>delimiter</code> belongs to the csv reader/writer." },
        { title: "Doing maths with a CSV field", wrong: "row['likes'] + 1", right: "int(row['likes']) + 1", why: "Everything read from a file is a string: <code>TypeError: can only concatenate str (not \"int\") to str</code>." },
        { title: "Forgetting the \\n on the last field", wrong: "'Bo,34,Aarhus\\n'.split(',')[2]   # 'Aarhus\\n'", right: "'Bo,34,Aarhus\\n'.strip().split(',')[2]   # 'Aarhus'", why: "Lines from a file keep their newline. Strip it before you split." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "<code>notes.txt</code> holds two lines: <code>hi</code> and <code>yo</code>. What does this print?", code: "with open('notes.txt') as file:\n    lines = file.readlines()\nprint(lines)", answer: "['hi\\n', 'yo\\n']",
        hint: "readlines keeps the end of each line.", explain: "One string per line, and each still ends in <code>\\n</code>. (If the last line has no newline at the end of the file, its <code>\\n</code> is missing.)" },
      { type: "mc", q: "<code>log.txt</code> has 10 lines. You run <code>with open('log.txt', 'w') as f: f.write('done\\n')</code>. How many lines does it have now?", options: ["11", "10", "1", "0: FileNotFoundError"], answer: 2,
        wrong: { 0: "That is what 'a' would do.", 3: "'w' creates or wipes; it never needs the file to exist." },
        hint: "What does 'w' do to the old contents?", explain: "'w' wipes the file when it opens, then writes 1 line. Use 'a' to add at the end." },
      { type: "predict", q: "What does this print?", code: "line = 'Bo,34,Aarhus'\nfields = line.split(',')\nprint(fields[1] + '1')", answer: "341",
        hint: "What type is <code>fields[1]</code>?", explain: "Every field is a string. <code>'34' + '1'</code> joins text: <code>'341'</code>. For maths use <code>int(fields[1]) + 1</code>, which is 35." },
      { type: "bug", q: "Click every line with an error (syntax or crash).", code: `
          import csv

          rows = [['name', 'age'], ['Sine', 29]]
          with open('people.csv', 'w', newline='') as file
              writer = csv.writer('people.csv')
              writer.writerows(rows)`,
        bugs: [4, 5], notes: { 4: "missing <code>:</code> at the end of the <code>with</code> line (SyntaxError)", 5: "the writer needs the open <code>file</code>, not the name: TypeError" },
        fixed: `
          import csv

          rows = [['name', 'age'], ['Sine', 29]]
          with open('people.csv', 'w', newline='') as file:
              writer = csv.writer(file)
              writer.writerows(rows)`,
        hint: "Check the end of the <code>with</code> line, and what <code>csv.writer</code> is given.", explain: "Line 4 stops Python before anything runs. After fixing it, line 5 would crash at runtime." },
      { type: "write", q: "Assignment 1 style. Write <code>load_people(filename)</code>: read the CSV with <code>csv.DictReader</code> and <b>return</b> a list of dicts, with <code>'age'</code> cast to <code>int</code>.",
        starter: `
          import csv

          with open('people.csv', 'w') as f:            # a small file to read
              f.write('name,age,city\\nSine,29,Copenhagen\\nBo,34,Aarhus\\n')

          def load_people(filename):
              people = []
              # open the file, loop over csv.DictReader, cast age, append

              return people

          print(load_people('people.csv'))`,
        test: `
          with open('people_test.csv', 'w') as f:
              f.write('name,age,city\\nAna,41,Odense\\nIb,7,Vejle\\n')
          got = load_people('people_test.csv')
          assert got == [{'name': 'Ana', 'age': 41, 'city': 'Odense'}, {'name': 'Ib', 'age': 7, 'city': 'Vejle'}], 'expected a list of 2 dicts with int ages, got ' + repr(got)`,
        solution: `
          import csv

          def load_people(filename):
              people = []
              with open(filename, encoding='utf-8') as file:
                  for row in csv.DictReader(file):        # one dict per row
                      row['age'] = int(row['age'])        # cast the number
                      people.append(row)

              return people                               # after the loop and the with block`,
        hint: "<code>with open(filename) as file:</code>, then <code>for row in csv.DictReader(file):</code>. Change <code>row['age']</code> with <code>int()</code> before you append.",
        explain: "Assignment 1's <code>load_tweets</code> is the same shape: open, DictReader, cast the count columns to int, append, return." },
    ],
  };

  PADS.registerSubject({
    id: "data",
    title: "Working with data",
    order: 2,
    blurb: "Lists, tuples, dictionaries and sets, what <code>=</code> really does with them (aliasing and copies), and reading and writing files and CSV.",
    covers: ["Lists, comprehensions, <code>enumerate</code>, <code>zip</code>", "Tuples, dicts and the counting pattern, sets", "Aliasing, shallow vs deep copies", "Files, modes <code>r/w/a</code>, CSV and <code>DictReader</code>"],
    exam: [
      "<b>Q3</b>: append an index to the list <code>low_stock_queue</code> and return True/False.",
      "<b>Q1</b>: make 200 objects in a list (a comprehension) and print a slice of them.",
      "<b>Q6</b>: return the visited nodes as a list; a visited set keeps the check fast.",
      "<b>Assignment 1</b>: <code>load_tweets</code> (CSV → list of dicts) and <code>count_*_by_year</code> (the counting pattern).",
    ],
    topics: [lists, tuples, dicts, sets, copies, files],
  });
})();
