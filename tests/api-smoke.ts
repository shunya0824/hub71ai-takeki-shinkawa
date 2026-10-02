import assert from "node:assert/strict";
import { demoCase } from "../lib/demo";
const base = "http://127.0.0.1:3000/api";
async function post(action: string, body: unknown, headers: Record<string,string> = {}) {
  const response = await fetch(`${base}/${action}`, { method:"POST",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify(body) });
  return { status:response.status, data:await response.json() };
}
async function main() {
const status = await (await fetch(`${base}/status`)).json();
assert.ok(["demo", "live"].includes(status.mode));
assert.equal((await post("ocr",{consent:false,fixture:true})).status,400);
const specimen = await post("ocr",{consent:true,fixture:true});
assert.equal(specimen.status,200); assert.equal(specimen.data.mode,"demo");assert.equal(specimen.data.candidate.confirmed,false);
const data = demoCase(); data.plan=null;
assert.equal((await post("plan",{data:{...data,members:data.members.map(member=>({...member,confirmed:false}))}})).status,400);
assert.equal((await post("replan",{plan:demoCase().plan,change:{kind:"delay",taskId:"documents",days:0}})).status,400);
const failed = await post("plan",{data},{"x-demo-failure":"1"}); assert.equal(failed.status,503);assert.ok(failed.data.error.includes("Simulated"));
if (status.mode === "demo") {
  const result = await post("plan",{data});assert.equal(result.status,200);assert.equal(result.data.plan.tasks.length,10);
  const change = await post("replan",{plan:result.data.plan,change:{kind:"delay",taskId:"documents",days:7}});assert.equal(change.status,200);assert.equal(change.data.proposal.diffs.length,2);
  const unanswered = { ...data, profile:{...data.profile,school:""} };
  const defer = await post("chat",{data:unanswered,field:"school",message:"Later",defer:true});assert.equal(defer.status,200);assert.ok(defer.data.profile.deferred.includes("school"));
  const ambiguous = await post("replan",{plan:result.data.plan,message:"Something is delayed 7 days"});assert.ok(ambiguous.data.clarification);assert.equal(ambiguous.data.proposal,undefined);
}
console.log("API smoke checks passed; no live AI request was sent.");

}
main().catch(error => { console.error(error); process.exitCode = 1; });
