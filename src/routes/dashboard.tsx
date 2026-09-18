import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { FilePlus2, Inbox } from "lucide-react";
import { SiteHeader } from "@/components/site/Header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  // Runs on the server during SSR, so a signed-out visitor is redirected before
  // any of this renders — no flash of protected content.
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const greetingName = user?.name ?? user?.email ?? "there";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="light" />

      <main className="container mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Welcome, {greetingName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your account is active. Saved invoices will appear here.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-border bg-white p-10 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">No saved invoices yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Saving invoices to your account needs a database table and its access policies — that
            isn't built yet. For now the builder works exactly as before, and exports download
            straight to your device.
          </p>
          <Button asChild className="mt-6 gap-2 rounded-lg">
            <Link to="/builder">
              <FilePlus2 className="h-4 w-4" />
              Create an invoice
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
