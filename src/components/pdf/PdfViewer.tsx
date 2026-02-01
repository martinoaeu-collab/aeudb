import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Loader2 } from "lucide-react";

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfViewerProps {
  url: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onDocumentLoad?: (numPages: number) => void;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  children?: React.ReactNode;
}

export function PdfViewer({
  url,
  currentPage,
  onPageChange,
  onDocumentLoad,
  scale = 1,
  onScaleChange,
  children,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    onDocumentLoad?.(numPages);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < numPages) onPageChange(currentPage + 1);
  };

  const zoomIn = () => onScaleChange?.(Math.min(scale + 0.25, 3));
  const zoomOut = () => onScaleChange?.(Math.max(scale - 0.25, 0.5));

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevPage} disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {numPages}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextPage} disabled={currentPage >= numPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="icon" onClick={zoomIn} disabled={scale >= 3}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/30 flex justify-center p-4"
      >
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            className="shadow-lg"
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
          {/* Overlay for form fields */}
          {children}
        </div>
      </div>
    </div>
  );
}
