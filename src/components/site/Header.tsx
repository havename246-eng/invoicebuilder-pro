import { useEffect, useRef, useState } from "react";
import { Link, useRouteContext } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/Logo-light.svg";
import logoDark from "@/assets/Logo.svg";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function SiteHeader({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { user } = useRouteContext({ from: "__root__" });
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // On every screen size the full-width bar shrinks into a white pill on
  // scroll. Before scrolling, the dark variant (homepage) rests on navy and the
  // light one (builder) on white.
  const headerRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const lightLogoRef = useRef<HTMLImageElement>(null);
  const darkLogoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const pill = pillRef.current;
    if (!header || !pill) return;

    return setupScroll({
      header,
      pill,
      restOnNavy: variant === "dark",
      lightLogo: lightLogoRef.current,
      darkLogo: darkLogoRef.current,
      setScrolled,
    });
  }, [variant]);

  const isDark = variant === "dark";
  // Once scrolled, everything sits on the white pill.
  const onNavy = isDark && !scrolled;
  const linkTone = onNavy
    ? "text-white/60 hover:text-white"
    : "text-muted-foreground hover:text-foreground";
  const activeLinkTone = onNavy ? "text-white" : "text-foreground";

  return (
    // The background is also set by GSAP below, but it has to be here too: that
    // effect runs after hydration, and until it does an unpainted header shows
    // the page wrapper's light background through it — a white bar that flashes
    // on every load before the real colour appears. Declaring it in markup means
    // the server-rendered HTML is already the right colour; GSAP then sets the
    // identical value inline and takes over on scroll.
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-40 flex justify-center px-0",
        isDark ? "bg-ink-canvas" : "bg-white",
      )}
      role="banner"
    >
      <div
        ref={pillRef}
        className={cn(
          "container relative mx-auto flex w-full max-w-7xl items-center border border-transparent px-4 backdrop-blur-md sm:px-6",
          isDark ? "bg-ink-canvas" : "bg-white",
        )}
        style={{ height: "4rem" }}
      >
        <div className="flex w-full items-center justify-between">
          <Link to="/" className="relative flex h-10 w-[92px] shrink-0 items-center">
            {isDark ? (
              <>
                <img
                  ref={lightLogoRef}
                  src={logoLight}
                  alt="InvoiceCraft logo — free online invoice maker"
                  className="absolute inset-0 h-10 w-[92px]"
                  width="92"
                  height="40"
                />
                {/* Same logo in the scrolled-state colourway, crossfaded over the
                    one above. Decorative: the pair is one logo to a reader, and
                    giving both alt text makes a screen reader announce it twice.
                    Starts transparent in markup rather than only via gsap.set
                    below, so it isn't briefly painted over the light logo before
                    hydration runs. */}
                <img
                  ref={darkLogoRef}
                  src={logoDark}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-10 w-[92px] opacity-0"
                  width="92"
                  height="40"
                />
              </>
            ) : (
              <img
                src={logoDark}
                alt="InvoiceCraft logo — free online invoice maker"
                className="h-10 w-[92px]"
                width="92"
                height="40"
              />
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
            <a href="#pricing" className={cn("text-sm transition-smooth", linkTone)}>
              Pricing
            </a>
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
                onNavy
                  ? "bg-white text-blue-900 hover:bg-white/90"
                  : "bg-blue-900 text-white hover:bg-blue-900/90",
              )}
            >
              <Link to="/builder" onClick={() => trackEvent("cta_click", { location: "header" })}>
                Create invoice
              </Link>
            </Button>
            {user && <UserMenu user={user} dark={onNavy} />}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-smooth md:hidden",
                onNavy ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted",
              )}
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
              <a
                href="#pricing"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-smooth hover:bg-muted"
              >
                Pricing
              </a>

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

// The scroll effect: the full-width bar shrinks into a floating white pill.
// Returns the cleanup for the effect that sets it up.
function setupScroll({
  header,
  pill,
  restOnNavy,
  lightLogo,
  darkLogo,
  setScrolled,
}: {
  header: HTMLElement;
  pill: HTMLDivElement;
  restOnNavy: boolean;
  lightLogo: HTMLImageElement | null;
  darkLogo: HTMLImageElement | null;
  setScrolled: (scrolled: boolean) => void;
}) {
  const inkCanvas = restOnNavy
    ? getComputedStyle(document.documentElement).getPropertyValue("--ink-canvas").trim() ||
      "#172854"
    : "#ffffff";

  gsap.set(header, { backgroundColor: inkCanvas });
  gsap.set(pill, {
    maxWidth: 1280,
    backgroundColor: inkCanvas,
    borderColor: "rgba(0,0,0,0)",
  });
  if (lightLogo && darkLogo) gsap.set(darkLogo, { opacity: 0 });

  const tl = gsap
    .timeline({
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "+=140",
        scrub: 0.3,
        onUpdate: (self) => {
          const isScrolled = self.progress > 0.5;
          setScrolled(isScrolled);
          gsap.set(header, { backgroundColor: isScrolled ? "rgba(0,0,0,0)" : inkCanvas });
        },
      },
    })
    .to(header, { paddingLeft: 16, paddingRight: 16, ease: "none" }, 0)
    .to(
      pill,
      {
        maxWidth: 896,
        marginTop: 12,
        borderRadius: 9999,
        backgroundColor: "rgba(255,255,255,0.95)",
        boxShadow: "rgba(149, 157, 165, 0.2) 0px 8px 24px",
        ease: "none",
      },
      0,
    );

  // Only the dark variant has the crossfading logo pair; the light one swaps
  // its logo through classes off the scrolled state.
  if (lightLogo && darkLogo) {
    tl.to(lightLogo, { opacity: 0, ease: "none" }, 0).to(darkLogo, { opacity: 1, ease: "none" }, 0);
  }

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    setScrolled(false);
  };
}
