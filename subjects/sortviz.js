/* Sorting visualizer & Big-O: embeds the "Sorting, Line by Line" page (sorting/index.html) and repeats all its text natively */
(function () {
  "use strict";
  const PAGE = "sorting/index.html";
  const h = PADS.h, esc = PADS.esc;

  // One embedded view of the sorting page, opened on the given query (?algo=bubble, ?algo=bigo, ...)
  function frame(query) {
    return function () {
      const wrap = h("div");
      const box = h("div", { class: "sv-wrap" });
      const f = h("iframe", { class: "sv-frame", title: "Sorting, Line by Line", loading: "lazy", src: PAGE + query });
      const fit = () => {                                   // grow the frame to the page's height (only same-origin, e.g. on the web)
        try {
          const d = f.contentDocument;
          if (d && d.documentElement) f.style.height = (d.documentElement.scrollHeight + 8) + "px";
        } catch (e) { /* file:// blocks this, so keep the fixed height */ }
      };
      f.addEventListener("load", () => {
        fit();
        try { new ResizeObserver(fit).observe(f.contentDocument.body); } catch (e) { /* fixed height is fine */ }
      });
      box.appendChild(f);
      wrap.append(box, h("p", { class: "small muted", html: `<a href="${PAGE + query}" target="_blank" rel="noopener">Open full screen ↗</a>` }));
      return wrap;
    };
  }

  /* ---- the sorting page's own text: code, what each line does, legend, "How it works" (copied from sorting/index.html) ---- */
  const DATA = {
    bubble: {
      fn: "bubble_sort",
      code: [
        "def bubble_sort(items, key=lambda x: x):",
        "    out = list(items)",
        "    for end in range(len(out) - 1):",
        "        swapped = False",
        "        for i in range(len(out) - 1):",
        "            if key(out[i]) > key(out[i + 1]):",
        "                out[i], out[i + 1] = out[i + 1], out[i]",
        "                swapped = True",
        "        if not swapped:",
        "            break",
        "    return out",
      ],
      what: {
        1: "Defines the function. items is the list you pass in. key says what to compare; by default it is the items themselves, so you can ignore key here.",
        2: "Makes a copy of the list. All changes happen to out, so the original items is never touched.",
        3: "The outer loop. Each round is one pass along the whole list. n − 1 passes are always enough.",
        4: "Resets a flag at the start of every pass. It will record whether this pass swapped anything.",
        5: "The inner loop walks along the list. i stops one before the end, because line 6 also looks at out[i + 1].",
        6: "Compares two neighbours. True means the left one is bigger, so they are in the wrong order.",
        7: "Swaps the two neighbours in one line. Python reads the right side first (the pair in new order), then puts it back.",
        8: "Notes that this pass changed something.",
        9: "After a whole pass: did nothing get swapped?",
        10: "Jumps out of the outer loop early. The list is already sorted.",
        11: "Gives back the sorted copy.",
      },
      legend: [["cmp","being compared"],["swap","just moved"],["done","final spot"]],
      about: {
        idea: "Walk along the list and swap any two neighbours that are in the wrong order. Repeat until a whole pass has no swaps.",
        picture: "Big numbers float to the right end, like bubbles rising in a drink.",
        steps: ["Compare positions 0 and 1, swap if the left one is bigger.","Then 1 and 2, then 2 and 3, all the way to the end.","The biggest number has now been carried to the end.","Do another pass. Stop when a pass makes zero swaps."],
        after: "The biggest unfinished number is at the end and never moves again.",
        speed: "O(n²). On a list that is already sorted: one pass and stop, so O(n).",
        vs: "Unlike selection sort, it moves things with lots of tiny neighbour swaps, and it finishes the list from the end.",
      },
    },
    selection: {
      fn: "selection_sort",
      code: [
        "def selection_sort(items, key=lambda x: x):",
        "    out = list(items)",
        "    for i in range(len(out) - 1):",
        "        min_idx = i",
        "        for j in range(i + 1, len(out)):",
        "            if key(out[j]) < key(out[min_idx]):",
        "                min_idx = j",
        "        out[i], out[min_idx] = out[min_idx], out[i]",
        "    return out",
      ],
      what: {
        1: "Defines the function. key is the default (compare the items themselves), so you can ignore it here.",
        2: "Makes a copy, so the original items is never changed.",
        3: "The outer loop. i is the position we fill this round. It stops one early, because the last position fills itself.",
        4: "First guess: the number at position i is the smallest. min_idx stores a position, not a value.",
        5: "The inner loop. j visits every position after i, all the way to the end.",
        6: "Is the number at j smaller than the smallest found so far?",
        7: "Yes: remember where the new smallest is.",
        8: "Swaps the smallest into position i. That position is now final and is never touched again.",
        9: "Gives back the sorted copy.",
      },
      legend: [["min","smallest so far (min_idx)"],["cmp","being checked (j)"],["swap","just moved"],["done","final spot"]],
      about: {
        idea: "Find the smallest number in the part that is not sorted yet, and swap it to the front of that part. Repeat.",
        picture: "Picking the shortest person out of a line and putting them first, then the shortest of the rest, and so on.",
        steps: ["Look at everything from position 0 to the end and find the smallest.","Swap it into position 0. Done with that spot.","Look from position 1 to the end, find the smallest, swap it into position 1.","Keep going until one number is left."],
        after: "The front spot of the unsorted part is final.",
        speed: "Always O(n²). It never stops early, because it always searches the whole rest of the list.",
        vs: "Unlike bubble sort, it does only one swap per round, and it finishes the list from the front.",
      },
    },
    insertion: {
      fn: "insertion_sort",
      code: [
        "def insertion_sort(items, key=lambda x: x):",
        "    out = list(items)",
        "    for i in range(1, len(out)):",
        "        current = out[i]",
        "        j = i - 1",
        "        while j >= 0 and key(out[j]) > key(current):",
        "            out[j + 1] = out[j]",
        "            j = j - 1",
        "        out[j + 1] = current",
        "    return out",
      ],
      what: {
        1: "Defines the function. key is the default, so you can ignore it here.",
        2: "Makes a copy, so the original items is never changed.",
        3: "Picks up each card, starting with the second one. The first card alone already counts as sorted.",
        4: "Holds the card in a variable. Now its spot in the list can be written over safely.",
        5: "j starts at the spot just to the left of the card.",
        6: "Keep going while there is a card to the left (j >= 0) AND it is bigger than the one we hold. Python checks j >= 0 first and stops there if it is False, so out[-1] is never read.",
        7: "Copies the bigger card one spot to the right. Its old spot becomes the gap.",
        8: "Moves one spot further left.",
        9: "Puts the held card into the gap. It is j + 1 because j stopped one spot left of the gap.",
        10: "Gives back the sorted copy.",
      },
      legend: [["held","card in your hand (current)"],["cmp","being compared"],["swap","just slid right"],["gap","the gap (an old copy)"],["sorted","sorted part so far"],["done","finished"]],
      about: {
        idea: "Take the next number and slide it left into its correct place among the numbers you already sorted.",
        picture: "Sorting playing cards in your hand: pick up a card, slide it in where it belongs.",
        steps: ["The first card counts as a sorted hand of 1.","Pick up the next card.","Bigger cards in your hand shift one spot right to make room.","Drop the card in the gap. Repeat with the next card."],
        after: "The left part is sorted among itself, but not final yet. A smaller card later on can still push into it.",
        speed: "O(n²). Very fast, O(n), when the list is already almost sorted, because cards barely slide.",
        vs: "Unlike selection sort, it does not search for the smallest. It takes whatever card comes next and finds where it fits.",
      },
    },
    merge: {
      fn: "merge_sort",
      code: [
        "def merge(left, right, key=lambda x: x):",
        "    result = []",
        "    i = 0",
        "    j = 0",
        "    while i < len(left) and j < len(right):",
        "        if key(left[i]) <= key(right[j]):",
        "            result.append(left[i])",
        "            i = i + 1",
        "        else:",
        "            result.append(right[j])",
        "            j = j + 1",
        "    return result + left[i:] + right[j:]",
        "",
        "def merge_sort(items, key=lambda x: x):",
        "    if len(items) <= 1:",
        "        return list(items)",
        "    mid = len(items) // 2",
        "    left = merge_sort(items[:mid], key)",
        "    right = merge_sort(items[mid:], key)",
        "    return merge(left, right, key)",
      ],
      what: {
        1: "Glues two lists that are ALREADY sorted into one sorted list.",
        2: "The merged list starts empty.",
        3: "i points at the front card of the left pile.",
        4: "j points at the front card of the right pile.",
        5: "Repeat while both piles still have cards.",
        6: "Compares the two front cards. <= means a tie goes to the left pile, which keeps the sort stable.",
        7: "Takes the left front card.",
        8: "The next left card becomes the front.",
        9: "Otherwise the right front card is smaller.",
        10: "Takes the right front card.",
        11: "The next right card becomes the front.",
        12: "One pile is empty. Whatever is left in the other pile is sorted and bigger than everything taken, so it goes on the end. left[i:] is just [] if that pile is used up.",
        14: "Sorts a list by splitting it in half again and again.",
        15: "Base case: a list with 0 or 1 items is already sorted.",
        16: "Stops splitting and returns a copy.",
        17: "Finds the middle. // divides and rounds down, so 5 // 2 = 2.",
        18: "Sorts the left half by calling merge_sort itself (recursion). This call pauses here until that one is finished.",
        19: "The same for the right half.",
        20: "Both halves are sorted now, so merge can glue them together.",
      },
      legend: [["half-l","left half"],["half-r","right half"],["cmp","front cards compared"],["swap","just added"],["taken","already taken"]],
      about: {
        idea: "Split the list in half, and the halves in half, until every piece has 1 item. Then glue the pieces back together in order.",
        picture: "Two sorted piles of cards face up. Always take the smaller of the two top cards.",
        steps: ["Split: [5,2,8,1] → [5,2] and [8,1] → [5] [2] [8] [1].","A piece of 1 is already sorted (the base case).","Glue pairs together in order: [2,5] and [1,8].","Glue those: [1,2,5,8]."],
        after: "Each glued piece is sorted, and the pieces get bigger until one is the whole list.",
        speed: "Always O(n log n): about log n levels of splitting, and each level glues all n items once. Needs extra memory for the new lists.",
        vs: "Unlike quick sort, the splitting is dumb (just the middle). All the clever work happens afterwards, in merge.",
      },
    },
    quick: {
      fn: "quick_sort",
      code: [
        "def quick_sort(items, key=lambda x: x):",
        "    if len(items) <= 1:",
        "        return list(items)",
        "    pivot = key(items[len(items) // 2])",
        "    less    = [x for x in items if key(x) < pivot]",
        "    equal   = [x for x in items if key(x) == pivot]",
        "    greater = [x for x in items if key(x) > pivot]",
        "    return quick_sort(less, key) + equal + quick_sort(greater, key)",
      ],
      what: {
        1: "Sorts by picking a pivot and splitting the list into smaller, equal and bigger.",
        2: "Base case: a list with 0 or 1 items is already sorted.",
        3: "Stops and returns a copy.",
        4: "Picks the item in the middle position as the pivot. With key left as default, the pivot is just that number.",
        5: "A list comprehension: loop over items, keep every x smaller than the pivot. Same as an empty list + for loop + append.",
        6: "Keeps every x equal to the pivot. These are already in the right place compared with the rest.",
        7: "Keeps every x bigger than the pivot.",
        8: "Python runs this left to right: first quick_sort(less), then quick_sort(greater), then joins small + equal + big.",
      },
      legend: [["pivot","pivot"],["held","goes into this list"],["swap","sorted result"],["done","finished"]],
      about: {
        idea: "Pick a pivot (here, the middle item). Split the list into smaller, equal and bigger than the pivot. Sort the smaller and bigger lists the same way, then join them.",
        picture: "Sorting exam papers: one pile below 50, one pile at 50, one pile above 50. Then sort each pile the same way.",
        steps: ["Pick the pivot, e.g. [5,2,8,1,9,3] → middle item 1.","less = [], equal = [1], greater = [5,2,8,9,3].","Sort less and greater the same way (recursion).","Join: sorted less + equal + sorted greater."],
        after: "The pivot is in its final place. Everything smaller ends up left of it, everything bigger right of it.",
        speed: "O(n log n) when the pivot splits the list roughly in half. O(n²) when the pivot is always the smallest or biggest (lopsided splits).",
        vs: "Unlike merge sort, the clever work happens first (splitting around the pivot). Joining afterwards is just +.",
      },
    },
  };

  const MARK = { pivot: "min", taken: "dim", "half-l": "held", "half-r": "min" };   // sorting-page colour → site mark class

  function sortBlocks(id, big) {
    const a = DATA[id], ab = a.about;
    return [
      `<p><b>Big-O:</b> ${big}<br><span class="small muted">Press Step (or →) to run one line at a time. The highlighted line is the one that just ran. Type your own numbers (2–10) or press Random.</span></p>`,
      frame("?algo=" + id),
      { type: "h", text: `How <code>${a.fn}</code> works` },
      `<p><b>${ab.idea}</b></p>`,
      { type: "callout", kind: "tip", title: "Picture it", html: `<p>${ab.picture}</p>` },
      `<ol>${ab.steps.map(s => `<li>${s}</li>`).join("")}</ol>`,
      { type: "table", head: ["", ""], rows: [
        ["<b>After each round</b>", ab.after],
        ["<b>Speed</b>", ab.speed],
        ["<b>How it differs</b>", ab.vs],
      ] },
      { type: "h", text: "Line by line", sub: "What each line does in general. The stepper above shows what it did with the actual numbers (“Right now”)." },
      { type: "code", code: a.code.join("\n") },
      { type: "table", head: ["Line", "Code", "What this line does"], code: [1], num: [0], rows:
        a.code.map((c, i) => [String(i + 1), c.trim(), esc(a.what[i + 1] || "")]).filter(r => r[1] !== "") },
      { type: "h", text: "Colours in the stepper" },
      () => ui.draw.legend(a.legend.map(([c, t]) => [MARK[c] || c, t])),
      { type: "callout", kind: "note", title: "More on this sort", html: `<p>All five side by side: <a href="#sortviz/compare">Compare all five</a>. Merge sort's recursion, stability and <code>key=lambda</code>: <a href="#algorithms/sorting">Sorting</a>. Growth curves: <a href="#sortviz/bigo">Big-O</a>.</p>` },
    ];
  }
  const ui = PADS.ui;

  const QUIZ = {
    bubble: [
      { type: "mc", q: "One pass of the inner loop on <code>[5, 2, 8, 1, 9, 3]</code>. What is the list after it?", options: ["[2, 5, 1, 8, 3, 9]", "[1, 2, 8, 5, 9, 3]", "[1, 2, 3, 5, 8, 9]", "[2, 5, 8, 1, 9, 3]"], answer: 0,
        wrong: { 1: "That is one round of selection sort: the smallest swapped to the front.", 2: "That is fully sorted. One pass only carries the biggest to the end.", 3: "That stopped after the first swap. The pass keeps walking to the end." },
        hint: "Swap neighbours left to right. Where does 9 end up?", explain: "5↔2, 8↔1, 9↔3. The biggest (9) is now at the end and is final." },
      { type: "mc", q: "How many passes does <code>bubble_sort([1, 2, 3, 4])</code> make?", options: ["1", "3", "4", "16"], answer: 0,
        hint: "Look at lines 9–10.", explain: "The first pass swaps nothing, so <code>swapped</code> stays False and <code>break</code> stops it. That is the O(n) best case." },
      { type: "mc", q: "Why is the inner loop <code>range(len(out) - 1)</code> and not <code>range(len(out))</code>?", options: ["Line 6 also reads <code>out[i + 1]</code>, which would be past the end", "The last item is always sorted", "To make it faster", "Python lists start at 1"], answer: 0,
        hint: "What is <code>out[i + 1]</code> when i is the last index?", explain: "With i = len(out) − 1, <code>out[i + 1]</code> is out of range: IndexError." },
    ],
    selection: [
      { type: "mc", q: "One round of <code>selection_sort</code> on <code>[5, 2, 8, 1, 9, 3]</code>. What is the list after it?", options: ["[1, 2, 8, 5, 9, 3]", "[2, 5, 1, 8, 3, 9]", "[1, 5, 2, 8, 9, 3]", "[1, 2, 3, 5, 8, 9]"], answer: 0,
        wrong: { 1: "That is a bubble pass: many neighbour swaps.", 2: "Selection does one swap, not a shift. 5 goes to where 1 was.", 3: "That is fully sorted. One round fixes only the front spot." },
        hint: "Find the smallest, swap it with position 0.", explain: "The smallest is 1 at position 3. Swap it with 5: <code>[1, 2, 8, 5, 9, 3]</code>. Position 0 is final." },
      { type: "mc", q: "Is selection sort stable?", code: "[2a, 2b, 1]", options: ["No: the long swap can jump an item past an equal one", "Yes: it never swaps equal items", "Yes, like bubble sort", "Only on sorted input"], answer: 0,
        hint: "Swap 2a with 1. Where does 2a land?", explain: "<code>[2a, 2b, 1]</code> → swap 2a with 1 → <code>[1, 2b, 2a]</code>. The two 2s flipped." },
      { type: "mc", q: "<code>selection_sort</code> gets a list that is already sorted. What is its Big-O?", options: ["O(n²)", "O(n)", "O(n log n)", "O(1)"], answer: 0,
        wrong: { 1: "That is bubble and insertion. Selection has no early stop." },
        hint: "Does it ever stop early?", explain: "It always scans the whole rest for the smallest: n = 4 gives 3 + 2 + 1 = 6 compares, sorted or not. O(n²) always." },
    ],
    insertion: [
      { type: "mc", q: "<code>insertion_sort([5, 2, 8, 1, 9, 3])</code>: what is the list after the first card (i = 1) is placed?", options: ["[2, 5, 8, 1, 9, 3]", "[1, 2, 8, 5, 9, 3]", "[5, 2, 8, 1, 9, 3]", "[2, 5, 1, 8, 3, 9]"], answer: 0,
        hint: "Pick up 2. Is 5 bigger? Then 5 slides right.", explain: "Hold 2, slide 5 right, drop 2 in the gap: <code>[2, 5, 8, 1, 9, 3]</code>." },
      { type: "mc", q: "Line 6 is <code>while j >= 0 and key(out[j]) > key(current):</code>. Why must <code>j >= 0</code> come first?", options: ["If it is False, Python stops there and never reads out[-1]", "It is faster to check numbers first", "The order does not matter", "So the sort is stable"], answer: 0,
        wrong: { 2: "It matters: out[-1] is the last item in Python, so the other order would compare against the wrong card." },
        hint: "What is <code>out[-1]</code> in Python?", explain: "<code>and</code> stops at the first False. So when j is −1, <code>out[j]</code> is never read." },
      { type: "mc", q: "How many compares does insertion sort make on <code>[1, 2, 3, 4]</code>, and on <code>[4, 3, 2, 1]</code>?", options: ["3 and 6", "6 and 6", "3 and 3", "4 and 16"], answer: 0,
        hint: "Sorted: each card stops after 1 compare. Reversed: each card slides all the way.", explain: "Best 1 + 1 + 1 = 3 → O(n). Worst 1 + 2 + 3 = 6 → O(n²)." },
    ],
    merge: [
      { type: "predict", q: "What does <code>merge([2, 5], [1, 8])</code> return?", code: "def merge(left, right):\n    result = []\n    i = 0\n    j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i])\n            i = i + 1\n        else:\n            result.append(right[j])\n            j = j + 1\n    return result + left[i:] + right[j:]\n\nprint(merge([2, 5], [1, 8]))", answer: "[1, 2, 5, 8]",
        hint: "Always take the smaller of the two front cards.", explain: "1 (right), 2 (left), 5 (left). The left pile is empty, so add <code>right[1:]</code> = [8]." },
      { type: "mc", q: "Why does <code>merge</code> use <code>&lt;=</code> and not <code>&lt;</code>?", options: ["A tie goes to the left pile, so equal items keep their order (stable)", "It is faster", "Otherwise it crashes on ties", "It doesn't matter"], answer: 0,
        hint: "Which pile came first in the input?", explain: "Equal keys: take the left one first. That keeps the original order, so merge sort is stable." },
      { type: "mc", q: "<code>merge_sort([5, 2, 8, 1, 9])</code>: what are the two halves?", options: ["[5, 2] and [8, 1, 9]", "[5, 2, 8] and [1, 9]", "[1, 2] and [5, 8, 9]", "[5] and [2, 8, 1, 9]"], answer: 0,
        wrong: { 1: "5 // 2 rounds down: mid is 2, not 3.", 2: "Merge sort splits without looking at the values. Sorting happens in merge." },
        hint: "<code>mid = len(items) // 2</code>.", explain: "5 // 2 = 2, so <code>items[:2]</code> = [5, 2] and <code>items[2:]</code> = [8, 1, 9]." },
    ],
    quick: [
      { type: "mc", q: "<code>quick_sort([5, 2, 8, 1, 9, 3])</code>: what are pivot, less, equal and greater in the first call?", options: ["pivot 1; less [], equal [1], greater [5, 2, 8, 9, 3]", "pivot 8; less [5, 2, 1, 3], equal [8], greater [9]", "pivot 5; less [2, 1, 3], equal [5], greater [8, 9]", "pivot 1; less [1], equal [], greater [5, 2, 8, 9, 3]"], answer: 0,
        wrong: { 1: "6 // 2 = 3, and items[3] is 1, not 8.", 2: "The pivot is the middle position, not the first item." },
        hint: "<code>items[len(items) // 2]</code>: 6 // 2 = 3.", explain: "items[3] = 1. Nothing is smaller, only 1 equals it, the rest is bigger. A lopsided split." },
      { type: "mc", q: "When is quick sort O(n²)?", options: ["When the pivot is always the smallest or biggest", "When the list is long", "When all items are equal", "Never"], answer: 0,
        wrong: { 2: "All equal → everything lands in equal; one pass: O(n)." },
        hint: "What if each split peels off just 1 item?", explain: "Bad pivots peel off 1 item per level: n levels × n work = O(n²)." },
      { type: "mc", q: "<code>quick_sort([4, 4, 4, 4])</code>: how much work?", options: ["One pass: O(n)", "O(n log n)", "O(n²)", "It loops forever"], answer: 0,
        hint: "Where do all the 4s go?", explain: "Everything lands in <code>equal</code>; less and greater are empty. One pass: O(n)." },
    ],
  };

  const SORTS = [
    ["bubble", "Bubble sort", "Swap neighbours that are in the wrong order. After each pass the biggest item has bubbled to the end.", "O(n²), best O(n)"],
    ["selection", "Selection sort", "Find the smallest item in the unsorted part and swap it to the front.", "O(n²) always"],
    ["insertion", "Insertion sort", "Like sorting playing cards: take the next card and slide it left into place.", "O(n²), best O(n)"],
    ["merge", "Merge sort", "Split in half until one item is left, then merge the sorted halves. Watch the call stack.", "O(n log n) always"],
    ["quick", "Quick sort", "Pick a pivot, split into less / equal / greater, sort both sides.", "O(n log n), worst O(n²)"],
  ];

  const topics = SORTS.map(([id, title, idea, big]) => ({ id, title, summary: idea, sources: "Sorting, Line by Line; L9 p13–30; Ex9", blocks: sortBlocks(id, big), quiz: QUIZ[id] }));

  topics.push({
    id: "compare", title: "Compare all five",
    summary: "All five sorts side by side: the idea, what is final after one round, how items move, speed, and early stops.",
    sources: "Sorting, Line by Line",
    blocks: [
      { type: "table", head: ["Sort", "The idea in one line", "What is final after one round?", "Moves items by…", "Speed", "Stops early if already sorted?"], rows: [
        ["<code>bubble</code>", "Swap neighbours that are in the wrong order, again and again", "The <b>last</b> spot (biggest number)", "Many small swaps of neighbours", "O(n²)", "Yes → O(n)"],
        ["<code>selection</code>", "Find the smallest of the rest, swap it to the front", "The <b>first</b> spot (smallest number)", "One long swap per round", "O(n²) always", "No"],
        ["<code>insertion</code>", "Take the next card, slide it left into its place", "Nothing is final yet. The left part is only sorted among itself", "Sliding bigger cards right", "O(n²)", "Yes → O(n)"],
        ["<code>merge</code>", "Split in half until pieces of 1, then glue sorted piles together", "Each glued piece is sorted", "Building new lists (merge)", "O(n log n) always", "No, but it's fast anyway"],
        ["<code>quick</code>", "Pick a pivot, split into smaller / equal / bigger, repeat on each side", "The pivot (all equal ones) is in its final place", "Building new lists (less / equal / greater)", "O(n log n) usually, O(n²) worst", "No"],
      ] },
      { type: "h", text: "The two pairs people mix up" },
      { type: "table", head: ["Pair", "The difference"], rows: [
        ["Bubble vs selection", "Bubble fixes the <b>end</b> with lots of small neighbour swaps. Selection fixes the <b>front</b> with one swap per round."],
        ["Merge vs quick", "Merge splits <b>without thinking</b> (just the middle) and does the hard work <b>afterwards</b> when gluing. Quick does the hard work <b>first</b> (splitting around the pivot), so gluing afterwards is just <code>+</code>."],
      ] },
      { type: "table", caption: "Picture it", head: ["Sort", "Everyday picture"], rows: SORTS.map(([id]) => [`<code>${id}</code>`, DATA[id].about.picture]) },
      { type: "h", text: "See it", sub: "The same view as the sorting page, with the comparison table opened." },
      frame("?compare=1"),
    ],
    quiz: [
      { type: "mc", q: "After one round, which sort has fixed the <b>first</b> spot?", options: ["selection", "bubble", "insertion", "merge"], answer: 0,
        wrong: { 1: "Bubble fixes the last spot.", 2: "Insertion fixes nothing yet: a smaller card can still push in." }, hint: "Which one hunts for the smallest?", explain: "Selection swaps the smallest of the rest to the front." },
      { type: "mc", q: "Which sort does its hard work <b>after</b> splitting?", options: ["merge", "quick", "selection", "bubble"], answer: 0,
        hint: "Which one splits just at the middle?", explain: "Merge splits without thinking; all the clever work happens in <code>merge</code>. Quick does it first, around the pivot." },
      { type: "mc", q: "Which two stop early on an already sorted list?", options: ["bubble and insertion", "selection and merge", "merge and quick", "selection and insertion"], answer: 0,
        hint: "Look at the last column of the table.", explain: "Bubble breaks after a pass with no swaps; insertion's cards stop after one compare. Both O(n)." },
    ],
  });

  topics.push({
    id: "bigo", title: "Big-O",
    summary: "How the work grows when the list gets bigger: curves, a slider for n, the five you will meet, and the five sorts table.",
    sources: "Sorting, Line by Line; L7 p31–35; L9 p4",
    blocks: [
      { type: "h", text: "What Big-O means" },
      `<p>Big-O says how the <b>work grows</b> when the list gets bigger. It ignores how fast your computer is. The easy test: <b>double the list</b> and see what happens to the work. n is the length of the list.</p>`,
      { type: "table", head: ["Big-O", "n = 8", "n = 16", "Double n →"], code: [0], num: [1, 2], rows: [
        ["O(1)", "1", "1", "same work"], ["O(log n)", "3", "4", "just +1 step"], ["O(n)", "8", "16", "2× the work"],
        ["O(n log n)", "24", "64", "a bit more than 2×"], ["O(n²)", "64", "256", "4× the work"],
      ] },
      { type: "callout", kind: "rule", title: "Two rules for writing it down", html: "<ul><li><b>Drop fixed numbers.</b> 3n steps is still O(n): double n and 3n still doubles (n = 8: 24 → 48).</li><li><b>Keep only the biggest part.</b> n² + n is O(n²): at n = 100 that is 10,000 + 100, so the n part hardly matters.</li></ul>" },
      { type: "h", text: "See it grow", sub: "Move the slider and press Double n: O(n) doubles, O(n²) goes ×4, O(n log n) a bit more than ×2. Your Exercise 9 benchmark found the same: ×4 for bubble/selection/insertion, ×2.3 for merge and sorted()." },
      frame("?algo=bigo"),
      { type: "h", text: "The five you will meet" },
      { type: "table", head: ["Big-O", "Say it", "Meaning", "Tiny example", "Where"], code: [0], rows: [
        ["O(1)", "“constant”", "Same work, however long the list is.", "n = 8 → 1 step; n = 1000 → 1 step", "Grab one item: <code>items[0]</code>. Also <code>len(items)</code>."],
        ["O(log n)", "“log n”: halving", "Each step throws away half. log n = how many halvings until 1 is left.", "n = 8 → 8, 4, 2, 1 → 3 steps; n = 16 → 4 steps", "Binary search in a sorted list. Guess 1–100 with “higher / lower”: about 7 guesses."],
        ["O(n)", "“linear”", "Look at every item once.", "n = 8 → 8 steps; n = 16 → 16 steps", "One loop over the list. Linear search, <code>sum</code>, <code>max</code>."],
        ["O(n log n)", "“n log n”: halving × n", "Halve about log n times. Each level touches all n items.", "n = 8 → 3 levels × 8 = 24 steps", "Merge sort. Quick sort with good pivots."],
        ["O(n²)", "“quadratic”: loop in a loop", "For each item, go through the list again.", "n = 8 → 8 × 8 = 64 steps", "Bubble, selection and insertion sort. Comparing every pair."],
      ] },
      { type: "h", text: "The five sorts", sub: "Space = extra memory while sorting. Stable = equal items keep their order." },
      { type: "table", head: ["Sort", "Best", "Average", "Worst", "Space", "Stable?", "Why, in one line"], rows: [
        ["bubble", "O(n)", "O(n²)", "O(n²)", "O(1)", "Yes", "Pass after pass over n items. Already sorted → 1 pass, no swaps, <code>break</code>."],
        ["selection", "O(n²)", "O(n²)", "O(n²)", "O(1)", "No", "Always scans the whole rest for the smallest, even if sorted. The long swap can jump an item past an equal one."],
        ["insertion", "O(n)", "O(n²)", "O(n²)", "O(1)", "Yes", "Already sorted → each card stops after 1 compare. Reversed → each card slides all the way."],
        ["merge", "O(n log n)", "O(n log n)", "O(n log n)", "O(n)", "Yes", "Always log n levels × n items to glue. The new lists need n extra spots. <code>&lt;=</code> keeps ties in order."],
        ["quick", "O(n log n)<br>O(n) if all equal", "O(n log n)", "O(n²)", "O(n) avg<br>O(n²) worst", "Yes (this version)", "Good pivot halves the list. Bad pivot (always the smallest or biggest) peels off 1 item per level: n levels × n work."],
      ] },
      `<ul>
        <li><b>Selection is not stable:</b> <code>[2a, 2b, 1]</code> → swap 2a with 1 → <code>[1, 2b, 2a]</code>. The two 2s flipped.</li>
        <li><b>Quick, all equal:</b> <code>[4, 4, 4, 4]</code> → everything lands in <code>equal</code>, less and greater are empty. One pass: O(n).</li>
        <li><b>Quick, space:</b> every level builds new less / equal / greater lists. Good pivots: about n + n/2 + n/4 + … ≈ 2n waiting at once, so O(n). Bad pivots: n + (n−1) + … so O(n²).</li>
        <li><b>In-place quick sort</b> (swaps inside one list, no new lists) needs only O(log n) extra on average, for the waiting calls. But it is usually <b>not</b> stable.</li>
      </ul>`,
      { type: "callout", kind: "note", title: "Why O(1) space when the code copies the list?", html: "<p>Our Python versions start with <code>out = list(items)</code>, a copy of n items. The O(1) above is the extra space for the sorting itself: just a few variables like <code>i</code>, <code>j</code>, <code>swapped</code>.</p>" },
      { type: "h", text: "Best, average, worst", sub: "Same sort, same n, different order of the input. Example: insertion sort, n = 4." },
      { type: "table", head: ["Case", "Input", "Compares", "Big-O"], code: [1], rows: [
        ["Best", "[1, 2, 3, 4]", "3", "O(n)"], ["Average", "random order", "≈ 5", "O(n²)"], ["Worst", "[4, 3, 2, 1]", "1+2+3 = 6", "O(n²)"],
      ] },
      `<p>If someone just says “O(n²)”, they usually mean the <b>worst</b> case.</p>`,
      { type: "h", text: "Time vs space", sub: "Time = how many steps. Space = how much extra memory." },
      { type: "table", head: ["n = 8", "Time", "Extra space"], rows: [["bubble", "up to 64 steps", "a few variables"], ["merge", "about 24 steps", "room for 8 more items"]] },
      `<p>Merge buys speed with memory. Bubble saves memory but is slow. A stopwatch benchmark (e.g. <code>timeit</code>) measures time only, not memory.</p>`,
      { type: "callout", kind: "note", title: "Go further", html: `<p>Big-O beyond sorting: <a href="#algorithms/big-o">Big-O basics</a> · <a href="#algorithms/big-o-cases">best/worst, space &amp; recursion</a> · <a href="#algorithms/big-o-drill">cheat sheet &amp; exam drill</a>.</p>` },
    ],
    quiz: [
      { type: "mc", q: "An algorithm does 3n + 7 steps. What is its Big-O?", options: ["O(n)", "O(3n)", "O(3n + 7)", "O(1)"], answer: 0, hint: "Drop fixed numbers.", explain: "Double n and 3n + 7 roughly doubles: O(n)." },
      { type: "mc", q: "Which sort needs O(n) extra space?", options: ["merge", "bubble", "selection", "insertion"], answer: 0, hint: "Which one builds new lists while gluing?", explain: "Merge's new lists need n extra spots. The other three only need a few variables (O(1))." },
      { type: "mc", q: "n = 8 → 16. Which grows from 24 to 64 steps?", options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"], answer: 0, hint: "8 × 3 = 24, 16 × 4 = 64.", explain: "n log n: 8 · log₂ 8 = 24 and 16 · log₂ 16 = 64. A bit more than 2×." },
    ],
  });

  PADS.registerSubject({
    id: "sortviz",
    title: "Sorting visualizer",
    order: 6,
    blurb: "Your Sorting, Line by Line visualizer: every sort stepped line by line, how each one works, what every line does, plus the Big-O curves and tables.",
    covers: ["bubble, selection, insertion, merge, quick sort", "how it works + every line explained", "compare all five, the mix-up pairs", "call stack for the recursive sorts", "Big-O growth curves, best/avg/worst, space, stability"],
    exam: [],
    topics,
  });
})();
