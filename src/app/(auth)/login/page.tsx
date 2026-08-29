import { Suspense } from "react";
import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirect = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
  const isSafeRedirect = (url: string | undefined): boolean => {
    if (!url) return false;
    return url.startsWith("/") && !url.startsWith("//");
  };
  const redirectUrl = isSafeRedirect(redirect) ? redirect! : "/dashboard";

  return (
    <Suspense>
      <LoginForm redirectUrl={redirectUrl} />
    </Suspense>
  );
}
