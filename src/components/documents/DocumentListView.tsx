import { Document } from "@/types/document";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[140px]">Barcode</TableHead>
            <TableHead className="w-[50px]">Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-[120px]">Category</TableHead>
            <TableHead className="w-[100px]">Size</TableHead>
            <TableHead className="w-[140px]">Modified</TableHead>
            <TableHead className="w-[120px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id} className="group">
              <TableCell className="py-2">
                <div className="bg-white rounded p-1 inline-block border border-border">
                  <Barcode 
                    value={doc.identifier}
                    format="CODE128"
                    width={1}
                    height={30}
                    displayValue={true}
                    fontSize={8}
                    font="monospace"
                    textMargin={1}
                    margin={1}
                  />
                </div>
              </TableCell>
              <TableCell>
                {getFileIcon(doc.file_type)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground truncate max-w-[300px]" title={doc.title}>
                    {doc.title}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[300px]" title={doc.file_name}>
                    {doc.file_name}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {doc.category && (
                  <Badge variant="secondary" className="text-xs">
                    {doc.category.name}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatFileSize(doc.file_size)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleOpen(doc)} 
                    title="Open in new tab"
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
