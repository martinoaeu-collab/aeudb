import { useState, useMemo, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useDocuments, useCategories, useDeleteDocument } from "@/hooks/useDocuments";
import { SearchBar } from "@/components/documents/SearchBar";
import { CategoryFilter } from "@/components/documents/CategoryFilter";
import { DocumentListView } from "@/components/documents/DocumentListView";
import { UploadDialog } from "@/components/documents/UploadDialog";
import { BarcodeGenerator } from "@/components/documents/BarcodeGenerator";
import { CreateCategoryDialog } from "@/components/documents/CreateCategoryDialog";
import { EmptyState } from "@/components/documents/EmptyState";
import { Header } from "@/components/layout/Header";
import { Document } from "@/types/document";
import { Loader2, Crown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
  const [currentIdentifier, setCurrentIdentifier] = useState("");
  const [allowedCategoryIds, setAllowedCategoryIds] = useState<string[] | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: documents = [], isLoading: documentsLoading } = useDocuments(debouncedSearch, selectedCategory);
  const { data: categories = [] } = useCategories();
  const deleteMutation = useDeleteDocument();

  // Fetch user's allowed categories
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
            // No restrictions = all access
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
    } catch (err) {
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

  // Filter documents by allowed categories
  const filteredDocuments = useMemo(() => {
    if (!allowedCategoryIds) return documents; // null = all access
    return documents.filter(doc =>
      doc.category_id && allowedCategoryIds.includes(doc.category_id)
    );
  }, [documents, allowedCategoryIds]);

  // Filter categories by allowed
  const filteredCategories = useMemo(() => {
    if (!allowedCategoryIds) return categories;
    return categories.filter(cat => allowedCategoryIds.includes(cat.id));
  }, [categories, allowedCategoryIds]);

  const stats = useMemo(() => ({
    total: filteredDocuments.length,
    categories: filteredCategories.length,
  }), [filteredDocuments.length, filteredCategories.length]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const handleProceedToUpload = (identifier: string) => {
    setCurrentIdentifier(identifier);
    setUploadDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header>
        {isHrOrAdmin && <BarcodeGenerator onProceedToUpload={handleProceedToUpload} />}
      </Header>

      <UploadDialog
        categories={categories}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        identifier={currentIdentifier}
      />

      {showBootstrap && (
        <div className="max-w-7xl mx-auto px-4 pt-2">
          <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning text-xs">
            <Crown className="h-4 w-4 text-warning" />
            <span>No admin exists yet. As the first user, you can become the admin.</span>
            <Button size="sm" onClick={handleBootstrap} disabled={bootstrapping} className="win-button h-6 text-xs ml-auto">
              {bootstrapping ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Become Admin
            </Button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="max-w-7xl mx-auto px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {stats.total} documents | {stats.categories} categories
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 mb-3">
          <CategoryFilter
            categories={filteredCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
          {isHrOrAdmin && <CreateCategoryDialog />}
        </div>

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
      </main>

      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent className="win-dialog" style={{ borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete "{documentToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="win-button h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="win-button h-7 text-xs">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
