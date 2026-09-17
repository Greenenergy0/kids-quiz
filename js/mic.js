// 말로 대답하기. 아이가 소리로 답하면 보기 중 하나로 알아듣는다.
// 인식은 브라우저(사파리·크롬)가 해 주고, 대부분 인터넷이 필요하다.
const Mic = (function () {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let recognition = null;
  let handlers = {};

  function supported() {
    return !!Recognition;
  }

  function stop() {
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch { /* 이미 멈춘 경우 */ }
      recognition = null;
    }
    handlers = {};
  }

  function start(options) {
    stop();
    if (!Recognition) {
      options.onError && options.onError("unsupported");
      return;
    }
    handlers = options || {};
    recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 4;

    recognition.onresult = (event) => {
      const heard = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j++) heard.push(result[j].transcript);
      }
      handlers.onHeard && handlers.onHeard(heard);
    };
    recognition.onerror = (event) => {
      handlers.onError && handlers.onError(event.error || "error");
    };
    recognition.onend = () => {
      handlers.onEnd && handlers.onEnd();
    };

    try {
      recognition.start();
    } catch {
      options.onError && options.onError("start-failed");
    }
  }

  // ---- 들은 말을 보기와 맞춰 보기 ----

  const SINO = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const NATIVE = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];

  // 11~20은 "열하나"처럼 붙여 읽는다
  function nativeKorean(n) {
    if (n <= 10) return NATIVE[n];
    if (n < 20) return "열" + NATIVE[n - 10];
    if (n === 20) return "스물";
    return "";
  }

  // "1번", "첫 번째"처럼 번호로 답하는 경우
  const ORDINALS = [
    ["1", "일", "하나", "한", "첫", "첫째", "첫번째"],
    ["2", "이", "둘", "두", "둘째", "두번째"],
    ["3", "삼", "셋", "세", "셋째", "세번째"],
    ["4", "사", "넷", "네", "넷째", "네번째"]
  ];

  function sinoKorean(n) {
    if (n < 10) return SINO[n];
    if (n < 100) {
      const tens = Math.floor(n / 10);
      const ones = n % 10;
      return (tens > 1 ? SINO[tens] : "") + "십" + (ones ? SINO[ones] : "");
    }
    if (n === 100) return "백";
    return String(n);
  }

  function normalize(text) {
    return String(text).toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
  }

  // 보기 하나를 가리킬 수 있는 말들
  function aliasesFor(question, index) {
    const choice = question.choices[index];
    const out = [];

    if (question.choiceStyle === "color") out.push(choice.name);
    else if (question.choiceStyle === "shape") {
      const shape = SHAPES.find((s) => s.glyph === choice);
      if (shape) out.push(shape.name);
    } else if (question.choiceStyle === "emoji" || question.choiceStyle === "group") {
      if (index === question.answer && question.answerLabel) out.push(question.answerLabel);
    } else {
      out.push(String(choice));
    }

    // 숫자 보기는 읽는 법이 여러 가지다 ("12" → 십이 / 열둘)
    out.slice().forEach((text) => {
      const digits = String(text).match(/^\d+$/);
      if (!digits) return;
      const n = Number(text);
      if (n <= 100) out.push(sinoKorean(n));
      const native = nativeKorean(n);
      if (native) out.push(native);
    });

    // "다섯 개" 같은 보기는 단위를 뗀 말도 인정한다
    out.slice().forEach((text) => {
      const stripped = String(text).replace(/\s*(개|마리|대)$/, "");
      if (stripped && stripped !== text) out.push(stripped);
    });

    return out.map(normalize).filter(Boolean);
  }

  function match(question, transcripts) {
    const heard = (transcripts || []).map(normalize).filter(Boolean);
    if (!heard.length) return -1;

    const aliasList = question.choices.map((_, i) => aliasesFor(question, i));

    // 1) 들은 말이 보기와 같거나 서로 포함하는 경우
    for (const said of heard) {
      for (let i = 0; i < aliasList.length; i++) {
        for (const alias of aliasList[i]) {
          if (said === alias) return i;
          if (said.length >= 2 && said.includes(alias) && alias.length >= 2) return i;
          if (alias.length >= 2 && alias.includes(said) && said.length >= 2) return i;
        }
      }
    }

    // 2) "2번", "두 번째"처럼 번호로 답한 경우
    for (const said of heard) {
      for (let i = 0; i < question.choices.length && i < ORDINALS.length; i++) {
        for (const word of ORDINALS[i]) {
          if (said === word || said === word + "번" || said === word + "번째") return i;
        }
      }
    }

    return -1;
  }

  return { supported, start, stop, match };
})();
