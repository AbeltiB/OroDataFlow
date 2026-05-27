import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ email: payload.email, userId: payload.userId });
}
