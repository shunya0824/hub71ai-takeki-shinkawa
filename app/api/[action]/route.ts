import { z } from "zod";
import { caseSchema, dateSchema, planSchema, profileSchema, type ProfileField } from "@/lib/schema";
import { nextQuestion, generatePlan, validatePlan, replan, today } from "@/lib/planner";
import { aiEnabled, consult, interpretChange, personalizePlan, readPassport } from "@/lib/ai";
import { demoMember } from "@/lib/demo";
import { failure, limitRequest, readBody } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 90;
const fields = ["origin", "arrival", "budget", "housing", "school", "health"] as const;
const changeInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("delay"), taskId: z.string(), days: z.number().int().min(1).max(90) }),
  z.object({ kind: z.literal("arrival"), arrival: dateSchema }),
]);
export async function GET(_request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action !== "status") return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ mode: aiEnabled() ? "live" : "demo", model: aiEnabled() ? process.env.OPENAI_MODEL || "gpt-4.1-mini" : null }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!["ocr", "chat", "plan", "replan"].includes(action)) return Response.json({ error: "Not found." }, { status: 404 });
  if (!limitRequest(request)) return Response.json({ error: "Too many requests. Please wait one minute and retry." }, { status: 429 });
  if (process.env.NODE_ENV === "development" && request.headers.get("x-demo-failure") === "1") return Response.json({ error: "Simulated connection failure. Your input is safe. Turn off the failure simulation and retry." }, { status: 503 });
  try {
    const body = await readBody(request, action === "ocr" ? 3000000 : 200000);
    const mode = aiEnabled() ? "live" : "demo";
    if (action === "ocr") {
      const input = z.object({ consent: z.literal(true), image: z.string().max(2800000).optional(), fixture: z.boolean().optional() }).parse(body);
      if (input.fixture) return Response.json({ mode: "demo", candidate: demoMember, warnings: ["Synthetic specimen data. Check and correct every field before confirming."] });
      if (!input.image || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(input.image)) throw new Error("Upload a PNG, JPEG, or WebP image under 2 MB.");
      if (!aiEnabled()) throw new Error("Image reading needs an OpenAI API key. Use the synthetic specimen to try the demo.");
      const result = await readPassport(input.image);
      const expiry = dateSchema.safeParse(result.expiry);
      return Response.json({ mode, candidate: { ...demoMember, name: result.name || "", nationality: result.nationality || "", passportNumber: result.passportNumber || "", expiry: expiry.success ? expiry.data : "", confirmed: false }, warnings: result.warnings });
    }
    if (action === "chat") {
      const input = z.object({ data: caseSchema, field: z.enum(fields), message: z.string().trim().min(1).max(2000), defer: z.boolean().optional() }).parse(body);
      const profile = structuredClone(input.data.profile);
      let answer: string; let citations: string[] = [];
      let value: string | null = input.message; let deferred = input.defer || /^(later|i don'?t know|not sure|skip|後で|わからない)$/i.test(input.message);
      if (aiEnabled() && !deferred) { const result = await consult(input.data, input.field, input.message); answer = result.answer; value = result.value; deferred = result.deferred; citations = result.sourceIds; }
      else answer = deferred ? "That's okay. I've marked this for follow-up and will make the assumption visible in your plan." : "Thanks, I've captured that. Let's keep shaping your move.";
      if (deferred) { profile.deferred = [...new Set([...profile.deferred, input.field])]; }
      else if (value !== null) {
        if (input.field === "arrival") { const date = dateSchema.safeParse(value); if (!date.success || date.data < today()) throw new Error("Please enter an arrival date today or later, using YYYY-MM-DD."); profile.arrival = date.data; }
        else if (input.field === "budget") { const amount = Number(value.replace(/[^\d.]/g, "")); if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) throw new Error("Enter a monthly budget between AED 1 and AED 1,000,000."); profile.budget = amount; }
        else { profile[input.field as Exclude<ProfileField, "arrival" | "budget">] = mode === "demo" && /[\u3040-\u30ff\u3400-\u9fff]/.test(value) ? (input.field === "origin" ? "Origin to confirm in English" : input.field === "housing" ? "Housing preferences to confirm" : input.field === "school" ? "School preferences to confirm" : "Insurance details to confirm") : value; }
        profile.deferred = profile.deferred.filter(field => field !== input.field);
      }
      const checked = profileSchema.parse(profile); const question = nextQuestion(checked, input.data.members);
      return Response.json({ mode, profile: checked, answer, sourceIds: citations, question: question || null });
    }
    if (action === "plan") {
      const { data } = z.object({ data: caseSchema }).parse(body);
      if (data.plan) throw new Error("A plan already exists. Update it through a change proposal to preserve completed work.");
      if (data.profile.arrival && data.profile.arrival < today()) throw new Error("Choose a future arrival date before generating a plan.");
      if (data.members.some(member => member.expiry <= (data.profile.arrival || today()))) throw new Error("A member's passport expires before arrival. Please review member information.");
      let plan = generatePlan(data);
      if (aiEnabled()) plan = validatePlan(await personalizePlan(plan, data.profile));
      return Response.json({ mode, plan });
    }
    const input = z.object({ plan: planSchema, change: changeInput.optional(), message: z.string().max(2000).optional() }).parse(body);
    validatePlan(input.plan);
    let change = input.change;
    if (!change && input.message) {
      if (aiEnabled()) {
        const intent = await interpretChange(input.plan, input.message);
        if (intent.kind === "clarify") return Response.json({ mode, clarification: intent.clarification });
        change = changeInput.parse(intent);
      } else {
        const match = input.message.match(/(?:delay|delayed|遅れ|遅延).*?(\d+)\s*(?:days?|日)/i) || input.message.match(/(\d+)\s*(?:days?|日).*?(?:delay|delayed|遅れ|遅延)/i);
        if (!match) return Response.json({ mode, clarification: "In demo mode, use the delay or arrival controls below. Free-form change interpretation becomes available when an API key is configured." });
        const matches: [string, RegExp][] = [["documents", /document|書類/i], ["school", /school|学校/i], ["housing", /housing|home|住居/i], ["residency", /residency|medical|居住|健康/i], ["bank", /bank|銀行/i], ["stay", /temporary|hotel|宿泊/i], ["employer", /employer|HR|雇用/i]];
        const matchedTask = matches.find(([id, pattern]) => pattern.test(input.message!) && input.plan.tasks.some(task => task.id === id));
        if (!matchedTask) return Response.json({ mode, clarification: "Which step is delayed? Select it in the quick change controls below." });
        change = { kind: "delay", taskId: matchedTask[0], days: Number(match[1]) };
      }
    }
    if (!change) throw new Error("Choose a change or describe what happened.");
    change = changeInput.parse(change);
    if (change.kind === "arrival" && change.arrival < today()) throw new Error("Choose an arrival date today or later.");
    return Response.json({ mode, proposal: replan(input.plan, change) });
  } catch (error) { return failure(error); }
}
