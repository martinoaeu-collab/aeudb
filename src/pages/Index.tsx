import { useState, useMemo, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useDocuments, useCategories, useDeleteDocument } from "@/hooks/useDocuments";
import { SearchBar } from "@/components/documents/SearchBar";
import { CategoryFilter } from "@/components/documents/CategoryFilter";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDialog } from "@/components/documents/UploadDialog";
import { CreateCategoryDialog } from "@/components/documents/CreateCategoryDialog";
import { EmptyState } from "@/components/documents/EmptyState";
import { Header } from "@/components/layout/Header";
import { Document } from "@/types/document";
import { Loader2, Crown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data: documents = [], isLoading: documentsLoading } = useDocuments(debouncedSearch, selectedCategory);
  const { data: categories = [] } = useCategories();
  const deleteMutation = useDeleteDocument();

  // Check if bootstrap is available (no admin exists)
  useEffect(() => {
    if (user && role === "staff") {
      supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin")
        .then(({ count }) => {
          if (count === 0) {
            setShowBootstrap(true);
          }
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

  const stats = useMemo(() => ({
    total: documents.length,
    categories: categories.length,
  }), [documents.length, categories.length]);

  // Redirect to login if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header>
        {isHrOrAdmin && <UploadDialog categories={categories} />}
      </Header>

      {/* Bootstrap Admin Alert */}
      {showBootstrap && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Alert className="bg-warning/10 border-warning">
            <Crown className="h-4 w-4 text-warning" />
            <AlertDescription className="flex items-center justify-between">
              <span>No admin exists yet. As the first user, you can become the admin.</span>
              <Button 
                size="sm" 
                onClick={handleBootstrap}
                disabled={bootstrapping}
                className="ml-4"
              >
                {bootstrapping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Become Admin
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Search Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-border bg-card/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-medium">{stats.total} documents</span>
            <span>•</span>
            <span>{stats.categories} categories</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Category Filter */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
          {isHrOrAdmin && <CreateCategoryDialog />}
        </div>

        {/* Documents List */}
        {documentsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState searchQuery={debouncedSearch} />
        ) : (
          <div className="grid gap-4">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDelete={isHrOrAdmin ? setDocumentToDelete : undefined}
                showActions={isHrOrAdmin}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
