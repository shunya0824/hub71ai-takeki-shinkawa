"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ArrowRight, Check, UsersRound, Building2, BriefcaseBusiness, ShieldCheck, Plus, Upload, Trash2, Pencil, FileCheck2, Sparkles, Send, Clock3, X, LoaderCircle, ChevronLeft } from "lucide-react";
import { useCase, callApi } from "./provider";
import { SetupFrame, ErrorNotice, SourceLinks, LoadingState, FocusDialog } from "./shared";
import { memberSchema, type Member, type Plan, type Profile, type Route } from "@/lib/schema";
import { addDays, formatDate, money, nextQuestion, questions, today } from "@/lib/planner";
import { demoCase, demoMember } from "@/lib/demo";
import { toApiCase } from "@/lib/storage";

export function StartScreen() {
  const { data, setData } = useCase(); const router = useRouter();
  const [selected, setSelected] = useState<Route | null>(data.route); const [sponsor, setSponsor] = useState(data.sponsor);
  const available = selected && selected !== "founder" && sponsor === "employer";
  return <SetupFrame step={1} eyebrow="FIRST, THE BIG PICTURE" title="Every move has a story." intro="Let’s start with yours. How are you making your way to Abu Dhabi?">
    <div className="overview-banner"><div className="overview-icon"><GlobeMark/></div><div><h3>A quick lay of the land.</h3><p>Your route, residency, a place to live, and everyday essentials. We’ll bring them into one clear plan. Your employer confirms the exact residency requirements.</p></div><Link href="/resources">Read the essentials<ArrowUpRight size={17}/></Link></div>
    <div className="route-grid">{[
      { id: "corporate" as Route, icon: BriefcaseBusiness, title: "For work & teams", desc: "A new role. A new city. A smoother landing for you and your people.", label: "EMPLOYERS & EMPLOYEES" },
      { id: "founder" as Route, icon: Building2, title: "For big ideas", desc: "Build your business, find your community, and get your next venture moving.", label: "FOUNDERS & ENTREPRENEURS" },
      { id: "family" as Route, icon: UsersRound, title: "For you & your family", desc: "Make a new home, on your own or with the people who matter most.", label: "INDIVIDUALS & FAMILIES" },
    ].map(({id,icon:Icon,title,desc,label}) => <button key={id} className={`route-card ${selected === id ? "selected" : ""}`} aria-pressed={selected === id} onClick={() => setSelected(id)}><div><Icon size={31}/><span className="radio-mark">{selected === id && <Check size={13}/>}</span></div><span className="eyebrow">{label}</span><h2>{title}</h2><p>{desc}</p><small>{id === "founder" ? "Planning coming next" : "Employer-sponsored demo available"}</small></button>)}</div>
    {selected && <div className="sponsor-row"><label htmlFor="sponsor">Who will sponsor your residency?<small>Your sponsorship is separate from the route you choose.</small></label><select id="sponsor" value={sponsor} onChange={event => setSponsor(event.target.value as typeof sponsor)}><option value="employer">My employer</option><option value="self">Self-sponsored</option><option value="undecided">Not sure yet</option></select></div>}
    {selected && !available && <div className="info-note">This first demo covers an employer-sponsored move for employees and their families. Founder and self-sponsored planning are coming next. Choose an available route to explore the full experience.</div>}
    <div className="setup-bottom"><span><ShieldCheck size={16}/> No account. Just a first step.</span><button className="button primary" disabled={!available} onClick={() => { setData(previous => ({ ...previous, route: selected, sponsor })); router.push("/members"); }}>Meet your people<ArrowRight size={18}/></button></div>
  </SetupFrame>;
}
function GlobeMark() { return <svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="20" cy="20" rx="7" ry="16" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20h32M7 11h26M7 29h26" stroke="currentColor" strokeWidth="1.5"/></svg>; }
export function MembersScreen() {
  const { data, setData, ready, mode, simulateFailure } = useCase(); const router = useRouter();
  const [editing, setEditing] = useState<Member | null>(null); const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!ready) return <LoadingState/>;
  function add(relationship: Member["relationship"]) {
    setError(""); setWarnings([]); setConsent(false);
    setEditing({ id: crypto.randomUUID(), relationship, name: "", nationality: "", expiry: "", passportNumber: "", confirmed: false });
  }
  async function read(fixture: boolean, image?: string) {
    if (!consent || !editing) return;
    setBusy(true); setError("");
    try {
      const result = await callApi<{ candidate: Member; warnings: string[] }>("ocr", { consent, fixture, image }, simulateFailure);
      setEditing(previous => previous ? { ...previous, name: result.candidate.name, nationality: result.candidate.nationality, expiry: result.candidate.expiry, passportNumber: result.candidate.passportNumber, confirmed: false } : null);
      setWarnings(result.warnings);
    } catch (error) { setError(error instanceof Error ? error.message : "Image reading failed. Please retry."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 2000000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Use a PNG, JPEG, or WebP image under 2 MB."); return; }
    const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    await read(false, image);
    // No image URL or file content is retained in case state or localStorage.
  }
  function save(event: FormEvent) {
    event.preventDefault(); if (!editing) return;
    const result = memberSchema.safeParse({ ...editing, confirmed: true });
    if (!result.success) { setError("Please fill in the name, nationality, and a valid passport expiry date."); return; }
    if (result.data.expiry <= today()) { setError("The expiry date must be in the future."); return; }
    if (result.data.relationship === "self" && data.members.some(member => member.relationship === "self" && member.id !== result.data.id)) { setError("Only one main applicant is allowed."); return; }
    setData(previous => ({ ...previous, members: previous.members.some(member => member.id === result.data.id) ? previous.members.map(member => member.id === result.data.id ? result.data : member) : [...previous.members, result.data] }));
    setEditing(null); setError(""); setConsent(false);
  }
  const confirmed = data.members.length > 0 && data.members.some(member => member.relationship === "self") && data.members.every(member => member.confirmed);
  return <SetupFrame step={2} eyebrow="THE PEOPLE IN YOUR NEXT CHAPTER" title="Who’s coming along?" intro="Start with yourself, then add your family. A good plan makes room for everyone.">
    {!data.route && <div className="info-note">Choose your relocation route first. <Link href="/start">Go to your move →</Link></div>}
    <div className="members-layout"><div><div className="section-label"><h3>Your people <span>{data.members.length}</span></h3><button className="text-link" onClick={() => { const sample = demoCase(); setData(previous => ({...previous, members: sample.members})); }}>Use sample family<ArrowUpRight size={14}/></button></div><div className="member-list">{data.members.map(member => <article key={member.id} className="member-card"><span className={`member-avatar ${member.relationship}`}>{member.name.slice(0, 1)}</span><div><small>{member.relationship === "self" ? "MAIN APPLICANT" : member.relationship.toUpperCase()}</small><h3>{member.name}</h3><p>{member.nationality} · Expires {formatDate(member.expiry, true)}</p><span className="confirmed-label"><Check size={12}/>{member.confirmed ? "Information confirmed" : "Needs confirmation"}</span></div><button className="icon-button" aria-label={`Edit ${member.name}`} onClick={() => { setEditing(member); setConsent(false); setWarnings([]); setError(""); }}><Pencil size={16}/></button>{member.relationship !== "self" && <button className="icon-button" aria-label={`Remove ${member.name}`} onClick={() => setPendingDelete(member.id)}><Trash2 size={16}/></button>}</article>)}</div><button className="add-member" disabled={data.members.length >= 12} onClick={() => add(data.members.some(member => member.relationship === "self") ? "spouse" : "self")}><Plus size={19}/>{data.members.length ? "Add a family member" : "Add yourself"}<span>Every person, one clear plan.</span></button></div><aside className="privacy-card"><ShieldCheck size={28}/><h3>Your details.<br/>Your say.</h3><p>Review every field before confirming. Only confirmed information helps shape your plan.</p><ul><li><Check size={14}/> Use synthetic data for this demo.</li><li><Check size={14}/> Images are used for reading only.</li><li><Check size={14}/> Passport numbers stay out of plans.</li><li><Check size={14}/> Images and numbers are not saved.</li></ul><small>{mode === "live" ? "With your consent, image reading sends the image to OpenAI. You can also enter details manually." : "Try the synthetic specimen. Reading uploaded images requires an API key."}</small></aside></div>
    {data.plan && <div className="info-note">Your current plan keeps its existing tasks. Member edits are saved to your profile; changes to your family’s scope need a new planning review.</div>}
    <div className="setup-bottom"><Link className="text-link" href="/start"><ChevronLeft size={16}/> Your move</Link><button className="button primary" disabled={!confirmed || !data.route} onClick={() => router.push(data.plan ? "/dashboard" : "/consultation")}>{data.plan ? "Back to my dashboard" : "Let’s talk about your move"}<ArrowRight size={18}/></button></div>
    {editing && <FocusDialog className="modal-backdrop" onClose={() => { if (!busy) setEditing(null); }}><section className="modal member-modal" role="dialog" aria-modal="true" aria-labelledby="member-title"><div className="modal-heading"><span className="eyebrow">ONE PERSON. ALL THE DETAILS.</span><button className="icon-button" disabled={busy} aria-label="Close member editor" onClick={() => { setEditing(null); setError(""); }}><X size={20}/></button></div><h2 id="member-title">Let’s get to know you.</h2><p>Add details yourself or read a synthetic passport. Check the results before confirming.</p><ErrorNotice error={error}/><div className="upload-box"><label className="consent-label"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/><span>I agree to image processing. I will use synthetic data only. {mode === "live" ? "Uploaded images are sent to OpenAI for reading." : "The specimen uses simulated OCR."}</span></label><div className="button-row"><button className="button secondary small" disabled={!consent || busy} onClick={() => read(true)}>{busy ? <LoaderCircle className="spin" size={16}/> : <FileCheck2 size={16}/>}Try synthetic specimen</button><button className="button secondary small" disabled={!consent || busy || mode !== "live"} onClick={() => fileRef.current?.click()}><Upload size={16}/>Upload image</button></div><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Upload a synthetic passport image" onChange={event => upload(event.target.files?.[0]).catch(() => setError("The image could not be read. Please retry."))}/><small>PNG, JPEG, WebP · Up to 2 MB · No image is stored</small></div>{warnings.map((warning,index) => <p className="field-hint" key={index}>{warning}</p>)}<form onSubmit={save}><div className="form-grid"><label>Full name<input autoFocus required maxLength={100} value={editing.name} onChange={event => setEditing({...editing, name:event.target.value, confirmed:false})} placeholder="As shown on the document"/></label><label>Relationship<select value={editing.relationship} onChange={event => setEditing({...editing,relationship:event.target.value as Member["relationship"]})}><option value="self">Main applicant</option><option value="spouse">Spouse / partner</option><option value="child">Child</option></select></label><label>Nationality<input required maxLength={60} value={editing.nationality} onChange={event => setEditing({...editing,nationality:event.target.value,confirmed:false})} placeholder="e.g. United Kingdom"/></label><label>Passport expiry<input required type="date" min={addDays(today(),1)} value={editing.expiry} onInput={event => setEditing({...editing,expiry:event.currentTarget.value,confirmed:false})} onChange={event => setEditing({...editing,expiry:event.target.value,confirmed:false})}/></label><label className="full-width">Passport number <small>Session only · Never sent to the planning AI</small><input maxLength={30} value={editing.passportNumber} onChange={event => setEditing({...editing,passportNumber:event.target.value,confirmed:false})} placeholder="Optional for manual entry" autoComplete="off"/></label></div><button className="button primary full-width" disabled={busy} type="submit"><Check size={17}/>Confirm checked information</button></form></section></FocusDialog>}
    {pendingDelete && <FocusDialog className="modal-backdrop" onClose={() => setPendingDelete(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Remove this member?</h2><p>Their demo profile will be removed from this case.</p><div className="button-row"><button className="button secondary" autoFocus onClick={() => setPendingDelete(null)}>Keep member</button><button className="button primary" onClick={() => { setData(previous => ({...previous,members:previous.members.filter(member => member.id !== pendingDelete)})); setPendingDelete(null); }}>Remove member</button></div></section></FocusDialog>}
  </SetupFrame>;
}
export function ConsultationScreen() {
  const { data, setData, ready, mode, simulateFailure } = useCase(); const router = useRouter();
  const [input,setInput] = useState(""); const [busy,setBusy] = useState(false); const [generating,setGenerating] = useState(false); const [error,setError] = useState(""); const endRef = useRef<HTMLDivElement>(null);
  const question = nextQuestion(data.profile,data.members);
  const applicableQuestions = questions.filter(item => item.field !== "school" || data.members.some(member => member.relationship === "child"));
  const completed = applicableQuestions.filter(item => data.profile[item.field] || data.profile.deferred.includes(item.field)).length;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth",block:"nearest" }); },[data.messages.length,busy]);
  if (!ready) return <LoadingState/>;
  async function send(defer = false) {
    if (!question || busy || (!input.trim() && !defer)) return;
    const text = defer ? "I'd like to answer this later." : input.trim(); setBusy(true); setError("");
    try {
      const result = await callApi<{ profile:Profile; answer:string; sourceIds:string[] }>("chat",{data:toApiCase(data),field:question.field,message:text,defer},simulateFailure);
      const at = new Date().toISOString();
      setData(previous => ({...previous,profile:result.profile,messages:[...previous.messages,{id:crypto.randomUUID(),role:"user",text,sourceIds:[],at},{id:crypto.randomUUID(),role:"assistant",text:result.answer,sourceIds:result.sourceIds,at}].slice(-200) as typeof previous.messages}));
      setInput("");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not send. Please retry."); }
    finally { setBusy(false); }
  }
  async function build() {
    if (data.plan) { router.push("/plan"); return; }
    setGenerating(true); setError("");
    try { const result = await callApi<{ plan:Plan }>("plan",{data:toApiCase(data)},simulateFailure); setData(previous => ({...previous,plan:result.plan})); router.push("/plan"); }
    catch (error) { setError(error instanceof Error ? error.message : "Plan generation failed. Please retry."); }
    finally { setGenerating(false); }
  }
  const validMembers = data.members.some(member => member.relationship === "self") && data.members.every(member => member.confirmed);
  return <SetupFrame step={3} eyebrow="A CONVERSATION, NOT A COMPLICATED FORM" title="Let’s picture your life here." intro="Your priorities lead the way. We’ll help connect the dots.">
    {!validMembers || !data.route ? <div className="info-note">Confirm your people and your route before starting. <Link href="/members">Go to your people →</Link></div> : <div className="consultation-layout"><section className="chat-card"><div className="chat-header"><span className="assistant-avatar"><Sparkles size={20}/></span><div><h3>Your relocation guide</h3><span><span className="green-dot"/>{mode === "live" ? "AI connected · Always here for your next step" : "Demo guide · Scripted sample responses"}</span></div><span className="chat-time"><Clock3 size={13}/> ~15 min</span></div><div className="chat-history" aria-live="polite"><div className="chat-bubble assistant"><span className="bubble-label">YOUR GUIDE</span><p>Hi there! A fresh start in Abu Dhabi is a big adventure. We’ve got your confirmed people details, so we’ll focus on the rest. You can answer a question later whenever you need.</p></div>{data.messages.map(message => <div key={message.id} className={`chat-bubble ${message.role}`}><span className="bubble-label">{message.role === "user" ? "YOU" : "YOUR GUIDE"}</span><p>{message.text}</p><SourceLinks ids={message.sourceIds}/></div>)}{question ? <div className="chat-bubble assistant current-question"><span className="bubble-label">{question.title.toUpperCase()}</span><p>{question.text}</p></div> : <div className="chat-bubble assistant"><span className="bubble-label">LOOKING GOOD</span><p>We have enough to build your first plan. Any deferred details will stay visible as assumptions. Ready for your next chapter?</p></div>}{busy && <div className="typing-indicator" role="status">Your guide is thinking<span>•••</span></div>}<div ref={endRef}/></div><div className="chat-input-area"><ErrorNotice error={error}/>{question ? <><form className="chat-input" onSubmit={event => {event.preventDefault();send();}}><input aria-label={question.text} maxLength={2000} type={question.field === "arrival" ? "date" : "text"} min={question.field === "arrival" ? today() : undefined} key={question.field} value={input} onInput={event => setInput(event.currentTarget.value)} onChange={event => setInput(event.target.value)} placeholder={question.placeholder} disabled={busy}/><button className="send-button" aria-label="Send answer" disabled={busy || !input.trim()}><Send size={19}/></button></form><div className="chat-input-meta"><button className="text-link" disabled={busy} onClick={() => send(true)}>Answer this later<ArrowRight size={13}/></button><span>Saved as you go · Use synthetic details only</span></div></> : <button className="button primary full-width" disabled={generating} onClick={build}>{generating ? <><LoaderCircle className="spin" size={17}/>Putting your plan together…</> : <>See my relocation plan<ArrowUpRight size={18}/></>}</button>}</div></section><aside className="profile-card"><span className="eyebrow">TAKING SHAPE</span><h3>Your move, so far.</h3><div className="profile-progress"><div style={{width:`${completed / applicableQuestions.length * 100}%`}}/></div><p className="field-hint">{completed} of {applicableQuestions.length} planning details captured</p><div className="profile-item"><span>Your people</span><strong>{data.members.length} {data.members.length === 1 ? "person" : "people"}<Check size={13}/></strong></div>{questions.filter(item => item.field !== "school" || data.members.some(member => member.relationship === "child")).map(({field,title}) => <div className="profile-item" key={field}><span>{title}</span><strong>{data.profile.deferred.includes(field) ? <span className="deferred">For later</span> : data.profile[field] ? <>{field === "budget" ? `AED ${money(data.profile.budget!)}/mo` : field === "arrival" ? formatDate(data.profile.arrival,true) : String(data.profile[field])}<Check size={13}/></> : <span className="not-answered">Still to explore</span>}</strong></div>)}<div className="profile-tip"><Sparkles size={17}/><p>Nothing has to be perfect today. Your plan can grow with you.</p></div><button className="button secondary small full-width" disabled={generating || busy} onClick={build}>{generating ? "Building your plan…" : data.plan ? "Open existing plan" : "Build with what we know"}<ArrowRight size={15}/></button></aside></div>}
    <div className="setup-bottom"><Link className="text-link" href="/members"><ChevronLeft size={16}/> Your people</Link><span><ShieldCheck size={15}/> Your conversation stays on this browser.</span></div>
  </SetupFrame>;
}
