import type { Metadata } from "next";
import { CaseProvider } from "@/components/provider";
import "./globals.css";
export const metadata: Metadata = { title: "DiveAbuDhabi — Your next chapter", description: "Your personal guide to making Abu Dhabi home. Plan your move, track the details, and take the next step." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth"><body><a className="skip-link" href="#main-content">Skip to content</a><CaseProvider>{children}</CaseProvider></body></html>;
}
