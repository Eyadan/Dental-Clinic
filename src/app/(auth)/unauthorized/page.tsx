import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/dashboard">Go to Dashboard</Link>} />
        </CardContent>
      </Card>
    </div>
  );
}
