// 퀘스트: 오늘(매일 하는 일·오늘의 퀘스트·오늘의 도전) / 이번 주(미션 4개·열쇠·비밀의 방) / 히든.

import { store } from '../state.js';
import { esc, dateKey, weekKey, formatDate, toast, josa, shortDate } from '../core/util.js';
import {
  routinesOn, dayItem, dayProgress, completeDay, undoDay, pickChallenge,
  missionsOf, keysOf, keysNeeded, vaultReady, routineCount, requestMission, cancelMission, openVault, allHidden,
} from '../core/game.js';
import { REWARD } from '../data/quests.js';
import { getStat } from '../data/stats.js';
import { PARENT_IDS } from '../data/parents.js';
import { questRow, segTabs, keySlots, bar, empty, parentName, statTag } from '../ui/components.js';

export const title = () => '퀘스트';

const TABS = [['today', '☀️ 오늘', '#/quests/today'], ['week', '🗝️ 이번 주', '#/quests/week'], ['hidden', '❓ 히든', '#/quests/hidden']];

export function render(route) {
  const tab = TABS.some(([key]) => key === route.args[0]) ? route.args[0] : 'today';
  const s = store.get();
  return segTabs(TABS, tab) + { today, week, hidden }[tab](s);
}

// ── 오늘 ──

function today(s) {
  const date = dateKey();
  const day = s.days[date];
  const prog = dayProgress(s, date);

  const row = (id) => {
    const item = dayItem(s, id);
    if (!item) return '';
    const r = REWARD[item.type];
    const done = !!day.done[id];
    return questRow({
      icon: item.icon, text: item.text, stat: item.stat, xp: r.xp, n: r.n, state: done ? 'done' : 'todo',
      right: done
        ? `<button class="btn ghost small" data-action="day-undo" data-id="${id}">되돌리기</button>`
        : `<button class="btn" data-action="day-done" data-id="${id}">완료!</button>`,
    });
  };

  const choices = day.challenges.map((id) => dayItem(s, id)).filter(Boolean);
  let challengeHtml;
  if (day.picked) {
    const others = choices.filter((c) => c.id !== day.picked);
    challengeHtml = row(day.picked) + (!day.done[day.picked] && others.length
      ? `<div class="swap"><small class="muted">다른 도전으로 바꾸기:</small>${others.map((c) =>
        `<button class="chip" data-action="challenge-pick" data-id="${c.id}">${esc(c.text)}</button>`).join('')}</div>`
      : '');
  } else {
    challengeHtml = choices.length ? `<div class="choices">${choices.map((c) => {
      const st = getStat(c.stat);
      return `<button class="choice" data-action="challenge-pick" data-id="${c.id}" style="--c:${st.color}">
        <span class="choice-icon">${st.icon}</span><b>${esc(c.text)}</b>
        <small>+${REWARD.challenge.xp} XP · ${st.name} +${REWARD.challenge.n}</small></button>`;
    }).join('')}</div>` : empty('오늘은 도전이 없어요.');
  }

  const routines = routinesOn(s, date);
  return `
    <div class="day-head"><h2>${formatDate(date)}</h2><span class="pill">${prog.done}/${prog.total} 완료</span></div>
    ${prog.total && prog.done === prog.total ? '<div class="notice good">🎉 오늘 퀘스트를 모두 해냈어요! 내일 또 만나요.</div>' : ''}
    ${routines.length ? `<h3 class="section-title">매일 하는 일</h3>${routines.map((r) => row(r.id)).join('')}` : ''}
    <h3 class="section-title">오늘의 퀘스트</h3>
    ${day.quests.map(row).join('') || empty('오늘은 쉬는 날!')}
    <h3 class="section-title">오늘의 도전 ${day.picked ? '' : '<small class="muted">— 하고 싶은 걸 하나 골라요</small>'}</h3>
    ${challengeHtml}`;
}

// ── 이번 주 ──

const TYPE_LABEL = { story: '📖 이야기', coop: '🤝 함께', weekly: '⭐ 주간', streak: '🔁 꾸준함', lesson: '🎓 학원' };

function week(s) {
  const monday = weekKey();
  const wk = s.weeks[monday];
  const missions = missionsOf(s, wk);
  const keys = keysOf(wk);
  const need = keysNeeded(s, wk);

  let vault;
  if (wk.vault) vault = '<p>🚪 이번 주 비밀의 방을 열었어요! 다음 주 월요일에 새 미션이 와요.</p>';
  else if (vaultReady(s, wk)) vault = '<button class="btn big glow" data-action="vault-open">🚪 비밀의 방 열기!</button>';
  else vault = `<p>미션을 해내면 열쇠를 받아요. 열쇠 ${need}개를 모으면 <b>비밀의 방</b>이 열려요.</p>`;

  const rows = missions.map((m) => {
    const st = wk.status[m.id];
    const state = st?.state || 'todo';
    const withName = st?.with ? parentName(s, st.with) : '';
    let right = '';
    let extra = '';
    if (state === 'done') {
      right = '<span class="got-key">🗝️</span>';
    } else if (state === 'pending') {
      right = `<small class="wait">⏳ 확인 기다리는 중</small><button class="btn ghost small" data-action="mission-cancel" data-id="${m.id}">취소</button>`;
    } else if (m.type === 'story') {
      right = `<button class="btn" data-action="story-open" data-id="${m.id}" data-monday="${monday}">이야기 읽기</button>`;
    } else if (m.type === 'coop') {
      right = PARENT_IDS.map((who) => {
        const name = s.parents[who].name;
        return `<button class="btn small" data-action="mission-request" data-id="${m.id}" data-who="${who}">${esc(name)}${josa(name, '과', '와')} 했어요</button>`;
      }).join('');
    } else if (m.type === 'streak') {
      const count = routineCount(s, m.routineId, monday);
      right = `<b class="count">${count}/${m.need}일</b>`;
      extra = bar(count / m.need);
    } else {
      right = `<button class="btn" data-action="mission-request" data-id="${m.id}">다 했어요!</button>`;
    }
    const note = `<span class="tag kind">${TYPE_LABEL[m.type]}</span>${withName ? `<span class="tag">${esc(withName)}${josa(withName, '과', '와')} 함께</span>` : ''}`;
    const r = REWARD[m.type === 'coop' || m.type === 'story' ? m.type : 'weekly'];
    return questRow({ icon: m.icon, text: m.text, stat: m.stat, xp: r.xp, n: r.n, state, note, right, extra });
  }).join('');

  return `
    <section class="card vault">${keySlots(keys, need)}${vault}</section>
    ${rows || empty('이번 주 미션이 없어요.')}
    <p class="muted small">함께하는 미션과 이야기 퀘스트는 같이 한 아빠·엄마도 경험치를 받아요. 미션은 매주 월요일에 바뀌어요.</p>`;
}

// ── 히든 ──

function hidden(s) {
  const list = allHidden(s);
  const foundCount = list.filter((h) => s.hidden[h.id]).length;
  return `
    <div class="notice">히든 퀘스트는 무엇을 하면 열리는지 비밀이에요. 힌트를 보고 좋은 일을 하면 아빠·엄마가 발견해서 열어 줘요. 열면 🥚 <b>황금 알</b>을 받아요!</div>
    <p class="count-line">발견 <b>${foundCount}</b> / ${list.length}</p>
    <div class="hidden-grid">${list.map((h) => {
      const found = s.hidden[h.id];
      if (!found) return `<div class="hcard"><span class="hq">❓</span><b>???</b><small>힌트: ${esc(h.hint)}</small></div>`;
      return `<div class="hcard found" style="--c:${getStat(h.stat).color}"><span class="hq">✨</span><b>${esc(h.text)}</b>
        <small>${shortDate(found.date)} · ${esc(parentName(s, found.by))} 발견</small>${statTag(h.stat)}</div>`;
    }).join('')}</div>`;
}

export const actions = {
  'day-done': (el) => {
    const reward = store.update((s) => completeDay(s, el.dataset.id));
    if (reward) {
      const st = getStat(reward.stat);
      toast(`+${reward.xp} XP · ${st.icon} ${st.name} +${reward.n}`);
    }
  },
  'day-undo': (el) => store.update((s) => undoDay(s, el.dataset.id)),
  'challenge-pick': (el) => store.update((s) => pickChallenge(s, el.dataset.id)),
  'mission-request': (el) => {
    store.update((s) => requestMission(s, weekKey(), el.dataset.id, el.dataset.who || null));
    toast('아빠·엄마가 확인하면 열쇠를 받아요!');
  },
  'mission-cancel': (el) => store.update((s) => cancelMission(s, weekKey(), el.dataset.id)),
  'vault-open': () => store.update((s) => openVault(s)),
};
