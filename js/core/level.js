// 레벨 계산과 칭호·빛깔·별명.
//
// 레벨 L 에 도달하는 데 필요한 누적 경험치 = 30 × (L-1)².
// 일주일에 약 600 XP(매일 퀘스트 + 주간 미션 + 칭찬 카드 + 히든)를 얻는다고 보면
// 첫날 Lv.2, 첫 주 Lv.5, 5주 Lv.10, 반년 Lv.20, 약 10달 뒤 Lv.30 — 처음엔 빠르고 점점 천천히.

import { TITLES, RANKS } from '../data/titles.js';
import { PARENT_TITLES } from '../data/parents.js';
import { EPITHET_ORDER, getStat } from '../data/stats.js';

export const xpForLevel = (level) => 30 * (level - 1) ** 2;

export function levelInfo(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - base, need: next - base, left: next - xp, ratio: (xp - base) / (next - base) };
}

const fromTable = (table, level) => {
  let found = '';
  Object.keys(table).map(Number).sort((a, b) => a - b).forEach((lv) => {
    if (lv <= level) found = table[lv];
  });
  return found;
};

export const titleOf = (level) => fromTable(TITLES, level);
export const parentTitleOf = (level) => fromTable(PARENT_TITLES, level);

export function rankIndexOf(level) {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (level >= r.from) idx = i;
  });
  return idx;
}
export const rankOf = (level) => RANKS[rankIndexOf(level)];
export const nextRank = (level) => RANKS[rankIndexOf(level) + 1] || null;

/** 이 레벨에서 새로 해금되는 권한들 */
export const privilegesAt = (s, level) => s.privileges.filter((p) => p.level === level);
export const nextPrivilege = (s, level) => s.privileges.filter((p) => p.level > level).sort((a, b) => a.level - b.level)[0] || null;

/**
 * 이번 주 별명: 이번 주(월요일부터) 가장 많이 자란 스탯의 꾸밈말. 이번 주 기록이 없으면 가장 높은 스탯.
 * 매주 바뀌어서 "요즘 내가 어떤 사람이 되어 가는지"를 보여 준다.
 */
export function epithetOf(s, monday) {
  const gains = Object.fromEntries(EPITHET_ORDER.map((id) => [id, 0]));
  s.log.forEach((e) => {
    if (e.who === 'hero' && e.stat && e.date >= monday) gains[e.stat] += e.n || 0;
  });
  const thisWeek = Object.values(gains).some(Boolean);
  const score = thisWeek ? gains : s.hero.stats;
  const best = EPITHET_ORDER.reduce((a, b) => (score[b] > score[a] ? b : a), EPITHET_ORDER[0]);
  return { stat: getStat(best), thisWeek };
}
