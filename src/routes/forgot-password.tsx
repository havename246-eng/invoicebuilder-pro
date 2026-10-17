import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
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
import { sendPasswordResetEmail } from "firebase/auth";
import { actionCodeSettings, authErrorMessage, getFirebaseAuth } from "@/lib/firebase/client";
import { FIREBASE_SETUP_MESSAGE } from "@/lib/firebase/env";
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

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: Values) {
    const auth = getFirebaseAuth();
    if (!auth) {
      toast.error(FIREBASE_SETUP_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      // The emailed link opens /auth/callback, which forwards to the
      // new-password form; after that the user signs in again.
      await sendPasswordResetEmail(auth, values.email, actionCodeSettings("/login"));
    } catch (error) {
      const code = (error as { code?: string })?.code;
      // An unknown address still reports success below — confirming whether
      // an email has an account would let anyone enumerate our users.
      if (code !== "auth/user-not-found") {
        setSubmitting(false);
        form.setError("email", { message: authErrorMessage(error) });
        return;
      }
    }

    setSubmitting(false);
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

          <Button
            type="submit"
            className="w-full rounded-lg"
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </Form>
    </AuthShell>
  );
}
