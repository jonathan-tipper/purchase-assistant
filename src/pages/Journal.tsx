import React, { useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchaseItems } from "@/hooks/usePurchaseItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Plus, Sparkles, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface JournalEntry {
  id: string;
  name: string;
  purchase_date: string;
  actual_price: number;
  satisfaction_score: number | null;
  notes: string | null;
  would_buy_again: boolean | null;
  actual_uses_per_week: number | null;
  created_at: string;
}

const Journal = () => {
  const { user } = useAuth();
  const { items } = usePurchaseItems();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    purchase_date: new Date().toISOString().split("T")[0],
    actual_price: 0,
    satisfaction_score: 7,
    notes: "",
    would_buy_again: true,
    actual_uses_per_week: 3,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal-entries", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_journal")
        .select("*")
        .order("purchase_date", { ascending: false });
      if (error) throw error;
      return data as JournalEntry[];
    },
    enabled: !!user,
  });

  const createEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("purchase_journal").insert({
        user_id: user!.id,
        ...formData,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      setShowForm(false);
      setFormData({
        name: "",
        purchase_date: new Date().toISOString().split("T")[0],
        actual_price: 0,
        satisfaction_score: 7,
        notes: "",
        would_buy_again: true,
        actual_uses_per_week: 3,
      });
      toast({ title: "Entry added", description: "Your purchase has been logged." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleGetInsights = async () => {
    setInsightLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-journal-review", {
        body: { entries, userItems: items },
      });
      if (error) throw error;
      setAiInsight(data.content);
    } catch {
      setAiInsight(
        "Unable to generate insights right now. The AI journal review edge function may not be deployed yet."
      );
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <Layout purchaseItems={items} currencyCode="GBP" onCurrencyChange={() => {}}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Purchase Journal</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleGetInsights} disabled={insightLoading}>
              {insightLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              AI Insights
            </Button>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-1" />
              Log Purchase
            </Button>
          </div>
        </div>

        {aiInsight && (
          <Card className="mb-6 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{aiInsight}</p>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Log a Purchase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="What did you buy?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price Paid</Label>
                  <Input
                    type="number"
                    value={formData.actual_price}
                    onChange={(e) => setFormData({ ...formData, actual_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Uses Per Week</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.actual_uses_per_week}
                    onChange={(e) =>
                      setFormData({ ...formData, actual_uses_per_week: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Satisfaction ({formData.satisfaction_score}/10)</Label>
                <Slider
                  value={[formData.satisfaction_score]}
                  onValueChange={([v]) => setFormData({ ...formData, satisfaction_score: v })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.would_buy_again}
                  onCheckedChange={(v) => setFormData({ ...formData, would_buy_again: v })}
                />
                <Label>Would buy again</Label>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any thoughts on this purchase?"
                />
              </div>
              <Button onClick={() => createEntry.mutate()} disabled={!formData.name || createEntry.isPending}>
                {createEntry.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save Entry
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No purchases logged yet.</p>
            <p className="text-sm">Click "Log Purchase" to start tracking your buying decisions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{entry.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.purchase_date).toLocaleDateString()} — {entry.actual_price > 0 && `£${entry.actual_price}`}
                      </p>
                    </div>
                    <div className="text-right">
                      {entry.satisfaction_score && (
                        <span className="text-sm font-medium">
                          {entry.satisfaction_score}/10
                        </span>
                      )}
                      {entry.would_buy_again !== null && (
                        <p className="text-xs text-muted-foreground">
                          {entry.would_buy_again ? "Would buy again" : "Would not rebuy"}
                        </p>
                      )}
                    </div>
                  </div>
                  {entry.notes && (
                    <p className="text-sm mt-2 text-muted-foreground">{entry.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Journal;
