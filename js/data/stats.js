// 스탯 6가지. 배열 순서가 화면에 보이는 순서다.
//   epithet  '이번 주 별명'에 쓰는 꾸밈말 ("마음이 따뜻한 알 지킴이")
//   character true 면 성품 스탯 → 칭찬할 때 "너는 ○○ 사람이야"(사람 칭찬), 아니면 노력 칭찬을 쓴다.

export const STATS = [
  { id: 'body', name: '체력', icon: '💪', color: '#e8590c', epithet: '튼튼한', desc: '몸을 움직이고 건강하게 지내는 힘' },
  { id: 'wisdom', name: '지혜', icon: '📚', color: '#1971c2', epithet: '지혜로운', desc: '배우고 궁금해하는 힘' },
  { id: 'create', name: '창의', icon: '🧱', color: '#9c36b5', epithet: '손재주 좋은', desc: '상상하고 만들어 내는 힘' },
  { id: 'self', name: '자립', icon: '🧭', color: '#2f9e44', epithet: '믿음직한', desc: '스스로 챙기고 끝까지 해내는 힘', character: true },
  { id: 'manners', name: '예의', icon: '🙇', color: '#f08c00', epithet: '예의 바른', desc: '먼저 인사하고 고운 말을 쓰는 힘', character: true },
  { id: 'heart', name: '마음', icon: '❤️', color: '#e03131', epithet: '마음이 따뜻한', desc: '정직하고 다른 사람을 아끼는 힘', character: true },
];

export const STAT_IDS = STATS.map((s) => s.id);
export const getStat = (id) => STATS.find((s) => s.id === id);

// 이번 주 별명이 같은 점수일 때 먼저 고르는 순서 — 부모가 가장 중요하게 여기는 마음·예의를 앞에 둔다
export const EPITHET_ORDER = ['heart', 'manners', 'self', 'body', 'wisdom', 'create'];

// 처음 시작할 때 모든 스탯의 값. 아이의 강점 두 가지에는 STRENGTH_BONUS 를 더한다.
// (또래와 비교한 점수가 아니다 — 낮은 숫자로 시작하면 아이가 "나는 ○○ 못하는 애"로 받아들일 수 있어서 모두 같게 시작)
export const START_STAT = 10;
export const STRENGTH_BONUS = 3;
