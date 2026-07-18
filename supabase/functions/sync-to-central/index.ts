import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const { document_id, test } = body as { document_id?: string; test?: boolean };

    // Load settings
    const { data: settings } = await admin
      .from("central_databank_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings || !settings.enabled || !settings.api_url) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, reason: "Central databank sync disabled or unconfigured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.api_header_name && settings.api_header_value) {
      headers[settings.api_header_name] = settings.api_header_value;
    }

    // Test ping
    if (test) {
      const res = await fetch(settings.api_url, {
        method: "POST",
        headers,
        body: JSON.stringify({ ping: true, source: "AEDB" }),
      });
      const text = await res.text();
      return new Response(
        JSON.stringify({ ok: res.ok, status: res.status, response: text.slice(0, 500) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!document_id) {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load document
    const { data: doc } = await admin
      .from("documents")
      .select("*, categories(id, name)")
      .eq("id", document_id)
      .maybeSingle();

    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check category is selected for sync
    if (!doc.category_id) {
      return new Response(JSON.stringify({ ok: false, skipped: true, reason: "No category" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: catSync } = await admin
      .from("central_databank_categories")
      .select("id")
      .eq("category_id", doc.category_id)
      .maybeSingle();

    if (!catSync) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, reason: "Category not selected for sync" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Signed URL for file
    let fileUrl: string | null = null;
    if (doc.file_path) {
      const { data: signed } = await admin.storage
        .from("documents")
        .createSignedUrl(doc.file_path, 60 * 60 * 24 * 7);
      fileUrl = signed?.signedUrl ?? null;
    }

    const payload = {
      source: "AEDB",
      identifier: doc.identifier,
      title: doc.title,
      description: doc.description,
      category: (doc as any).categories?.name,
      file_url: fileUrl,
      file_name: doc.file_name,
      file_type: doc.file_type,
      file_size: doc.file_size,
      created_at: doc.created_at,
    };

    let status = "success";
    let message = "";
    try {
      const res = await fetch(settings.api_url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        status = "failed";
        message = `HTTP ${res.status}: ${text.slice(0, 300)}`;
      } else {
        message = `HTTP ${res.status}`;
      }
    } catch (e) {
      status = "failed";
      message = e instanceof Error ? e.message : "Network error";
    }

    await admin.from("central_databank_sync_log").insert({
      document_id: doc.id,
      status,
      message,
    });

    return new Response(JSON.stringify({ ok: status === "success", status, message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
