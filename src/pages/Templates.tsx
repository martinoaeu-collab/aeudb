import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePdfTemplates, useDeletePdfTemplate, getPdfTemplateUrl } from "@/hooks/usePdfTemplates";
import { Loader2, Plus, FileText, Trash2, Edit, Play, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PdfTemplate } from "@/types/pdf-template";

export default function Templates() {
  const { user, isLoading: authLoading, isHrOrAdmin } = useAuthContext();
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = usePdfTemplates();
  const deleteTemplate = useDeletePdfTemplate();
  const [templateToDelete, setTemplateToDelete] = useState<PdfTemplate | null>(null);

  const handleDelete = async () => {
    if (!templateToDelete) return;
    await deleteTemplate.mutateAsync(templateToDelete.id);
    setTemplateToDelete(null);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">PDF Templates</h1>
            <p className="text-muted-foreground">Create and manage fillable PDF forms</p>
          </div>
          {isHrOrAdmin && (
            <Button onClick={() => navigate("/templates/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first PDF template to get started
              </p>
              {isHrOrAdmin && (
                <Button onClick={() => navigate("/templates/create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {template.form_fields.length} fields
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4">
                    Created {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/templates/${template.id}/fill`)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Fill Form
                    </Button>
                    {isHrOrAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/templates/${template.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => setTemplateToDelete(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
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
}
