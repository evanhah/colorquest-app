// 나의 모험: 마을 그림(되찾은 색), 캐릭터·레벨·칭호·이번 주 별명, 능력치, 알, 다음 해금, 칭찬 카드, 모험 일지.

import { store } from '../state.js';
import { esc, weekKey, shortDate, josa } from '../core/util.js';
import { levelInfo, titleOf, rankIndexOf, nextRank, nextPrivilege, epithetOf } from '../core/level.js';
import { dayProgress } from '../core/game.js';
import { getPet } from '../data/pets.js';
import { worldSvg, colorDots } from '../ui/world.js';
import { statGrid, xpBlock, rankBadge, praiseCard, bar, empty, parentName } from '../ui/components.js';

export const title = () => '나의 모험';

export function render() {
  const s = store.get();
  const { level } = levelInfo(s.hero.xp);
  const rankIdx = rankIndexOf(level);
  const pet = getPet(s.hero.companion);
  const ep = epithetOf(s, weekKey());
  const prog = dayProgress(s);
  const upcoming = nextRank(level);
  const unlock = nextPrivilege(s, level);
  const cards = s.praise.filter((p) => p.to === 'hero').slice(0, 3);
  const waiting = s.eggsWaiting.length;

  return `
    <section class="world-card">
      ${worldSvg(rankIdx, { avatar: s.hero.avatar, pet: pet?.emoji })}
      ${colorDots(rankIdx)}
    </section>

    <section class="card hero-card">
      <div class="hero-top">
        <span class="avatar big">${esc(s.hero.avatar)}</span>
        <div class="hero-id">
          <span class="epithet" style="--c:${ep.stat.color}">${ep.stat.icon} ${ep.thisWeek ? '이번 주' : '지금'} 별명 · ${esc(ep.stat.epithet)}</span>
          <h2>${esc(s.hero.name)}</h2>
          <div class="lv"><b>Lv.${level}</b> ${esc(titleOf(level))} ${rankBadge(level)}</div>
        </div>
        ${pet ? `<a class="companion" href="#/pets" title="${esc(pet.name)}">${pet.emoji}</a>` : ''}
      </div>
      ${xpBlock(s.hero.xp)}
      ${upcoming ? `<p class="hint">Lv.${upcoming.from}에서 <b style="color:${upcoming.color}">${upcoming.name}</b>${josa(upcoming.name, '을', '를')} 되찾아요</p>` : ''}
    </section>

    <a class="card today-link" href="#/quests/today">
      <span>📜 오늘의 퀘스트</span><b>${prog.done}/${prog.total}</b>
      ${bar(prog.total ? prog.done / prog.total : 0)}
    </a>

    <h3 class="section-title">능력치</h3>
    ${statGrid(s.hero.stats)}

    <div class="grid2">
      <a class="card egg-card ${waiting ? 'ready' : ''}" href="#/pets">
        <span class="egg-icon">🥚</span>
        <div>
          <b>${waiting ? `부화를 기다리는 알 ${waiting}개!` : '알을 품는 중'}</b>
          ${bar(s.egg.warmth / s.egg.need, '#fab005')}
          <small>퀘스트를 하면 알이 따뜻해져요 (${s.egg.warmth}/${s.egg.need})</small>
        </div>
      </a>
      <div class="card unlock-card">
        <span class="egg-icon">🔓</span>
        <div>${unlock
          ? `<b>Lv.${unlock.level}이 되면</b><p>${esc(unlock.text)}</p>`
          : '<b>모든 해금을 열었어요!</b>'}</div>
      </div>
    </div>

    <h3 class="section-title">받은 칭찬 카드</h3>
    ${cards.length ? cards.map((c) => praiseCard(s, c)).join('') : empty('아직 받은 칭찬 카드가 없어요. 좋은 일을 하면 아빠·엄마가 알아봐 줄 거예요.')}

    <details class="card log">
      <summary>📒 모험 일지</summary>
      ${s.log.length ? `<ul>${s.log.slice(0, 40).map((e) => `
        <li><span class="muted">${shortDate(e.date)}</span>
          ${e.who !== 'hero' ? `<b>${esc(parentName(s, e.who))}</b> · ` : ''}${esc(e.text)}
          ${e.xp ? `<span class="tag xp">+${e.xp}</span>` : ''}</li>`).join('')}</ul>` : empty('아직 기록이 없어요.')}
    </details>`;
}
