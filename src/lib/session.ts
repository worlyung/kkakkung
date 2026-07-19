import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { getAppEnv } from "./env";

export const VIEWER_COOKIE = "photo_heaven_viewer";
export const ADMIN_COOKIE = "photo_heaven_admin";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type SessionRole = "viewer" | "admin";

type AlbumSession = {
  albumId: string;
  role: SessionRole;
};

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getAppEnv().SESSION_SECRET);
}

function getCookieName(role: SessionRole): string {
  return role === "admin" ? ADMIN_COOKIE : VIEWER_COOKIE;
}

export async function createAlbumSession(albumId: string, role: SessionRole): Promise<string> {
  return new SignJWT({ albumId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function setAlbumSession(albumId: string, role: SessionRole): Promise<void> {
  const token = await createAlbumSession(albumId, role);
  const cookieStore = await cookies();

  cookieStore.set(getCookieName(role), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAlbumSession(role: SessionRole): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getCookieName(role));
}

export async function readAlbumSession(role: SessionRole): Promise<AlbumSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName(role))?.value;

  if (!token) {
    return null;
  }

  try {
    const result = await jwtVerify(token, getSecretKey());
    const payload = result.payload;

    if (payload.role !== role || typeof payload.albumId !== "string") {
      return null;
    }

    return {
      albumId: payload.albumId,
      role,
    };
  } catch {
    return null;
  }
}

export async function hasAlbumSession(albumId: string, role: SessionRole): Promise<boolean> {
  const session = await readAlbumSession(role);
  return session?.albumId === albumId;
}

// "누구세요?" — 로그인이 아니라, 이 폰이 어느 가족 이름을 골랐는지만 기억한다.
export const WHO_COOKIE = "photo_heaven_who";

export async function setViewerIdentity(albumId: string, viewerId: string): Promise<void> {
  const token = await new SignJWT({ albumId, viewerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
  const cookieStore = await cookies();

  cookieStore.set(WHO_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function readViewerIdentity(albumId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(WHO_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.albumId !== albumId || typeof payload.viewerId !== "string") {
      return null;
    }
    return payload.viewerId;
  } catch {
    return null;
  }
}
