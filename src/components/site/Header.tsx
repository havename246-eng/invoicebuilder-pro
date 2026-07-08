import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/Logo-light.svg";
import logoDark from "@/assets/Logo.svg";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function SiteHeader({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const lightLogoRef = useRef<HTMLImageElement>(null);
  const darkLogoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const pill = pillRef.current;
    if (!header || !pill) return;

    const isDark = variant === "dark";
    const inkCanvas = isDark
      ? getComputedStyle(document.documentElement).getPropertyValue("--ink-canvas").trim() || "#172854"
      : "#ffffff";

    gsap.set(header, { backgroundColor: inkCanvas });
    gsap.set(pill, {
      maxWidth: 1280,
      backgroundColor: inkCanvas,
      borderColor: "rgba(0,0,0,0)",
    });
    if (isDark && darkLogoRef.current) gsap.set(darkLogoRef.current, { opacity: 0 });

    const tl = gsap.timeline({
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
          borderColor: "#E8E5E0",
          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
          ease: "none",
        },
        0,
      );

    if (isDark && lightLogoRef.current && darkLogoRef.current) {
      tl.to(lightLogoRef.current, { opacity: 0, ease: "none" }, 0).to(
        darkLogoRef.current,
        { opacity: 1, ease: "none" },
        0,
      );
    }

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [variant]);

  const isDark = variant === "dark";

  return (
    <header ref={headerRef} className="sticky top-0 z-40 flex justify-center px-0" role="banner">
      <div
        ref={pillRef}
        className="container relative mx-auto flex w-full max-w-7xl items-center border border-transparent px-4 backdrop-blur-md sm:px-6"
        style={{ height: "4rem" }}
      >
        <div className="flex w-full items-center justify-between">
          <Link to="/" className="relative flex h-10 w-[92px] shrink-0 items-center">
            {isDark ? (
              <>
                <img
                  ref={lightLogoRef}
                  src={logoLight}
                  alt="InvoiceCraft — Free Invoice Generator"
                  className="absolute inset-0 h-10 w-[92px]"
                  width="92"
                  height="40"
                />
                <img
                  ref={darkLogoRef}
                  src={logoDark}
                  alt="InvoiceCraft — Free Invoice Generator"
                  className="absolute inset-0 h-10 w-[92px]"
                  width="92"
                  height="40"
                />
              </>
            ) : (
              <img
                src={logoDark}
                alt="InvoiceCraft — Free Invoice Generator"
                className="h-10 w-[92px]"
                width="92"
                height="40"
              />
            )}
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <Link
              to="/"
              className={cn(
                "text-sm transition-smooth",
                !isDark || scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/60 hover:text-white",
              )}
              activeOptions={{ exact: true }}
              activeProps={{ className: !isDark || scrolled ? "text-foreground" : "text-white" }}
            >
              Home
            </Link>
            <Link
              to="/builder"
              className={cn(
                "text-sm transition-smooth",
                !isDark || scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/60 hover:text-white",
              )}
              activeProps={{ className: !isDark || scrolled ? "text-foreground" : "text-white" }}
            >
              Builder
            </Link>
            <a
              href="#features"
              className={cn(
                "text-sm transition-smooth",
                !isDark || scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/60 hover:text-white",
              )}
            >
              Features
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="lg"
              className={cn(
                "rounded-full px-3.5 py-2 text-[12px] transition-smooth sm:px-5 sm:py-2.5 sm:text-[13px]",
                !isDark || scrolled
                  ? "bg-blue-900 text-white hover:bg-blue-900/90"
                  : "bg-white text-blue-900 hover:bg-white/90",
              )}
            >
              <Link to="/builder">Create invoice</Link>
            </Button>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-smooth md:hidden",
                !isDark || scrolled
                  ? "text-foreground hover:bg-muted"
                  : "text-white hover:bg-white/10",
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
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
