import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { FormFieldOverlay } from "@/components/pdf/FormFieldOverlay";
import { TemplateEditor } from "@/components/pdf/TemplateEditor";
import { FormField } from "@/types/pdf-template";
import { useCreatePdfTemplate, uploadPdfTemplate, getPdfTemplateUrl } from "@/hooks/usePdfTemplates";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2, Upload, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CreateTemplate() {
  const { user, isLoading: authLoading, isHrOrAdmin } = useAuthContext();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [uploading, setUploading] = useState(false);
  
  const createTemplate = useCreatePdfTemplate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
      setFields([]);
      setCurrentPage(1);
    } else {
      toast.error("Please select a PDF file");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!pdfFile) {
      toast.error("Please upload a PDF file");
      return;
    }

    setUploading(true);
    try {
      // Upload PDF to storage
      const pdfPath = await uploadPdfTemplate(pdfFile);
      
      // Create template record
      await createTemplate.mutateAsync({
        name,
        description: description || null,
        base_pdf_path: pdfPath,
        form_fields: fields,
        created_by: user?.id || null,
      });
      
      navigate("/templates");
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setUploading(false);
    }
  };

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

  if (!isHrOrAdmin) {
    return <Navigate to="/" replace />;
  }

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
            <h1 className="text-lg font-semibold">Create PDF Template</h1>
          </div>
          <Button onClick={handleSave} disabled={uploading || !pdfFile || !name}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Template
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left sidebar - Template info */}
        <div className="w-72 border-r bg-card p-4 space-y-4">
          <div>
            <Label>Template Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Employee Leave Form"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
            />
          </div>
          <div>
            <Label>Base PDF *</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {pdfFile ? pdfFile.name : "Upload PDF"}
            </Button>
          </div>
          {pdfFile && (
            <Card className="bg-muted/50">
              <CardContent className="p-3 text-sm">
                <p className="font-medium truncate">{pdfFile.name}</p>
                <p className="text-muted-foreground">
                  {(pdfFile.size / 1024).toFixed(1)} KB • {numPages} pages
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main content - PDF viewer */}
        <div className="flex-1 flex flex-col">
          {pdfUrl ? (
            <PdfViewer
              url={pdfUrl}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onDocumentLoad={setNumPages}
              scale={scale}
              onScaleChange={setScale}
            >
              <FormFieldOverlay
                fields={fields}
                currentPage={currentPage}
                scale={scale}
                values={{}}
                onChange={() => {}}
                editMode={true}
                onFieldClick={(field) => setSelectedFieldId(field.id)}
                selectedFieldId={selectedFieldId}
              />
            </PdfViewer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload a PDF to start creating your template</p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar - Field editor */}
        {pdfUrl && (
          <TemplateEditor
            fields={fields}
            onFieldsChange={setFields}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            currentPage={currentPage}
          />
        )}
      </div>
    </div>
  );
}
