import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/Logo-light.svg";
import logoDark from "@/assets/Logo.svg";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Start full regardless of any scroll position restored by the router —
    // the pill only appears in response to the user actually scrolling.
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex justify-center pt-0 transition-[padding] duration-300",
        scrolled ? "px-4" : "px-0",
      )}
      role="banner"
    >
      <div
        className={cn(
          "flex w-full items-center transition-all duration-300 ease-out",
          scrolled
            ? "mt-3 max-w-4xl justify-between rounded-full border border-border bg-white/95 px-6 py-2 shadow-lg backdrop-blur-md"
            : "justify-center border-b border-transparent bg-ink-canvas px-6 py-0",
        )}
        style={{ height: scrolled ? undefined : "4rem" }}
      >
        <div
          className={cn(
            "flex w-full items-center justify-between",
            !scrolled && "mx-auto max-w-7xl",
          )}
        >
          <Link to="/" className="flex items-center">
            <img
              src={scrolled ? logoDark : logoLight}
              alt="InvoiceCraft — Free Invoice Generator"
              className="h-8"
              width="120"
              height="32"
            />
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <Link
              to="/"
              className={cn(
                "text-sm transition-smooth",
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/60 hover:text-white",
              )}
              activeOptions={{ exact: true }}
              activeProps={{ className: scrolled ? "text-foreground" : "text-white" }}
            >
              Home
            </Link>
            <Link
              to="/builder"
              className={cn(
                "text-sm transition-smooth",
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/60 hover:text-white",
              )}
              activeProps={{ className: scrolled ? "text-foreground" : "text-white" }}
            >
              Builder
            </Link>
            <a
              href="#features"
              className={cn(
                "text-sm transition-smooth",
                scrolled
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/60 hover:text-white",
              )}
            >
              Features
            </a>
          </nav>
          <Button
            asChild
            size="sm"
            className={cn(
              "rounded-full px-5 py-2.5 text-[13px] transition-smooth",
              scrolled
                ? "bg-blue-900 text-white hover:bg-blue-900/90"
                : "bg-white text-blue-900 hover:bg-white/90",
            )}
          >
            <Link to="/builder">Create invoice</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
