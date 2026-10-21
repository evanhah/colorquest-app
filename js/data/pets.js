// 알과 펫. 퀘스트로 얻은 경험치만큼 품고 있는 알이 따뜻해지고, 다 데워지면 부화를 기다리는 알이 된다.
// 히든 퀘스트는 황금 알, 주간 열쇠 4개(비밀의 방)는 무지개 알을 준다. 펫은 모으는 재미일 뿐 능력은 없다.
// home: 사는 곳 = 빛깔 단계 id(titles.js RANKS 의 place). likes: 좋아하는 것. 도감에서 펫을 누르면 정보창에 나온다.

export const RARITY = {
  common: { name: '보통', stars: '★' },
  rare: { name: '희귀', stars: '★★' },
  legend: { name: '전설', stars: '★★★' },
};

export const EGGS = {
  normal: { name: '보통 알', odds: { common: 65, rare: 30, legend: 5 } },
  gold: { name: '황금 알', odds: { common: 0, rare: 75, legend: 25 } },
  rainbow: { name: '무지개 알', odds: { common: 0, rare: 50, legend: 50 } },
};

/** n번째 보통 알을 데우는 데 필요한 경험치 — 처음엔 빨리, 점점 천천히(최대 600) */
export const eggNeed = (laid) => Math.min(200 + laid * 50, 600);

const pet = (rarity) => (id, emoji, name, desc, home, likes) => ({ id, emoji, name, desc, home, likes, rarity });
const common = pet('common');
const rare = pet('rare');
const legend = pet('legend');

export const PETS = [
  common('rabbit', '🐰', '솜뭉치 토끼', '귀가 쫑긋, 칭찬을 제일 먼저 들어요.', 'red', '당근과 딸기'),
  common('cat', '🐱', '낮잠 고양이', '하루에 열여섯 시간을 자도 늘 졸려요.', 'gray', '햇볕 드는 창가'),
  common('dog', '🐶', '꼬리풍차 강아지', '반가우면 꼬리가 풍차처럼 돌아가요.', 'gray', '공 던지기 놀이'),
  common('hamster', '🐹', '볼빵빵 햄스터', '볼에 먹이를 잔뜩 숨겨 두는 저장 대장이에요.', 'yellow', '해바라기씨'),
  common('chick', '🐥', '삐약 병아리', '갓 태어나서 모든 게 신기해요.', 'yellow', '노란 민들레'),
  common('frog', '🐸', '퐁당 개구리', '비 오는 날 노래를 불러요.', 'green', '연잎 위에서 점프하기'),
  common('turtle', '🐢', '느긋 거북', '느려도 끝까지 가요.', 'blue', '따뜻한 바위 위 낮잠'),
  common('squirrel', '🐿️', '도토리 다람쥐', '도토리를 숨긴 곳을 자꾸 잊어요.', 'orange', '도토리 모으기'),
  common('ladybug', '🐞', '행운 무당벌레', '손등에 앉으면 좋은 일이 생긴대요.', 'red', '빨간 꽃잎'),
  common('fish', '🐠', '방울 금붕어', '보글보글 방울로 인사해요.', 'blue', '보글보글 거품'),
  common('hedgehog', '🦔', '밤송이 고슴도치', '가시는 있지만 마음은 보들보들해요.', 'green', '사과 조각'),
  common('sheep', '🐑', '구름 양', '털이 구름처럼 폭신해요.', 'indigo', '넓은 산 풀밭'),
  common('penguin', '🐧', '뒤뚱 펭귄', '뒤뚱뒤뚱 걸어도 수영은 1등이에요.', 'blue', '배로 미끄럼 타기'),
  common('bee', '🐝', '붕붕 꿀벌', '부지런히 꽃을 찾아다녀요.', 'yellow', '달콤한 꽃꿀'),
  common('snail', '🐌', '느릿 달팽이', '집을 업고 어디든 가요.', 'purple', '아침 이슬'),
  common('pig', '🐷', '꿀꿀 아기돼지', '진흙 놀이 대장이에요.', 'gray', '따뜻한 고구마'),
  common('mouse', '🐭', '찍찍 생쥐', '작지만 용감해요.', 'gray', '치즈 한 조각'),
  common('duck', '🦆', '꽥꽥 오리', '연못 친구들의 인사 담당이에요.', 'blue', '줄지어 헤엄치기'),
  rare('fox', '🦊', '번개 여우', '번개처럼 빠르고 꾀가 많아요.', 'orange', '숨바꼭질'),
  rare('owl', '🦉', '밤하늘 부엉이', '밤새 별을 세는 학자예요.', 'indigo', '별 세기'),
  rare('panda', '🐼', '대나무 판다', '하루 종일 대나무를 오물오물.', 'green', '대나무와 구르기 놀이'),
  rare('koala', '🐨', '졸린 코알라', '하루에 스무 시간을 자요.', 'green', '나무 꼭 껴안기'),
  rare('otter', '🦦', '조개 수달', '좋아하는 조개를 주머니에 넣고 다녀요.', 'blue', '손잡고 둥둥 떠다니기'),
  rare('dolphin', '🐬', '파도 돌고래', '파도 위에서 점프해요.', 'blue', '파도 타기'),
  rare('parrot', '🦜', '수다 앵무새', '"고맙습니다"를 제일 잘 따라 해요.', 'red', '따라 말하기'),
  rare('butterfly', '🦋', '무지개 나비', '날개에 일곱 빛깔이 숨어 있어요.', 'purple', '라벤더 꽃'),
  rare('wolf', '🐺', '달빛 늑대', '보름달이 뜨면 노래해요.', 'indigo', '친구들과 함께 달리기'),
  rare('flamingo', '🦩', '노을 플라밍고', '한 발로 서서 노을을 봐요.', 'orange', '노을 구경'),
  rare('octopus', '🐙', '먹물 문어', '여덟 팔로 동시에 여러 일을 해요.', 'blue', '먹물로 그림 그리기'),
  rare('sloth', '🦥', '느긋 나무늘보', '서두르지 않아도 괜찮다고 말해 줘요.', 'green', '천천히 걷기'),
  rare('bear', '🐻', '꿀단지 곰', '꿀을 나눠 먹는 걸 좋아해요.', 'green', '꿀단지'),
  rare('camel', '🐫', '사막 낙타', '긴 여행도 거뜬해요.', 'orange', '먼 길 걷기'),
  rare('monkey', '🐒', '정글 원숭이', '나무 타기 챔피언이에요.', 'green', '바나나'),
  rare('kangaroo', '🦘', '깡총 캥거루', '주머니에 작은 선물을 넣고 다녀요.', 'orange', '높이뛰기'),
  legend('dragon', '🐉', '무지개 드래곤', '회색 그림자를 물리친 전설의 용이에요.', 'rainbow', '일곱 빛깔 무지개'),
  legend('unicorn', '🦄', '별빛 유니콘', '뿔에서 별빛이 흘러나와요.', 'purple', '별똥별에 소원 빌기'),
  legend('babydragon', '🐲', '아기 용', '작은 불꽃을 뿜으며 웃어요.', 'rainbow', '불꽃놀이'),
  legend('trex', '🦖', '용암 티라노', '화산 섬에서 온 용감한 공룡이에요.', 'orange', '큰 소리로 노래하기'),
  legend('brachio', '🦕', '구름 브라키오', '목이 길어서 구름에 닿아요.', 'rainbow', '가장 높은 나뭇잎'),
  legend('whale', '🐳', '하늘 고래', '구름 바다를 헤엄쳐요.', 'rainbow', '구름 사이 헤엄치기'),
  legend('peacock', '🦚', '빛깔 공작', '꼬리를 펴면 색이 쏟아져요.', 'purple', '꼬리 자랑'),
  legend('eagle', '🦅', '폭풍 독수리', '가장 높은 하늘을 지켜요.', 'indigo', '높은 하늘 날기'),
  legend('tiger', '🐯', '수호 호랑이', '마을을 지키는 산의 왕이에요.', 'green', '마을 지키기'),
  legend('lion', '🦁', '황금 사자', '용기 있는 친구를 알아봐요.', 'yellow', '용기 있는 친구'),
  legend('shark', '🦈', '바다 왕 상어', '깊은 바다의 보물을 지켜요.', 'blue', '깊은 바다 보물'),
];

export const getPet = (id) => PETS.find((p) => p.id === id);

/** 알에서 그 등급이 나올 확률을 아이가 알기 쉬운 말로 */
export function chanceWord(percent) {
  if (percent >= 40) return '잘 나와요';
  if (percent >= 15) return '가끔 나와요';
  if (percent > 0) return '드물게 나와요';
  return '안 나와요';
}
