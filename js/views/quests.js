// 퀘스트: 오늘(매일 하는 일·오늘의 퀘스트·오늘의 도전) / 이번 주(미션 4개·열쇠·비밀의 방) / 히든 / 보스(습관 몬스터).

import { store } from '../state.js';
import { esc, dateKey, weekKey, formatDate, toast, josa, shortDate } from '../core/util.js';
import {
  routinesOn, dayItem, dayProgress, completeDay, undoDay, pickChallenge, rewardFor,
  missionsOf, keysOf, keysNeeded, vaultReady, routineCount, requestMission, cancelMission, openVault, allHidden,
} from '../core/game.js';
import { coachFor } from '../core/pets.js';
import { bossLeft, bossLine, requestHit } from '../core/boss.js';
import { BOSS_PENDING_MAX } from '../data/bosses.js';
import { getStat } from '../data/stats.js';
import { PARENT_IDS } from '../data/parents.js';
import { questRow, segTabs, keySlots, bar, empty, parentName, statTag, bossImage } from '../ui/components.js';

export const title = () => '퀘스트';

const TABS = [['today', '☀️ 오늘', '#/quests/today'], ['week', '🗝️ 이번 주', '#/quests/week'], ['hidden', '❓ 히든', '#/quests/hidden'], ['boss', '👾 보스', '#/quests/boss']];

export function render(route) {
  const tab = TABS.some(([key]) => key === route.args[0]) ? route.args[0] : 'today';
  const s = store.get();
  return segTabs(TABS, tab) + { today, week, hidden, boss }[tab](s);
}

// ── 오늘 ──

function today(s) {
  const date = dateKey();
  const day = s.days[date];
  const prog = dayProgress(s, date);

  const row = (id) => {
    const item = dayItem(s, id);
    if (!item) return '';
    const r = rewardFor(item);
    const done = !!day.done[id];
    const coach = done ? null : coachFor(s, item.stat, `${date}:${id}`);
    return questRow({
      icon: item.icon, text: item.text, stat: item.stat, xp: r.xp, n: r.n, state: done ? 'done' : 'todo',
      extra: coach ? `<div class="coach"><span>${coach.pet.emoji}</span><span><b>${esc(coach.pet.name)} 코치</b> ${esc(coach.tip)}</span></div>` : '',
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
      const r = rewardFor(c);
      return `<button class="choice" data-action="challenge-pick" data-id="${c.id}" style="--c:${st.color}">
        <span class="choice-icon">${st.icon}</span><b>${esc(c.text)}</b>
        <small>+${r.xp} XP · ${st.name} +${r.n}</small></button>`;
    }).join('')}</div>` : empty('오늘은 도전이 없어요.');
  }

  const routines = routinesOn(s, date);
  return `
    <div class="day-head"><h2>${formatDate(date)}</h2><span class="pill">${prog.done}/${prog.total} 완료</span></div>
    ${s.boss ? bossBanner(s.boss) : ''}
    ${prog.total && prog.done === prog.total
      ? '<div class="notice good">🎉 오늘 퀘스트를 모두 해냈어요! 밤하늘에 별이 하나 켜졌어요 ⭐ 내일 또 만나요.</div>'
      : '<p class="muted small">⭐ 오늘 퀘스트를 모두 하면 밤하늘에 별이 하나 켜지고, 함께 다니는 펫이 춤을 춰요.</p>'}
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
    const r = rewardFor(m);
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

// ── 보스 ──

function bossBanner(b) {
  const left = bossLeft(b);
  return `<a class="card boss-banner" href="#/quests/boss">
    ${bossImage(b, { gray: left / b.hp, cls: 'mini' })}
    <div><b>👾 ${esc(b.name)}</b><small>회색 껍질 ${left}칸 남음 · 이기는 행동: ${esc(b.actions[0] || '')}</small>${bar(1 - left / b.hp, '#9775fa')}</div>
  </a>`;
}

function friendList(s) {
  if (!s.bossFriends.length) return '';
  return `<h3 class="section-title">🌈 친구가 된 보스 <small class="muted">${s.bossFriends.length}</small></h3>
    <div class="boss-friends">${s.bossFriends.map((f) => `<div class="boss-friend">
      ${bossImage(f, { cls: 'small' })}<b>${esc(f.name)}</b><small>${esc(f.habit)} · ${shortDate(f.befriended)}</small></div>`).join('')}</div>`;
}

function boss(s) {
  const b = s.boss;
  if (!b) {
    return `<div class="notice">아직 보스가 없어요. 아빠·엄마와 함께 고치고 싶은 습관을 하나 정하면, 그 습관이 몬스터가 되어 나타나요!
      몬스터는 나쁜 애가 아니라 회색 그림자 때문에 습관에 갇힌 친구예요.</div>${friendList(s)}`;
  }
  const left = bossLeft(b);
  const full = b.pending.length >= BOSS_PENDING_MAX;
  return `<section class="card boss-card">
      <p class="kicker">👾 보스전 · ${esc(b.habit)}</p>
      ${bossImage(b, { gray: left / b.hp })}
      <h2>${esc(b.name)}</h2>
      <div class="boss-say">"${esc(bossLine(b))}"</div>
      <div class="boss-hp">${bar(1 - left / b.hp, '#9775fa')}<small>회색 껍질 <b>${left}칸</b> 남았어요 (${b.hits.length}/${b.hp} 벗겨짐)</small></div>
      <h4>⚔️ 이기는 행동</h4>
      ${b.actions.map((a) => `<div class="boss-action"><span>${esc(a)}</span>
        <button class="btn small" data-action="boss-request" data-text="${esc(a)}" ${full ? 'disabled' : ''}>이겼어요!</button></div>`).join('')}
      ${b.pending.length ? `<p class="wait">⏳ 아빠·엄마 확인을 기다리는 한 방 ${b.pending.length}개</p>` : ''}
      <p class="muted small">이기는 행동을 하고 "이겼어요!"를 누르면, 아빠·엄마가 확인할 때 회색 껍질이 한 칸 벗겨져요.
        아빠·엄마가 보고 먼저 눌러 주기도 해요. 오늘 졌어도 괜찮아요 — 몬스터는 다시 세지지 않아요.</p>
    </section>
    ${b.hits.length ? `<h3 class="section-title">지금까지의 한 방</h3>
      <ul class="check-list">${b.hits.slice().reverse().slice(0, 10).map((h) => `<li class="done"><span>⚔️</span>
        <span>${esc(h.action || '한 방')}${h.note ? ` — "${esc(h.note)}"` : ''}</span><small>${shortDate(h.date)} · ${esc(parentName(s, h.by))}</small></li>`).join('')}</ul>` : ''}
    ${friendList(s)}`;
}

export const actions = {
  'boss-request': (el) => {
    const ok = store.update((s) => requestHit(s, el.dataset.text));
    toast(ok ? '멋져요! 아빠·엄마가 확인하면 회색 껍질이 벗겨져요.' : '확인을 기다리는 한 방이 많아요. 아빠·엄마에게 먼저 보여 주세요.');
  },
  'day-done': (el) => {
    const reward = store.update((s) => completeDay(s, el.dataset.id));
    if (reward) {
      const st = getStat(reward.stat);
      toast(`+${reward.xp} XP · ${st.icon} ${st.name} +${reward.n}${reward.orbs ? ` · 🔮 +${reward.orbs}` : ''}`);
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
