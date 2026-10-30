/** Independent player-life sidecar. The CityManager ledger remains authoritative for money and jobs. */
export const LIFE_SAVE_KEY = 'simclick.life.v1';
export type ActivityId = 'sleep' | 'eat' | 'relax' | 'work' | 'study' | 'socialize' | 'park' | 'clean';
export type Needs = { full: number; energy: number; joy: number; social: number; hygiene: number };
export type Skills = { career: number; knowledge: number; communication: number };
export type LifeState = {
  version: 1; citySeed: number; name: string; age: number; householdId: number | null;
  lastMinute: number; needs: Needs; skills: Skills;
  activity: { id: ActivityId; endsAt: number } | null; events: string[];
};
export const ACTIVITIES: Record<ActivityId, { label: string; minutes: number; icon: string; description: string }> = {
  sleep: { label: 'นอนหลับ', minutes: 480, icon: '🛏️', description: 'พักผ่อนเพื่อฟื้นพลังงาน' },
  eat: { label: 'กินอาหาร', minutes: 45, icon: '🍚', description: 'เพิ่มความอิ่ม (ระบบซื้อสินค้าจะเชื่อมภายหลัง)' },
  relax: { label: 'พักผ่อน', minutes: 120, icon: '☕', description: 'เพิ่มความสุขและพลังงาน' },
  work: { label: 'ทำงาน', minutes: 240, icon: '💼', description: 'ฝึกทักษะงาน • ค่าจ้างยังอิงบัญชีเมือง' },
  study: { label: 'เรียนทักษะ', minutes: 120, icon: '📚', description: 'เพิ่มความรู้' },
  socialize: { label: 'เข้าสังคม', minutes: 90, icon: '💬', description: 'เพิ่มความสัมพันธ์และความสุข' },
  park: { label: 'ไปสวน', minutes: 90, icon: '🌳', description: 'พักผ่อนในเมือง' },
  clean: { label: 'ทำความสะอาด', minutes: 45, icon: '🧽', description: 'เพิ่มสุขอนามัย' }
};
const ids = Object.keys(ACTIVITIES) as ActivityId[];
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n * 100) / 100));
export function newLife(citySeed: number, atMinute: number): LifeState {
  return { version: 1, citySeed, name: 'มิน', age: 23, householdId: null, lastMinute: atMinute,
    needs: { full: 85, energy: 80, joy: 75, social: 70, hygiene: 95 },
    skills: { career: 10, knowledge: 10, communication: 10 },
    activity: { id: 'relax', endsAt: atMinute + 120 },
    events: ['ย้ายเข้ามาในเมืองใหม่'] };
}
function remember(s: LifeState, label: string) { s.events = [label, ...s.events].slice(0, 6); }
function decay(s: LifeState, minutes: number) {
  const hours = minutes / 60;
  s.needs.full = clamp(s.needs.full - 3 * hours);
  s.needs.energy = clamp(s.needs.energy - 2.5 * hours);
  s.needs.joy = clamp(s.needs.joy - 1.5 * hours);
  s.needs.social = clamp(s.needs.social - 1.2 * hours);
  s.needs.hygiene = clamp(s.needs.hygiene - 1.6 * hours);
}
function complete(s: LifeState, activity: ActivityId) {
  const n = s.needs;
  if (activity === 'sleep') n.energy = clamp(n.energy + 85);
  if (activity === 'eat') n.full = clamp(n.full + 38);
  if (activity === 'relax') { n.energy = clamp(n.energy + 15); n.joy = clamp(n.joy + 10); }
  if (activity === 'work') { s.skills.career += 8; n.energy = clamp(n.energy - 12); }
  if (activity === 'study') { s.skills.knowledge += 8; n.energy = clamp(n.energy - 6); }
  if (activity === 'socialize') { s.skills.communication += 5; n.social = clamp(n.social + 30); n.joy = clamp(n.joy + 15); }
  if (activity === 'park') { n.joy = clamp(n.joy + 22); n.social = clamp(n.social + 6); }
  if (activity === 'clean') n.hygiene = clamp(n.hygiene + 38);
  remember(s, 'เสร็จกิจกรรม: ' + ACTIVITIES[activity].label);
}
function chooseAutomatic(s: LifeState, minute: number): ActivityId {
  if (s.needs.energy < 30) return 'sleep';
  if (s.needs.full < 42) return 'eat';
  if (s.needs.hygiene < 42) return 'clean';
  if (s.needs.social < 35) return 'socialize';
  const hour = Math.floor((minute % 1440) / 60);
  if (hour >= 9 && hour < 17 && s.needs.energy > 55) return 'work';
  if (hour >= 22 || hour < 6) return 'sleep';
  return 'relax';
}
/** Advance from the same absolute game minute as park-runtime. No rewards are awarded twice. */
export function advanceLife(s: LifeState, minute: number): LifeState {
  if (!Number.isFinite(minute) || minute < 0) throw Error('Invalid game minute');
  if (minute < s.lastMinute) { s.lastMinute = minute; s.activity = null; }
  let from = s.lastMinute;
  for (let guard = 0; from < minute && guard < 1000; guard++) {
    if (!s.activity) {
      const id = chooseAutomatic(s, from);
      s.activity = { id, endsAt: from + ACTIVITIES[id].minutes };
    }
    const to = Math.min(minute, s.activity.endsAt);
    decay(s, to - from); from = to;
    if (from >= s.activity.endsAt) {
      complete(s, s.activity.id);
      s.activity = null;
    }
  }
  // Cap a damaged or unexpectedly huge resume rather than looping forever.
  s.lastMinute = minute;
  if (!s.activity) {
    const id = chooseAutomatic(s, minute);
    s.activity = { id, endsAt: minute + ACTIVITIES[id].minutes };
  }
  return s;
}
export function startActivity(s: LifeState, id: ActivityId, atMinute: number): { ok: boolean; message: string } {
  if (!ids.includes(id)) return { ok: false, message: 'ไม่พบกิจกรรม' };
  advanceLife(s, atMinute);
  if (id === 'work' && s.needs.energy < 15) return { ok: false, message: 'เหนื่อยเกินไป ควรนอนหลับก่อน' };
  s.activity = { id, endsAt: atMinute + ACTIVITIES[id].minutes };
  remember(s, 'เริ่มกิจกรรม: ' + ACTIVITIES[id].label);
  return { ok: true, message: 'เริ่ม' + ACTIVITIES[id].label + 'แล้ว' };
}
export function saveLife(storage: Pick<Storage, 'setItem'>, state: LifeState): void {
  storage.setItem(LIFE_SAVE_KEY, JSON.stringify(state));
}
export function loadLife(storage: Pick<Storage, 'getItem'>, seed: number, now: number): LifeState {
  try {
    const raw = storage.getItem(LIFE_SAVE_KEY);
    if (!raw) return newLife(seed, now);
    const s: LifeState = JSON.parse(raw);
    if (s.version !== 1 || s.citySeed !== seed || !Number.isFinite(s.lastMinute) || s.lastMinute > now ||
      !Number.isFinite(s.age) || typeof s.name !== 'string' || !s.needs || !s.skills ||
      !Object.values(s.needs).every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100) ||
      !Object.values(s.skills).every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) ||
      !Array.isArray(s.events) || !s.events.every(e => typeof e === 'string') ||
      (s.activity && (!ids.includes(s.activity.id) || !Number.isFinite(s.activity.endsAt)))) return newLife(seed, now);
    return advanceLife(s, now);
  } catch { return newLife(seed, now); }
}
export function skillLevel(exp: number): number { return Math.floor(exp / 25) + 1; }
