import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { getAppEnv } from "./env";

const uploadPayloadSchema = z.object({
  albumId: z.string().uuid(),
  id: z.string().uuid(),
  storageKey: z.string().min(1),
  thumbKey: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
});

export type UploadPayload = z.infer<typeof uploadPayloadSchema>;

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getAppEnv().SESSION_SECRET);
}

export async function createUploadToken(payload: UploadPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("20m")
    .sign(getSecretKey());
}

export async function verifyUploadToken(token: string): Promise<UploadPayload> {
  const result = await jwtVerify(token, getSecretKey());
  return uploadPayloadSchema.parse(result.payload);
}
