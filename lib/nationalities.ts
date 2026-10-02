import countries from "i18n-iso-countries";
import english from "i18n-iso-countries/langs/en.json";

countries.registerLocale(english);
const names:Record<string,string>={...countries.getNames("en"),US:"United States",KR:"South Korea",KP:"North Korea"};
// ICAO Doc 9303-3 exceptions to ISO 3166-1, kept distinct from issuing country.
const special:Record<string,string>={"D<<":"Germany",GBD:"British Overseas Territories Citizen",GBN:"British National (Overseas)",GBO:"British Overseas Citizen",GBS:"British Subject",GBP:"British Protected Person",RKS:"Kosovo"};
export const nationalityOptions=[...Object.entries(names).map(([code,name])=>({code:countries.alpha2ToAlpha3(code)!,name})),...Object.entries(special).filter(([code])=>code!=="D<<").map(([code,name])=>({code,name}))].sort((a,b)=>a.name.localeCompare(b.name,"en"));
export function nationalityFromCode(code:string):string {
  if(special[code])return special[code];
  const alpha2=countries.alpha3ToAlpha2(code);return alpha2?names[alpha2]||"":"";
}
export function normalizeNationality(value:string):string {
  const text=value.trim();const code=text.toUpperCase();
  if(nationalityFromCode(code))return nationalityFromCode(code);
  const alpha2=countries.getAlpha2Code(text,"en");return alpha2?names[alpha2]||text:text;
}
const visualNames=Object.entries(names).flatMap(([code,name])=>[...new Set([name,...(countries.getName(code,"en",{select:"all"})||[])])].map(alias=>({alias:alias.toUpperCase(),name}))).sort((a,b)=>b.alias.length-a.alias.length);
export function nationalityFromVisualText(text:string):string {
  // Restrict matching to the labelled nationality field, not the issuing-state header.
  const field=text.toUpperCase().match(/NATIONALITY\b([\s\S]{0,90})/)?.[1];
  if(!field)return "";
  const matches=visualNames.flatMap(({alias,name})=>{
    const match=new RegExp(`(?:^|[^A-Z])${alias.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?=$|[^A-Z])`).exec(field);
    return match?[{name,index:match.index}]:[];
  }).sort((a,b)=>a.index-b.index);
  return matches[0]?.name||"";
}
