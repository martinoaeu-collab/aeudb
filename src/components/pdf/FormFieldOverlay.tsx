import { FormField } from "@/types/pdf-template";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface FormFieldOverlayProps {
  fields: FormField[];
  currentPage: number;
  scale: number;
  values: Record<string, string | boolean>;
  onChange: (fieldId: string, value: string | boolean) => void;
  editMode?: boolean;
  onFieldClick?: (field: FormField) => void;
  selectedFieldId?: string | null;
}

export function FormFieldOverlay({
  fields,
  currentPage,
  scale,
  values,
  onChange,
  editMode = false,
  onFieldClick,
  selectedFieldId,
}: FormFieldOverlayProps) {
  const pageFields = fields.filter((f) => f.page === currentPage);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {pageFields.map((field) => (
        <div
          key={field.id}
          className={cn(
            "absolute pointer-events-auto",
            editMode && "cursor-move border-2 border-dashed border-primary/50 hover:border-primary",
            selectedFieldId === field.id && "ring-2 ring-primary"
          )}
          style={{
            left: field.x * scale,
            top: field.y * scale,
            width: field.width * scale,
            height: field.height * scale,
          }}
          onClick={() => editMode && onFieldClick?.(field)}
        >
          {!editMode && renderField(field, values, onChange, scale)}
          {editMode && (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-xs font-medium text-primary">
              {field.label || field.type}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function renderField(
  field: FormField,
  values: Record<string, string | boolean>,
  onChange: (fieldId: string, value: string | boolean) => void,
  scale: number
) {
  const value = values[field.id] ?? "";
  const fontSize = Math.max(12 * scale, 10);

  switch (field.type) {
    case "text":
    case "date":
      return (
        <Input
          type={field.type === "date" ? "date" : "text"}
          value={value as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          className="w-full h-full bg-background/90 border-border"
          style={{ fontSize }}
        />
      );
    case "textarea":
      return (
        <Textarea
          value={value as string}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          className="w-full h-full bg-background/90 border-border resize-none"
          style={{ fontSize }}
        />
      );
    case "checkbox":
      return (
        <div className="w-full h-full flex items-center justify-center bg-background/90">
          <Checkbox
            checked={value as boolean}
            onCheckedChange={(checked) => onChange(field.id, !!checked)}
          />
        </div>
      );
    case "signature":
      return (
        <div className="w-full h-full bg-background/90 border border-border flex items-center justify-center text-xs text-muted-foreground">
          {value ? "Signed" : "Click to sign"}
        </div>
      );
    default:
      return null;
  }
}
