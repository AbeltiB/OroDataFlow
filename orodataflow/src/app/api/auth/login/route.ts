import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return Response.json({ error: "Email and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, email: user.email });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
