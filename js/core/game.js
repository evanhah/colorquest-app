// 게임 규칙: 오늘·이번 주 퀘스트 뽑기, 완료·승인 처리, 경험치·스탯·알·펫·축하 기록.
// 상태를 바꾸는 함수는 모두 store.update(s => …) 안에서 draft(s)를 고친다.

import { QUESTS, REWARD } from '../data/quests.js';
import { PRIORITY } from '../data/values.js';
import { STORIES } from '../data/stories.js';
import { HIDDEN } from '../data/hidden.js';
import { PARENT_QUESTS, PARENT_QUESTS_PER_WEEK, PARENT_IDS } from '../data/parents.js';
import { PETS, EGGS, eggNeed } from '../data/pets.js';
import { STRENGTH_BONUS } from '../data/stats.js';
import { ALLCLEAR_WARMTH } from '../data/sky.js';
import { levelInfo, rankIndexOf } from './level.js';
import { RANKS } from '../data/titles.js';
import { petWork, petUndo, joinIfRoom, applyInterest } from './pets.js';
import { dateKey, weekKey, addDays, daysBetween, seededRandom, weightedPick, weekdayOf, uid } from './util.js';

const LOG_LIMIT = 300;
const KEEP_DAYS = 70;       // 이보다 오래된 하루 기록은 지운다 (주간 기록은 12주)
const KEYS_FOR_VAULT = 4;   // 주간 미션 수 = 비밀의 방을 여는 열쇠 수

// ── 찾아보기 ─────────────────────────────────────────────

export const valueOf = (s, id) => s.values.find((v) => v.id === id);
export const priorityOf = (s, valueId) => valueOf(s, valueId)?.priority ?? 0;
const weightOf = (s, valueId) => PRIORITY[priorityOf(s, valueId)]?.weight ?? 0;

/** 기본 퀘스트 + 부모가 더한 퀘스트. stat 은 부모가 정했으면 그것, 아니면 속한 가치의 스탯. */
export function questList(s) {
  return [
    ...QUESTS.map((q) => ({ ...q, builtIn: true, off: s.offQuests.includes(q.id) })),
    ...s.customQuests.map((q) => ({ ...q, builtIn: false, off: false })),
  ].map((q) => ({ ...q, stat: q.stat || valueOf(s, q.value)?.stat || 'heart' }));
}

/** 부모가 경험치를 정한 퀘스트의 스탯 증가: 경험치 10마다 +1 (1~5) */
export const statGainFor = (xp) => Math.min(5, Math.max(1, Math.round(xp / 10)));

/** 항목(오늘 항목·주간 미션)의 보상. 부모가 정한 경험치(xp)가 있으면 그것을, 없으면 종류별 기본값. */
export function rewardFor(item) {
  const base = REWARD[item.type] || REWARD.weekly; // streak·lesson 은 주간 미션 보상
  return item.xp ? { ...base, xp: item.xp, n: statGainFor(item.xp) } : base;
}
export const getQuest = (s, id) => questList(s).find((q) => q.id === id);
export const getRoutine = (s, id) => s.routines.find((r) => r.id === id);
export const getStory = (id) => STORIES.find((x) => x.id === id);
export const allHidden = (s) => [...HIDDEN, ...s.hiddenCustom];

/** 그날 해야 하는 매일 하는 일 */
export const routinesOn = (s, date) => s.routines.filter((r) => r.on && r.days.includes(weekdayOf(date)));

/** 오늘 화면 항목 하나의 정보 (매일 하는 일 · 오늘의 퀘스트 · 오늘의 도전) */
export function dayItem(s, id) {
  const r = getRoutine(s, id);
  if (r) return { id, type: 'routine', text: r.text, stat: r.stat, icon: r.icon, xp: r.xp };
  const q = getQuest(s, id);
  if (q) return { id, type: q.kind === 'challenge' ? 'challenge' : 'daily', text: q.text, stat: q.stat, xp: q.xp };
  return null;
}

// ── 뽑기 ─────────────────────────────────────────────────

/** 최근에 나온 퀘스트일수록 다시 나올 확률을 낮춘다. unit: 1 = 날 단위, 7 = 주 단위 */
function freshness(s, key, date, unit) {
  const last = s.lastSeen[key];
  if (!last) return 1.2; // 한 번도 안 나온 퀘스트는 조금 더 자주
  const gap = daysBetween(last, date) / unit;
  if (gap < 3) return 0.05;
  if (gap < 7) return 0.4;
  return 1;
}

/**
 * 후보 중 count 개를 뽑는다. 가중치 = 가치 우선순위 × 최근에 안 나온 정도 (부모가 만든 퀘스트는 1.5배).
 * 하나를 뽑으면 같은 가치(spreadBy)의 다른 후보는 확률을 크게 낮춰 하루에 골고루 나오게 한다.
 */
function pick(s, candidates, count, rand, date, { unit = 1, spreadBy = 'value' } = {}) {
  const weight = new Map(candidates.map((q) => [q.id, weightOf(s, q.value) * freshness(s, q.id, date, unit) * (q.builtIn ? 1 : 1.5)]));
  const chosen = [];
  for (let i = 0; i < count; i += 1) {
    const q = weightedPick(candidates.filter((c) => !chosen.includes(c)), (c) => weight.get(c.id), rand);
    if (!q) break;
    chosen.push(q);
    candidates.forEach((c) => {
      if (c[spreadBy] === q[spreadBy]) weight.set(c.id, weight.get(c.id) * 0.1);
    });
  }
  chosen.forEach((q) => {
    s.lastSeen[q.id] = date;
  });
  return chosen.map((q) => q.id);
}

const activeQuests = (s, kind, { coop = false } = {}) =>
  questList(s).filter((q) => !q.off && q.kind === kind && !!q.coop === coop && priorityOf(s, q.value) > 0);

/** 지금 설정으로 매일 퀘스트에서 각 가치가 나올 대략의 비율 (0~1) */
export function valueShares(s) {
  const qs = activeQuests(s, 'daily');
  const total = qs.reduce((sum, q) => sum + weightOf(s, q.value), 0) || 1;
  const share = {};
  qs.forEach((q) => {
    share[q.value] = (share[q.value] || 0) + weightOf(s, q.value) / total;
  });
  return share;
}

// ── 오늘 ─────────────────────────────────────────────────

export function planDay(s, date, salt = '') {
  const rand = seededRandom(`${s.seed}:day:${date}${salt}`);
  return {
    quests: pick(s, activeQuests(s, 'daily'), s.settings.dailyCount, rand, date),
    challenges: pick(s, activeQuests(s, 'challenge'), s.settings.challengeCount, rand, date, { spreadBy: 'stat' }),
    picked: null,
    done: {},
  };
}

/** 오늘 퀘스트 다시 뽑기 (부모가 가치를 바꾼 뒤). 이미 한 퀘스트는 남긴다. */
export function rerollDay(s, date = dateKey()) {
  const day = s.days[date];
  if (!day) return;
  const fresh = planDay(s, date, `:${Date.now()}`);
  const kept = day.quests.filter((id) => day.done[id]);
  day.quests = [...kept, ...fresh.quests.filter((id) => !kept.includes(id))].slice(0, Math.max(kept.length, s.settings.dailyCount));
  if (!(day.picked && day.done[day.picked])) {
    day.challenges = fresh.challenges;
    day.picked = null;
  }
}

/** 오늘 한 개수 / 전체 개수 (도전은 고르기 전에도 1개로 센다) */
export function dayProgress(s, date = dateKey()) {
  const day = s.days[date];
  if (!day) return { done: 0, total: 0 };
  const ids = [...routinesOn(s, date).map((r) => r.id), ...day.quests, ...(day.picked ? [day.picked] : [])];
  const total = ids.length + (!day.picked && day.challenges.length ? 1 : 0);
  return { done: ids.filter((id) => day.done[id]).length, total };
}

const dayText = (item) => ({ routine: '매일 하는 일', daily: '오늘의 퀘스트', challenge: '오늘의 도전' }[item.type] + `: ${item.text}`);

/** 오늘 항목 완료(아이가 스스로 체크). 받은 보상 { xp, stat, n } 을 돌려준다. */
export function completeDay(s, id, date = dateKey()) {
  const day = s.days[date];
  const item = dayItem(s, id);
  if (!day || !item || day.done[id]) return null;
  day.done[id] = true;
  const r = rewardFor(item);
  grant(s, { xp: r.xp, stat: item.stat, n: r.n, text: dayText(item) });
  // 펫 팀이 구슬을 만들고 탐험한다 — 같은 항목은 하루 한 번만(되돌렸다 다시 눌러 모으기 방지)
  day.orbs = day.orbs || {};
  let orbs = 0;
  if (!(id in day.orbs)) {
    orbs = petWork(s);
    day.orbs[id] = orbs;
  }
  if (item.type === 'routine') checkStreak(s, id, date);
  checkAllClear(s, date);
  return { xp: r.xp, stat: item.stat, n: r.n, orbs };
}

/**
 * 그날 할 일(매일 하는 일·오늘의 퀘스트·고른 도전)을 모두 끝내면 하루에 한 번:
 * 밤하늘에 별 하나 + 함께 다니는 펫의 축하 춤 + 알 온기. 되돌리기를 해도 별은 그대로(하루 한 번뿐이라 반복 이득 없음).
 * 경험치를 크게 주지 않는 이유: 스스로 체크하는 퀘스트라 보상이 크면 안 한 것까지 체크하고 싶어진다.
 */
function checkAllClear(s, date) {
  const day = s.days[date];
  const { done, total } = dayProgress(s, date);
  if (day.allClear || !total || done < total) return;
  day.allClear = true;
  s.stars.total += 1;
  warmEgg(s, ALLCLEAR_WARMTH);
  s.celebrations.push({ type: 'allclear', stars: s.stars.total });
  addLog(s, { who: 'hero', text: '오늘 퀘스트를 모두 해내고 밤하늘에 별을 켰다', xp: 0 });
}

/** 실수로 누른 완료 되돌리기 (그날만) */
export function undoDay(s, id, date = dateKey()) {
  const day = s.days[date];
  const item = dayItem(s, id);
  if (!day?.done[id] || !item) return;
  delete day.done[id];
  const r = rewardFor(item);
  revoke(s, { xp: r.xp, stat: item.stat, n: r.n, text: dayText(item) });
  if (day.orbs && id in day.orbs && petUndo(s, day.orbs[id])) delete day.orbs[id];
}

/** 부모가 방금 만든 퀘스트를 오늘의 퀘스트에 바로 넣는다 */
export function addToToday(s, id, date = dateKey()) {
  const day = s.days[date];
  if (day && !day.quests.includes(id)) day.quests.push(id);
  s.lastSeen[id] = date;
}

export function pickChallenge(s, id, date = dateKey()) {
  const day = s.days[date];
  if (day && !(day.picked && day.done[day.picked])) day.picked = id;
}

// ── 이번 주 ──────────────────────────────────────────────

const isStory = (id) => id.startsWith('s-');
const isRoutineMission = (id) => id.startsWith('rm:');

function nextStory(s) {
  let story = STORIES.find((x) => !s.storyUsed.includes(x.id));
  if (!story) {
    s.storyUsed = [];
    [story] = STORIES;
  }
  s.storyUsed.push(story.id);
  return story;
}

/** 매일 하는 일 하나로 만드는 주간 미션 — 주마다 돌아가며 하나씩 */
function routineMission(s, monday) {
  const list = s.routines.filter((r) => r.on && r.days.length);
  if (!list.length) return null;
  const n = Math.floor(daysBetween('2026-01-05', monday) / 7);
  return `rm:${list[((n % list.length) + list.length) % list.length].id}`;
}

/** 주간 미션 4개: 이야기 1 + 매일 하는 일 1 + 함께하는 미션 1 + 가치 미션으로 채우기 */
function fillWeek(s, monday, keep, rand) {
  const missions = [...keep];
  if (!missions.some(isStory)) missions.push(nextStory(s).id);
  if (!missions.some(isRoutineMission)) {
    const rm = routineMission(s, monday);
    if (rm) missions.push(rm);
  }
  const unused = (list) => list.filter((q) => !missions.includes(q.id));
  if (!missions.some((id) => getQuest(s, id)?.coop)) {
    missions.push(...pick(s, unused(activeQuests(s, 'weekly', { coop: true })), 1, rand, monday, { unit: 7 }));
  }
  const room = KEYS_FOR_VAULT - missions.length;
  if (room > 0) missions.push(...pick(s, unused(activeQuests(s, 'weekly')), room, rand, monday, { unit: 7 }));
  return missions;
}

/** 이번 주 미션 다시 뽑기. 시작했거나 끝낸 미션과 이야기 퀘스트는 남긴다. */
export function rerollWeek(s, monday = weekKey()) {
  const week = s.weeks[monday];
  if (!week) return;
  const keep = week.missions.filter((id) => week.status[id] || isStory(id));
  week.missions = fillWeek(s, monday, keep, seededRandom(`${s.seed}:week:${monday}:${Date.now()}`));
}

/** 꾸준함 미션 목표 일수: 매일 하는 일이면 5일, 아니면 (요일 수 - 1)일. 모험을 주 중간에 시작했으면 남은 날에 맞춘다. */
function streakNeed(s, r, monday) {
  const base = r.days.length >= 6 ? 5 : Math.max(1, r.days.length - 1);
  let left = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(monday, i);
    if (day >= (s.createdAt || monday) && r.days.includes(weekdayOf(day))) left += 1;
  }
  return Math.max(1, Math.min(base, left));
}

/** 이번 주에 그 일을 한 날 수 */
export function routineCount(s, routineId, monday) {
  let n = 0;
  for (let i = 0; i < 7; i += 1) if (s.days[addDays(monday, i)]?.done?.[routineId]) n += 1;
  return n;
}

/**
 * 주간 미션 정보. type:
 *   story 이야기(부모와 대화) · coop 함께하는 미션 · weekly 가치 미션
 *   streak 자주 하는 일 N일 하기(자동 완료) · lesson 학원에서 배운 것 보여 주기
 */
export function missionInfo(s, id, monday = weekKey()) {
  if (isRoutineMission(id)) {
    const r = getRoutine(s, id.slice(3));
    if (!r) return null;
    if (r.days.length >= 4) {
      const need = streakNeed(s, r, monday);
      return { id, type: 'streak', icon: r.icon, text: `${r.text} — 이번 주 ${need}일`, stat: r.stat, need, routineId: r.id };
    }
    return { id, type: 'lesson', icon: r.icon, text: r.weekly || `${r.text} — 배운 것 가족에게 보여 주기`, stat: r.stat };
  }
  if (isStory(id)) {
    const story = getStory(id);
    return story ? { id, type: 'story', icon: '📖', text: `이야기 퀘스트: ${story.title}`, stat: 'heart', story } : null;
  }
  const q = getQuest(s, id);
  return q ? { id, type: q.coop ? 'coop' : 'weekly', icon: q.coop ? '🤝' : '⭐', text: q.text, stat: q.stat, xp: q.xp } : null;
}


export const missionsOf = (s, week) => week.missions.map((id) => missionInfo(s, id)).filter(Boolean);
export const keysOf = (week) => week.missions.filter((id) => week.status[id]?.state === 'done').length;
export const keysNeeded = (s, week) => Math.min(KEYS_FOR_VAULT, missionsOf(s, week).length);
export const vaultReady = (s, week) => !week.vault && keysNeeded(s, week) > 0 && keysOf(week) >= keysNeeded(s, week);

export function pendingCount(s, monday = weekKey()) {
  const week = s.weeks[monday];
  return week ? Object.values(week.status).filter((x) => x.state === 'pending').length : 0;
}

/** 아이가 "다 했어요!" → 부모 확인 기다리기 */
export function requestMission(s, monday, id, partner = null) {
  const week = s.weeks[monday];
  if (week && week.status[id]?.state !== 'done') week.status[id] = { state: 'pending', with: partner, date: dateKey() };
}

export function cancelMission(s, monday, id) {
  const week = s.weeks[monday];
  if (week?.status[id]?.state === 'pending') delete week.status[id];
}

/** 부모 확인(또는 꾸준함 미션 자동 완료) → 보상 + 열쇠. 함께한 부모도 경험치를 받는다. */
export function finishMission(s, monday, id, partner = null) {
  const week = s.weeks[monday];
  const info = missionInfo(s, id, monday);
  if (!week || !info || week.status[id]?.state === 'done') return;
  const withWho = partner ?? week.status[id]?.with ?? null;
  week.status[id] = { state: 'done', with: withWho, date: dateKey() };
  const r = rewardFor(info);
  const grants = [{ xp: r.xp, stat: info.stat, n: r.n, text: `주간 미션: ${info.text}` }];
  if (withWho && r.partnerXp) grants.push({ who: withWho, xp: r.partnerXp, text: `함께한 미션: ${info.text}` });
  rewardWith(s, { type: 'key', text: info.text, monday }, ...grants);
  petWork(s);
}

function checkStreak(s, routineId, date) {
  const monday = weekKey(date);
  const id = `rm:${routineId}`;
  const info = missionInfo(s, id, monday);
  if (!s.weeks[monday]?.missions.includes(id) || info?.type !== 'streak') return;
  if (routineCount(s, routineId, monday) >= info.need) finishMission(s, monday, id);
}

export function openVault(s, monday = weekKey()) {
  const week = s.weeks[monday];
  if (!week || !vaultReady(s, week)) return;
  week.vault = true;
  s.eggsWaiting.push('rainbow');
  s.celebrations.unshift({ type: 'vault' });
  addLog(s, { who: 'hero', text: '비밀의 방을 열고 무지개 알을 찾았다', xp: 0 });
}

// ── 히든 · 칭찬 카드 · 부모 퀘스트 ─────────────────────────

export function findHidden(s, id, by, note = '') {
  const h = allHidden(s).find((x) => x.id === id);
  if (!h || s.hidden[id]) return;
  s.hidden[id] = { date: dateKey(), by, note };
  s.eggsWaiting.push('gold');
  rewardWith(s, { type: 'hidden', id }, { xp: REWARD.hidden.xp, stat: h.stat, n: REWARD.hidden.n, text: `히든 퀘스트 발견: ${h.text}` });
}

/** 칭찬 카드. 부모 → 아이는 경험치·스탯, 아이 → 부모는 부모 경험치만(아이는 보상 없이 마음을 전하는 연습) */
export function givePraise(s, { from, to, stat = null, text }) {
  const card = { id: uid('pc'), from, to, stat, text, date: dateKey() };
  s.praise.unshift(card);
  if (to === 'hero') {
    rewardWith(s, { type: 'praise', id: card.id }, { xp: REWARD.praise.xp, stat, n: REWARD.praise.n, text: `칭찬 카드: ${text}` });
  } else {
    grant(s, { who: to, xp: REWARD.kidPraise.xp, text: `칭찬 카드: ${text}` });
  }
}

export function toggleParentQuest(s, monday, who, id) {
  const plan = s.parentWeeks[monday];
  const q = PARENT_QUESTS.find((x) => x.id === id);
  if (!plan || !q) return;
  const key = `${who}:${id}`;
  const text = `부모 퀘스트: ${q.text}`;
  if (plan.done[key]) {
    delete plan.done[key];
    const p = s.parents[who];
    p.xp = Math.max(0, p.xp - REWARD.parentQuest.xp);
    const at = s.log.findIndex((e) => e.who === who && e.text === text);
    if (at >= 0) s.log.splice(at, 1);
  } else {
    plan.done[key] = true;
    grant(s, { who, xp: REWARD.parentQuest.xp, text });
  }
}

// ── 알 · 펫 ──────────────────────────────────────────────

/** 알 종류별 확률로 등급을 정하고, 아직 없는 펫이 나올 확률을 3배로 */
export function rollPet(s, eggType, rand = Math.random) {
  if (eggType === 'divine') return guardianPet(s, rand);
  const { odds } = EGGS[eggType];
  const rarity = weightedPick(Object.keys(odds), (k) => odds[k], rand);
  return weightedPick(PETS.filter((p) => p.rarity === rarity), (p) => (s.pets[p.id] ? 1 : 3), rand);
}

/**
 * 디바인 알(수호 알)에서 나오는 펫: 도착한 땅 중 아직 못 만난 수호신을 앞 땅부터.
 * 행운으로 미리 만난 수호신이 있으면 다른 못 만난 수호신, 모두 만났으면 아무 수호신(친밀도 +1).
 */
function guardianPet(s, rand) {
  const reached = rankIndexOf(levelInfo(s.hero.xp).level);
  const divines = PETS.filter((p) => p.rarity === 'divine');
  const landIdx = (p) => RANKS.findIndex((r) => r.id === p.home);
  const due = divines.filter((p) => !s.pets[p.id] && landIdx(p) <= reached).sort((a, b) => landIdx(a) - landIdx(b));
  if (due.length) return due[0];
  const unmet = divines.filter((p) => !s.pets[p.id]);
  return weightedPick(unmet.length ? unmet : divines, () => 1, rand);
}

/** 새 빛깔 땅에 도착할 때마다 그 땅의 수호 알(디바인 알) 하나. 업데이트 전에 이미 지나온 땅 몫도 여기서 채운다. */
export function grantLandEggs(s) {
  const reached = rankIndexOf(levelInfo(s.hero.xp).level);
  while (s.landEggs < reached) {
    s.landEggs += 1;
    s.eggsWaiting.push('divine');
    s.celebrations.push({ type: 'divineEgg', land: RANKS[s.landEggs].id });
  }
}

export const landEggsDue = (s) => s.landEggs < rankIndexOf(levelInfo(s.hero.xp).level);

export function hatch(s, index = 0) {
  const [egg] = s.eggsWaiting.splice(index, 1);
  if (!egg) return;
  const pet = rollPet(s, egg);
  const had = s.pets[pet.id];
  s.pets[pet.id] = { count: (had?.count || 0) + 1, first: had?.first || dateKey() };
  if (!s.hero.companion) s.hero.companion = pet.id;
  else joinIfRoom(s, pet.id);
  s.celebrations.unshift({ type: 'hatch', pet: pet.id, egg, isNew: !had });
  addLog(s, { who: 'hero', text: `${EGGS[egg].name}에서 ${pet.name} 부화`, xp: 0 });
}

// ── 경험치 ───────────────────────────────────────────────

function addLog(s, entry) {
  s.log.unshift({ date: dateKey(), ...entry });
  if (s.log.length > LOG_LIMIT) s.log.length = LOG_LIMIT;
}

/** 경험치·스탯을 주고, 아이 경험치는 알도 데운다. 새로 오른 레벨마다 축하를 쌓는다. */
export function grant(s, { who = 'hero', xp = 0, stat = null, n = 0, text }) {
  const char = who === 'hero' ? s.hero : s.parents[who];
  char.xp += xp;
  if (who === 'hero') {
    if (stat) s.hero.stats[stat] += n;
    warmEgg(s, xp);
  }
  const { level } = levelInfo(char.xp);
  for (let lv = char.bestLevel + 1; lv <= level; lv += 1) s.celebrations.push({ type: 'level', who, level: lv });
  char.bestLevel = Math.max(char.bestLevel, level);
  if (who === 'hero') grantLandEggs(s);
  addLog(s, { who, text, xp, stat, n });
}

/** 축하 창(celebration)을 먼저, 그 보상으로 생긴 레벨 업 축하를 뒤에 보여 준다. */
function rewardWith(s, celebration, ...grants) {
  const at = s.celebrations.length;
  grants.forEach((g) => grant(s, g));
  s.celebrations.splice(at, 0, celebration);
}

function revoke(s, { xp = 0, stat = null, n = 0, text }) {
  s.hero.xp = Math.max(0, s.hero.xp - xp);
  if (stat) s.hero.stats[stat] = Math.max(0, s.hero.stats[stat] - n);
  s.egg.warmth = Math.max(0, s.egg.warmth - xp);
  const at = s.log.findIndex((e) => e.who === 'hero' && e.text === text && e.xp === xp);
  if (at >= 0) s.log.splice(at, 1);
}

/** 알 데우기: 다 데워지면 부화를 기다리는 알이 된다(보물 상자·하루 완료 보너스도 여기로) */
export function warmEgg(s, xp) {
  s.egg.warmth += xp;
  while (s.egg.warmth >= s.egg.need) {
    s.egg.warmth -= s.egg.need;
    s.egg.laid += 1;
    s.egg.need = eggNeed(s.egg.laid);
    s.eggsWaiting.push('normal');
  }
}

// ── 계획 만들기 · 시작 ────────────────────────────────────

export function needsPlan(s, today = dateKey()) {
  const monday = weekKey(today);
  return !s.days[today] || !s.weeks[monday] || !s.parentWeeks[monday] || landEggsDue(s) || !s.bank.lastInterest || s.bank.lastInterest < monday;
}

function planParents(s, monday) {
  const rand = seededRandom(`${s.seed}:parents:${monday}`);
  const plan = { done: {} };
  PARENT_IDS.forEach((who) => {
    const chosen = [];
    for (let i = 0; i < PARENT_QUESTS_PER_WEEK; i += 1) {
      const q = weightedPick(PARENT_QUESTS.filter((x) => !chosen.includes(x.id)), (x) => freshness(s, `${who}:${x.id}`, monday, 7), rand);
      if (q) chosen.push(q.id);
    }
    chosen.forEach((id) => {
      s.lastSeen[`${who}:${id}`] = monday;
    });
    plan[who] = chosen;
  });
  return plan;
}

function prune(s, today) {
  const oldDay = addDays(today, -KEEP_DAYS);
  const oldWeek = addDays(today, -7 * 12);
  const oldSeen = addDays(today, -120);
  Object.keys(s.days).forEach((k) => {
    if (k < oldDay) delete s.days[k];
  });
  ['weeks', 'parentWeeks'].forEach((key) => Object.keys(s[key]).forEach((k) => {
    if (k < oldWeek) delete s[key][k];
  }));
  Object.keys(s.lastSeen).forEach((k) => {
    if (s.lastSeen[k] < oldSeen) delete s.lastSeen[k];
  });
}

/** 오늘·이번 주 계획이 없으면 만든다(날짜가 바뀌면 앱이 알아서 부른다). */
export function ensurePlans(s, today = dateKey()) {
  const monday = weekKey(today);
  if (!s.weeks[monday]) {
    s.weeks[monday] = { missions: fillWeek(s, monday, [], seededRandom(`${s.seed}:week:${monday}`)), status: {}, vault: false };
  }
  if (!s.parentWeeks[monday]) s.parentWeeks[monday] = planParents(s, monday);
  if (!s.days[today]) s.days[today] = planDay(s, today);
  grantLandEggs(s);
  applyInterest(s, monday);
  prune(s, today);
}

export function startAdventure(s, { name, avatar, strengths, pin, dad, mom }) {
  s.setupDone = true;
  s.createdAt = dateKey();
  s.hero.name = name;
  s.hero.avatar = avatar;
  strengths.forEach((id) => {
    s.hero.stats[id] += STRENGTH_BONUS;
  });
  s.pin = pin;
  s.parents.dad.name = dad || '아빠';
  s.parents.mom.name = mom || '엄마';
  s.eggsWaiting.push('normal'); // 첫 알은 바로 부화시켜 볼 수 있게
  s.celebrations.push({ type: 'intro' });
  ensurePlans(s);
}
