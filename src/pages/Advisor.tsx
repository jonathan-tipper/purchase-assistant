import React, { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { usePurchaseItems } from "@/hooks/usePurchaseItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Sparkles, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseItem } from "@/types";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
  suggestedItem?: Partial<PurchaseItem>;
}

const Advisor = () => {
  const { user } = useAuth();
  const { items, createItem } = usePurchaseItems();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestedPrompts = [
    "I want to buy a laptop for work and personal use",
    "Help me decide between buying or leasing a car",
    "Is a standing desk worth the investment?",
    "Compare budget vs premium headphones",
  ];

  const handleSend = async (message?: string) => {
    const text = message || input;
    if (!text.trim() || isLoading) return;

    const userMessage: AIMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-advisor", {
        body: {
          message: text,
          conversationHistory: messages,
          userItems: items,
        },
      });

      if (error) throw error;

      const assistantMessage: AIMessage = {
        role: "assistant",
        content: data.content,
        suggestedItem: data.suggestedItem,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm unable to respond right now. The AI advisor edge function may not be deployed yet. Please check your Supabase Edge Functions.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestedItem = async (suggested: Partial<PurchaseItem>) => {
    const newItem: PurchaseItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: suggested.name || "AI Suggested Item",
      price: suggested.price || 0,
      lifespanYears: suggested.lifespanYears || 5,
      usesPerWeek: suggested.usesPerWeek || 3,
      minutesPerUse: suggested.minutesPerUse || 30,
      depreciationRatePercent: suggested.depreciationRatePercent || 20,
    };

    await createItem(newItem);
    toast({
      title: "Item added",
      description: `"${newItem.name}" has been added to your calculator.`,
    });
    navigate("/");
  };

  return (
    <Layout purchaseItems={items} currencyCode="GBP" onCurrencyChange={() => {}}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">AI Purchase Advisor</h2>
        </div>

        <div className="min-h-[60vh] flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">What are you thinking about buying?</h3>
                <p className="text-sm text-muted-foreground">
                  Describe what you want to purchase and I'll help you analyze the value.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                {suggestedPrompts.map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="text-left h-auto py-3 px-4"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-4 mb-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <Card
                    className={`max-w-[80%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <CardContent className="p-3">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.suggestedItem && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-3"
                          onClick={() => handleAddSuggestedItem(msg.suggestedItem!)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add to Calculator
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <Card className="bg-muted">
                    <CardContent className="p-3">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </CardContent>
                  </Card>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="sticky bottom-0 bg-background pt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what you want to buy..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Advisor;
