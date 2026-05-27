import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const recipients = await prisma.emailRecipient.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(recipients);
}

export async function POST(request: Request) {
  const { name, email } = await request.json();
  if (!name || !email) return Response.json({ error: "name and email required" }, { status: 400 });
  try {
    const rec = await prisma.emailRecipient.create({ data: { name, email } });
    return Response.json(rec, { status: 201 });
  } catch {
    return Response.json({ error: "email already exists" }, { status: 409 });
  }
}
