// 히든 퀘스트: 아이에게는 '???'와 힌트만 보이고, 부모가 그 행동을 '발견'하면 열린다(+ 황금 알).
// 조건을 정확히 몰라야 점수 때문에 착한 척하기가 어렵고, "좋은 행동은 누군가 알아봐 준다"는 경험이 된다.
// 한 번 발견한 퀘스트는 다시 열리지 않는다. 같은 행동을 또 하면 칭찬 카드로 알려 준다.

export const HIDDEN = [
  { id: 'h-confess', stat: 'heart', text: '잘못한 일을 먼저 털어놓기', hint: '용기가 필요한 말 한마디' },
  { id: 'h-seat', stat: 'heart', text: '버스·지하철에서 자리 양보하기', hint: '앉아 있을 때 둘러보면…' },
  { id: 'h-share', stat: 'heart', text: '아끼는 물건을 친구에게 먼저 빌려주기', hint: '내 것을 먼저 내밀면…' },
  { id: 'h-trash', stat: 'heart', text: '아무도 안 볼 때 쓰레기 줍기', hint: '아무도 보지 않을 때의 착한 일' },
  { id: 'h-carer', stat: 'heart', text: '아프거나 피곤한 가족 챙겨 주기', hint: '누군가 힘들어 보일 때…' },
  { id: 'h-newfriend', stat: 'heart', text: '처음 보는 친구에게 먼저 말 걸기', hint: '새 얼굴 앞에서의 용기' },
  { id: 'h-younger', stat: 'heart', text: '어린 동생(친척·이웃)을 돌봐 주기', hint: '나보다 작은 친구에게…' },
  { id: 'h-calm', stat: 'heart', text: '화가 났지만 참고 말로 풀기', hint: '폭풍을 말로 잠재우면…' },
  { id: 'h-lost', stat: 'heart', text: '주운 물건의 주인 찾아 주기', hint: '주인을 기다리는 물건' },
  { id: 'h-standup', stat: 'heart', text: '놀림받는 친구 편들어 주기', hint: '친구 옆에 서는 용기' },
  { id: 'h-love', stat: 'heart', text: '먼저 "사랑해요" 말하기', hint: '가장 따뜻한 세 글자' },
  { id: 'h-makeup', stat: 'heart', text: '친구와 다툰 뒤 먼저 화해하기', hint: '먼저 내미는 손' },
  { id: 'h-goodloser', stat: 'manners', text: '게임에 지고도 웃으며 "축하해" 말하기', hint: '지는 순간에도 빛나는 것' },
  { id: 'h-grandcall', stat: 'manners', text: '시키지 않았는데 할머니·할아버지께 먼저 연락하기', hint: '멀리 계신 분을 떠올리면…' },
  { id: 'h-compliment', stat: 'manners', text: '다른 사람의 좋은 점을 칭찬하기', hint: '남의 좋은 점을 소리 내어…' },
  { id: 'h-kindwords', stat: 'manners', text: '하루 종일 고운 말만 쓰기', hint: '하루 종일 반짝이는 말' },
  { id: 'h-wait', stat: 'manners', text: '식당·병원에서 차분하게 기다리기', hint: '기다리는 동안의 멋짐' },
  { id: 'h-shoes', stat: 'self', text: '시키지 않았는데 가족 신발까지 가지런히 정리하기', hint: '현관이 저절로 반듯해진다면…' },
  { id: 'h-homework', stat: 'self', text: '말하기 전에 숙제 먼저 끝내기', hint: '누가 말하기 전에…' },
  { id: 'h-grit', stat: 'self', text: '어려운 일을 포기하지 않고 끝까지 해내기', hint: '다시, 또다시…' },
  { id: 'h-dishes', stat: 'self', text: '시키지 않았는데 설거지·뒷정리 돕기', hint: '부엌에서 들리는 고마운 소리' },
  { id: 'h-plan', stat: 'self', text: '스스로 계획을 세우고 지키기', hint: '내가 만든 약속' },
  { id: 'h-early', stat: 'body', text: '스스로 일찍 자고 일찍 일어나기', hint: '해보다 먼저…' },
  { id: 'h-pass', stat: 'body', text: '농구에서 친구에게 패스하고 함께 기뻐하기', hint: '공이 내 손을 떠날 때…' },
  { id: 'h-selflearn', stat: 'wisdom', text: '혼자 새로운 걸 배워서 보여 주기', hint: '아무도 안 가르쳐 줬는데…' },
  { id: 'h-teach', stat: 'wisdom', text: '친구에게 내가 아는 걸 친절하게 가르쳐 주기', hint: '내가 아는 걸 나누면…' },
  { id: 'h-surprise', stat: 'create', text: '가족을 위한 깜짝 이벤트 준비하기', hint: '몰래 준비한 기쁨' },
];
