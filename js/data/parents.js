// 아빠·엄마 캐릭터: 부모도 이번 주 퀘스트 3개를 받아 함께 성장한다(아이는 말보다 보는 대로 배운다).
// 부모 퀘스트는 '우리 파티' 화면에서 누구나 체크할 수 있고, 아이가 보내는 칭찬 카드로도 경험치를 얻는다.

export const PARENT_QUESTS = [
  { id: 'pq-phone', text: '폰 내려놓고 아이와 30분 놀기' },
  { id: 'pq-breath', text: '화가 날 때 숨 세 번 쉬고 낮은 목소리로 말하기' },
  { id: 'pq-praise', text: '구체적인 칭찬 카드 2장 쓰기' },
  { id: 'pq-listen', text: '아이 이야기를 끝까지 듣고 질문 하나 하기' },
  { id: 'pq-goodday', text: "잠들기 전 '오늘 좋았던 일' 함께 이야기하기" },
  { id: 'pq-sorry', text: '내 실수를 아이에게 먼저 사과하기' },
  { id: 'pq-greet', text: '아이 앞에서 이웃에게 먼저 인사하기' },
  { id: 'pq-hug', text: '하루 한 번 꼭 안아 주기' },
  { id: 'pq-kidgame', text: '아이가 고른 놀이 함께하기' },
  { id: 'pq-opinion', text: '"넌 어떻게 생각해?" 묻고 아이 의견 따라 보기' },
  { id: 'pq-thanks', text: '아이 앞에서 배우자에게 고맙다고 말하기' },
  { id: 'pq-read', text: '아이와 책 한 권 함께 읽기' },
  { id: 'pq-walk', text: '아이와 바깥 산책 20분' },
  { id: 'pq-promise', text: '아이와 한 약속 꼭 지키기' },
];

export const PARENT_QUESTS_PER_WEEK = 3;

export const PARENT_TITLES = {
  1: '새내기 동료', 2: '든든한 동료', 3: '모험 길잡이', 4: '다정한 길잡이', 5: '마을의 길잡이',
  7: '지혜로운 현자', 10: '빛의 수호자', 15: '전설의 동료',
};

export const PARENT_AVATARS = {
  dad: ['👨', '🧔', '👨‍🍳', '🧙‍♂️', '🦸‍♂️', '🤴'],
  mom: ['👩', '👩‍🦰', '👩‍🍳', '🧙‍♀️', '🦸‍♀️', '👸'],
};

export const PARENT_IDS = ['dad', 'mom'];

// 아이가 부모에게 칭찬 카드를 보낼 때 고를 수 있는 문장
export const KID_PRAISE_PRESETS = [
  '맛있는 밥 해 줘서 고마워요',
  '같이 놀아 줘서 고마워요',
  '화내지 않고 말해 줘서 고마워요',
  '꼭 안아 줘서 좋았어요',
  '도와줘서 고마워요',
  '내 이야기 들어 줘서 고마워요',
];
