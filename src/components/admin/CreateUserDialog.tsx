import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useDocuments";

interface CreateUserDialogProps {
  onUserCreated: () => void;
}

export function CreateUserDialog({ onUserCreated }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [role, setRole] = useState("staff");
  const [requiresName, setRequiresName] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allAccess, setAllAccess] = useState(true);

  const { data: categories = [] } = useCategories();

  const generateCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setAccessCode(code);
  };

  const copyCredentials = async () => {
    let text = `Username: ${username}\nPassword: ${accessCode}`;
    if (requiresName && fullName) {
      text = `Name: ${fullName}\n${text}`;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Credentials copied to clipboard");
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode || !username) return;

    setIsLoading(true);
    try {
      // Generate a unique internal email for this user
      const internalEmail = `user_${accessCode}_${Date.now()}@aedb.internal`;

      const { data, error } = await supabase.functions.invoke("manage-roles", {
        body: {
          action: "create-user",
          email: internalEmail,
          password: accessCode,
          fullName: requiresName ? fullName : "",
          role,
          accessCode,
          username,
          categoryAccess: allAccess ? [] : selectedCategories,
          allAccess,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("User created successfully");
      onUserCreated();
      resetForm();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setUsername("");
    setAccessCode("");
    setRole("staff");
    setRequiresName(true);
    setSelectedCategories([]);
    setAllAccess(true);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="win-button h-7 text-xs gap-1">
          <UserPlus className="h-3 w-3" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg win-dialog p-0 max-h-[90vh] flex flex-col" style={{ borderRadius: 0 }}>
        <div className="win-titlebar flex-shrink-0">
          <UserPlus className="h-4 w-4" />
          <span>Create New User Account</span>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Name requirement toggle */}
          <div className="win-groupbox">
            <div className="text-xs font-bold mb-2">Authentication Settings</div>
            <div className="flex items-center gap-2 mb-3">
              <Checkbox
                id="requiresName"
                checked={requiresName}
                onCheckedChange={(checked) => setRequiresName(!!checked)}
              />
              <Label htmlFor="requiresName" className="text-xs">Require full name</Label>
            </div>

            {requiresName && (
              <div className="space-y-1 mb-3">
                <Label htmlFor="fullName" className="text-xs">Full Name:</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="h-7 text-xs"
                />
              </div>
            )}

            <div className="space-y-1 mb-3">
              <Label htmlFor="username" className="text-xs">Username:</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Martino.I"
                required
                className="h-7 text-xs"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="accessCode" className="text-xs">Password:</Label>
                <button
                  type="button"
                  onClick={generateCode}
                  className="win-button text-xs h-5 min-w-0 px-2"
                  style={{ fontSize: '10px' }}
                >
                  Generate 4-Digit
                </button>
              </div>
              <div className="relative">
                <Input
                  id="accessCode"
                  type={showPassword ? "text" : "password"}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="e.g. RYR4554?"
                  required
                  className="h-7 text-xs pr-8"
                />
                <button
                  type="button"
                  className="absolute right-1 top-0 h-full px-1"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', border: 'none' }}
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Role selection */}
          <div className="win-groupbox">
            <div className="text-xs font-bold mb-2">Role Assignment</div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff (View only)</SelectItem>
                <SelectItem value="hr">HR (Manage documents)</SelectItem>
                <SelectItem value="admin">Admin (Full access)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category access */}
          <div className="win-groupbox">
            <div className="text-xs font-bold mb-2">Document Access</div>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="allAccess"
                checked={allAccess}
                onCheckedChange={(checked) => setAllAccess(!!checked)}
              />
              <Label htmlFor="allAccess" className="text-xs">Access to all categories</Label>
            </div>
            {!allAccess && (
              <div className="border border-border bg-input p-2 max-h-32 overflow-y-auto space-y-1">
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No categories created yet</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${cat.id}`}
                        checked={selectedCategories.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <Label htmlFor={`cat-${cat.id}`} className="text-xs">{cat.name}</Label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Copy credentials */}
          {accessCode && (
            <button
              type="button"
              onClick={copyCredentials}
              className="win-button w-full h-7 text-xs flex items-center justify-center gap-1"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied!" : "Copy Credentials"}
            </button>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="win-button h-7 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="win-button h-7 text-xs"
              disabled={isLoading || !accessCode}
            >
              {isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin inline" />}
              OK
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
