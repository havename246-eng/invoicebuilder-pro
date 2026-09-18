import { useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, UserCog } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOutFn, type AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

function initialsFor(user: AuthUser) {
  const source = user.name ?? user.email ?? "";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return initials.toUpperCase() || "U";
}

export function UserMenu({ user, dark }: { user: AuthUser; dark: boolean }) {
  const router = useRouter();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);

    // Clear the browser session first so the client stops refreshing tokens,
    // then clear the cookies server-side so SSR agrees we're signed out.
    await getSupabaseBrowserClient()?.auth.signOut();
    await signOutFn();
    await router.invalidate();

    setSigningOut(false);
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-smooth",
            dark
              ? "ring-1 ring-white/20 hover:ring-white/40"
              : "ring-1 ring-border hover:ring-foreground/30",
          )}
        >
          <Avatar className="h-9 w-9">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
              {initialsFor(user)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          {user.name && <p className="text-sm font-medium text-foreground">{user.name}</p>}
          {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="cursor-pointer gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/account" className="cursor-pointer gap-2">
            <UserCog className="h-4 w-4" />
            Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void handleSignOut();
          }}
          disabled={signingOut}
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
