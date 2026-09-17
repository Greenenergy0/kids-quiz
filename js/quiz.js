// 손으로 적어둔 상식 문제 은행. 여기에 계속 추가하면 됩니다.
// answer : choices 배열의 인덱스(0부터 시작)
// age    : 권장 나이(3~7). 아이 나이 ±1살 범위에서 골라 씁니다.
const QUESTION_BANK = [
  // 3세
  {
    age: 3,
    question: "사과는 무슨 색일까요?",
    choices: ["노란색", "빨간색", "파란색", "검은색"],
    answer: 1
  },
  {
    age: 3,
    question: "강아지는 어떻게 울까요?",
    choices: ["야옹", "멍멍", "음메", "꽥꽥"],
    answer: 1
  },
  {
    age: 3,
    question: "바나나는 무슨 색일까요?",
    choices: ["노란색", "초록색", "보라색", "하얀색"],
    answer: 0
  },
  {
    age: 3,
    question: "하늘은 무슨 색일까요?",
    choices: ["파란색", "빨간색", "검은색", "분홍색"],
    answer: 0
  },
  {
    age: 3,
    question: "고양이는 어떻게 울까요?",
    choices: ["멍멍", "야옹", "꿀꿀", "짹짹"],
    answer: 1
  },

  // 4세
  {
    age: 4,
    question: "사과 2개에 1개를 더하면 모두 몇 개일까요?",
    choices: ["2개", "3개", "4개", "5개"],
    answer: 1
  },
  {
    age: 4,
    question: "다음 중 동그란 모양은 무엇일까요?",
    choices: ["세모", "네모", "동그라미", "별"],
    answer: 2
  },
  {
    age: 4,
    question: "한 손에 손가락은 몇 개일까요?",
    choices: ["3개", "4개", "5개", "6개"],
    answer: 2
  },
  {
    age: 4,
    question: "밤하늘에서 반짝반짝 빛나는 것은 무엇일까요?",
    choices: ["해", "별", "구름", "비"],
    answer: 1
  },
  {
    age: 4,
    question: "물고기는 어디에서 살까요?",
    choices: ["하늘", "물속", "땅속", "나무 위"],
    answer: 1
  },
  {
    age: 4,
    question: "소리를 듣는 몸의 기관은 어디일까요?",
    choices: ["눈", "귀", "코", "입"],
    answer: 1
  },

  // 5세
  {
    age: 5,
    question: "물이 꽁꽁 얼면 무엇이 될까요?",
    choices: ["수증기", "얼음", "구름", "안개"],
    answer: 1
  },
  {
    age: 5,
    question: "봄 다음에 오는 계절은 무엇일까요?",
    choices: ["여름", "가을", "겨울", "봄"],
    answer: 0
  },
  {
    age: 5,
    question: "일주일은 며칠일까요?",
    choices: ["5일", "6일", "7일", "8일"],
    answer: 2
  },
  {
    age: 5,
    question: "나비는 어떤 모습을 거쳐서 어른이 될까요?",
    choices: ["올챙이", "애벌레", "병아리", "새끼 고양이"],
    answer: 1
  },
  {
    age: 5,
    question: "다음 중 채소가 아닌 것은 무엇일까요?",
    choices: ["당근", "오이", "사과", "배추"],
    answer: 2
  },
  {
    age: 5,
    question: "우리나라의 수도는 어디일까요?",
    choices: ["부산", "대전", "서울", "광주"],
    answer: 2
  },
  {
    age: 5,
    question: "식물이 자라는 데 꼭 필요하지 않은 것은 무엇일까요?",
    choices: ["햇빛", "물", "공기", "텔레비전"],
    answer: 3
  },

  // 6세
  {
    age: 6,
    question: "무지개는 보통 몇 가지 색으로 이루어져 있을까요?",
    choices: ["3가지", "5가지", "7가지", "10가지"],
    answer: 2
  },
  {
    age: 6,
    question: "개미의 다리는 모두 몇 개일까요?",
    choices: ["4개", "6개", "8개", "10개"],
    answer: 1
  },
  {
    age: 6,
    question: "하루는 몇 시간일까요?",
    choices: ["12시간", "24시간", "36시간", "48시간"],
    answer: 1
  },
  {
    age: 6,
    question: "1년은 몇 개월일까요?",
    choices: ["10개월", "12개월", "14개월", "24개월"],
    answer: 1
  },
  {
    age: 6,
    question: "5 + 7 은 얼마일까요?",
    choices: ["10", "11", "12", "13"],
    answer: 2
  },
  {
    age: 6,
    question: "다음 중 가장 큰 동물은 무엇일까요?",
    choices: ["코끼리", "기린", "흰긴수염고래", "하마"],
    answer: 2
  },

  // 7세
  {
    age: 7,
    question: "태양계에서 가장 큰 행성은 무엇일까요?",
    choices: ["지구", "목성", "화성", "금성"],
    answer: 1
  },
  {
    age: 7,
    question: "태극기에서 볼 수 없는 색깔은 무엇일까요?",
    choices: ["빨강", "파랑", "초록", "검정"],
    answer: 2
  },
  {
    age: 7,
    question: "한글을 만든 임금님은 누구일까요?",
    choices: ["세종대왕", "이순신", "광개토대왕", "장영실"],
    answer: 0
  },
  {
    age: 7,
    question: "다음 중 새가 아닌 동물은 무엇일까요?",
    choices: ["참새", "박쥐", "비둘기", "까치"],
    answer: 1
  },
  {
    age: 7,
    question: "다음 중 포유류는 무엇일까요?",
    choices: ["개구리", "돌고래", "악어", "참새"],
    answer: 1
  },
  {
    age: 7,
    question: "물이 100도가 되면 어떻게 될까요?",
    choices: ["얼어요", "끓어요", "단단해져요", "사라져요"],
    answer: 1
  }
];
