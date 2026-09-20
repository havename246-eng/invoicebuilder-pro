import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { useTurnstile } from "@/hooks/use-turnstile";
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
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";
import { noIndexHead } from "@/lib/site-url";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/forgot-password")({
  head: () => noIndexHead("Reset your password | InvoiceCraft"),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const turnstile = useTurnstile("password-reset");

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Values) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }

    setSubmitting(true);

    // Route the emailed link through the shared callback, telling it to land on
    // the new-password form once the recovery token is verified.
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirect", "/reset-password");

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: callback.toString(),
      captchaToken: turnstile.token ?? undefined,
    });

    setSubmitting(false);

    if (error) {
      // The token just spent is dead either way; re-arm before the next try.
      turnstile.reset();
      form.setError("email", { message: error.message });
      return;
    }

    // Always report success — confirming whether an address has an account
    // would let anyone enumerate our users.
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If an account exists for ${sentTo}, a password reset link is on its way.`}
        footer={
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            The link expires in one hour. Check your spam folder if it doesn't arrive.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
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

          <TurnstileWidget turnstile={turnstile} />

          <Button
            type="submit"
            className="w-full rounded-lg"
            disabled={submitting || !turnstile.solved}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
