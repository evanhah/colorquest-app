// 여러 화면에서 공통으로 쓰는 동작(축하 창·이야기 창·칭찬 보내기·입력 임시 저장·백업 불러오기).
// 각 화면 전용 동작은 views/*.js 의 actions 에 있고, 같은 이름이면 화면 쪽이 우선한다.

import { store, ui, parseBackup } from '../state.js';
import { toast, confirmTap, josa } from '../core/util.js';
import { levelInfo } from '../core/level.js';
import { hatch, requestMission, givePraise } from '../core/game.js';
import { openMapEvent } from '../core/map.js';
import { setLeader, toggleTeam } from '../core/pets.js';
import { getPet } from '../data/pets.js';

function closeModal() {
  ui.modal = null;
  store.refresh();
}

/** 백업 글자를 읽어 확인 상자(ui.drafts.restore)를 준비한다. 컬러 퀘스트 백업이 아니면 false. */
export function prepareRestore(text) {
  try {
    const state = parseBackup(text);
    ui.drafts.restore = {
      state,
      name: state.hero.name || '이름 없음',
      level: levelInfo(state.hero.xp).level,
      savedAt: JSON.parse(text).savedAt?.slice(0, 10) || '날짜 모름',
    };
    return true;
  } catch {
    toast('컬러 퀘스트 백업이 아니에요');
    return false;
  }
}

export const sharedActions = {
  // 축하 창
  'celebrate-ok': () => store.update((s) => {
    s.celebrations.shift();
  }),
  'celebrate-hatch': (el) => store.update((s) => {
    s.celebrations.shift();
    const at = el.dataset.egg ? s.eggsWaiting.lastIndexOf(el.dataset.egg) : 0;
    hatch(s, Math.max(0, at));
  }),

  // 창 열고 닫기
  'modal-close': closeModal,
  'story-open': (el) => {
    ui.modal = { type: 'story', id: el.dataset.id, monday: el.dataset.monday };
    store.refresh();
  },
  'story-done': (el) => {
    const { id, monday } = ui.modal;
    ui.modal = null;
    store.update((s) => requestMission(s, monday, id, el.dataset.who));
    toast('아빠·엄마가 확인하면 열쇠를 받아요!');
  },
  'kid-praise-open': (el) => {
    ui.modal = { type: 'kidPraise', to: el.dataset.to };
    ui.drafts.kidPraise = '';
    store.refresh();
  },
  'kid-praise-preset': (el) => {
    ui.drafts.kidPraise = el.dataset.text;
    store.refresh();
  },
  'kid-praise-send': () => {
    const text = (ui.drafts.kidPraise || '').trim();
    if (!text) {
      toast('칭찬할 말을 골라 보거나 써 주세요');
      return;
    }
    const { to } = ui.modal;
    const name = store.get().parents[to].name;
    ui.modal = null;
    ui.drafts.kidPraise = '';
    store.update((s) => givePraise(s, { from: 'hero', to, text }));
    toast(`${name}에게 칭찬 카드를 보냈어요! ${name}${josa(name, '이', '가')} 무척 기뻐할 거예요.`);
  },

  // 펫·땅·마을 사람 정보창 (도감과 지도에서 같이 쓴다) — 못 만난 펫도 어떤 펫인지 볼 수 있다
  'pet-info': (el) => {
    ui.modal = { type: 'pet', id: el.dataset.id };
    store.refresh();
  },
  'land-info': (el) => {
    ui.modal = { type: 'land', id: el.dataset.id };
    store.refresh();
  },
  'villager-info': (el) => {
    ui.modal = { type: 'villager', id: el.dataset.id };
    store.refresh();
  },
  companion: (el) => {
    ui.modal = null;
    store.update((s) => setLeader(s, el.dataset.id));
    const { name } = getPet(el.dataset.id);
    toast(`${name}${josa(name, '이', '가')} 펫 팀 대장이 됐어요! 함께 다녀요.`);
  },
  // 펫 정보창에서 펫 팀에 넣기/빼기
  'team-toggle': (el) => {
    const result = store.update((s) => toggleTeam(s, el.dataset.id));
    if (result === 'full') toast('팀은 3마리까지예요. 펫 팀 화면에서 한 마리를 먼저 빼 주세요.');
  },
  // 지도에서 지나온 보물 상자·마을 사람 열기
  'map-event': (el) => store.update((s) => openMapEvent(s, Number(el.dataset.tile))),

  // 입력 중인 글은 화면을 다시 그리지 않고 기억만 해 둔다
  draft: (el) => {
    ui.drafts[el.dataset.key] = el.value;
  },

  // 백업 파일 고르기 → 확인 상자 → 바꾸기
  'backup-file': (el) => {
    const file = el.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      prepareRestore(text);
      el.value = '';
      store.refresh();
    });
  },
  'restore-apply': (el) => confirmTap(el, '한 번 더 누르면 바뀌어요', () => {
    const { state } = ui.drafts.restore;
    ui.drafts.restore = null;
    store.replace(state);
    toast('백업을 불러왔어요');
  }),
  'restore-cancel': () => {
    ui.drafts.restore = null;
    store.refresh();
  },
};
