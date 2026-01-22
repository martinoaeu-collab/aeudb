import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Tag, ArrowRight, Check } from "lucide-react";
import Barcode from "react-barcode";
import { useNextIdentifier } from "@/hooks/useDocuments";

interface BarcodeGeneratorProps {
  onProceedToUpload: (identifier: string) => void;
}

export function BarcodeGenerator({ onProceedToUpload }: BarcodeGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isPrinted, setIsPrinted] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);
  const { data: nextIdentifier, refetch } = useNextIdentifier();

  const handleGenerateCode = async () => {
    await refetch();
    setGeneratedCode(nextIdentifier || "AEU-001");
    setIsPrinted(false);
  };

  const handlePrint = () => {
    if (!barcodeRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const barcodeHtml = barcodeRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${generatedCode}</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .barcode-container {
              text-align: center;
              padding: 20px;
            }
            @media print {
              body { margin: 0; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${barcodeHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setIsPrinted(true);
  };

  const handleProceed = () => {
    if (generatedCode) {
      onProceedToUpload(generatedCode);
      setOpen(false);
      setGeneratedCode(null);
      setIsPrinted(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setGeneratedCode(null);
      setIsPrinted(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-md hover:shadow-lg transition-shadow">
          <Tag className="h-4 w-4" />
          Add New Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Generate Document Barcode
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!generatedCode ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Generate a unique barcode to place on your physical document before uploading.
              </p>
              <Button onClick={handleGenerateCode} size="lg" className="gap-2">
                <Tag className="h-4 w-4" />
                Generate Barcode
              </Button>
            </div>
          ) : (
            <>
              <Card className="bg-white">
                <CardContent className="p-6 flex justify-center" ref={barcodeRef}>
                  <Barcode 
                    value={generatedCode}
                    format="CODE128"
                    width={2}
                    height={80}
                    displayValue={true}
                    fontSize={16}
                    font="monospace"
                    textMargin={8}
                    margin={10}
                  />
                </CardContent>
              </Card>

              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <span className="font-mono text-lg font-bold text-primary">{generatedCode}</span>
                </div>
                
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">1</span>
                    Print this barcode
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">2</span>
                    Place it on the physical document
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">3</span>
                    Proceed to upload the document
                  </li>
                </ol>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant={isPrinted ? "outline" : "default"} 
                  onClick={handlePrint} 
                  className="flex-1 gap-2"
                >
                  {isPrinted ? <Check className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
                  {isPrinted ? "Printed" : "Print Barcode"}
                </Button>
                <Button 
                  onClick={handleProceed} 
                  className="flex-1 gap-2"
                  variant={isPrinted ? "default" : "secondary"}
                >
                  <ArrowRight className="h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
