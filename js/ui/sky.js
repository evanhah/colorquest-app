// 밤하늘 별자리 그림: 켜진 별은 노랗게 빛나고, 켜진 별끼리 선으로 잇는다.

import { esc } from '../core/util.js';

// 배경의 작은 별(고정 위치)
const DUST = [[8, 12], [26, 6], [44, 92], [90, 8], [96, 70], [4, 60], [72, 94], [60, 4], [14, 94], [88, 88]];

export function skySvg(constellation, lit) {
  const pts = constellation.points;
  const lines = [];
  for (let i = 1; i < lit; i += 1) lines.push([pts[i - 1], pts[i]]);
  if (constellation.close && lit >= pts.length) lines.push([pts[pts.length - 1], pts[0]]);
  return `<svg class="sky" viewBox="-6 -6 112 112" role="img" aria-label="${esc(constellation.name)} 별 ${lit}개">
    ${DUST.map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".7" class="dust"/>`).join('')}
    ${lines.map(([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="sky-line"/>`).join('')}
    ${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i < lit ? 3.6 : 2}" class="${i < lit ? 'lit' : 'dim'}"/>`).join('')}
  </svg>`;
}
