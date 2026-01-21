import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Document, Category } from "@/types/document";
import { toast } from "sonner";

export function useDocuments(searchQuery?: string, categoryId?: string | null) {
  return useQuery({
    queryKey: ["documents", searchQuery, categoryId],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select(`*, category:categories(*)`)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`identifier.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%`);
      }

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name, description })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create category: " + error.message);
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      identifier,
      title,
      description,
      categoryId,
    }: {
      file: File;
      identifier: string;
      title: string;
      description?: string;
      categoryId?: string;
    }) => {
      // Upload file to storage
      const filePath = `${identifier}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from("documents")
        .insert({
          identifier,
          title,
          description,
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          file_size: file.size,
          file_path: filePath,
          category_id: categoryId || null,
        })
        .select(`*, category:categories(*)`)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to upload document: " + error.message);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (document: Document) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([document.file_path]);

      if (storageError) console.warn("Storage delete error:", storageError);

      // Delete record
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", document.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete document: " + error.message);
    },
  });
}

export function getDocumentDownloadUrl(filePath: string) {
  const { data } = supabase.storage.from("documents").getPublicUrl(filePath);
  return data.publicUrl;
}
