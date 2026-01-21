import { useState, useMemo } from "react";
import { useDocuments, useCategories, useDeleteDocument } from "@/hooks/useDocuments";
import { SearchBar } from "@/components/documents/SearchBar";
import { CategoryFilter } from "@/components/documents/CategoryFilter";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { UploadDialog } from "@/components/documents/UploadDialog";
import { CreateCategoryDialog } from "@/components/documents/CreateCategoryDialog";
import { EmptyState } from "@/components/documents/EmptyState";
import { Document } from "@/types/document";
import { FileArchive, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDebounce } from "@/hooks/useDebounce";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data: documents = [], isLoading: documentsLoading } = useDocuments(debouncedSearch, selectedCategory);
  const { data: categories = [] } = useCategories();
  const deleteMutation = useDeleteDocument();

  const handleDelete = async () => {
    if (!documentToDelete) return;
    await deleteMutation.mutateAsync(documentToDelete);
    setDocumentToDelete(null);
  };

  const stats = useMemo(() => ({
    total: documents.length,
    categories: categories.length,
  }), [documents.length, categories.length]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-md">
                <FileArchive className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">DocVault</h1>
                <p className="text-sm text-muted-foreground">Document Management System</p>
              </div>
            </div>
            <UploadDialog categories={categories} />
          </div>

          {/* Search and Stats */}
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="font-medium">{stats.total} documents</span>
              <span>•</span>
              <span>{stats.categories} categories</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Category Filter */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
          <CreateCategoryDialog />
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
                onDelete={setDocumentToDelete}
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
