// 앱 상태 저장소: 캐릭터·퀘스트 기록·설정을 이 기기(iPad) 브라우저의 localStorage 에 저장한다.
// 기기 안에만 있으므로 부모 모드의 '백업'으로 가끔 파일을 내보내 두어야 한다.

import { DEFAULT_VALUES } from './data/values.js';
import { DEFAULT_ROUTINES } from './data/quests.js';
import { DEFAULT_PRIVILEGES } from './data/titles.js';
import { STAT_IDS, START_STAT } from './data/stats.js';

const KEY = 'colorquest:v1';
const VERSION = 1;

export const defaults = () => ({
  version: VERSION,
  setupDone: false,
  seed: Math.random().toString(36).slice(2, 10), // 집집마다 퀘스트 순서가 다르게
  createdAt: null,
  hero: {
    name: '',
    avatar: '🧒',
    xp: 0,
    bestLevel: 1,                // 축하를 이미 보여 준 레벨 (되돌리기 후 다시 올라도 두 번 축하하지 않게)
    stats: Object.fromEntries(STAT_IDS.map((id) => [id, START_STAT])),
    companion: null,             // 함께 다니는 펫 id
  },
  parents: {
    dad: { name: '아빠', avatar: '👨', xp: 0, bestLevel: 1 },
    mom: { name: '엄마', avatar: '👩', xp: 0, bestLevel: 1 },
  },
  pin: '',                       // 부모 모드 숫자 4자리 (아이 손이 실수로 닿지 않게 하는 정도의 잠금)
  values: structuredClone(DEFAULT_VALUES),
  customQuests: [],              // 부모가 더한 퀘스트 { id, kind, value, text, coop? }
  offQuests: [],                 // 부모가 끈 기본 퀘스트 id
  routines: structuredClone(DEFAULT_ROUTINES),
  hiddenCustom: [],              // 부모가 더한 히든 퀘스트 { id, text, hint, stat }
  privileges: structuredClone(DEFAULT_PRIVILEGES),
  settings: { dailyCount: 2, challengeCount: 3 },
  days: {},                      // { 'YYYY-MM-DD': { quests, challenges, picked, done: { id: true } } }
  weeks: {},                     // { 월요일: { missions: [id], status: { id: { state, with, date } }, vault } }
  parentWeeks: {},               // { 월요일: { dad: [id], mom: [id], done: { 'dad:id': true } } }
  lastSeen: {},                  // { 퀘스트 id: 마지막으로 뽑힌 날 } — 같은 퀘스트 반복 방지
  storyUsed: [],                 // 이미 나온 이야기 퀘스트 id
  hidden: {},                    // 발견한 히든 퀘스트 { id: { date, by, note } }
  praise: [],                    // 칭찬 카드 { id, from, to, stat, text, date }
  egg: { warmth: 0, need: 200, laid: 0 }, // 품고 있는 보통 알
  eggsWaiting: [],               // 부화를 기다리는 알 종류 ('normal' | 'gold' | 'rainbow' | 'divine')
  landEggs: 0,                   // 지금까지 받은 수호 알(디바인 알) 수 = 도착한 빛깔 땅 수 (회색 마을 빼고)
  pets: {},                      // { 펫 id: { count, first } }
  map: { lastTile: 0, claimed: {} }, // 모험 지도: 지난번에 보여 준 칸(걷는 애니메이션용), 연 이벤트 { 칸: 날짜 }
  stars: { total: 0 },           // 일일 퀘스트를 모두 끝낸 날 수 = 밤하늘의 별 (data/sky.js)
  log: [],                       // 모험 일지 { date, who, text, xp, stat, n } (최근 것이 앞)
  celebrations: [],              // 아이에게 보여 줄 축하 창
  lastBackup: null,
});

/** 저장된 값(또는 백업)을 지금 앱 모양에 맞춘다. 새로 생긴 기본 가치는 채워 넣는다. */
export function normalize(saved) {
  const base = defaults();
  const s = { ...base, ...saved };
  s.hero = { ...base.hero, ...saved.hero, stats: { ...base.hero.stats, ...saved.hero?.stats } };
  s.parents = {
    dad: { ...base.parents.dad, ...saved.parents?.dad },
    mom: { ...base.parents.mom, ...saved.parents?.mom },
  };
  s.settings = { ...base.settings, ...saved.settings };
  s.egg = { ...base.egg, ...saved.egg };
  s.map = { ...base.map, ...saved.map };
  s.stars = { ...base.stars, ...saved.stars };
  const valueIds = new Set(s.values.map((v) => v.id));
  DEFAULT_VALUES.forEach((v) => {
    if (!valueIds.has(v.id)) s.values.push({ ...v });
  });
  return s;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return saved && typeof saved === 'object' ? normalize(saved) : defaults();
  } catch {
    return defaults();
  }
}

let state = load();
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장이 막혀도 앱은 계속 동작한다 (다음 저장 때 다시 시도)
  }
}

const notify = () => listeners.forEach((fn) => fn(state));

export const store = {
  get: () => state,
  /** mutator 안에서 draft 를 고치면 저장 후 화면을 다시 그린다. silent 면 다시 그리지 않는다. */
  update(mutator, { silent = false } = {}) {
    const draft = structuredClone(state);
    const result = mutator(draft);
    state = draft;
    persist();
    if (!silent) notify();
    return result;
  },
  refresh: notify,
  replace(next) {
    state = next;
    persist();
    notify();
  },
  reset() {
    state = defaults();
    persist();
    notify();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// ── 백업 ──
export function backupText(s) {
  return JSON.stringify({ app: 'colorquest', version: VERSION, savedAt: new Date().toISOString(), state: s });
}

export function parseBackup(text) {
  const data = JSON.parse(text);
  const saved = data?.app === 'colorquest' ? data.state : null;
  if (!saved || typeof saved !== 'object' || !saved.hero) throw new Error('컬러 퀘스트 백업이 아니에요');
  return normalize(saved);
}

// 저장하지 않는 화면 상태
export const ui = {
  modal: null,      // { type: 'story' | 'kidPraise', ... }
  parentOk: false,  // 부모 모드 잠금 해제 여부 (부모 화면을 떠나면 다시 잠김)
  pin: '',          // 입력 중인 비밀번호
  pinError: false,
  setup: { name: '', avatar: '🧒', strengths: [], pin: '', dad: '아빠', mom: '엄마' },
  drafts: {},       // 입력 중인 글 (화면을 다시 그려도 남게) — data-input="draft" data-key="이름"
  open: {},         // 펼친 항목
};

/** 목록에 값이 있으면 빼고 없으면 넣는다. */
export function toggleIn(list, value) {
  const at = list.indexOf(value);
  if (at >= 0) list.splice(at, 1);
  else list.push(value);
}
