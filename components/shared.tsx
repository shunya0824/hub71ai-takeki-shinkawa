"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, LayoutDashboard, ListChecks, UsersRound, BookOpen, Sparkles, RotateCcw, ArrowLeft, Check, AlertCircle, FlaskConical, CircleHelp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCase } from "./provider";
import { sources } from "@/lib/knowledge";
import { formatDate } from "@/lib/planner";

export function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="DiveAbuDhabi home"><svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M5 7v22h7V7H5Zm10 0v15a7 7 0 0 0 7 7h9v-7h-7a2 2 0 0 1-2-2V7h-7Z" fill="currentColor"/><path d="M27 7h5v11h-5z" fill="currentColor"/></svg><span>dive<span className="brand-city">{compact ? "AD" : "AbuDhabi"}</span><span className="brand-dot">.</span></span></Link>;
}
export function ErrorNotice({ error }: { error: string }) { return error ? <div className="error-notice" role="alert"><AlertCircle size={18}/><span>{error}</span></div> : null; }
export function DemoBadge() { const { mode } = useCase(); return <span className={`mode-badge ${mode}`}><span/>{mode === "live" ? "AI connected" : "Interactive demo"}</span>; }
export function TopNav() {
  const { data } = useCase();
  return <header className="topnav"><Logo/><nav aria-label="Main navigation"><a href="/#how-it-works">How it works</a><Link href="/resources">The essentials <ArrowUpRight size={14}/></Link></nav><div className="nav-right"><DemoBadge/><Link className="button small dark" href={data.plan ? "/dashboard" : data.route ? "/members" : "/start"}>{data.plan ? "Your dashboard" : "Get started"}<ArrowUpRight size={16}/></Link></div></header>;
}
export function SetupFrame({ step, title, eyebrow, intro, children }: { step: number; title: string; eyebrow: string; intro: string; children: ReactNode }) {
  return <><TopNav/><main id="main-content" className="setup-main"><div className="setup-progress" aria-label={`Step ${step} of 4`}>
    {["Your move", "Your people", "Your conversation", "Your plan"].map((label, index) => <div key={label} className={index + 1 <= step ? "active" : ""}><span>{index + 1 < step ? <Check size={13}/> : `0${index + 1}`}</span><b>{label}</b></div>)}
  </div><div className="setup-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div>{children}</main><footer className="simple-footer"><span>Your new chapter starts with one small step.</span><span>Made for Abu Dhabi. Made for you.</span></footer></>;
}
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const { data, ready, storageError, reset, simulateFailure, setSimulateFailure } = useCase();
  const [confirmReset, setConfirmReset] = useState(false); const [tools, setTools] = useState(false);
  const links = [{ href: "/dashboard", title: "Overview", icon: LayoutDashboard }, { href: "/plan", title: "My relocation plan", icon: ListChecks }, { href: "/members", title: "My people", icon: UsersRound }, { href: "/resources", title: "Helpful resources", icon: BookOpen }];
  const name = data.members.find(member => member.relationship === "self")?.name || "Your move";
  return <div className="app-layout"><aside className="sidebar"><Logo compact/><div className="workspace-label">YOUR NEW CHAPTER</div><nav aria-label="Workspace navigation">{links.map(({href, title, icon: Icon}) => <Link key={href} href={href} className={pathname === href ? "selected" : ""}><Icon size={19}/>{title}{pathname === href && <span className="selected-dot"/>}</Link>)}</nav><div className="sidebar-invite"><span className="starburst">✳</span><h3>A little less admin.<br/>A lot more possibility.</h3><p>One place for every step of your move.</p><Link href="/consultation">Continue your conversation <ArrowUpRight size={15}/></Link></div><div className="sidebar-bottom"><DemoBadge/><button className="text-button" onClick={() => setTools(!tools)}><CircleHelp size={17}/>Demo settings</button>{tools && <div className="demo-tools"><label><input type="checkbox" checked={simulateFailure} onChange={event => setSimulateFailure(event.target.checked)}/><span>Simulate API failure</span></label><button className="text-button" onClick={() => setConfirmReset(true)}><RotateCcw size={14}/>Reset all demo data</button></div>}<div className="user-card"><span className="avatar">{name.slice(0, 1)}</span><div><strong>{name}</strong><small>Personal workspace</small></div></div></div></aside><div className="app-body"><header className="workspace-topbar"><Link href="/" className="text-link"><ArrowLeft size={15}/> Back to home</Link><span><span className="green-dot"/>{storageError ? "Session storage needs attention" : ready ? "Saved on this browser" : "Loading your workspace"}</span><button className="mobile-tools-button" aria-expanded={tools} onClick={() => setTools(!tools)}><CircleHelp size={14}/>Settings</button></header><main id="main-content" className="workspace-main">{tools && <div className="mobile-demo-tools"><label><input type="checkbox" checked={simulateFailure} onChange={event => setSimulateFailure(event.target.checked)}/>Simulate API failure</label><button className="text-button" onClick={() => setConfirmReset(true)}><RotateCcw size={14}/>Reset all demo data</button></div>}<ErrorNotice error={storageError}/>{children}</main><footer className="workspace-footer"><span>Every move is a new beginning.</span><span>DiveAbuDhabi © {new Date().getFullYear()}</span></footer></div>{confirmReset && <FocusDialog className="modal-backdrop" onClose={() => setConfirmReset(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><RotateCcw size={28}/><h2 id="reset-title">Start a fresh chapter?</h2><p>This deletes your saved demo members, conversation, plan, and progress from this browser.</p><div className="button-row"><button className="button secondary" autoFocus onClick={() => setConfirmReset(false)}>Keep my data</button><button className="button primary" onClick={() => { reset(); setConfirmReset(false); window.location.assign("/start"); }}>Reset demo</button></div></section></FocusDialog>}</div>;
}
export function SourceLinks({ ids }: { ids: string[] }) {
  return <div className="source-links">{sources.filter(source => ids.includes(source.id)).map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><BookOpen size={12}/>{source.publisher}<ArrowUpRight size={12}/><span className="sr-only">{source.title}, {source.status}, checked {formatDate(source.checked, true)}</span></a>)}</div>;
}
export function EmptyPlan() { return <div className="empty-state"><Sparkles size={38}/><span className="eyebrow">YOUR STORY STARTS HERE</span><h1>Let’s make your move.</h1><p>A few details about you. A conversation about your goals. A plan that brings it all together.</p><Link href="/start" className="button primary">Build my plan<ArrowUpRight size={17}/></Link></div>; }
export function LoadingState() { return <div className="empty-state" role="status"><span className="spinner"/><p>Opening your workspace…</p></div>; }
export function DemoNote() { return <div className="demo-note"><FlaskConical size={15}/><span>Demo estimates and schedules. Confirm requirements, eligibility, and quotes with your employer and providers.</span></div>; }

export function FocusDialog({ children, className, onClose }: { children: ReactNode; className: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled):not([type="file"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
    if (!ref.current?.contains(document.activeElement)) controls()[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const items = controls();
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
