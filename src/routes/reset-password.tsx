import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
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
import { authErrorMessage, getFirebaseAuth } from "@/lib/firebase/client";
import { FIREBASE_SETUP_MESSAGE } from "@/lib/firebase/env";
import { noIndexHead } from "@/lib/site-url";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/reset-password")({
  head: () => noIndexHead("Choose a new password | InvoiceCraft"),
  // The one-time code from the emailed link, forwarded by /auth/callback.
  validateSearch: z.object({
    oobCode: z.string().optional().catch(undefined),
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { oobCode } = Route.useSearch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // undefined while checking the code, null if it's unusable, else the account's email.
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Check the link up front so an expired one says so before anyone types a
  // new password into it.
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth || !oobCode) {
      setEmail(null);
      return;
    }
    verifyPasswordResetCode(auth, oobCode).then(setEmail, () => setEmail(null));
  }, [oobCode]);

  async function onSubmit(values: Values) {
    const auth = getFirebaseAuth();
    if (!auth || !oobCode) {
      toast.error(FIREBASE_SETUP_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, values.password);
    } catch (error) {
      setSubmitting(false);
      form.setError("password", { message: authErrorMessage(error) });
      return;
    }

    toast.success("Password updated — sign in with your new password");
    navigate({ to: "/login" });
  }

  if (email === undefined) {
    return (
      <AuthShell title="Set a new password" subtitle="Checking your link…">
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthShell>
    );
  }

  // No code, or one that's expired or already used.
  if (email === null) {
    return (
      <AuthShell
        title="Link expired"
        subtitle="This password reset link is no longer valid."
        footer={
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">
            Reset links can only be used once and expire after an hour.
          </p>
          <Button asChild className="w-full rounded-lg">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle={`Updating the password for ${email}.`}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
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
                <FormLabel>Confirm new password</FormLabel>
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

          <Button type="submit" className="w-full rounded-lg" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
