import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">InvoiceCraft</span>
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
        <Button asChild size="sm" className="bg-gradient-primary shadow-glow hover:opacity-90">
          <Link to="/builder">Create invoice</Link>
        </Button>
      </div>
    </header>
  );
}
