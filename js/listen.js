// 차 안에서 화면을 보지 않고 '귀로만' 풀 수 있는 문제들.
// 보기는 모두 글자라서 TTS가 "1번 …, 2번 …" 하고 읽어 준다.

const ANIMAL_SOUNDS = [
  { sound: "멍멍", animal: "강아지" },
  { sound: "야옹", animal: "고양이" },
  { sound: "꿀꿀", animal: "돼지" },
  { sound: "음메", animal: "소" },
  { sound: "꽥꽥", animal: "오리" },
  { sound: "짹짹", animal: "참새" },
  { sound: "개굴개굴", animal: "개구리" },
  { sound: "어흥", animal: "호랑이" },
  { sound: "히잉", animal: "말" },
  { sound: "삐약삐약", animal: "병아리" },
  { sound: "매애", animal: "양" },
  { sound: "찍찍", animal: "생쥐" }
];

const OPPOSITES = [
  { word: "크다", answer: "작다", others: ["길다", "많다"] },
  { word: "높다", answer: "낮다", others: ["넓다", "빠르다"] },
  { word: "빠르다", answer: "느리다", others: ["무겁다", "짧다"] },
  { word: "뜨겁다", answer: "차갑다", others: ["달다", "밝다"] },
  { word: "밝다", answer: "어둡다", others: ["조용하다", "가볍다"] },
  { word: "많다", answer: "적다", others: ["깊다", "두껍다"] },
  { word: "길다", answer: "짧다", others: ["둥글다", "세다"] },
  { word: "무겁다", answer: "가볍다", others: ["시끄럽다", "달다"] },
  { word: "위", answer: "아래", others: ["옆", "앞"] },
  { word: "앞", answer: "뒤", others: ["위", "밖"] },
  { word: "안", answer: "밖", others: ["아래", "옆"] },
  { word: "낮", answer: "밤", others: ["아침", "저녁"] },
  { word: "여름", answer: "겨울", others: ["봄", "가을"] },
  { word: "울다", answer: "웃다", others: ["자다", "먹다"] }
];

const RIDDLES = [
  { hint: "노랗고 길쭉해요. 원숭이가 좋아하는 과일이에요.", answer: "바나나", others: ["사과", "수박"] },
  { hint: "빨갛고 동그래요. 아삭아삭 소리가 나는 과일이에요.", answer: "사과", others: ["포도", "귤"] },
  { hint: "하늘을 날아요. 사람을 아주 많이 태우고 멀리 가요.", answer: "비행기", others: ["자전거", "배"] },
  { hint: "밤하늘에 떠 있어요. 반짝반짝 빛나는 아주 작은 불빛이에요.", answer: "별", others: ["구름", "눈"] },
  { hint: "비가 올 때 머리 위에 펼쳐서 써요.", answer: "우산", others: ["모자", "장갑"] },
  { hint: "코가 아주 길어요. 귀도 부채처럼 크고 몸집이 제일 커요.", answer: "코끼리", others: ["기린", "하마"] },
  { hint: "목이 아주 길어요. 높은 나뭇잎을 먹어요.", answer: "기린", others: ["사자", "곰"] },
  { hint: "하얗고 차가워요. 겨울에 하늘에서 내려와요.", answer: "눈", others: ["비", "바람"] },
  { hint: "동그란 얼굴에 바늘이 두 개 있어요. 시간을 알려 줘요.", answer: "시계", others: ["거울", "그림"] },
  { hint: "물속에서 살아요. 지느러미로 헤엄치고 아가미로 숨을 쉬어요.", answer: "물고기", others: ["다람쥐", "참새"] },
  { hint: "노란색이고 낮에 하늘에서 아주 밝게 빛나요.", answer: "해", others: ["달", "별"] },
  { hint: "발에 신어요. 밖에 나갈 때 꼭 신고 나가요.", answer: "신발", others: ["모자", "가방"] },
  { hint: "알록달록 일곱 빛깔이에요. 비가 그친 뒤에 하늘에 떠요.", answer: "무지개", others: ["구름", "번개"] },
  { hint: "흰 우유를 주는 동물이에요. 음메 하고 울어요.", answer: "소", others: ["말", "닭"] },
  { hint: "책을 빌려 읽는 조용한 곳이에요.", answer: "도서관", others: ["시장", "공항"] },
  { hint: "겨울잠을 자요. 꿀을 아주 좋아하는 동물이에요.", answer: "곰", others: ["여우", "토끼"] }
];

const NATIVE_PREFIX = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
const NATIVE_NUMBER = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];

function countWord(n, unit) {
  return NATIVE_PREFIX[n] ? `${NATIVE_PREFIX[n]} ${unit}` : `${n}${unit}`;
}

function listenAnimalSound() {
  const options = pickMany(ANIMAL_SOUNDS, 3);
  const target = pick(options);
  return {
    kind: "listenSound",
    prompt: `${target.sound} 하고 우는 동물은 누구일까요?`,
    choices: options.map((o) => o.animal),
    answer: options.indexOf(target),
    choiceStyle: "text",
    audio: true,
    key: `sound-${target.animal}`
  };
}

function listenOpposite() {
  const item = pick(OPPOSITES);
  const options = shuffle([item.answer, ...item.others]);
  return {
    kind: "listenOpposite",
    prompt: `"${item.word}"의 반대말은 무엇일까요?`,
    speak: `${item.word}. 반대말은 무엇일까요?`,
    choices: options,
    answer: options.indexOf(item.answer),
    choiceStyle: "text",
    audio: true,
    key: `opposite-${item.word}`
  };
}

function listenRiddle() {
  const item = pick(RIDDLES);
  const options = shuffle([item.answer, ...item.others]);
  return {
    kind: "listenRiddle",
    prompt: `${item.hint} 무엇일까요?`,
    choices: options,
    answer: options.indexOf(item.answer),
    choiceStyle: "text",
    audio: true,
    key: `riddle-${item.answer}`
  };
}

// 소리로 듣고 세는 셈. 어린 아이는 "세 개" 처럼 우리말 수로 읽어 준다.
function listenCountAdd(age) {
  const thing = pick(THINGS);
  const max = age <= 5 ? 5 : 9;
  const a = randInt(1, max - 1);
  const b = randInt(1, Math.min(max - a, 4));
  const sum = a + b;
  const wrong = shuffle([sum + 1, sum - 1, sum + 2].filter((n) => n > 0 && n !== sum && n <= 10)).slice(0, 2);
  const values = shuffle([sum, ...wrong]);
  return {
    kind: "listenCount",
    prompt: `${thing.name}${particle(thing.name, "이가")} ${countWord(a, thing.unit)} 있는데 ${countWord(b, thing.unit)}를 더 주면 모두 몇 ${thing.unit}일까요?`,
    choices: values.map((n) => countWord(n, thing.unit)),
    answer: values.indexOf(sum),
    choiceStyle: "text",
    audio: true,
    key: `listenCount-${thing.name}-${a}-${b}`
  };
}

function listenNumberNext(age) {
  if (age <= 6) {
    const start = randInt(1, 5);
    const answer = start + 3;
    // 방금 부른 수를 함정으로 쓸 때도, 아예 다음 수들로만 낼 때도 있다
    const distractors = Math.random() < 0.5 ? [answer - 1, answer + 1] : [answer + 1, answer + 2];
    const options = shuffle([answer, ...distractors]);
    return {
      kind: "listenNext",
      prompt: `${NATIVE_NUMBER[start]}, ${NATIVE_NUMBER[start + 1]}, ${NATIVE_NUMBER[start + 2]} 다음은 무엇일까요?`,
      choices: options.map((n) => NATIVE_NUMBER[n] || String(n)),
      answer: options.indexOf(answer),
      choiceStyle: "text",
      audio: true,
      key: `listenNext-${start}`
    };
  }
  const step = pick([2, 5, 10]);
  const start = step * randInt(1, 4);
  const answer = start + step * 3;
  const options = shuffle([answer, answer + step, answer - step]);
  return {
    kind: "listenNext",
    prompt: `${start}, ${start + step}, ${start + step * 2} 다음은 무엇일까요?`,
    choices: options.map(String),
    answer: options.indexOf(answer),
    choiceStyle: "text",
    audio: true,
    key: `listenNextBig-${start}-${step}`
  };
}

function listenMath(age) {
  const max = age <= 6 ? 10 : (age <= 8 ? 20 : 100);
  const plus = Math.random() < 0.6;
  let a, b, result;
  if (plus) {
    a = randInt(1, max - 1);
    b = randInt(1, max - a);
    result = a + b;
  } else {
    a = randInt(2, max);
    b = randInt(1, a - 1);
    result = a - b;
  }
  const gap = max > 20 ? 10 : 1;
  const options = shuffle([result, result + gap, Math.max(0, result - gap)]);
  return {
    kind: "listenMath",
    prompt: plus ? `${a} 더하기 ${b}는 얼마일까요?` : `${a} 빼기 ${b}는 얼마일까요?`,
    choices: [...new Set(options)].map(String),
    answer: [...new Set(options)].indexOf(result),
    choiceStyle: "text",
    audio: true,
    key: `listenMath-${a}-${b}-${plus}`
  };
}

// 영어를 듣고 우리말 뜻 고르기
function listenEnToKo() {
  const options = pickMany(EN_WORDS, 3);
  const target = pick(options);
  return {
    kind: "listenEnToKo",
    prompt: `"${target.en}"은 무슨 뜻일까요?`,
    speakParts: [
      { text: target.en, lang: "en" },
      { text: "무슨 뜻일까요?", lang: "ko" }
    ],
    choices: options.map((w) => w.ko),
    answer: options.indexOf(target),
    choiceStyle: "text",
    audio: true,
    key: `enToKo-${target.en}`
  };
}

// 우리말을 듣고 영어 단어 고르기
function listenKoToEn() {
  const options = pickMany(EN_WORDS, 3);
  const target = pick(options);
  return {
    kind: "listenKoToEn",
    prompt: `${target.ko}${particle(target.ko, "은는")} 영어로 뭘까요?`,
    choices: options.map((w) => w.en),
    answer: options.indexOf(target),
    choiceStyle: "text",
    choiceLang: "en",
    audio: true,
    key: `koToEn-${target.en}`
  };
}

function buildListenQuestion(age) {
  const builders = [listenAnimalSound, listenOpposite, listenRiddle, () => listenNumberNext(age)];
  if (age <= 6) builders.push(() => listenCountAdd(age));   // 어린 아이는 우리말 수로 세기
  if (age >= 6) builders.push(() => listenMath(age), () => listenMath(age));
  return pick(builders)();
}

function buildListenEnglishQuestion() {
  return pick([listenEnToKo, listenKoToEn])();
}
