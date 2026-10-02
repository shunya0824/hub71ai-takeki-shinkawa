import { dateSchema } from "./schema";
import { nationalityFromCode, nationalityFromVisualText } from "./nationalities";

export type PassportReading = {
  name: string; nationality: string; passportNumber: string; birthDate: string; expiry: string;
  warnings: string[]; checks: { number: boolean; expiry: boolean; birth: boolean; composite: boolean };
};
export function mrzCheckDigit(value:string):string {
  return String([...value].reduce((sum,char,index)=>sum+(char==="<"?0:/\d/.test(char)?Number(char):char.charCodeAt(0)-55)*[7,3,1][index%3],0)%10);
}
const numeric = (value:string)=>value.replace(/[OQ]/g,"0").replace(/[IL]/g,"1").replace(/Z/g,"2").replace(/S/g,"5").replace(/G/g,"6").replace(/B/g,"8");
const normalize = (line:string)=>line.toUpperCase().replace(/[«‹＜]/g,"<").replace(/[^A-Z0-9<]/g,"");
function mrzDate(value:string,birth=false):string {
  if(!/^\d{6}$/.test(value))return "";
  const year=new Date().getUTCFullYear();const short=Number(value.slice(0,2));
  const candidates=[1900+short,2000+short,2100+short].filter(candidate=>!birth||`${candidate}-${value.slice(2,4)}-${value.slice(4,6)}`<=new Date().toISOString().slice(0,10)).sort((a,b)=>Math.abs(a-year)-Math.abs(b-year));
  const date=`${candidates[0]}-${value.slice(2,4)}-${value.slice(4,6)}`;
  return dateSchema.safeParse(date).success?date:"";
}
function repairNumber(value:string,check:string):string {
  if(mrzCheckDigit(value)===check)return value.replace(/</g,"");
  const options:Record<string,string>={O:"0",0:"O",I:"1",1:"I",B:"8",8:"B",S:"5",5:"S",Z:"2",2:"Z",G:"6",6:"G"};
  // Only accept one checksum-valid alternative; ambiguous candidates stay blank.
  const valid=new Set<string>();
  for(let index=0;index<value.length;index++){if(!options[value[index]])continue;const candidate=value.slice(0,index)+options[value[index]]+value.slice(index+1);if(mrzCheckDigit(candidate)===check)valid.add(candidate);}
  return valid.size===1?[...valid][0].replace(/</g,""):"";
}
export function parsePassportText(text:string):PassportReading {
  const lines=text.split(/\r?\n/).map(normalize).filter(Boolean);
  const result:PassportReading={name:"",nationality:"",passportNumber:"",birthDate:"",expiry:"",warnings:[],checks:{number:false,expiry:false,birth:false,composite:false}};
  const nameLine=lines.find(line=>/^P[A-Z<][A-Z<]{3}/.test(line)&&line.includes("<<")&&line.length>=15);
  if(nameLine){const parts=nameLine.slice(5).split("<<");const surname=parts[0].replace(/</g," ").trim();const given=(parts[1]||"").replace(/</g," ").trim();if(surname&&given)result.name=`${given} ${surname}`.replace(/\s+/g," ");}
  // A nationality has no MRZ check digit. Read its fixed position independently
  // of date validation; don't infer it from the issuing state in the first line.
  const nationalityVotes=new Map<string,number>();
  for(const line of lines){
    if(line===nameLine||line.length<28||!/[0-9OILSBZG]{6,9}[MF<]/.test(line.slice(13)))continue;
    const nationality=nationalityFromCode(line.slice(10,13));
    if(nationality)nationalityVotes.set(nationality,(nationalityVotes.get(nationality)||0)+1);
  }
  const ranked=[...nationalityVotes].sort((a,b)=>b[1]-a[1]);
  if(ranked.length===1||ranked[0]?.[1]>ranked[1]?.[1])result.nationality=ranked[0][0];
  const possible=lines.filter(line=>line.length>=28&&/[A-Z<]{3}[0-9OILSBZG]{7}[MF<][0-9OILSBZG]{7}/.test(line));
  let bestScore=-1;
  for(const original of possible){
    const line=original.slice(0,44);const code=line.slice(10,13);if(!/^[A-Z<]{3}$/.test(code))continue;
    const doc=line.slice(0,9);const number=repairNumber(doc,numeric(line[9]||""));const birth=numeric(line.slice(13,19));const expiry=numeric(line.slice(21,27));
    const checks={number:!!number,expiry:mrzCheckDigit(expiry)===numeric(line[27]||"")&&!!mrzDate(expiry),birth:mrzCheckDigit(birth)===numeric(line[19]||"")&&!!mrzDate(birth,true),composite:line.length===44&&mrzCheckDigit(line.slice(0,10)+line.slice(13,20)+line.slice(21,43))===numeric(line[43])};
    const score=Number(checks.birth)*3+Number(checks.expiry)*3+Number(checks.number)+Number(checks.composite);if(score<=bestScore)continue;bestScore=score;
    result.checks=checks;result.passportNumber=checks.number?number:"";result.birthDate=checks.birth?mrzDate(birth,true):"";result.expiry=checks.expiry?mrzDate(expiry):"";
  }
  if(!result.nationality)result.nationality=nationalityFromVisualText(text);
  // Visual-zone date fallback supports a partial result when the MRZ is cropped or unreadable.
  if(!result.expiry){const match=text.toUpperCase().match(/(?:EXPIRY|EXPIRATION)[\s\S]{0,65}?(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(20\d{2})/);if(match){const month=String(["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"].indexOf(match[2])+1).padStart(2,"0");const date=`${match[3]}-${month}-${match[1].padStart(2,"0")}`;if(dateSchema.safeParse(date).success)result.expiry=date;}}
  if(!result.name)result.warnings.push("Enter the full name.");
  if(!result.nationality)result.warnings.push("Select the nationality.");
  if(!result.birthDate)result.warnings.push("Check the date of birth.");
  if(!result.expiry)result.warnings.push("Check the expiry date.");
  return result;
}
