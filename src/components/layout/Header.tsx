import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Menu, Shield, Settings, FileText, ChevronDown } from "lucide-react";
import { useNavigate, Link, useLocation } from "react-router-dom";

interface HeaderProps {
  children?: React.ReactNode;
  onToggleSidebar?: () => void;
}

export function Header({ children, onToggleSidebar }: HeaderProps) {
  const { user, role, signOut } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onToggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <Link to="/" className="flex items-center gap-2.5 text-foreground no-underline hover:opacity-80 transition-opacity">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm hidden sm:inline">AEDB</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors no-underline ${
              location.pathname === "/" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Documents
          </Link>
          <Link
            to="/templates"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors no-underline ${
              location.pathname.startsWith("/templates") ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Templates
          </Link>
          {role === "admin" && (
            <>
              <Link
                to="/central-databank"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors no-underline ${
                  location.pathname === "/central-databank" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Central Databank
              </Link>
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors no-underline ${
                  location.pathname === "/admin" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Admin
              </Link>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {children}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 text-sm px-3">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-muted-foreground">{user?.email?.split("@")[0]}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{role || "loading..."}</p>
            </div>
            <DropdownMenuSeparator />
            {/* Mobile nav items */}
            <div className="md:hidden">
              <DropdownMenuItem asChild>
                <Link to="/" className="w-full">Documents</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/templates" className="w-full flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Templates
                </Link>
              </DropdownMenuItem>
              {role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="w-full flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Admin
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </div>
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
