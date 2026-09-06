import { z } from "zod";
import { cloudClient } from "@/integrations/supabase/client";
import {
  researchSchema,
  publicUrl,
  currencySchema,
  type Decision,
} from "@/domain/decision";
export const extractionSchema = z.object({
  name: z.string().min(1).max(120),
  price: z.number().finite().min(0).max(1_000_000).nullable(),
  currency: currencySchema,
  lifespanYears: z.number().finite().min(0.5).max(30).nullable(),
  usesPerWeek: z.number().finite().min(0).max(100).nullable(),
  notes: z.string().max(1600),
  questions: z.array(z.string().max(300)).max(3),
});
export type Extraction = z.infer<typeof extractionSchema>;
export async function invokeAssistant(body: object) {
  const { data, error } = await cloudClient().functions.invoke(
    "decision-assistant",
    { body: { ...body, requestId: crypto.randomUUID() } },
  );
  if (error) {
    let message =
      "The assistant could not finish. Your decision is unchanged. Please try again.";
    if ("context" in error && error.context instanceof Response) {
      try {
        const response = await error.context.json();
        if (typeof response.error === "string") message = response.error;
      } catch {
        /* Keep safe fallback. */
      }
    }
    throw new Error(message);
  }
  return data as unknown;
}
export async function extractPurchase(description: string, image?: string) {
  const raw = await invokeAssistant({ action: "extract", description, image });
  return extractionSchema.parse(
    z.object({ extraction: extractionSchema }).parse(raw).extraction,
  );
}
export async function researchDecision(decision: Decision) {
  const { research } = z
    .object({ research: researchSchema })
    .parse(await invokeAssistant({ action: "research", decision }));
  research.evidence.forEach((e) => publicUrl.parse(e.url));
  return research;
}
export async function imageData(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Use a JPEG, PNG or WebP image.");
  if (file.size > 3_000_000)
    throw new Error("Choose an image smaller than 3 MB.");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("This image could not be read."));
    reader.readAsDataURL(file);
  });
}
