import { NextResponse, type NextRequest } from "next/server";
import { clearAlbumSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  await clearAlbumSession("admin");
  return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
}
