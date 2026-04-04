import { useState } from "react";
import { Category } from "@/types/document";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen, Plus, X, FolderClosed, Search } from "lucide-react";
import { useCreateCategory } from "@/hooks/useDocuments";
import { cn } from "@/lib/utils";

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isHrOrAdmin: boolean;
  open: boolean;
  onClose: () => void;
}

export function CategorySidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  isHrOrAdmin,
  open,
  onClose,
}: CategorySidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const createCategory = useCreateCategory();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCategory.mutateAsync({ name: newName.trim() });
    setNewName("");
    setShowCreate(false);
  };

  return (
    <>
      {/* Overlay on mobile */}
      {open && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-14 left-0 z-40 lg:z-10 h-[calc(100vh-3.5rem)] w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            Categories
          </h2>
          <div className="flex items-center gap-1">
            {isHrOrAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => setShowCreate(!showCreate)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showCreate && (
          <div className="p-3 border-b border-sidebar-border space-y-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name..."
              className="h-8 text-sm bg-sidebar-accent border-sidebar-border text-sidebar-foreground"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={handleCreate}
                disabled={!newName.trim() || createCategory.isPending}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-sidebar-foreground/60"
                onClick={() => { setShowCreate(false); setNewName(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2">
          <button
            onClick={() => onSelectCategory(null)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left",
              selectedCategory === null
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span>All Documents</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left",
                selectedCategory === cat.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <FolderClosed className="h-4 w-4 shrink-0" />
              <span className="truncate">{cat.name}</span>
            </button>
          ))}

          {categories.length === 0 && (
            <p className="px-4 py-6 text-xs text-sidebar-foreground/40 text-center">
              No categories yet
            </p>
          )}
        </nav>
      </aside>
    </>
  );
}
