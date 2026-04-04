import { Document } from "@/types/document";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Trash2, ExternalLink, FileSpreadsheet, FileImage, File } from "lucide-react";
import { getDocumentDownloadUrl } from "@/hooks/useDocuments";
import { formatDistanceToNow } from "date-fns";
import Barcode from "react-barcode";

interface DocumentListViewProps {
  documents: Document[];
  onDelete?: (document: Document) => void;
  showActions?: boolean;
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return <FileText className="h-5 w-5 text-destructive" />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileText className="h-5 w-5 text-primary" />;
  if (fileType.includes("sheet") || fileType.includes("excel")) return <FileSpreadsheet className="h-5 w-5 text-success" />;
  if (fileType.includes("image")) return <FileImage className="h-5 w-5 text-warning" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DocumentListView({ documents, onDelete, showActions = true }: DocumentListViewProps) {
  const handleOpen = (doc: Document) => {
    const url = getDocumentDownloadUrl(doc.file_path);
    window.open(url, "_blank");
  };

  const handleDownload = (doc: Document) => {
    const url = getDocumentDownloadUrl(doc.file_path);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="grid gap-3 animate-fade-in">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="group bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {getFileIcon(doc.file_type)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-sm text-foreground truncate">{doc.title}</h3>
                {doc.category && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {doc.category.name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{doc.file_name}</span>
                <span>·</span>
                <span>{formatFileSize(doc.file_size)}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Barcode */}
            <div className="hidden md:block shrink-0 bg-card border border-border rounded-lg p-1.5">
              <Barcode
                value={doc.identifier}
                format="CODE128"
                width={1}
                height={22}
                displayValue={true}
                fontSize={8}
                font="monospace"
                textMargin={1}
                margin={2}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleOpen(doc)}
                title="Open"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(doc)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              {showActions && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-destructive"
                  onClick={() => onDelete(doc)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
