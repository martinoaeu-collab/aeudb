import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { signIn } = useAuthContext();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("login-by-code", {
        body: { username, password },
      });

      if (fnError) throw fnError;
      if (data.error) throw new Error(data.error);

      await signIn(data.email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="win-dialog" style={{ width: '380px' }}>
        <div className="win-titlebar">
          <Shield className="h-4 w-4" />
          <span>Aviation Roblox Ministerium AEDB - Login</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-center space-y-2 mb-4">
            <p className="text-sm text-muted-foreground">
              Enter your username and password to sign in.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive text-destructive text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="username" className="text-xs font-semibold">Username:</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-semibold">Password:</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-8 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="submit" className="win-button h-7 text-xs px-6" disabled={isLoading || !username || !password}>
                {isLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                OK
              </Button>
            </div>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-2">
            <p>For AEU staff only. Contact admin for access.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
