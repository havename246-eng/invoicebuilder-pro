import { createFileRoute, redirect } from "@tanstack/react-router";

/** My invoices moved to the dashboard; keep old links working. */
export const Route = createFileRoute("/invoices")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard", statusCode: 301 });
  },
});
