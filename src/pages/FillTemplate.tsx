import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { FormFieldOverlay } from "@/components/pdf/FormFieldOverlay";
import { usePdfTemplate, getPdfTemplateUrl, useCreateFilledForm, uploadFilledPdf } from "@/hooks/usePdfTemplates";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader2, Save, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function FillTemplate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthContext();
  const { data: template, isLoading: templateLoading } = usePdfTemplate(id);
  
  const [formName, setFormName] = useState("");
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const createFilledForm = useCreateFilledForm();

  useEffect(() => {
    if (template) {
      setFormName(`${template.name} - ${new Date().toLocaleDateString()}`);
    }
  }, [template]);

  const handleValueChange = (fieldId: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const generateFilledPdf = async (): Promise<Uint8Array> => {
    if (!template) throw new Error("No template loaded");
    
    const pdfUrl = getPdfTemplateUrl(template.base_pdf_path);
    const pdfBytes = await fetch(pdfUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    // Add form fields as text annotations
    template.form_fields.forEach((field) => {
      const page = pages[field.page - 1];
      if (!page) return;
      
      const value = values[field.id];
      if (!value && field.type !== "checkbox") return;

      const pageHeight = page.getHeight();
      // Convert from top-left origin to bottom-left origin
      const y = pageHeight - field.y - field.height;

      if (field.type === "checkbox") {
        if (value) {
          page.drawText("✓", {
            x: field.x + 5,
            y: y + 5,
            size: Math.min(field.height - 4, 20),
            font,
            color: rgb(0, 0, 0),
          });
        }
      } else if (field.type === "text" || field.type === "date") {
        page.drawText(String(value), {
          x: field.x + 4,
          y: y + 8,
          size: 12,
          font,
          color: rgb(0, 0, 0),
          maxWidth: field.width - 8,
        });
      } else if (field.type === "textarea") {
        const lines = String(value).split("\n");
        let lineY = y + field.height - 16;
        lines.forEach((line) => {
          if (lineY > y) {
            page.drawText(line, {
              x: field.x + 4,
              y: lineY,
              size: 11,
              font,
              color: rgb(0, 0, 0),
              maxWidth: field.width - 8,
            });
            lineY -= 14;
          }
        });
      }
    });

    // Create interactive form fields for Chrome compatibility
    const form = pdfDoc.getForm();
    template.form_fields.forEach((field, index) => {
      const page = pages[field.page - 1];
      if (!page) return;
      
      const pageHeight = page.getHeight();
      const y = pageHeight - field.y - field.height;

      try {
        if (field.type === "text" || field.type === "date" || field.type === "textarea") {
          const textField = form.createTextField(`field_${index}_${field.name}`);
          textField.setText(String(values[field.id] || ""));
          textField.addToPage(page, {
            x: field.x,
            y: y,
            width: field.width,
            height: field.height,
          });
        } else if (field.type === "checkbox") {
          const checkbox = form.createCheckBox(`field_${index}_${field.name}`);
          if (values[field.id]) {
            checkbox.check();
          }
          checkbox.addToPage(page, {
            x: field.x,
            y: y,
            width: field.width,
            height: field.height,
          });
        }
      } catch (e) {
        console.warn(`Could not create form field: ${field.name}`, e);
      }
    });

    return pdfDoc.save();
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const pdfBytes = await generateFilledPdf();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formName.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async () => {
    if (!template || !formName.trim()) {
      toast.error("Please enter a form name");
      return;
    }

    setSaving(true);
    try {
      // Generate and upload filled PDF
      const pdfBytes = await generateFilledPdf();
      const outputPath = await uploadFilledPdf(pdfBytes, formName);

      // Save form record
      await createFilledForm.mutateAsync({
        template_id: template.id,
        name: formName,
        filled_data: values,
        output_pdf_path: outputPath,
        created_by: user?.id || null,
      });

      navigate("/templates");
    } catch (error) {
      console.error("Failed to save form:", error);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || templateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!template) {
    return <Navigate to="/templates" replace />;
  }

  const pdfUrl = getPdfTemplateUrl(template.base_pdf_path);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="border-b bg-card/50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/templates")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{template.name}</h1>
              <p className="text-sm text-muted-foreground">Fill out the form fields</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download PDF
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Form
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left sidebar - Form info */}
        <div className="w-72 border-r bg-card p-4 space-y-4">
          <div>
            <Label>Form Name</Label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter a name for this form"
            />
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Form Fields</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {template.form_fields.length} fields to fill
            </p>
            <div className="space-y-2 text-sm">
              {template.form_fields.map((field) => (
                <div
                  key={field.id}
                  className={`p-2 rounded border ${
                    values[field.id] ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="font-medium">{field.label}</div>
                  <div className="text-muted-foreground text-xs capitalize">
                    {field.type} {field.required && "• Required"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content - PDF viewer with form fields */}
        <div className="flex-1">
          <PdfViewer
            url={pdfUrl}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onDocumentLoad={setNumPages}
            scale={scale}
            onScaleChange={setScale}
          >
            <FormFieldOverlay
              fields={template.form_fields}
              currentPage={currentPage}
              scale={scale}
              values={values}
              onChange={handleValueChange}
            />
          </PdfViewer>
        </div>
      </div>
    </div>
  );
}
