import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import logo from "@/assets/Logo.svg";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="InvoiceCraft" className="h-8" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/" className="text-sm text-muted-foreground transition-smooth hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>
            Home
          </Link>
          <Link to="/builder" className="text-sm text-muted-foreground transition-smooth hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            Builder
          </Link>
          <a href="#features" className="text-sm text-muted-foreground transition-smooth hover:text-foreground">Features</a>
        </nav>
        <Button asChild size="sm" className="rounded-[6px] bg-primary px-5 py-2.5 text-[13px] text-primary-foreground hover:opacity-90">
          <Link to="/builder">Create invoice</Link>
        </Button>
      </div>
    </header>
  );
}
