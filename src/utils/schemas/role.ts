import { z } from "zod";

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  modifiedAt: z.string(),
  createdBy: z.object({
    id: z.string(),
    userType: z.string(),
  }),
  permissions: z.array(z.string()),
  members: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
  from: z.string(),
  to: z.string(),
});
