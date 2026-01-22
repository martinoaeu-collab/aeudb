import { Document } from "@/types/document";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Trash2, ExternalLink, FileSpreadsheet, FileImage, File } from "lucide-react";
import { getDocumentDownloadUrl } from "@/hooks/useDocuments";
import { formatDistanceToNow } from "date-fns";
import Barcode from "react-barcode";

interface DocumentCardProps {
  document: Document;
  onDelete?: (document: Document) => void;
  showActions?: boolean;
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return <FileText className="h-8 w-8 text-destructive" />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText className="h-8 w-8 text-primary" />;
  if (fileType.includes("sheet") || fileType.includes("excel")) return <FileSpreadsheet className="h-8 w-8 text-success" />;
  if (fileType.includes("image")) return <FileImage className="h-8 w-8 text-warning" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function DocumentCard({ document: doc, onDelete, showActions = true }: DocumentCardProps) {
  const downloadUrl = getDocumentDownloadUrl(doc.file_path);

  const handleOpen = () => {
    window.open(downloadUrl, "_blank");
  };

  const handleDownload = () => {
    const a = window.document.createElement("a");
    a.href = downloadUrl;
    a.download = doc.file_name;
    a.target = "_blank";
    a.click();
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Barcode on the left */}
          <div className="flex-shrink-0 bg-white rounded-lg p-2 border border-border">
            <Barcode 
              value={doc.identifier}
              format="CODE128"
              width={1}
              height={40}
              displayValue={true}
              fontSize={10}
              font="monospace"
              textMargin={2}
              margin={2}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {doc.category && (
                <Badge variant="secondary" className="text-xs">
                  {doc.category.name}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-foreground truncate mb-1">
              {doc.title}
            </h3>
            {doc.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {doc.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{doc.file_name}</span>
              <span>•</span>
              <span>{formatFileSize(doc.file_size)}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}</span>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={handleOpen} title="Open in new tab">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            {showActions && onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDelete(doc)} 
                title="Delete"
                className="hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
