// 공용 도구: HTML 이스케이프, 날짜, 날짜 기반 난수, 알림, 확인 버튼, 복사.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const parseKey = (key) => new Date(`${key}T00:00:00`);

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function daysBetween(fromKey, toKey) {
  return Math.round((parseKey(toKey) - parseKey(fromKey)) / 86400000);
}

/** 그 주 월요일 날짜. 주간 미션·부모 퀘스트는 월요일에 새로 시작한다. */
export function weekKey(key = dateKey()) {
  const d = parseKey(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateKey(d);
}

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export const weekdayOf = (key) => parseKey(key).getDay();

export function formatDate(key) {
  const d = parseKey(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function shortDate(key) {
  const d = parseKey(key);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 문자열 → 고정 시드 난수 생성기. 같은 날에는 같은 퀘스트가 나오게 한다. */
export function seededRandom(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let k = 0; k < seedText.length; k += 1) {
    h = Math.imul(h ^ seedText.charCodeAt(k), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 가중치에 비례해 하나를 고른다. 가중치 합이 0이면 null. */
export function weightedPick(items, weightOf, rand = Math.random) {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
  if (total <= 0) return null;
  let r = rand() * total;
  for (const item of items) {
    r -= Math.max(0, weightOf(item));
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

export const uid = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 받침이 있으면 a, 없으면 b ("아빠가" / "엄마가" 같은 조사 고르기) */
export function josa(word, a, b) {
  const code = String(word).charCodeAt(String(word).length - 1);
  if (code < 0xac00 || code > 0xd7a3) return b;
  return (code - 0xac00) % 28 ? a : b;
}

export function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 2400);
}

/**
 * confirm() 대신 쓰는 '한 번 더 누르기' 확인.
 * 처음 누르면 버튼 글자가 message 로 바뀌고, 4초 안에 다시 누르면 run 을 실행한다.
 */
export function confirmTap(el, message, run) {
  if (el.dataset.armed) {
    run();
    return;
  }
  const original = el.textContent;
  el.dataset.armed = '1';
  el.textContent = message;
  setTimeout(() => {
    delete el.dataset.armed;
    el.textContent = original;
  }, 4000);
}

/** 클립보드에 복사. 클립보드 API가 막힌 곳에서는 옛 방식으로 한 번 더 시도한다. 성공하면 true. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/** 사진(아이가 그린 몬스터)을 작게 줄여 JPEG data URL 로 — 기기 저장 공간을 아끼려고 긴 쪽 max 픽셀 */
export function shrinkImage(file, max = 240) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * k);
      canvas.height = Math.round(img.height * k);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('사진을 읽지 못했어요'));
    };
    img.src = url;
  });
}
