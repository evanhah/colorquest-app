// 나의 모험: 마을 그림(되찾은 색), 캐릭터·레벨·칭호·이번 주 별명, 능력치, 알, 다음 해금, 칭찬 카드, 모험 일지.

import { store } from '../state.js';
import { esc, weekKey, shortDate, josa } from '../core/util.js';
import { levelInfo, titleOf, rankIndexOf, nextRank, nextPrivilege, epithetOf } from '../core/level.js';
import { dayProgress } from '../core/game.js';
import { getPet } from '../data/pets.js';
import { worldSvg, colorDots } from '../ui/world.js';
import { skySvg } from '../ui/sky.js';
import { teamOf, orbsPerQuest } from '../core/pets.js';
import { getItem, TEAM_SIZE } from '../data/petpower.js';
import { skyState, finishedConstellations, STARS_PER_CONSTELLATION } from '../data/sky.js';
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
  const sky = skyState(s.stars.total);
  const hat = s.bank.hat ? getItem(s.bank.hat) : null;
  const team = teamOf(s);
  const finished = finishedConstellations(s.stars.total);

  return `
    <section class="world-card">
      ${worldSvg(rankIdx, { avatar: s.hero.avatar, pet: pet?.emoji, hat: hat?.icon, decos: s.bank.owned })}
      ${colorDots(rankIdx)}
    </section>

    <section class="card hero-card">
      <div class="hero-top">
        <span class="avatar big">${esc(s.hero.avatar)}${hat ? `<i class="hat">${hat.icon}</i>` : ''}</span>
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

    <a class="card pouch-link" href="#/pets/${s.bank.pouch ? 'jars' : 'team'}">
      <span>${team.map((p) => p.emoji).join('') || '🐾'}</span>
      <div><b>펫 팀${team.length < TEAM_SIZE ? ` · 빈 자리 ${TEAM_SIZE - team.length}` : ''}</b>
        <small>${s.bank.pouch ? `🔮 구슬 주머니 ${s.bank.pouch}개 — 저금통에 나눠 담아요` : `퀘스트 하나에 🔮 ${orbsPerQuest(s)}개를 만들어요`}</small></div>
    </a>

    <section class="card sky-card">
      ${skySvg(sky.current, sky.lit)}
      <div>
        <small class="muted">🌙 밤하늘</small>
        <h3>${sky.current.icon} ${esc(sky.current.name)} <span class="muted">${sky.lit}/${STARS_PER_CONSTELLATION}</span></h3>
        <p>오늘 퀘스트를 모두 하면 별이 하나 켜져요. 별 ${STARS_PER_CONSTELLATION}개면 별자리 완성!</p>
        ${finished.length ? `<p class="constellations">완성한 별자리 ${finished.length}개 ${finished.slice(-8).map((c) => `<span title="${esc(c.name)}">${c.icon}</span>`).join('')}</p>` : ''}
      </div>
    </section>

    <h3 class="section-title">능력치</h3>
    ${statGrid(s.hero.stats)}

    <div class="grid2">
      <a class="card egg-card ${waiting ? 'ready' : ''}" href="#/pets">
        <span class="egg-icon">🥚</span>
        <div>
          <b>${s.eggsWaiting.includes('divine') ? '✨ 디바인 알이 기다려요!' : waiting ? `부화를 기다리는 알 ${waiting}개!` : '알을 품는 중'}</b>
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
