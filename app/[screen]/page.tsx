import { notFound } from "next/navigation";
import Screens from "@/components/screens";
const screens = ["start", "members", "consultation", "plan", "dashboard", "resources"] as const;
export function generateStaticParams() { return screens.map(screen => ({ screen })); }
export default async function Page({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  if (!screens.includes(screen as typeof screens[number])) notFound();
  return <Screens screen={screen}/>;
}
