import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Menu, Shield, Settings, FileText, Files } from "lucide-react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  const { user, role, signOut } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    { path: "/", label: "Documents", icon: Files },
    { path: "/templates", label: "PDF Templates", icon: FileText },
  ];

  return (
    <header className="win-titlebar" style={{ padding: '4px 8px', fontSize: '13px' }}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-primary-foreground hover:bg-primary/20 p-1" style={{ background: 'transparent', border: 'none' }}>
                <Menu className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 win-dialog" style={{ borderRadius: 0 }}>
              {navItems.map((item) => (
                <DropdownMenuItem key={item.path} asChild>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 w-full",
                      (location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path)))
                        ? "font-bold"
                        : ""
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              {role === "admin" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2 w-full">
                      <Settings className="h-4 w-4" />
                      User Management
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Logo / Title */}
          <Link to="/" className="flex items-center gap-2 text-primary-foreground no-underline">
            <Shield className="h-5 w-5" />
            <span className="font-bold text-sm">Aviation Roblox Ministerium AEDB</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {children}
          <span className="text-primary-foreground text-xs opacity-80">
            {user?.email} [{role || "..."}]
          </span>
        </div>
      </div>
    </header>
  );
}
