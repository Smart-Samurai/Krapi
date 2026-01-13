import { z } from "zod";

export const adminUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["master_admin", "admin", "developer"]),
  access_level: z.enum(["full", "read_write", "read_only"]),
  permissions: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});
