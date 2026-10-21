// 부모 모드(비밀번호 4자리): 주간 미션 확인, 칭찬 카드, 히든 퀘스트 발견, 중점 가치·퀘스트, 매일 하는 일, 설정·백업.
// 주소: #/parent · #/parent/praise · #/parent/hidden · #/parent/values · #/parent/routines · #/parent/settings
// 부모 화면을 떠나면 다시 잠긴다(app.js). 부모 화면에서는 축하 창을 띄우지 않고, 아이가 볼 때 보여 준다.

import { store, ui, backupText, toggleIn } from '../state.js';
import { esc, dateKey, weekKey, formatDate, daysBetween, toast, confirmTap, copyText, uid, josa, WEEKDAYS } from '../core/util.js';
import {
  missionsOf, finishMission, cancelMission, givePraise, allHidden, findHidden,
  questList, valueOf, valueShares, rerollDay, rerollWeek, statGainFor, addToToday,
} from '../core/game.js';
import { STATS, EPITHET_ORDER, getStat } from '../data/stats.js';
import { PRIORITY } from '../data/values.js';
import { KIND_LABEL, REWARD } from '../data/quests.js';
import { HIDDEN } from '../data/hidden.js';
import { HERO_AVATARS } from '../data/titles.js';
import { PARENT_IDS, PARENT_AVATARS } from '../data/parents.js';
import { questRow, praiseCard, statTag, empty, parentName, restoreConfirm } from '../ui/components.js';
import { prepareRestore } from '../ui/actions.js';

const back = '<a class="back" href="#/parent">← 부모 모드</a>';

/** 고르기 칩. 고른 값은 ui.drafts[key] 에 기억한다(기본 data-action="pick-draft"). */
function chips(items, key, fallback, action = 'pick-draft') {
  const current = ui.drafts[key] ?? fallback;
  return `<div class="chips">${items.map(([value, label]) =>
    `<button class="chip ${current === value ? 'on' : ''}" data-action="${action}" data-key="${key}" data-value="${value}">${label}</button>`).join('')}</div>`;
}
const whoChips = (s, key) => chips(PARENT_IDS.map((who) => [who, `${esc(s.parents[who].avatar)} ${esc(s.parents[who].name)}`]), key, 'dad');
const statChips = (key, fallback) => chips(STATS.map((st) => [st.id, `${st.icon} ${st.name}`]), key, fallback);
const withName = (name) => `${esc(name)}${josa(name, '과', '와')}`;

// ── 비밀번호 ──

function pinGate() {
  return `<div class="pin-gate">
    <div class="lock">🔒</div>
    <h2>부모 모드</h2>
    <p class="muted">아빠·엄마만 들어갈 수 있어요. 비밀번호 4자리를 눌러 주세요.</p>
    <div class="pin-dots ${ui.pinError ? 'shake' : ''}">${[0, 1, 2, 3].map((i) => `<span class="${ui.pin.length > i ? 'on' : ''}"></span>`).join('')}</div>
    <div class="pin-pad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) =>
      (k ? `<button data-action="pin-key" data-key="${k}" aria-label="${k === '⌫' ? '지우기' : k}">${k}</button>` : '<span></span>')).join('')}</div>
    <a class="muted small" href="#/me">돌아가기</a>
  </div>`;
}

// ── 첫 화면: 이번 주 미션 확인 + 메뉴 ──

const MENU = [
  ['praise', '💌', '칭찬 카드 쓰기', () => '본 것 + 누가 어떤 기분이었는지'],
  ['make', '✏️', '퀘스트 만들기', () => '경험치·능력치를 직접 정해서 만들어요'],
  ['hidden', '✨', '히든 퀘스트 발견', (s) => `발견 ${allHidden(s).filter((h) => s.hidden[h.id]).length}/${allHidden(s).length}`],
  ['values', '🎯', '중점 가치·퀘스트', () => '중요한 가치일수록 자주 나와요'],
  ['routines', '📅', '매일 하는 일', (s) => s.routines.filter((r) => r.on).map((r) => r.text.replace(/하기$/, '')).join(' · ') || '없음'],
  ['settings', '⚙️', '설정·백업', () => '이름·레벨 해금·비밀번호·백업'],
];

function approveRow(s, wk, m) {
  const st = wk.status[m.id];
  const partner = st?.with;
  const needsPartner = (m.type === 'coop' || m.type === 'story') && !partner;
  const right = (needsPartner
    ? PARENT_IDS.map((who) => `<button class="btn small" data-action="approve" data-id="${m.id}" data-who="${who}">${withName(s.parents[who].name)} 완료</button>`).join('')
    : `<button class="btn small" data-action="approve" data-id="${m.id}">완료 확인</button>`)
    + (st?.state === 'pending' ? `<button class="btn ghost small" data-action="approve-not-yet" data-id="${m.id}">아직이에요</button>` : '');
  const note = partner ? `<span class="tag">${withName(parentName(s, partner))} 함께</span>` : '';
  return questRow({ icon: m.icon, text: m.text, stat: m.stat, state: st?.state === 'pending' ? 'pending' : 'todo', note, right });
}

function home(s) {
  const wk = s.weeks[weekKey()];
  const missions = missionsOf(s, wk);
  const waiting = missions.filter((m) => wk.status[m.id]?.state === 'pending');
  const open = missions.filter((m) => !wk.status[m.id] && m.type !== 'streak');
  const auto = missions.filter((m) => m.type === 'streak' && !wk.status[m.id]);
  const doneCount = missions.filter((m) => wk.status[m.id]?.state === 'done').length;
  const backupAge = s.lastBackup ? daysBetween(s.lastBackup, dateKey()) : null;

  return `
    <div class="spread"><h2>부모 모드</h2><button class="btn ghost small" data-action="parent-lock">🔒 잠그기</button></div>
    ${backupAge === null || backupAge > 30 ? `<a class="notice warn block" href="#/parent/settings">💾 ${backupAge === null ? '아직 백업한 적이 없어요' : `마지막 백업이 ${backupAge}일 전이에요`}. 설정·백업에서 파일로 저장해 두세요.</a>` : ''}

    <section class="card">
      <h3>이번 주 미션 확인 <small class="muted">완료 ${doneCount}/${missions.length}</small></h3>
      ${waiting.length ? `<p class="muted small">아이가 '다 했어요'를 누른 미션이에요.</p>${waiting.map((m) => approveRow(s, wk, m)).join('')}` : '<p class="muted">확인을 기다리는 미션이 없어요.</p>'}
      ${open.length ? `<details><summary>아직 안 누른 미션 ${open.length}개 — 직접 완료 처리</summary>${open.map((m) => approveRow(s, wk, m)).join('')}</details>` : ''}
      ${auto.map((m) => `<p class="muted small">🔁 ${esc(m.text)} — 매일 하는 일을 체크하면 자동으로 완료돼요.</p>`).join('')}
    </section>

    <div class="menu-grid">${MENU.map(([key, icon, label, desc]) =>
      `<a class="tile" href="#/parent/${key}"><span>${icon}</span><b>${label}</b><small>${esc(desc(s))}</small></a>`).join('')}</div>

    <section class="card guide">
      <h3>이렇게 써 주세요</h3>
      <ul>
        <li><b>매일 퀘스트는 아이가 스스로 체크</b>해요. 믿고 맡기는 것도 정직을 키우는 방법이에요.</li>
        <li><b>착한 행동은 '발견'해 주세요.</b> 칭찬 카드와 히든 퀘스트로 알아봐 주면, 점수 때문에 착한 척하는 대신 "누군가 알아봐 준다"는 경험이 돼요.</li>
        <li><b>점수를 깎는 기능은 없어요.</b> 잘못을 먼저 털어놓으면 히든 퀘스트 '잘못한 일을 먼저 털어놓기'를 열어 주세요.</li>
        <li><b>게임을 벌로 쓰지 말아 주세요.</b> "그러면 레벨 안 올려 준다" 같은 말은 하지 않기로 해요.</li>
        <li>이야기 퀘스트는 정답 맞히기가 아니에요. "왜 그렇게 생각해?"를 물어봐 주세요.</li>
      </ul>
    </section>`;
}

// ── 칭찬 카드 ──

function praise(s) {
  const sent = s.praise.filter((c) => c.to === 'hero').slice(0, 10);
  const fromKid = s.praise.filter((c) => c.from === 'hero').slice(0, 10);
  return `${back}
    <h2>💌 칭찬 카드 쓰기</h2>
    <div class="notice">무엇을 봤는지 + 그 행동 덕분에 <b>누가 어떤 기분</b>이었는지 적어 주세요.
      예의·마음·자립 카드에는 "너는 ○○ 사람이야"라는 말이, 체력·지혜·창의 카드에는 노력을 알아주는 말이 함께 나가요.</div>
    <section class="card form">
      <label>누가 쓰나요?</label>${whoChips(s, 'praiseFrom')}
      <label>어떤 힘이 자랐나요?</label>${statChips('praiseStat', 'heart')}
      <label>칭찬</label>
      <textarea data-input="draft" data-key="praise" rows="4" placeholder="예) 할머니 짐을 먼저 들어 드렸지? 할머니가 정말 든든하셨대.">${esc(ui.drafts.praise || '')}</textarea>
      <button class="btn big" data-action="praise-send">칭찬 카드 보내기 (+${REWARD.praise.xp} XP, 스탯 +${REWARD.praise.n})</button>
    </section>
    <h3 class="section-title">보낸 카드</h3>
    ${sent.length ? sent.map((c) => praiseCard(s, c)).join('') : empty('아직 보낸 카드가 없어요.')}
    <h3 class="section-title">아이가 보낸 카드</h3>
    ${fromKid.length ? fromKid.map((c) => praiseCard(s, c)).join('') : empty('아직 받은 카드가 없어요.')}`;
}

// ── 히든 퀘스트 ──

function hidden(s) {
  const list = allHidden(s);
  const unfound = list.filter((h) => !s.hidden[h.id]);
  const found = list.filter((h) => s.hidden[h.id]);
  const isCustom = (id) => !HIDDEN.some((h) => h.id === id);
  return `${back}
    <h2>✨ 히든 퀘스트 발견</h2>
    <div class="notice">아이가 이 행동을 하는 걸 보면 '발견!'을 눌러 주세요. 한마디를 남기면 아이 화면에 함께 보여요.
      발견하면 +${REWARD.hidden.xp} XP, 스탯 +${REWARD.hidden.n}, 황금 알을 받아요. 아이에게는 힌트만 보여요.</div>
    <label>누가 발견했나요?</label>${whoChips(s, 'hiddenBy')}
    <div class="list">${unfound.map((h) => {
      const open = ui.drafts.hiddenOpen === h.id;
      return `<div class="hrow ${open ? 'open' : ''}">
        <div class="hrow-main"><b>${esc(h.text)}</b><small class="muted">힌트: ${esc(h.hint)}</small>${statTag(h.stat)}</div>
        ${open
          ? `<div class="hrow-form"><input data-input="draft" data-key="hiddenNote" placeholder="아이에게 한마디 (선택)" value="${esc(ui.drafts.hiddenNote || '')}">
              <button class="btn small" data-action="hidden-find" data-id="${h.id}">발견!</button>
              <button class="btn ghost small" data-action="hidden-cancel">취소</button></div>`
          : `<div class="row"><button class="btn small" data-action="hidden-open" data-id="${h.id}">발견!</button>
              ${isCustom(h.id) ? `<button class="btn ghost small" data-action="hidden-delete" data-id="${h.id}">지우기</button>` : ''}</div>`}
      </div>`;
    }).join('') || empty('모든 히든 퀘스트를 발견했어요! 아래에서 새로 더해 보세요.')}</div>

    <details class="card form">
      <summary>히든 퀘스트 더하기</summary>
      <label>행동 (부모만 봐요)</label><input data-input="draft" data-key="newHiddenText" placeholder="예: 시키지 않았는데 강아지 물 챙겨 주기" value="${esc(ui.drafts.newHiddenText || '')}">
      <label>힌트 (아이에게 보여요)</label><input data-input="draft" data-key="newHiddenHint" placeholder="예: 목마른 친구를 떠올리면…" value="${esc(ui.drafts.newHiddenHint || '')}">
      <label>스탯</label>${statChips('newHiddenStat', 'heart')}
      <button class="btn" data-action="hidden-add">더하기</button>
    </details>

    <h3 class="section-title">발견한 퀘스트 ${found.length}개</h3>
    ${found.map((h) => {
      const f = s.hidden[h.id];
      return `<div class="hrow done"><div class="hrow-main"><b>✨ ${esc(h.text)}</b>
        <small class="muted">${formatDate(f.date)} · ${esc(parentName(s, f.by))}${f.note ? ` · "${esc(f.note)}"` : ''}</small></div></div>`;
    }).join('') || empty('아직 발견한 퀘스트가 없어요.')}`;
}

// ── 중점 가치·퀘스트 ──

const KIND_OPTIONS = [['daily', '매일 퀘스트'], ['challenge', '오늘의 도전'], ['weekly', '주간 미션'], ['coop', '함께하는 주간 미션']];

function valueRow(s, v, shares) {
  const quests = questList(s).filter((q) => q.value === v.id);
  const active = quests.filter((q) => !q.off);
  const open = ui.drafts.valueOpen === v.id;
  const pct = Math.round((shares[v.id] || 0) * 100);
  const noDaily = v.priority > 0 && !active.some((q) => q.kind === 'daily');
  return `<div class="value-row card ${v.priority ? '' : 'resting'}">
    <div class="value-head">
      <div><b>${esc(v.name)}</b><small class="muted">${v.priority ? `매일 퀘스트의 약 ${pct}%` : '쉬는 중'} · 퀘스트 ${active.length}개</small></div>
      <div class="prio">${PRIORITY.map((p) => `<button class="${v.priority === p.level ? 'on' : ''}" data-action="value-priority" data-id="${v.id}" data-level="${p.level}">${p.name}</button>`).join('')}</div>
    </div>
    ${noDaily ? '<p class="warn-text">매일 퀘스트가 없어서 오늘의 퀘스트에는 나오지 않아요. 아래에서 더해 주세요.</p>' : ''}
    <button class="link" data-action="value-open" data-id="${v.id}">${open ? '접기 ▲' : '퀘스트 보기·더하기 ▼'}</button>
    ${open ? `<div class="value-quests">
      ${quests.map((q) => `<div class="qrow ${q.off ? 'off' : ''}">
        <span class="tag kind">${KIND_LABEL[q.coop ? 'coop' : q.kind]}</span><span class="qtext">${esc(q.text)}</span>${q.xp ? `<span class="tag xp">+${q.xp}</span>` : ''}
        ${q.builtIn
          ? `<button class="btn ghost small" data-action="quest-toggle" data-id="${q.id}">${q.off ? '켜기' : '끄기'}</button>`
          : `<button class="btn ghost small" data-action="quest-delete" data-id="${q.id}">지우기</button>`}
      </div>`).join('') || empty('아직 퀘스트가 없어요.')}
      <div class="add-row">
        <input data-input="draft" data-key="newQuestText" placeholder="새 퀘스트 (예: 할머니께 안부 문자 보내기)" value="${esc(ui.drafts.newQuestText || '')}">
        <select data-change="draft" data-key="newQuestKind">${KIND_OPTIONS.map(([k, label]) =>
          `<option value="${k}" ${(ui.drafts.newQuestKind || 'daily') === k ? 'selected' : ''}>${label}</option>`).join('')}</select>
        <button class="btn small" data-action="quest-add" data-value="${v.id}">더하기</button>
      </div>
      ${v.custom ? `<button class="btn ghost small warn" data-action="value-delete" data-id="${v.id}">이 가치 지우기</button>` : ''}
    </div>` : ''}
  </div>`;
}

function values(s) {
  const shares = valueShares(s);
  return `${back}
    <h2>🎯 중점 가치·퀘스트</h2>
    <div class="notice">우리 집에서 중요하게 여기는 가치를 골라 주세요. <b>아주 중요</b>일수록 그 가치의 퀘스트가 자주 나오고,
      <b>쉬기</b>로 두면 나오지 않아요. 같은 퀘스트는 며칠 동안 다시 나오지 않아요.
      바꾼 설정은 내일부터 반영돼요(바로 바꾸려면 맨 아래 '다시 뽑기').</div>
    ${EPITHET_ORDER.map(getStat).map((st) => {
      const list = s.values.filter((v) => v.stat === st.id);
      return list.length ? `<h3 class="stat-group" style="--c:${st.color}">${st.icon} ${st.name}</h3>${list.map((v) => valueRow(s, v, shares)).join('')}` : '';
    }).join('')}
    <section class="card form">
      <h3>새 가치 더하기</h3>
      <p class="muted small">예: '형제·친구와 나누기', '고운 말 쓰기', '용돈 아껴 쓰기'. 더한 뒤 그 가치의 퀘스트를 몇 개 넣어 주세요.</p>
      <input data-input="draft" data-key="newValueName" placeholder="가치 이름" value="${esc(ui.drafts.newValueName || '')}">
      <label>어떤 스탯이 자라나요?</label>${statChips('newValueStat', 'heart')}
      <button class="btn" data-action="value-add">더하기</button>
    </section>
    <div class="row">
      <button class="btn ghost" data-action="reroll-day">오늘 퀘스트 다시 뽑기</button>
      <button class="btn ghost" data-action="reroll-week">이번 주 미션 다시 뽑기</button>
    </div>
    <p class="muted small">다시 뽑아도 이미 한 퀘스트와 시작한 미션은 그대로 남아요.</p>`;
}

// ── 퀘스트 만들기 ──

const MAKE_WHEN = [
  ['every', '매일 꼭', "날마다 '매일 하는 일'에 나와요. 요일은 '매일 하는 일'에서 바꿀 수 있어요."],
  ['daily', '오늘의 퀘스트', '다른 퀘스트와 돌아가며 나와요. 고른 가치가 중요할수록 자주 나와요.'],
  ['challenge', '오늘의 도전', '아이가 고르는 도전 3개 중 하나로 돌아가며 나와요.'],
  ['weekly', '주간 미션', '주간 미션 4개 중 하나로 돌아가며 나와요. 해내면 열쇠를 받아요.'],
  ['coop', '함께하는 주간 미션', '아빠·엄마 중 한 명과 함께하는 주간 미션이에요. 함께한 부모도 경험치를 받아요.'],
];
const XP_STEPS = [5, 10, 15, 20, 30, 50];
const DEFAULT_XP = { every: REWARD.routine.xp, daily: REWARD.daily.xp, challenge: REWARD.challenge.xp, weekly: REWARD.weekly.xp, coop: REWARD.coop.xp };

/** 만들기 칸의 지금 값 (고르지 않은 칸은 알맞은 기본값) */
function makeForm(s) {
  const d = ui.drafts;
  const when = d.makeWhen || 'daily';
  const stat = d.makeStat || 'heart';
  const xp = Number(d.makeXp) || DEFAULT_XP[when];
  const value = (d.makeValue && valueOf(s, d.makeValue))
    || s.values.find((v) => v.stat === stat && v.priority > 0) || s.values.find((v) => v.stat === stat) || s.values[0];
  return { when, stat, xp, value, today: d.makeToday === '1' };
}

function make(s) {
  const f = makeForm(s);
  const st = getStat(f.stat);
  const mine = questList(s).filter((q) => !q.builtIn);
  return `${back}
    <h2>✏️ 퀘스트 만들기</h2>
    <div class="notice">우리 집만의 퀘스트를 직접 만들어요. 경험치와 자라는 능력치(항목)를 정할 수 있어요.
      능력치는 경험치 10마다 +1씩 올라요(최대 +5). 9살에게는 매일 퀘스트 5~15, 큰 도전 20~30 정도가 알맞아요.</div>
    <section class="card form">
      <label>퀘스트 내용</label>
      <input data-input="draft" data-key="makeText" placeholder="예: 할머니께 안부 문자 보내기" value="${esc(ui.drafts.makeText || '')}">
      <label>언제 나오나요?</label>
      ${chips(MAKE_WHEN.map(([k, label]) => [k, label]), 'makeWhen', f.when, 'make-pick')}
      <p class="muted small">${MAKE_WHEN.find(([k]) => k === f.when)[2]}</p>
      <label>어떤 능력치가 자라나요? (항목)</label>
      ${chips(STATS.map((x) => [x.id, `${x.icon} ${x.name}`]), 'makeStat', f.stat, 'make-pick')}
      <label>경험치</label>
      <div class="xp-pick">
        ${chips(XP_STEPS.map((n) => [String(n), `${n}`]), 'makeXp', String(f.xp), 'make-pick')}
        <input type="number" min="1" max="100" inputmode="numeric" value="${f.xp}" data-change="make-xp" aria-label="경험치 직접 입력">
      </div>
      <p class="preview">완료하면 <b>+${f.xp} XP</b> · ${st.icon} ${st.name} <b>+${statGainFor(f.xp)}</b></p>
      ${f.when === 'every' ? '' : `
        <label>어느 가치에 넣을까요? <small class="muted">가치의 우선순위대로 자주 나와요</small></label>
        <select data-change="make-value">${EPITHET_ORDER.map(getStat).map((x) => `<optgroup label="${x.icon} ${x.name}">${s.values.filter((v) => v.stat === x.id).map((v) =>
          `<option value="${v.id}" ${v.id === f.value.id ? 'selected' : ''}>${esc(v.name)} (${PRIORITY[v.priority].name})</option>`).join('')}</optgroup>`).join('')}</select>
        ${f.value.priority ? '' : "<p class=\"warn-text\">이 가치는 지금 '쉬기'라서 퀘스트가 나오지 않아요.</p>"}`}
      ${f.when === 'daily' ? `<div class="chips"><button class="chip ${f.today ? 'on' : ''}" data-action="make-pick" data-key="makeToday" data-value="${f.today ? '' : '1'}">${f.today ? '✓ ' : ''}오늘 퀘스트에 바로 넣기</button></div>` : ''}
      <button class="btn big" data-action="make-add">만들기</button>
    </section>

    <h3 class="section-title">우리가 만든 퀘스트</h3>
    ${mine.length ? mine.map((q) => `<div class="made-row">
      <div class="made-main"><b>${esc(q.text)}</b>
        <div><span class="tag kind">${KIND_LABEL[q.coop ? 'coop' : q.kind]}</span>${statTag(q.stat)}<span class="tag xp">+${q.xp || REWARD[q.coop ? 'coop' : q.kind].xp} XP</span>
        <small class="muted">${esc(valueOf(s, q.value)?.name || '')}</small></div></div>
      <button class="btn ghost small" data-action="quest-delete" data-id="${q.id}">지우기</button>
    </div>`).join('') : empty('아직 만든 퀘스트가 없어요.')}
    <p class="muted small">'매일 꼭' 퀘스트는 '매일 하는 일'에서 요일·경험치를 바꾸거나 지울 수 있어요.</p>`;
}

// ── 매일 하는 일 ──

function routines(s) {
  return `${back}
    <h2>📅 매일 하는 일</h2>
    <div class="notice">요일을 고르면 그날 '매일 하는 일'에 나와요. 일주일에 4일 이상 하는 일은 '이번 주 N일 하기' 꾸준함 미션이,
      가끔 하는 일(학원)은 '배운 것 보여 주기' 미션이 주마다 돌아가며 주간 미션에 나와요.</div>
    ${s.routines.map((r) => `<section class="card routine ${r.on ? '' : 'off'}">
      <div class="routine-head">
        <span class="routine-icon">${esc(r.icon)}</span>
        <input class="inline" value="${esc(r.text)}" data-change="routine-text" data-id="${r.id}" aria-label="할 일 이름">
        <button class="btn ghost small" data-action="routine-toggle" data-id="${r.id}">${r.on ? '쉬기' : '다시 하기'}</button>
      </div>
      <div class="days">${WEEKDAYS.map((d, i) => `<button class="day ${r.days.includes(i) ? 'on' : ''}" data-action="routine-day" data-id="${r.id}" data-day="${i}">${d}</button>`).join('')}</div>
      <div class="chips">${STATS.map((st) => `<button class="chip ${r.stat === st.id ? 'on' : ''}" data-action="routine-stat" data-id="${r.id}" data-value="${st.id}">${st.icon} ${st.name}</button>`).join('')}</div>
      <div class="chips xp-row"><small class="muted">경험치</small>${XP_STEPS.map((n) =>
        `<button class="chip ${(r.xp || REWARD.routine.xp) === n ? 'on' : ''}" data-action="routine-xp" data-id="${r.id}" data-n="${n}">${n}</button>`).join('')}</div>
      ${r.days.length < 4 ? `<label>주간 미션 문장</label><input class="inline" value="${esc(r.weekly || '')}" placeholder="예: 배운 기술 하나 가족에게 보여 주기" data-change="routine-weekly" data-id="${r.id}">` : ''}
      <button class="btn ghost small warn" data-action="routine-delete" data-id="${r.id}">지우기</button>
    </section>`).join('')}
    <section class="card form">
      <h3>새로 더하기</h3>
      <input data-input="draft" data-key="newRoutine" placeholder="예: 피아노 연습하기" value="${esc(ui.drafts.newRoutine || '')}">
      <label>어떤 스탯이 자라나요?</label>${statChips('newRoutineStat', 'wisdom')}
      <p class="muted small">더한 뒤 위에서 요일을 골라 주세요(처음엔 매일).</p>
      <button class="btn" data-action="routine-add">더하기</button>
    </section>`;
}

// ── 설정·백업 ──

function settings(s) {
  const person = (who, avatars) => {
    const p = who === 'hero' ? s.hero : s.parents[who];
    return `<div class="person">
      <label>${who === 'hero' ? '아이 이름' : `${esc(p.name)} 호칭`}</label>
      <input value="${esc(p.name)}" data-change="set-name" data-who="${who}">
      <div class="avatars">${avatars.map((a) => `<button class="avatar-btn ${p.avatar === a ? 'on' : ''}" data-action="set-avatar" data-who="${who}" data-avatar="${a}">${a}</button>`).join('')}</div>
    </div>`;
  };
  const counts = (key, options) => `<div class="chips">${options.map((n) =>
    `<button class="chip ${s.settings[key] === n ? 'on' : ''}" data-action="set-count" data-key="${key}" data-n="${n}">${n}개</button>`).join('')}</div>`;

  return `${back}
    <h2>⚙️ 설정·백업</h2>
    <section class="card form">
      <h3>캐릭터</h3>
      ${person('hero', HERO_AVATARS)}${person('dad', PARENT_AVATARS.dad)}${person('mom', PARENT_AVATARS.mom)}
    </section>

    <section class="card form">
      <h3>퀘스트 양</h3>
      <label>오늘의 퀘스트 (매일 하는 일 말고)</label>${counts('dailyCount', [1, 2, 3])}
      <label>오늘의 도전 선택지</label>${counts('challengeCount', [2, 3])}
      <p class="muted small">내일부터 반영돼요. 9살에게는 하루에 다 합쳐 10~15분 정도가 알맞아요.</p>
    </section>

    <section class="card form">
      <h3>🔓 레벨 해금</h3>
      <p class="muted small">레벨이 오르면 할 수 있게 되는 일이에요. 돈이나 게임 시간 대신 '믿음과 책임'을 넓혀 주세요.</p>
      ${s.privileges.map((p, i) => `<div class="priv-row">
        <span>Lv.</span><input type="number" min="2" max="60" inputmode="numeric" value="${p.level}" data-change="priv-level" data-index="${i}" aria-label="레벨">
        <input value="${esc(p.text)}" data-change="priv-text" data-index="${i}" aria-label="할 수 있는 일">
        <button class="btn ghost small" data-action="priv-delete" data-index="${i}" aria-label="지우기">✕</button>
      </div>`).join('')}
      <button class="btn ghost" data-action="priv-add">+ 해금 더하기</button>
    </section>

    <section class="card form">
      <h3>🔒 비밀번호</h3>
      <div class="add-row">
        <input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" data-input="draft" data-key="newPin" placeholder="새 비밀번호 4자리" value="${esc(ui.drafts.newPin || '')}">
        <button class="btn small" data-action="pin-change">바꾸기</button>
      </div>
    </section>

    <section class="card form">
      <h3>💾 백업</h3>
      <p class="muted small">모험 기록은 이 iPad 안에만 저장돼요. 한 달에 한 번쯤 파일로 저장해 두세요(iPad에서는 '파일에 저장'을 고르면 돼요).
        마지막 백업: <b>${s.lastBackup ? formatDate(s.lastBackup) : '없음'}</b></p>
      <div class="row">
        <button class="btn" data-action="backup-save">파일로 저장</button>
        <button class="btn ghost" data-action="backup-copy">글자로 복사</button>
        <label class="btn ghost">백업 파일 불러오기<input type="file" accept=".json,application/json" data-change="backup-file" hidden></label>
      </div>
      <details><summary>복사해 둔 글자로 불러오기</summary>
        <textarea data-input="draft" data-key="restoreText" rows="3" placeholder="백업 글자를 붙여 넣으세요">${esc(ui.drafts.restoreText || '')}</textarea>
        <button class="btn small" data-action="backup-paste">불러오기</button>
      </details>
      ${restoreConfirm(ui.drafts.restore)}
    </section>

    <section class="card form danger">
      <h3>처음부터 다시</h3>
      <p class="muted small">모든 기록이 지워져요. 먼저 백업하세요.</p>
      <button class="btn warn" data-action="reset-all">처음부터 다시 시작</button>
    </section>`;
}

const SUB = {
  praise: { title: '칭찬 카드', render: praise },
  make: { title: '퀘스트 만들기', render: make },
  hidden: { title: '히든 퀘스트', render: hidden },
  values: { title: '중점 가치', render: values },
  routines: { title: '매일 하는 일', render: routines },
  settings: { title: '설정·백업', render: settings },
};

export const title = (route) => (ui.parentOk && SUB[route.args[0]]?.title) || '부모 모드';

export function render(route) {
  if (!ui.parentOk) return pinGate();
  const s = store.get();
  return (SUB[route.args[0]]?.render || home)(s);
}

// ── 동작 ──

const findRoutine = (s, id) => s.routines.find((r) => r.id === id);
const sortPrivileges = (s) => s.privileges.sort((a, b) => a.level - b.level);

async function saveBackupFile() {
  const name = `컬러퀘스트-백업-${dateKey()}.json`;
  const file = new File([backupText(store.get())], name, { type: 'application/json' });
  // iPad 같은 터치 기기는 공유 창('파일에 저장'), 컴퓨터는 바로 내려받기
  if (navigator.maxTouchPoints > 0 && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: '컬러 퀘스트 백업' });
  } else {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}

export const actions = {
  'pin-key': (el) => {
    const key = el.dataset.key;
    ui.pinError = false;
    if (key === '⌫') ui.pin = ui.pin.slice(0, -1);
    else if (ui.pin.length < 4) ui.pin += key;
    if (ui.pin.length === 4) {
      if (ui.pin === store.get().pin) ui.parentOk = true;
      else ui.pinError = true;
      ui.pin = '';
    }
    store.refresh();
  },
  'parent-lock': () => {
    ui.parentOk = false;
    location.hash = '#/me';
  },
  'pick-draft': (el) => {
    ui.drafts[el.dataset.key] = el.dataset.value;
    store.refresh();
  },

  approve: (el) => {
    store.update((s) => finishMission(s, weekKey(), el.dataset.id, el.dataset.who || null));
    toast('완료! 아이 화면에서 열쇠 축하가 떠요');
  },
  'approve-not-yet': (el) => store.update((s) => cancelMission(s, weekKey(), el.dataset.id)),

  'praise-send': () => {
    const text = (ui.drafts.praise || '').trim();
    if (!text) {
      toast('칭찬할 내용을 적어 주세요');
      return;
    }
    store.update((s) => givePraise(s, { from: ui.drafts.praiseFrom || 'dad', to: 'hero', stat: ui.drafts.praiseStat || 'heart', text }));
    ui.drafts.praise = '';
    store.refresh();
    toast('칭찬 카드를 보냈어요. 아이에게 iPad를 건네면 카드가 떠요!');
  },

  'hidden-open': (el) => {
    ui.drafts.hiddenOpen = el.dataset.id;
    ui.drafts.hiddenNote = '';
    store.refresh();
  },
  'hidden-cancel': () => {
    ui.drafts.hiddenOpen = null;
    store.refresh();
  },
  'hidden-find': (el) => {
    const note = (ui.drafts.hiddenNote || '').trim();
    ui.drafts.hiddenOpen = null;
    store.update((s) => findHidden(s, el.dataset.id, ui.drafts.hiddenBy || 'dad', note));
    toast('발견! 아이에게 iPad를 건네면 축하가 떠요');
  },
  'hidden-add': () => {
    const text = (ui.drafts.newHiddenText || '').trim();
    const hint = (ui.drafts.newHiddenHint || '').trim();
    if (!text || !hint) {
      toast('행동과 힌트를 모두 적어 주세요');
      return;
    }
    store.update((s) => s.hiddenCustom.push({ id: uid('h'), text, hint, stat: ui.drafts.newHiddenStat || 'heart' }));
    ui.drafts.newHiddenText = '';
    ui.drafts.newHiddenHint = '';
    store.refresh();
    toast('히든 퀘스트를 더했어요');
  },
  'hidden-delete': (el) => confirmTap(el, '한 번 더 누르면 지워요', () => store.update((s) => {
    s.hiddenCustom = s.hiddenCustom.filter((h) => h.id !== el.dataset.id);
  })),

  'value-priority': (el) => store.update((s) => {
    valueOf(s, el.dataset.id).priority = Number(el.dataset.level);
  }),
  'value-open': (el) => {
    ui.drafts.valueOpen = ui.drafts.valueOpen === el.dataset.id ? null : el.dataset.id;
    store.refresh();
  },
  'value-add': () => {
    const name = (ui.drafts.newValueName || '').trim();
    if (!name) {
      toast('가치 이름을 적어 주세요');
      return;
    }
    const id = uid('v');
    store.update((s) => s.values.push({ id, name, stat: ui.drafts.newValueStat || 'heart', priority: 2, custom: true }));
    ui.drafts.newValueName = '';
    ui.drafts.valueOpen = id;
    store.refresh();
    toast('가치를 더했어요. 이제 이 가치의 퀘스트를 넣어 주세요.');
  },
  'value-delete': (el) => confirmTap(el, '퀘스트도 함께 지워져요. 한 번 더 누르세요', () => store.update((s) => {
    s.values = s.values.filter((v) => v.id !== el.dataset.id);
    s.customQuests = s.customQuests.filter((q) => q.value !== el.dataset.id);
  })),
  'quest-toggle': (el) => store.update((s) => toggleIn(s.offQuests, el.dataset.id)),
  'quest-delete': (el) => store.update((s) => {
    s.customQuests = s.customQuests.filter((q) => q.id !== el.dataset.id);
  }),
  'quest-add': (el) => {
    const text = (ui.drafts.newQuestText || '').trim();
    if (!text) {
      toast('퀘스트 내용을 적어 주세요');
      return;
    }
    const kind = ui.drafts.newQuestKind || 'daily';
    store.update((s) => s.customQuests.push({
      id: uid('u'), value: el.dataset.value, text,
      ...(kind === 'coop' ? { kind: 'weekly', coop: true } : { kind }),
    }));
    ui.drafts.newQuestText = '';
    store.refresh();
    toast('퀘스트를 더했어요');
  },
  'make-pick': (el) => {
    ui.drafts[el.dataset.key] = el.dataset.value;
    if (el.dataset.key === 'makeStat') delete ui.drafts.makeValue; // 능력치를 바꾸면 가치도 그 능력치의 가치로
    store.refresh();
  },
  'make-xp': (el) => {
    const xp = Math.round(Number(el.value));
    if (xp >= 1) ui.drafts.makeXp = String(Math.min(100, xp));
    store.refresh();
  },
  'make-value': (el) => {
    ui.drafts.makeValue = el.value;
    store.refresh();
  },
  'make-add': () => {
    const text = (ui.drafts.makeText || '').trim();
    if (!text) {
      toast('퀘스트 내용을 적어 주세요');
      return;
    }
    const f = makeForm(store.get());
    store.update((s) => {
      if (f.when === 'every') {
        s.routines.push({ id: uid('r'), text, icon: getStat(f.stat).icon, stat: f.stat, days: [0, 1, 2, 3, 4, 5, 6], on: true, xp: f.xp });
        return;
      }
      const id = uid('u');
      s.customQuests.push({
        id, value: f.value.id, text, stat: f.stat, xp: f.xp,
        ...(f.when === 'coop' ? { kind: 'weekly', coop: true } : { kind: f.when }),
      });
      if (f.when === 'daily' && f.today) addToToday(s, id);
    });
    ui.drafts.makeText = '';
    ui.drafts.makeToday = '';
    store.refresh();
    toast(f.when === 'daily' && f.today ? '만들었어요! 오늘의 퀘스트에 들어갔어요.' : '만들었어요!');
  },
  'reroll-day': () => {
    store.update((s) => rerollDay(s));
    toast('오늘 퀘스트를 다시 뽑았어요');
  },
  'reroll-week': () => {
    store.update((s) => rerollWeek(s));
    toast('이번 주 미션을 다시 뽑았어요');
  },

  'routine-text': (el) => store.update((s) => {
    const text = el.value.trim();
    if (text) findRoutine(s, el.dataset.id).text = text;
  }),
  'routine-weekly': (el) => store.update((s) => {
    findRoutine(s, el.dataset.id).weekly = el.value.trim();
  }),
  'routine-toggle': (el) => store.update((s) => {
    const r = findRoutine(s, el.dataset.id);
    r.on = !r.on;
  }),
  'routine-day': (el) => store.update((s) => {
    const r = findRoutine(s, el.dataset.id);
    toggleIn(r.days, Number(el.dataset.day));
    r.days.sort();
  }),
  'routine-xp': (el) => store.update((s) => {
    findRoutine(s, el.dataset.id).xp = Number(el.dataset.n);
  }),
  'routine-stat': (el) => store.update((s) => {
    findRoutine(s, el.dataset.id).stat = el.dataset.value;
  }),
  'routine-delete': (el) => confirmTap(el, '한 번 더 누르면 지워요', () => store.update((s) => {
    s.routines = s.routines.filter((r) => r.id !== el.dataset.id);
  })),
  'routine-add': () => {
    const text = (ui.drafts.newRoutine || '').trim();
    if (!text) {
      toast('할 일을 적어 주세요');
      return;
    }
    const stat = ui.drafts.newRoutineStat || 'wisdom';
    store.update((s) => s.routines.push({ id: uid('r'), text, icon: STATS.find((st) => st.id === stat).icon, stat, days: [0, 1, 2, 3, 4, 5, 6], on: true }));
    ui.drafts.newRoutine = '';
    store.refresh();
  },

  'set-name': (el) => store.update((s) => {
    const name = el.value.trim();
    if (!name) return;
    if (el.dataset.who === 'hero') s.hero.name = name;
    else s.parents[el.dataset.who].name = name;
  }),
  'set-avatar': (el) => store.update((s) => {
    (el.dataset.who === 'hero' ? s.hero : s.parents[el.dataset.who]).avatar = el.dataset.avatar;
  }),
  'set-count': (el) => store.update((s) => {
    s.settings[el.dataset.key] = Number(el.dataset.n);
  }),
  'priv-level': (el) => store.update((s) => {
    const level = Math.round(Number(el.value));
    if (level >= 2) s.privileges[Number(el.dataset.index)].level = level;
    sortPrivileges(s);
  }),
  'priv-text': (el) => store.update((s) => {
    s.privileges[Number(el.dataset.index)].text = el.value.trim();
  }),
  'priv-delete': (el) => store.update((s) => {
    s.privileges.splice(Number(el.dataset.index), 1);
  }),
  'priv-add': () => store.update((s) => {
    const last = s.privileges[s.privileges.length - 1]?.level || 1;
    s.privileges.push({ level: last + 3, text: '새로 할 수 있는 일' });
  }),
  'pin-change': () => {
    const pin = (ui.drafts.newPin || '').trim();
    if (!/^\d{4}$/.test(pin)) {
      toast('숫자 4자리로 적어 주세요');
      return;
    }
    store.update((s) => {
      s.pin = pin;
    });
    ui.drafts.newPin = '';
    toast('비밀번호를 바꿨어요');
  },

  'backup-save': async () => {
    try {
      await saveBackupFile();
      store.update((s) => {
        s.lastBackup = dateKey();
      });
      toast('백업 파일을 만들었어요');
    } catch (e) {
      if (e?.name !== 'AbortError') toast('저장하지 못했어요. "글자로 복사"를 써 보세요.');
    }
  },
  'backup-copy': async () => {
    const ok = await copyText(backupText(store.get()));
    if (ok) {
      store.update((s) => {
        s.lastBackup = dateKey();
      });
      toast('복사했어요. 메모 앱 등에 붙여 넣어 두세요.');
    } else {
      toast('복사하지 못했어요');
    }
  },
  'backup-paste': () => {
    if (prepareRestore((ui.drafts.restoreText || '').trim())) ui.drafts.restoreText = '';
    store.refresh();
  },
  'reset-all': (el) => confirmTap(el, '정말 지울까요? 한 번 더 누르면 지워져요', () => {
    ui.parentOk = false;
    ui.drafts = {};
    store.reset();
    location.hash = '#/me';
  }),
};
