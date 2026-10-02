import Link from "next/link";
export default function NotFound() { return <main id="main-content" className="empty-state"><h1>A little off course.</h1><p>That page doesn’t exist. Your next chapter is still waiting.</p><Link className="button primary" href="/">Back to home</Link></main>; }
