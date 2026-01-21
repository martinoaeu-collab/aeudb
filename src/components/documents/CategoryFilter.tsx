import { Category } from "@/types/document";
import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedCategory === null ? "default" : "secondary"}
        size="sm"
        onClick={() => onSelectCategory(null)}
        className="gap-1.5"
      >
        <FolderOpen className="h-3.5 w-3.5" />
        All
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelectCategory(category.id)}
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}
