import { z } from "zod";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export const userSchema = z.object({
  username: z.string().min(1, "username es requerido"),
  role: z.string().min(1, "role es requerido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(
      passwordRegex,
      "La contraseña debe contener mayúscula, minúscula, número y carácter especial"
    ),
});

export const loginSchema = z.object({
  username: z.string().min(1, "username es requerido"),
  password: z.string().min(1, "password es requerido"),
});

export const editUserSchema = z.object({
  username: z.string().min(1, "username es requerido").optional(),
  role: z.string().min(1, "role es requerido").optional(),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(
      passwordRegex,
      "La contraseña debe contener mayúscula, minúscula, número y carácter especial"
    )
    .optional(),
});
