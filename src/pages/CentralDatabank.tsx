import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useDocuments";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Loader2, Save, Send, Database, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  id?: string;
  api_url: string;
  api_header_name: string;
  api_header_value: string;
  enabled: boolean;
}

export default function CentralDatabank() {
  const { user, role, isLoading: authLoading } = useAuthContext();
  const { data: categories = [] } = useCategories();
  const [settings, setSettings] = useState<Settings>({
    api_url: "",
    api_header_name: "X-API-Key",
    api_header_value: "",
    enabled: false,
  });
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      const [{ data: s }, { data: cats }, { data: lg }] = await Promise.all([
        supabase.from("central_databank_settings").select("*").limit(1).maybeSingle(),
        supabase.from("central_databank_categories").select("category_id"),
        supabase
          .from("central_databank_sync_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (s) setSettings(s as Settings);
      if (cats) setSelectedCats(new Set(cats.map((c: any) => c.category_id)));
      if (lg) setLogs(lg);
      setLoading(false);
    })();
  }, [role]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let row = settings;
      if (settings.id) {
        const { error } = await supabase
          .from("central_databank_settings")
          .update({
            api_url: settings.api_url,
            api_header_name: settings.api_header_name,
            api_header_value: settings.api_header_value,
            enabled: settings.enabled,
          })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("central_databank_settings")
          .insert({
            api_url: settings.api_url,
            api_header_name: settings.api_header_name,
            api_header_value: settings.api_header_value,
            enabled: settings.enabled,
          })
          .select()
          .single();
        if (error) throw error;
        row = data as Settings;
        setSettings(row);
      }

      // Sync selected categories: delete all, re-insert
      await supabase.from("central_databank_categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (selectedCats.size > 0) {
        const rows = Array.from(selectedCats).map((cid) => ({ category_id: cid }));
        const { error } = await supabase.from("central_databank_categories").insert(rows);
        if (error) throw error;
      }
      toast.success("Central databank settings saved");
    } catch (e) {
      toast.error("Save failed: " + (e instanceof Error ? e.message : "Unknown"));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-to-central", {
        body: { test: true },
      });
      if (error) throw error;
      if (data?.ok) toast.success(`Test OK (HTTP ${data.status})`);
      else toast.error(`Test failed (HTTP ${data?.status || "?"}): ${data?.response || data?.reason || "no response"}`);
    } catch (e) {
      toast.error("Test failed: " + (e instanceof Error ? e.message : "Unknown"));
    } finally {
      setTesting(false);
    }
  };

  const toggleCat = (id: string) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Central Databank</h1>
            <p className="text-xs text-muted-foreground">
              Transmit selected folders to the AERF central databank via API.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable transmission</Label>
                  <p className="text-xs text-muted-foreground">
                    When on, uploads in selected folders are auto-sent.
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Central databank API URL</Label>
                <Input
                  value={settings.api_url}
                  onChange={(e) => setSettings((s) => ({ ...s, api_url: e.target.value }))}
                  placeholder="https://central.aerf.example/api/documents"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>API header name</Label>
                  <Input
                    value={settings.api_header_name}
                    onChange={(e) => setSettings((s) => ({ ...s, api_header_name: e.target.value }))}
                    placeholder="X-API-Key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>API header value</Label>
                  <Input
                    type="password"
                    value={settings.api_header_value}
                    onChange={(e) => setSettings((s) => ({ ...s, api_header_value: e.target.value }))}
                    placeholder="secret-key"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  On upload, we POST document metadata (identifier, title, category, size, type) and a signed
                  download URL (valid 7 days) to your API endpoint with the header above.
                </span>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <div>
                <Label className="text-sm font-medium">Folders to transmit</Label>
                <p className="text-xs text-muted-foreground">
                  Only documents in selected folders are sent.
                </p>
              </div>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No folders yet.</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedCats.has(cat.id)}
                        onCheckedChange={() => toggleCat(cat.id)}
                      />
                      <span className="text-sm">{cat.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save settings
              </Button>
              <Button onClick={handleTest} disabled={testing || !settings.api_url} variant="outline" className="gap-2">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Test connection
              </Button>
            </div>

            {logs.length > 0 && (
              <Card className="p-5 space-y-3">
                <Label className="text-sm font-medium">Recent transmissions</Label>
                <div className="space-y-1.5 text-xs">
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-start gap-2 py-1 border-b border-border last:border-0">
                      {l.status === "success" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{l.message || l.status}</div>
                        <div className="text-muted-foreground">
                          {new Date(l.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
