import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const recipients = await prisma.recipient.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(recipients);
}

export async function POST(request: Request) {
  const { name, chatId } = await request.json();
  if (!name || !chatId) return Response.json({ error: "name and chatId required" }, { status: 400 });
  try {
    const rec = await prisma.recipient.create({ data: { name, chatId } });
    return Response.json(rec, { status: 201 });
  } catch {
    return Response.json({ error: "chatId already exists" }, { status: 409 });
  }
}
