// 밤하늘 별자리: 일일 퀘스트를 모두 끝낸 날마다 별이 하나 켜지고, 7개면 별자리 하나가 완성된다.
// 연속일 필요는 없다(하루 빠져도 모은 별은 그대로). 12개를 다 모으면 처음부터 다시(2바퀴째).
// points 는 0~100 좌표, 켜진 별끼리 순서대로 잇는다. close 면 마지막 별과 첫 별도 잇는다.

export const STARS_PER_CONSTELLATION = 7;
export const ALLCLEAR_WARMTH = 20; // 다 끝낸 날 펫이 알을 안아 주는 온기

export const CONSTELLATIONS = [
  { id: 'egg', name: '알자리', icon: '🥚', close: true, points: [[50, 10], [70, 24], [78, 50], [68, 78], [50, 88], [32, 78], [22, 50]] },
  { id: 'rabbit', name: '토끼자리', icon: '🐰', points: [[34, 8], [38, 38], [62, 8], [58, 38], [50, 58], [34, 82], [66, 82]] },
  { id: 'key', name: '열쇠자리', icon: '🗝️', points: [[20, 30], [35, 14], [50, 30], [35, 46], [60, 56], [82, 76], [70, 88]] },
  { id: 'ball', name: '농구공자리', icon: '🏀', close: true, points: [[50, 10], [78, 28], [80, 64], [50, 88], [20, 64], [22, 28], [50, 50]] },
  { id: 'heart', name: '하트자리', icon: '❤️', close: true, points: [[50, 86], [20, 56], [18, 30], [34, 14], [50, 30], [66, 14], [82, 30]] },
  { id: 'brick', name: '블록자리', icon: '🧱', close: true, points: [[15, 42], [30, 24], [50, 24], [70, 24], [85, 42], [85, 80], [15, 80]] },
  { id: 'whale', name: '고래자리', icon: '🐳', points: [[8, 56], [28, 40], [54, 36], [74, 48], [86, 32], [94, 56], [60, 70]] },
  { id: 'crown', name: '왕관자리', icon: '👑', points: [[14, 76], [14, 30], [34, 52], [50, 14], [66, 52], [86, 30], [86, 76]] },
  { id: 'butterfly', name: '나비자리', icon: '🦋', points: [[50, 22], [20, 12], [14, 50], [50, 52], [86, 12], [80, 50], [50, 86]] },
  { id: 'dragon', name: '용자리', icon: '🐉', points: [[8, 72], [24, 56], [40, 66], [56, 44], [70, 54], [80, 30], [94, 18]] },
  { id: 'rainbow', name: '무지개자리', icon: '🌈', points: [[8, 80], [16, 50], [32, 28], [50, 20], [68, 28], [84, 50], [92, 80]] },
  { id: 'star', name: '큰별자리', icon: '⭐', close: true, points: [[50, 6], [62, 38], [94, 38], [68, 58], [78, 92], [50, 72], [22, 92]] },
];

/** 모은 별 수 → 지금 채우는 별자리와 켜진 별 수, 완성한 별자리 수 */
export function skyState(total) {
  const done = Math.floor(total / STARS_PER_CONSTELLATION);
  return {
    current: CONSTELLATIONS[done % CONSTELLATIONS.length],
    lit: total % STARS_PER_CONSTELLATION,
    done,
    round: Math.floor(done / CONSTELLATIONS.length) + 1,
  };
}

/** 완성한 별자리 목록(최근 것이 뒤) */
export const finishedConstellations = (total) =>
  Array.from({ length: Math.floor(total / STARS_PER_CONSTELLATION) }, (_, i) => CONSTELLATIONS[i % CONSTELLATIONS.length]);
