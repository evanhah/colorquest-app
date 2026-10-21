// 퀘스트 목록과 보상.
//
// 각 퀘스트는 가치(values.js) 하나에 속하고, 스탯은 그 가치의 스탯을 따른다.
//   kind  'daily'      오늘의 퀘스트 (매일 몇 개씩 돌아가며 뽑힘)
//         'challenge'  오늘의 도전 (선택지 3개 중 아이가 하나를 고름 — 스스로 고르는 것 자체가 의욕을 키운다)
//         'weekly'     주간 미션 (완료하면 열쇠 1개, 4개 모이면 비밀의 방)
//   coop  true 면 아빠·엄마 중 한 명과 함께하는 주간 미션
// 부모가 더한 퀘스트는 state.customQuests 에 같은 모양으로 저장된다.

export const REWARD = {
  routine: { xp: 10, n: 1 },     // 매일 하는 일 (윙크·받아쓰기·학원)
  daily: { xp: 10, n: 1 },
  challenge: { xp: 15, n: 2 },
  weekly: { xp: 30, n: 2 },
  coop: { xp: 30, n: 2, partnerXp: 30 },
  story: { xp: 30, n: 2, partnerXp: 20 },
  praise: { xp: 20, n: 2 },      // 부모가 쓴 칭찬 카드
  hidden: { xp: 30, n: 3 },      // + 황금 알
  parentQuest: { xp: 20 },
  kidPraise: { xp: 20 },         // 아이가 부모에게 쓴 칭찬 카드 → 부모 경험치(아이는 보상 없음)
};

export const KIND_LABEL = { daily: '매일 퀘스트', challenge: '오늘의 도전', weekly: '주간 미션', coop: '함께하는 주간 미션' };

const make = (kind, extra = {}) => (id, value, text) => ({ id, kind, value, text, ...extra });
const daily = make('daily');
const challenge = make('challenge');
const weekly = make('weekly');
const coop = make('weekly', { coop: true });

export const QUESTS = [
  // ── 예의 ──
  daily('d-greet1', 'greet', '일어나면 가족에게 먼저 "좋은 아침!" 인사하기'),
  daily('d-greet2', 'greet', '집에 오면 "다녀왔습니다!" 크게 말하기'),
  daily('d-greet3', 'greet', '선생님께 먼저 인사하기'),
  daily('d-greet4', 'greet', '어른께 존댓말로 대답하기'),
  daily('d-greet5', 'greet', '잠들기 전 "안녕히 주무세요" 인사하기'),
  daily('d-thanks1', 'thanks', '오늘 "고맙습니다" 세 번 말하기'),
  daily('d-thanks2', 'thanks', '밥 먹고 "잘 먹었습니다" 말하기'),
  daily('d-thanks3', 'thanks', '도와준 사람에게 왜 고마운지 이유까지 말하기'),
  daily('d-table1', 'table', '어른이 수저를 드신 다음에 먹기'),
  daily('d-table2', 'table', '밥 먹는 동안 자리에 앉아 있기'),
  daily('d-table3', 'table', '다 먹은 그릇 싱크대에 갖다 놓기'),

  // ── 마음 ──
  daily('d-honest1', 'honest', '오늘 좋았던 일 하나, 아쉬웠던 일 하나 솔직하게 말하기'),
  daily('d-honest2', 'honest', '모르는 건 "몰라요, 알려 주세요"라고 말하기'),
  daily('d-honest3', 'honest', '게임에서 지거나 틀려도 솔직하게 인정하기'),
  daily('d-care1', 'care', '가족에게 "도와줄 거 있어요?" 물어보기'),
  daily('d-care2', 'care', '친구 이야기를 끝까지 들어 주기'),
  daily('d-care3', 'care', '혼자 있는 친구에게 먼저 말 걸기'),
  daily('d-care4', 'care', '뒤에 오는 사람을 위해 문 잡아 주기'),
  daily('d-care5', 'care', '오늘 누군가를 웃게 만들기'),
  daily('d-promise1', 'promise', '정한 시간에 게임·영상 스스로 끄기'),
  daily('d-promise2', 'promise', '엄마·아빠와 한 약속 하나 지키기'),
  daily('d-promise3', 'promise', '숙제를 정한 시간에 시작하기'),
  daily('d-feel1', 'feelings', '오늘 내 기분을 색깔로 말해 보기'),
  daily('d-feel2', 'feelings', '오늘 고마웠던 일 하나 말하기'),
  daily('d-feel3', 'feelings', '화가 날 때 숨 세 번 쉬고 말로 하기'),
  daily('d-feel4', 'feelings', '가족 한 명 꼭 안아 주기'),

  // ── 자립 ──
  daily('d-tidy1', 'tidy', '놀고 난 장난감 제자리에 두기'),
  daily('d-tidy2', 'tidy', '벗은 옷 빨래 바구니에 넣기'),
  daily('d-tidy3', 'tidy', '자기 전에 책상 위 정리하기'),
  daily('d-tidy4', 'tidy', '내 가방 속 정리하기'),
  daily('d-ready1', 'ready', '내일 준비물·가방 스스로 챙기기'),
  daily('d-ready2', 'ready', '알람 듣고 스스로 일어나기'),
  daily('d-ready3', 'ready', '물통·수저통 스스로 챙기기'),
  daily('d-ready4', 'ready', '아침에 옷 스스로 골라 입기'),
  daily('d-help1', 'help', '식사 때 수저 놓기'),
  daily('d-help2', 'help', '빨래 개기 돕기'),
  daily('d-help3', 'help', '분리수거 돕기'),
  daily('d-help4', 'help', '화분에 물 주기'),

  // ── 체력 ──
  daily('d-ex1', 'exercise', '줄넘기 50번'),
  daily('d-ex2', 'exercise', '밖에서 30분 뛰어놀기'),
  daily('d-ex3', 'exercise', '스트레칭 5분'),
  daily('d-ex4', 'exercise', '농구공 드리블 50번'),
  daily('d-health1', 'health', '9시 반 전에 잠자리에 들기'),
  daily('d-health2', 'health', '물 다섯 컵 마시기'),
  daily('d-health3', 'health', '반찬 속 채소까지 다 먹기'),
  daily('d-health4', 'health', '양치 3분 꼼꼼히 하기'),

  // ── 지혜 ──
  daily('d-read1', 'reading', '책 10쪽 읽기'),
  daily('d-read2', 'reading', '읽은 책 이야기를 가족에게 들려주기'),
  daily('d-read3', 'reading', '모르는 낱말 하나 찾아보기'),
  daily('d-cur1', 'curious', '궁금한 것 하나 질문하고 함께 찾아보기'),
  daily('d-cur2', 'curious', '오늘 새로 알게 된 사실 하나 말하기'),
  daily('d-cur3', 'curious', '하늘·구름·나무를 관찰하고 이야기하기'),

  // ── 창의 ──
  daily('d-make1', 'make', '그림 하나 그리기'),
  daily('d-make2', 'make', '레고로 10분 자유롭게 만들기'),
  daily('d-make3', 'make', '이야기 하나 지어서 들려주기'),
  daily('d-make4', 'make', '종이접기 하나 하기'),

  // ── 오늘의 도전 ──
  challenge('c-call', 'greet', '할머니·할아버지께 안부 전화하기'),
  challenge('c-meal', 'table', '식사 때 가족 모두에게 "맛있게 드세요" 말하기'),
  challenge('c-thanks', 'thanks', '고마운 사람에게 감사 쪽지 쓰기'),
  challenge('c-letter', 'feelings', '가족에게 깜짝 편지 쓰기'),
  challenge('c-massage', 'care', '엄마·아빠 어깨 주물러 드리기'),
  challenge('c-friend', 'care', '친구에게 칭찬 한마디 해 주기'),
  challenge('c-reflect', 'honest', '오늘 내가 잘한 점 하나, 더 잘하고 싶은 점 하나 말하기'),
  challenge('c-plan', 'promise', '내일 할 일 계획을 세우고 엄마·아빠와 약속하기'),
  challenge('c-room', 'tidy', '내 방 바닥 깨끗하게 만들기'),
  challenge('c-snack', 'ready', '어른과 함께 간단한 간식 직접 만들기'),
  challenge('c-cook', 'help', '저녁 준비 하나 돕기 (씻기·나르기)'),
  challenge('c-rope', 'exercise', '줄넘기 100번 도전'),
  challenge('c-colors', 'exercise', '동네 산책하며 무지개 색 7가지 찾기'),
  challenge('c-newfood', 'health', '처음 먹어 보는 음식 한 입 도전'),
  challenge('c-dict', 'reading', '받아쓰기 틀린 낱말 세 번씩 다시 써 보기'),
  challenge('c-book', 'reading', '좋아하는 책을 가족에게 소개하기'),
  challenge('c-quiz', 'curious', '가족에게 퀴즈 3개 내기'),
  challenge('c-legohouse', 'make', "레고로 '우리 가족의 집' 만들기"),
  challenge('c-drawfam', 'make', '가족 얼굴 그림 그리기'),

  // ── 주간 미션 ──
  weekly('w-grand', 'greet', '할머니·할아버지께 이번 주 이야기 들려 드리기'),
  weekly('w-thankfriend', 'thanks', '친구나 선생님께 고마운 점 말하기'),
  weekly('w-table', 'table', '외식할 때 식당 예절 지키기 (앉아서·조용히)'),
  weekly('w-honest', 'honest', '가족 회의에서 내 생각 솔직하게 말하기'),
  weekly('w-care', 'care', '친구나 이웃을 도와준 이야기 들려주기'),
  weekly('w-promise', 'promise', '이번 주 게임 시간 약속 모두 지키기'),
  weekly('w-gift', 'feelings', '가족을 위한 깜짝 선물(그림·편지·만들기) 준비하기'),
  weekly('w-drawer', 'tidy', '책장이나 서랍 한 칸 정리하기'),
  weekly('w-chore', 'help', '집안일 하나 맡아서 일주일 동안 하기'),
  weekly('w-newplay', 'exercise', '새로운 운동이나 놀이 하나 배우기'),
  weekly('w-sleep', 'health', '일주일 중 5일 제시간에 자기'),
  weekly('w-bookend', 'reading', '책 한 권 끝까지 읽기'),
  weekly('w-research', 'curious', '궁금한 것 하나 조사해서 가족에게 발표하기'),
  weekly('w-map', 'make', '우리 동네 탐험 지도 그리기'),

  // ── 함께하는 주간 미션 (아빠·엄마 중 한 명 선택) ──
  coop('p-greet', 'greet', '함께 경비원·이웃께 감사 인사 전하기'),
  coop('p-board', 'feelings', '함께 보드게임 — 져도 이긴 사람 축하해 주기'),
  coop('p-plogging', 'care', '함께 동네 쓰레기 주우며 산책하기'),
  coop('p-tidy', 'tidy', '함께 집 한 곳 대청소하기'),
  coop('p-market', 'ready', '함께 장보기 목록 쓰고 물건 찾아 담기'),
  coop('p-cook', 'help', '함께 요리 하나 만들기'),
  coop('p-ball', 'exercise', '함께 자전거·공놀이 30분'),
  coop('p-library', 'reading', '함께 도서관 가서 책 고르기'),
  coop('p-science', 'curious', '함께 간단한 과학 실험 하기'),
  coop('p-lego', 'make', '함께 레고로 큰 작품 만들기'),
];

// 매일 하는 일(고정 일과). days: 요일 번호(0 일요일 ~ 6 토요일).
// weekly: 가끔 하는 일(학원)의 주간 미션 문장 — 자주 하는 일은 "이번 주 N일 하기" 꾸준함 미션이 자동으로 만들어진다.
export const DEFAULT_ROUTINES = [
  { id: 'r-wink', text: '윙크 학습하기', icon: '📱', stat: 'wisdom', days: [0, 1, 2, 3, 4, 5, 6], on: true },
  { id: 'r-dict', text: '받아쓰기 연습하기', icon: '✏️', stat: 'wisdom', days: [0, 1, 2, 3, 4, 5, 6], on: true },
  { id: 'r-basket', text: '농구 학원 다녀오기', icon: '🏀', stat: 'body', days: [4], on: true, weekly: '농구 학원에서 배운 기술 하나 가족에게 보여 주기' },
  { id: 'r-lego', text: 'LEGO 학원 다녀오기', icon: '🧱', stat: 'create', days: [6], on: true, weekly: 'LEGO 학원에서 만든 작품을 가족에게 설명해 주기' },
];
