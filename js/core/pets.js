// 펫 팀 규칙: 팀 구성, 퀘스트 때 펫이 하는 일(빛 구슬·탐험), 재능 코치, 저금통·가게·나눔·이자.
// 상태: s.team(대장 말고 팀원 id), s.pets[id].trip(탐험 걸음)·cards(모은 카드 수), s.bank(주머니·저금통).
// 대장 = 함께 다니는 펫(s.hero.companion). 데이터와 원칙은 data/petpower.js.

import { getPet } from '../data/pets.js';
import {
  TEAM_SIZE, ORB_BY_RARITY, TRIP_QUESTS, TRIP_BONUS, TALENT, CARDS, COACH_TIPS,
  INTEREST_RATE, INTEREST_MAX, SHARE_COST, SHARE_BADGES, getItem,
} from '../data/petpower.js';
import { seededRandom } from './util.js';

/** 펫 팀(대장이 맨 앞, 최대 3마리, 가진 펫만) */
export function teamOf(s) {
  const ids = [s.hero.companion, ...s.team.filter((id) => id !== s.hero.companion)];
  return ids.filter((id) => id && s.pets[id]).slice(0, TEAM_SIZE).map(getPet).filter(Boolean);
}

export const inTeam = (s, id) => teamOf(s).some((p) => p.id === id);
export const orbsPerQuest = (s) => teamOf(s).reduce((sum, p) => sum + ORB_BY_RARITY[p.rarity], 0);

/** 팀에 넣기/빼기. 결과 메시지를 돌려준다(대장은 뺄 수 없음, 자리가 꽉 차면 못 넣음). */
export function toggleTeam(s, id) {
  if (!s.pets[id]) return null;
  if (id === s.hero.companion) return 'leader';
  if (s.team.includes(id)) {
    s.team = s.team.filter((x) => x !== id);
    return 'out';
  }
  if (teamOf(s).length >= TEAM_SIZE) return 'full';
  s.team.push(id);
  return 'in';
}

/** 대장(함께 다니는 펫) 바꾸기: 예전 대장은 자리가 있으면 팀원으로 남는다 */
export function setLeader(s, id) {
  if (!s.pets[id]) return;
  const old = s.hero.companion;
  s.hero.companion = id;
  s.team = [old, ...s.team].filter((x) => x && x !== id).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, TEAM_SIZE - 1);
}

/** 새로 부화한 펫은 팀에 빈자리가 있으면 들어간다 */
export function joinIfRoom(s, id) {
  if (id !== s.hero.companion && !s.team.includes(id) && teamOf(s).length < TEAM_SIZE) s.team.push(id);
}

/**
 * 현실 퀘스트 하나를 끝냈을 때 펫 팀이 하는 일: 빛 구슬 만들기 + 탐험 한 걸음.
 * 탐험이 끝난 펫은 지식 카드를 가져온다(다 모았으면 구슬을 더 가져온다). 만든 구슬 수를 돌려준다.
 */
export function petWork(s) {
  let orbs = 0;
  teamOf(s).forEach((p) => {
    orbs += ORB_BY_RARITY[p.rarity];
    const mine = s.pets[p.id];
    mine.trip = (mine.trip || 0) + 1;
    if (mine.trip < TRIP_QUESTS[p.rarity]) return;
    mine.trip = 0;
    const cards = CARDS[p.id] || [];
    if ((mine.cards || 0) < cards.length) {
      mine.cards = (mine.cards || 0) + 1;
      s.celebrations.push({ type: 'card', pet: p.id, n: mine.cards });
    } else {
      orbs += ORB_BY_RARITY[p.rarity] * TRIP_BONUS;
    }
  });
  s.bank.pouch += orbs;
  return orbs;
}

/** 실수로 누른 완료를 되돌릴 때: 아직 주머니에 있으면 구슬과 탐험 걸음을 되돌린다. 되돌렸으면 true. */
export function petUndo(s, orbs) {
  if (!orbs || s.bank.pouch < orbs) return false;
  s.bank.pouch -= orbs;
  teamOf(s).forEach((p) => {
    if (s.pets[p.id].trip > 0) s.pets[p.id].trip -= 1;
  });
  return true;
}

/** 오늘 퀘스트의 능력치에 재능이 맞는 팀 펫과 꿀팁 (없으면 null) */
export function coachFor(s, stat, seed) {
  const pet = teamOf(s).find((p) => TALENT[p.id] === stat);
  if (!pet) return null;
  const pool = COACH_TIPS[stat][pet.rarity === 'legend' || pet.rarity === 'divine' ? 'challenge' : 'basic'];
  return { pet, tip: pool[Math.floor(seededRandom(seed)() * pool.length)] };
}

// ── 저금통 ──

/** 주머니에서 저금통으로 옮기기 (spend 쓰기 · save 모으기 · share 나누기). 모으기·나누기는 다시 꺼낼 수 없다. */
export function putInJar(s, jar, n) {
  const k = Math.min(n, s.bank.pouch);
  if (k <= 0 || !['spend', 'save', 'share'].includes(jar)) return 0;
  s.bank.pouch -= k;
  s.bank[jar] += k;
  return k;
}

export const nextInterest = (s) => (s.bank.save > 0 ? Math.min(INTEREST_MAX, Math.floor(s.bank.save * INTEREST_RATE)) : 0);

/** 월요일마다 모으기 저금통에 이자. 처음 한 번은 기준만 정한다. */
export function applyInterest(s, monday) {
  if (s.bank.lastInterest && monday <= s.bank.lastInterest) return; // 같은 주이거나 기기 날짜가 거꾸로 간 경우
  const first = !s.bank.lastInterest;
  s.bank.lastInterest = monday;
  const gain = first ? 0 : nextInterest(s);
  if (gain <= 0) return;
  s.bank.save += gain;
  s.celebrations.push({ type: 'interest', gain });
}

/** 가게: 작은 물건은 쓰기, 큰 물건은 모으기 저금통으로. 산 물건을 돌려준다(못 사면 null). */
export function buyItem(s, id) {
  const item = getItem(id);
  if (!item) return null;
  const jar = item.big ? 'save' : 'spend';
  if (s.bank[jar] < item.price || (item.kind !== 'egg' && s.bank.owned.includes(id))) return null;
  s.bank[jar] -= item.price;
  if (item.kind === 'egg') s.eggsWaiting.push('rainbow');
  else s.bank.owned.push(id);
  if (item.kind === 'hat') s.bank.hat = id;
  if (item.big) s.celebrations.push({ type: 'bigdream', id });
  return item;
}

export const shareBadgeOf = (total) => SHARE_BADGES.filter((b) => total >= b.at).pop() || null;

/** 나누기 저금통에서 한 번 나누기. target: 마을 사람 id 또는 'dad'·'mom'. 나눴으면 true. */
export function shareGift(s, target) {
  if (s.bank.share < SHARE_COST) return false;
  const before = shareBadgeOf(s.bank.sharedTotal);
  s.bank.share -= SHARE_COST;
  s.bank.sharedTotal += SHARE_COST;
  s.bank.gifts[target] = (s.bank.gifts[target] || 0) + 1;
  const after = shareBadgeOf(s.bank.sharedTotal);
  if (after && after !== before) s.celebrations.push({ type: 'shareBadge', at: after.at });
  return true;
}
