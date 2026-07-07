import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/Logo-light.svg";
import logoDark from "@/assets/Logo.svg";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const lightLogoRef = useRef<HTMLImageElement>(null);
  const darkLogoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const pill = pillRef.current;
    const lightLogo = lightLogoRef.current;
    const darkLogo = darkLogoRef.current;
    if (!header || !pill || !lightLogo || !darkLogo) return;

    const inkCanvas = getComputedStyle(document.documentElement)
      .getPropertyValue("--ink-canvas")
      .trim() || "#172854";

    gsap.set(header, { backgroundColor: inkCanvas });
    gsap.set(pill, { maxWidth: 1280, backgroundColor: inkCanvas, borderColor: "rgba(0,0,0,0)" });
    gsap.set(darkLogo, { opacity: 0 });

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
      )
      .to(lightLogo, { opacity: 0, ease: "none" }, 0)
      .to(darkLogo, { opacity: 1, ease: "none" }, 0);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 flex justify-center bg-ink-canvas px-0"
      role="banner"
    >
      <div
        ref={pillRef}
        className="container mx-auto flex w-full max-w-7xl items-center border border-transparent bg-ink-canvas px-6 backdrop-blur-md"
        style={{ height: "4rem" }}
      >
        <div className="flex w-full items-center justify-between">
          <Link to="/" className="relative flex h-10 w-[92px] shrink-0 items-center">
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
            size="lg"
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
