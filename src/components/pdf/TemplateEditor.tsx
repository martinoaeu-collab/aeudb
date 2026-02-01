import { useState, useCallback } from "react";
import { FormField } from "@/types/pdf-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Type, CheckSquare, Calendar, FileText, PenTool } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TemplateEditorProps {
  fields: FormField[];
  onFieldsChange: (fields: FormField[]) => void;
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  currentPage: number;
}

const FIELD_TYPES = [
  { value: "text", label: "Text Field", icon: Type },
  { value: "textarea", label: "Text Area", icon: FileText },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "date", label: "Date", icon: Calendar },
  { value: "signature", label: "Signature", icon: PenTool },
] as const;

export function TemplateEditor({
  fields,
  onFieldsChange,
  selectedFieldId,
  onSelectField,
  currentPage,
}: TemplateEditorProps) {
  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type,
      name: `field_${fields.length + 1}`,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      x: 100,
      y: 100,
      width: type === "checkbox" ? 30 : 200,
      height: type === "textarea" ? 100 : type === "checkbox" ? 30 : 30,
      page: currentPage,
      required: false,
    };
    onFieldsChange([...fields, newField]);
    onSelectField(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onFieldsChange(
      fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const deleteField = (id: string) => {
    onFieldsChange(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) onSelectField(null);
  };

  const pageFields = fields.filter((f) => f.page === currentPage);

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3">Add Form Field</h3>
        <div className="grid grid-cols-3 gap-2">
          {FIELD_TYPES.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="outline"
              size="sm"
              className="flex flex-col gap-1 h-auto py-2"
              onClick={() => addField(value)}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label.split(" ")[0]}</span>
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">
              Fields on Page {currentPage} ({pageFields.length})
            </h4>
            <div className="space-y-2">
              {pageFields.map((field) => (
                <div
                  key={field.id}
                  className={`p-2 rounded border cursor-pointer transition-colors ${
                    selectedFieldId === field.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => onSelectField(field.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{field.label}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteField(field.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {field.type}
                  </span>
                </div>
              ))}
              {pageFields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No fields on this page
                </p>
              )}
            </div>
          </div>

          {selectedField && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Field Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={selectedField.label}
                    onChange={(e) =>
                      updateField(selectedField.id, { label: e.target.value })
                    }
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Name (for export)</Label>
                  <Input
                    value={selectedField.name}
                    onChange={(e) =>
                      updateField(selectedField.id, { name: e.target.value })
                    }
                    className="h-8"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X Position</Label>
                    <Input
                      type="number"
                      value={selectedField.x}
                      onChange={(e) =>
                        updateField(selectedField.id, { x: Number(e.target.value) })
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Y Position</Label>
                    <Input
                      type="number"
                      value={selectedField.y}
                      onChange={(e) =>
                        updateField(selectedField.id, { y: Number(e.target.value) })
                      }
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input
                      type="number"
                      value={selectedField.width}
                      onChange={(e) =>
                        updateField(selectedField.id, { width: Number(e.target.value) })
                      }
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input
                      type="number"
                      value={selectedField.height}
                      onChange={(e) =>
                        updateField(selectedField.id, { height: Number(e.target.value) })
                      }
                      className="h-8"
                    />
                  </div>
                </div>
                {(selectedField.type === "text" || selectedField.type === "textarea") && (
                  <div>
                    <Label className="text-xs">Placeholder</Label>
                    <Input
                      value={selectedField.placeholder || ""}
                      onChange={(e) =>
                        updateField(selectedField.id, { placeholder: e.target.value })
                      }
                      className="h-8"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="required"
                    checked={selectedField.required}
                    onCheckedChange={(checked) =>
                      updateField(selectedField.id, { required: !!checked })
                    }
                  />
                  <Label htmlFor="required" className="text-xs">
                    Required field
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
