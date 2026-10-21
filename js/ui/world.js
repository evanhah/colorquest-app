// 회색 마을 그림. 빛깔 단계(rankIdx)까지 되찾은 색만 칠하고, 나머지는 회색으로 그린다.
//   빨강 지붕·꽃 · 주황 해 · 노랑 창문·해바라기 · 초록 풀밭·나무 · 파랑 하늘·강 · 남색 산 · 보라 문·라벤더 · 무지개
// 아이 아바타와 함께 다니는 펫도 마을 안에 서 있다.

import { RANKS } from '../data/titles.js';
import { esc } from '../core/util.js';

const at = Object.fromEntries(RANKS.map((r, i) => [r.id, i]));

export function worldSvg(rankIdx, { avatar = '', pet = '' } = {}) {
  const c = (rank, color, gray) => (rankIdx >= at[rank] ? color : gray);
  const sky = c('blue', '#d0ebff', '#e9ecef');
  const sun = c('orange', '#ff922b', '#ced4da');
  const mtnA = c('indigo', '#4c6ef5', '#adb5bd');
  const mtnB = c('indigo', '#748ffc', '#ced4da');
  const grass = c('green', '#8ce99a', '#dee2e6');
  const leaf = c('green', '#40c057', '#adb5bd');
  const trunk = c('green', '#a0703c', '#868e96');
  const river = c('blue', '#4dabf7', '#ced4da');
  const roof = c('red', '#fa5252', '#868e96');
  const win = c('yellow', '#ffd43b', '#ced4da');
  const door = c('purple', '#ae3ec9', '#868e96');
  const red = c('red', '#ff6b6b', '#adb5bd');
  const yellow = c('yellow', '#fcc419', '#adb5bd');
  const purple = c('purple', '#cc5de8', '#adb5bd');
  const stem = c('green', '#2f9e44', '#adb5bd');
  const rainbow = rankIdx >= at.rainbow
    ? ['#fa5252', '#ff922b', '#fcc419', '#51cf66', '#339af0', '#4c6ef5', '#cc5de8']
      .map((col, i) => `<path d="M${70 + i * 5},112 A${130 - i * 5},${92 - i * 5} 0 0 1 ${330 - i * 5},112" fill="none" stroke="${col}" stroke-width="5" opacity=".75"/>`).join('')
    : '';
  const flower = (x, y, col) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 9}" stroke="${stem}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="3.6" fill="${col}"/>`;
  const sunflower = (x, y) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 16}" stroke="${stem}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="5.5" fill="${yellow}"/><circle cx="${x}" cy="${y}" r="2" fill="#795548" opacity=".6"/>`;
  const lavender = (x, y) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 11}" stroke="${stem}" stroke-width="1.5"/><ellipse cx="${x}" cy="${y}" rx="2" ry="4.5" fill="${purple}"/>`;
  const tree = (x) => `<rect x="${x - 4}" y="88" width="8" height="22" fill="${trunk}"/><circle cx="${x}" cy="80" r="17" fill="${leaf}"/><circle cx="${x - 9}" cy="88" r="10" fill="${leaf}"/><circle cx="${x + 9}" cy="88" r="10" fill="${leaf}"/>`;

  return `<svg class="world" viewBox="0 0 400 150" role="img" aria-label="되찾은 색 ${rankIdx}개인 마을" preserveAspectRatio="xMidYMid slice">
    <rect width="400" height="150" fill="${sky}"/>
    ${rainbow}
    <circle cx="338" cy="34" r="17" fill="${sun}"/>
    <g fill="#fff" opacity=".9"><ellipse cx="78" cy="30" rx="26" ry="8"/><ellipse cx="96" cy="24" rx="16" ry="8"/><ellipse cx="250" cy="22" rx="20" ry="6"/></g>
    <polygon points="-10,112 70,50 150,112" fill="${mtnA}"/>
    <polygon points="110,112 205,38 300,112" fill="${mtnB}"/>
    <polygon points="250,112 330,58 410,112" fill="${mtnA}"/>
    <rect y="106" width="400" height="44" fill="${grass}"/>
    <path d="M0,138 C70,128 140,148 220,136 S350,128 400,140 V150 H0 Z" fill="${river}"/>
    ${tree(48)}${tree(356)}
    <g stroke="#495057" stroke-width="1.5">
      <rect x="166" y="84" width="68" height="36" fill="#f8f9fa"/>
      <polygon points="158,86 200,58 242,86" fill="${roof}"/>
      <rect x="174" y="92" width="14" height="12" fill="${win}"/>
      <rect x="212" y="92" width="14" height="12" fill="${win}"/>
      <rect x="194" y="100" width="12" height="20" fill="${door}"/>
    </g>
    ${flower(112, 116, red)}${flower(122, 120, red)}${flower(268, 118, red)}
    ${sunflower(250, 100)}${sunflower(150, 98)}
    ${lavender(298, 116)}${lavender(305, 112)}${lavender(312, 116)}
    ${avatar ? `<text x="84" y="128" font-size="26" text-anchor="middle">${esc(avatar)}</text>` : ''}
    ${pet ? `<text x="108" y="132" font-size="17" text-anchor="middle">${esc(pet)}</text>` : ''}
  </svg>`;
}

/** 되찾은 색 일곱 개 점 (무지개 단계에서는 모두 칠해짐) */
export function colorDots(rankIdx) {
  return `<div class="color-dots" aria-label="되찾은 색 ${Math.min(rankIdx, 7)}/7">${RANKS.slice(1, 8)
    .map((r, i) => `<span class="${rankIdx > i ? 'got' : ''}" style="--c:${r.color}" title="${r.name}"></span>`).join('')}
    <small>되찾은 색 ${Math.min(rankIdx, 7)}/7</small></div>`;
}
