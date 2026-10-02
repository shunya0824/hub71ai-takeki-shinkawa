import { caseSchema, type RelocationCase } from "./schema";
import { validatePlan, generatePlan } from "./planner";
export const storageKey = "diveabudhabi.case.v1";
export function serializeCase(data: RelocationCase): string {
  // Document images are never state fields. Passport numbers are deliberately session-only.
  return JSON.stringify({ ...data, members: data.members.map(member => ({ ...member, passportNumber: "" })) });
}
export function deserializeCase(serialized: string): RelocationCase {
  const data = caseSchema.parse(JSON.parse(serialized));
  if (data.plan) {
    validatePlan(data.plan);
    if (data.plan.assumptions.some(note => /demo/i.test(note)) && data.route && data.members.some(member => member.relationship === "self") && data.members.every(member => member.confirmed)) {
      const wording = generatePlan(data);
      data.plan = { ...data.plan, assumptions: wording.assumptions, tasks: data.plan.tasks.map(task => {
        const current = wording.tasks.find(item => item.id === task.id);
        return current ? { ...task, title: current.title, description: current.description, risk: "" } : task;
      }) };
      data.needsReview = true;
    }
  }
  return { ...data, members: data.members.map(member => ({ ...member, passportNumber: "" })) };
}
export function toApiCase(data: RelocationCase): RelocationCase {
  return { ...data, members: data.members.map(member => ({ ...member, passportNumber: "" })) };
}
