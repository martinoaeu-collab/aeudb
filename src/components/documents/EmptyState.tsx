import { FileText, Search } from "lucide-react";

interface EmptyStateProps {
  searchQuery?: string;
}

export function EmptyState({ searchQuery }: EmptyStateProps) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Search className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No documents found</h3>
        <p className="text-muted-foreground max-w-sm">
          No documents match "{searchQuery}". Try a different search term or clear the filter.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No documents yet</h3>
      <p className="text-muted-foreground max-w-sm">
        Upload your first document to get started. You can organize them with categories and search by identifier codes.
      </p>
    </div>
  );
}
