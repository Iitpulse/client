import { z } from "zod";

export const InstituteSchema = z.object({
  name: z.string().min(3).max(255),
  email: z.string().email(),
  address: z.string().min(3).max(255),
  pocName: z.string().min(3).max(255),
  pocEmail: z.string().email(),
  pocPhone: z.string().min(10).max(10),
  phone: z.string().min(10).max(10),
  //Fields to be added later
  // Since we are using this schema for both create and update, we need to add this union type so that we can use the same schema for both create and update since we are going to use this schema for  create, update functionality and to validate the data we get from backends
});
/*
{
    _id: { type: String, required: true },
    name: { type: String, required: true },
    members: {
      batches: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          _id: false,
          totalStudents: { type: Number, required: true },
        },
      ],
    },
    createdAt: { type: String, required: true },
    modifiedAt: { type: String, required: true },
    email: { type: String, required: true },
    poc: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: Number, required: true },
    },
    address: { type: String, required: true },
  }
*/
