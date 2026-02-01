import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileArchive, LogOut, User, Shield, Settings, FileText } from "lucide-react";
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

  const getRoleBadgeVariant = () => {
    switch (role) {
      case "admin":
        return "destructive";
      case "hr":
        return "default";
      default:
        return "secondary";
    }
  };

  const navItems = [
    { path: "/", label: "Documents" },
    { path: "/templates", label: "PDF Templates" },
  ];

  return (
    <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-md">
                <FileArchive className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">DocVault</h1>
                <p className="text-sm text-muted-foreground">Document Management System</p>
              </div>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path))
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {children}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline max-w-32 truncate">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Your Role
                  <Badge variant={getRoleBadgeVariant()} className="ml-auto capitalize">
                    {role || "loading..."}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="md:hidden">
                  {navItems.map((item) => (
                    <DropdownMenuItem key={item.path} asChild>
                      <Link to={item.path}>
                        <FileText className="h-4 w-4 mr-2" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
                {role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Settings className="h-4 w-4 mr-2" />
                      User Management
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
