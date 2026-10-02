import { caseSchema, type RelocationCase } from "./schema";
import { validatePlan } from "./planner";
export const storageKey = "diveabudhabi.case.v1";
export function serializeCase(data: RelocationCase): string {
  // Document images are never state fields. Passport numbers are deliberately session-only.
  return JSON.stringify({ ...data, members: data.members.map(member => ({ ...member, passportNumber: "" })) });
}
export function deserializeCase(serialized: string): RelocationCase {
  const data = caseSchema.parse(JSON.parse(serialized));
  if (data.plan) validatePlan(data.plan);
  return { ...data, members: data.members.map(member => ({ ...member, passportNumber: "" })) };
}
export function toApiCase(data: RelocationCase): RelocationCase {
  return { ...data, members: data.members.map(member => ({ ...member, passportNumber: "" })) };
}
