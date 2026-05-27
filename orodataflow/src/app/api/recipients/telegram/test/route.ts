import { sendTelegramMessage } from "@/lib/pipeline/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { chatId } = await request.json();
  if (!chatId) return Response.json({ error: "chatId required" }, { status: 400 });
  try {
    await sendTelegramMessage(chatId, "DataFlow test message — configuration is working correctly.");
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
