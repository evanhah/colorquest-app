// 보스전 규칙: 시작·한 방(아이 요청 → 부모 확인, 또는 부모가 바로)·친구 되기·되돌리기·그만두기.
// 상태: s.boss(지금 보스 하나 또는 null), s.bossFriends(친구가 된 보스들). 데이터와 원칙은 data/bosses.js.

import {
  BOSS_HP_DEFAULT, BOSS_PENDING_MAX, BOSS_HIT, BOSS_FRIEND, BOSS_GENERIC, getBossTemplate,
} from '../data/bosses.js';
import { grant, revoke } from './game.js';
import { dateKey, uid } from './util.js';

export const bossLeft = (b) => Math.max(0, b.hp - b.hits.length);

/** 몬스터가 지금 하는 말: 껍질이 많이 남았을 때 → 절반쯤 → 거의 다 벗겨졌을 때 */
export function bossLine(b) {
  const lines = getBossTemplate(b.template)?.lines || BOSS_GENERIC.lines;
  const ratio = bossLeft(b) / b.hp;
  return lines[ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2];
}

export const bossIntro = (b) => getBossTemplate(b.template)?.intro || BOSS_GENERIC.intro(b.habit);

/** 습관 템플릿으로 보스전 시작 ('custom' 이면 빈 몬스터를 만들고 부모가 이름·행동을 적는다) */
export function startBoss(s, templateId) {
  const t = getBossTemplate(templateId);
  s.boss = {
    id: uid('b'),
    template: t?.id || 'custom',
    habit: t?.habit || '고치고 싶은 습관',
    name: t?.name || '이름 없는 몬스터',
    emoji: t?.emoji || '👾',
    stat: t?.stat || 'self',
    actions: t ? t.actions.slice(0, 2) : ['이기는 행동을 적어 주세요'],
    photo: null,          // 아이가 그린 몬스터 사진 (작게 줄인 JPEG data URL)
    hp: BOSS_HP_DEFAULT,
    hits: [],             // { date, by, note, action }
    pending: [],          // 아이가 "이겼어요!" 누른 것 { id, date, action }
    started: dateKey(),
  };
  s.celebrations.push({ type: 'bossStart' });
}

/** 아이가 이기는 행동을 했다고 알린다 → 부모 확인을 기다림 */
export function requestHit(s, action) {
  const b = s.boss;
  if (!b || b.pending.length >= BOSS_PENDING_MAX) return false;
  b.pending.push({ id: uid('p'), date: dateKey(), action });
  return true;
}

export function dropRequest(s, id) {
  if (s.boss) s.boss.pending = s.boss.pending.filter((p) => p.id !== id);
}

/** 한 방: 회색 껍질 한 칸 + 경험치. 껍질이 다 벗겨지면 친구가 된다. pendingId 가 있으면 그 요청을 확인한 것. */
export function confirmHit(s, { pendingId = null, action = '', by = 'dad', note = '' }) {
  const b = s.boss;
  if (!b) return;
  if (pendingId) {
    const req = b.pending.find((p) => p.id === pendingId);
    if (!req) return;
    action = req.action;
    b.pending = b.pending.filter((p) => p.id !== pendingId);
  }
  b.hits.push({ date: dateKey(), by, note, action });
  const at = s.celebrations.length;
  grant(s, { xp: BOSS_HIT.xp, stat: b.stat, n: BOSS_HIT.n, text: `보스전 한 방: ${action || b.name}` });
  if (bossLeft(b) === 0) {
    befriend(s);
    return;
  }
  // 아이가 아직 못 본 한 방이 있으면 창 하나로 합친다("한 방 ×3!")
  const queued = s.celebrations.find((c) => c.type === 'bossHit');
  if (queued) {
    queued.count = (queued.count || 1) + 1;
    queued.action = action;
    if (note) Object.assign(queued, { note, by });
  } else {
    s.celebrations.splice(at, 0, { type: 'bossHit', by, note, action, count: 1 });
  }
}

function befriend(s) {
  const b = s.boss;
  s.bossFriends.push({
    name: b.name, emoji: b.emoji, photo: b.photo, habit: b.habit, actions: b.actions, stat: b.stat,
    started: b.started, befriended: dateKey(), hits: b.hits.length,
    line: getBossTemplate(b.template)?.friend || BOSS_GENERIC.friend,
    routineAdded: false,  // 이기는 행동을 '매일 하는 일'로 이어 갔는지 (부모 모드 제안)
  });
  s.celebrations = s.celebrations.filter((c) => c.type !== 'bossHit'); // 친구가 되는 창이 대신한다
  const at = s.celebrations.length;
  grant(s, { xp: BOSS_FRIEND.xp, stat: b.stat, n: BOSS_FRIEND.n, text: `보스전: ${b.name}와 친구가 됐다` });
  s.eggsWaiting.push('gold');
  s.celebrations.splice(at, 0, { type: 'bossFriend', index: s.bossFriends.length - 1 });
  s.boss = null;
}

/** 부모가 실수로 준 마지막 한 방 되돌리기 */
export function undoHit(s) {
  const b = s.boss;
  const hit = b?.hits.pop();
  if (!hit) return;
  revoke(s, { xp: BOSS_HIT.xp, stat: b.stat, n: BOSS_HIT.n, text: `보스전 한 방: ${hit.action || b.name}` });
  // 아이가 아직 못 본 그 한 방의 축하 창도 거둔다
  const queued = s.celebrations.find((c) => c.type === 'bossHit');
  if (queued?.count > 1) queued.count -= 1;
  else if (queued) s.celebrations.splice(s.celebrations.indexOf(queued), 1);
}

/** 보스전 쉬기 — 벌은 없다. 나중에 다시 시작하면 처음부터. */
export function stopBoss(s) {
  s.boss = null;
}
