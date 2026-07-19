import { z } from "zod";

const appEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
});

export type AppEnv = z.infer<typeof appEnvSchema>;

let cachedEnv: AppEnv | null = null;

export function getAppEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = appEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`환경변수가 부족합니다: ${missing}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getInitialSetupKey(): string | null {
  const value = process.env.INITIAL_SETUP_KEY?.trim();
  return value && value.length > 0 ? value : null;
}
