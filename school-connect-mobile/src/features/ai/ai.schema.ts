import { z } from "zod";

export const aiChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Le message est obligatoire")
    .max(2000, "Le message ne doit pas dépasser 2000 caractères"),

  conversationId: z.string().optional(),
});

export type AIChatFormData = z.infer<typeof aiChatSchema>;
