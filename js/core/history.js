// 지난 기록 모으기: 부모 모드 달력(#/parent/calendar)에서 날짜별·달별로 보여 준다. 읽기만 하고 상태는 바꾸지 않는다.
// 하루 기록은 s.days(약 13개월), 모험 일지는 s.log(최근 2000개), 칭찬 카드·히든 발견·주간 미션은 각자 날짜가 있다.

import { dayItem, routinesOn, allHidden, missionInfo } from './game.js';
import { dateKey, addDays, parseKey } from './util.js';

/** 그날의 기록. 하루 기록이 없으면(앱을 열지 않은 날) items 가 빈 배열. */
export function dayRecord(s, date) {
  const day = s.days[date];
  const items = [];
  if (day) {
    // 오늘은 지금 설정, 지난날은 그날 남겨 둔 매일 하는 일 목록(없던 시절 기록은 지금 설정으로)
    const routineIds = date === dateKey() || !day.routines ? routinesOn(s, date).map((r) => r.id) : day.routines;
    const ids = [...new Set([...routineIds, ...day.quests, ...(day.picked ? [day.picked] : [])])];
    Object.keys(day.done).forEach((id) => { if (!ids.includes(id)) ids.push(id); });
    ids.forEach((id) => {
      const it = dayItem(s, id);
      items.push({ id, text: it?.text || '(지금은 없는 퀘스트)', type: it?.type || 'daily', stat: it?.stat, icon: it?.icon, done: Boolean(day.done[id]) });
    });
    if (!day.picked && day.challenges.length) items.push({ id: 'challenge', text: '오늘의 도전 (고르지 않음)', type: 'challenge', done: false });
  }
  const logs = s.log.filter((e) => e.date === date);
  const missions = [];
  Object.entries(s.weeks).forEach(([monday, week]) => {
    Object.entries(week.status).forEach(([id, st]) => {
      if (st.state === 'done' && st.date === date) missions.push({ ...missionInfo(s, id, monday), with: st.with });
    });
  });
  const stats = {};
  let xp = 0;
  logs.forEach((e) => {
    if (e.who !== 'hero') return;
    xp += e.xp || 0;
    if (e.stat && e.n) stats[e.stat] = (stats[e.stat] || 0) + e.n;
  });
  return {
    date,
    items,
    done: items.filter((x) => x.done).length,
    total: items.length,
    allClear: Boolean(day?.allClear),
    xp,
    stats,
    logs,
    missions: missions.filter((m) => m.text),
    praise: s.praise.filter((c) => c.date === date && c.to === 'hero'),
    hidden: allHidden(s).filter((h) => s.hidden[h.id]?.date === date).map((h) => ({ ...h, ...s.hidden[h.id] })),
  };
}

/** 달력 칸 색 단계: 0 기록 없음 · 1~3 조금/절반/거의 · 4 다 함 */
export function dayLevel(rec) {
  if (!rec.total || !rec.done) return 0;
  const ratio = rec.done / rec.total;
  if (ratio >= 1) return 4;
  if (ratio >= 0.67) return 3;
  if (ratio >= 0.34) return 2;
  return 1;
}

/** 'YYYY-MM' 달의 날짜들 */
export function monthDates(ym) {
  const first = parseKey(`${ym}-01`);
  const list = [];
  for (let d = `${ym}-01`; d.startsWith(ym); d = addDays(d, 1)) list.push(d);
  return { first, list };
}

export function monthSummary(s, ym) {
  const sum = { activeDays: 0, stars: 0, quests: 0, xp: 0, praise: 0, hidden: 0, missions: 0 };
  monthDates(ym).list.forEach((d) => {
    const rec = dayRecord(s, d);
    if (rec.done) sum.activeDays += 1;
    if (rec.allClear) sum.stars += 1;
    sum.quests += rec.done;
    sum.xp += rec.xp;
    sum.praise += rec.praise.length;
    sum.hidden += rec.hidden.length;
    sum.missions += rec.missions.length;
  });
  return sum;
}

/** 달력에서 갈 수 있는 가장 이른 달 (모험 시작 달 또는 남아 있는 가장 오래된 기록) */
export function firstMonth(s) {
  const dates = [s.createdAt, ...Object.keys(s.days)].filter(Boolean).sort();
  return (dates[0] || dateKey()).slice(0, 7);
}
