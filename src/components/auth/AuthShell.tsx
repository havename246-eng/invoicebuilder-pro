import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { isSupabaseConfigured, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";
import logoDark from "@/assets/Logo.svg";

/**
 * Centred, branded frame shared by every auth page so login, signup and the
 * password flows stay visually identical.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center">
          <Link to="/" aria-label="InvoiceCraft home">
            <img
              src={logoDark}
              alt="InvoiceCraft logo — free online invoice maker"
              className="h-10 w-[92px]"
              width="92"
              height="40"
            />
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          {!isSupabaseConfigured && (
            <div
              role="alert"
              className="mt-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-left"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-900">{SUPABASE_SETUP_MESSAGE}</p>
            </div>
          )}

          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}
