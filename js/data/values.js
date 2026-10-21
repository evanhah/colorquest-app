// 중점 가치: 부모가 중요하게 여기는 것. 퀘스트는 모두 가치 하나에 속하고,
// 가치의 우선순위가 높을수록 그 가치의 퀘스트가 더 자주 뽑힌다(core/game.js pick).
// 부모 모드에서 우선순위를 바꾸거나 새 가치를 더할 수 있다(새 가치는 state.values 에 custom: true 로 저장).

export const PRIORITY = [
  { level: 0, name: '쉬기', weight: 0 },
  { level: 1, name: '보통', weight: 1 },
  { level: 2, name: '중요', weight: 2.5 },
  { level: 3, name: '아주 중요', weight: 4 },
];

export const DEFAULT_VALUES = [
  { id: 'greet', name: '인사·존댓말', stat: 'manners', priority: 3 },
  { id: 'thanks', name: '고맙다·미안하다 말하기', stat: 'manners', priority: 3 },
  { id: 'table', name: '식사 예절', stat: 'manners', priority: 1 },
  { id: 'honest', name: '정직', stat: 'heart', priority: 3 },
  { id: 'care', name: '배려·양보', stat: 'heart', priority: 3 },
  { id: 'promise', name: '약속 지키기', stat: 'heart', priority: 2 },
  { id: 'feelings', name: '마음 표현·감정 다루기', stat: 'heart', priority: 2 },
  { id: 'tidy', name: '정리정돈', stat: 'self', priority: 2 },
  { id: 'ready', name: '스스로 준비', stat: 'self', priority: 1 },
  { id: 'help', name: '가족 돕기', stat: 'self', priority: 2 },
  { id: 'exercise', name: '운동·바깥놀이', stat: 'body', priority: 1 },
  { id: 'health', name: '건강 습관', stat: 'body', priority: 1 },
  { id: 'reading', name: '책 읽기·낱말', stat: 'wisdom', priority: 1 },
  { id: 'curious', name: '호기심·탐구', stat: 'wisdom', priority: 1 },
  { id: 'make', name: '만들기·상상', stat: 'create', priority: 1 },
];
