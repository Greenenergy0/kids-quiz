const app = document.getElementById("app");
const soundToggle = document.getElementById("sound-toggle");

const ROSTER_KEY = "kidsquiz.roster";
const MODE_KEY = "kidsquiz.listenMode";
const VOICE_ANSWER_KEY = "kidsquiz.voiceAnswer";
const MAX_PLAYERS = 6;
const MIN_AGE = 3;
const MAX_AGE = 10;
const DEFAULT_AGE = 6;
const AVATARS = ["🦊", "🐻", "🐼", "🐯", "🐸", "🦄"];

// 놀이 진행 순서. 끝까지 가면 다시 처음부터 돈다.
const CYCLE = ["quiz", "quiz", "english", "wordchain", "quiz", "story", "quiz", "english", "phrase", "quiz", "wordchain", "story"];

const state = {
  players: [],      // 비어 있으면 '다같이' 모드
  turnIndex: 0,
  teamStars: 0,
  planIndex: 0,
  lastKind: null,
  story: null,
  storySeg: 0,
  profileIndex: 0,
  ageDraft: DEFAULT_AGE,
  recent: [],
  recentStories: [],
  // 차 안에서는 화면을 안 보고 소리만 듣고 푸는 문제만 낸다.
  listenMode: Store.get(MODE_KEY) !== "0",
  // 말로 대답하기. 마이크 권한이 필요해서 기본은 꺼짐.
  voiceMode: Store.get(VOICE_ANSWER_KEY) === "1",
  chainWord: null,
  chainUsed: [],
  chainRound: 0
};

// 같은 칭찬만 반복하면 기계처럼 들려서, 매번 다르게 말해 준다.
const PRAISE = [
  "우와, 맞았어!",
  "딩동댕! 잘했어!",
  "오, 정확해!",
  "정말 잘하는구나!",
  "맞았어! 대단한걸?",
  "그렇지! 바로 그거야!"
];

const CONSOLE_LINES = [
  "아쉽다! 그래도 잘 들었어.",
  "괜찮아, 이런 것도 있구나!",
  "거의 다 왔는데! 괜찮아.",
  "음, 아쉽다! 다음엔 맞힐 거야."
];

// ---- 공통 도우미 ----

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function vocative(name) {
  return name + (hasBatchim(name) ? "아" : "야");
}

function avatarOf(index) {
  return AVATARS[index % AVATARS.length];
}

// 가끔은 이름을 불러 준다. ("아린아, 우와 맞았어!")
function praiseLine() {
  const line = pick(PRAISE);
  if (isTeamMode() || Math.random() < 0.5) return line;
  return `${vocative(currentLabel())}, ${line}`;
}

function consoleLine() {
  return pick(CONSOLE_LINES);
}

function isTeamMode() {
  return state.players.length === 0;
}

function currentPlayer() {
  return isTeamMode() ? null : state.players[state.turnIndex % state.players.length];
}

function currentAge() {
  const player = currentPlayer();
  return player ? player.age : DEFAULT_AGE;
}

function currentLabel() {
  const player = currentPlayer();
  return player ? player.name : "다같이";
}

function currentAvatar() {
  return isTeamMode() ? "🧒" : avatarOf(state.turnIndex % state.players.length);
}

function addStar() {
  const player = currentPlayer();
  if (player) player.stars++;
  else state.teamStars++;
}

function totalStars() {
  return isTeamMode() ? state.teamStars : state.players.reduce((sum, p) => sum + p.stars, 0);
}

function advanceTurn() {
  if (!isTeamMode()) state.turnIndex = (state.turnIndex + 1) % state.players.length;
}

function saveRoster() {
  const roster = state.players.map((p) => ({ name: p.name, age: p.age }));
  Store.set(ROSTER_KEY, JSON.stringify(roster));
}

function loadRoster() {
  try {
    const raw = JSON.parse(Store.get(ROSTER_KEY) || "[]");
    return Array.isArray(raw) && raw.length ? raw : null;
  } catch {
    return null;
  }
}

function bind(selector, handler, event) {
  app.querySelectorAll(selector).forEach((el) => el.addEventListener(event || "click", handler));
}

function show(html) {
  app.innerHTML = html;
  app.scrollTop = 0;
}

let pendingTimer = null;
let navLockUntil = 0;

// 아이들이 버튼을 연타해도 화면이 두 칸씩 넘어가지 않게 한다.
function navOnce(fn) {
  return () => {
    const now = Date.now();
    if (now < navLockUntil) return;
    navLockUntil = now + 400;
    fn();
  };
}

// 화면을 바꿀 때 예약된 진행을 취소한다. (남아 있으면 다음 화면을 건너뛰어 버린다)
function goto(screen) {
  Speech.stop();
  Mic.stop();
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  screen();
}

// 최근에 낸 문제는 잠시 피한다.
function freshQuestion(builder) {
  let question = builder();
  for (let i = 0; i < 12 && state.recent.includes(question.key); i++) question = builder();
  state.recent.push(question.key);
  if (state.recent.length > 25) state.recent.shift();
  return question;
}

function freshStory() {
  let story = pick(STORIES);
  for (let i = 0; i < 8 && state.recentStories.includes(story.title); i++) story = pick(STORIES);
  state.recentStories.push(story.title);
  if (state.recentStories.length > 3) state.recentStories.shift();
  return story;
}

// ---- 시작 화면 ----

function screenWelcome() {
  const roster = loadRoster();
  show(`
    <section class="card center">
      <div class="hero">🎈</div>
      <h1 class="title">같이 놀자!</h1>
      <p class="sub">퀴즈도 내고, 이야기도 들려주고,<br>영어도 알려줄게요.</p>
      <button class="btn primary big" data-act="quick">바로 시작하기</button>
      <button class="btn ghost" data-act="named">
        이름 알려주고 시작하기
        <span class="hint">이름을 알려주면 차례대로 불러 줄게요</span>
      </button>
      ${roster ? `
        <button class="btn ghost small" data-act="resume">
          지난번 친구들로 시작
          <span class="hint">${escapeHtml(roster.map((p) => `${p.name}(${p.age}살)`).join(", "))}</span>
        </button>` : ""}
    </section>
  `);

  bind('[data-act="quick"]', () => {
    state.players = [];
    startSession();
  });
  bind('[data-act="named"]', () => {
    state.players = [];
    goto(screenCount);
  });
  bind('[data-act="resume"]', () => {
    state.players = roster.map((p) => ({ name: p.name, age: p.age, stars: 0 }));
    startSession();
  });

  Speech.say(["안녕! 나랑 같이 놀래?", "바로 시작하기를 눌러도 되고, 이름을 알려줘도 좋아."]);
}

function screenCount() {
  const buttons = Array.from({ length: MAX_PLAYERS }, (_, i) => i + 1)
    .map((n) => `<button class="count-btn" data-count="${n}"><span class="count-num">${n}</span><span class="count-label">명</span></button>`)
    .join("");

  show(`
    <section class="card">
      <h2 class="ask">지금 몇 명이 함께 있어?</h2>
      <div class="count-grid">${buttons}</div>
      <button class="btn ghost small" data-act="skip">그냥 다같이 놀기</button>
    </section>
  `);

  bind("[data-count]", (e) => {
    const count = Number(e.currentTarget.dataset.count);
    state.players = Array.from({ length: count }, () => ({ name: "", age: DEFAULT_AGE, stars: 0 }));
    state.profileIndex = 0;
    goto(screenName);
  });
  bind('[data-act="skip"]', () => {
    state.players = [];
    startSession();
  });

  Speech.say("지금 몇 명이 함께 있어? 사람 수를 눌러 줘.");
}

function screenName() {
  const index = state.profileIndex;
  const roster = loadRoster() || [];
  const chips = roster
    .filter((p) => p.name)
    .map((p) => `<button class="chip" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)}</button>`)
    .join("");

  show(`
    <section class="card">
      <p class="step">${index + 1}번째 친구</p>
      <h2 class="ask">이름이 뭐야?</h2>
      <input class="name-input" id="nameInput" type="text" maxlength="10" autocomplete="off" placeholder="이름을 적어 주세요">
      ${chips ? `<div class="chips"><span class="chips-label">지난번 친구</span>${chips}</div>` : ""}
      <button class="btn primary" data-act="next">다음</button>
      <button class="btn ghost small" data-act="skip">이름 없이 그냥 놀기</button>
    </section>
  `);

  const input = app.querySelector("#nameInput");
  input.focus();

  const submit = () => {
    const name = input.value.trim();
    if (!name) {
      input.classList.add("shake");
      setTimeout(() => input.classList.remove("shake"), 400);
      Speech.say("이름을 적어 줘.");
      return;
    }
    state.players[index].name = name;
    state.ageDraft = DEFAULT_AGE;
    goto(screenAge);
  };

  bind('[data-act="next"]', submit);
  bind('[data-act="skip"]', () => {
    state.players = [];
    startSession();
  });
  bind(".chip", (e) => { input.value = e.currentTarget.dataset.name; });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

  Speech.say(`${index + 1}번째 친구, 이름이 뭐야? 어른이 적어 줘도 좋아.`);
}

function screenAge() {
  const player = state.players[state.profileIndex];
  const name = player.name;

  const draw = () => {
    show(`
      <section class="card">
        <h2 class="ask">${escapeHtml(name)}${particle(name, "은는")} 몇 살이야?</h2>
        <div class="stepper">
          <button class="step-btn" data-delta="-1" aria-label="나이 줄이기">−</button>
          <div class="age-display"><span class="age-num">${state.ageDraft}</span><span class="age-unit">살</span></div>
          <button class="step-btn" data-delta="1" aria-label="나이 늘리기">＋</button>
        </div>
        <button class="btn primary" data-act="next">다음</button>
      </section>
    `);

    bind("[data-delta]", (e) => {
      state.ageDraft = Math.min(MAX_AGE, Math.max(MIN_AGE, state.ageDraft + Number(e.currentTarget.dataset.delta)));
      draw();
      Speech.say(`${state.ageDraft}살`);
    });

    bind('[data-act="next"]', () => {
      player.age = state.ageDraft;
      state.profileIndex++;
      if (state.profileIndex < state.players.length) goto(screenName);
      else { saveRoster(); startSession(); }
    });
  };

  draw();
  Speech.say(`${name}${particle(name, "은는")} 몇 살이야?`);
}

// ---- 놀이 진행 ----

// 차 안에서 노는 동안 화면이 꺼지지 않게 한다.
let wakeLock = null;

async function keepAwake() {
  if (!("wakeLock" in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch {
    wakeLock = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") keepAwake();
});

function startSession() {
  keepAwake();
  state.turnIndex = 0;
  state.teamStars = 0;
  state.planIndex = 0;
  state.lastKind = null;
  state.recent = [];
  state.players.forEach((p) => { p.stars = 0; });
  goto(screenHello);
}

function screenHello() {
  const who = isTeamMode() ? "친구들" : state.players.map((p) => p.name).join(", ");
  show(`
    <section class="card center">
      <div class="hero">👋</div>
      <h2 class="title">안녕, ${escapeHtml(who)}!</h2>
      <p class="sub">${isTeamMode() ? "오늘은 다같이 놀자." : "한 명씩 차례대로 물어볼게."}<br>퀴즈도 풀고, 이야기도 듣고, 영어도 해보자!</p>
      <button class="btn primary big" data-act="go">좋아, 놀자!</button>
    </section>
  `);

  bind('[data-act="go"]', navOnce(nextStep));
  Speech.say([`안녕, ${who}!`, "오늘은 나랑 같이 놀자.", "퀴즈도 내고, 재미있는 이야기도 들려줄게."], "warm");
}

function nextStep() {
  const kind = CYCLE[state.planIndex % CYCLE.length];
  state.planIndex++;
  runActivity(kind);
}

function runActivity(kind, skipIntro) {
  const changed = kind !== state.lastKind;
  state.lastKind = kind;
  if (changed && !skipIntro && kind !== "quiz") goto(() => screenTransition(kind));
  else goto(() => startActivity(kind));
}

function startActivity(kind) {
  if (kind === "story") startStory();
  else if (kind === "english") screenEnglish();
  else if (kind === "phrase") screenPhrase();
  else if (kind === "wordchain") startWordChain();
  else screenQuiz();
}

function screenTransition(kind) {
  const who = isTeamMode() ? "얘들아" : vocative(currentLabel());
  const cards = {
    story: { emoji: "📖", title: "이야기 들려줄게!", sub: "편하게 듣기만 하면 돼.", line: `${who}, 이번엔 재미있는 이야기 하나 들려줄게.` },
    english: { emoji: "🔤", title: "이번엔 영어 놀이!", sub: "영어로 뭐라고 하는지 맞혀 보자.", line: `${who}, 이번엔 영어로 놀아 볼까?` },
    phrase: { emoji: "🗣️", title: "따라 말하기!", sub: "내가 말하면 큰 소리로 따라 해 봐.", line: `${who}, 내가 하는 말을 따라 해 볼래?` },
    wordchain: { emoji: "🔗", title: "끝말잇기 하자!", sub: "내가 말하면 이어지는 말을 골라 봐.", line: `${who}, 우리 끝말잇기 할까?` }
  };
  const card = cards[kind];

  show(`
    <section class="card center">
      <div class="hero">${card.emoji}</div>
      <h2 class="title">${card.title}</h2>
      <p class="sub">${card.sub}</p>
      <button class="btn primary big" data-act="go">좋아!</button>
      <button class="btn ghost small" data-act="hub">다른 놀이 할래</button>
    </section>
  `);

  bind('[data-act="go"]', navOnce(() => goto(() => startActivity(kind))));
  bind('[data-act="hub"]', () => goto(screenHub));
  Speech.say(card.line);
}

// ---- 문제 내기 ----

function topBar() {
  return `
    <header class="quiz-top">
      <button class="pill-btn" data-act="hub">🎪 놀이 바꾸기</button>
      <span class="star-count">⭐ ${totalStars()}</span>
      <button class="pill-btn" data-act="replay">🔊 다시</button>
    </header>`;
}

function bindTopBar(onReplay) {
  bind('[data-act="hub"]', () => goto(screenHub));
  bind('[data-act="replay"]', onReplay);
}

function choiceHtml(q) {
  return q.choices
    .map((choice, i) => {
      if (q.choiceStyle === "color") {
        return `<button class="choice choice--color" data-i="${i}" style="background:${choice.hex}" aria-label="${choice.name}"></button>`;
      }
      if (q.choiceStyle === "shape") {
        return `<button class="choice choice--shape" data-i="${i}">${choice}</button>`;
      }
      if (q.choiceStyle === "emoji") {
        return `<button class="choice choice--emoji" data-i="${i}">${choice}</button>`;
      }
      if (q.choiceStyle === "group") {
        return `<button class="choice choice--group" data-i="${i}">${choice}</button>`;
      }
      if (q.choiceStyle === "number") {
        const n = Number(choice);
        const dots = q.dots && n > 0 && n <= 12 ? `<span class="dotrow">${"●".repeat(n)}</span>` : "";
        return `<button class="choice choice--number" data-i="${i}"><span class="digit">${choice}</span>${dots}</button>`;
      }
      return `<button class="choice choice--text" data-i="${i}"><span class="badge">${i + 1}</span>${escapeHtml(choice)}</button>`;
    })
    .join("");
}

function answerLabel(q) {
  if (q.answerLabel) return q.answerLabel;
  const correct = q.choices[q.answer];
  if (q.choiceStyle === "color") return correct.name;
  if (q.choiceStyle === "shape") {
    const found = SHAPES.find((s) => s.glyph === correct);
    return found ? found.name : "이 모양";
  }
  if (q.choiceStyle === "group") return "더 많은 쪽";
  return correct;
}

function speakQuestion(q, prefix, onDone) {
  const parts = [];
  if (prefix) parts.push({ text: prefix, lang: "ko" });
  if (q.speakParts) parts.push(...q.speakParts);
  else parts.push({ text: q.speak || q.prompt, lang: "ko" });
  // 글자·숫자 보기는 소리만 듣고도 고를 수 있게 번호와 함께 읽어 준다.
  if (q.choiceStyle === "text" || q.choiceStyle === "number") {
    q.choices.forEach((choice, i) => {
      parts.push({ text: `${i + 1}번,`, lang: "ko" });
      parts.push({ text: choice, lang: q.choiceLang || "ko" });
    });
  }
  Speech.say(parts, null, onDone);
}

function markAnswer(q, picked) {
  [...app.querySelectorAll(".choice")].forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add("correct");
    else if (i === picked) btn.classList.add("wrong");
  });
}

function askQuestion(q, options) {
  const opts = options || {};
  const label = currentLabel();
  const prefix = (!isTeamMode() && opts.turn) ? `${vocative(label)},` : null;

  show(`
    <section class="quiz">
      ${topBar()}
      <div class="card quiz-card">
        <p class="who-line">${currentAvatar()} ${escapeHtml(isTeamMode() ? "다같이!" : label + " 차례!")}</p>
        ${q.visual ? `<div class="visual ${q.visualClass || ""}">${q.visual}</div>` : ""}
        <h2 class="question">${escapeHtml(q.prompt)}</h2>
        <div class="choices choices--${q.choiceStyle}">${choiceHtml(q)}</div>
        ${state.listenMode ? '<button class="btn ghost small" id="revealBtn" data-act="reveal">🙉 정답 알려줘</button>' : ""}
        ${state.voiceMode && Mic.supported() ? '<p class="mic-line" id="micLine"></p>' : ""}
        <div class="feedback" id="feedback"></div>
      </div>
    </section>
  `);

  const hideReveal = () => {
    const btn = app.querySelector("#revealBtn");
    if (btn) btn.hidden = true;
  };

  bindTopBar(() => speakQuestion(q, prefix));

  // 아무도 화면을 안 볼 때: 정답만 듣고 맞혔는지 스스로 알려 주는 길
  bind('[data-act="reveal"]', navOnce(() => {
    hideReveal();
    [...app.querySelectorAll(".choice")].forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.answer) btn.classList.add("correct");
    });
    const label = answerLabel(q);
    app.querySelector("#feedback").innerHTML = `
      <p class="fb ok">정답은 ${escapeHtml(label)}!</p>
      <div class="fb-row">
        <button class="btn primary" data-act="got">맞혔어! ⭐</button>
        <button class="btn ghost" data-act="missed">아쉽다</button>
      </div>
    `;
    Speech.say([
      { text: "정답은", lang: "ko" },
      { text: label, lang: q.choiceLang || "ko" },
      { text: "맞혔어?", lang: "ko" }
    ], "gentle");
    bind('[data-act="got"]', navOnce(() => {
      addStar();
      finishTurn(opts);
    }));
    bind('[data-act="missed"]', navOnce(() => finishTurn(opts)));
  }));

  // 손으로 누르든 말로 답하든 여기로 온다
  const answerWith = (picked) => {
    if (app.querySelector(".fb")) return;   // 이미 답한 문제
    Mic.stop();
    hideReveal();
    const correct = picked === q.answer;
    markAnswer(q, picked);
    if (correct) addStar();

    const label2 = answerLabel(q);
    const answerLang = q.choiceLang || "ko";
    const line = correct ? praiseLine() : consoleLine();

    app.querySelector("#feedback").innerHTML = `
      <p class="fb ${correct ? "ok" : "no"}">${escapeHtml(correct ? `${line} 🎉` : `${line} 정답은 ${label2}!`)}</p>
      <button class="btn primary" data-act="next">다음!</button>
    `;
    app.querySelector(".star-count").textContent = `⭐ ${totalStars()}`;

    Speech.say(
      correct
        ? [{ text: line, lang: "ko" }, ...(answerLang === "en" ? [{ text: label2, lang: "en" }] : [])]
        : [{ text: `${line} 정답은`, lang: "ko" }, { text: label2, lang: answerLang }],
      correct ? "happy" : "gentle"
    );

    bind('[data-act="next"]', navOnce(() => finishTurn(opts)));
  };

  bind(".choice", (e) => answerWith(Number(e.currentTarget.dataset.i)));

  const listenAfterAsking = state.voiceMode && Mic.supported()
    ? () => beginListening(q, answerWith, 1)
    : null;

  speakQuestion(q, prefix, listenAfterAsking);
}

// 문제를 다 읽어 준 뒤 아이 대답을 듣는다.
function beginListening(q, answerWith, attempt) {
  if (!state.voiceMode || !Mic.supported()) return;
  if (app.querySelector(".fb")) return;
  setMicLine("🎙️ 듣고 있어…");

  Mic.start({
    onHeard: (heard) => {
      const picked = Mic.match(q, heard);
      if (picked >= 0) {
        Mic.stop();
        setMicLine("");
        answerWith(picked);
      } else if (attempt < 2) {
        setMicLine("잘 못 들었어! 다시 말해 줄래?");
        Speech.say("잘 못 들었어. 다시 말해 줄래?", "gentle", () => beginListening(q, answerWith, attempt + 1));
      } else {
        setMicLine("화면을 눌러서 골라도 돼!");
      }
    },
    onError: (err) => {
      if (err === "no-speech" && attempt < 2) {
        beginListening(q, answerWith, attempt + 1);
        return;
      }
      if (err === "not-allowed" || err === "service-not-allowed") {
        state.voiceMode = false;
        Store.set(VOICE_ANSWER_KEY, "0");
        setMicLine("마이크를 쓸 수 없어요. 화면을 눌러 주세요.");
        return;
      }
      setMicLine("화면을 눌러서 골라도 돼!");
    }
  });
}

function setMicLine(text) {
  const line = app.querySelector("#micLine");
  if (line) line.textContent = text;
}

function finishTurn(opts) {
  if (opts.onDone) opts.onDone();
  else { advanceTurn(); nextStep(); }
}

function nextQuizQuestion() {
  const age = currentAge();
  if (!state.listenMode) return buildSingleQuestion(age);
  if (Math.random() < 0.25) {
    const bank = curatedForAge(age);
    if (bank.length) return pick(bank);
  }
  return buildListenQuestion(age);
}

function screenQuiz() {
  askQuestion(freshQuestion(nextQuizQuestion), { turn: true });
}

function screenEnglish() {
  const build = state.listenMode
    ? buildListenEnglishQuestion
    : () => buildEnglishQuestion(currentAge());
  askQuestion(freshQuestion(build), { turn: true });
}

// ---- 끝말잇기 ----

function startWordChain() {
  state.chainUsed = [];
  state.chainRound = 0;
  state.chainWord = chainStartWord([]);
  state.chainUsed.push(state.chainWord);
  screenWordChain(true);
}

function screenWordChain(first) {
  const word = state.chainWord;
  const last = word[word.length - 1];
  const options = chainOptions(word, state.chainUsed);

  if (!options.length || state.chainRound >= 4) {
    goto(screenWordChainEnd);
    return;
  }

  const correct = chainPick(word, state.chainUsed) || pick(options);
  const distractors = shuffle(
    WORD_CHAIN.filter((w) => w[0] !== last && !state.chainUsed.includes(w))
  ).slice(0, 2);
  const choices = shuffle([correct, ...distractors]);
  const answer = choices.indexOf(correct);

  show(`
    <section class="quiz">
      ${topBar()}
      <div class="card quiz-card center">
        <p class="who-line">🔗 끝말잇기</p>
        <p class="chain-word">${escapeHtml(word)}</p>
        <h2 class="question">"${escapeHtml(last)}"${roParticle(last)} 시작하는 말은?</h2>
        <div class="choices choices--text">
          ${choices.map((w, i) => `<button class="choice choice--text" data-i="${i}"><span class="badge">${i + 1}</span>${escapeHtml(w)}</button>`).join("")}
        </div>
        <div class="feedback" id="feedback"></div>
      </div>
    </section>
  `);

  const speakIt = () => Speech.say([
    ...(first ? ["끝말잇기 하자! 내가 먼저 할게."] : []),
    `${word}!`,
    `${last}${roParticle(last)} 시작하는 말은 뭘까?`,
    ...choices.map((w, i) => `${i + 1}번, ${w}.`)
  ]);

  bindTopBar(speakIt);
  bind(".choice", (e) => {
    const picked = Number(e.currentTarget.dataset.i);
    const ok = picked === answer;
    [...app.querySelectorAll(".choice")].forEach((btn, i) => {
      btn.disabled = true;
      if (i === answer) btn.classList.add("correct");
      else if (i === picked) btn.classList.add("wrong");
    });
    if (ok) addStar();
    app.querySelector(".star-count").textContent = `⭐ ${totalStars()}`;

    state.chainUsed.push(correct);
    state.chainRound++;

    // 내 차례: 고른 낱말 뒤를 내가 이어 붙인다.
    const myWord = chainPick(correct, state.chainUsed);
    if (myWord) {
      state.chainUsed.push(myWord);
      state.chainWord = myWord;
    }

    const head = ok
      ? `맞았어! ${correct}!`
      : `${last}${roParticle(last)} 시작하는 말은 ${correct}${hasBatchim(correct) ? "이야" : "야"}!`;
    const tail = myWord ? ` 그럼 나는 ${myWord}!` : " 여기서 끝! 잘했어!";

    app.querySelector("#feedback").innerHTML = `
      <p class="fb ${ok ? "ok" : "no"}">${escapeHtml(head + tail)}</p>
      <button class="btn primary" data-act="next">${myWord ? "계속 이어가기" : "끝!"}</button>
    `;
    Speech.say([head + tail], ok ? "happy" : "gentle");

    bind('[data-act="next"]', navOnce(() => {
      if (myWord) goto(() => screenWordChain(false));
      else goto(screenWordChainEnd);
    }));
  });

  speakIt();
}

function screenWordChainEnd() {
  const count = state.chainUsed.length;
  show(`
    <section class="card center">
      <div class="hero">🔗</div>
      <h2 class="title">${count}개나 이어갔어!</h2>
      <p class="chain-trail">${state.chainUsed.map((w) => escapeHtml(w)).join(" → ")}</p>
      <button class="btn primary big" data-act="next">다음 놀이!</button>
    </section>
  `);

  bind('[data-act="next"]', navOnce(() => { advanceTurn(); nextStep(); }));
  Speech.say([`우와, 낱말을 ${count}개나 이어갔어! 잘했어!`]);
}

// ---- 이야기 ----

function startStory() {
  state.story = freshStory();
  state.storySeg = 0;
  screenStory();
}

function screenStory() {
  const story = state.story;
  const segment = story.segments[state.storySeg];
  const last = state.storySeg === story.segments.length - 1;

  show(`
    <section class="quiz">
      ${topBar()}
      <div class="card story-card">
        <div class="story-emoji">${story.emoji}</div>
        <h2 class="story-title">${escapeHtml(story.title)}</h2>
        <p class="story-text">${escapeHtml(segment)}</p>
        <p class="story-progress">${story.segments.map((_, i) => (i <= state.storySeg ? "●" : "○")).join(" ")}</p>
        <button class="btn primary" data-act="next">${last ? "다 들었어!" : "그래서 어떻게 됐어?"}</button>
      </div>
    </section>
  `);

  bindTopBar(() => Speech.say(segment));
  bind('[data-act="next"]', navOnce(() => {
    if (last) goto(askStoryQuestion);
    else { state.storySeg++; goto(screenStory); }
  }));

  Speech.say(state.storySeg === 0 ? [`${story.title}.`, segment] : segment, "warm");
}

function askStoryQuestion() {
  const story = state.story;
  askQuestion({
    kind: "story",
    prompt: story.question.prompt,
    visual: `<span>${story.emoji}</span>`,
    visualClass: "visual-emoji",
    choices: story.question.choices,
    answer: story.question.answer,
    choiceStyle: "text",
    key: `story-${story.title}`
  }, { onDone: () => goto(screenStoryTalk) });
}

function screenStoryTalk() {
  const story = state.story;
  show(`
    <section class="card center">
      <div class="hero">💬</div>
      <h2 class="title">우리 이야기해 볼까?</h2>
      <p class="talk-text">${escapeHtml(story.talk)}</p>
      <button class="btn primary big" data-act="next">이야기했어!</button>
    </section>
  `);

  bind('[data-act="next"]', navOnce(() => { advanceTurn(); nextStep(); }));
  Speech.say(story.talk, "warm");
}

// ---- 따라 말하기 ----

function screenPhrase() {
  const phrase = pickPhrase();
  const speakIt = () => Speech.say([
    { text: "따라 해 볼까?", lang: "ko" },
    { text: phrase.en, lang: "en" },
    { text: phrase.ko, lang: "ko" },
    { text: phrase.en, lang: "en" }
  ]);

  show(`
    <section class="quiz">
      ${topBar()}
      <div class="card center phrase-card">
        <div class="hero">🗣️</div>
        <p class="phrase-en">${escapeHtml(phrase.en)}</p>
        <p class="phrase-ko">${escapeHtml(phrase.ko)}</p>
        <button class="btn primary big" data-act="done">따라 했어요!</button>
      </div>
    </section>
  `);

  bindTopBar(speakIt);
  bind('[data-act="done"]', (e) => {
    e.currentTarget.disabled = true;
    addStar();
    app.querySelector(".star-count").textContent = `⭐ ${totalStars()}`;
    Speech.say([{ text: pick(["잘했어! 멋지다!", "우와, 발음 좋은데?", "그렇지! 아주 좋아!"]), lang: "ko" }], "happy");
    advanceTurn();
    pendingTimer = setTimeout(nextStep, 900);
  });

  speakIt();
}

// ---- 놀이 고르기 / 마무리 ----

function screenHub() {
  const items = [
    { kind: "quiz", emoji: "🔢", label: "퀴즈 풀기" },
    { kind: "wordchain", emoji: "🔗", label: "끝말잇기" },
    { kind: "story", emoji: "📖", label: "이야기 듣기" },
    { kind: "english", emoji: "🔤", label: "영어 놀이" },
    { kind: "phrase", emoji: "🗣️", label: "따라 말하기" }
  ].map((item) => `
    <button class="hub-btn" data-kind="${item.kind}">
      <span class="hub-emoji">${item.emoji}</span>
      <span class="hub-label">${item.label}</span>
    </button>`).join("");

  show(`
    <section class="card center">
      <h2 class="ask">무슨 놀이 할까?</h2>
      <div class="hub-grid">${items}</div>
      <button class="btn mode" data-act="mode">
        ${state.listenMode ? "🚗 듣기 모드 (차 안에서)" : "👀 화면 모드 (그림 문제도)"}
        <span class="hint">${state.listenMode ? "소리만 듣고 풀 수 있는 문제만 나와요" : "색깔·그림처럼 화면을 봐야 하는 문제도 나와요"}</span>
      </button>
      ${Mic.supported() ? `
        <button class="btn mode" data-act="voiceanswer">
          ${state.voiceMode ? "🎙️ 말로 대답하기 (켜짐)" : "🎙️ 말로 대답하기 (꺼짐)"}
          <span class="hint">${state.voiceMode
            ? "문제를 읽어 준 뒤 아이 말을 듣습니다. 화면을 눌러 답해도 돼요."
            : "누르면 마이크로 대답할 수 있어요 (인터넷 필요)"}</span>
        </button>` : ""}
      <button class="btn ghost small" data-act="voice">🎤 목소리 고르기</button>
      <button class="btn ghost" data-act="back">계속 이어서 놀기</button>
      <button class="btn ghost small" data-act="finish">오늘은 여기까지</button>
    </section>
  `);

  bind('[data-act="voice"]', () => goto(screenVoice));

  // 켜는 순간(손가락으로 누른 그때) 마이크 사용 권한을 물어봐야 한다
  bind('[data-act="voiceanswer"]', async (e) => {
    if (state.voiceMode) {
      state.voiceMode = false;
      Store.set(VOICE_ANSWER_KEY, "0");
      goto(screenHub);
      return;
    }
    e.currentTarget.disabled = true;
    const allowed = await askMicPermission();
    state.voiceMode = allowed;
    Store.set(VOICE_ANSWER_KEY, allowed ? "1" : "0");
    goto(allowed ? screenHub : screenMicDenied);
  });

  bind('[data-act="mode"]', () => {
    state.listenMode = !state.listenMode;
    Store.set(MODE_KEY, state.listenMode ? "1" : "0");
    goto(screenHub);
  });

  bind("[data-kind]", (e) => {
    const kind = e.currentTarget.dataset.kind;
    goto(() => { state.lastKind = kind; startActivity(kind); });
  });
  bind('[data-act="back"]', navOnce(nextStep));
  bind('[data-act="finish"]', () => goto(screenTally));

  Speech.say("무슨 놀이 할까? 숫자 퀴즈, 이야기, 영어 놀이, 따라 말하기 중에 골라 봐.");
}

async function askMicPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

function screenMicDenied() {
  show(`
    <section class="card center">
      <div class="hero">🎙️</div>
      <h2 class="title">마이크를 못 쓰고 있어요</h2>
      <p class="sub">말로 대답하려면 마이크 사용을 허용해야 해요.<br>
        아이폰은 <strong>설정 → 사파리 → 마이크</strong>에서 허용으로 바꿔 주세요.</p>
      <button class="btn primary big" data-act="back">화면 눌러서 놀기</button>
    </section>
  `);

  bind('[data-act="back"]', () => goto(screenHub));
  Speech.say("마이크를 못 쓰고 있어. 화면을 눌러서 대답해도 괜찮아!", "gentle");
}

let voicePreview = false;

function screenVoice() {
  const voices = Speech.koreanVoices();

  const list = voices.length
    ? voices.map((v, i) => `
        <button class="voice-btn ${v.current ? "current" : ""}" data-voice="${escapeHtml(v.name)}">
          <span class="voice-name">${escapeHtml(v.name)}</span>
          <span class="voice-tag">${v.current ? "지금 이 목소리" : "눌러서 들어보기"}</span>
        </button>`).join("")
    : `<p class="sub">이 기기에서 한국어 목소리를 찾지 못했어요.</p>`;

  show(`
    <section class="card center">
      <div class="hero">🎤</div>
      <h2 class="title">목소리 고르기</h2>
      <p class="sub">눌러서 들어보고 마음에 드는 목소리를 고르세요.<br>
        <small>폰 설정에서 고품질 한국어 음성을 받으면 훨씬 자연스러워요.</small></p>
      <div class="voice-list">${list}</div>
      <button class="btn primary" data-act="back">다 골랐어요</button>
    </section>
  `);

  bind("[data-voice]", (e) => {
    Speech.setVoice(e.currentTarget.dataset.voice);
    voicePreview = true;
    screenVoice();   // goto를 쓰면 방금 시작한 미리듣기가 끊긴다
  });
  bind('[data-act="back"]', () => goto(screenHub));

  Speech.say(
    voicePreview
      ? ["안녕! 나는 이런 목소리야.", "오늘도 같이 재미있게 놀자!"]
      : "어떤 목소리가 좋아? 눌러서 들어봐.",
    "warm"
  );
  voicePreview = false;
}

function screenTally() {
  const body = isTeamMode()
    ? `<div class="stars">${"⭐".repeat(Math.min(state.teamStars, 10))}</div>
       <h2 class="title">별 ${state.teamStars}개 모았어!</h2>`
    : `<h2 class="title">오늘 이만큼 모았어!</h2>
       <ul class="result-list">${state.players.map((p, i) => `
         <li>
           <span class="who">${avatarOf(i)} ${escapeHtml(p.name)} <small>${p.age}살</small></span>
           <span class="tally">⭐ ${p.stars}</span>
         </li>`).join("")}</ul>`;

  show(`
    <section class="card center">
      <div class="hero">🏆</div>
      ${body}
      <p class="sub">다음에 또 놀자!</p>
      <button class="btn primary big" data-act="more">더 놀래!</button>
      <button class="btn ghost small" data-act="home">처음으로</button>
    </section>
  `);

  bind('[data-act="more"]', navOnce(nextStep));
  bind('[data-act="home"]', () => goto(screenWelcome));

  const summary = isTeamMode()
    ? `오늘 별 ${state.teamStars}개를 모았어!`
    : state.players.map((p) => `${p.name}, 별 ${p.stars}개.`).join(" ");
  Speech.say(["오늘 정말 잘했어!", summary, "다음에 또 놀자!"], "warm");
}

// ---- 시작 ----

function updateSoundIcon() {
  soundToggle.textContent = Speech.isMuted() ? "🔇" : "🔊";
}

soundToggle.addEventListener("click", () => {
  Speech.toggleMute();
  updateSoundIcon();
});

if (!Speech.supported) soundToggle.hidden = true;
updateSoundIcon();
goto(screenWelcome);
