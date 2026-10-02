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
  if (!data.route || data.route === "founder" || data.sponsor !== "employer") throw new Error("This demo supports an employer-sponsored move. Other sponsor routes are coming next.");
  if (!data.members.some(member => member.relationship === "self") || data.members.some(member => !member.confirmed)) throw new Error("Confirm each member's information before creating a plan.");
  const arrival = data.profile.arrival || addDays(today(), 45);
  const person = data.members.find(member => member.relationship === "self")!.name.split(" ")[0];
  const family = data.members.length > 1;
  const task = (id: string, title: string, phase: PlanTask["phase"], category: PlanTask["category"], offset: number, duration: number, deps: string[], min: number | null, max: number | null, source: string, description: string, documents: string[], owner = person, frequency: "once" | "monthly" = "once"): PlanTask => ({
    id, title, phase, category, start: addDays(arrival, offset), due: addDays(arrival, offset + duration), duration,
    dependencyIds: deps, description, documents, owner, status: "todo", risk: "Illustrative schedule; confirm timing and requirements with the provider.", cost: { min, max, currency: "AED", frequency }, sourceIds: [source],
  });
  const tasks = [
    task("documents", "Prepare your document pack", "before", "Residency", -35, 7, [], 300, 800, "uae-residency", "Ask your employer for the exact document and attestation checklist. Keep confirmed copies ready.", ["Passport copy", "Employer's document checklist"]),
    task("employer", "Confirm the employer-sponsored route", "before", "Residency", -28, 10, ["documents"], null, null, "uae-residency", "Confirm entry arrangements, sponsorship, covered costs, and expected processing times with HR before committing to travel.", ["Employment offer", "HR confirmation"], "Your employer"),
    task("stay", "Arrange your first place to stay", "before", "Home", -21, 7, [], 2500, 4500, "adro-housing", "Compare flexible temporary stays near your workplace while you look for a longer-term home.", ["Booking confirmation"]),
    task("arrival", "Arrive & confirm your next appointments", "arrival", "Residency", 0, 1, ["employer"], null, null, "uae-residency", "Reconfirm entry arrangements with HR and review the approved sequence of post-arrival appointments.", ["Travel documents", "HR contact"]),
    task("residency", "Complete the residency steps with HR", "arrival", "Residency", 1, 12, ["arrival"], null, null, "uae-residency", "Follow the verified employer checklist for medical fitness, identity registration, insurance, and residency. Your employer confirms eligibility and sequence.", ["Employer's verified checklist"], "You + your employer"),
    task("housing", "Find a home that feels like you", "after", "Home", 2, 12, [], 6000, 10000, "adro-housing", `Compare neighbourhoods, your commute, and ${family ? "your family's" : "your"} priorities. Confirm lease terms and utility arrangements with the provider.`, ["Landlord's checklist"], person, "monthly"),
    task("bank", "Check your bank account options", "after", "Everyday", 13, 3, ["residency"], null, null, "adro-relocation", "Ask the bank which documents are required for your account type, then arrange an appointment.", ["Bank's document checklist"]),
    task("utilities", "Set up the everyday essentials", "after", "Everyday", 14, 3, ["housing"], 350, 650, "adro-relocation", "Confirm electricity, water, internet, and mobile setup requirements with your selected providers.", ["Provider requirements", "Lease details"], person, "monthly"),
  ];
  if (family) tasks.push(task("family", "Confirm your family's residency pathway", "after", "Family", 13, 10, ["residency", "documents"], null, null, "uae-family", "Verify family sponsorship eligibility and the document checklist with HR or the authority before submitting applications.", ["Verified family document checklist"], "You + your employer"));
  if (data.members.some(member => member.relationship === "child")) tasks.push(task("school", "Explore schools & admission availability", "before", "Family", -25, 10, [], null, null, "adro-relocation", "Contact shortlisted schools about places, admissions, and fees. This task does not assume a place is available.", ["School's admissions checklist"]));
  return validatePlan({ id: `plan-${data.id}`, version: (data.plan?.version ?? 0) + 1, caseId: data.id, arrival, tasks, createdAt: new Date().toISOString(), assumptions: [
    "Demo planning only: dates, costs, and processing times are illustrative, not official quotes.",
    "Employer sponsorship is assumed. HR must verify eligibility, costs, and the sequence of residency steps.",
    ...(!data.profile.arrival ? ["Arrival defaults to 45 days from today and needs confirmation."] : []),
    ...data.profile.deferred.map(field => `${field[0].toUpperCase()}${field.slice(1)} is deferred and needs follow-up.`),
    ...(data.profile.budget !== null ? [`Monthly living budget: AED ${money(data.profile.budget)}. The demo ranges are not personalized quotes.`] : ["Your budget is not confirmed."]),
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
    nextAction: maintainedGoal ? "Confirm the revised dates with your employer before changing bookings." : "Your pre-arrival work extends beyond the target. Ask HR about an expedited route or choose a later arrival before booking travel.", createdAt: new Date().toISOString() };
}
export function applyChange(plan: Plan, change: PlanChange): Plan {
  if (plan.version !== change.baseVersion) throw new Error("Your plan changed after this proposal. Generate a fresh proposal.");
  return validatePlan(change.plan);
}
export const questions: { field: Exclude<keyof Profile, "deferred">; title: string; text: string; placeholder: string }[] = [
  { field: "origin", title: "Your starting point", text: "Where will you be moving from?", placeholder: "e.g. London, United Kingdom" },
  { field: "arrival", title: "Your arrival", text: "When would you like to arrive in Abu Dhabi?", placeholder: "YYYY-MM-DD" },
  { field: "budget", title: "Your monthly budget", text: "What is your monthly living budget in AED? We'll keep one-time moving costs separate.", placeholder: "e.g. 18000" },
  { field: "housing", title: "A place to call home", text: "What kind of home would suit you?", placeholder: "e.g. A two-bedroom apartment near work" },
  { field: "school", title: "Your family's plans", text: "Would you like to explore school options for your children?", placeholder: "e.g. Yes, an international school" },
  { field: "health", title: "Healthcare", text: "Is employer-provided health insurance confirmed?", placeholder: "e.g. Employer cover is confirmed" },
];
export function nextQuestion(profile: Profile, members: RelocationCase["members"]) {
  return questions.find(question => !profile.deferred.includes(question.field) && !profile[question.field] && (question.field !== "school" || members.some(member => member.relationship === "child")));
}
