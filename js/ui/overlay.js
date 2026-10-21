// 화면 위에 뜨는 창: 축하(레벨 업·히든 발견·칭찬 카드·부화·열쇠·비밀의 방)와 이야기 퀘스트·칭찬 보내기 창.
// 축하는 state.celebrations 에 쌓였다가 하나씩 보여 준다. 부모 모드 화면에서는 띄우지 않고 아이가 볼 때 보여 준다.

import { store, ui } from '../state.js';
import { esc, josa } from '../core/util.js';
import { titleOf, rankOf, rankIndexOf, privilegesAt, parentTitleOf } from '../core/level.js';
import { allHidden, getStory, keysOf, keysNeeded } from '../core/game.js';
import { getStat } from '../data/stats.js';
import { getPet, RARITY } from '../data/pets.js';
import { REWARD } from '../data/quests.js';
import { KID_PRAISE_PRESETS, PARENT_IDS } from '../data/parents.js';
import { worldSvg } from './world.js';
import { statTag, xpTag, parentName, keySlots } from './components.js';

const COLORS = ['#fa5252', '#ff922b', '#fcc419', '#51cf66', '#339af0', '#4c6ef5', '#cc5de8'];

const confetti = () => `<div class="confetti" aria-hidden="true">${Array.from({ length: 28 }, (_, i) =>
  `<i style="left:${(i * 37) % 100}%;background:${COLORS[i % 7]};animation-delay:${(i % 9) * 0.11}s;animation-duration:${1.9 + (i % 5) * 0.3}s"></i>`).join('')}</div>`;

const wrap = (inner, kind) => `<div class="overlay ${kind}">${kind === 'party' ? confetti() : ''}<div class="modal" role="dialog" aria-modal="true">${inner}</div></div>`;
const okButton = (label = '좋아!') => `<button class="btn big" data-action="celebrate-ok">${label}</button>`;
const closeButton = '<button class="close" data-action="modal-close" aria-label="닫기">✕</button>';

export function overlayHtml(route) {
  const s = store.get();
  if (!s.setupDone) return '';
  if (ui.modal) return wrap(modal(s, ui.modal), 'sheet');
  if (route.name !== 'parent' && s.celebrations.length) return wrap(celebration(s, s.celebrations[0]), 'party');
  return '';
}

// ── 축하 ──

function celebration(s, c) {
  const make = CELEBRATIONS[c.type];
  return make ? make(s, c) : okButton();
}

const CELEBRATIONS = {
  intro: (s) => `
    <div class="burst">🥚</div>
    <p class="kicker">컬러 퀘스트</p>
    <h2>회색 마을의 전설</h2>
    <p>옛날 옛적, 알록달록하던 우리 마을에 <b>회색 그림자</b>가 나타나 모든 색과 무지개 알을 훔쳐 갔어요. 마을은 온통 회색이 되었죠.</p>
    <p>전설에 따르면, 따뜻한 마음과 꾸준한 노력으로 퀘스트를 해내는 용사가 나타나면 색이 하나씩 돌아온대요.</p>
    <p class="lead">그 용사가 바로 <b>${esc(s.hero.name)}</b>, 너야!</p>
    <p>마을 어귀에서 첫 번째 알을 찾았어요.</p>
    <button class="btn big" data-action="celebrate-hatch">🥚 알 부화시키기</button>`,

  level: (s, c) => {
    if (c.who !== 'hero') {
      const p = s.parents[c.who];
      return `<div class="burst">${esc(p.avatar)}</div>
        <p class="kicker">${esc(p.name)} 레벨 업!</p>
        <h2>Lv.${c.level} ${esc(parentTitleOf(c.level))}</h2>
        <p>${esc(s.hero.name)}의 파티에서 ${esc(p.name)}도 함께 자라고 있어요.</p>${okButton()}`;
    }
    const rank = rankOf(c.level);
    const rankUp = c.level > 1 && rank.from === c.level;
    const unlocks = privilegesAt(s, c.level);
    return `<p class="kicker">LEVEL UP!</p>
      <div class="lv-num">Lv.${c.level}</div>
      <p class="big-title">${esc(titleOf(c.level))}</p>
      ${rankUp ? `<div class="restore">${worldSvg(rankIndexOf(c.level))}<p>${esc(rank.restore)}</p></div>` : ''}
      ${unlocks.map((p) => `<div class="unlock">🔓 이제 할 수 있어요<b>${esc(p.text)}</b><small>아빠·엄마에게 말해 보세요</small></div>`).join('')}
      ${okButton()}`;
  },

  hidden: (s, c) => {
    const h = allHidden(s).find((x) => x.id === c.id);
    const found = s.hidden[c.id];
    if (!h || !found) return okButton();
    const by = parentName(s, found.by);
    return `<div class="burst">✨</div>
      <p class="kicker">히든 퀘스트 발견!</p>
      <h2>${esc(h.text)}</h2>
      ${found.note ? `<blockquote>${esc(found.note)}<cite>— ${esc(by)}</cite></blockquote>` : `<p>${esc(by)}${josa(by, '이', '가')} 알아봤어요.</p>`}
      <div class="tags">${statTag(h.stat, REWARD.hidden.n)}${xpTag(REWARD.hidden.xp)}</div>
      <p>🥚 <b>황금 알</b>을 얻었어요!</p>${okButton()}`;
  },

  praise: (s, c) => {
    const card = s.praise.find((p) => p.id === c.id);
    if (!card) return okButton();
    const st = getStat(card.stat);
    // 성품(예의·마음·자립)은 "너는 ○○ 사람이야"(사람 칭찬), 능력(체력·지혜·창의)은 노력 칭찬
    const identity = st?.character ? `너는 ${st.epithet} 사람이야.` : '노력한 만큼 자라고 있어!';
    return `<div class="burst">💌</div>
      <p class="kicker">칭찬 카드가 왔어요!</p>
      <div class="letter"><p>${esc(card.text)}</p><cite>— ${esc(parentName(s, card.from))}</cite></div>
      ${st ? `<p class="identity">${identity}</p>` : ''}
      <div class="tags">${st ? statTag(st.id, REWARD.praise.n) : ''}${xpTag(REWARD.praise.xp)}</div>${okButton()}`;
  },

  hatch: (s, c) => {
    const pet = getPet(c.pet);
    if (!pet) return okButton();
    const rarity = RARITY[pet.rarity];
    return `<div class="hatch"><span class="egg egg-${c.egg}">🥚</span><span class="pet-pop">${pet.emoji}</span></div>
      <p class="kicker">${c.isNew ? '새 친구가 태어났어요!' : '또 만났어요!'}</p>
      <h2>${esc(pet.name)}</h2>
      <p class="rarity r-${pet.rarity}">${rarity.stars} ${rarity.name}</p>
      <p>${esc(pet.desc)}</p>
      ${c.isNew ? '' : `<p class="muted">친밀도가 올라갔어요 (×${s.pets[pet.id]?.count || 1})</p>`}
      ${okButton()}`;
  },

  key: (s, c) => {
    const week = s.weeks[c.monday];
    const keys = week ? keysOf(week) : 0;
    const need = week ? keysNeeded(s, week) : 4;
    return `<div class="burst">🗝️</div>
      <p class="kicker">열쇠를 얻었어요!</p>
      <h2>${esc(c.text)}</h2>
      ${keySlots(keys, need)}
      <p>${keys >= need ? '<b>비밀의 방</b>을 열 수 있어요! 퀘스트 → 이번 주에서 열어 보세요.' : `열쇠 ${need - keys}개를 더 모으면 비밀의 방이 열려요.`}</p>
      ${okButton()}`;
  },

  vault: () => `<div class="burst">🚪</div>
    <p class="kicker">비밀의 방이 열렸어요!</p>
    <p>방 안에서 🌈 <b>무지개 알</b>을 찾았어요! 전설의 펫이 나올 확률이 높아요.</p>
    <button class="btn big" data-action="celebrate-hatch" data-egg="rainbow">지금 부화시키기</button>
    <button class="btn ghost" data-action="celebrate-ok">나중에</button>`,
};

// ── 창 ──

function modal(s, m) {
  if (m.type === 'story') {
    const story = getStory(m.id);
    if (!story) return closeButton;
    const st = s.weeks[m.monday]?.status[m.id];
    let foot;
    if (st?.state === 'done') foot = '<p class="done-note">✅ 함께 이야기한 이야기예요</p>';
    else if (st?.state === 'pending') foot = '<p class="done-note">⏳ 아빠·엄마 확인을 기다리고 있어요</p>';
    else {
      foot = `<p><b>누구와 이야기했나요?</b></p><div class="row center">${PARENT_IDS.map((who) => {
        const p = s.parents[who];
        return `<button class="btn" data-action="story-done" data-who="${who}">${esc(p.avatar)} ${esc(p.name)}${josa(p.name, '과', '와')} 이야기했어요</button>`;
      }).join('')}</div>`;
    }
    return `${closeButton}
      <p class="kicker">📖 이야기 퀘스트</p>
      <h2>${esc(story.title)}</h2>
      <p class="story-text">${esc(story.text)}</p>
      <ol class="questions">${story.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
      <p class="tip">아빠·엄마께: 정답을 알려 주기보다 "왜 그렇게 생각해?", "그 사람은 어떤 마음일까?"를 물어봐 주세요.</p>
      ${foot}`;
  }
  if (m.type === 'kidPraise') {
    const p = s.parents[m.to];
    const draft = ui.drafts.kidPraise || '';
    return `${closeButton}
      <p class="kicker">💌 칭찬 카드 보내기</p>
      <h2>${esc(p.avatar)} ${esc(p.name)}에게</h2>
      <p class="muted">고마웠던 일을 골라 보거나 직접 써 보세요.</p>
      <div class="chips">${KID_PRAISE_PRESETS.map((t) => `<button class="chip ${draft === t ? 'on' : ''}" data-action="kid-praise-preset" data-text="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <textarea data-input="draft" data-key="kidPraise" rows="3" placeholder="직접 쓰기">${esc(draft)}</textarea>
      <button class="btn big" data-action="kid-praise-send">보내기</button>`;
  }
  return closeButton;
}
