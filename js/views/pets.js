// 알·펫 도감: 부화를 기다리는 알, 품고 있는 알, 함께 다니는 펫, 도감(아직 못 만난 펫은 그림자).

import { store } from '../state.js';
import { esc, toast, josa } from '../core/util.js';
import { hatch } from '../core/game.js';
import { PETS, EGGS, RARITY, getPet } from '../data/pets.js';
import { bar } from '../ui/components.js';

export const title = () => '알·펫 도감';

export function render() {
  const s = store.get();
  const owned = PETS.filter((p) => s.pets[p.id]).length;
  const buddy = getPet(s.hero.companion);

  return `
    <section class="card egg-zone">
      ${s.eggsWaiting.length ? `<h3>부화를 기다리는 알</h3>
        <div class="eggs">${s.eggsWaiting.map((egg, i) => `
          <button class="egg-btn egg-${egg}" data-action="hatch" data-index="${i}">
            <span class="egg">🥚</span><small>${EGGS[egg].name}</small><b>부화!</b>
          </button>`).join('')}</div>` : ''}
      <div class="incubator">
        <span class="egg wobble">🥚</span>
        <div>
          <b>알을 품는 중</b>
          ${bar(s.egg.warmth / s.egg.need, '#fab005')}
          <small>퀘스트를 하면 알이 따뜻해져요 · ${s.egg.warmth}/${s.egg.need}</small>
        </div>
      </div>
      <p class="muted small">히든 퀘스트를 발견하면 황금 알, 비밀의 방을 열면 무지개 알을 받아요.</p>
    </section>

    ${buddy ? `<section class="card buddy">
      <span class="pet-emoji big">${buddy.emoji}</span>
      <div><small class="muted">함께 다니는 펫</small><h3>${esc(buddy.name)}</h3><p>${esc(buddy.desc)}</p>
      <small class="muted">도감에서 다른 펫을 누르면 바꿀 수 있어요.</small></div>
    </section>` : ''}

    <h3 class="section-title">도감 <small class="muted">${owned} / ${PETS.length}</small></h3>
    ${['legend', 'rare', 'common'].map((rarity) => `
      <h4 class="rarity r-${rarity}">${RARITY[rarity].stars} ${RARITY[rarity].name}</h4>
      <div class="pet-grid">${PETS.filter((p) => p.rarity === rarity).map((p) => {
        const have = s.pets[p.id];
        if (!have) return `<div class="pet unknown"><span class="pet-emoji">${p.emoji}</span><b>???</b></div>`;
        return `<button class="pet ${s.hero.companion === p.id ? 'on' : ''}" data-action="companion" data-id="${p.id}">
          <span class="pet-emoji">${p.emoji}</span><b>${esc(p.name)}</b>${have.count > 1 ? `<small>×${have.count}</small>` : ''}</button>`;
      }).join('')}</div>`).join('')}`;
}

export const actions = {
  hatch: (el) => store.update((s) => hatch(s, Number(el.dataset.index))),
  companion: (el) => {
    store.update((s) => {
      s.hero.companion = el.dataset.id;
    });
    const { name } = getPet(el.dataset.id);
    toast(`${name}${josa(name, '과', '와')} 함께 다녀요!`);
  },
};
