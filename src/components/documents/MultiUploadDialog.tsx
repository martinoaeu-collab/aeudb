import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileUp, X, Plus, Loader2 } from "lucide-react";
import { Category } from "@/types/document";
import { useUploadDocument, useNextIdentifier } from "@/hooks/useDocuments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileEntry {
  id: string;
  file: File;
  title: string;
  categoryId: string;
}

interface MultiUploadDialogProps {
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MultiUploadDialog({ categories, open, onOpenChange }: MultiUploadDialogProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadMutation = useUploadDocument();

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: FileEntry[] = Array.from(newFiles).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      title: f.name.replace(/\.[^/.]+$/, ""),
      categoryId: "",
    }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const updateFile = (id: string, updates: Partial<FileEntry>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const getNextIdentifier = async (): Promise<string> => {
    const { data, error } = await supabase
      .from("documents")
      .select("identifier")
      .ilike("identifier", "AEU-%")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data?.length) return "AEU-001";
    const match = data[0].identifier.match(/AEU-(\d+)/);
    if (match) {
      const next = parseInt(match[1], 10) + 1;
      return `AEU-${next.toString().padStart(3, "0")}`;
    }
    return "AEU-001";
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setUploading(true);

    try {
      for (const entry of files) {
        const identifier = await getNextIdentifier();
        const uploaded = await uploadMutation.mutateAsync({
          file: entry.file,
          identifier,
          title: entry.title,
          categoryId: entry.categoryId || undefined,
        });
        // Fire-and-forget: transmit to central databank (server decides if applicable)
        if (uploaded?.id) {
          supabase.functions
            .invoke("sync-to-central", { body: { document_id: uploaded.id } })
            .catch(() => {});
        }
      }
      toast.success(`${files.length} document(s) uploaded successfully`);
      setFiles([]);
      onOpenChange(false);
    } catch (err) {
      toast.error("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!open) setFiles([]);
  }, [open]);

  const allValid = files.length > 0 && files.every((f) => f.title.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Documents
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-1">
              Drag and drop files here, or
            </p>
            <label>
              <span className="text-primary font-medium cursor-pointer hover:underline text-sm">
                browse files
              </span>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.odt,.ods,.ppt,.pptx,.png,.jpg,.jpeg"
              />
            </label>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {files.length} file(s) selected
              </p>
              {files.map((entry) => (
                <div key={entry.id} className="border border-border rounded-lg p-3 bg-card space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileUp className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {entry.file.name} ({(entry.file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removeFile(entry.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Title *</Label>
                      <Input
                        value={entry.title}
                        onChange={(e) => updateFile(entry.id, { title: e.target.value })}
                        placeholder="Document title"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={entry.categoryId}
                        onValueChange={(v) => updateFile(entry.id, { categoryId: v })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border">
          <Button
            onClick={handleSubmit}
            className="w-full h-10"
            disabled={!allValid || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${files.length} Document${files.length !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
