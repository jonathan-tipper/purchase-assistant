
import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { PurchaseItem } from "@/types";
import { Download, Upload } from "lucide-react";
import { exportPurchaseItems, validateImportData } from "@/utils/storage";

interface ImportExportItemsProps {
  items: PurchaseItem[];
  onImport: (items: PurchaseItem[]) => void;
}

const ImportExportItems: React.FC<ImportExportItemsProps> = ({ items, onImport }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportPurchaseItems(items);
    toast({
      title: "Export successful",
      description: "Your purchase items have been exported to a JSON file."
    });
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        if (validateImportData(data)) {
          onImport(data);
          toast({
            title: "Import successful",
            description: `Imported ${data.length} purchase items.`
          });
        } else {
          throw new Error("Invalid data format");
        }
      } catch (error) {
        toast({
          title: "Import failed",
          description: "The file format is not valid.",
          variant: "destructive"
        });
      }
      
      // Clear the input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Import/Export Items</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Save your purchase items to a file or load them from a previously exported file.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={handleExport} 
            className="flex items-center gap-2"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            Export Items
          </Button>
          <Button 
            onClick={handleImportClick} 
            className="flex items-center gap-2"
            variant="outline"
          >
            <Upload className="h-4 w-4" />
            Import Items
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ImportExportItems;
