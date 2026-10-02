import { z } from "zod";

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a valid calendar date.");
export const routeSchema = z.enum(["corporate", "founder", "family"]);
export const memberSchema = z.object({
  id: z.string().max(80), relationship: z.enum(["self", "spouse", "child"]),
  name: z.string().trim().min(1).max(100), nationality: z.string().trim().min(1).max(60),
  expiry: dateSchema, passportNumber: z.string().max(30).default(""), confirmed: z.boolean(),
});
export const profileSchema = z.object({
  origin: z.string().max(100).default(""), arrival: z.union([dateSchema, z.literal("")]).default(""),
  budget: z.number().min(0).max(1000000).nullable().default(null),
  housing: z.string().max(100).default(""), school: z.string().max(100).default(""),
  health: z.string().max(100).default(""), deferred: z.array(z.enum(["origin", "arrival", "budget", "housing", "school", "health"])).default([]),
});
export type Profile = z.infer<typeof profileSchema>;
export type ProfileField = Exclude<keyof Profile, "deferred">;
export type Member = z.infer<typeof memberSchema>;
export type Route = z.infer<typeof routeSchema>;
export const costSchema = z.object({
  min: z.number().nonnegative().nullable(), max: z.number().nonnegative().nullable(),
  frequency: z.enum(["once", "monthly"]), currency: z.literal("AED"),
}).refine(cost => cost.min === null && cost.max === null || cost.min !== null && cost.max !== null && cost.max >= cost.min, "Invalid cost range.");
export const taskSchema = z.object({
  id: z.string(), phase: z.enum(["before", "arrival", "after"]), category: z.enum(["Residency", "Home", "Family", "Everyday"]),
  title: z.string(), description: z.string(), owner: z.string(), start: dateSchema, due: dateSchema,
  duration: z.number().int().positive(), dependencyIds: z.array(z.string()), documents: z.array(z.string()),
  status: z.enum(["todo", "doing", "done"]), risk: z.string(), cost: costSchema, sourceIds: z.array(z.string()),
});
export const planSchema = z.object({
  id: z.string(), version: z.number().int().positive(), caseId: z.string(), arrival: dateSchema,
  tasks: z.array(taskSchema).min(1).max(100), assumptions: z.array(z.string()), createdAt: z.string(),
});
export type PlanTask = z.infer<typeof taskSchema>;
export type Plan = z.infer<typeof planSchema>;
export const messageSchema = z.object({id: z.string(), role: z.enum(["user", "assistant"]), text: z.string().max(4000), sourceIds: z.array(z.string()), at: z.string()});
export type Message = z.infer<typeof messageSchema>;
export const changeSchema = z.object({
  id: z.string(), baseVersion: z.number(), reason: z.string(), plan: planSchema,
  diffs: z.array(z.object({ taskId: z.string(), title: z.string(), before: dateSchema, after: dateSchema })),
  maintainedGoal: z.boolean(), nextAction: z.string(), createdAt: z.string(),
});
export type PlanChange = z.infer<typeof changeSchema>;
export const caseSchema = z.object({
  id: z.string(), route: routeSchema.nullable(), sponsor: z.enum(["employer", "self", "undecided"]),
  members: z.array(memberSchema).max(12), profile: profileSchema, messages: z.array(messageSchema).max(200),
  plan: planSchema.nullable(), changes: z.array(changeSchema).max(50),
});
export type RelocationCase = z.infer<typeof caseSchema>;
