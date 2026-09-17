// 음성 안내(TTS).
// 기기에 깔린 목소리 중 가장 자연스러운 것을 골라 쓰고, 긴 문장은 끊어 읽어 사람처럼 들리게 한다.
// say("안녕") 또는 say([{ text: "dog", lang: "en" }, "강아지예요"], "happy") 형태로 호출한다.
const Speech = (function () {
  const synth = window.speechSynthesis || null;
  const MUTE_KEY = "kidsquiz.muted";
  const VOICE_KEY = "kidsquiz.voice";

  let muted = Store.get(MUTE_KEY) === "1";
  let allVoices = [];
  const chosen = { ko: null, en: null };

  // 목소리 이름으로 품질을 짐작한다. (기기가 품질을 알려 주지 않는다)
  const HIGH = /(premium|enhanced|natural|neural|wavenet|studio|고품질)/i;
  const NAMED = /(yuna|유나|siri|nari|sora|jimin|서현|지민)/i;
  const LOW = /(compact|espeak|eloquence|novelty|robot)/i;

  function scoreVoice(voice) {
    const name = voice.name || "";
    let score = 0;
    if (HIGH.test(name)) score += 12;
    if (NAMED.test(name)) score += 6;
    if (/google/i.test(name)) score += 5;
    if (LOW.test(name)) score -= 12;
    if (voice.localService) score += 2;   // 차 안에서 인터넷 없이도 나오는 목소리
    if (voice.default) score += 1;
    return score;
  }

  function byLang(prefix) {
    return allVoices.filter((v) => (v.lang || "").toLowerCase().startsWith(prefix));
  }

  function best(list) {
    return list.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;
  }

  function pickVoices() {
    if (!synth) return;
    allVoices = synth.getVoices() || [];
    const saved = Store.get(VOICE_KEY);
    const korean = byLang("ko");
    chosen.ko = korean.find((v) => v.name === saved) || best(korean) || null;
    chosen.en = best(byLang("en")) || null;
  }

  if (synth) {
    pickVoices();
    synth.addEventListener("voiceschanged", pickVoices);
  }

  // 말투. 기계음처럼 들리지 않게 높낮이는 과하지 않게 둔다.
  const TONES = {
    normal: { rate: 0.97, pitch: 1.03 },
    warm: { rate: 0.9, pitch: 1.0 },     // 이야기하듯 천천히
    happy: { rate: 1.0, pitch: 1.16 },   // 칭찬할 때
    gentle: { rate: 0.93, pitch: 1.06 }  // 다독일 때
  };

  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu;

  function clean(text) {
    return String(text).replace(EMOJI, " ").replace(/\s+/g, " ").trim();
  }

  // 마침표·물음표에서 끊어 읽으면 한 호흡에 쏟아내지 않아 훨씬 자연스럽다.
  function toChunks(text) {
    const out = [];
    let buffer = "";
    for (const ch of text) {
      buffer += ch;
      if (".!?…".includes(ch) || (buffer.length > 32 && ch === ",")) {
        out.push(buffer);
        buffer = "";
      }
    }
    if (buffer.trim()) out.push(buffer);
    return out.map((s) => s.trim()).filter(Boolean);
  }

  function utter(text, lang, tone) {
    const isEn = lang === "en";
    const preset = TONES[tone] || TONES.normal;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = isEn ? "en-US" : "ko-KR";
    u.rate = isEn ? preset.rate * 0.88 : preset.rate;   // 영어는 조금 더 또박또박
    u.pitch = preset.pitch;
    u.volume = 1;
    const voice = isEn ? chosen.en : chosen.ko;
    if (voice) u.voice = voice;
    return u;
  }

  // 말이 다 끝난 뒤에 할 일(onDone). 말로 대답하기는 이때부터 듣기 시작한다.
  let pendingDone = null;

  function say(parts, tone, onDone) {
    const finish = () => {
      if (pendingDone === finish) {
        pendingDone = null;
        onDone();
      }
    };

    if (!synth || muted) {
      if (onDone) setTimeout(onDone, 0);
      return;
    }

    const list = (Array.isArray(parts) ? parts : [parts])
      .map((p) => (typeof p === "string" ? { text: p, lang: "ko" } : p))
      .filter((p) => p && p.text);

    pendingDone = null;   // 이전 발화에 걸어 둔 콜백은 여기서 무효가 된다
    synth.cancel();

    const queue = [];
    list.forEach((part) => {
      const text = clean(part.text);
      if (!text) return;
      const partTone = part.tone || tone;
      const pieces = part.lang === "en" ? [text] : toChunks(text);
      pieces.forEach((piece) => queue.push(utter(piece, part.lang, partTone)));
    });

    if (!queue.length) {
      if (onDone) setTimeout(onDone, 0);
      return;
    }

    if (onDone) {
      pendingDone = finish;
      const last = queue[queue.length - 1];
      last.onend = finish;
      last.onerror = finish;
    }

    queue.forEach((u) => synth.speak(u));
  }

  function stop() {
    pendingDone = null;
    if (synth) synth.cancel();
  }

  function toggleMute() {
    muted = !muted;
    Store.set(MUTE_KEY, muted ? "1" : "0");
    if (muted) stop();
    return muted;
  }

  // 목소리 고르기 화면에서 쓴다.
  function koreanVoices() {
    pickVoices();
    return byLang("ko")
      .slice()
      .sort((a, b) => scoreVoice(b) - scoreVoice(a))
      .map((v) => ({ name: v.name, local: v.localService, current: chosen.ko && v.name === chosen.ko.name }));
  }

  function setVoice(name) {
    Store.set(VOICE_KEY, name);
    pickVoices();
  }

  return {
    say,
    stop,
    toggleMute,
    isMuted: () => muted,
    supported: !!synth,
    koreanVoices,
    setVoice,
    currentVoice: () => (chosen.ko ? chosen.ko.name : null)
  };
})();
