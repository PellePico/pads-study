/* Subject 1: Python foundations (content map topics 1–4).
   This file is the MODEL for every other subject: copy its structure.
   Only uses the public API in AUTHORING.md: PADS.registerSubject, PADS.ui.*, PADS.h, PADS.pyrepr. */
(function () {
  "use strict";
  const { h, ui, pyrepr } = PADS;
  const D = ui.draw;

  /* small helpers for this file only */
  const row = (...kids) => h("div", { class: "row-wrap" }, ...kids);
  const label = (text, forId) => h("label", { class: "small muted", for: forId }, text);

  /* ================================================================
     TOPIC 1: Basics & types
     ================================================================ */

  // --- widget: type sorter and caster ---
  const CAST = [
    // shown, type, int(), float(), str(), bool(), note
    ["5", "int", "5", "5.0", "'5'", "True"],
    ["'5'", "str", "5", "5.0", "'5'", "True", "Text that looks like a number can be cast to one."],
    ["5.0", "float", "5", "5.0", "'5.0'", "True"],
    ["3.9", "float", "3", "3.9", "'3.9'", "True", "<code>int()</code> chops off the decimals. It does <b>not</b> round: 3.9 becomes 3."],
    ["'3.9'", "str", "!ValueError: invalid literal for int() with base 10: '3.9'", "3.9", "'3.9'", "True", "<code>int()</code> only reads whole-number text. Go via float: <code>int(float('3.9'))</code> is 3."],
    ["True", "bool", "1", "1.0", "'True'", "True", "True counts as 1 and False as 0."],
    ["None", "NoneType", "!TypeError: int() argument must be a string, a bytes-like object or a real number, not 'NoneType'", "!TypeError: float() argument must be a string or a real number, not 'NoneType'", "'None'", "False", "None means “no value”. A function without <code>return</code> gives back None."],
    ["'abc'", "str", "!ValueError: invalid literal for int() with base 10: 'abc'", "!ValueError: could not convert string to float: 'abc'", "'abc'", "True"],
    ["''", "str", "!ValueError: invalid literal for int() with base 10: ''", "!ValueError: could not convert string to float: ''", "''", "False", "The empty string is False. Any other string is True, even <code>'False'</code>."],
    ["0", "int", "0", "0.0", "'0'", "False", "0 is False. Every other number is True."],
  ];
  const FUNCS = ["type", "int", "float", "str", "bool"];
  function castWidget(el) {
    let vi = 3, fi = 1;
    const vals = h("div", { class: "row-wrap", role: "group", "aria-label": "Pick a value" });
    const fns = h("div", { class: "seg", role: "group", "aria-label": "Pick a function" });
    const out = h("div", { class: "fd-castout", "aria-live": "polite" });
    CAST.forEach((c, i) => vals.appendChild(h("button", { type: "button", class: "btn small mono fd-val", onclick: () => { vi = i; draw(); } }, c[0])));
    FUNCS.forEach((f, i) => fns.appendChild(h("button", { type: "button", onclick: () => { fi = i; draw(); } }, f + "()")));
    function draw() {
      [...vals.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === vi)));
      [...fns.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === fi)));
      const c = CAST[vi], f = FUNCS[fi];
      const res = f === "type" ? "<class '" + c[1] + "'>" : c[fi + 1];
      const err = res.startsWith("!");
      out.replaceChildren(
        h("div", { class: "fd-castline" }, h("code", null, f + "(" + c[0] + ")"), h("span", { class: "muted" }, " → "),
          h("code", { class: err ? "fd-err" : "fd-ok" }, err ? res.slice(1) : res)),
        c[6] ? h("p", { class: "small", style: "margin:6px 0 0", html: c[6] }) : null);
    }
    el.append(h("p", { class: "small muted", style: "margin:0 0 6px" }, "1. Pick a value"), vals,
      h("p", { class: "small muted", style: "margin:12px 0 6px" }, "2. Pick what to do with it"), fns, out);
    draw();
  }

  // --- widget: operator playground with groups of dots ---
  function operatorWidget(el) {
    const a = h("input", { type: "range", min: "0", max: "30", value: "22", id: "fd-op-a" });
    const b = h("input", { type: "range", min: "1", max: "10", value: "8", id: "fd-op-b" });
    const av = h("b", { class: "mono" }), bv = h("b", { class: "mono" });
    const table = h("div");
    const dots = h("div", { class: "fd-groups", "aria-hidden": "true" });
    const sentence = h("p", { style: "margin:8px 0 0" });
    function draw() {
      const A = +a.value, B = +b.value;
      av.textContent = A; bv.textContent = B;
      const q = Math.floor(A / B), r = A % B;
      const div = A / B;
      const divTxt = Number.isInteger(div) ? div.toFixed(1) : String(+div.toFixed(6));
      const pow = (BigInt(A) ** BigInt(B)).toString();
      table.replaceChildren(ui.table({
        head: ["Python", "Result", "In words"],
        code: [0],
        rows: [
          [`${A} / ${B}`, divTxt, "divide. <b>Always</b> a float"],
          [`${A} // ${B}`, String(q), "how many <b>full groups</b> of " + B],
          [`${A} % ${B}`, String(r), "what is <b>left over</b>"],
          [`${A} ** ${B}`, pow.length > 18 ? pow.slice(0, 16) + "…" : pow, A + " multiplied by itself " + B + " times"],
        ],
      }));
      dots.replaceChildren();
      for (let g = 0; g < q; g++) dots.appendChild(h("span", { class: "fd-group" }, Array.from({ length: B }, () => h("i"))));
      if (r) dots.appendChild(h("span", { class: "fd-group left" }, Array.from({ length: r }, () => h("i"))));
      sentence.innerHTML = `<code>${A} = ${q} × ${B} + ${r}</code> → <b>${q}</b> full group${q === 1 ? "" : "s"} of ${B} (that is <code>//</code>), and <b>${r}</b> left over (that is <code>%</code>).`;
    }
    a.oninput = b.oninput = draw;
    el.append(
      row(label("a =", "fd-op-a"), a, av, h("span", { style: "width:16px" }), label("b =", "fd-op-b"), b, bv),
      h("div", { style: "margin-top:12px" }, table),
      h("p", { class: "eyebrow", style: "margin-top:14px" }, "a dots, packed into groups of b"), dots, sentence);
    draw();
  }

  // --- stepper data: names and boxes ---
  const namesSteps = [
    { line: 0, now: "Nothing exists yet. Press <b>Step</b>.", vars: {}, names: [], values: [] },
    { line: 1, now: "Python makes the value <b>2</b>, then sticks the name <code>eggs</code> on it.", vars: { eggs: "2" },
      names: [{ name: "eggs", to: "a" }], values: [{ id: "a", text: "2" }] },
    { line: 2, now: "Same again: the value <b>42</b> gets the name <code>spam</code>.", vars: { eggs: "2", spam: "42" },
      names: [{ name: "eggs", to: "a" }, { name: "spam", to: "b" }], values: [{ id: "a", text: "2" }, { id: "b", text: "42" }] },
    { line: 3, now: "<b>Right side first.</b> <code>eggs + 2</code> is 2 + 2, so Python makes a new value <b>4</b>. The name has not moved yet.",
      names: [{ name: "eggs", to: "a" }, { name: "spam", to: "b" }], values: [{ id: "a", text: "2" }, { id: "b", text: "42" }, { id: "c", text: "4", tone: "cmp" }] },
    { line: 3, now: "<b>Then the left side.</b> The name <code>eggs</code> moves to the 4. Nothing points at 2 any more, so Python throws it away.", vars: { eggs: "4", spam: "42" },
      names: [{ name: "eggs", to: "c", tone: "cmp" }, { name: "spam", to: "b" }], values: [{ id: "a", text: "2", faded: true }, { id: "b", text: "42" }, { id: "c", text: "4" }] },
    { line: 4, now: "<code>spam = eggs</code>: no new value. <code>spam</code> now points at the <b>same</b> 4 as <code>eggs</code>. The 42 is thrown away.", vars: { eggs: "4", spam: "4" },
      names: [{ name: "eggs", to: "c" }, { name: "spam", to: "c", tone: "cmp" }], values: [{ id: "a", text: "2", faded: true }, { id: "b", text: "42", faded: true }, { id: "c", text: "4" }] },
    { line: 5, now: "<code>print</code> shows the values, with a space between them.", print: "4 4",
      names: [{ name: "eggs", to: "c" }, { name: "spam", to: "c" }], values: [{ id: "a", text: "2", faded: true }, { id: "b", text: "42", faded: true }, { id: "c", text: "4" }] },
  ];

  const basics = {
    id: "basics",
    title: "Basics & types",
    summary: "Values and their types, variables, arithmetic, <code>=</code> vs <code>==</code>, and why <code>input()</code> always gives text.",
    exam: ["Q2 syntax", "Q4 debug"],
    sources: "NB §1–4, 8",
    blocks: [
      { type: "h", text: "Every value has a type" },
      `<p>A value is one piece of data. Its <b>type</b> says what kind of data it is. <code>type(x)</code> tells you.</p>`,
      { type: "table", head: ["Type", "Examples", "What it is"], code: [1], rows: [
        ["<code>int</code>", "5    -2    0", "a whole number"],
        ["<code>float</code>", "5.0    2.75", "a number with a decimal point"],
        ["<code>str</code>", "'5'    \"hi\"    ''", "text (a string). Always in quotes"],
        ["<code>bool</code>", "True    False", "yes or no"],
        ["<code>NoneType</code>", "None", "“no value here”"],
      ] },
      { type: "callout", kind: "rule", title: "Quotes change everything", html: "<p><code>5</code> is a number. <code>'5'</code> is text. <code>5 + 5</code> is 10, but <code>'5' + '5'</code> is <code>'55'</code>.</p>" },
      { type: "h", text: "Casting: turning one type into another", sub: "Pick a value and a function. Red means Python would crash." },
      { type: "widget", render: castWidget },

      { type: "h", text: "Variables: a name points at a value" },
      `<p><code>=</code> means “make the right side, then stick the name on the left onto it”. Read it right to left.</p>`,
      {
        type: "stepper",
        title: "Names and boxes",
        code: `
          eggs = 2
          spam = 42
          eggs = eggs + 2
          spam = eggs
          print(eggs, spam)`,
        what: {
          1: "An assignment. Make the value 2 and give it the name eggs.",
          2: "Another assignment: the value 42 gets the name spam.",
          3: "Rebinding. Work out eggs + 2 first, then move the name eggs to the result.",
          4: "Makes spam point at whatever eggs points at. No copy, no new value.",
          5: "Shows both values on the screen, separated by a space.",
        },
        steps: namesSteps,
        visualTitle: "Names (left) point at values (right)",
        visual: (el, st) => el.appendChild(st.names.length ? D.bindings({ names: st.names, values: st.values, w: 340 }) : h("p", { class: "novars" }, "No names yet.")),
      },
      { type: "table", caption: "Rules for names", head: ["Name", "OK?", "Why"], code: [0], rows: [
        ["my_var", "<span class='ok'>yes</span>", "letters and _ are fine"],
        ["eggs2", "<span class='ok'>yes</span>", "digits are fine after the first letter"],
        ["2eggs", "<span class='bad'>no</span>", "cannot start with a digit"],
        ["my-var", "<span class='bad'>no</span>", "<code>-</code> means minus"],
        ["class", "<span class='bad'>no</span>", "a keyword Python already uses"],
      ] },

      { type: "h", text: "Arithmetic", sub: "Drag the sliders. Watch // and % on the dots." },
      { type: "widget", render: operatorWidget },
      { type: "table", head: ["Rule", "Tiny example"], code: [1], rows: [
        ["<code>/</code> always gives a float", "10 / 2    # 5.0"],
        ["an int with a float gives a float", "2 + 1.0   # 3.0"],
        ["<code>**</code> first, then <code>* / // %</code>, then <code>+ -</code>", "2 + 3 * 4    # 14"],
        ["brackets go first", "(2 + 3) * 4  # 20"],
      ] },

      { type: "h", text: "= stores, == asks" },
      { type: "table", head: ["You write", "It means", "Gives back"], code: [0], rows: [
        ["x = 5", "store: make <code>x</code> point at 5", "nothing"],
        ["x == 5", "ask: is <code>x</code> equal to 5?", "<code>True</code> or <code>False</code>"],
        ["x != 5", "ask: is <code>x</code> different from 5?", "<code>True</code> or <code>False</code>"],
        ["x <= 5", "ask: is <code>x</code> at most 5?", "<code>True</code> or <code>False</code>"],
      ] },
      { type: "table", caption: "and, or, not", head: ["Python", "Result", "Why"], code: [0], rows: [
        ["True and False", "<code>False</code>", "<code>and</code> needs both True"],
        ["True or False", "<code>True</code>", "<code>or</code> needs at least one"],
        ["not True", "<code>False</code>", "flips it"],
        ["5 > 3 and 2 > 4", "<code>False</code>", "the second part is False"],
      ] },
      { type: "callout", kind: "exam", title: "Exam Q4 had exactly this bug", html: "<p><code>if total = price:</code> is a <b>SyntaxError</b>. An <code>if</code> needs a question, so it must be <code>==</code>.</p>" },

      { type: "h", text: "input() always gives a string" },
      `<p>Whatever the user types comes back as <b>text</b>, even <code>21</code>. Cast it before doing maths.</p>`,
      {
        type: "tryit",
        title: "Read a number from the user",
        task: "The box below the code is what the user “types”. Change 21 to another number and run again.",
        code: `
          age = input("How old are you? ")   # what you type comes back as text
          print(type(age))                   # <class 'str'>

          age = int(age)                     # cast the text to a whole number
          print(age + 1)                     # now maths works`,
        stdin: "21",
      },
      {
        type: "tryit",
        title: "Play with types",
        task: "Predict each line before you run it. Then change things and see what breaks.",
        code: `
          print(type(5), type(5.0), type('5'))

          print(int(3.9))          # chops the decimals
          print(22 // 8, 22 % 8)   # full groups, left over
          print('5' + '5')         # joins text
          print(int('5') + 5)      # maths after casting`,
      },
      { type: "mistakes", items: [
        { title: "<code>=</code> inside an <code>if</code>", wrong: "if total = price:", right: "if total == price:", why: "<code>=</code> stores a value. A condition must ask a question with <code>==</code>. Python stops with a SyntaxError." },
        { title: "Doing maths with <code>input()</code>", wrong: "age = input()\nprint(age + 1)", right: "age = int(input())\nprint(age + 1)", why: "<code>input()</code> gives text, and <code>'21' + 1</code> is a TypeError." },
        { title: "Expecting <code>int()</code> to round", wrong: "int(3.9)     # 3, not 4", right: "round(3.9)   # 4", why: "<code>int()</code> just chops off everything after the dot." },
        { title: "<code>int()</code> on decimal text", wrong: "int('3.9')", right: "int(float('3.9'))", why: "<code>int()</code> only reads whole-number text: ValueError." },
        { title: "Quotes around a variable name", wrong: "tweets = ['hi', 'yo']\nlen('tweets')   # 6", right: "tweets = ['hi', 'yo']\nlen(tweets)     # 2", why: "With quotes it is the text <i>tweets</i> (6 letters), not your variable." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "print(22 // 8, 22 % 8)", answer: "2 6",
        hint: "<code>//</code> counts full groups of 8 in 22. <code>%</code> is what is left over.", explain: "22 = 2 × 8 + 6. So <code>22 // 8</code> is 2 and <code>22 % 8</code> is 6. <code>print</code> puts a space between them." },
      { type: "mc", q: "What is <code>type(10 / 2)</code>?", options: ["<code>int</code>", "<code>float</code>", "<code>str</code>", "<code>NoneType</code>"], answer: 1,
        hint: "Does <code>/</code> ever give a whole-number type?", explain: "<code>/</code> always gives a float: <code>10 / 2</code> is <code>5.0</code>. Use <code>//</code> if you want an int." },
      { type: "bug", q: "Exam style (like Q4). Which line has the syntax error?", code: `
          def check_payment(price, paid):
              total = paid
              if total = price:
                  print("Exact amount")
                  return True
              return False`,
        bugs: [3], notes: { 3: "<code>=</code> stores; a condition needs <code>==</code>." },
        fixed: `
          def check_payment(price, paid):
              total = paid
              if total == price:
                  print("Exact amount")
                  return True
              return False`,
        hint: "Look for a line that should <i>ask</i> something but <i>stores</i> something instead.", explain: "Because it is a SyntaxError, Python cannot even start: no line runs, not even line 1." },
      { type: "predict", q: "The user types <code>4</code>. What does this print?", code: "x = input()\nprint(x * 3)", stdin: "4", answer: "444",
        hint: "What type does <code>input()</code> give back? What does <code>*</code> do to that type?", explain: "<code>x</code> is the text <code>'4'</code>. Text times 3 repeats it: <code>'444'</code>. To get 12 you need <code>int(x) * 3</code>." },
      { type: "mc", q: "What is <code>int(3.9)</code>?", options: ["<code>3</code>", "<code>4</code>", "<code>3.9</code>", "ValueError"], answer: 0,
        hint: "Does <code>int()</code> round, or chop?", explain: "<code>int()</code> chops off the decimals. It never rounds." },
      { type: "write", q: "Write <code>is_even(n)</code>. It <b>returns</b> <code>True</code> if <code>n</code> is even, otherwise <code>False</code>.",
        starter: `
          def is_even(n):
              # return True if n is even, else False
              pass

          print(is_even(4))`,
        checks: [["is_even(4)", "True"], ["is_even(7)", "False"], ["is_even(0)", "True"]],
        solution: `
          def is_even(n):
              return n % 2 == 0      # remainder 0 when split into 2s`,
        hint: "Even means: divide by 2 and nothing is left over. Which operator gives what is left over?",
        explain: "<code>n % 2 == 0</code> already is True or False, so you can return it directly. No <code>if</code> needed." },
    ],
  };

  /* ================================================================
     TOPIC 2: Control flow
     ================================================================ */

  // --- widget: which branch runs? ---
  function branchWidget(el) {
    const id = "fd-branch-spam";
    const slider = h("input", { type: "range", min: "0", max: "15", value: "7", id });
    const val = h("b", { class: "mono" });
    const codeBox = h("div");
    const steps = h("ol", { class: "fd-checks" });
    const out = h("pre", { class: "st-out" });
    const src = ["if spam > 10:", "    print('big')", "elif spam > 5:", "    print('medium')", "else:", "    print('small')"];
    function draw() {
      const v = +slider.value;
      val.textContent = v;
      const c1 = v > 10, c2 = !c1 && v > 5;
      const ran = c1 ? 2 : c2 ? 4 : 6;
      const checked = c1 ? [1] : [1, 3];
      const dim = [1, 2, 3, 4, 5, 6].filter(n => n !== ran && !checked.includes(n) && !(n === 5 && ran === 6));
      codeBox.replaceChildren(ui.code({ code: src, active: [ran], dim }));
      const li = [];
      li.push(h("li", { html: `<code>spam &gt; 10</code> → <code>${v} &gt; 10</code> → <b class="${c1 ? "fd-t" : "fd-f"}">${c1 ? "True" : "False"}</b>${c1 ? ": run its block, skip everything below." : ": skip its block."}` }));
      if (!c1) li.push(h("li", { html: `<code>spam &gt; 5</code> → <code>${v} &gt; 5</code> → <b class="${c2 ? "fd-t" : "fd-f"}">${c2 ? "True" : "False"}</b>${c2 ? ": run its block, skip the else." : ": skip its block."}` }));
      if (!c1 && !c2) li.push(h("li", { html: "Nothing above was True, so the <code>else</code> block runs." }));
      steps.replaceChildren(...li);
      out.textContent = ran === 2 ? "big" : ran === 4 ? "medium" : "small";
    }
    slider.oninput = draw;
    el.append(row(label("spam =", id), slider, val),
      h("div", { class: "fd-two", style: "margin-top:12px" }, codeBox,
        h("div", null, h("p", { class: "eyebrow" }, "Python checks from the top"), steps, h("p", { class: "eyebrow", style: "margin-top:10px" }, "Output"), out)));
    draw();
  }

  // --- widget: range explorer ---
  function rangeWidget(el) {
    const mk = (id, min, max, v) => h("input", { type: "number", class: "input", id, min, max, value: v, style: "width:5.5em" });
    const a = mk("fd-r-start", -2, 15, 5), b = mk("fd-r-stop", -2, 16, 11), c = mk("fd-r-step", -5, 5, 2);
    const expr = h("p", { style: "margin:12px 0 6px;font-size:16px" });
    const line = h("div");
    const note = h("p", { class: "small muted", style: "margin:8px 0 0" });
    function draw() {
      let A = Math.trunc(+a.value || 0), B = Math.trunc(+b.value || 0), C = Math.trunc(+c.value || 0);
      if (C === 0) { expr.innerHTML = `<code>range(${A}, ${B}, 0)</code> → <span class="fd-err">ValueError: range() arg 3 must not be zero</span>`; line.replaceChildren(); note.textContent = ""; return; }
      const vals = [];
      for (let x = A; C > 0 ? x < B : x > B; x += C) { vals.push(x); if (vals.length > 40) break; }
      expr.innerHTML = `<code>list(range(${A}, ${B}, ${C}))</code> → <code>${pyrepr(vals)}</code>`;
      const lo = Math.min(0, A, B), hi = Math.max(15, A, B);
      const cells = [], marks = {}, below = {};
      for (let x = lo; x <= hi; x++) {
        const i = cells.length;
        cells.push(String(x));
        const k = vals.indexOf(x);
        if (k >= 0) { marks[i] = "held"; below[i] = "#" + (k + 1); }
        else if (x === B) { marks[i] = "outline"; below[i] = "stop"; }
        else marks[i] = "dim";
      }
      line.replaceChildren(D.array(cells, { index: false, marks, below }));
      note.innerHTML = vals.length ? `Starts at ${A}, adds ${C} each time, stops <b>before</b> reaching ${B}. ${vals.length} value${vals.length === 1 ? "" : "s"}.` : `No values: with step ${C} you can never get from ${A} towards ${B}.`;
    }
    [a, b, c].forEach(x => (x.oninput = draw));
    el.append(row(label("start", "fd-r-start"), a, label("stop", "fd-r-stop"), b, label("step", "fd-r-step"), c), expr, line, note);
    draw();
  }

  // --- stepper data: accumulator loop ---
  function accSteps() {
    const S = [{ line: 1, now: "Start the running total at <b>0</b>.", vars: { mysum: "0" }, rounds: [] }];
    let sum = 0;
    const rounds = [];
    for (const i of [5, 7, 9]) {
      S.push({ line: 2, now: rounds.length ? `Next value from the range: <b>i = ${i}</b>.` : `<code>range(5, 11, 2)</code> gives 5, 7, 9. First round: <b>i = ${i}</b>.`, vars: { mysum: String(sum), i: String(i) }, cur: i, rounds: rounds.slice() });
      const before = sum; sum += i;
      rounds.push([i, before, sum]);
      S.push({ line: 3, now: `<code>mysum += i</code> means <code>mysum = mysum + i</code>: ${before} + ${i} = <b>${sum}</b>.`, vars: { mysum: String(sum), i: String(i) }, cur: i, rounds: rounds.slice() });
    }
    S.push({ line: 2, now: "The next value would be 11, but <b>stop is not included</b>. The loop is over.", cur: 11, rounds: rounds.slice() });
    S.push({ line: 4, now: "After the loop (this line is not indented): print the total.", print: String(sum), rounds: rounds.slice() });
    return S;
  }
  function accVisual(el, st) {
    const xs = [5, 6, 7, 8, 9, 10, 11], marks = {}, below = {};
    xs.forEach((x, i) => {
      if (x === 11) { marks[i] = "outline"; below[i] = "stop"; }
      else if (x % 2 === 0) marks[i] = "dim";
      else if (x === st.cur) { marks[i] = "held"; below[i] = "i"; }
      else if (st.rounds.some(r => r[0] === x)) marks[i] = "done";
    });
    el.appendChild(D.array(xs, { index: false, marks, below }));
    if (st.rounds.length) el.appendChild(h("div", { style: "margin-top:10px" }, ui.table({ head: ["round", "i", "mysum before", "mysum after"], num: [0, 1, 2, 3], rows: st.rounds.map((r, k) => [k + 1, r[0], r[1], r[2]]) })));
  }

  // --- stepper data: countdown ---
  function countdownSteps() {
    const S = [{ line: 1, now: "Make <code>n</code> and set it to 3.", vars: { n: "3" } }];
    for (let n = 3; n >= 0; n--) {
      if (n > 0) {
        S.push({ line: 2, now: `Is ${n} &gt; 0? <b>Yes</b>, so run the block (lines 3–4).`, vars: { n: String(n) } });
        S.push({ line: 3, now: `Print ${n}.`, print: String(n) });
        S.push({ line: 4, now: `<code>n = n - 1</code>: ${n} − 1 = <b>${n - 1}</b>. Back up to line 2.`, vars: { n: String(n - 1) } });
      } else S.push({ line: 2, now: "Is 0 &gt; 0? <b>No.</b> The loop stops. Jump to the first line after the block." });
    }
    S.push({ line: 5, now: "Not indented, so it runs once, after the loop.", print: "Blast off!" });
    return S;
  }

  // --- stepper data: transactions with break ---
  function txSteps() {
    const tx = [200, -50, -300, 100];
    const S = [
      { line: 1, now: "A list of 4 transactions.", vars: { transactions: "[200, -50, -300, 100]" }, cur: -1, done: 0 },
      { line: 2, now: "Start with a balance of 100.", vars: { transactions: "[…]", balance: "100" }, cur: -1, done: 0 },
    ];
    let bal = 100;
    for (let k = 0; k < tx.length; k++) {
      const a = tx[k];
      S.push({ line: 3, now: `Next item: <b>amount = ${a}</b>.`, vars: { transactions: "[…]", balance: String(bal), amount: String(a) }, cur: k, done: k });
      const before = bal; bal += a;
      S.push({ line: 4, now: `balance = ${before} + (${a}) = <b>${bal}</b>.`, vars: { transactions: "[…]", balance: String(bal), amount: String(a) }, cur: k, done: k });
      if (bal < 0) {
        S.push({ line: 5, now: `Is ${bal} &lt; 0? <b>Yes!</b>`, cur: k, done: k, bad: true });
        S.push({ line: 6, now: "Print a warning.", print: "overdrawn after " + a, cur: k, done: k, bad: true });
        S.push({ line: 7, now: "<b>break</b>: leave the loop right now. The 100 is never looked at.", cur: k, done: k, bad: true, broke: true });
        break;
      }
      S.push({ line: 5, now: `Is ${bal} &lt; 0? No. Lines 6–7 are skipped. Next round.`, cur: k, done: k });
    }
    S.push({ line: 8, now: "The first line after the loop.", print: "balance: " + bal, cur: -1, done: 3, broke: true });
    return S;
  }
  function txVisual(el, st) {
    const tx = [200, -50, -300, 100], marks = {}, below = {};
    tx.forEach((_, i) => {
      if (i === st.cur) { marks[i] = st.bad ? "swap" : "held"; below[i] = "amount"; }
      else if (i < st.done) marks[i] = "done";
      else if (st.broke && i > 2) { marks[i] = "dim"; below[i] = "never"; }
    });
    el.appendChild(D.array(tx, { name: "transactions", marks, below }));
  }

  // --- widget: break vs continue, side by side ---
  function breakContinue(kind) {
    return el => {
      const src = ["for x in [1, 2, 3, 4, 5]:", "    if x == 3:", "        " + kind + (kind === "break" ? "      # leave the loop" : "   # skip the rest of this round"), "    print(x)"];
      const marks = {}, below = {};
      [1, 2, 3, 4, 5].forEach((x, i) => {
        if (x === 3) { marks[i] = kind === "break" ? "swap" : "cmp"; below[i] = kind; }
        else if (kind === "break" && x > 3) { marks[i] = "dim"; below[i] = "never"; }
        else { marks[i] = "done"; below[i] = "printed"; }
      });
      el.append(h("div", { class: "fd-two" }, ui.code({ code: src }),
        h("div", null, D.array([1, 2, 3, 4, 5], { index: false, marks, below }),
          h("p", { class: "eyebrow", style: "margin-top:10px" }, "Output"),
          h("pre", { class: "st-out" }, kind === "break" ? "1\n2" : "1\n2\n4\n5"),
          h("p", { class: "small", style: "margin:8px 0 0", html: kind === "break" ? "At 3 the loop <b>ends</b>. 4 and 5 are never reached." : "At 3 the <code>print</code> is <b>skipped</b>, then the loop carries on with 4 and 5." }))));
    };
  }

  const controlFlow = {
    id: "control-flow",
    title: "Control flow",
    summary: "<code>if / elif / else</code>, <code>for</code> with <code>range()</code>, <code>while</code>, and <code>break</code> / <code>continue</code>.",
    exam: ["Q2 missing colons", "Q3 if/else", "Q4 if/elif/else", "Q6 loop"],
    sources: "NB §5–6, 17",
    blocks: [
      { type: "h", text: "Decisions: if / elif / else", sub: "Drag the slider. Only one branch ever runs." },
      { type: "table", head: ["Rule", "Tiny example"], code: [1], rows: [
        ["Checks go from the top. The <b>first</b> True one runs. The rest are skipped.", "spam = 12  # 'big' only, not 'medium' too"],
        ["<code>else</code> runs only if everything above was False.", "spam = 2   # 'small'"],
        ["The block is the lines indented 4 spaces under the <code>:</code>", "if x > 0:\n    print('positive')"],
      ] },
      { type: "widget", render: branchWidget },

      { type: "h", text: "for loops and range()", sub: "range gives numbers. Stop is never included." },
      { type: "table", head: ["Python", "Gives", "Read it as"], code: [0], rows: [
        ["range(5)", "0 1 2 3 4", "5 numbers, starting at 0"],
        ["range(2, 6)", "2 3 4 5", "from 2, up to but not including 6"],
        ["range(5, 11, 2)", "5 7 9", "from 5, steps of 2, stop before 11"],
        ["range(10, 0, -3)", "10 7 4 1", "counting down"],
      ] },
      { type: "widget", title: "range() explorer", intro: "Type a start, stop and step. Blue cells are the numbers you get, in order. The outlined cell is stop: never included.", render: rangeWidget },
      {
        type: "stepper",
        title: "A running total (accumulator)",
        code: `
          mysum = 0
          for i in range(5, 11, 2):
              mysum += i
          print(mysum)`,
        what: {
          1: "The accumulator. It must start BEFORE the loop, or it would reset every round.",
          2: "Take the next number from range(5, 11, 2) and call it i. When there are none left, the loop ends.",
          3: "Indented, so it runs once per round. Adds i to the total.",
          4: "Not indented, so it runs once, after the loop has finished.",
        },
        steps: accSteps(),
        visualTitle: "Number line and rounds",
        legend: [["held", "i right now"], ["done", "already added"], ["outline", "stop (not included)"]],
        visual: accVisual,
      },

      { type: "h", text: "while loops", sub: "Repeat while the condition is True. Something must change, or it never stops." },
      {
        type: "stepper",
        title: "Countdown",
        code: `
          n = 3
          while n > 0:
              print(n)
              n = n - 1
          print('Blast off!')`,
        what: {
          1: "Make the counter.",
          2: "Check the condition. True: run the block. False: jump past the block.",
          3: "Inside the loop: print the current n.",
          4: "Inside the loop: change n. Without this line n stays 3 forever.",
          5: "After the loop. Runs once.",
        },
        steps: countdownSteps(),
      },
      {
        type: "tryit",
        title: "An infinite loop (on purpose)",
        task: "<p>This loop forgets to change <code>n</code>. Run it: it never finishes. Press <b>Stop</b>.</p><p>Then add <code>n = n - 1</code> inside the loop and run again. The right answer prints 6.</p>",
        code: `
          n = 3
          total = 0
          while n > 0:
              total = total + n    # n never changes...

          print(total)`,
        expectOutput: "6",
        hint: "The new line must be indented like <code>total = total + n</code>, so it is inside the loop.",
        solution: `
          n = 3
          total = 0
          while n > 0:
              total = total + n
              n = n - 1            # now n gets smaller: 3, 2, 1, 0

          print(total)`,
      },
      { type: "table", caption: "for or while?", head: ["Use", "When", "Tiny example"], code: [2], rows: [
        ["<code>for</code>", "you know how many rounds, or you go through a list", "for x in [3, 1, 2]:"],
        ["<code>while</code>", "repeat until something happens", "while guess != secret:"],
      ] },

      { type: "h", text: "break and continue" },
      { type: "table", head: ["Word", "What it does"], rows: [
        ["<code>break</code>", "leave the loop <b>now</b>. Jump to the first line after the loop."],
        ["<code>continue</code>", "skip the <b>rest of this round</b>. Go straight to the next item."],
      ] },
      { type: "switch", label: "break or continue", items: [
        { label: "break", render: breakContinue("break") },
        { label: "continue", render: breakContinue("continue") },
      ] },
      {
        type: "stepper",
        title: "Course example: stop when overdrawn",
        code: `
          transactions = [200, -50, -300, 100]
          balance = 100
          for amount in transactions:
              balance += amount
              if balance < 0:
                  print('overdrawn after', amount)
                  break
          print('balance:', balance)`,
        what: {
          1: "The list to walk through.",
          2: "The starting balance.",
          3: "Each round, amount is the next item of the list.",
          4: "Add this transaction to the balance.",
          5: "Did we go below zero?",
          6: "Warn the user.",
          7: "Leave the loop at once.",
          8: "After the loop.",
        },
        steps: txSteps(),
        visualTitle: "The list",
        legend: [["held", "current item"], ["done", "already used"], ["swap", "the one that broke it"], ["dim", "never reached"]],
        visual: txVisual,
      },

      { type: "h", text: "Ask until told to stop", sub: "while True + input() + break" },
      {
        type: "tryit",
        title: "Keep asking until 'quit'",
        task: "Each line in the typed-input box is one answer. Add more lines, or remove <code>quit</code> and see the error.",
        code: `
          entries = []
          while True:                                    # loop "forever"...
              text = input("Enter something (or 'quit' to stop): ")
              if text == 'quit':
                  break                                  # ...until this runs
              entries.append(text)

          print(entries)`,
        stdin: "apple\nbanana\nquit",
      },
      { type: "callout", kind: "warn", title: "Assignment 1 had this bug", html: "<p>The prompt said “type <b>quit</b>”, but the code checked <code>if text == 'done'</code>. The loop could never end. The word you check must match the word you ask for.</p>" },
      { type: "mistakes", items: [
        { title: "Missing colon (exam Q2)", wrong: "if x > 5\n    print(x)", right: "if x > 5:\n    print(x)", why: "<code>if</code>, <code>elif</code>, <code>else</code>, <code>for</code>, <code>while</code> and <code>def</code> lines all end with <code>:</code>. Otherwise: SyntaxError." },
        { title: "Off by one: stop is not included", wrong: "for i in range(1, 10):   # 1..9", right: "for i in range(1, 11):   # 1..10", why: "To include 10, stop must be 11." },
        { title: "Forgetting to change the loop variable", wrong: "while n > 0:\n    print(n)", right: "while n > 0:\n    print(n)\n    n = n - 1", why: "If nothing changes <code>n</code>, the condition stays True forever." },
        { title: "Printing inside the loop by accident", wrong: "total = 0\nfor i in range(3):\n    total += i\n    print(total)    # 3 lines", right: "total = 0\nfor i in range(3):\n    total += i\nprint(total)        # 1 line: 3", why: "Indentation decides: indented = once per round; not indented = once after the loop." },
        { title: "Skipping the last item", wrong: "for i in range(len(x) - 1):\n    print(x[i])", right: "for item in x:\n    print(item)", why: "<code>range(len(x) - 1)</code> stops one early. Use it only when you also look at <code>x[i + 1]</code>." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "for i in range(5, 11, 2):\n    print(i)", answer: "5\n7\n9",
        hint: "Start at 5, add 2 each time, stop <b>before</b> 11.", explain: "5, 7, 9. The next would be 11, but stop is never included. Each <code>print</code> makes a new line." },
      { type: "bug", q: "Exam Q2 (last year). Click every line with a syntax error.", code: `
          def has_stock(stock, item_index):
              if stock[item_index] > 0
                  return True
              else
                  retrun False`,
        bugs: [2, 4, 5], notes: { 2: "missing <code>:</code> at the end", 4: "missing <code>:</code> after <code>else</code>", 5: "<code>retrun</code> is misspelled: <code>return</code>" },
        fixed: `
          def has_stock(stock, item_index):
              if stock[item_index] > 0:
                  return True
              else:
                  return False`,
        hint: "Check the end of every <code>if</code>/<code>else</code> line, and the spelling of every keyword.", explain: "In the exam, list each error <b>with its line number</b>, then write the corrected code." },
      { type: "predict", q: "What does this print?", code: "n = 10\nwhile n > 1:\n    n = n // 2\n    print(n)", answer: "5\n2\n1",
        hint: "Track n round by round: 10 // 2 is 5, then …", explain: "10 → 5 → 2 → 1. When n is 1, <code>1 &gt; 1</code> is False and the loop stops." },
      { type: "mc", q: "What does <code>continue</code> do inside a loop?", options: ["Stops the loop completely", "Skips the rest of this round and goes on with the next one", "Starts the loop again from the first item", "Leaves the function"], answer: 1,
        hint: "Compare with <code>break</code>, which is the one that stops the loop.", explain: "<code>continue</code> jumps to the next round. <code>break</code> leaves the loop. <code>return</code> leaves the whole function." },
      { type: "predict", q: "What does this print?", code: "for x in [4, 7, 2, 9]:\n    if x > 5:\n        continue\n    print(x)", answer: "4\n2",
        hint: "For which numbers is the <code>print</code> skipped?", explain: "7 and 9 are bigger than 5, so <code>continue</code> skips their <code>print</code>. Only 4 and 2 are printed." },
      { type: "write", q: "Write <code>sum_even_below(n)</code>: it <b>returns</b> the sum of all even numbers from 0 up to, but not including, <code>n</code>. Use a loop (not <code>sum()</code>). Example: <code>sum_even_below(10)</code> is 0 + 2 + 4 + 6 + 8 = 20.",
        starter: `
          def sum_even_below(n):
              total = 0
              # your loop here

              return total

          print(sum_even_below(10))`,
        checks: [["sum_even_below(10)", "20"], ["sum_even_below(40)", "380"], ["sum_even_below(1)", "0"], ["sum_even_below(3)", "2"]],
        solution: `
          def sum_even_below(n):
              total = 0
              for i in range(0, n, 2):   # 0, 2, 4, ... stops before n
                  total += i
              return total               # after the loop, not inside it`,
        hint: "<code>range(0, n, 2)</code> gives exactly the even numbers below n. Add each one to <code>total</code>.",
        explain: "A <code>while</code> loop works too: start <code>i = 0</code>, loop <code>while i &lt; n</code>, add i, then <code>i += 2</code>." },
    ],
  };

  /* ================================================================
     TOPIC 3: Functions & scope
     ================================================================ */

  // --- widget: function machine (return vs print) ---
  function machineWidget(el) {
    let mode = "return";
    const id = "fd-mach-x";
    const x = h("input", { type: "range", min: "0", max: "9", value: "3", id });
    const xv = h("b", { class: "mono" });
    const seg = h("div", { class: "seg", role: "group", "aria-label": "Function version" });
    const modes = [["return", "return x + 1"], ["print", "print(x + 1)"]];
    modes.forEach(([m, t]) => seg.appendChild(h("button", { type: "button", onclick: () => { mode = m; draw(); } }, t)));
    const codeBox = h("div"), pic = h("div"), result = h("div");
    function draw() {
      const X = +x.value, ret = mode === "return";
      xv.textContent = X;
      [...seg.children].forEach((b, i) => b.setAttribute("aria-pressed", String(modes[i][0] === mode)));
      codeBox.replaceChildren(ui.code({ code: ["def add_one(x):", "    " + (ret ? "return x + 1" : "print(x + 1)"), "", `y = add_one(${X})`, "print(y + 1)"] }));
      const S = D.svg({ w: 420, h: 230, label: "function machine" });
      S.text(110, 14, `x = ${X}`, { size: 14 });
      S.arrow(110, 26, 110, 58, { tone: "accent" });
      S.box(40, 62, 140, 74, { text: "add_one", sub: ret ? "return x + 1" : "print(x + 1)", tone: "accent" });
      // screen
      S.box(260, 62, 140, 74, { text: ret ? "" : String(X + 1), sub: "screen", tone: ret ? null : "cmp" });
      S.arrow(184, 99, 254, 99, { tone: ret ? "muted" : "cmp", dashed: ret });
      S.text(330, 152, ret ? "nothing printed" : "print shows it", { muted: true, ui: true });
      // bottom output
      S.arrow(110, 140, 110, 176, { tone: ret ? "done" : "swap" });
      S.box(55, 180, 110, 40, { text: ret ? String(X + 1) : "None", tone: ret ? "done" : "swap" });
      S.text(180, 200, ret ? "← given back to y" : "← y gets None", { anchor: "start", muted: true, ui: true });
      pic.replaceChildren(S.el);
      result.innerHTML = ret
        ? `<p class="fd-good"><code>y</code> is <b>${X + 1}</b>, so <code>print(y + 1)</code> shows <b>${X + 2}</b>.</p>`
        : `<p class="fd-badp">The screen showed ${X + 1}, but nothing came back: <code>y</code> is <b>None</b>. <code>print(y + 1)</code> crashes:<br><code class="fd-err">TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'</code></p>`;
    }
    x.oninput = draw;
    el.append(row(seg, h("span", { style: "width:12px" }), label("x =", id), x, xv), h("div", { class: "fd-two", style: "margin-top:12px" }, h("div", null, codeBox, result), pic));
    draw();
  }

  // --- stepper data: call stack ---
  const G = (more) => Object.assign({ balance: "100", apply_interest: "<function>" }, more || {});
  const interestSteps = [
    { line: 1, now: "A <b>global</b> variable: made at the top level, outside any function.", frames: [{ name: "global", vars: { balance: "100" } }] },
    { line: 3, now: "<code>def</code> only <b>defines</b> the function. Its body does not run yet. Python skips to line 8.", frames: [{ name: "global", vars: G() }] },
    { line: 8, now: "The call. Python makes a <b>new frame</b> for it. Parameter <code>balance</code> gets 100. <code>rate</code> keeps its default 0.05. <code>years=2</code> is given by keyword.",
      frames: [{ name: "global", vars: G() }, { name: "apply_interest(100, years=2)", vars: { balance: "100", rate: "0.05", years: "2" } }] },
    { line: 4, now: "First round: <b>year = 0</b>.", frames: [{ name: "global", vars: G() }, { name: "apply_interest(100, years=2)", vars: { balance: "100", rate: "0.05", years: "2", year: "0" } }] },
    { line: 5, now: "100 × 1.05 = <b>105.0</b>. This changes the <b>local</b> balance only. The global one is still 100.", frames: [{ name: "global", vars: G() }, { name: "apply_interest(100, years=2)", vars: { balance: "105.0", rate: "0.05", years: "2", year: "0" } }] },
    { line: 4, now: "Second round: <b>year = 1</b>.", frames: [{ name: "global", vars: G() }, { name: "apply_interest(100, years=2)", vars: { balance: "105.0", rate: "0.05", years: "2", year: "1" } }] },
    { line: 5, now: "105.0 × 1.05 = <b>110.25</b>.", frames: [{ name: "global", vars: G() }, { name: "apply_interest(100, years=2)", vars: { balance: "110.25", rate: "0.05", years: "2", year: "1" } }] },
    { line: 4, now: "<code>range(2)</code> has no more numbers. The loop is over." },
    { line: 6, now: "<b>return</b> hands 110.25 back to the caller and ends the function. Its frame is thrown away: the local <code>balance</code>, <code>rate</code>, <code>years</code> and <code>year</code> are gone.", frames: [{ name: "global", vars: G() }, { name: "apply_interest(100, years=2)", vars: { balance: "110.25", rate: "0.05", years: "2", year: "1" }, note: "returning 110.25" }] },
    { line: 8, now: "Back in the global frame. The returned value gets the name <code>new</code>.", frames: [{ name: "global", vars: G({ new: "110.25" }) }] },
    { line: 9, now: "The global <code>balance</code> was never touched.", print: "100 110.25" },
  ];

  // --- stepper data: return inside vs after the loop ---
  function countBigSteps(inside) {
    const nums = [12, 3, 15];
    const S = [{ line: 8, now: "Call <code>count_big([12, 3, 15])</code>.", vars: {}, cur: -1, seen: 0 }];
    S.push({ line: 1, now: "<code>numbers</code> is now [12, 3, 15].", vars: { numbers: "[12, 3, 15]" }, cur: -1, seen: 0 });
    let count = 0;
    S.push({ line: 2, now: "Start counting at 0.", vars: { numbers: "[…]", count: "0" }, cur: -1, seen: 0 });
    for (let k = 0; k < nums.length; k++) {
      const n = nums[k];
      S.push({ line: 3, now: `Next number: <b>n = ${n}</b>.`, vars: { numbers: "[…]", count: String(count), n: String(n) }, cur: k, seen: k });
      if (n > 10) {
        S.push({ line: 4, now: `Is ${n} &gt; 10? <b>Yes.</b>`, cur: k, seen: k });
        count++;
        S.push({ line: 5, now: `count goes up to <b>${count}</b>.`, vars: { numbers: "[…]", count: String(count), n: String(n) }, cur: k, seen: k });
      } else S.push({ line: 4, now: `Is ${n} &gt; 10? No. Skip line 5.`, cur: k, seen: k });
      if (inside) {
        S.push({ line: 6, now: `<b>return</b> is inside the loop, so it runs in the <b>first</b> round. The function ends with count = ${count}. ${nums.length - 1} numbers are never checked!`, cur: k, seen: k + 1, stopped: true });
        S.push({ line: 8, now: "Wrong answer: 1 instead of 2.", print: String(count), vars: {}, cur: -1, seen: 1, stopped: true });
        return S;
      }
    }
    S.push({ line: 6, now: `The loop is done. <b>Now</b> return count = ${count}.`, cur: -1, seen: 3 });
    S.push({ line: 8, now: "Right answer.", print: String(count), vars: {}, cur: -1, seen: 3 });
    return S;
  }
  const countBigCode = inside => `
    def count_big(numbers):
        count = 0
        for n in numbers:
            if n > 10:
                count += 1
    ${inside ? "        return count     # inside the loop!" : "    return count         # after the loop"}

    print(count_big([12, 3, 15]))`;
  const countBigVisual = (el, st) => {
    const marks = {}, below = {};
    [12, 3, 15].forEach((_, i) => {
      if (i === st.cur) { marks[i] = "held"; below[i] = "n"; }
      else if (i < st.seen) marks[i] = "done";
      else if (st.stopped) { marks[i] = "dim"; below[i] = "skipped"; }
    });
    el.appendChild(D.array([12, 3, 15], { name: "numbers", marks, below }));
  };
  const countBigStepper = inside => ({
    type: "stepper",
    title: inside ? "return inside the loop (bug)" : "return after the loop (right)",
    code: countBigCode(inside),
    what: { 1: "Defines the function.", 2: "The counter starts at 0, before the loop.", 3: "Go through the numbers one by one.", 4: "Is this number big?", 5: "Count it.", 6: inside ? "Indented 8 spaces: part of the loop body." : "Indented 4 spaces: part of the function, but after the loop.", 8: "Call the function and print what it returns." },
    steps: countBigSteps(inside),
    visual: countBigVisual,
  });

  // --- widget: Local → Enclosing → Global search ---
  function legWidget(el) {
    const on = { g: true, e: true, l: false };
    const boxes = {};
    const opts = [["l", "inner: x = 'local'"], ["e", "outer: x = 'enclosing'"], ["g", "top: x = 'global'"]];
    const checks = h("div", { class: "row-wrap" });
    opts.forEach(([k, t]) => {
      const cb = h("input", { type: "checkbox", checked: on[k], id: "fd-leg-" + k });
      cb.onchange = () => { on[k] = cb.checked; draw(); };
      boxes[k] = cb;
      checks.appendChild(h("label", { class: "understood", for: "fd-leg-" + k, style: "font-weight:400" }, cb, h("code", null, t)));
    });
    const codeBox = h("div"), beam = h("div", { class: "fd-beam" }), out = h("pre", { class: "st-out" });
    function draw() {
      const L = (k, txt) => (on[k] ? txt : txt.replace(/^(\s*)/, "$1# "));
      const src = [L("g", "x = 'global'"), "", "def outer():", L("e", "    x = 'enclosing'"), "    def inner():", L("l", "        x = 'local'"), "        print(x)", "    inner()", "", "outer()"];
      codeBox.replaceChildren(ui.code({ code: src, active: [7], dim: [on.g ? 0 : 1, on.e ? 0 : 4, on.l ? 0 : 6] }));
      const order = [["l", "Local", "inside inner()"], ["e", "Enclosing", "inside outer()"], ["g", "Global", "top of the file"], ["b", "Built-in", "Python's own names"]];
      const found = order.find(([k]) => on[k]);
      beam.replaceChildren();
      let stopped = false;
      order.forEach(([k, name, where], i) => {
        const hit = !stopped && on[k];
        const looked = !stopped;
        beam.appendChild(h("div", { class: "fd-scope" + (hit ? " hit" : looked ? " miss" : " skip") },
          h("b", null, name), h("span", { class: "small muted" }, where),
          h("span", { class: "small" }, hit ? "found x ✓" : looked ? "no x here" : "not checked")));
        if (hit) stopped = true;
        if (i < order.length - 1) beam.appendChild(h("span", { class: "fd-arrow", "aria-hidden": "true" }, "→"));
      });
      out.textContent = found ? (found[0] === "l" ? "local" : found[0] === "e" ? "enclosing" : "global") : "NameError: name 'x' is not defined";
      out.classList.toggle("fd-err", !found);
    }
    el.append(checks, h("div", { class: "fd-two", style: "margin-top:12px" }, codeBox,
      h("div", null, h("p", { class: "eyebrow" }, "print(x) looks for x in this order and stops at the first hit"), beam, h("p", { class: "eyebrow", style: "margin-top:10px" }, "Output"), out)));
    draw();
  }

  const functions = {
    id: "functions",
    title: "Functions & scope",
    summary: "<code>def</code>, <code>return</code> vs <code>print</code>, default and keyword arguments, functions as values, and local vs global variables.",
    exam: ["Every question is a function", "Q4 print vs return"],
    sources: "NB §9–12",
    blocks: [
      { type: "h", text: "Define once, call many times" },
      { type: "code", caption: "The parts of a function", code: `
          def add_one(x):                    # def, a name, parameters in brackets, a colon
              """Assumes x is a number. Returns x + 1."""
              result = x + 1                 # the body: indented 4 spaces
              return result                  # hand the value back to the caller

          y = add_one(4)                     # call it: x becomes 4, y becomes 5` },
      { type: "table", head: ["Word", "Meaning", "In the example"], code: [2], rows: [
        ["parameter", "the name in the <code>def</code> line", "x"],
        ["argument", "the value you pass in the call", "4"],
        ["return value", "what the call turns into", "5"],
        ["docstring", "“Assumes… Returns…”: what goes in and what comes out", "\"\"\"Assumes x is a number…\"\"\""],
      ] },

      { type: "h", text: "return vs print", sub: "The most important idea on this page." },
      { type: "widget", intro: "Switch between the two versions. <code>print</code> only shows a value. <code>return</code> gives it back so you can keep using it.", render: machineWidget },
      { type: "table", head: ["", "<code>return x</code>", "<code>print(x)</code>"], rows: [
        ["gives a value back to the caller?", "<span class='ok'>yes</span>", "<span class='bad'>no</span> (the call gives <code>None</code>)"],
        ["shows something on screen?", "no", "yes"],
        ["ends the function?", "yes, at once", "no"],
        ["use it when…", "the result is needed later (almost always)", "you only want to show something"],
      ] },
      { type: "callout", kind: "exam", title: "Exam tip", html: "<p>When the exam says “write a function that <b>returns</b> …”, you must use <code>return</code>. A function that only prints gives back <code>None</code>, and a test like <code>has_stock(stock, 1) == True</code> fails.</p>" },

      { type: "h", text: "Each call gets its own variables", sub: "Watch the call stack: a frame appears for the call and disappears at return." },
      {
        type: "stepper",
        title: "apply_interest: defaults, keywords and local variables",
        code: `
          balance = 100

          def apply_interest(balance, rate=0.05, years=1):
              for year in range(years):
                  balance = balance * (1 + rate)
              return balance

          new = apply_interest(balance, years=2)
          print(balance, new)`,
        what: {
          1: "A global variable.",
          3: "Defines a function with 3 parameters. rate and years have default values.",
          4: "Repeat once per year.",
          5: "Grow the balance by the rate. This balance is the parameter, a local variable.",
          6: "Give the result back. The function ends here.",
          8: "Call the function and store what it returns in new.",
          9: "Show both values.",
        },
        steps: interestSteps,
      },
      { type: "table", caption: "Default and keyword arguments", head: ["Call", "balance", "rate", "years"], code: [0], rows: [
        ["apply_interest(100)", "100", "0.05 <span class='muted'>(default)</span>", "1 <span class='muted'>(default)</span>"],
        ["apply_interest(100, 0.1)", "100", "0.1", "1 <span class='muted'>(default)</span>"],
        ["apply_interest(100, years=3)", "100", "0.05 <span class='muted'>(default)</span>", "3"],
      ] },

      { type: "h", text: "Where does return go?", sub: "Inside the loop, it quits after the first round. This was a real bug in Assignment 1." },
      { type: "switch", label: "Where return is", items: [
        { label: "After the loop (right)", blocks: [countBigStepper(false)] },
        { label: "Inside the loop (bug)", blocks: [countBigStepper(true)] },
      ] },

      { type: "h", text: "More than one return value" },
      { type: "code", code: `
          def add_diff(a, b):
              return a + b, a - b     # gives back a tuple: (8, 2)

          s, d = add_diff(5, 3)       # unpack: s is 8, d is 2
          x, y = y, x                 # the same trick swaps two variables` },

      { type: "h", text: "Functions are values too", sub: "Without brackets you pass the function. With brackets you call it." },
      { type: "code", code: `
          def apply_to_string(func, text):
              return func(text)                 # call whatever function was passed in

          apply_to_string(str.upper, 'ymca')    # 'YMCA'
          apply_to_string(len, 'ymca')          # 4` },

      { type: "h", text: "Scope: local and global" },
      { type: "table", head: ["Rule", "Tiny example"], code: [1], rows: [
        ["A variable made inside a function is <b>local</b>. It is gone after the function returns.", "def f():\n    fee = 5\nf()\nprint(fee)    # NameError"],
        ["A function may <b>read</b> a global variable.", "rate = 2\ndef f():\n    return rate * 3    # 6"],
        ["If a function <b>assigns</b> to a name anywhere, that name is local in the whole function.", "def f():\n    print(n)    # UnboundLocalError\n    n = 0"],
        ["To change a global, <code>return</code> the new value (or use <code>global</code>, rarely).", "total = add(total, 5)"],
      ] },
      { type: "widget", title: "Where does Python find x?", intro: "Tick which <code>x = …</code> lines exist. <code>print(x)</code> searches Local → Enclosing → Global → Built-in and stops at the first hit.", render: legWidget },
      {
        type: "tryit",
        title: "Read vs assign",
        task: "Run it. The first function works, the second crashes. Why? (Answer: line 8 assigns to <code>balance</code>, so Python treats it as local in the whole function, and line 7 reads it too early.)",
        code: `
          balance = 100

          def show_balance():
              print('current balance:', balance)   # only reads the global: fine

          def show_balance_broken():
              print('current balance:', balance)   # UnboundLocalError
              balance = 0                          # this line makes balance local

          show_balance()
          show_balance_broken()`,
      },
      {
        type: "tryit",
        title: "print vs return, for real",
        task: "Run it. Then change <code>print(x + 1)</code> to <code>return x + 1</code> and run again.",
        code: `
          def add_one(x):
              print(x + 1)      # try: return x + 1

          y = add_one(3)
          print('y is', y)`,
      },
      { type: "mistakes", items: [
        { title: "Printing instead of returning", wrong: "def total(a, b):\n    print(a + b)", right: "def total(a, b):\n    return a + b", why: "The caller gets <code>None</code>. Anything that uses the result later breaks." },
        { title: "<code>return</code> inside the loop", wrong: "for t in tweets:\n    if year(t) == y:\n        count += 1\n    return count", right: "for t in tweets:\n    if year(t) == y:\n        count += 1\nreturn count", why: "The function ends in the first round. Move <code>return</code> out of the loop (4 spaces left)." },
        { title: "Brackets when passing a function", wrong: "apply_to_string(str.upper(), 'ymca')", right: "apply_to_string(str.upper, 'ymca')", why: "<code>str.upper()</code> tries to <i>call</i> it right now (TypeError). You want to pass the function itself." },
        { title: "Quoted name instead of the variable", wrong: "count_occurrences('tweet', 'python')", right: "count_occurrences(tweet, 'python')", why: "<code>'tweet'</code> is just the 5-letter text. <code>tweet</code> is your variable." },
        { title: "Using a local variable outside", wrong: "def f():\n    fee = 5\nf()\nprint(fee)", right: "def f():\n    fee = 5\n    return fee\nfee = f()\nprint(fee)", why: "Local names vanish when the function ends. Return the value and store it." },
        { title: "A list as a default value", wrong: "def add(item, items=[]):", right: "def add(item, items=None):\n    if items is None:\n        items = []", why: "The same list is reused by every call, so items pile up between calls." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "def add_one(x):\n    print(x + 1)\n\ny = add_one(2)\nprint(y)", answer: "3\nNone",
        hint: "Two things print: one inside the function, one at the end. What does a function without <code>return</code> give back?", explain: "The call prints 3. It has no <code>return</code>, so <code>y</code> is <code>None</code>, and the last line prints None." },
      { type: "mc", q: "What happens when this runs?", code: "def make_fee():\n    fee = 5\n    return fee * 2\n\nmake_fee()\nprint(fee)", options: ["It prints 5", "It prints 10", "NameError: name 'fee' is not defined", "It prints None"], answer: 2,
        hint: "Where was <code>fee</code> made? Does it still exist after the function returns?", explain: "<code>fee</code> is local to <code>make_fee</code>. After the call it is gone. (Also, the 10 that was returned is not stored anywhere.)" },
      { type: "bug", q: "This should count the numbers above 10, but <code>count_big([12, 3, 15])</code> gives 1. Click the line that causes it.", code: `
          def count_big(numbers):
              count = 0
              for n in numbers:
                  if n > 10:
                      count += 1
                  return count`,
        bugs: [6], notes: { 6: "<code>return</code> is inside the loop, so the function quits after the first number." },
        fixed: `
          def count_big(numbers):
              count = 0
              for n in numbers:
                  if n > 10:
                      count += 1
              return count          # 4 spaces left: after the loop`,
        hint: "Every line is valid Python. Look at the indentation: which line runs once per round but should run once at the end?", explain: "This is a <b>logic</b> error: no crash, just a wrong answer. Those are the hardest to spot." },
      { type: "predict", q: "What does this print?", code: "x = 10\n\ndef change():\n    x = 99\n    return x\n\nprint(change(), x)", answer: "99 10",
        hint: "Inside <code>change</code>, <code>x = 99</code> makes a new local x.", explain: "The function returns its local x (99). The global x was never changed, so it is still 10." },
      { type: "write", q: "Write <code>sum_multiples(n, a, b)</code>. It <b>returns</b> the sum of all numbers from 1 to n (including n) that are a multiple of <code>a</code> or of <code>b</code>. Example: <code>sum_multiples(10, 3, 5)</code> is 3 + 5 + 6 + 9 + 10 = 33.",
        starter: `
          def sum_multiples(n, a, b):
              """Assumes n is an int. Returns the sum of all multiples of a or b up to n."""
              total = 0
              # your loop here

              return total

          print(sum_multiples(10, 3, 5))`,
        checks: [["sum_multiples(10, 3, 5)", "33"], ["sum_multiples(15, 3, 5)", "60"], ["sum_multiples(20, 4, 6)", "84"], ["sum_multiples(1, 3, 5)", "0"]],
        solution: `
          def sum_multiples(n, a, b):
              """Assumes n is an int. Returns the sum of all multiples of a or b up to n."""
              total = 0
              for i in range(1, n + 1):              # 1 .. n, so stop is n + 1
                  if i % a == 0 or i % b == 0:       # a multiple leaves no remainder
                      total += i
              return total                           # after the loop, not inside it`,
        hint: "Loop over <code>range(1, n + 1)</code>. A multiple of a gives <code>i % a == 0</code>. Join two conditions with <code>or</code>.",
        explain: "Watch the three classic traps: stop must be <code>n + 1</code>, use <code>or</code> (not <code>and</code>), and <code>return</code> after the loop." },
      { type: "explain", q: "In 2–3 sentences, explain the difference between <code>return</code> and <code>print</code> inside a function. (Exam Q4 asked you to judge a function that printed instead of returning.)",
        answer: "<p><code>print</code> only shows a value on the screen; the function still gives back <code>None</code>, so the caller cannot use the result. <code>return</code> hands the value back to the caller and ends the function at once, so the result can be stored, tested or used in more calculations.</p>",
        points: ["print shows, return gives back", "no return → the call gives None", "return ends the function immediately"],
        hint: "Think about what <code>y</code> is after <code>y = f(3)</code> in each case." },
    ],
  };

  /* ================================================================
     TOPIC 4: Strings
     ================================================================ */

  // Python's slice rules (same as CPython's PySlice_AdjustIndices)
  function pySlice(n, start, stop, step) {
    step = step == null ? 1 : step;
    const lower = step > 0 ? 0 : -1, upper = step > 0 ? n : n - 1;
    const fix = (v, def) => {
      if (v == null) return def;
      if (v < 0) { v += n; if (v < lower) v = lower; } else if (v > upper) v = upper;
      return v;
    };
    const a = fix(start, step > 0 ? lower : upper), b = fix(stop, step > 0 ? upper : lower);
    const out = [];
    if (step > 0) for (let i = a; i < b; i += step) out.push(i); else for (let i = a; i > b; i += step) out.push(i);
    return { idx: out, a, b };
  }

  // --- widget: slicing ruler ---
  function sliceWidget(el) {
    const st = { s: "abcdefgh", start: 2, stop: 6, step: null };
    const text = h("input", { class: "input", id: "fd-sl-s", maxlength: "12", value: st.s, spellcheck: "false", style: "width:11em" });
    const ctrl = {};
    const ctrlRow = h("div", { class: "fd-slctl" });
    ["start", "stop", "step"].forEach(k => {
      const id = "fd-sl-" + k;
      const r = h("input", { type: "range", id, "aria-label": k });
      const cb = h("input", { type: "checkbox", id: id + "-on", "aria-label": "use " + k });
      const v = h("b", { class: "mono", style: "min-width:2.5ch;display:inline-block" });
      ctrl[k] = { r, cb, v };
      cb.onchange = () => { st[k] = cb.checked ? (k === "step" ? 1 : +r.value) : null; draw(); };
      r.oninput = () => { let x = +r.value; if (k === "step" && x === 0) x = st.step && st.step > 0 ? -1 : 1; st[k] = x; cb.checked = true; draw(); };
      ctrlRow.appendChild(h("div", { class: "fd-slrow" }, h("label", { for: id + "-on", class: "small" }, cb, " " + k), r, v));
    });
    const presets = h("div", { class: "row-wrap" });
    [["s[3:6]", 3, 6, null], ["s[:3]", null, 3, null], ["s[-3:]", -3, null, null], ["s[::2]", null, null, 2], ["s[::-1]", null, null, -1], ["s[6:2:-1]", 6, 2, -1], ["s[2:100]", 2, 100, null]]
      .forEach(([t, a, b, c]) => presets.appendChild(h("button", { type: "button", class: "btn small mono", onclick: () => { st.start = a; st.stop = b; st.step = c; draw(); } }, t)));
    const expr = h("div", { class: "fd-slexpr", "aria-live": "polite" });
    const ruler = h("div", { class: "fd-ruler" });
    const explain = h("p", { class: "small", style: "margin:6px 0 0" });
    // single index part
    const iSl = h("input", { type: "range", id: "fd-sl-i", value: "0" });
    const iOut = h("p", { style: "margin:6px 0 0" });

    function draw() {
      const s = st.s, n = s.length;
      ["start", "stop"].forEach(k => {
        const c = ctrl[k];
        c.r.min = String(-n - 2); c.r.max = String(n + 2);
        if (st[k] != null) c.r.value = String(Math.max(-n - 2, Math.min(n + 2, st[k])));
        c.cb.checked = st[k] != null; c.r.classList.toggle("fd-off", st[k] == null);
        c.v.textContent = st[k] == null ? "–" : String(st[k]);
      });
      const c = ctrl.step;
      c.r.min = "-3"; c.r.max = "3";
      if (st.step != null) c.r.value = String(st.step);
      c.cb.checked = st.step != null; c.r.classList.toggle("fd-off", st.step == null);
      c.v.textContent = st.step == null ? "–" : String(st.step);
      const str = v => (v == null ? "" : String(v));
      const ex = "s[" + str(st.start) + ":" + str(st.stop) + (st.step != null ? ":" + st.step : "") + "]";
      const { idx, a, b } = pySlice(n, st.start, st.stop, st.step);
      const result = idx.map(i => s[i]).join("");
      expr.innerHTML = `<code>${PADS.esc(ex)}</code> <span class="muted">→</span> <code class="fd-ok">${PADS.esc(pyrepr(result))}</code>`;
      const marks = {}, below = {};
      for (let i = 0; i < n; i++) marks[i] = "dim";
      idx.forEach((i, k) => { marks[i] = "held"; below[i] = "#" + (k + 1); });
      if (b >= 0 && b < n && !idx.includes(b)) { marks[b] = "outline"; below[b] = "stop"; }
      ruler.replaceChildren(D.array(s.split(""), { negIndex: true, marks, below }));
      const step = st.step == null ? 1 : st.step;
      const startTxt = st.start == null ? (step > 0 ? "the beginning" : "the end") : "index " + st.start + (st.start < 0 ? " (= " + a + ")" : "");
      const stopTxt = st.stop == null ? (step > 0 ? "the end (included)" : "the beginning (included)") : "index " + st.stop + (st.stop < 0 ? " (= " + (st.stop + n) + ")" : "") + ", <b>not included</b>" + (st.stop > n ? ". It is past the end, which is fine: slices never crash" : "");
      explain.innerHTML = `Start at ${startTxt}, take every ${step === 1 ? "" : step === -1 ? "" : Math.abs(step) + "th "}character${step < 0 ? " going <b>backwards</b>" : ""}, stop at ${stopTxt}.`;
      iSl.min = String(-n - 1); iSl.max = String(n);
      const i = +iSl.value;
      iOut.innerHTML = i >= n || i < -n
        ? `<code>s[${i}]</code> → <code class="fd-err">IndexError: string index out of range</code> <span class="small muted">(valid: ${-n} to ${n - 1})</span>`
        : `<code>s[${i}]</code> → <code class="fd-ok">${PADS.esc(pyrepr(s[(i + n) % n]))}</code>`;
    }
    text.oninput = () => { st.s = text.value || "a"; draw(); };
    iSl.oninput = draw;
    el.append(
      row(label("s =", "fd-sl-s"), text),
      h("p", { class: "small muted", style: "margin:10px 0 6px" }, "Try one:"), presets,
      h("div", { style: "margin-top:12px" }, ctrlRow),
      expr, ruler, explain,
      h("div", { class: "fd-single" }, row(label("One character: i =", "fd-sl-i"), iSl), iOut));
    draw();
  }

  // --- widget: immutability ---
  function immutableWidget(el) {
    const s = "hello";
    const msg = h("p", { class: "small", style: "margin:8px 0 0", "aria-live": "polite" }, "Click a letter to try to change it.");
    const cells = h("div", { class: "a-cells" });
    s.split("").forEach((ch, i) => {
      const b = h("button", { type: "button", class: "a-val fd-letter", "aria-label": `change s[${i}]` }, ch);
      b.onclick = () => {
        b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake");
        msg.innerHTML = `<code>s[${i}] = 'y'</code> → <code class="fd-err">TypeError: 'str' object does not support item assignment</code>`;
      };
      cells.appendChild(h("div", { class: "a-cell" }, h("span", { class: "a-idx" }, String(i)), b));
    });
    const newRow = h("div", { hidden: true, style: "margin-top:12px" });
    const bNew = h("button", { type: "button", class: "btn small" }, "Build a new string: s = 'y' + s[1:]");
    bNew.onclick = () => {
      newRow.hidden = false;
      newRow.replaceChildren(D.array("yello".split(""), { name: "s", marks: { 0: "done" } }),
        h("p", { class: "small", style: "margin:6px 0 0", html: "A <b>new</b> string. The name <code>s</code> now points at it (new id). The old <code>'hello'</code> was never changed." }));
      oldName.textContent = "(old)";
    };
    const oldName = h("div", { class: "a-name" }, "s");
    el.append(h("div", { class: "arr" }, oldName, cells), msg, h("div", { style: "margin-top:10px" }, bNew), newRow);
  }

  // --- stepper data: loop over a string ---
  function charSteps() {
    const s = "Hi 5!";
    const S = [];
    const yes = b => (b ? "True" : "False");
    s.split("").forEach((c, i) => {
      const alpha = /[A-Za-z]/.test(c), up = /[A-Z]/.test(c), dig = /[0-9]/.test(c);
      S.push({ line: 1, now: `Next character: <b>char = ${pyrepr(c)}</b>.`, vars: { char: pyrepr(c) }, cur: i, chk: null });
      S.push({ line: 2, now: `Ask the character three questions.${c === " " ? " A space is not a letter and not a digit." : ""}`, print: `${c} ${yes(alpha)} ${yes(up)} ${yes(dig)}`, cur: i, chk: [alpha, up, dig] });
    });
    S.push({ line: 1, now: "No characters left. The loop ends.", cur: -1, chk: null, vars: { char: "'!'" } });
    return S;
  }
  const charVisual = (el, st) => {
    const marks = {};
    "Hi 5!".split("").forEach((_, i) => { if (i === st.cur) marks[i] = "held"; else if (i < st.cur || st.cur < 0) marks[i] = "done"; });
    el.appendChild(D.array("Hi 5!".split(""), { marks }));
    if (st.chk) el.appendChild(h("div", { style: "margin-top:10px" }, ui.table({ head: [".isalpha()", ".isupper()", ".isdigit()"], rows: [st.chk.map(b => b ? "<span class='ok'>True</span>" : "<span class='bad'>False</span>")] })));
  };

  // --- stepper data: sliding window ---
  function windowSteps() {
    const t = "lolol", sub = "lol", L = 3;
    const S = [
      { line: 8, now: 'Call <code>count_occurrences("lolol", "lol")</code>.', vars: {}, win: -1, hits: [] },
      { line: 2, now: "Start counting at 0.", vars: { text: "'lolol'", substring: "'lol'", count: "0" }, win: -1, hits: [] },
    ];
    let count = 0;
    const hits = [];
    for (let i = 0; i <= t.length - L; i++) {
      S.push({ line: 3, now: i === 0 ? `<code>range(5 - 3 + 1)</code> is <code>range(3)</code>: the window can start at 0, 1 or 2. Now <b>i = 0</b>.` : `Slide the window one step: <b>i = ${i}</b>.`, vars: { text: "'lolol'", substring: "'lol'", count: String(count), i: String(i) }, win: i, hits: hits.slice() });
      const piece = t.slice(i, i + L);
      if (piece === sub) {
        S.push({ line: 4, now: `<code>text[${i}:${i + 3}]</code> is ${pyrepr(piece)}. Equal to 'lol'? <b>Yes.</b>`, win: i, hits: hits.slice(), match: true });
        count++; hits.push(i);
        S.push({ line: 5, now: `Count it: count = <b>${count}</b>.`, vars: { text: "'lolol'", substring: "'lol'", count: String(count), i: String(i) }, win: i, hits: hits.slice() });
      } else S.push({ line: 4, now: `<code>text[${i}:${i + 3}]</code> is ${pyrepr(piece)}. Equal to 'lol'? No.`, win: i, hits: hits.slice(), match: false });
    }
    S.push({ line: 6, now: `Return ${count}. The two matches <b>overlap</b> (they share the middle l).`, win: -1, hits });
    S.push({ line: 8, now: `Compare: <code>"lolol".count("lol")</code> gives <b>1</b>, because <code>.count()</code> never counts overlapping matches.`, print: String(count), win: -1, hits });
    return S;
  }
  const windowVisual = (el, st) => {
    const marks = {}, below = {};
    st.hits.forEach(i => { below[i] = "match"; });
    if (st.win >= 0) for (let j = st.win; j < st.win + 3; j++) marks[j] = st.match === true ? "done" : st.match === false ? "cmp" : "held";
    el.appendChild(D.array("lolol".split(""), { name: "text", marks, below }));
  };

  const strings = {
    id: "strings",
    title: "Strings",
    summary: "Indexing and slicing (with a ruler you can drag), why strings can't change, looping over characters, string methods and f-strings.",
    exam: ["Q1 category strings, printing objects"],
    sources: "NB §7",
    blocks: [
      { type: "h", text: "Building strings" },
      { type: "table", head: ["Python", "Result", "Why"], code: [0], rows: [
        ["'ab' + 'cd'", "<code>'abcd'</code>", "<code>+</code> joins"],
        ["'ab' * 3", "<code>'ababab'</code>", "<code>*</code> repeats"],
        ["'Hi' + ' ' + 'you'", "<code>'Hi you'</code>", "add the spaces yourself"],
        ["len('Hi 5!')", "<code>5</code>", "spaces and <code>!</code> count too"],
        ["'Price: ' + 5", "<span class='bad'>TypeError</span>", "text + number: use <code>str(5)</code> or an f-string"],
      ] },

      { type: "h", text: "Indexing and slicing", sub: "Positions start at 0. Negative positions count from the end." },
      { type: "table", head: ["Rule", "s = 'abcdefgh'", "Result"], code: [1], rows: [
        ["first character is index 0", "s[0]", "<code>'a'</code>"],
        ["<code>-1</code> is the last one", "s[-1]", "<code>'h'</code>"],
        ["<code>[start:stop]</code>: stop is <b>not</b> included", "s[3:6]", "<code>'def'</code>"],
        ["leave out start / stop = from the beginning / to the end", "s[:3]", "<code>'abc'</code>"],
        ["a step takes every n-th", "s[::2]", "<code>'aceg'</code>"],
        ["step <code>-1</code> walks backwards", "s[::-1]", "<code>'hgfedcba'</code>"],
        ["one index past the end crashes…", "s[8]", "<span class='bad'>IndexError</span>"],
        ["…but a slice never crashes", "s[2:100]", "<code>'cdefgh'</code>"],
      ] },
      { type: "widget", title: "The slicing ruler", intro: "Index numbers on top, negative ones below. Tick a box to use start, stop or step, then drag. Blue cells are taken, in the order shown (#1, #2, …).", render: sliceWidget },

      { type: "h", text: "Strings cannot change", sub: "They are immutable. You build a new string instead." },
      { type: "widget", render: immutableWidget },

      { type: "h", text: "Looping over a string" },
      `<p><code>for char in s</code> hands you one character per round. It is simpler than <code>for i in range(len(s))</code> when you do not need the position.</p>`,
      {
        type: "stepper",
        title: "One character at a time",
        code: `
          for char in "Hi 5!":
              print(char, char.isalpha(), char.isupper(), char.isdigit())`,
        what: { 1: "Each round, char is the next character of the string, including the space.", 2: "Ask: is it a letter? a capital? a digit? Each method answers True or False." },
        steps: charSteps(),
        visualTitle: "The string",
        visual: charVisual,
      },

      { type: "h", text: "String methods", sub: "None of them change the original. Store the result: s = s.lower()" },
      { type: "table", head: ["Method", "Example", "Result"], code: [1], rows: [
        ["<code>.lower()</code> / <code>.upper()</code>", "'Hi'.lower()", "<code>'hi'</code>"],
        ["<code>.strip()</code>", "'  hi  '.strip()", "<code>'hi'</code>"],
        ["<code>.startswith()</code>", "'RT hello'.startswith('RT ')", "<code>True</code>"],
        ["<code>.isalpha()</code>", "'ab1'.isalpha()", "<code>False</code>"],
        ["<code>.isupper()</code>", "'HI!'.isupper()", "<code>True</code>"],
        ["<code>.isdigit()</code>", "'16.5'.isdigit()", "<code>False</code> (the dot is not a digit)"],
        ["<code>.count()</code>", "'banana'.count('na')", "<code>2</code>"],
        ["<code>.find()</code>", "'banana'.find('na')", "<code>2</code> (first position, or -1)"],
        ["<code>.replace()</code>", "'banana'.replace('a', 'o')", "<code>'bonono'</code>"],
        ["<code>.split()</code>", "'a,b,c'.split(',')", "<code>['a', 'b', 'c']</code>"],
        ["<code>.join()</code>", "'-'.join(['a', 'b'])", "<code>'a-b'</code>"],
      ] },

      { type: "h", text: "f-strings", sub: "Put f before the quote, and variables in {curly brackets}." },
      { type: "table", head: ["Python", "Result"], code: [0], rows: [
        ["f'{author} has {likes} likes'", "<code>'Anna has 12 likes'</code> (author = 'Anna', likes = 12)"],
        ["f'{ratio:.2f}'", "<code>'0.67'</code> (ratio = 2/3, 2 decimals)"],
        ["f'{ratio:.0%}'", "<code>'50%'</code> (ratio = 0.5, as a percent)"],
      ] },

      { type: "h", text: "Counting a pattern: the sliding window", sub: "Assignment 1's count_occurrences" },
      {
        type: "stepper",
        title: "count_occurrences(\"lolol\", \"lol\")",
        code: `
          def count_occurrences(text, substring):
              count = 0
              for i in range(len(text) - len(substring) + 1):
                  if text[i:i + len(substring)] == substring:
                      count += 1
              return count

          print(count_occurrences("lolol", "lol"))`,
        what: {
          2: "The counter.",
          3: "i is where the window starts. The last start that still fits is len(text) − len(substring).",
          4: "Cut out a piece as long as substring, starting at i. Is it the same?",
          5: "Count the match.",
          6: "After the loop: give back the count.",
          8: "Call it and print the result.",
        },
        steps: windowSteps(),
        visualTitle: "The window (3 wide) slides along",
        legend: [["held", "window"], ["done", "match"], ["cmp", "no match"]],
        visual: windowVisual,
      },
      {
        type: "tryit",
        title: "String playground",
        code: `
          s = "copenhagen-business-school"

          print(s[0], s[-1])            # first and last character
          print(s[:10])                 # the first 10 characters
          print(s.count('s'))           # how many s?
          print(s.upper())              # a NEW string in capitals
          print(s)                      # s itself has not changed

          words = s.split('-')          # cut at every dash
          print(words, len(words))
          print(f'{len(s)} characters, {s.count("o") / len(s):.0%} of them are o')`,
      },
      { type: "mistakes", items: [
        { title: "Index equal to the length", wrong: "s = 'abc'\ns[3]", right: "s = 'abc'\ns[2]     # or s[-1]", why: "The last index is <code>len(s) - 1</code>." },
        { title: "Forgetting to store a method's result", wrong: "s.upper()\nprint(s)     # unchanged", right: "s = s.upper()\nprint(s)", why: "Methods give back a <b>new</b> string. The old one never changes." },
        { title: "Changing one character", wrong: "word[0] = 'J'", right: "word = 'J' + word[1:]", why: "Strings are immutable: TypeError." },
        { title: "Counting the wrong number of characters to cut", wrong: "text = 'RT hi'\ntext[2:]   # ' hi'", right: "text = 'RT hi'\ntext[3:]   # 'hi'", why: "<code>'RT '</code> is 3 characters: R, T and the space." },
        { title: "Text plus a number", wrong: "'Total: ' + 5", right: "'Total: ' + str(5)\nf'Total: {5}'", why: "<code>+</code> only joins text to text." },
      ] },
    ],
    quiz: [
      { type: "predict", q: "What does this print?", code: "s = \"abcdefgh\"\nprint(s[3:6])", answer: ["def", "'def'"],
        hint: "Index 3 is <code>d</code>. Stop at 6 means index 6 is not included.", explain: "Indexes 3, 4, 5 → d, e, f. <code>print</code> shows text without quotes." },
      { type: "predict", q: "What does this print?", code: "s = \"abcdefgh\"\nprint(s[::-1])", answer: ["hgfedcba", "'hgfedcba'"],
        hint: "No start, no stop, step −1.", explain: "Step −1 walks backwards from the end to the beginning: the string reversed." },
      { type: "mc", q: "What does this print?", code: "s = 'hello'\ns.upper()\nprint(s)", options: ["<code>HELLO</code>", "<code>hello</code>", "<code>None</code>", "An error"], answer: 1,
        hint: "Can a string change? Where did the result of <code>s.upper()</code> go?", explain: "<code>s.upper()</code> makes a new string 'HELLO' but nobody stores it. <code>s</code> still points at 'hello'." },
      { type: "bug", q: "This should print <code>Jython</code>. Click the line that crashes.", code: "word = 'Python'\nword[0] = 'J'\nprint(word)",
        bugs: [2], notes: { 2: "strings are immutable: TypeError: 'str' object does not support item assignment" },
        fixed: "word = 'Python'\nword = 'J' + word[1:]     # build a new string\nprint(word)",
        hint: "Which line tries to change a string in place?", explain: "This is a <b>runtime</b> error: line 1 runs fine, then line 2 crashes." },
      { type: "write", q: "Write <code>count_vowels(text)</code>: it <b>returns</b> how many of the letters <code>a e i o u</code> are in <code>text</code> (small letters are enough). Use a loop over the string.",
        starter: `
          def count_vowels(text):
              count = 0
              # loop over the characters

              return count

          print(count_vowels("copenhagen~business~school"))`,
        checks: [["count_vowels('copenhagen~business~school')", "9"], ["count_vowels('sky')", "0"], ["count_vowels('banana')", "3"]],
        solution: `
          def count_vowels(text):
              count = 0
              for char in text:          # one character per round
                  if char in 'aeiou':    # is it one of the five?
                      count += 1
              return count`,
        hint: "<code>for char in text:</code>, then <code>if char in 'aeiou':</code>.",
        explain: "<code>char in 'aeiou'</code> checks whether the character appears in that little string. Exercise 1 asked exactly this." },
      { type: "predict", q: "What does this print?", code: "ratio = 0.256\nprint(f'{ratio:.0%} and {ratio:.2f}')", answer: "26% and 0.26",
        hint: "<code>.0%</code> means: as a percent, 0 decimals. <code>.2f</code> means: 2 decimals.", explain: "0.256 as a percent is 25.6%, rounded to 0 decimals: 26%. With 2 decimals it is 0.26." },
    ],
  };

  PADS.registerSubject({
    id: "foundations",
    title: "Python foundations",
    order: 1,
    blurb: "Types and variables, <code>if</code> and loops, functions and scope, and strings.",
    covers: ["Basics &amp; types: casting, <code>=</code> vs <code>==</code>, <code>input()</code>", "Control flow: if/elif/else, for, while, break", "Functions &amp; scope: return vs print, local vs global", "Strings: slicing, methods, f-strings"],
    exam: [
      "<b>Q2</b>: find syntax errors with line numbers: missing <code>:</code>, <code>retrun</code>, missing comma.",
      "<b>Q4</b>: <code>if total = price:</code> and print-instead-of-return.",
      "<b>Every question</b> asks you to write or fix a function: the loop, <code>if</code> and <code>return</code> skills from here.",
    ],
    topics: [basics, controlFlow, functions, strings],
  });
})();
