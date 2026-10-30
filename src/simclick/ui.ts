import type { City } from '../sim.ts';
import { ACTIVITIES, advanceLife, loadLife, newLife, saveLife, skillLevel, startActivity, type ActivityId } from './life.ts';
import './ui.css';
type Page = 'city' | 'home' | 'character';
export function installSimClick(api: { city: () => City; minute: () => number; focus: (cell: number) => void }) {
 const root = document.getElementById('simclick-root')!;
 let world = api.city(), page: Page = 'city', place: number | null = null, building = false, seen = -1;
 let message = 'แตะอาคารบนแผนที่เพื่อเลือกกิจกรรม';
 const load = () => { try { return loadLife(localStorage, world.seed, api.minute()); } catch { return newLife(world.seed, api.minute()); } };
 let life = load();
 const save = () => { try { saveLife(localStorage, life); } catch { /* Browser storage unavailable. */ } };
 const household = () => { const c = api.city(); const h = c.households.find(x => x.id === life.householdId && x.home !== null) || c.households.find(x => x.home !== null); if (h) life.householdId = h.id; return h; };
 const home = () => { const c = api.city(), h = household(); return c.buildings.find(b => b.id === h?.home) || c.buildings.find(b => b.zone === 'R'); };
 const labels: Record<string, string> = { R: '🏠 บ้าน', C: '🛍️ ร้านค้า', I: '🏭 โรงงาน', F: '🌾 ฟาร์ม' };
 const placeName = (cell: number) => { const c = api.city(); return c.parks.some(p => p.cell === cell) ? '🌳 สวนสาธารณะ' : c.education?.campuses.some(p => p.cell === cell) ? '📚 สถานศึกษา' : labels[c.cells[cell]?.zone || ''] || '📍 พื้นที่เมือง'; };
 const actions = (ids: ActivityId[]) => '<div class="sc-actions">' + ids.map(id => '<button type="button" data-sc-action="' + id + '"><span>' + ACTIVITIES[id].icon + '</span><b>' + ACTIVITIES[id].label + '</b><small>' + ACTIVITIES[id].minutes + ' นาที</small></button>').join('') + '</div>';
 const needs = () => '<div class="sc-needs">' + Object.entries(life.needs).map(([k,v]) => '<label>' + ({full:'ความอิ่ม',energy:'พลังงาน',joy:'ความสุข',social:'สังคม',hygiene:'ความสะอาด'} as Record<string,string>)[k] + ' ' + Math.round(v) + '%<i><span style="width:' + v + '%"></span></i></label>').join('') + '</div>';
 function draw() {
  const c = api.city(), now = Math.floor(api.minute()), dayMin = now % 1440, house = home(), resident = household(), current = life.activity;
  const clock = 'วันที่ ' + (Math.floor(now/1440)+1) + ' · ' + String(Math.floor(dayMin/60)).padStart(2,'0') + ':' + String(dayMin%60).padStart(2,'0');
  let content = '';
  if (page === 'city') {
   const destinations = [...c.buildings.slice(0,9).map(b=>b.cell), ...c.parks.slice(0,2).map(p=>p.cell)];
   content = '<h2>🏙️ เมืองของฉัน</h2><p>แตะอาคารหรือเลือกสถานที่</p><div class="sc-destinations">' + destinations.map(i=>'<button data-sc-place="' + i + '">' + placeName(i) + '</button>').join('') + '</div><h3>' + (place === null ? 'เลือกสถานที่ในเมือง' : placeName(place)) + '</h3>';
   const zone = place === null ? null : c.cells[place]?.zone;
   const ids: ActivityId[] = place !== null && c.parks.some(p=>p.cell===place) ? ['park','socialize','relax'] : zone === 'R' ? ['sleep','eat','relax','clean'] : zone === 'C' ? ['work','eat','socialize'] : zone === 'I' || zone === 'F' ? ['work','study','relax'] : ['work','eat','relax','socialize'];
   content += actions(ids) + '<p class="sc-note">V0.1: การเลือกสถานที่ยังไม่คำนวณการเดินทางหรือรถติดจริง</p>';
  } else if (page === 'home') {
   content = '<h2>🏠 บ้านของฉัน</h2><div class="sc-hero">🏡 ' + (house ? 'บ้านเลขที่ ' + house.id + ' · ระดับ ' + house.level : 'เมืองกำลังสร้างที่พักอาศัย') + '</div>' + needs() + '<h3>กิจกรรมในบ้าน</h3>' + actions(['sleep','eat','relax','clean']);
   if (house) content += '<button class="sc-place" data-sc-place="' + house.cell + '">📍 ดูบ้านบนแผนที่</button>';
   content += '<p class="sc-note">กินอาหารยังไม่หักสต็อกสินค้าจากตลาด จนกว่าจะเชื่อมระบบซื้อขาย</p>';
  } else {
   const cash = resident ? '฿' + ((c.accounts[resident.wallet] || 0)/100).toLocaleString('th-TH') : 'ยังไม่เชื่อมครัวเรือน';
   content = '<h2>👤 ตัวละคร</h2><div class="sc-hero">🧑 ' + life.name + ' · อายุ ' + life.age + ' ปี</div><p>เงินครัวเรือน: ' + cash + '</p>' + needs() + '<h3>ทักษะ</h3><div class="sc-skills">💼 งาน Lv.' + skillLevel(life.skills.career) + ' · 📚 ความรู้ Lv.' + skillLevel(life.skills.knowledge) + ' · 💬 สื่อสาร Lv.' + skillLevel(life.skills.communication) + '</div><h3>บันทึกชีวิต</h3><ul>' + life.events.map(e=>'<li>' + e.replace(/[<>]/g,'') + '</li>').join('') + '</ul><p class="sc-note">เงินจากบัญชีเมืองจริง ไม่สร้างประชากรหรือเงินซ้ำจากกิจกรรม</p>';
  }
  root.innerHTML = '<header class="sc-header"><strong>THE SIM <em>CLICK</em><small>' + clock + '</small></strong><button data-sc-builder>' + (building ? '↩ กลับสู่ชีวิต' : '⚙ จัดการเมือง') + '</button></header>' +
   (building ? '<p class="sc-builder-note">โหมดสร้างเมือง · ใช้เครื่องมือเดิม</p>' : '<main class="sc-panel ' + page + '"><div class="sc-status">● ' + (current ? ACTIVITIES[current.id].label : 'พักผ่อน') + '<small>' + Math.ceil(Math.max(0,(current?.endsAt||now)-now)) + ' นาทีเกม · Idle</small></div><div class="sc-body">' + content + '</div><p class="sc-message" role="status">' + message + '</p></main><nav class="sc-nav">' + ([['city','🏙️','เมือง'],['home','🏠','บ้าน'],['character','🧑','ตัวละคร']] as const).map(([id,icon,label])=>'<button data-sc-page="' + id + '" class="' + (page===id?'active':'') + '"><span>' + icon + '</span><small>' + label + '</small></button>').join('') + '</nav>');
  root.querySelector<HTMLButtonElement>('[data-sc-builder]')?.addEventListener('click',()=>{building=!building;document.documentElement.classList.toggle('simclick-builder',building);draw();});
  root.querySelectorAll<HTMLButtonElement>('[data-sc-page]').forEach(b=>b.onclick=()=>{page=b.dataset.scPage as Page;draw();});
  root.querySelectorAll<HTMLButtonElement>('[data-sc-place]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.scPlace);if(!c.cells[i])return;place=i;page='city';api.focus(i);message='เลือก '+placeName(i)+' แล้ว';draw();});
  root.querySelectorAll<HTMLButtonElement>('[data-sc-action]').forEach(b=>b.onclick=()=>{message=startActivity(life,b.dataset.scAction as ActivityId,api.minute()).message;save();draw();});
 }
 draw();
 return { sync() { const c=api.city(),now=api.minute(); if(world!==c){world=c;life=load();place=null;seen=-1;} if(Math.floor(now)!==seen){advanceLife(life,now);household();seen=Math.floor(now);save();draw();} },
  visit(cell:number){if(!api.city().cells[cell])return;place=cell;page='city';message='เลือก '+placeName(cell)+' แล้ว';draw();},
  reset(){world=api.city();life=newLife(world.seed,api.minute());place=null;page='city';save();draw();} };
}
