import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface NaturalLanguageInputProps {
  onItemParsed: (item: Partial<PurchaseItem>) => void;
}

const NaturalLanguageInput: React.FC<NaturalLanguageInputProps> = ({ onItemParsed }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!description.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-parse-input", {
        body: { description },
      });

      if (fnError) throw fnError;
      if (data?.item) {
        onItemParsed(data.item);
        setDescription("");
      }
    } catch (err: any) {
      setError("Could not parse description. Try being more specific about the item and price.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Describe your purchase in plain English</span>
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. a $1200 laptop I'll use daily for 5 years"
        rows={2}
        className="resize-none text-sm"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        size="sm"
        variant="secondary"
        onClick={handleParse}
        disabled={!description.trim() || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-1" />
        )}
        Auto-fill from description
      </Button>
    </div>
  );
};

export default NaturalLanguageInput;
