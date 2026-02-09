import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { loadPurchaseItems, savePurchaseItems } from "@/utils/storage";
import { useState, useEffect, useCallback } from "react";

function dbRowToItem(row: any): PurchaseItem {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    lifespanYears: Number(row.lifespan_years),
    usesPerWeek: Number(row.uses_per_week),
    minutesPerUse: Number(row.minutes_per_use),
    depreciationRatePercent: Number(row.depreciation_rate_percent),
  };
}

function itemToDbRow(item: PurchaseItem, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    price: item.price,
    lifespan_years: item.lifespanYears,
    uses_per_week: item.usesPerWeek,
    minutes_per_use: item.minutesPerUse,
    depreciation_rate_percent: item.depreciationRatePercent,
  };
}

// Authenticated mode: uses Supabase via React Query
function useSupabasePurchaseItems(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["purchase-items", userId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_items")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map(dbRowToItem);
    },
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: async (item: PurchaseItem) => {
      const { data, error } = await supabase
        .from("purchase_items")
        .insert(itemToDbRow(item, userId))
        .select()
        .single();
      if (error) throw error;
      return dbRowToItem(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: async (item: PurchaseItem) => {
      const { data, error } = await supabase
        .from("purchase_items")
        .update({
          name: item.name,
          price: item.price,
          lifespan_years: item.lifespanYears,
          uses_per_week: item.usesPerWeek,
          minutes_per_use: item.minutesPerUse,
          depreciation_rate_percent: item.depreciationRatePercent,
        })
        .eq("id", item.id)
        .select()
        .single();
      if (error) throw error;
      return dbRowToItem(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("purchase_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const importMutation = useMutation({
    mutationFn: async (items: PurchaseItem[]) => {
      const rows = items.map((item) => itemToDbRow(item, userId));
      const { error } = await supabase.from("purchase_items").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    createItem: createMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    importItems: importMutation.mutateAsync,
  };
}

// Guest mode: uses localStorage
function useLocalPurchaseItems() {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = loadPurchaseItems();
    if (stored.length > 0) {
      setItems(stored);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && items.length > 0) {
      savePurchaseItems(items);
    }
  }, [items, isLoading]);

  const createItem = useCallback(async (item: PurchaseItem) => {
    setItems((prev) => [...prev, item]);
    return item;
  }, []);

  const updateItem = useCallback(async (item: PurchaseItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
    return item;
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const importItems = useCallback(async (newItems: PurchaseItem[]) => {
    setItems(newItems);
    savePurchaseItems(newItems);
  }, []);

  return { items, isLoading, createItem, updateItem, deleteItem, importItems };
}

// Main hook: switches between Supabase and localStorage based on auth state
export function usePurchaseItems() {
  const { user } = useAuth();
  const supabaseItems = useSupabasePurchaseItems(user?.id || "");
  const localItems = useLocalPurchaseItems();

  if (user) {
    return supabaseItems;
  }
  return localItems;
}
