// 처음 시작: 주인공 이름·모습, 잘하는 것 두 가지(+3), 아빠·엄마 호칭, 부모 모드 비밀번호. (부모가 함께 설정)

import { store, ui } from '../state.js';
import { esc, toast } from '../core/util.js';
import { startAdventure } from '../core/game.js';
import { STATS, START_STAT, STRENGTH_BONUS } from '../data/stats.js';
import { HERO_AVATARS } from '../data/titles.js';
import { worldSvg } from '../ui/world.js';
import { restoreConfirm } from '../ui/components.js';

export const title = () => '모험 준비';

export function render() {
  const u = ui.setup;
  return `<div class="setup">
    <section class="setup-hero">
      ${worldSvg(0)}
      <h2>컬러 퀘스트</h2>
      <p>회색이 된 마을에 색을 되찾는 모험을 시작해요. 처음 설정은 아빠·엄마가 함께 해 주세요.</p>
    </section>

    <section class="card form">
      <h3>1. 주인공</h3>
      <label>이름 (게임에서 부를 이름)</label>
      <input data-input="setup" data-key="name" value="${esc(u.name)}" placeholder="예: 민준" autocomplete="off">
      <label>모습</label>
      <div class="avatars">${HERO_AVATARS.map((a) => `<button class="avatar-btn ${u.avatar === a ? 'on' : ''}" data-action="setup-avatar" data-avatar="${a}">${a}</button>`).join('')}</div>
    </section>

    <section class="card form">
      <h3>2. 잘하는 것 두 가지</h3>
      <p class="muted small">모든 능력치는 ${START_STAT}에서 똑같이 시작하고, 고른 두 가지만 +${STRENGTH_BONUS}에서 시작해요.
        또래와 비교한 점수가 아니라, 지금부터 얼마나 자라는지를 보는 숫자예요.</p>
      <div class="choices">${STATS.map((st) => `
        <button class="choice ${u.strengths.includes(st.id) ? 'on' : ''}" data-action="setup-strength" data-id="${st.id}" style="--c:${st.color}">
          <span class="choice-icon">${st.icon}</span><b>${st.name}</b><small>${esc(st.desc)}</small>
        </button>`).join('')}</div>
    </section>

    <section class="card form">
      <h3>3. 아빠·엄마</h3>
      <div class="grid2">
        <div><label>아빠 호칭</label><input data-input="setup" data-key="dad" value="${esc(u.dad)}"></div>
        <div><label>엄마 호칭</label><input data-input="setup" data-key="mom" value="${esc(u.mom)}"></div>
      </div>
      <label>부모 모드 비밀번호 (숫자 4자리)</label>
      <input type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" data-input="setup" data-key="pin" value="${esc(u.pin)}" placeholder="••••">
      <p class="muted small">칭찬 카드·히든 퀘스트 발견·미션 확인은 부모 모드에서 해요. 아이가 모르는 번호로 정해 주세요.</p>
    </section>

    <button class="btn big" data-action="setup-start">모험 시작!</button>

    <details class="card form">
      <summary>백업 파일에서 이어 하기</summary>
      <label class="btn ghost">백업 파일 고르기<input type="file" accept=".json,application/json" data-change="backup-file" hidden></label>
      ${restoreConfirm(ui.drafts.restore)}
    </details>
  </div>`;
}

export const actions = {
  setup: (el) => {
    ui.setup[el.dataset.key] = el.value;
  },
  'setup-avatar': (el) => {
    ui.setup.avatar = el.dataset.avatar;
    store.refresh();
  },
  'setup-strength': (el) => {
    const list = ui.setup.strengths;
    const at = list.indexOf(el.dataset.id);
    if (at >= 0) list.splice(at, 1);
    else if (list.length < 2) list.push(el.dataset.id);
    else toast('두 가지만 고를 수 있어요. 하나를 먼저 빼 주세요.');
    store.refresh();
  },
  'setup-start': () => {
    const u = ui.setup;
    const name = u.name.trim();
    if (!name) return toast('주인공 이름을 적어 주세요');
    if (u.strengths.length !== 2) return toast('잘하는 것을 두 가지 골라 주세요');
    if (!/^\d{4}$/.test(u.pin)) return toast('비밀번호를 숫자 4자리로 적어 주세요');
    store.update((s) => startAdventure(s, { ...u, name, dad: u.dad.trim(), mom: u.mom.trim() }));
    location.hash = '#/me';
    return undefined;
  },
};
