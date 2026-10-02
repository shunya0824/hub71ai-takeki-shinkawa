import { profileSchema, type RelocationCase, type Member } from "./schema";
import { addDays, today, generatePlan } from "./planner";
export const demoMember: Member = { id: "demo-self", relationship: "self", name: "Alex Morgan", nationality: "United Kingdom", birthDate:"", expiry: "2032-06-14", passportNumber: "DEMO00001", confirmed: false };
export function emptyCase(): RelocationCase {
  return { id: "local-move", route: null, sponsor: "undecided", members: [], profile: profileSchema.parse({}), messages: [], guideMessages: [], needsReview: false, plan: null, changes: [] };
}
export function demoCase(): RelocationCase {
  const data = emptyCase();
  data.route = "family";
  data.sponsor = "employer";
  data.members = [{ ...demoMember, confirmed: true, passportNumber: "" }, { id: "demo-spouse", relationship: "spouse", name: "Jamie Morgan", nationality: "United Kingdom", birthDate:"", expiry: "2031-08-20", passportNumber: "", confirmed: true }, { id: "demo-child", relationship: "child", name: "Sam Morgan", nationality: "United Kingdom", birthDate:"", expiry: "2030-02-10", passportNumber: "", confirmed: true }];
  data.profile = { origin: "London, United Kingdom", arrival: addDays(today(), 45), budget: 18000, housing: "Two-bedroom apartment", school: "Explore international schools", health: "Employer cover to be confirmed", deferred: [] };
  data.plan = generatePlan(data);
  return data;
}
