"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ArrowLeft, Check, AlertCircle, X, RotateCcw, Settings2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCase } from "./provider";

export function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" aria-label="DiveAbuDhabi home"><span>dive<span className="brand-city">{compact ? "AD" : "AbuDhabi"}</span><span className="brand-dot">.</span></span></Link>;
}
export function ErrorNotice({ error }: { error: string }) { return error ? <div className="error-notice" role="alert"><AlertCircle size={18}/><span>{error}</span></div> : null; }
export function TopNav() {
  const { data } = useCase();
  return <header className="topnav"><Logo/><nav aria-label="Main navigation"><Link href="/resources">Ask your guide</Link></nav><Link className="button small dark" href={data.plan ? "/dashboard" : "/start"}>{data.plan ? "Your move" : "Start your move"}<ArrowUpRight size={17}/></Link></header>;
}
export function SetupFrame({ step, title, eyebrow, intro, children }: { step: number; title: string; eyebrow: string; intro: string; children: ReactNode }) {
  return <><TopNav/><main id="main-content" className="setup-main"><div className="setup-progress" aria-label={`Step ${step} of 4`}>
    {["Your move", "Your people", "Your priorities", "Your plan"].map((label, index) => <div key={label} className={index + 1 <= step ? "active" : ""}><span>{index + 1 < step ? <Check size={14}/> : `0${index + 1}`}</span><b>{label}</b></div>)}
  </div><div className="setup-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div>{children}</main><footer className="simple-footer"><span>A new city. Your next chapter.</span><span>Abu Dhabi, UAE</span></footer></>;
}
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const { ready, storageError, reset } = useCase();
  const [settings, setSettings] = useState(false); const [confirmReset, setConfirmReset] = useState(false);
  return <div className="app-layout"><header className="app-nav"><Logo/><nav aria-label="Workspace navigation"><Link className={pathname === "/plan" || pathname === "/dashboard" ? "selected" : ""} href="/dashboard">Your move</Link><Link className={pathname === "/members" ? "selected" : ""} href="/members">Your people</Link><Link className={pathname === "/resources" ? "selected" : ""} href="/resources">Your guide</Link></nav><div className="app-nav-actions"><span className="saved-indicator"><span/>{ready ? "Saved" : "Loading"}</span><button className="icon-button" aria-label="Open settings" onClick={()=>setSettings(!settings)}><Settings2 size={20}/></button>{settings&&<div className="settings-menu"><button onClick={()=>{setConfirmReset(true);setSettings(false);}}><RotateCcw size={16}/>Start a new move</button></div>}</div></header><main id="main-content" className="workspace-main"><ErrorNotice error={storageError}/>{children}</main><footer className="workspace-footer"><span>Made for your next chapter.</span><span>Abu Dhabi · 24.4539° N</span></footer>{confirmReset&&<FocusDialog className="modal-backdrop" onClose={()=>setConfirmReset(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><button className="modal-close icon-button" autoFocus aria-label="Close reset" onClick={()=>setConfirmReset(false)}><X size={20}/></button><h2 id="reset-title">Start fresh?</h2><p>Your saved people, conversation, and plan will be cleared.</p><div className="button-row"><button className="button secondary" onClick={()=>setConfirmReset(false)}>Keep my move</button><button className="button primary" onClick={()=>{reset();window.location.assign("/start");}}>Start fresh<ArrowUpRight size={17}/></button></div></section></FocusDialog>}</div>;
}
// Provenance remains attached to API responses and saved messages, without external-link UI.
export function SourceLinks({ ids: _ids }: { ids: string[] }) { return null; }
export function EmptyPlan() { return <div className="empty-state"><span className="eyebrow">YOUR NEXT CHAPTER</span><h1>Make your move.</h1><p>Your people. Your priorities. One clear plan.</p><Link href="/start" className="button primary">Build my plan<ArrowUpRight size={18}/></Link></div>; }
export function LoadingState() { return <div className="empty-state" role="status"><span className="spinner"/><p>Opening your move…</p></div>; }

export function FocusDialog({ children, className, onClose }: { children: ReactNode; className: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const controls = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled):not([type="file"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter(element=>element.getClientRects().length>0);
    if (!ref.current?.contains(document.activeElement)) controls()[0]?.focus();
    function keydown(event: KeyboardEvent) {
      if(event.key==="Escape"){event.preventDefault();closeRef.current();}
      if(event.key!=="Tab")return;
      const items=controls(); if(!items.length){event.preventDefault();return;}
      if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus();}
      else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus();}
    }
    document.addEventListener("keydown",keydown); return ()=>{document.removeEventListener("keydown",keydown);document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  return <div ref={ref} className={className}>{children}</div>;
}
