// 모험 지도: 경험치 10마다 한 칸씩, 아이 캐릭터와 함께 다니는 펫이 빛깔 땅 9곳을 잇는 길을 걷는다.
// 한 장에 24칸(4줄 × 6칸)을 보여 주고, 지도를 열 때 지난번 이후 걸은 만큼 한 칸씩 걸어가는 애니메이션을 보여 준다.
// 길 위의 🎁 보물 상자·💬 마을 사람은 지나오면 반짝이고, 누르면 열린다. 줄 사이에는 그 땅에 사는 펫들이 있다.

import { store } from '../state.js';
import { esc } from '../core/util.js';
import { RANKS } from '../data/titles.js';
import { LANDS, PAGE_TILES, getVillager } from '../data/map.js';
import { PETS, getPet } from '../data/pets.js';
import { tileOf, landIndexOf, eventAt, pendingEvents, nextEvent } from '../core/map.js';

export const title = () => '모험 지도';

const COLS = 6;
const ROWS = PAGE_TILES / COLS;
const ROW_GAP = 130;
const BOTTOM = 500;

/** 한 장 안 k번째 칸의 좌표: 아래 줄부터 지그재그로 올라간다 */
function tilePos(k) {
  const row = Math.floor(k / COLS);
  const col = k % COLS;
  return [45 + (row % 2 ? COLS - 1 - col : col) * 62, BOTTOM - row * ROW_GAP];
}

function roadPath() {
  let d = '';
  for (let k = 0; k < PAGE_TILES; k += 1) {
    const [x, y] = tilePos(k);
    if (!k) d = `M${x},${y}`;
    else if (k % COLS) d += ` L${x},${y}`;
    else {
      const [px, py] = tilePos(k - 1);
      const out = px > 200 ? 40 : -40;
      d += ` C${px + out},${py} ${x + out},${y} ${x},${y}`;
    }
  }
  return d;
}

const landOf = (tile) => RANKS[landIndexOf(tile)];
const tileColor = (rank) => (rank.id === 'gray' ? '#868e96' : rank.color);

function tileSvg(s, t, now) {
  const [x, y] = tilePos(t % PAGE_TILES);
  const rank = landOf(t);
  const color = tileColor(rank);
  const passed = t <= now;
  const ev = eventAt(t);
  if (!ev) {
    return `<circle cx="${x}" cy="${y}" r="13" fill="${passed ? color : '#fff'}" stroke="${color}" stroke-width="3" opacity="${passed ? 1 : 0.85}"/>`;
  }
  const claimed = s.map.claimed[t];
  const ready = passed && (ev.type === 'chest' || ev.type === 'villager') && !claimed;
  let icon = '🏁';
  if (ev.type === 'gate') icon = rank.placeIcon;
  if (ev.type === 'villager') icon = passed ? getVillager(ev.id)?.emoji || '💬' : '❔';
  if (ev.type === 'chest') icon = claimed ? '✨' : '🎁';
  const label = ev.type === 'gate' ? `<text x="${x}" y="${y - 30}" class="gate-label" text-anchor="middle">${esc(rank.place)}</text>` : '';
  return `<g class="ev ${ready ? 'ready' : ''} ${passed ? '' : 'ahead'}" ${ready ? `data-action="map-event" data-tile="${t}"` : ''}>
    <circle cx="${x}" cy="${y}" r="21" fill="#fff" stroke="${color}" stroke-width="${ready ? 5 : 3}"/>
    <text x="${x}" y="${y + 8}" font-size="22" text-anchor="middle">${icon}</text>
    ${ready ? `<circle cx="${x + 16}" cy="${y - 16}" r="8" fill="#e03131"/><text x="${x + 16}" y="${y - 12}" class="bang" text-anchor="middle">!</text>` : ''}
  </g>${label}`;
}

/** 줄 위쪽 띠: 그 줄 땅의 색 + 꾸밈 + 그 땅에 사는 펫 하나(못 만난 펫은 그림자, 누르면 정보창) */
function rowScenery(s, row, first) {
  const midTile = first + row * COLS + 2;
  const rank = landOf(midTile);
  const land = LANDS[rank.id];
  const y = BOTTOM - row * ROW_GAP;
  const residents = PETS.filter((p) => p.home === rank.id);
  const pet = residents[(Math.floor(first / PAGE_TILES) * ROWS + row) % residents.length];
  const mono = rank.id === 'gray' ? 'mono' : '';
  return `<rect x="0" y="${y - ROW_GAP / 2}" width="400" height="${ROW_GAP}" fill="${land.tint}"/>
    <g class="decor ${mono}">
      <text x="100" y="${y - 52}" font-size="22" text-anchor="middle">${land.decor[row % 3]}</text>
      <text x="300" y="${y - 52}" font-size="22" text-anchor="middle">${land.decor[(row + 1) % 3]}</text>
    </g>
    ${pet ? `<g class="resident ${s.pets[pet.id] ? '' : 'unknown'}" data-action="pet-info" data-id="${pet.id}">
      <text x="200" y="${y - 48}" font-size="26" text-anchor="middle">${pet.emoji}</text></g>` : ''}`;
}

export function render() {
  const s = store.get();
  const now = tileOf(s.hero.xp);
  const li = landIndexOf(now);
  const here = RANKS[li];
  const first = Math.floor(now / PAGE_TILES) * PAGE_TILES;
  const pet = getPet(s.hero.companion);
  const start = Math.min(Math.max(s.map.lastTile, first), now); // 걷기 애니메이션은 여기서 출발
  const [wx, wy] = tilePos(start - first);
  const positions = Array.from({ length: PAGE_TILES }, (_, k) => tilePos(k));
  const pending = pendingEvents(s);
  const offPage = pending.filter((e) => e.tile < first);
  const chest = nextEvent(now, 'chest');
  const villager = nextEvent(now, 'villager');
  const nextLand = RANKS[li + 1];
  const newRoad = first > 0 && s.map.lastTile < first;

  return `
    <nav class="land-strip" aria-label="빛깔 땅">${RANKS.map((r, i) => `
      <button class="land-chip ${i === li ? 'on' : ''} ${i > li ? 'locked' : ''}" style="--c:${tileColor(r)}" data-action="land-info" data-id="${r.id}">
        <span>${i > li ? '🔒' : r.placeIcon}</span><small>${esc(r.place)}</small>
      </button>`).join('')}</nav>

    ${newRoad ? '<div class="notice good">🛤️ 새 길에 들어섰어요!</div>' : ''}

    <section class="map-card">
      <svg class="map-svg" viewBox="0 0 400 560" data-first="${first}" data-pos='${JSON.stringify(positions)}' role="img" aria-label="${esc(here.place)} ${now}번째 칸">
        ${Array.from({ length: ROWS }, (_, row) => rowScenery(s, row, first)).join('')}
        <path d="${roadPath()}" class="road"/>
        ${Array.from({ length: PAGE_TILES }, (_, k) => tileSvg(s, first + k, now)).join('')}
        <g id="walker" class="walker" style="transform: translate(${wx}px, ${wy}px)">
          ${pet ? `<text x="-22" y="4" font-size="24" text-anchor="middle" class="walker-pet">${pet.emoji}</text>` : ''}
          <text x="4" y="-12" font-size="36" text-anchor="middle">${esc(s.hero.avatar)}</text>
        </g>
      </svg>
    </section>

    <section class="card map-info">
      <div class="spread"><h3>${here.placeIcon} ${esc(here.place)}</h3><span class="pill">${now}번째 칸</span></div>
      <p class="muted">${esc(LANDS[here.id].desc)}</p>
      <ul class="next-list">
        ${chest ? `<li>🎁 다음 보물 상자까지 <b>${chest.left}칸</b></li>` : ''}
        ${villager ? `<li>💬 다음 마을 사람까지 <b>${villager.left}칸</b></li>` : ''}
        <li>${nextLand
          ? `${nextLand.placeIcon} 다음 땅 ${esc(nextLand.place)}까지 <b>${nextEvent(now, 'gate')?.left ?? '?'}칸</b> (Lv.${nextLand.from}에 ${esc(nextLand.name)} 되찾기)`
          : '🌈 모든 땅에 왔어요! 구름 섬에서 계속 걸어가요.'}</li>
      </ul>
      ${offPage.length ? `<div class="row">${offPage.map((e) =>
        `<button class="btn small" data-action="map-event" data-tile="${e.tile}">${e.type === 'chest' ? '🎁 보물 상자' : '💬 마을 사람'} 열기 (${e.tile}번째 칸)</button>`).join('')}</div>` : ''}
      <p class="muted small">한 칸 = 경험치 10. 현실에서 퀘스트를 하면 앞으로 걸어가요. 땅 이름을 누르면 그 땅에 사는 펫과 마을 사람을 볼 수 있어요.</p>
    </section>`;
}

/** 화면을 그린 뒤: 지난번 칸에서 지금 칸까지 한 칸씩 걸어간다 */
let walking = null;
export function after() {
  const svg = document.querySelector('.map-svg');
  const walker = document.getElementById('walker');
  if (!svg || !walker) return;
  const s = store.get();
  const now = tileOf(s.hero.xp);
  const first = Number(svg.dataset.first);
  const from = Math.min(Math.max(s.map.lastTile, first), now);
  // 먼저 저장해 두어서, 걷는 도중에 화면이 다시 그려져도 처음부터 다시 걷지 않게 한다
  if (s.map.lastTile !== now) store.update((d) => { d.map.lastTile = now; }, { silent: true });
  clearInterval(walking);
  if (from >= now || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const [x, y] = tilePos(now - first);
    walker.style.transform = `translate(${x}px, ${y}px)`;
    return;
  }
  const pos = JSON.parse(svg.dataset.pos);
  const step = Math.round(Math.max(140, Math.min(320, 2400 / (now - from))));
  walker.style.transitionDuration = `${step}ms`;
  let t = from;
  walking = setInterval(() => {
    t += 1;
    const [x, y] = pos[t - first];
    walker.style.transform = `translate(${x}px, ${y}px)`;
    walker.classList.toggle('hop');
    if (t >= now) clearInterval(walking);
  }, step);
}
