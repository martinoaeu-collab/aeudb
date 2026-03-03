import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  access_code: string | null;
  role: string;
  created_at: string;
}

export default function Admin() {
  const { user, isLoading: authLoading, role } = useAuthContext();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-roles", {
        body: { action: "list-users" },
      });
      if (error) throw error;
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") fetchUsers();
  }, [role]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const { error } = await supabase.functions.invoke("manage-roles", {
        body: { action: "update-role", userId, role: newRole },
      });
      if (error) throw error;
      toast.success("Role updated successfully");
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="win-dialog">
          <div className="win-titlebar">
            <Users className="h-4 w-4" />
            <span>User Management</span>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">Create accounts and manage user roles</span>
              <CreateUserDialog onUserCreated={fetchUsers} />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary">
                      <TableHead className="text-xs font-bold h-7">Name</TableHead>
                      <TableHead className="text-xs font-bold h-7">Access Code</TableHead>
                      <TableHead className="text-xs font-bold h-7">Role</TableHead>
                      <TableHead className="text-xs font-bold h-7">Change Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.user_id} className="h-7">
                        <TableCell className="text-xs py-1">
                          {u.full_name || "—"}
                        </TableCell>
                        <TableCell className="text-xs py-1 font-mono">
                          {u.access_code || "—"}
                        </TableCell>
                        <TableCell className="py-1">
                          <Badge
                            variant={u.role === "admin" ? "destructive" : u.role === "hr" ? "default" : "secondary"}
                            className="capitalize text-[10px] h-5"
                          >
                            <Shield className="h-2.5 w-2.5 mr-0.5" />
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1">
                          <Select
                            value={u.role}
                            onValueChange={(value) => handleRoleChange(u.user_id, value)}
                            disabled={u.user_id === user?.id || updating === u.user_id}
                          >
                            <SelectTrigger className="w-28 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="hr">HR</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
