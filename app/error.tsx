"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main-content" className="empty-state"><h1>Let’s try that again.</h1><p>This page could not load. Your saved plan is still on this browser.</p><button className="button primary" onClick={reset}>Retry</button></main>; }
