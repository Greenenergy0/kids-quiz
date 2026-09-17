// 영어 놀이. 문제 모양은 questions.js와 같고, 영어로 읽어야 하는 부분만 lang: "en"으로 표시한다.
const EN_WORDS = [
  { emoji: "🐶", ko: "강아지", en: "dog" },
  { emoji: "🐱", ko: "고양이", en: "cat" },
  { emoji: "🐰", ko: "토끼", en: "rabbit" },
  { emoji: "🐻", ko: "곰", en: "bear" },
  { emoji: "🐤", ko: "병아리", en: "chick" },
  { emoji: "🐘", ko: "코끼리", en: "elephant" },
  { emoji: "🦁", ko: "사자", en: "lion" },
  { emoji: "🐟", ko: "물고기", en: "fish" },
  { emoji: "🍎", ko: "사과", en: "apple" },
  { emoji: "🍌", ko: "바나나", en: "banana" },
  { emoji: "🍓", ko: "딸기", en: "strawberry" },
  { emoji: "🍇", ko: "포도", en: "grapes" },
  { emoji: "🥕", ko: "당근", en: "carrot" },
  { emoji: "🍞", ko: "빵", en: "bread" },
  { emoji: "🥛", ko: "우유", en: "milk" },
  { emoji: "🚗", ko: "자동차", en: "car" },
  { emoji: "✈️", ko: "비행기", en: "airplane" },
  { emoji: "🚌", ko: "버스", en: "bus" },
  { emoji: "🏠", ko: "집", en: "house" },
  { emoji: "🌳", ko: "나무", en: "tree" },
  { emoji: "🌙", ko: "달", en: "moon" },
  { emoji: "⭐", ko: "별", en: "star" },
  { emoji: "☀️", ko: "해", en: "sun" },
  { emoji: "☂️", ko: "우산", en: "umbrella" }
];

const EN_NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

const EN_COLORS = [
  { name: "빨간색", en: "red", hex: "#ef4444" },
  { name: "파란색", en: "blue", hex: "#3b82f6" },
  { name: "노란색", en: "yellow", hex: "#facc15" },
  { name: "초록색", en: "green", hex: "#22c55e" },
  { name: "보라색", en: "purple", hex: "#a855f7" },
  { name: "주황색", en: "orange", hex: "#fb923c" },
  { name: "분홍색", en: "pink", hex: "#f472b6" },
  { name: "갈색", en: "brown", hex: "#a16207" }
];

const EN_PHRASES = [
  { en: "Hello!", ko: "안녕!" },
  { en: "Thank you!", ko: "고마워!" },
  { en: "Good morning!", ko: "좋은 아침!" },
  { en: "I am happy!", ko: "나는 행복해!" },
  { en: "Let's play!", ko: "같이 놀자!" },
  { en: "I love you!", ko: "사랑해!" },
  { en: "Good night!", ko: "잘 자!" },
  { en: "See you!", ko: "또 만나!" }
];

// 그림을 보고 영어 단어 고르기
function enWordQuestion() {
  const options = pickMany(EN_WORDS, 3);
  const target = pick(options);
  return {
    kind: "enWord",
    prompt: `${target.ko}${particle(target.ko, "은는")} 영어로 뭘까요?`,
    visual: `<span>${target.emoji}</span>`,
    visualClass: "visual-emoji",
    choices: options.map((w) => w.en),
    answer: options.indexOf(target),
    choiceStyle: "text",
    choiceLang: "en",
    key: `enWord-${target.en}`
  };
}

// 영어를 듣고 그림 고르기
function enListenQuestion() {
  const options = pickMany(EN_WORDS, 4);
  const target = pick(options);
  return {
    kind: "enListen",
    prompt: `Where is the ${target.en}?`,
    speakParts: [
      { text: `Where is the ${target.en}?`, lang: "en" },
      { text: "어떤 그림일까요?", lang: "ko" }
    ],
    visual: "👂",
    visualClass: "visual-emoji",
    choices: options.map((w) => w.emoji),
    answer: options.indexOf(target),
    choiceStyle: "emoji",
    choiceLang: "en",
    answerLabel: target.en,
    key: `enListen-${target.en}`
  };
}

// 숫자를 영어로
function enNumberQuestion(max) {
  const target = randInt(1, max || 10);
  const pool = EN_NUMBERS.slice(1, (max || 10) + 1).filter((w) => w !== EN_NUMBERS[target]);
  const options = shuffle([EN_NUMBERS[target], ...pickMany(pool, 2)]);
  return {
    kind: "enNumber",
    prompt: `${target}${particle(target, "은는")} 영어로 뭘까요?`,
    visual: `<span class="calc">${target}</span>`,
    visualClass: "visual-calc",
    choices: options,
    answer: options.indexOf(EN_NUMBERS[target]),
    choiceStyle: "text",
    choiceLang: "en",
    key: `enNumber-${target}`
  };
}

// 색깔을 영어로
function enColorQuestion() {
  const options = pickMany(EN_COLORS, 3);
  const target = pick(options);
  return {
    kind: "enColor",
    prompt: "이 색깔은 영어로 뭘까요?",
    visual: `<span class="swatch-big" style="background:${target.hex}"></span>`,
    visualClass: "visual-swatch",
    choices: options.map((c) => c.en),
    answer: options.indexOf(target),
    choiceStyle: "text",
    choiceLang: "en",
    key: `enColor-${target.en}`
  };
}

function buildEnglishQuestion(age) {
  const builders = age <= 5
    ? [enWordQuestion, enListenQuestion, enColorQuestion, () => enNumberQuestion(5)]
    : [enWordQuestion, enListenQuestion, enColorQuestion, () => enNumberQuestion(10)];
  return pick(builders)();
}

function pickPhrase() {
  return pick(EN_PHRASES);
}
