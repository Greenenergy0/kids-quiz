// 문제 생성기 + 고정 문제 은행.
// 문제 객체 형태:
// { kind, prompt, speak, visual, visualClass, choices, answer, choiceStyle, key }
// choiceStyle: "number" | "text" | "color" | "shape" | "group"

const COLORS = [
  { name: "빨간색", hex: "#ef4444" },
  { name: "파란색", hex: "#3b82f6" },
  { name: "노란색", hex: "#facc15" },
  { name: "초록색", hex: "#22c55e" },
  { name: "보라색", hex: "#a855f7" },
  { name: "주황색", hex: "#fb923c" },
  { name: "분홍색", hex: "#f472b6" },
  { name: "갈색", hex: "#a16207" }
];

const SHAPES = [
  { glyph: "●", name: "동그라미" },
  { glyph: "▲", name: "세모" },
  { glyph: "■", name: "네모" },
  { glyph: "★", name: "별" },
  { glyph: "♥", name: "하트" }
];

const THINGS = [
  { emoji: "🍎", name: "사과", unit: "개" },
  { emoji: "🍌", name: "바나나", unit: "개" },
  { emoji: "🍓", name: "딸기", unit: "개" },
  { emoji: "🍭", name: "사탕", unit: "개" },
  { emoji: "🎈", name: "풍선", unit: "개" },
  { emoji: "⭐", name: "별", unit: "개" },
  { emoji: "🚗", name: "자동차", unit: "대" },
  { emoji: "🐶", name: "강아지", unit: "마리" },
  { emoji: "🐱", name: "고양이", unit: "마리" },
  { emoji: "🐤", name: "병아리", unit: "마리" },
  { emoji: "🐟", name: "물고기", unit: "마리" },
  { emoji: "🦋", name: "나비", unit: "마리" }
];

// 숫자를 소리 내어 읽었을 때 받침이 있는지 (1 일, 3 삼, 6 육, 7 칠, 8 팔, 0 영/십)
const DIGIT_BATCHIM = {
  "0": true, "1": true, "2": false, "3": true, "4": false,
  "5": false, "6": true, "7": true, "8": true, "9": false
};

function hasBatchim(word) {
  const last = String(word).slice(-1);
  if (last >= "0" && last <= "9") return DIGIT_BATCHIM[last];
  const code = last.charCodeAt(0);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  return isHangul && (code - 0xac00) % 28 !== 0;
}

// 받침 유무에 따라 조사를 골라준다. pair 예: "은는", "이가", "을를"
function particle(word, pair) {
  return hasBatchim(word) ? pair[0] : pair[1];
}

// "~로" / "~으로" (받침이 없거나 ㄹ이면 '로')
function roParticle(word) {
  const code = String(word).slice(-1).charCodeAt(0);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  if (!isHangul) return "로";
  const batchim = (code - 0xac00) % 28;
  return batchim === 0 || batchim === 8 ? "로" : "으로";
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(items) {
  return items[randInt(0, items.length - 1)];
}

function pickMany(items, n) {
  return shuffle(items).slice(0, n);
}

// 정답 주변의 숫자로 보기를 만든다.
function numberChoices(answer, min, max, n) {
  const candidates = new Set();
  for (let gap = 1; gap <= 5 && candidates.size < 12; gap++) {
    if (answer - gap >= min) candidates.add(answer - gap);
    if (answer + gap <= max) candidates.add(answer + gap);
  }
  const distractors = shuffle([...candidates]).slice(0, n - 1);
  const values = shuffle([answer, ...distractors]);
  return { choices: values.map(String), answer: values.indexOf(answer) };
}

function repeatEmoji(emoji, count) {
  return Array.from({ length: count }, () => `<span>${emoji}</span>`).join("");
}

// ---- 문제 생성기 ----

function qCount(max) {
  const thing = pick(THINGS);
  const n = randInt(1, max);
  const { choices, answer } = numberChoices(n, 1, Math.max(max + 2, 6), 3);
  return {
    kind: "count",
    prompt: `모두 몇 ${thing.unit}일까요?`,
    visual: repeatEmoji(thing.emoji, n),
    visualClass: "visual-emoji",
    choices,
    answer,
    choiceStyle: "number",
    key: `count-${thing.name}-${n}`
  };
}

function qColorFind() {
  const options = pickMany(COLORS, 4);
  const target = pick(options);
  return {
    kind: "colorFind",
    prompt: `${target.name}${particle(target.name, "은는")} 어디 있을까요?`,
    visual: "🎨",
    visualClass: "visual-emoji",
    choices: options,
    answer: options.indexOf(target),
    choiceStyle: "color",
    key: `colorFind-${target.name}`
  };
}

function qColorName() {
  const options = pickMany(COLORS, 3);
  const target = pick(options);
  return {
    kind: "colorName",
    prompt: "이건 무슨 색일까요?",
    visual: `<span class="swatch-big" style="background:${target.hex}"></span>`,
    visualClass: "visual-swatch",
    choices: options.map((c) => c.name),
    answer: options.indexOf(target),
    choiceStyle: "text",
    key: `colorName-${target.name}`
  };
}

function qShapeFind() {
  const options = pickMany(SHAPES, 4);
  const target = pick(options);
  return {
    kind: "shapeFind",
    prompt: `${target.name}${particle(target.name, "은는")} 어디 있을까요?`,
    visual: "🔍",
    visualClass: "visual-emoji",
    choices: options.map((s) => s.glyph),
    answer: options.indexOf(target),
    choiceStyle: "shape",
    key: `shapeFind-${target.name}`
  };
}

function qShapeName() {
  const options = pickMany(SHAPES, 3);
  const target = pick(options);
  return {
    kind: "shapeName",
    prompt: "이건 무슨 모양일까요?",
    visual: `<span class="shape-big">${target.glyph}</span>`,
    visualClass: "visual-shape",
    choices: options.map((s) => s.name),
    answer: options.indexOf(target),
    choiceStyle: "text",
    key: `shapeName-${target.name}`
  };
}

function qCompare(max) {
  const thing = pick(THINGS);
  let left = randInt(1, max);
  let right = randInt(1, max);
  while (left === right) right = randInt(1, max);
  const groups = [repeatEmoji(thing.emoji, left), repeatEmoji(thing.emoji, right)];
  return {
    kind: "compare",
    prompt: "어느 쪽이 더 많을까요?",
    visual: null,
    choices: groups,
    answer: left > right ? 0 : 1,
    answerLabel: left > right ? "왼쪽" : "오른쪽",
    choiceStyle: "group",
    key: `compare-${thing.name}-${left}-${right}`
  };
}

function qNumberFind(max) {
  const target = randInt(1, max);
  const { choices, answer } = numberChoices(target, 1, max + 2, 3);
  return {
    kind: "numberFind",
    prompt: `숫자 ${target}${particle(target, "은는")} 어디 있을까요?`,
    visual: "🔢",
    visualClass: "visual-emoji",
    choices,
    answer,
    choiceStyle: "number",
    key: `numberFind-${target}`
  };
}

function qAddVisual(max) {
  const thing = pick(THINGS);
  const a = randInt(1, Math.max(1, max - 1));
  const b = randInt(1, max - a);
  const sum = a + b;
  const { choices, answer } = numberChoices(sum, 1, max + 3, 3);
  return {
    kind: "addVisual",
    prompt: `${thing.name} ${a}${thing.unit}에 ${b}${thing.unit}를 더하면 모두 몇 ${thing.unit}일까요?`,
    visual: `${repeatEmoji(thing.emoji, a)}<span class="op">＋</span>${repeatEmoji(thing.emoji, b)}`,
    visualClass: "visual-emoji",
    choices,
    answer,
    choiceStyle: "number",
    key: `addVisual-${a}-${b}`
  };
}

function qAdd(max) {
  const a = randInt(1, max - 1);
  const b = randInt(1, max - a);
  const sum = a + b;
  const { choices, answer } = numberChoices(sum, 1, max + 5, 4);
  return {
    kind: "add",
    prompt: `${a} 더하기 ${b}${particle(b, "은는")} 얼마일까요?`,
    visual: `<span class="calc">${a} + ${b} = ?</span>`,
    visualClass: "visual-calc",
    choices,
    answer,
    choiceStyle: "number",
    key: `add-${a}-${b}`
  };
}

function qSub(max) {
  const a = randInt(2, max);
  const b = randInt(1, a - 1);
  const diff = a - b;
  const { choices, answer } = numberChoices(diff, 0, max, 4);
  return {
    kind: "sub",
    prompt: `${a} 빼기 ${b}${particle(b, "은는")} 얼마일까요?`,
    visual: `<span class="calc">${a} − ${b} = ?</span>`,
    visualClass: "visual-calc",
    choices,
    answer,
    choiceStyle: "number",
    key: `sub-${a}-${b}`
  };
}

function qMultiply(maxTable) {
  const tables = maxTable <= 5 ? [2, 5] : [2, 3, 4, 5, 6, 7, 8, 9];
  const a = pick(tables);
  const b = randInt(2, 9);
  const product = a * b;
  const { choices, answer } = numberChoices(product, 2, product + 12, 4);
  return {
    kind: "multiply",
    prompt: `${a} 곱하기 ${b}${particle(b, "은는")} 얼마일까요?`,
    visual: `<span class="calc">${a} × ${b} = ?</span>`,
    visualClass: "visual-calc",
    choices,
    answer,
    choiceStyle: "number",
    key: `multiply-${a}-${b}`
  };
}

function qSequence(max, step) {
  const gap = step || 1;
  const start = randInt(1, Math.max(1, max - gap * 4));
  const series = [0, 1, 2, 3, 4].map((i) => start + i * gap);
  const hideAt = randInt(1, 3);
  const target = series[hideAt];
  const shown = series
    .map((n, i) => (i === hideAt ? `<span class="blank">?</span>` : `<span>${n}</span>`))
    .join("");
  const { choices, answer } = numberChoices(target, 1, max + gap * 2, 3);
  return {
    kind: "sequence",
    prompt: "빈칸에 들어갈 숫자는 무엇일까요?",
    visual: `<span class="series">${shown}</span>`,
    visualClass: "visual-series",
    choices,
    answer,
    choiceStyle: "number",
    key: `sequence-${start}-${gap}-${hideAt}`
  };
}

function qBigger(max) {
  const a = randInt(1, max);
  let b = randInt(1, max);
  while (a === b) b = randInt(1, max);
  const values = [a, b];
  return {
    kind: "bigger",
    prompt: "어느 숫자가 더 클까요?",
    visual: null,
    choices: values.map(String),
    answer: a > b ? 0 : 1,
    choiceStyle: "number",
    key: `bigger-${a}-${b}`
  };
}

// ---- 나이별 난이도 ----

function generatorsForAge(age) {
  if (age <= 4) {
    return [
      () => qCount(5),
      () => qColorFind(),
      () => qShapeFind(),
      () => qCompare(4),
      () => qNumberFind(5),
      () => qColorName()
    ];
  }
  if (age <= 6) {
    return [
      () => qCount(10),
      () => qAddVisual(8),
      () => qCompare(8),
      () => qColorName(),
      () => qShapeName(),
      () => qSequence(10, 1),
      () => qBigger(10)
    ];
  }
  if (age <= 8) {
    return [
      () => qAdd(20),
      () => qSub(20),
      () => qSequence(20, pick([1, 2])),
      () => qBigger(50),
      () => qCount(15),
      () => qMultiply(5)
    ];
  }
  return [
    () => qAdd(100),
    () => qSub(100),
    () => qMultiply(9),
    () => qSequence(50, pick([2, 3, 5])),
    () => qBigger(100)
  ];
}

// 고정 문제 은행에서 나이에 맞는 문제를 고른다.
function curatedForAge(age) {
  return QUESTION_BANK
    .filter((q) => Math.abs(q.age - age) <= 1)
    .map((q) => ({
      kind: "curated",
      prompt: q.question,
      visual: "🤔",
      visualClass: "visual-emoji",
      choices: q.choices,
      answer: q.answer,
      choiceStyle: "text",
      key: `curated-${q.question}`
    }));
}

// 한 사람이 풀 문제 묶음을 만든다.
function buildQuiz(age, count) {
  const total = count || 5;
  const curatedWanted = age <= 4 ? 1 : 2;
  const curated = pickMany(curatedForAge(age), curatedWanted);
  const generators = generatorsForAge(age);
  const used = new Set(curated.map((q) => q.key));
  const generated = [];

  let guard = 0;
  while (generated.length < total - curated.length && guard < 200) {
    guard++;
    const q = pick(generators)();
    if (used.has(q.key)) continue;
    used.add(q.key);
    generated.push(q);
  }

  const quiz = shuffle([...curated, ...generated]).slice(0, total);
  // 어린 나이는 숫자 보기에 점 개수를 함께 보여준다.
  quiz.forEach((q) => {
    q.dots = age <= 5 && q.choiceStyle === "number";
  });
  return quiz;
}

// 한 문제만 필요할 때. 가끔 상식 문제를 섞는다.
function buildSingleQuestion(age) {
  if (Math.random() < 0.3) {
    const pool = curatedForAge(age);
    if (pool.length) return pick(pool);
  }
  const q = pick(generatorsForAge(age))();
  q.dots = age <= 5 && q.choiceStyle === "number";
  return q;
}

// 다같이 푸는 보너스 문제는 가장 큰 아이 기준으로 만든다.
function buildBonus(maxAge) {
  const generators = generatorsForAge(maxAge);
  const q = pick(generators)();
  q.dots = maxAge <= 5 && q.choiceStyle === "number";
  return q;
}
