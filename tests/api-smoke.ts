import assert from "node:assert/strict";
import { demoCase } from "../lib/demo";
import { profileSchema } from "../lib/schema";
const base = process.env.API_BASE_URL || "http://127.0.0.1:3000/api";
async function post(action: string, body: unknown, headers: Record<string,string> = {}) {
  const response = await fetch(`${base}/${action}`, { method:"POST",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify(body) });
  return { status:response.status, data:await response.json() };
}
async function main() {
const status = await (await fetch(`${base}/status`)).json();
assert.ok(["demo", "live"].includes(status.mode));
if (process.env.RUN_LIVE_CHAT_CHECKS === "1") {
  assert.equal(status.mode, "live", "Live consultation checks require a configured API key.");
  for (const message of ["日本", "Tokyo, Japan", "I am moving from Japan. What documents do I need?"]) {
    const fresh = { ...demoCase(), plan: null, profile: profileSchema.parse({}) };
    const result = await post("chat", { data: fresh, field: "origin", message });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.match(result.data.profile.origin, /Japan/i, `Origin was not saved for ${message}`);
    assert.equal(result.data.question.field, "arrival", `Origin was repeated for ${message}`);
  }
  const fresh = { ...demoCase(), plan: null, profile: profileSchema.parse({}) };
  const question = await post("chat", { data: fresh, field: "origin", message: "What documents do I need?" });
  assert.equal(question.status, 200);
  assert.equal(question.data.profile.origin, "", "A question alone must not invent an origin.");
  assert.equal(question.data.question.field, "origin");
}
assert.equal((await post("ocr",{consent:true})).status,410);
const data = demoCase(); data.plan=null;
assert.equal((await post("plan",{data:{...data,members:data.members.map(member=>({...member,confirmed:false}))}})).status,400);
assert.equal((await post("replan",{plan:demoCase().plan,change:{kind:"delay",taskId:"documents",days:0}})).status,400);
const failed = await post("plan",{data},{"x-demo-failure":"1"}); assert.equal(failed.status,503);assert.ok(failed.data.error.includes("Simulated"));
if (status.mode === "demo") {
  const result = await post("plan",{data});assert.equal(result.status,200);assert.equal(result.data.plan.tasks.length,10);
  const change = await post("replan",{plan:result.data.plan,change:{kind:"delay",taskId:"documents",days:7}});assert.equal(change.status,200);assert.equal(change.data.proposal.diffs.length,2);
  for (const route of ["corporate", "founder", "family"]) for (const sponsor of ["employer", "self", "undecided"]) {
    const routePlan = await post("plan", {data:{...data,route,sponsor}}); assert.equal(routePlan.status,200);assert.ok(routePlan.data.plan.tasks.length >= 10);
  }
  const guide = await post("guide", {data:{...data,plan:result.data.plan},message:"How do I start my company?"});assert.equal(guide.status,200);assert.ok(guide.data.sourceIds.includes("added-business"));assert.ok(!/demo|consult.*expert/i.test(guide.data.answer));
  const budget = await post("guide", {data:{...data,plan:result.data.plan},message:"Change my budget to AED 12000"});assert.equal(budget.status,200);assert.equal(budget.data.proposal.profile.budget,12000);assert.ok(budget.data.proposal.details.length);
  const arrival = await post("guide", {data:{...data,plan:result.data.plan},message:"Change arrival to 2027-03-10"});assert.equal(arrival.status,200);assert.equal(arrival.data.proposal.plan.arrival,"2027-03-10");
  const unanswered = { ...data, profile:{...data.profile,school:""} };
  const defer = await post("chat",{data:unanswered,field:"school",message:"Later",defer:true});assert.equal(defer.status,200);assert.ok(defer.data.profile.deferred.includes("school"));
  const ambiguous = await post("replan",{plan:result.data.plan,message:"Something is delayed 7 days"});assert.ok(ambiguous.data.clarification);assert.equal(ambiguous.data.proposal,undefined);
}
console.log(process.env.RUN_LIVE_CHAT_CHECKS === "1" ? "API smoke and live consultation checks passed." : "API smoke checks passed; no live AI request was sent.");

}
main().catch(error => { console.error(error); process.exitCode = 1; });
