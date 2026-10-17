import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";
import { actionCodeSettings, authErrorMessage, getFirebaseAuth } from "@/lib/firebase/client";
import { FIREBASE_SETUP_MESSAGE } from "@/lib/firebase/env";
import { safeRedirect } from "@/lib/safe-redirect";
import { trackEvent } from "@/lib/analytics";
import { noIndexHead } from "@/lib/site-url";

const signupSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80, "That name is too long"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

export const Route = createFileRoute("/signup")({
  head: () => noIndexHead("Create your account | InvoiceCraft"),
  validateSearch: z.object({
    redirect: z.string().optional().catch(undefined),
  }),
  component: SignupPage,
});

function SignupPage() {
  const { redirect } = Route.useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SignupValues) {
    const auth = getFirebaseAuth();
    if (!auth) {
      toast.error(FIREBASE_SETUP_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(user, { displayName: values.name });
      // The confirmation link brings them back to sign in, then on to where
      // they were headed.
      const loginPath = `/login${redirect ? `?redirect=${encodeURIComponent(safeRedirect(redirect))}` : ""}`;
      await sendEmailVerification(user, actionCodeSettings(loginPath));
      // Firebase signs a new account straight in; the server won't issue a
      // session until the email is confirmed, so drop the browser one too.
      await signOut(auth);
    } catch (error) {
      setSubmitting(false);
      form.setError("email", { message: authErrorMessage(error) });
      return;
    }

    // The account exists now, so report it here and not again when the
    // confirmation link is opened.
    trackEvent("sign_up", { method: "email" });
    setSubmitting(false);
    setConfirmationSentTo(values.email);
  }

  if (confirmationSentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a confirmation link to ${confirmationSentTo}. Open it to activate your account.`}
        footer={
          <>
            Wrong address?{" "}
            <button
              type="button"
              onClick={() => setConfirmationSentTo(null)}
              className="font-medium text-primary hover:underline"
            >
              Use a different email
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            If it doesn't arrive in a few minutes, check your spam
            folder.
          </p>
          <Button asChild variant="outline" className="w-full rounded-lg">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save your invoices and pick up on any device."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            search={redirect ? { redirect } : undefined}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton label="Sign up with Google" redirectTo={safeRedirect(redirect)} />

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Jane Cooper" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
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
                <FormDescription>At least 8 characters.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...field}
                  />
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
            {submitting ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            By creating an account you agree to our{" "}
            <Link to="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      </Form>
    </AuthShell>
  );
}
