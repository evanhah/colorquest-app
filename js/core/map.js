// 모험 길 지도 규칙: 경험치 → 칸, 칸마다의 이벤트(입구·마을 사람·보물 상자), 이벤트 열기.
// 지도는 경험치를 그대로 보여 주는 그림이라, 현실 퀘스트를 해야만 앞으로 걸어간다(지도에서 따로 할 일은 없음).

import { RANKS } from '../data/titles.js';
import { XP_PER_TILE, CHEST_EVERY, CHEST_WARMTH, CHEST_LINES, villagersOf } from '../data/map.js';
import { getPet } from '../data/pets.js';
import { xpForLevel } from './level.js';
import { warmEgg } from './game.js';
import { dateKey, josa } from './util.js';

const RAINBOW_STRETCH = 200; // 마지막 무지개 땅은 끝이 없으므로 마을 사람은 입구부터 200칸 안에 만난다

export const tileOf = (xp) => Math.floor(xp / XP_PER_TILE);

/** i번째 땅(RANKS 순서)의 첫 칸 = 그 빛깔을 되찾는 레벨의 경험치 */
export const landStart = (i) => Math.floor(xpForLevel(RANKS[i].from) / XP_PER_TILE);

export function landIndexOf(tile) {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (tile >= landStart(i)) idx = i;
  });
  return idx;
}

/** 땅마다 마을 사람 3명을 만나는 칸: 땅 길이의 1/4, 2/4, 3/4 */
function villagerTiles(i) {
  const start = landStart(i);
  const end = i + 1 < RANKS.length ? landStart(i + 1) : start + RAINBOW_STRETCH;
  return [1, 2, 3].map((k) => start + Math.round(((end - start) * k) / 4));
}

/** 칸의 이벤트: start 출발 · gate 땅 입구 · villager 마을 사람 · chest 보물 상자 · null */
export function eventAt(tile) {
  if (tile === 0) return { type: 'start', land: RANKS[0].id };
  const i = landIndexOf(tile);
  const land = RANKS[i].id;
  if (tile === landStart(i)) return { type: 'gate', land };
  const k = villagerTiles(i).indexOf(tile);
  if (k >= 0) return { type: 'villager', land, id: villagersOf(land)[k]?.id };
  if (tile % CHEST_EVERY === 0) return { type: 'chest', land };
  return null;
}

const openable = (ev) => ev && (ev.type === 'villager' || ev.type === 'chest');

/** 이미 지나왔지만 아직 열지 않은 마을 사람·보물 상자 칸 */
export function pendingEvents(s) {
  const now = tileOf(s.hero.xp);
  const list = [];
  for (let t = 1; t <= now; t += 1) {
    const ev = eventAt(t);
    if (openable(ev) && !s.map.claimed[t]) list.push({ tile: t, ...ev });
  }
  return list;
}

/** 지금 칸 다음의 이벤트(보물·마을 사람·입구)까지 남은 칸 */
export function nextEvent(tile, type) {
  for (let t = tile + 1; t < tile + 2000; t += 1) {
    const ev = eventAt(t);
    if (ev && ev.type === type) return { tile: t, left: t - tile, ...ev };
  }
  return null;
}

/** 지나온 이벤트 칸 열기 → 축하 창(마을 사람 이야기 / 보물 상자) */
export function openMapEvent(s, tile) {
  const ev = eventAt(tile);
  if (!openable(ev) || tile > tileOf(s.hero.xp) || s.map.claimed[tile]) return;
  s.map.claimed[tile] = dateKey();
  if (ev.type === 'chest') {
    warmEgg(s, CHEST_WARMTH);
    s.celebrations.unshift({ type: 'chest', line: Math.floor(tile / CHEST_EVERY) % CHEST_LINES.length });
  } else {
    s.celebrations.unshift({ type: 'villager', id: ev.id });
  }
}

/** 만난 마을 사람 id (열어 본 마을 사람 칸에서) */
export const metVillagers = (s) => Object.keys(s.map.claimed).map((t) => eventAt(Number(t))).filter((ev) => ev?.type === 'villager').map((ev) => ev.id);

const JOSA = { 이: ['이', '가'], 과: ['과', '와'], 을: ['을', '를'], 은: ['은', '는'] };

/** 이야기 속 {펫}·{펫이}·{펫과}·{펫을}·{펫은}을 함께 다니는 펫 이름으로 바꾼다 */
export function fillStory(text, s) {
  const name = getPet(s.hero.companion)?.name || '친구';
  return text.replace(/\{펫(이|과|을|은)?\}/g, (_, j) => name + (j ? josa(name, ...JOSA[j]) : ''));
}
