import { z } from "zod";

export const SourceSchema = z.object({
  name: z.string().min(3).max(255),
});

/* 
{
    _id: String,
    name: String,
    createdAt: String,
    updatedAt: String,
} 
  */
