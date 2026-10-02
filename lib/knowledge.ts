import notes from "../knowledge/sources.json";
import type { RelocationCase } from "./schema";
export const sources = notes;
export const sourceIds = new Set<string>([
  ...sources.map(source => source.id),
  ...Array.from({ length: 28 }, (_, index) => `relocation-knowledge-ad-${String(index + 1).padStart(3, "0")}`),
]);
export type KnowledgeNote = typeof sources[number];

export function searchKnowledge(question: string, data?: Pick<RelocationCase, "route" | "sponsor">): KnowledgeNote[] {
  const text = question.toLowerCase();
  const scored = sources.map(note => ({ note, score: note.keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? keyword.length > 3 ? 3 : 1 : 0), 0) }));
  const matches = scored.filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  if (matches.length) return matches.slice(0, 3).map(item => item.note);
  const ids = ["adro-relocation", data?.route === "founder" ? "added-business" : data?.sponsor === "self" ? "uae-self" : "uae-residency"];
  return sources.filter(note => ids.includes(note.id));
}
