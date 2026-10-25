// 데이터 점검: 아이디 중복·오타를 찾아 개발 중(localhost) 콘솔에 알려 준다.
// 앱을 로컬에서 열었을 때 콘솔에 '데이터 점검: 문제 없음'이 떠야 한다.

import { STATS, STAT_IDS, EPITHET_ORDER } from './stats.js';
import { DEFAULT_VALUES, PRIORITY } from './values.js';
import { QUESTS, DEFAULT_ROUTINES } from './quests.js';
import { HIDDEN } from './hidden.js';
import { STORIES } from './stories.js';
import { PARENT_QUESTS, PARENT_QUESTS_PER_WEEK, PARENT_TITLES } from './parents.js';
import { PETS, EGGS, RARITY } from './pets.js';
import { TITLES, RANKS, DEFAULT_PRIVILEGES } from './titles.js';
import { LANDS, VILLAGERS, CHEST_LINES } from './map.js';
import { CONSTELLATIONS, STARS_PER_CONSTELLATION } from './sky.js';
import { TALENT, CARDS, COACH_TIPS, SHOP, ORB_BY_RARITY, TRIP_QUESTS } from './petpower.js';

export function validateData() {
  const problems = [];
  const seen = new Set();
  const unique = (id, where) => {
    if (seen.has(id)) problems.push(`${where}: 아이디 중복 '${id}'`);
    seen.add(id);
  };
  const statOk = (stat, where) => {
    if (!STAT_IDS.includes(stat)) problems.push(`${where}: 없는 스탯 '${stat}'`);
  };

  if (EPITHET_ORDER.length !== STATS.length || !EPITHET_ORDER.every((id) => STAT_IDS.includes(id))) {
    problems.push('stats: EPITHET_ORDER 가 스탯 목록과 다름');
  }
  const valueIds = DEFAULT_VALUES.map((v) => v.id);
  DEFAULT_VALUES.forEach((v) => {
    unique(v.id, '가치');
    statOk(v.stat, `가치 ${v.id}`);
    if (!PRIORITY[v.priority]) problems.push(`가치 ${v.id}: 우선순위 ${v.priority} 없음`);
  });
  QUESTS.forEach((q) => {
    unique(q.id, '퀘스트');
    if (!valueIds.includes(q.value)) problems.push(`퀘스트 ${q.id}: 없는 가치 '${q.value}'`);
    if (!['daily', 'challenge', 'weekly'].includes(q.kind)) problems.push(`퀘스트 ${q.id}: 종류 '${q.kind}'`);
  });
  // 가치마다 매일 퀘스트가 있어야 우선순위를 올렸을 때 실제로 퀘스트가 나온다
  valueIds.forEach((id) => {
    if (!QUESTS.some((q) => q.value === id && q.kind === 'daily')) problems.push(`가치 ${id}: 매일 퀘스트 없음`);
  });
  DEFAULT_ROUTINES.forEach((r) => {
    unique(r.id, '매일 하는 일');
    statOk(r.stat, `매일 하는 일 ${r.id}`);
    if (!r.days.every((d) => d >= 0 && d <= 6)) problems.push(`매일 하는 일 ${r.id}: 요일 오류`);
  });
  HIDDEN.forEach((h) => {
    unique(h.id, '히든');
    statOk(h.stat, `히든 ${h.id}`);
    if (!h.hint) problems.push(`히든 ${h.id}: 힌트 없음`);
  });
  STORIES.forEach((s) => {
    unique(s.id, '이야기');
    if (!s.id.startsWith('s-')) problems.push(`이야기 ${s.id}: 아이디는 's-'로 시작해야 함`);
    if (!s.questions?.length) problems.push(`이야기 ${s.id}: 질문 없음`);
  });
  PARENT_QUESTS.forEach((q) => unique(q.id, '부모 퀘스트'));
  if (PARENT_QUESTS.length < PARENT_QUESTS_PER_WEEK * 2) problems.push('부모 퀘스트가 너무 적음');
  if (!PARENT_TITLES[1]) problems.push('부모 칭호: 1레벨 없음');
  PETS.forEach((p) => {
    unique(`pet:${p.id}`, '펫');
    if (!RARITY[p.rarity]) problems.push(`펫 ${p.id}: 등급 '${p.rarity}'`);
    if (!RANKS.some((r) => r.id === p.home)) problems.push(`펫 ${p.id}: 없는 사는 곳 '${p.home}'`);
    if (!p.likes) problems.push(`펫 ${p.id}: 좋아하는 것 없음`);
  });
  Object.entries(EGGS).forEach(([id, egg]) => {
    Object.entries(egg.odds).forEach(([rarity, odd]) => {
      if (odd > 0 && !PETS.some((p) => p.rarity === rarity)) problems.push(`알 ${id}: '${rarity}' 펫이 없음`);
    });
  });
  for (let lv = 1; lv <= 30; lv += 1) if (!TITLES[lv]) problems.push(`칭호: ${lv}레벨 없음`);
  RANKS.forEach((r, i) => {
    if (i && r.from <= RANKS[i - 1].from) problems.push(`빛깔 ${r.id}: 레벨 순서 오류`);
  });
  DEFAULT_PRIVILEGES.forEach((p) => {
    if (!(p.level > 1)) problems.push(`레벨 해금 '${p.text}': 레벨 오류`);
  });
  RANKS.forEach((r) => {
    if (!LANDS[r.id]) problems.push(`지도: 땅 '${r.id}' 정보 없음`);
    if (!r.place) problems.push(`빛깔 ${r.id}: 땅 이름 없음`);
    if (VILLAGERS.filter((x) => x.land === r.id).length !== 3) problems.push(`지도: 땅 '${r.id}' 마을 사람이 3명이 아님`);
  });
  VILLAGERS.forEach((x) => {
    unique(x.id, '마을 사람');
    if (!x.story || !x.quote || !x.hint) problems.push(`마을 사람 ${x.id}: 이야기·한마디·힌트 빠짐`);
  });
  if (!CHEST_LINES.length) problems.push('지도: 보물 상자 문구 없음');
  // 디바인 수호신: 회색 마을 빼고 빛깔 땅마다 한 마리
  RANKS.slice(1).forEach((r) => {
    const n = PETS.filter((p) => p.rarity === 'divine' && p.home === r.id).length;
    if (n !== 1) problems.push(`디바인: 땅 '${r.id}' 수호신이 ${n}마리`);
  });
  CONSTELLATIONS.forEach((c) => {
    unique(c.id, '별자리');
    if (c.points.length !== STARS_PER_CONSTELLATION) problems.push(`별자리 ${c.id}: 별 ${c.points.length}개`);
  });
  // 펫 능력: 펫마다 재능·지식 카드 2장, 능력치마다 꿀팁, 등급마다 구슬·탐험 값
  PETS.forEach((p) => {
    if (!STAT_IDS.includes(TALENT[p.id])) problems.push(`펫 ${p.id}: 재능 없음`);
    if ((CARDS[p.id] || []).length !== 2) problems.push(`펫 ${p.id}: 지식 카드가 2장이 아님`);
  });
  Object.keys(TALENT).forEach((id) => { if (!PETS.some((p) => p.id === id)) problems.push(`재능: 없는 펫 '${id}'`); });
  STAT_IDS.forEach((id) => {
    if (!COACH_TIPS[id]?.basic?.length || !COACH_TIPS[id]?.challenge?.length) problems.push(`꿀팁: '${id}' 없음`);
  });
  Object.keys(RARITY).forEach((r) => {
    if (!ORB_BY_RARITY[r] || !TRIP_QUESTS[r]) problems.push(`펫 능력: 등급 '${r}' 값 없음`);
  });
  SHOP.forEach((it) => unique(`shop:${it.id}`, '가게'));
  return problems;
}
