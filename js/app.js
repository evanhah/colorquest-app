// 앱 시작점: 주소(#/화면이름)에 따라 화면을 그리고, 버튼·입력 이벤트를 각 화면의 동작에 연결한다.
//
//   data-action="이름"  클릭       data-change="이름"  값 변경       data-input="이름"  입력 중
//
// 처리기는 현재 화면의 actions → 공통 sharedActions 순으로 찾는다.

import { store, ui } from './state.js';
import { sharedActions } from './ui/actions.js';
import { overlayHtml } from './ui/overlay.js';
import { validateData } from './data/index.js';
import { needsPlan, ensurePlans, dayProgress, pendingCount } from './core/game.js';
import { levelInfo, rankOf } from './core/level.js';
import { esc } from './core/util.js';
import * as me from './views/me.js';
import * as quests from './views/quests.js';
import * as pets from './views/pets.js';
import * as party from './views/party.js';
import * as parent from './views/parent.js';
import * as setup from './views/setup.js';

const VIEWS = { me, quests, pets, party, parent };

const app = document.getElementById('app');
const overlay = document.getElementById('overlay');
const pageTitle = document.getElementById('page-title');
const heroChip = document.getElementById('hero-chip');
const tabbar = document.querySelector('.tabbar');
let current = null;

function parseRoute() {
  const [name, ...args] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { name: VIEWS[name] ? name : 'me', args };
}

function setBadge(tab, count) {
  const badge = tabbar.querySelector(`[data-tab="${tab}"] b`);
  badge.hidden = !count;
  badge.textContent = count;
}

function render() {
  // 날짜·주가 바뀌었으면 오늘·이번 주 퀘스트를 먼저 만든다
  if (store.get().setupDone && needsPlan(store.get())) store.update((s) => ensurePlans(s), { silent: true });
  const s = store.get();
  const route = parseRoute();
  const view = s.setupDone ? VIEWS[route.name] : setup;
  current = { route, view };

  app.innerHTML = view.render(route);
  overlay.innerHTML = overlayHtml(route);
  document.body.classList.toggle('modal-open', Boolean(overlay.innerHTML));
  pageTitle.textContent = view.title(route);
  document.title = s.setupDone ? `${view.title(route)} · 컬러 퀘스트` : '컬러 퀘스트';

  // 되찾은 색이 앱의 강조색이 된다 (처음엔 회색 → 빨강 → 주황 …)
  const { level } = levelInfo(s.hero.xp);
  const rank = rankOf(level);
  document.documentElement.style.setProperty('--accent', rank.ui);
  document.body.dataset.rank = rank.id;

  tabbar.hidden = !s.setupDone;
  heroChip.innerHTML = s.setupDone ? `<span>${esc(s.hero.avatar)}</span> Lv.${level}` : '';
  if (s.setupDone) {
    tabbar.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.tab === route.name));
    const prog = dayProgress(s);
    setBadge('quests', prog.total - prog.done);
    setBadge('pets', s.eggsWaiting.length);
    setBadge('parent', pendingCount(s));
  }
}

function dispatch(kind, event) {
  const el = event.target.closest(`[data-${kind}]`);
  if (!el || !current) return;
  const name = el.dataset[kind];
  const handler = current.view.actions?.[name] ?? sharedActions[name];
  if (handler) handler(el, event, current.route);
  else console.warn(`처리기 없음: data-${kind}="${name}"`);
}

document.addEventListener('click', (e) => dispatch('action', e));
document.addEventListener('change', (e) => dispatch('change', e));
document.addEventListener('input', (e) => dispatch('input', e));

window.addEventListener('hashchange', () => {
  // 부모 화면을 떠나면 다시 잠근다
  if (parseRoute().name !== 'parent') {
    ui.parentOk = false;
    ui.pin = '';
  }
  ui.modal = null;
  render();
  window.scrollTo(0, 0);
});
// 밤새 켜 둔 iPad를 다시 열었을 때 새 날의 퀘스트가 나오게
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') render();
});
store.subscribe(render);
render();

// 개발 중(로컬)에는 데이터 오타를 콘솔에서 바로 확인한다
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  const problems = validateData();
  if (problems.length) console.warn(`데이터 점검: ${problems.length}건\n${problems.join('\n')}`);
  else console.info('데이터 점검: 문제 없음');
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
