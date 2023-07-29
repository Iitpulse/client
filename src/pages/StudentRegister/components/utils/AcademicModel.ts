import { z } from "zod";

export const AcademicSchema = z.object({
  school: z.string().min(3).max(255),
  standard: z.string(),
  medium: z.enum(["hindi", "english"]),
  stream: z.enum(["pcm","pcb","pcmb","arts","commerce"]),
});