import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseItem, PurchaseMetrics } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface ComparisonInsightProps {
  items: PurchaseItem[];
  metrics: PurchaseMetrics[];
}

const ComparisonInsight: React.FC<ComparisonInsightProps> = ({ items, metrics }) => {
  const { user } = useAuth();
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (items.length < 2 || isLoading) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-compare", {
        body: { items, metrics },
      });

      if (error) throw error;
      setInsight(data.content);
    } catch {
      setInsight("Unable to generate analysis. The AI comparison edge function may not be deployed yet.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-3">
      {!insight && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={items.length < 2 || isLoading}
          className="gap-1.5"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          AI Analysis
        </Button>
      )}

      {insight && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Comparison Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{insight}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setInsight(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComparisonInsight;
