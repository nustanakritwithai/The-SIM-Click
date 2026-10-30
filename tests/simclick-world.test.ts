import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createCity, step } from '../src/sim.ts';
import { createParkRuntime, advanceParkRuntime, serializeParkSession, deserializeParkSession } from '../src/park-runtime.ts';
import { SAVE_KEY, AUTOSAVE_CHECKPOINT_KEY } from '../src/save-storage.ts';
test('new sim click city shares a single minute clock with the daily economy', () => {
 const city=createCity(61025,{starter:true});
 for(let i=0;i<24;i++)step(city);
 assert.equal(city.tick,24);
 assert.ok(city.buildings.length>0,'starter should develop at least one building');
 const runtime=createParkRuntime(city);
 const advance=(minutes:number)=>advanceParkRuntime(city,runtime,minutes,()=>step(city));
 assert.equal(advance(120),0);
 assert.equal(city.tick,24);
 assert.equal(runtime.activity.minute,120);
 assert.equal(advance(1320),1);
 assert.equal(city.tick,25);
 assert.equal(runtime.activity.minute,0);
 const restored=deserializeParkSession(serializeParkSession(city,runtime));
 assert.equal(restored.city.tick,25);
 assert.equal(restored.runtime.activity.minute,0);
});
test('city save and checkpoint keys are isolated from CityManager',()=>{
 assert.equal(SAVE_KEY,'simclick.save.v7');
 assert.equal(AUTOSAVE_CHECKPOINT_KEY,'simclick.checkpoint.latest');
});
