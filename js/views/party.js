// 우리 파티: 아이와 아빠·엄마 캐릭터. 부모도 이번 주 퀘스트 3개를 하며 함께 자라고,
// 아이는 부모에게 칭찬 카드를 보낼 수 있다(남의 좋은 점을 발견하는 연습).

import { store } from '../state.js';
import { esc, weekKey, josa } from '../core/util.js';
import { toggleParentQuest } from '../core/game.js';
import { PARENT_QUESTS, PARENT_IDS } from '../data/parents.js';
import { REWARD } from '../data/quests.js';
import { xpBlock, parentHead, heroLine, praiseCard, empty } from '../ui/components.js';

export const title = () => '우리 파티';

function parentCard(s, who, plan) {
  const p = s.parents[who];
  const received = s.praise.filter((c) => c.to === who).slice(0, 2);
  return `<section class="card member">
    ${parentHead(s, who)}
    ${xpBlock(p.xp)}
    <h4>이번 주 ${esc(p.name)}의 퀘스트</h4>
    ${(plan?.[who] || []).map((id) => {
      const q = PARENT_QUESTS.find((x) => x.id === id);
      const done = plan.done[`${who}:${id}`];
      return q ? `<button class="pq ${done ? 'done' : ''}" data-action="pq-toggle" data-who="${who}" data-id="${id}">
        <span>${done ? '✅' : '⬜'}</span><span>${esc(q.text)}</span><small>+${REWARD.parentQuest.xp}</small></button>` : '';
    }).join('')}
    <button class="btn" data-action="kid-praise-open" data-to="${who}">💌 ${esc(p.name)}에게 칭찬 카드</button>
    ${received.length ? `<h4>${esc(p.name)}${josa(p.name, '이', '가')} 받은 칭찬</h4>${received.map((c) => praiseCard(s, c)).join('')}` : ''}
  </section>`;
}

export function render() {
  const s = store.get();
  const plan = s.parentWeeks[weekKey()];
  return `
    <p class="lead">아빠·엄마도 함께 자라는 모험 파티예요. 고마운 일이 있으면 칭찬 카드를 보내 보세요!</p>
    <a class="card member hero-mini" href="#/me">
      <div class="char-head"><span class="avatar">${esc(s.hero.avatar)}</span>
        <div><b>${esc(s.hero.name)}</b><div class="muted">${heroLine(s)}</div></div></div>
      ${xpBlock(s.hero.xp)}
    </a>
    <div class="party">${PARENT_IDS.map((who) => parentCard(s, who, plan)).join('')}</div>
    ${plan ? '' : empty('이번 주 부모 퀘스트를 준비하고 있어요.')}`;
}

export const actions = {
  'pq-toggle': (el) => store.update((s) => toggleParentQuest(s, weekKey(), el.dataset.who, el.dataset.id)),
};
