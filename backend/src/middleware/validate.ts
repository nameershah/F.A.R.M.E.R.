import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

export const queryBodySchema = z
  .object({
    text: z
      .string()
      .max(4000, "text must be at most 4000 characters")
      .optional(),
  })
  .strict();

export function validateQueryRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const bodyResult = queryBodySchema.safeParse({
    text:
      typeof req.body?.text === "string"
        ? req.body.text
        : req.body?.text === undefined || req.body?.text === null
          ? undefined
          : String(req.body.text),
  });

  if (!bodyResult.success) {
    res.status(400).json({
      error: "Invalid request",
      details: bodyResult.error.flatten(),
    });
    return;
  }

  const text = bodyResult.data.text?.trim() ?? "";
  const hasImage = Boolean(req.file);

  if (!text && !hasImage) {
    res.status(400).json({
      error: "Provide at least text or an image.",
    });
    return;
  }

  // ==========================================
  // SECURITY AUDIT: UPLOAD INTEGRITY GATE (INTEGRITY)
  // ==========================================
  // Enforces server-side validation of the uploaded file metadata.
  // Never trusts client-side validation. Accepts only image/jpeg and image/png,
  // capping size strictly at 8MB.
  if (req.file) {
    const fileSchema = z.object({
      mimetype: z.enum([
        "image/jpeg",
        "image/png",
      ]),
      size: z.number().int().positive().max(8 * 1024 * 1024),
      buffer: z.instanceof(Buffer),
      originalname: z.string().max(255),
    });

    const fileResult = fileSchema.safeParse(req.file);
    if (!fileResult.success) {
      res.status(400).json({
        error: "Invalid image upload",
        details: fileResult.error.flatten(),
      });
      return;
    }
  }

  // Normalized text for downstream handlers
  req.body.text = text;
  next();
}
