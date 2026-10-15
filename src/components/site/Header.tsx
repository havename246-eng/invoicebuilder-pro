import { useEffect, useState } from "react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/Logo-light.svg";
import logoDark from "@/assets/Logo.svg";

export function SiteHeader({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { user } = useRouteContext({ from: "__root__" });
  const [mobileOpen, setMobileOpen] = useState(false);
  // The header is a static full-width bar at every scroll position. The dark
  // variant is navy everywhere; the light one is navy below lg and white from
  // lg up. Colours come from responsive classes so the server-rendered HTML is
  // already right — this flag only covers what can't be expressed that way
  // (the account menu's ring).
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const isDark = variant === "dark";
  const linkTone = isDark
    ? "text-white/60 hover:text-white"
    : "text-white/60 hover:text-white lg:text-muted-foreground lg:hover:text-foreground";
  const activeLinkTone = isDark ? "text-white" : "text-white lg:text-foreground";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex justify-center bg-ink-canvas px-0",
        !isDark && "lg:bg-white",
      )}
      role="banner"
    >
      <div
        className={cn(
          "container relative mx-auto flex w-full max-w-7xl items-center border border-transparent bg-ink-canvas px-4 backdrop-blur-md sm:px-6",
          !isDark && "lg:bg-white",
        )}
        style={{ height: "4rem" }}
      >
        <div className="flex w-full items-center justify-between">
          <Link to="/" className="relative flex h-10 w-[92px] shrink-0 items-center">
            {isDark ? (
              <img
                src={logoLight}
                alt="InvoiceCraft logo — free online invoice maker"
                className="h-10 w-[92px]"
                width="92"
                height="40"
              />
            ) : (
              <>
                {/* White logo on the navy bar below lg, the usual one above. */}
                <img
                  src={logoLight}
                  alt="InvoiceCraft logo — free online invoice maker"
                  className="h-10 w-[92px] lg:hidden"
                  width="92"
                  height="40"
                />
                <img
                  src={logoDark}
                  alt="InvoiceCraft logo — free online invoice maker"
                  className="hidden h-10 w-[92px] lg:block"
                  width="92"
                  height="40"
                />
              </>
            )}
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <Link
              to="/"
              className={cn("text-sm transition-smooth", linkTone)}
              activeOptions={{ exact: true }}
              activeProps={{ className: activeLinkTone }}
            >
              Home
            </Link>
            <Link
              to="/builder"
              className={cn("text-sm transition-smooth", linkTone)}
              activeProps={{ className: activeLinkTone }}
            >
              Builder
            </Link>
            <a href="#features" className={cn("text-sm transition-smooth", linkTone)}>
              Features
            </a>
            {/* PRICING-HIDDEN: the pricing section is off the homepage until payments
                are integrated, so this anchor would scroll nowhere. Restore with it. */}
            {/* <a
              href="#pricing"
              className={cn("text-sm transition-smooth", linkTone)}
            >
              Pricing
            </a> */}
          </nav>
          <div className="flex items-center gap-2 sm:gap-5">
            {!user && (
              <>
                <Link
                  to="/login"
                  className={cn("hidden text-sm transition-smooth sm:inline-flex", linkTone)}
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className={cn("hidden text-sm transition-smooth sm:inline-flex", linkTone)}
                >
                  Sign up
                </Link>
              </>
            )}
            <Button
              asChild
              size="lg"
              className={cn(
                "rounded-full px-3.5 py-2 text-[12px] shadow-none transition-smooth sm:px-5 sm:py-2.5 sm:text-[13px]",
                isDark
                  ? "bg-white text-blue-900 hover:bg-white/90"
                  : "bg-white text-blue-900 hover:bg-white/90 lg:bg-blue-900 lg:text-white lg:hover:bg-blue-900/90",
              )}
            >
              <Link to="/builder" onClick={() => trackEvent("cta_click", { location: "header" })}>
                Create invoice
              </Link>
            </Button>
            {user && <UserMenu user={user} dark={compact || isDark} />}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              // Only shown below md, where the bar is always navy.
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-smooth hover:bg-white/10 md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="absolute inset-x-0 top-full mt-2 px-4 md:hidden">
            <nav
              className="flex flex-col gap-1 rounded-2xl border border-border bg-white p-3 shadow-lg"
              aria-label="Mobile navigation"
            >
              <Link
                to="/"
                activeOptions={{ exact: true }}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-smooth hover:bg-muted"
              >
                Home
              </Link>
              <Link
                to="/builder"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-smooth hover:bg-muted"
              >
                Builder
              </Link>
              <a
                href="#features"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-smooth hover:bg-muted"
              >
                Features
              </a>
              {/* PRICING-HIDDEN: restore alongside the desktop nav link above. */}
              {/* <a
                href="#pricing"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-smooth hover:bg-muted"
              >
                Pricing
              </a> */}

              <div className="my-1 h-px bg-border" />

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-smooth hover:bg-muted"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-smooth hover:bg-muted"
                  >
                    Account settings
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-smooth hover:bg-muted"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition-smooth hover:bg-muted"
                  >
                    Create account
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
