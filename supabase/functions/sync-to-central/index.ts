import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isValidHeaderName(name: string) {
  return HEADER_NAME_PATTERN.test(name.trim());
}

async function verifyRole(admin: ReturnType<typeof createClient>, userId: string, mode: "admin" | "hr") {
  if (mode === "admin") {
    const { data } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    return Boolean(data);
  }

  const { data } = await admin.rpc("is_hr_or_admin", { _user_id: userId });
  return Boolean(data);
}

async function createDocumentPayload(admin: ReturnType<typeof createClient>, doc: any) {
  let fileUrl: string | null = null;
  if (doc.file_path) {
    const { data: signed } = await admin.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60 * 60 * 24 * 7);
    fileUrl = signed?.signedUrl ?? null;
  }

  return {
    source_system: "AEDB",
    transmission_type: "document_upload",
    document_id: doc.id,
    barcode: doc.identifier,
    identifier: doc.identifier,
    title: doc.title,
    description: doc.description,
    category_id: doc.category_id,
    category_name: doc.categories?.name ?? null,
    file: {
      url: fileUrl,
      name: doc.file_name,
      type: doc.file_type,
      size: doc.file_size,
      path: doc.file_path,
    },
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const { document_id, test } = body as { document_id?: string; test?: boolean };

    const allowed = await verifyRole(admin, userData.user.id, test ? "admin" : "hr");
    if (!allowed) {
      return jsonResponse({ error: test ? "Admin access required" : "HR or Admin access required" }, 403);
    }

    const { data: settings } = await admin
      .from("central_databank_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings || !settings.enabled || !settings.api_url) {
      return jsonResponse({ ok: false, skipped: true, reason: "Central databank sync disabled or unconfigured" });
    }

    const headerName = String(settings.api_header_name || "").trim();
    const headerValue = String(settings.api_header_value || "");
    if (headerName && !isValidHeaderName(headerName)) {
      return jsonResponse({
        ok: false,
        configuration_error: true,
        reason: "Invalid API header name. Header names cannot contain spaces. Use a value like X-API-Key.",
      });
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (headerName && headerValue) headers[headerName] = headerValue;

    const sendToCentral = async (payload: Record<string, unknown>) => {
      try {
        const res = await fetch(settings.api_url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        return {
          ok: res.ok,
          httpStatus: res.status,
          message: res.ok ? `HTTP ${res.status}` : `HTTP ${res.status}: ${text.slice(0, 300)}`,
          response: text.slice(0, 500),
        };
      } catch (e) {
        return {
          ok: false,
          httpStatus: 0,
          message: e instanceof Error ? e.message : "Network error",
          response: "",
        };
      }
    };

    // Test with a real saved document from a selected folder — never send fake codes or placeholder data.
    if (test) {
      const { data: syncCategories } = await admin
        .from("central_databank_categories")
        .select("category_id");
      const categoryIds = (syncCategories ?? []).map((row: any) => row.category_id);

      if (categoryIds.length === 0) {
        return jsonResponse({ ok: false, reason: "Choose at least one folder before testing." });
      }

      const { data: latestDoc } = await admin
        .from("documents")
        .select("*, categories(id, name)")
        .in("category_id", categoryIds)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestDoc) {
        return jsonResponse({ ok: false, reason: "No real document exists in the selected folders to send as a test." });
      }

      const payload = await createDocumentPayload(admin, latestDoc);
      const result = await sendToCentral(payload);
      await admin.from("central_databank_sync_log").insert({
        document_id: latestDoc.id,
        status: result.ok ? "success" : "failed",
        message: `TEST ${result.message}`,
      });

      return jsonResponse({
        ok: result.ok,
        status: result.httpStatus,
        response: result.response,
        document: {
          id: latestDoc.id,
          barcode: latestDoc.identifier,
          title: latestDoc.title,
        },
      });
    }

    if (!document_id) return jsonResponse({ error: "document_id required" }, 400);

    const { data: doc } = await admin
      .from("documents")
      .select("*, categories(id, name)")
      .eq("id", document_id)
      .maybeSingle();

    if (!doc) return jsonResponse({ error: "Document not found" }, 404);

    if (!doc.category_id) return jsonResponse({ ok: false, skipped: true, reason: "No category" });

    const { data: catSync } = await admin
      .from("central_databank_categories")
      .select("id")
      .eq("category_id", doc.category_id)
      .maybeSingle();

    if (!catSync) return jsonResponse({ ok: false, skipped: true, reason: "Category not selected for sync" });

    const payload = await createDocumentPayload(admin, doc);
    const result = await sendToCentral(payload);
    const status = result.ok ? "success" : "failed";

    await admin.from("central_databank_sync_log").insert({
      document_id: doc.id,
      status,
      message: result.message,
    });

    return jsonResponse({ ok: result.ok, status, message: result.message, http_status: result.httpStatus });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});