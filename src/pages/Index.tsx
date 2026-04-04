import { useState, useMemo, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useDocuments, useCategories, useDeleteDocument } from "@/hooks/useDocuments";
import { DocumentListView } from "@/components/documents/DocumentListView";
import { MultiUploadDialog } from "@/components/documents/MultiUploadDialog";
import { CategorySidebar } from "@/components/documents/CategorySidebar";
import { EmptyState } from "@/components/documents/EmptyState";
import { Header } from "@/components/layout/Header";
import { Document } from "@/types/document";
import { Loader2, Crown, Upload, Search } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, isLoading: authLoading, isHrOrAdmin, role } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [showBootstrap, setShowBootstrap] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allowedCategoryIds, setAllowedCategoryIds] = useState<string[] | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: documents = [], isLoading: documentsLoading } = useDocuments(debouncedSearch, selectedCategory);
  const { data: categories = [] } = useCategories();
  const deleteMutation = useDeleteDocument();

  useEffect(() => {
    if (user) {
      supabase
        .from("user_category_access")
        .select("category_id")
        .eq("user_id", user.id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setAllowedCategoryIds(data.map(d => d.category_id));
          } else {
            setAllowedCategoryIds(null);
          }
        });
    }
  }, [user]);

  useEffect(() => {
    if (user && role === "staff") {
      supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin")
        .then(({ count }) => {
          if (count === 0) setShowBootstrap(true);
        });
    }
  }, [user, role]);

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-roles", {
        body: { action: "bootstrap" },
      });
      if (error) throw error;
      if (data.success) {
        toast.success("You are now an admin! Refresh to see changes.");
        setShowBootstrap(false);
        window.location.reload();
      } else {
        toast.info(data.message);
      }
    } catch {
      toast.error("Failed to bootstrap admin");
    } finally {
      setBootstrapping(false);
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    if (!isHrOrAdmin) {
      toast.error("Only HR can delete documents");
      return;
    }
    await deleteMutation.mutateAsync(documentToDelete);
    setDocumentToDelete(null);
  };

  const filteredDocuments = useMemo(() => {
    if (!allowedCategoryIds) return documents;
    return documents.filter(doc =>
      doc.category_id && allowedCategoryIds.includes(doc.category_id)
    );
  }, [documents, allowedCategoryIds]);

  const filteredCategories = useMemo(() => {
    if (!allowedCategoryIds) return categories;
    return categories.filter(cat => allowedCategoryIds.includes(cat.id));
  }, [categories, allowedCategoryIds]);

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategory) return "All Documents";
    return categories.find(c => c.id === selectedCategory)?.name || "Documents";
  }, [selectedCategory, categories]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex">
        <CategorySidebar
          categories={filteredCategories}
          selectedCategory={selectedCategory}
          onSelectCategory={(id) => { setSelectedCategory(id); setSidebarOpen(false); }}
          isHrOrAdmin={isHrOrAdmin}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0">
          {showBootstrap && (
            <div className="mx-4 mt-4">
              <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
                <Crown className="h-4 w-4 text-warning" />
                <span className="flex-1">No admin exists yet. As the first user, you can become the admin.</span>
                <Button size="sm" onClick={handleBootstrap} disabled={bootstrapping}>
                  {bootstrapping && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Become Admin
                </Button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="px-4 lg:px-6 py-4 border-b border-border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-foreground">{selectedCategoryName}</h1>
                <p className="text-xs text-muted-foreground">
                  {filteredDocuments.length} document{filteredDocuments.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="pl-9 h-9"
                  />
                </div>
                {isHrOrAdmin && (
                  <Button onClick={() => setUploadDialogOpen(true)} className="h-9 gap-2 shrink-0">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 lg:p-6">
            {documentsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <EmptyState searchQuery={debouncedSearch} />
            ) : (
              <DocumentListView
                documents={filteredDocuments}
                onDelete={isHrOrAdmin ? setDocumentToDelete : undefined}
                showActions={isHrOrAdmin}
              />
            )}
          </div>
        </main>
      </div>

      <MultiUploadDialog
        categories={categories}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
