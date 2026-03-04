import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const { action, userId, role, email, password, fullName, accessCode, categoryAccess, allAccess, username } = body;

    const { data: requesterRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = requesterRoles?.some(r => r.role === "admin");

    if (action === "bootstrap") {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if (count === 0) {
        await supabaseAdmin
          .from("user_roles")
          .update({ role: "admin" })
          .eq("user_id", user.id);

        return new Response(
          JSON.stringify({ success: true, message: "You are now an admin" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ success: false, message: "Admin already exists" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    if (action === "update-role") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list-users") {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("*");

      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.user_id)?.role || "staff",
      }));

      return new Response(
        JSON.stringify({ users: usersWithRoles }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create-user") {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      // Create the user using admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || "" },
      });

      if (createError) throw createError;

      // Wait a moment for trigger to create profile, then update access_code and username
      if (newUser.user) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const updateData: Record<string, string> = {};
        if (accessCode) updateData.access_code = accessCode;
        if (username) updateData.username = username;
        
        if (Object.keys(updateData).length > 0) {
          await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("user_id", newUser.user.id);
        }
      }

      // Update role if not staff
      if (role && role !== "staff" && newUser.user) {
        await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", newUser.user.id);
      }

      // Set category access if not all access
      if (newUser.user && !allAccess && categoryAccess && categoryAccess.length > 0) {
        const accessRows = categoryAccess.map((catId: string) => ({
          user_id: newUser.user!.id,
          category_id: catId,
        }));

        await supabaseAdmin
          .from("user_category_access")
          .insert(accessRows);
      }

      return new Response(
        JSON.stringify({ success: true, user: { id: newUser.user?.id, email: newUser.user?.email } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update-email") {
      if (!userId || !email) {
        throw new Error("User ID and email are required");
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
      });

      if (updateError) throw updateError;

      await supabaseAdmin
        .from("profiles")
        .update({ email })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
