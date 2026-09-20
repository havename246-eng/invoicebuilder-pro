import { useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BadgeCheck, Eye, EyeOff, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";
import { signOutFn, type AuthUser } from "@/lib/auth";
import { noIndexHead } from "@/lib/site-url";

export const Route = createFileRoute("/account")({
  head: () => noIndexHead("Account settings | InvoiceCraft"),
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AccountPage,
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function initialsFor(user: AuthUser) {
  const source = user.name ?? user.email ?? "";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "U"
  );
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "That name is too long"),
});

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function AccountPage() {
  const { user } = Route.useRouteContext();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />

      <main className="container mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Account</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Manage your account
          </h1>
          <p className="text-sm text-muted-foreground">Update your profile, email and password.</p>
        </div>

        <div className="mt-10 flex flex-col gap-6">
          <ProfileSection user={user} router={router} />
          <EmailSection user={user} />
          <PasswordSection user={user} />
          <DetailsSection user={user} />
        </div>
      </main>
    </div>
  );
}

function ProfileSection({
  user,
  router,
}: {
  user: AuthUser;
  router: ReturnType<typeof useRouter>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name ?? "" },
  });

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: values.name } });
    setSubmitting(false);

    if (error) {
      form.setError("name", { message: error.message });
      return;
    }

    await router.invalidate();
    toast.success("Profile updated");
  }

  return (
    <Section title="Profile" description="How your name appears in the app.">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
            {initialsFor(user)}
          </AvatarFallback>
        </Avatar>
        <p className="text-sm text-muted-foreground">
          {user.provider === "google"
            ? "Your picture comes from your Google account."
            : "Add a picture by signing in with Google."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Jane Cooper" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="rounded-lg" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </form>
      </Form>
    </Section>
  );
}

function EmailSection({ user }: { user: AuthUser }) {
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: user.email ?? "" },
  });

  async function onSubmit(values: z.infer<typeof emailSchema>) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }

    if (values.email === user.email) {
      form.setError("email", { message: "That's already your email address." });
      return;
    }

    setSubmitting(true);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirect", "/account");

    const { error } = await supabase.auth.updateUser(
      { email: values.email },
      { emailRedirectTo: callback.toString() },
    );
    setSubmitting(false);

    if (error) {
      form.setError("email", { message: error.message });
      return;
    }

    setPending(values.email);
  }

  return (
    <Section title="Email" description="Used to sign in and to receive invoices-related mail.">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Current:</span>
        <span className="font-medium text-foreground">{user.email}</span>
        {user.emailConfirmed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            <ShieldAlert className="h-3.5 w-3.5" />
            Unverified
          </span>
        )}
      </div>

      {pending ? (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Confirmation sent to <strong className="text-foreground">{pending}</strong>. Your email
          changes once you open that link — until then, keep signing in with your current address.
        </p>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormDescription>
                    We'll send a confirmation link before the change takes effect.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="outline" className="rounded-lg" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change email
            </Button>
          </form>
        </Form>
      )}
    </Section>
  );
}

function PasswordSection({ user }: { user: AuthUser }) {
  const [submitting, setSubmitting] = useState(false);
  const [show, setShow] = useState(false);
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const isOAuthOnly = user.provider !== "email";

  async function onSubmit(values: z.infer<typeof passwordSchema>) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setSubmitting(false);

    if (error) {
      form.setError("password", { message: error.message });
      return;
    }

    form.reset({ password: "", confirmPassword: "" });
    toast.success(isOAuthOnly ? "Password set" : "Password updated");
  }

  return (
    <Section
      title={isOAuthOnly ? "Set a password" : "Password"}
      description={
        isOAuthOnly
          ? "You sign in with Google. Setting a password lets you sign in with your email too."
          : "Choose a new password for signing in."
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isOAuthOnly ? "Password" : "New password"}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      aria-label={show ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-smooth hover:text-foreground"
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="outline" className="rounded-lg" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isOAuthOnly ? "Set password" : "Update password"}
          </Button>
        </form>
      </Form>
    </Section>
  );
}

function DetailsSection({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const providerLabel = user.provider === "google" ? "Google" : "Email and password";

  async function handleSignOut() {
    setSigningOut(true);
    await getSupabaseBrowserClient()?.auth.signOut();
    await signOutFn();
    await router.invalidate();
    setSigningOut(false);
    toast.success("Signed out");
    router.navigate({ to: "/" });
  }

  return (
    <Section title="Account details">
      <dl className="flex flex-col gap-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Sign-in method</dt>
          <dd className="font-medium text-foreground">{providerLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Member since</dt>
          <dd className="font-medium text-foreground">{memberSince}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="font-medium text-foreground">Free</dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleSignOut}
          disabled={signingOut}
          className="gap-2 rounded-lg text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </Section>
  );
}
