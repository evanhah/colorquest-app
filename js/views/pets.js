// 알·펫: 세 칸으로 나뉜다.
//   🥚 알·도감 (#/pets)       부화를 기다리는 알, 품고 있는 알, 도감(못 만난 펫은 그림자)
//   🐾 펫 팀   (#/pets/team)  대장 + 팀원 최대 3마리. 팀이 퀘스트 때 빛 구슬·탐험 카드·재능 코치를 한다(core/pets.js)
//   🏺 저금통  (#/pets/jars)  구슬 주머니 → 쓰기·모으기·나누기 저금통, 가게, 나눔

import { store } from '../state.js';
import { esc, toast, josa } from '../core/util.js';
import { hatch, grant } from '../core/game.js';
import { teamOf, orbsPerQuest, toggleTeam, putInJar, nextInterest, buyItem, shareGift, shareBadgeOf } from '../core/pets.js';
import { metVillagers } from '../core/map.js';
import { getVillager } from '../data/map.js';
import { getStat } from '../data/stats.js';
import {
  TEAM_SIZE, ORB_BY_RARITY, TRIP_QUESTS, TALENT, CARDS, SHOP, SHARE_COST, SHARE_BADGES, PARENT_GIFT_XP, INTEREST_RATE,
} from '../data/petpower.js';
import { PARENT_IDS } from '../data/parents.js';
import { PETS, EGGS, RARITY, getPet } from '../data/pets.js';
import { bar, segTabs, empty } from '../ui/components.js';

export const title = () => '알·펫';

const TABS = [['eggs', '🥚 알·도감', '#/pets'], ['team', '🐾 펫 팀', '#/pets/team'], ['jars', '🏺 저금통', '#/pets/jars']];

export function render(route) {
  const tab = TABS.some(([key]) => key === route.args[0]) ? route.args[0] : 'eggs';
  const s = store.get();
  return segTabs(TABS, tab) + { eggs, team, jars }[tab](s);
}

function eggs(s) {
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
      <p class="muted small">히든 퀘스트를 발견하면 황금 알, 비밀의 방을 열면 무지개 알, 새 빛깔 땅에 도착하면 ✨디바인 알을 받아요.</p>
    </section>

    ${buddy ? `<section class="card buddy">
      <span class="pet-emoji big">${buddy.emoji}</span>
      <div><small class="muted">함께 다니는 펫</small><h3>${esc(buddy.name)}</h3><p>${esc(buddy.desc)}</p>
      <small class="muted">도감에서 펫을 누르면 정보를 보고, 함께 다닐 펫을 바꿀 수 있어요.</small></div>
    </section>` : ''}

    <h3 class="section-title">도감 <small class="muted">${owned} / ${PETS.length}</small></h3>
    ${['divine', 'legend', 'rare', 'common'].map((rarity) => `
      <h4 class="rarity r-${rarity}">${RARITY[rarity].stars} ${RARITY[rarity].name}</h4>
      ${rarity === 'divine' ? '<p class="muted small">빛깔 땅마다 사는 수호신이에요. 새 땅에 처음 도착하면 그 땅의 수호 알(디바인 알)을 받아요. 무지개·황금 알에서도 아주 드물게 나와요.</p>' : ''}
      <div class="pet-grid">${PETS.filter((p) => p.rarity === rarity).map((p) => {
        const have = s.pets[p.id];
        const cls = rarity === 'divine' ? 'divine' : '';
        if (!have) return `<button class="pet unknown ${cls}" data-action="pet-info" data-id="${p.id}"><span class="pet-emoji">${p.emoji}</span><b>???</b></button>`;
        return `<button class="pet ${cls} ${s.hero.companion === p.id ? 'on' : ''}" data-action="pet-info" data-id="${p.id}">
          <span class="pet-emoji">${p.emoji}</span><b>${esc(p.name)}</b>${have.count > 1 ? `<small>×${have.count}</small>` : ''}</button>`;
      }).join('')}</div>`).join('')}`;
}

// ── 펫 팀 ──

const statChip = (id) => {
  const st = getStat(id);
  return `<span class="tag" style="--c:${st.color}">${st.icon} ${st.name}</span>`;
};

function team(s) {
  const members = teamOf(s);
  const owned = PETS.filter((p) => s.pets[p.id]);
  const talents = [...new Set(members.map((p) => TALENT[p.id]))];
  const cardsGot = owned.reduce((n, p) => n + (s.pets[p.id].cards || 0), 0);
  const cardsAll = PETS.reduce((n, p) => n + (CARDS[p.id]?.length || 0), 0);
  const slot = (p, i) => {
    if (!p) return '<div class="slot empty"><span>＋</span><small>빈 자리<br>아래에서 펫을 골라요</small></div>';
    const mine = s.pets[p.id];
    return `<button class="slot ${p.rarity === 'divine' ? 'divine' : ''}" data-action="pet-info" data-id="${p.id}">
      ${i === 0 ? '<span class="leader">대장</span>' : ''}
      <span class="pet-emoji">${p.emoji}</span><b>${esc(p.name)}</b>
      <span class="rarity r-${p.rarity}">${RARITY[p.rarity].stars}</span>
      <small>🔮 퀘스트마다 ${ORB_BY_RARITY[p.rarity]}개</small>
      <small>💡 ${getStat(TALENT[p.id]).icon} ${getStat(TALENT[p.id]).name} 코치</small>
      <small>🧭 탐험 ${mine.trip || 0}/${TRIP_QUESTS[p.rarity]}</small>
      ${bar((mine.trip || 0) / TRIP_QUESTS[p.rarity], '#4dabf7')}
    </button>`;
  };
  return `
    <section class="card team-card">
      <div class="spread"><h3>🐾 우리 펫 팀</h3><span class="pill">퀘스트 하나에 🔮 ${orbsPerQuest(s)}개</span></div>
      <div class="team-slots">${Array.from({ length: TEAM_SIZE }, (_, i) => slot(members[i], i)).join('')}</div>
      <p class="muted small">현실에서 퀘스트를 할 때마다 펫 팀이 ① 🔮 빛 구슬을 만들고 ② 🧭 자기 땅을 탐험해 지식 카드를 가져오고
        ③ 💡 재능이 맞는 퀘스트에 꿀팁을 알려 줘요. 좋은 펫은 구슬을 많이, 여러 재능을 섞으면 코치를 더 많이 받아요.</p>
      <p class="coach-cover">오늘 코치해 주는 능력치: ${talents.length ? talents.map(statChip).join('') : '없음'}</p>
    </section>

    <h3 class="section-title">내 펫 <small class="muted">눌러서 팀에 넣거나 빼요 · 대장은 펫 정보창에서 바꿔요</small></h3>
    ${owned.length ? `<div class="pet-grid">${owned.map((p) => {
      const on = members.some((m) => m.id === p.id);
      return `<button class="pet ${p.rarity === 'divine' ? 'divine' : ''} ${on ? 'on' : ''}" data-action="team-toggle" data-id="${p.id}">
        ${on ? '<span class="in-team">✓</span>' : ''}
        <span class="pet-emoji">${p.emoji}</span><b>${esc(p.name)}</b>
        <small>🔮${ORB_BY_RARITY[p.rarity]} · ${getStat(TALENT[p.id]).icon}</small></button>`;
    }).join('')}</div>` : empty('아직 펫이 없어요. 알을 부화시켜 보세요!')}

    <h3 class="section-title">🧭 지식 카드 <small class="muted">${cardsGot} / ${cardsAll}</small></h3>
    <p class="muted small">펫마다 다른 진짜 이야기를 가져와요. 펫을 누르면 그 펫이 가져온 카드를 볼 수 있어요. 가족에게 들려줘 보세요!</p>`;
}

// ── 저금통 ──

function jars(s) {
  const b = s.bank;
  const interest = nextInterest(s);
  const jar = (key, icon, name, desc) => `<div class="jar jar-${key}">
    <div class="jar-icon">${icon}</div><b>${name}</b>
    <div class="jar-count">🔮 ${b[key]}</div>
    <small>${desc}</small>
    <div class="row center">${[1, 5, 10].map((n) =>
      `<button class="btn small" data-action="jar-put" data-jar="${key}" data-n="${n}" ${b.pouch ? '' : 'disabled'}>+${n}</button>`).join('')}</div>
  </div>`;
  const item = (it) => {
    const jarKey = it.big ? 'save' : 'spend';
    const have = b.owned.includes(it.id);
    let action;
    if (it.kind === 'hat' && have) {
      action = b.hat === it.id
        ? '<button class="btn ghost small" data-action="hat-wear" data-id="">벗기</button>'
        : `<button class="btn ghost small" data-action="hat-wear" data-id="${it.id}">쓰기</button>`;
    } else if (have) {
      action = '<span class="owned">✓ 마을에 있어요</span>';
    } else if (b[jarKey] >= it.price) {
      action = `<button class="btn small" data-action="shop-buy" data-id="${it.id}">사기</button>`;
    } else {
      action = `<small class="muted">${it.price - b[jarKey]}개 더 모아요</small>`;
    }
    return `<div class="shop-item ${it.big ? 'big' : ''}">
      <span class="shop-icon ${it.kind === 'egg' ? 'egg-rainbow' : ''}"><span class="${it.kind === 'egg' ? 'egg' : ''}">${it.icon}</span></span>
      <b>${esc(it.name)}</b><small>🔮 ${it.price}</small>
      ${it.big && !have ? bar(b.save / it.price, '#4dabf7') : ''}
      ${action}
    </div>`;
  };
  const badge = shareBadgeOf(b.sharedTotal);
  const nextBadge = SHARE_BADGES.find((x) => b.sharedTotal < x.at);
  const met = metVillagers(s).map(getVillager).filter(Boolean);
  const canShare = b.share >= SHARE_COST;
  return `
    <section class="card pouch">
      <span class="orb">🔮</span>
      <div><h3>구슬 주머니 ${b.pouch}개</h3>
        <p>펫 팀이 퀘스트를 할 때마다 구슬을 만들어 와요. 어느 저금통에 넣을지 직접 정해 보세요!</p></div>
    </section>
    <div class="jars">
      ${jar('spend', '🛍️', '쓰기', '작은 꾸미기 물건을 사요')}
      ${jar('save', '🏦', '모으기', `큰 꿈을 위해 모아요. 월요일마다 이자 ${Math.round(INTEREST_RATE * 100)}%${interest ? ` (다음 월요일 +${interest})` : ''}`)}
      ${jar('share', '💝', '나누기', '마을 사람과 가족에게 빛을 나눠요')}
    </div>
    <p class="muted small">모으기·나누기 저금통에 넣은 구슬은 다시 꺼낼 수 없어요. 잘 생각해서 넣어요!</p>

    <h3 class="section-title">🛍️ 꾸미기 가게 <small class="muted">쓰기 저금통으로 사요</small></h3>
    <div class="shop">${SHOP.filter((it) => !it.big).map(item).join('')}</div>
    <h3 class="section-title">🏦 큰 꿈 <small class="muted">모으기 저금통으로만 살 수 있어요</small></h3>
    <div class="shop">${SHOP.filter((it) => it.big).map(item).join('')}</div>

    <h3 class="section-title">💝 나누기 <small class="muted">한 번에 🔮 ${SHARE_COST}개</small></h3>
    <section class="card share-card">
      <p class="badge-line">${badge ? `${badge.icon} <b>${badge.name}</b> · ` : ''}지금까지 나눈 구슬 ${b.sharedTotal}개
        ${nextBadge ? `<small class="muted">— ${nextBadge.at - b.sharedTotal}개 더 나누면 ${nextBadge.icon} ${nextBadge.name}</small>` : ''}</p>
      <div class="row">${PARENT_IDS.map((who) => {
        const p = s.parents[who];
        return `<button class="btn small" data-action="share-gift" data-to="${who}" ${canShare ? '' : 'disabled'}>🎁 ${esc(p.avatar)} ${esc(p.name)}에게 선물</button>`;
      }).join('')}</div>
      ${met.length ? `<div class="villager-list">${met.map((v) => `
        <div class="villager-row"><span>${v.emoji}</span><b>${esc(v.name)}</b>
          ${b.gifts[v.id] ? `<small>✨ ${b.gifts[v.id]}번</small>` : ''}
          <button class="btn small" data-action="share-gift" data-to="${v.id}" ${canShare ? '' : 'disabled'}>빛 나눠 주기</button></div>`).join('')}</div>`
        : '<p class="muted small">지도에서 마을 사람을 만나면 여기서 빛을 나눠 줄 수 있어요.</p>'}
    </section>`;
}

export const actions = {
  hatch: (el) => store.update((s) => hatch(s, Number(el.dataset.index))),
  // 펫을 누르면 정보창(pet-info), 대장 바꾸기(companion)는 ui/actions.js 공통 동작
  'team-toggle': (el) => {
    const result = store.update((s) => toggleTeam(s, el.dataset.id));
    if (result === 'leader') toast('대장은 뺄 수 없어요. 펫 정보창에서 다른 펫을 대장으로 정해 보세요.');
    if (result === 'full') toast(`팀은 ${TEAM_SIZE}마리까지예요. 먼저 한 마리를 빼 주세요.`);
  },
  'jar-put': (el) => store.update((s) => putInJar(s, el.dataset.jar, Number(el.dataset.n))),
  'shop-buy': (el) => {
    const item = store.update((s) => buyItem(s, el.dataset.id));
    if (item && !item.big) toast(`${item.icon} ${item.name}${josa(item.name, '을', '를')} 샀어요!`);
  },
  'hat-wear': (el) => store.update((s) => {
    s.bank.hat = el.dataset.id || null;
  }),
  'share-gift': (el) => {
    const to = el.dataset.to;
    const isParent = PARENT_IDS.includes(to);
    const ok = store.update((s) => {
      if (!shareGift(s, to)) return false;
      if (isParent) grant(s, { who: to, xp: PARENT_GIFT_XP, text: '빛 구슬 선물을 받았다' });
      else s.celebrations.unshift({ type: 'gift', villager: to, n: s.bank.gifts[to] });
      return true;
    });
    if (ok && isParent) {
      const { name } = store.get().parents[to];
      toast(`${name}에게 빛을 선물했어요! ${name}${josa(name, '이', '가')} 무척 기뻐해요.`);
    }
  },
};
