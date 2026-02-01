import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PdfTemplate, FilledForm, FormField } from "@/types/pdf-template";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

function parseFormFields(json: Json | null): FormField[] {
  if (!json || !Array.isArray(json)) return [];
  return json as unknown as FormField[];
}

export function usePdfTemplates() {
  return useQuery({
    queryKey: ["pdf-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_templates")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        form_fields: parseFormFields(t.form_fields)
      })) as PdfTemplate[];
    },
  });
}

export function usePdfTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["pdf-template", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("pdf_templates")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return {
        ...data,
        form_fields: parseFormFields(data.form_fields)
      } as PdfTemplate;
    },
    enabled: !!id,
  });
}

export function useCreatePdfTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: Omit<PdfTemplate, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("pdf_templates")
        .insert({
          ...template,
          form_fields: template.form_fields as unknown as Json
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });
      toast.success("Template created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create template: " + error.message);
    },
  });
}

export function useUpdatePdfTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PdfTemplate> & { id: string }) => {
      const updateData = {
        ...updates,
        form_fields: updates.form_fields ? (updates.form_fields as unknown as Json) : undefined
      };
      const { data, error } = await supabase
        .from("pdf_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });
      queryClient.invalidateQueries({ queryKey: ["pdf-template", variables.id] });
      toast.success("Template updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update template: " + error.message);
    },
  });
}

export function useDeletePdfTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pdf_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });
}

// Filled forms hooks
export function useFilledForms() {
  return useQuery({
    queryKey: ["filled-forms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filled_forms")
        .select(`
          *,
          template:pdf_templates(*)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []).map(form => ({
        ...form,
        filled_data: (form.filled_data || {}) as Record<string, string | boolean>,
        template: form.template ? {
          ...form.template,
          form_fields: parseFormFields(form.template.form_fields)
        } : undefined
      })) as FilledForm[];
    },
  });
}

export function useCreateFilledForm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (form: Omit<FilledForm, "id" | "created_at" | "updated_at" | "template">) => {
      const { data, error } = await supabase
        .from("filled_forms")
        .insert(form)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filled-forms"] });
      toast.success("Form saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save form: " + error.message);
    },
  });
}

export function useUpdateFilledForm() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FilledForm> & { id: string }) => {
      const { data, error } = await supabase
        .from("filled_forms")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filled-forms"] });
      toast.success("Form updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update form: " + error.message);
    },
  });
}

// Upload PDF to storage
export async function uploadPdfTemplate(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `templates/${fileName}`;

  const { error } = await supabase.storage
    .from("pdf-templates")
    .upload(filePath, file);

  if (error) throw error;
  return filePath;
}

export function getPdfTemplateUrl(path: string): string {
  const { data } = supabase.storage
    .from("pdf-templates")
    .getPublicUrl(path);
  return data.publicUrl;
}

// Upload generated PDF
export async function uploadFilledPdf(pdfBytes: Uint8Array, templateName: string): Promise<string> {
  const fileName = `filled/${templateName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  
  const { error } = await supabase.storage
    .from("pdf-templates")
    .upload(fileName, pdfBytes, {
      contentType: "application/pdf",
    });

  if (error) throw error;
  return fileName;
}
