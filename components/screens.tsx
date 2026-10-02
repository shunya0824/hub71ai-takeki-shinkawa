"use client";
import { StartScreen, MembersScreen, ConsultationScreen } from "./onboarding";
import { DashboardScreen, PlanScreen, ResourcesScreen } from "./workspace";
export default function Screens({screen}:{screen:string}){
  switch(screen){case "start":return <StartScreen/>;case "members":return <MembersScreen/>;case "consultation":return <ConsultationScreen/>;case "plan":return <PlanScreen/>;case "dashboard":return <DashboardScreen/>;case "resources":return <ResourcesScreen/>;default:return null;}
}
