import { planSchema, type Plan, type PlanTask, type Profile, type PlanChange, type RelocationCase } from "./schema";
import { sourceIds } from "./knowledge";

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}
export function formatDate(date: string, year = false): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
export function money(value: number): string { return new Intl.NumberFormat("en-GB").format(value); }
export function validatePlan(input: Plan): Plan {
  const plan = planSchema.parse(input);
  const ids = new Set(plan.tasks.map(task => task.id));
  if (ids.size !== plan.tasks.length) throw new Error("Duplicate task IDs.");
  const visited = new Set<string>(); const active = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) throw new Error("Circular task dependencies.");
    if (visited.has(id)) return;
    active.add(id);
    const task = plan.tasks.find(item => item.id === id)!;
    if (task.start > task.due) throw new Error("A task cannot end before it starts.");
    if (task.sourceIds.some(source => !sourceIds.has(source))) throw new Error("Unknown source reference.");
    for (const dependency of task.dependencyIds) {
      if (!ids.has(dependency)) throw new Error("Missing task dependency.");
      visit(dependency);
      const prerequisite = plan.tasks.find(item => item.id === dependency)!;
      if (task.start < prerequisite.due && task.status !== "done") throw new Error("A task starts before its prerequisite ends.");
    }
    active.delete(id); visited.add(id);
  }
  plan.tasks.forEach(task => visit(task.id));
  return plan;
}
export function blockers(task: PlanTask, plan: Plan): PlanTask[] {
  return plan.tasks.filter(item => task.dependencyIds.includes(item.id) && item.status !== "done");
}
export function summarizeCosts(plan: Plan) {
  return (["once", "monthly"] as const).map(frequency => {
    const tasks = plan.tasks.filter(task => task.cost.frequency === frequency);
    return { frequency, min: tasks.reduce((sum, task) => sum + (task.cost.min ?? 0), 0), max: tasks.reduce((sum, task) => sum + (task.cost.max ?? 0), 0), unknown: tasks.filter(task => task.cost.min === null).length };
  });
}
export function generatePlan(data: RelocationCase): Plan {
  if (!data.route) throw new Error("Choose how you are moving first.");
  if (!data.members.some(member => member.relationship === "self") || data.members.some(member => !member.confirmed)) throw new Error("Confirm each person's details first.");
  const arrival = data.profile.arrival || addDays(today(), 45);
  const person = data.members.find(member => member.relationship === "self")!.name.split(" ")[0];
  const family = data.members.length > 1;
  const budget = data.profile.budget || (family ? 18000 : 12000);
  const rent = [Math.round(budget * .35 / 100) * 100, Math.round(budget * .5 / 100) * 100];
  const task = (id: string, title: string, phase: PlanTask["phase"], category: PlanTask["category"], offset: number, duration: number, deps: string[], min: number | null, max: number | null, source: string, description: string, documents: string[], owner = person, frequency: "once" | "monthly" = "once"): PlanTask => ({
    id, title, phase, category, start: addDays(arrival, offset), due: addDays(arrival, offset + duration), duration,
    dependencyIds: deps, description, documents, owner, status: "todo", risk: "", cost: { min, max, currency: "AED", frequency }, sourceIds: [source],
  });
  const tasks = [
    task("documents", "Get your documents ready", "before", "Residency", -35, 7, [], 300, 800, "uae-residency", "Gather passport copies, photos, and the documents for your residency category. Add relationship certificates for anyone moving with you.", ["Passport copies", "Personal photos", ...(family ? ["Marriage / birth certificates"] : [])]),
  ];
  if (data.route === "founder") {
    tasks.push(task("business", "Choose your business setup", "before", "Everyday", -42, 8, [], null, null, "added-business", "Choose your business activity, legal form, and mainland or free-zone location. Reserve your trade name and prepare incorporation documents.", ["Business activity", "Proposed trade name", "Ownership details"]));
    tasks.push(task("licence", "Get your business licence", "before", "Everyday", -34, 14, ["business"], null, null, "added-business", "Complete initial and activity-specific approvals, premises arrangements where required, and the economic licence application.", ["Incorporation agreements", "Activity approvals", "Premises documents, if required"]));
  }
  let entry = "pathway";
  if (data.sponsor === "employer") {
    entry = "employer";
    tasks.push(task("employer", "Arrange your work & entry", "before", "Residency", -28, 10, ["documents"], null, null, "uae-residency", "Send your document pack to your employer. Coordinate the employment and entry application, travel date, and covered moving costs.", ["Employment offer", "Passport copy"], "You + your employer"));
  } else {
    tasks.push(task("pathway", data.sponsor === "self" ? "Choose your residency category" : "Find your residency route", "before", "Residency", -28, 10, ["documents"], null, null, "uae-self", data.route === "founder" ? "Compare investor or partner residency and relevant self-sponsored categories. Match your company structure and qualifications to the application category." : "Compare work, freelancer, investor, and other relevant residency categories. Select the category that matches your plans and gather its application documents.", ["Qualifications or business documents", "Income / investment evidence"]));
  }
  const entryDeps = [entry, ...(data.route === "founder" && data.sponsor === "self" ? ["licence"] : [])];
  tasks.push(
    task("stay", "Book your first stay", "before", "Home", -21, 7, [], 2500, 4500, "adro-housing", "Book a flexible short stay close to work or your preferred neighbourhood. Leave time to view longer-term homes.", ["Booking details"]),
    task("arrival", "Land in Abu Dhabi", "arrival", "Residency", 0, 1, entryDeps, null, null, "uae-residency", "Keep your entry documents ready, check into your first stay, and organise your residency appointments.", ["Passport", "Entry documents", "Stay address"]),
    task("residency", "Set up residency & Emirates ID", "arrival", "Residency", 1, 12, ["arrival"], null, null, "uae-residency", "Complete the steps for your selected category: health cover, any required medical fitness examination, Emirates ID, and residence issuance.", ["Passport", "Entry details", "Insurance policy", "Application documents"]),
    task("housing", "Find your new home", "after", "Home", 2, 12, [], rent[0], rent[1], "adro-housing", `Shortlist ${data.profile.housing || (family ? "family homes" : "homes")} around your commute. View them, agree on payment dates, and register the signed tenancy through Tawtheeq.`, ["Identity documents", "Tenancy contract"], person, "monthly"),
    task("bank", "Open your bank account", "after", "Everyday", 13, 3, ["residency"], null, null, "adro-relocation", "Compare account requirements and fees. Prepare your identity, residency, and income documents, then submit your application.", ["Passport", "Emirates ID", "Income documents"]),
    task("utilities", "Connect your everyday essentials", "after", "Everyday", 14, 3, ["housing"], Math.round(budget * .02), Math.round(budget * .04), "adro-utilities", "Set up water and electricity after tenancy registration. Choose mobile and home internet plans for your address.", ["Identity documents", "Registered tenancy"], person, "monthly"),
  );
  if (family) tasks.push(task("family", "Bring your family's residency together", "after", "Family", 13, 10, ["residency", "documents"], null, null, "uae-family", "Prepare applications for each dependant, with relationship documents, health cover, and medical fitness tests for adults where required.", ["Passports", "Marriage / birth certificates", "Health cover"]));
  if (data.members.some(member => member.relationship === "child") && !/^(no\b|none\b|not needed\b|不要|いいえ)/i.test(data.profile.school)) tasks.push(task("school", "Find a school that fits", "before", "Family", -25, 10, [], null, null, "adro-school", `Shortlist ${data.profile.school || "schools"} by curriculum, commute, and fees. Check places, arrange visits, and collect admissions documents.`, ["School records", "Passport copy", "Admissions documents"]));
  if (data.route === "founder") tasks.push(task("business-bank", "Open your business account", "after", "Everyday", 13, 10, ["licence", "residency"], null, null, "added-business", "Prepare your company licence, ownership details, and business activity information for the bank application.", ["Business licence", "Ownership documents", "Business information"]));
  return validatePlan({ id: `plan-${data.id}`, version: (data.plan?.version ?? 0) + 1, caseId: data.id, arrival, tasks, createdAt: new Date().toISOString(), assumptions: [
    "Dates are planning targets; fees without a selected service are left open.",
    "Housing and utilities are estimated budget allocations, not quoted market prices.",
    ...(!data.profile.arrival ? ["Arrival target: 45 days from today."] : []),
    ...data.profile.deferred.map(field => `${field[0].toUpperCase()}${field.slice(1)}: choose later.`),
    `Monthly budget: AED ${money(budget)}${data.profile.budget ? "" : " (starting allocation)"}.`,
  ] });
}
export function toggleTask(plan: Plan, id: string): Plan {
  const target = plan.tasks.find(task => task.id === id);
  if (!target) throw new Error("Task not found.");
  if (target.status !== "done" && blockers(target, plan).length) throw new Error("Complete the prerequisites first.");
  // Undo keeps downstream work complete; the dependency warning becomes visible again.
  return { ...plan, version: plan.version + 1, tasks: plan.tasks.map(task => task.id === id ? { ...task, status: task.status === "done" ? "todo" : "done" } : task) };
}
export function replan(plan: Plan, input: { kind: "delay" | "arrival"; taskId?: string; days?: number; arrival?: string }): PlanChange {
  const next: Plan = structuredClone(plan);
  next.version++;
  let reason: string;
  if (input.kind === "arrival") {
    const shift = daysBetween(plan.arrival, input.arrival!);
    if (!shift) throw new Error("Choose a different arrival date.");
    next.arrival = input.arrival!;
    next.tasks = next.tasks.map(task => task.status === "done" ? task : { ...task, start: addDays(task.start, shift), due: addDays(task.due, shift) });
    reason = `Arrival target changed from ${formatDate(plan.arrival, true)} to ${formatDate(next.arrival, true)}. Open tasks move with the target; completed work is preserved.`;
  } else {
    const target = next.tasks.find(task => task.id === input.taskId);
    if (!target || target.status === "done") throw new Error("Choose an unfinished task to delay.");
    target.start = addDays(target.start, input.days!); target.due = addDays(target.due, input.days!);
    reason = `${target.title} is delayed by ${input.days} days. Only dependent tasks move when their prerequisites require it.`;
  }
  // Topological settling handles transitive dependencies and preserves task IDs and completion.
  for (let round = 0; round < next.tasks.length; round++) {
    let changed = false;
    for (const task of next.tasks) {
      if (task.status === "done") continue;
      const latest = task.dependencyIds.reduce((value, id) => {
        const due = next.tasks.find(item => item.id === id)!.due;
        return due > value ? due : value;
      }, task.start);
      if (latest > task.start) { const shift = daysBetween(task.start, latest); task.start = latest; task.due = addDays(task.due, shift); changed = true; }
    }
    if (!changed) break;
  }
  validatePlan(next);
  const diffs = next.tasks.flatMap(task => {
    const before = plan.tasks.find(item => item.id === task.id)!;
    return before.due !== task.due ? [{ taskId: task.id, title: task.title, before: before.due, after: task.due }] : [];
  });
  const maintainedGoal = next.tasks.filter(task => task.phase === "before" && task.status !== "done").every(task => task.due <= next.arrival);
  return { id: crypto.randomUUID(), baseVersion: plan.version, plan: next, reason, diffs, maintainedGoal,
    details: [], nextAction: maintainedGoal ? "Follow the updated dates in your timeline." : "Move your arrival later to fit the remaining preparation.", createdAt: new Date().toISOString() };
}
export function applyChange(plan: Plan, change: PlanChange): Plan {
  if (plan.version !== change.baseVersion) throw new Error("Your plan changed after this proposal. Generate a fresh proposal.");
  return validatePlan(change.plan);
}
export const questions: { field: Exclude<keyof Profile, "deferred">; title: string; text: string; placeholder: string }[] = [
  { field: "origin", title: "Your starting point", text: "Where will you be moving from?", placeholder: "e.g. London, United Kingdom" },
  { field: "arrival", title: "Your arrival", text: "When would you like to arrive in Abu Dhabi?", placeholder: "YYYY-MM-DD" },
  { field: "budget", title: "Your monthly budget", text: "What is your monthly budget in AED?", placeholder: "e.g. 18000" },
  { field: "housing", title: "A place to call home", text: "What kind of home would suit you?", placeholder: "e.g. A two-bedroom apartment near work" },
  { field: "school", title: "Your family's plans", text: "Would you like to explore school options for your children?", placeholder: "e.g. Yes, an international school" },
  { field: "health", title: "Healthcare", text: "Do you already have health cover for your move?", placeholder: "Tell us about your cover" },
];
export function nextQuestion(profile: Profile, members: RelocationCase["members"]) {
  return questions.find(question => !profile.deferred.includes(question.field) && !profile[question.field] && (question.field !== "school" || members.some(member => member.relationship === "child")));
}

export function refreshPlan(data: RelocationCase, profile: Profile = data.profile): PlanChange {
  if (!data.plan) throw new Error("Create your plan first.");
  const previous = validatePlan(data.plan);
  const scaffold = generatePlan({ ...data, profile });
  const byId = new Map(previous.tasks.map(task => [task.id, task]));
  const tasks = scaffold.tasks.map(task => {
    const old = byId.get(task.id);
    if (!old) return task;
    if (old.status === "done") return old;
    return { ...task, start: old.start, due: old.due, status: old.status };
  });
  // Finished work survives a scope change, even when it is no longer in the new scaffold.
  for (const old of previous.tasks) if (old.status === "done" && !tasks.some(task => task.id === old.id)) tasks.push(old);
  const ids = new Set(tasks.map(task => task.id));
  for (const task of tasks) task.dependencyIds = task.dependencyIds.filter(id => ids.has(id));
  for (let round = 0; round < tasks.length; round++) {
    let changed = false;
    for (const task of tasks) {
      if (task.status === "done") continue;
      const latest = task.dependencyIds.reduce((date, id) => {
        const due = tasks.find(item => item.id === id)!.due;
        return due > date ? due : date;
      }, task.start);
      if (latest > task.start) { task.due = addDays(task.due, daysBetween(task.start, latest)); task.start = latest; changed = true; }
    }
    if (!changed) break;
  }
  const next = validatePlan({ ...scaffold, arrival: previous.arrival, tasks, version: previous.version + 1 });
  const details = tasks.flatMap(task => {
    const old = byId.get(task.id);
    if (!old) return [`Added: ${task.title}`];
    if (JSON.stringify(old.cost) !== JSON.stringify(task.cost)) return [`Updated budget: ${task.title}`];
    if (old.description !== task.description) return [`Updated: ${task.title}`];
    return [];
  });
  for (const old of previous.tasks) if (!ids.has(old.id)) details.push(`Removed: ${old.title}`);
  const diffs = tasks.flatMap(task => {
    const old = byId.get(task.id);
    return old && old.due !== task.due ? [{ taskId: task.id, title: task.title, before: old.due, after: task.due }] : [];
  });
  if (!details.length && !diffs.length && JSON.stringify(profile) === JSON.stringify(data.profile)) throw new Error("Your plan already matches these details.");
  return { id: crypto.randomUUID(), baseVersion: previous.version, plan: next, profile, diffs, details,
    reason: "Your plan is updated for your people and priorities.",
    maintainedGoal: tasks.filter(task => task.phase === "before" && task.status !== "done").every(task => task.due <= next.arrival),
    nextAction: "Follow the updated steps in your timeline.", createdAt: new Date().toISOString() };
}
