// 여러 화면에서 쓰는 화면 조각.

import { esc } from '../core/util.js';
import { STATS, getStat } from '../data/stats.js';
import { levelInfo, titleOf, rankOf, parentTitleOf } from '../core/level.js';

export function bar(ratio, color = '') {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return `<span class="bar"><i style="width:${pct}%;${color ? `background:${color}` : ''}"></i></span>`;
}

export function statTag(id, n = 0) {
  const st = getStat(id);
  return st ? `<span class="tag" style="--c:${st.color}">${st.icon} ${st.name}${n ? ` +${n}` : ''}</span>` : '';
}

export const xpTag = (xp) => `<span class="tag xp">+${xp} XP</span>`;

export function rankBadge(level) {
  const rank = rankOf(level);
  return `<span class="rank rank-${rank.id}" style="--c:${rank.color}">${esc(rank.name)} 빛깔</span>`;
}

export function statGrid(stats) {
  const max = Math.max(30, ...Object.values(stats));
  return `<div class="stats">${STATS.map((st) => `
    <div class="stat" style="--c:${st.color}">
      <div class="stat-head"><span class="stat-icon">${st.icon}</span><b>${st.name}</b><span class="stat-num">${stats[st.id]}</span></div>
      ${bar(stats[st.id] / max, st.color)}
      <small>${esc(st.desc)}</small>
    </div>`).join('')}</div>`;
}

/** 경험치 막대 + "다음 레벨까지 N XP" */
export function xpBlock(xp) {
  const info = levelInfo(xp);
  return `<div class="xp">${bar(info.ratio)}<small>다음 레벨까지 <b>${info.left} XP</b> (${info.into}/${info.need})</small></div>`;
}

/** 퀘스트 한 줄. right: 오른쪽 버튼 자리 HTML */
export function questRow({ icon = '', text, stat = '', xp = 0, n = 0, state = 'todo', note = '', right = '', extra = '' }) {
  const st = stat ? getStat(stat) : null;
  return `<div class="quest ${state}" ${st ? `style="--c:${st.color}"` : ''}>
    <span class="quest-icon">${state === 'done' ? '✅' : icon || st?.icon || '⭐'}</span>
    <div class="quest-body">
      <div class="quest-text">${esc(text)}</div>
      <div class="quest-meta">${stat ? statTag(stat, n) : ''}${xp ? xpTag(xp) : ''}${note}</div>
      ${extra}
    </div>
    <div class="quest-right">${right}</div>
  </div>`;
}

export function segTabs(items, current) {
  return `<nav class="seg">${items.map(([key, label, href]) => `<a href="${href}" class="${key === current ? 'on' : ''}">${label}</a>`).join('')}</nav>`;
}

/** 아빠·엄마 이름 ("아빠") */
export const parentName = (s, who) => (who === 'hero' ? s.hero.name : s.parents[who]?.name || '');

export function parentHead(s, who) {
  const p = s.parents[who];
  const info = levelInfo(p.xp);
  return `<div class="char-head"><span class="avatar">${esc(p.avatar)}</span>
    <div><b>${esc(p.name)}</b><div class="muted">Lv.${info.level} ${esc(parentTitleOf(info.level))}</div></div></div>`;
}

export function heroLine(s) {
  const { level } = levelInfo(s.hero.xp);
  return `Lv.${level} ${esc(titleOf(level))}`;
}

export function praiseCard(s, card) {
  const st = card.stat ? getStat(card.stat) : null;
  return `<div class="praise-card" ${st ? `style="--c:${st.color}"` : ''}>
    <p>${esc(card.text)}</p>
    <div class="spread"><small class="muted">${esc(parentName(s, card.from))} → ${esc(parentName(s, card.to))} · ${card.date.slice(5).replace('-', '/')}</small>${st ? statTag(st.id) : ''}</div>
  </div>`;
}

/** 열쇠 자리: 얻은 열쇠는 🗝️, 남은 자리는 빈 칸 */
export function keySlots(have, need) {
  return `<div class="keys" aria-label="열쇠 ${have}/${need}">${Array.from({ length: need }, (_, i) =>
    `<span class="${i < have ? 'got' : ''}">${i < have ? '🗝️' : ''}</span>`).join('')}</div>`;
}

/** 백업 파일을 고른 뒤 보여 주는 확인 상자 (ui.drafts.restore 가 있을 때) */
export function restoreConfirm(restore) {
  if (!restore) return '';
  return `<div class="notice warn">
    <p><b>${esc(restore.name)}</b>의 백업(Lv.${restore.level}, ${esc(restore.savedAt)})을 찾았어요. 불러오면 지금 이 iPad의 기록이 이 백업으로 바뀌어요.</p>
    <div class="row"><button class="btn" data-action="restore-apply">이 백업으로 바꾸기</button><button class="btn ghost" data-action="restore-cancel">취소</button></div>
  </div>`;
}

export const empty = (text) => `<p class="empty">${esc(text)}</p>`;
