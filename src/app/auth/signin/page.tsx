import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GoogleSignInButton } from "./sign-in-button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // Redirect already-authenticated users away from sign-in
  const session = await auth();
  if (session?.user?.status === "ACTIVE") {
    redirect("/");
  }

  const { callbackUrl } = await searchParams;
  // Only allow relative URLs to prevent open-redirect attacks
  const safeCallbackUrl = callbackUrl?.startsWith("/") ? callbackUrl : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0E1113]">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Solo usuarios invitados pueden acceder.
          </p>
        </div>

        <GoogleSignInButton callbackUrl={safeCallbackUrl} />
      </div>
    </div>
  );
}
