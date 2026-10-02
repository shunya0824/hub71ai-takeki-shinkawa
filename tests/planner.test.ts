import { test } from "node:test";
import assert from "node:assert/strict";
import { demoCase } from "../lib/demo";
import { addDays, applyChange, blockers, replan, summarizeCosts, toggleTask, validatePlan } from "../lib/planner";
import { deserializeCase, serializeCase, toApiCase } from "../lib/storage";
import { dateSchema } from "../lib/schema";

test("a document delay propagates through dependencies while preserving unrelated dates and completed work", () => {
  let plan = demoCase().plan!;
  plan = toggleTask(plan, "stay");
  const change = replan(plan, { kind: "delay", taskId: "documents", days: 30 });
  const original = new Map(plan.tasks.map(task => [task.id, task]));
  assert.equal(change.plan.tasks.find(task => task.id === "documents")!.due, addDays(original.get("documents")!.due, 30));
  assert.ok(change.plan.tasks.find(task => task.id === "employer")!.due > original.get("employer")!.due);
  assert.ok(change.plan.tasks.find(task => task.id === "residency")!.due > original.get("residency")!.due);
  assert.deepEqual(change.plan.tasks.find(task => task.id === "stay"), original.get("stay"));
  assert.deepEqual(change.plan.tasks.find(task => task.id === "housing"), original.get("housing"));
  assert.deepEqual(change.plan.tasks.map(task => task.id), plan.tasks.map(task => task.id));
  assert.equal(change.maintainedGoal, false);
  validatePlan(change.plan);
});
test("a seven-day delay fits available slack without unnecessarily moving arrival", () => {
  const plan = demoCase().plan!;
  const change = replan(plan, { kind: "delay", taskId: "documents", days: 7 });
  assert.equal(change.maintainedGoal, true);
  assert.deepEqual(change.diffs.map(diff => diff.taskId), ["documents", "employer"]);
  assert.equal(change.plan.arrival, plan.arrival);
});
test("arrival changes move open tasks and keep finished work", () => {
  const plan = toggleTask(demoCase().plan!, "documents");
  const arrival = addDays(plan.arrival, 10);
  const change = replan(plan, { kind: "arrival", arrival });
  assert.deepEqual(change.plan.tasks.find(task => task.id === "documents"), plan.tasks.find(task => task.id === "documents"));
  assert.equal(change.plan.tasks.find(task => task.id === "housing")!.due, addDays(plan.tasks.find(task => task.id === "housing")!.due, 10));
  assert.equal(change.plan.arrival, arrival);
});
test("stale proposals cannot overwrite newer completion state", () => {
  const plan = demoCase().plan!;
  const change = replan(plan, { kind: "delay", taskId: "documents", days: 7 });
  const edited = toggleTask(plan, "stay");
  assert.throws(() => applyChange(edited, change), /changed/);
  assert.equal(applyChange(plan, change).version, plan.version + 1);
});
test("prerequisites gate completion and undo exposes downstream dependency warnings", () => {
  let plan = demoCase().plan!;
  assert.throws(() => toggleTask(plan, "employer"), /prerequisites/);
  plan = toggleTask(plan, "documents");
  assert.equal(blockers(plan.tasks.find(task => task.id === "employer")!, plan).length, 0);
  plan = toggleTask(plan, "employer");
  plan = toggleTask(plan, "documents");
  assert.equal(plan.tasks.find(task => task.id === "employer")!.status, "done");
  assert.equal(blockers(plan.tasks.find(task => task.id === "employer")!, plan).length, 1);
});
test("invalid references, cycles, chronology and calendar dates are rejected", () => {
  const plan = demoCase().plan!;
  const missing = structuredClone(plan); missing.tasks[0].dependencyIds = ["missing"];
  assert.throws(() => validatePlan(missing), /Missing/);
  const cyclic = structuredClone(plan); cyclic.tasks[0].dependencyIds = ["employer"];
  assert.throws(() => validatePlan(cyclic), /Circular/);
  const source = structuredClone(plan); source.tasks[0].sourceIds = ["made-up-url"];
  assert.throws(() => validatePlan(source), /Unknown source/);
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  const reversed = structuredClone(plan); reversed.tasks[0].start = addDays(reversed.tasks[0].due, 1);
  assert.throws(() => validatePlan(reversed), /end before/);
});
test("unconfirmed cost ranges stay counted as unknown, with monthly and one-time sums separate", () => {
  const costs = summarizeCosts(demoCase().plan!);
  assert.equal(costs[0].frequency, "once");
  assert.equal(costs[0].min, 2800);
  assert.equal(costs[0].max, 5300);
  assert.equal(costs[0].unknown, 6);
  assert.equal(costs[1].min, 6350);
  assert.equal(costs[1].max, 10650);
});
test("saved cases and planning requests exclude passport numbers; completion survives a reload", () => {
  const data = demoCase();
  data.members[0].passportNumber = "SECRET-PASSPORT-NUMBER";
  data.plan = toggleTask(data.plan!, "documents");
  const saved = serializeCase(data);
  assert.ok(!saved.includes("SECRET-PASSPORT-NUMBER"));
  assert.equal(deserializeCase(saved).plan!.tasks[0].status, "done");
  assert.equal(toApiCase(data).members[0].passportNumber, "");
  assert.equal(data.members[0].passportNumber, "SECRET-PASSPORT-NUMBER");
});
