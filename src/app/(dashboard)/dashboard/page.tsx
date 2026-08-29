import { DashboardClient } from "./dashboard-client";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Welcome to the Dental Clinic Management System</p>
      </div>
      <DashboardClient />
    </div>
  );
}
