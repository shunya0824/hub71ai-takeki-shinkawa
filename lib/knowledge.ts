import notes from "../knowledge/sources.json";
export const sources = notes;
export const sourceIds = new Set<string>(sources.map(source => source.id));
