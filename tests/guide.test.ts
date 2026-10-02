import { test } from "node:test";
import assert from "node:assert/strict";
import { demoCase } from "../lib/demo";
import { localGuide } from "../lib/guide";
import { searchKnowledge } from "../lib/knowledge";

test("knowledge retrieval supports Japanese and English with topic-specific context",()=>{
  assert.equal(searchKnowledge("How do I start my company?")[0].id,"added-business");
  assert.ok(searchKnowledge("学校はどう選ぶ？").some(note=>note.id==="adro-school"));
  const answer=localGuide(demoCase(),"How do I choose a school?");
  assert.equal(answer.kind,"answer");assert.ok(answer.sourceIds.includes("adro-school"));assert.ok(!/demo|expert|HR.*confirm/i.test(answer.answer));
});
test("guide distinguishes questions, explicit changes and unclear changes",()=>{
  const data=demoCase();
  assert.equal(localGuide(data,"What if my documents are 7 days late?").kind,"answer");
  const delay=localGuide(data,"My documents will be 7 days late.");assert.equal(delay.kind,"delay");assert.equal(delay.taskId,"documents");assert.equal(delay.days,7);
  assert.equal(localGuide(data,"Something is delayed 7 days").kind,"clarify");
  const budget=localGuide(data,"Change my budget to AED 12,000");assert.equal(budget.kind,"profile");assert.equal(budget.budget,12000);
});
