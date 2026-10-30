import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ACTIVITIES, advanceLife, loadLife, newLife, saveLife, skillLevel, startActivity } from '../src/simclick/life.ts';

test('new life starts with stable state and a timed idle activity', () => {
  const s = newLife(42, 300);
  assert.equal(s.citySeed, 42);
  assert.equal(s.activity?.id, 'relax');
  assert.equal(s.activity?.endsAt, 420);
  assert.equal(skillLevel(50), 3);
});
test('one activity completes exactly once while idle clock advances', () => {
  const s = newLife(42, 300);
  assert.equal(startActivity(s, 'study', 300).ok, true);
  advanceLife(s, 420);
  assert.equal(s.skills.knowledge, 18);
  advanceLife(s, 420);
  assert.equal(s.skills.knowledge, 18);
  assert.ok(s.needs.full < 85);
});
test('low energy blocks work, not sleep', () => {
  const s = newLife(42, 100);
  s.needs.energy = 9;
  assert.equal(startActivity(s, 'work', 100).ok, false);
  assert.equal(startActivity(s, 'sleep', 100).ok, true);
});
test('player state uses its own namespaced storage, resets on incompatible city time', () => {
  const values = new Map<string, string>();
  const storage = {getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k,v); }};
  const s = newLife(999, 500);
  startActivity(s, 'clean', 500);
  saveLife(storage, s);
  assert.equal(loadLife(storage, 999, 510).activity?.id, 'clean');
  assert.equal(loadLife(storage, 998, 510).citySeed, 998);
  const rewound = loadLife(storage, 999, 450);
  assert.equal(rewound.lastMinute, 450);
  assert.equal(rewound.activity?.id, 'clean');
  assert.equal(rewound.activity?.endsAt, 495);
  assert.equal(rewound.events[0], 'เวลาในเมืองย้อนกลับสู่จุดเซฟล่าสุด');
  assert.ok(values.has('simclick.life.v1'));
  assert.equal(values.has('citymanager.save.v7'), false);
});
test('every activity is positive duration', () => {
  for (const item of Object.values(ACTIVITIES)) assert.ok(item.minutes > 0);
});

test('a life-sidecar newer than the city save does not erase skill progress or double-reward', () => {
 const values = new Map<string,string>();
 const storage = {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 const character = newLife(101, 1000);
 startActivity(character, 'study', 1000);
 advanceLife(character, 1120);
 assert.equal(character.skills.knowledge, 18);
 saveLife(storage, character);
 const restored = loadLife(storage, 101, 1040);
 assert.equal(restored.skills.knowledge, 18);
 const prior = restored.skills.knowledge;
 advanceLife(restored, 1040);
 assert.equal(restored.skills.knowledge, prior);
});
