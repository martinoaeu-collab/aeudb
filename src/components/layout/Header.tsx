import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileArchive, LogOut, User, Shield, Settings } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  const { user, role, signOut } = useAuthContext();
  const navigate = useNavigate();

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

  return (
    <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-md">
              <FileArchive className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">DocVault</h1>
              <p className="text-sm text-muted-foreground">Document Management System</p>
            </div>
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
