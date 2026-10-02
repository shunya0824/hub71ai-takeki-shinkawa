import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RelocationCase } from "./schema";

export type AgentKnowledge = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  checked: string;
  status: string;
  keywords: string[];
  summary: string;
};

const documentPath = join(process.cwd(), "knowledge", "Abu-Dhabi-Relocation-Agent-Knowledge-ja.md");
const metadata = readFileSync(documentPath, "utf8").match(/^information_as_of:\s*(.+)$/m)?.[1]?.trim() || "unknown";
const markdown = readFileSync(documentPath, "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");

const aliases: Record<string, string[]> = {
  "AD-001": ["政府", "政府機関", "行政", "役所", "機関", "ICP", "TAMM", "UAE PASS", "Tawtheeq", "AccessRP", "MOFA", "MOCCAE"],
  "AD-002": ["移住", "引越", "渡航", "到着", "手順", "順序", "流れ", "準備", "入国", "residency", "arrival", "relocation"],
  "AD-003": ["雇用", "就職", "会社員", "従業員", "雇用主", "勤務先", "HR", "employment", "employee", "employer"],
  "AD-004": ["家族", "配偶者", "夫", "妻", "子供", "子ども", "扶養", "家族ビザ", "family", "dependent", "sponsor"],
  "AD-005": ["ゴールデンビザ", "ゴールデンレジデンス", "不動産投資", "投資家", "物件投資", "golden residency", "property investor"],
  "AD-006": ["費用", "料金", "申請料", "ビザ費用", "手数料", "いくら", "application cost", "fee"],
  "AD-007": ["書類", "出発前", "渡航前", "持ち物", "必要書類", "documents", "before departure"],
  "AD-008": ["認証", "公証", "領事認証", "アポスティーユ", "翻訳", "婚姻証明", "出生証明", "学位", "attestation", "translation"],
  "AD-009": ["健康診断", "メディカル", "医療検査", "エミレーツID", "指紋", "生体認証", "medical screening", "biometrics"],
  "AD-010": ["UAE PASS", "携帯", "電話", "SIM", "eSIM", "電話番号", "通信会社", "mobile", "telecom"],
  "AD-011": ["空港", "AUH", "タクシー", "バス", "一時滞在", "仮住まい", "ホテル", "空港バス", "airport", "temporary accommodation"],
  "AD-012": ["住む場所", "住宅地", "地域", "エリア", "地区", "リーム島", "サディヤット", "ヤス島", "カリファシティ", "neighbourhood", "neighborhood"],
  "AD-013": ["家賃", "賃貸費用", "敷金", "デポジット", "前払い", "小切手", "支払回数", "rent", "upfront", "cheque"],
  "AD-014": ["内見", "賃貸契約", "契約", "家具", "入居", "引き渡し", "viewing", "tenancy contract", "handover"],
  "AD-015": ["Tawtheeq", "タウシーク", "AccessRP", "賃貸登録", "契約登録", "tawtheeq", "accessrp"],
  "AD-016": ["電気", "水道", "光熱費", "自治体料金", "市税", "TAQA", "municipality fee", "utilities"],
  "AD-017": ["冷房", "冷却", "エアコン", "インターネット", "ネット", "wifi", "冷房費", "cooling", "internet"],
  "AD-018": ["銀行", "銀行口座", "口座", "小切手帳", "チェックブック", "bank account", "cheque book"],
  "AD-019": ["保険", "医療保険", "健康保険", "保険補償", "insurance", "health cover"],
  "AD-020": ["病院", "医療", "薬", "処方薬", "治療", "クリニック", "healthcare", "medication"],
  "AD-021": ["学校", "教育", "カリキュラム", "入学", "学校選び", "学年", "admission", "curriculum"],
  "AD-022": ["学費", "スクールバス", "学校書類", "教育費", "通学", "制服", "school fees", "school documents"],
  "AD-023": ["運転免許", "免許", "免許切替", "免許交換", "運転免許証", "driving licence", "driving license"],
  "AD-024": ["車", "自動車", "レンタカー", "車購入", "自動車購入", "走行距離", "car rental", "buy a car"],
  "AD-025": ["ダルブ", "通行料", "道路料金", "有料道路", "Darb", "toll", "crossing"],
  "AD-026": ["マワーキフ", "駐車", "駐車場", "駐車料金", "Mawaqif", "parking"],
  "AD-027": ["起業", "会社設立", "事業", "フリーランス", "事業ライセンス", "営業許可", "ADDED", "business licence", "freelance"],
  "AD-028": ["ペット", "犬", "猫", "動物", "ペット輸入", "犬の輸入", "猫の輸入", "pet import", "MOCCAE"],
};

const sections: AgentKnowledge[] = [...markdown.matchAll(/^## (AD-\d{3})\s+(.+)\r?\n([\s\S]*?)(?=^## AD-\d{3}\s|\s*$)/gm)].map((match) => {
  const [, sectionId, title, body] = match;
  const id = `relocation-knowledge-${sectionId.toLowerCase()}`;
  return {
    id,
    title: `${sectionId} ${title}`,
    publisher: "Abu Dhabi Relocation Knowledge (provided project reference)",
    url: "",
    checked: metadata,
    status: "Reference document; verify current requirements with the named authority",
    keywords: aliases[sectionId] || [],
    summary: body.trim(),
  };
});

const stopWords = new Set("a an and are as at be by can do for from how i in is it me my of on or our the this to was we what when where which with you your about tell explain please would should does abu dhabi uae per".split(" "));
function terms(text: string) {
  return text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((term) => term.length > 1 && !stopWords.has(term)) || [];
}

export function isAgentKnowledgeId(id: string) {
  return sections.some((section) => section.id === id);
}

export function searchAgentKnowledge(question: string, _data?: Pick<RelocationCase, "route" | "sponsor">): AgentKnowledge[] {
  const query = question.toLocaleLowerCase();
  const queryTerms = [...new Set(terms(question))];
  const ranked = sections.map((section) => {
    const title = section.title.toLocaleLowerCase();
    const body = section.summary.toLocaleLowerCase();
    const aliasScore = section.keywords.reduce((score, keyword) => score + (query.includes(keyword.toLocaleLowerCase()) ? 8 : 0), 0);
    const titleScore = queryTerms.reduce((score, term) => score + (title.includes(term) ? 4 : 0), 0);
    const bodyScore = queryTerms.reduce((score, term) => score + (body.includes(term) ? 1 : 0), 0);
    return { section, score: aliasScore + titleScore + Math.min(bodyScore, 6) };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  return ranked.slice(0, 3).map(({ section }) => section);
}

export const agentKnowledgeIds = new Set(sections.map((section) => section.id));
