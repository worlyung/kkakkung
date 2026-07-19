import { SignJWT, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
// 로그인·신원 쿠키: 볼 때마다 만료일을 30일 뒤로 다시 민다(슬라이딩).
const SLIDING_COOKIES = ["photo_heaven_viewer", "photo_heaven_admin", "photo_heaven_who"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet, noimageindex");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");

  const rawSecret = process.env.SESSION_SECRET;
  if (rawSecret) {
    const key = new TextEncoder().encode(rawSecret);
    const secure = process.env.NODE_ENV === "production";

    for (const name of SLIDING_COOKIES) {
      const token = request.cookies.get(name)?.value;
      if (!token) {
        continue;
      }
      try {
        const { payload } = await jwtVerify(token, key);
        // iat/exp를 뺀 나머지 내용으로 새 만료일을 붙여 다시 발급
        const rest = { ...payload };
        delete rest.iat;
        delete rest.exp;
        const fresh = await new SignJWT(rest)
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
          .sign(key);
        response.cookies.set(name, fresh, {
          httpOnly: true,
          sameSite: "lax",
          secure,
          path: "/",
          maxAge: SESSION_MAX_AGE_SECONDS,
        });
      } catch {
        // 만료/위조된 쿠키는 그냥 둔다 (앱에서 무시됨)
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
