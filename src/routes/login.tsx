import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { sendEmailVerification, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  actionCodeSettings,
  authErrorMessage,
  getFirebaseAuth,
  startSession,
} from "@/lib/firebase/client";
import { FIREBASE_SETUP_MESSAGE } from "@/lib/firebase/env";
import { safeRedirect } from "@/lib/safe-redirect";
import { trackEvent } from "@/lib/analytics";
import { noIndexHead } from "@/lib/site-url";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  head: () => noIndexHead("Sign in | InvoiceCraft"),
  validateSearch: z.object({
    redirect: z.string().optional().catch(undefined),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    const auth = getFirebaseAuth();
    if (!auth) {
      toast.error(FIREBASE_SETUP_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, values.email, values.password);

      // Password accounts can't sign in until their email is confirmed. Send a
      // fresh link (the first may have expired), then drop the browser session.
      if (!user.emailVerified) {
        await sendEmailVerification(user, actionCodeSettings(`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`)).catch(() => undefined);
        await signOut(auth);
        setSubmitting(false);
        form.setError("email", {
          message: "Confirm your email first — we've just sent you a new link.",
        });
        return;
      }

      const session = await startSession(user);
      if (!session.ok) {
        await signOut(auth);
        setSubmitting(false);
        form.setError("password", { message: session.error ?? "Couldn't sign you in." });
        return;
      }
    } catch (error) {
      setSubmitting(false);
      form.setError("password", { message: authErrorMessage(error) });
      return;
    }

    trackEvent("login", { method: "email" });

    // Re-run the root beforeLoad so the header and route guards see the session.
    await router.invalidate();
    toast.success("Welcome back");
    navigate({ to: safeRedirect(redirect) });
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back — pick up where you left off."
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to="/signup"
            search={redirect ? { redirect } : undefined}
            className="font-medium text-primary hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <GoogleButton label="Continue with Google" redirectTo={safeRedirect(redirect)} />

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-smooth hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full rounded-lg"
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
