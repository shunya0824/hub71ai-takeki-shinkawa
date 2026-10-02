import { searchKnowledge } from "./knowledge";
import type { AgentKnowledge } from "./agent-knowledge";
import { blockers, formatDate, money, summarizeCosts } from "./planner";
import type { RelocationCase } from "./schema";

export function localGuide(data: RelocationCase, message: string, reference: AgentKnowledge[] = []) {
  const text = message.trim();
  const base = { answer: "", sourceIds: [] as string[], taskId: null as string | null, days: null as number | null, arrival: null as string | null, budget: null as number | null, housing: null as string | null, school: null as string | null, health: null as string | null };
  const hypothetical = /what if|would|could|can i|どうなる|できますか/i.test(text);
  if (!hypothetical && data.plan) {
    const date = text.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (date && /arrival|arriv|land|到着/i.test(text)) return { ...base, kind: "arrival" as const, arrival: date, answer: "Here's your timeline with the new arrival date." };
    const delay = text.match(/(\d+)\s*(?:days?|日)/i);
    if (/delay|late|遅れ|遅延/i.test(text)) {
      const patterns: [string, RegExp][] = [["documents", /document|書類/i], ["licence", /licen[cs]e|ライセンス/i], ["business", /business setup|company|会社|起業/i], ["school", /school|学校/i], ["housing", /housing|home|住居/i], ["residency", /residency|medical|居住|健康/i], ["bank", /bank|銀行/i], ["stay", /stay|hotel|宿泊/i], ["employer", /employer|HR|雇用/i]];
      const taskId = patterns.find(([id, pattern]) => pattern.test(text) && data.plan!.tasks.some(task => task.id === id && task.status !== "done"))?.[0];
      if (taskId && delay) return { ...base, kind: "delay" as const, taskId, days: Number(delay[1]), answer: "Here are the dates that would change." };
      return { ...base, kind: "clarify" as const, answer: "Which step is delayed, and by how many days?" };
    }
    const amount = text.match(/(?:budget|予算)[^\d]{0,30}(?:AED\s*)?([\d,]+)/i) || text.match(/(?:AED\s*)([\d,]+).*?(?:budget|予算)/i);
    if (amount && /change|update|new|my budget|budget is|予算.*(?:変更|に|は)|更新/i.test(text)) return { ...base, kind: "profile" as const, budget: Number(amount[1].replaceAll(",", "")), answer: "Here's your plan with the updated monthly budget." };
    if (/refresh|update.*(?:people|family)|家族.*(?:反映|更新)/i.test(text)) return { ...base, kind: "refresh" as const, answer: "Here's the plan for your updated people." };
    if (/change|update|switch|変更|更新/i.test(text)) {
      if (/school|学校/i.test(text)) return { ...base, kind: "profile" as const, school: /\bno\b|none|not need|不要/i.test(text) ? "Not needed" : text.replace(/^.*?(?:to|に)\s*/i, "").slice(0, 100), answer: "Here's the updated school plan." };
      if (/home|housing|apartment|bedroom|住居|住宅/i.test(text)) return { ...base, kind: "profile" as const, housing: /[\u3040-\u9fff]/.test(text) ? "Updated housing preferences" : text.replace(/^.*?\bto\s+/i, "").slice(0, 100), answer: "Here's your updated housing plan." };
    }
  }
  if (/next|first|today|次|最初|今日/i.test(text) && data.plan) {
    const task = data.plan.tasks.filter(task => task.status !== "done" && !blockers(task, data.plan!).length).sort((a, b) => a.due.localeCompare(b.due))[0];
    return { ...base, kind: "answer" as const, answer: task ? `Start with “${task.title}” by ${formatDate(task.due)}. ${task.description}` : "All your steps are complete. Enjoy your new chapter in Abu Dhabi." };
  }
  if (/fee|price|cost|how much|費用|料金|いくら/i.test(text) && data.plan) {
    const costs = summarizeCosts(data.plan);
    return { ...base, kind: "answer" as const, answer: `Your moving budget is AED ${money(costs[0].amount)}. Your monthly allocation is AED ${money(costs[1].amount)}.` };
  }
  const knowledge = reference.length ? reference : searchKnowledge(text, data);
  const matching = reference.length ? reference : knowledge.filter(note => note.keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase())));
  if (!matching.length) return { ...base, kind: "answer" as const, answer: "I can help with residency, company setup, housing, schools, and getting settled. What would you like to explore?" };
  const queryTerms = text.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [];
  const excerpts = matching.slice(0, 2).map(note => {
    const paragraphs = note.summary.split(/\n\s*\n/).map(part => part.replace(/^#+\s.*\n/gm, "").replace(/\|/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
    const best = paragraphs.map(paragraph => ({ paragraph, score: queryTerms.filter(term => paragraph.toLocaleLowerCase().includes(term)).length })).sort((a, b) => b.score - a.score)[0]?.paragraph || note.summary;
    return best.length > 520 ? `${best.slice(0, 517).trimEnd()}…` : best;
  });
  return { ...base, kind: "answer" as const, answer: excerpts.join("\n\n"), sourceIds: matching.slice(0, 2).map(note => note.id) };
}
