import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

const messageItem = z.object({ role: z.string().max(20), content: z.string().max(4000) });

export const generateSchema = z.object({
  messages: z.array(messageItem).max(60).optional(),
  selectedTemplate: z.enum(["obsidian","kinetic","aurora","folio","studio","nexus","pulse","manuscript"]).optional(),
  structuredData: z.record(z.string(), z.any()).optional(),
});
export const editSchema = z.object({
  currentData: z.record(z.string(), z.any()),
  userMessage: z.string().min(1).max(2000),
  history: z.array(messageItem).max(60).optional(),
});
export const injectSchema = z.object({ data: z.record(z.string(), z.any()) });
export const publishSchema = z.object({
  data: z.record(z.string(), z.any()),
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/).optional(),
});

export function validate(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Data request tidak valid.", detail: parsed.error.flatten() });
    }
    req.body = parsed.data;
    next();
  };
}
