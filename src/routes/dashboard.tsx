import { createFileRoute, redirect } from "@tanstack/react-router";
import { noIndexHead } from "@/lib/site-url";
import { MyInvoices } from "@/components/invoice/MyInvoices";

export const Route = createFileRoute("/dashboard")({
  head: () => noIndexHead("My invoices | InvoiceCraft"),
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
  return <MyInvoices greetingName={user?.name ?? user?.email ?? "there"} />;
}
