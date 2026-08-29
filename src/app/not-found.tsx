import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground/50" />
      <h1 className="text-2xl font-bold">Page Not Found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/dashboard">
        <Button className="mt-6">
          Go to Dashboard
        </Button>
      </Link>
    </div>
  );
}
