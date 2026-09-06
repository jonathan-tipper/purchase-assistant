import { handleAssistant, type Env } from "../_shared/assistant.ts";
Deno.serve((req: Request) => handleAssistant(req, Deno.env.toObject() as Env));
