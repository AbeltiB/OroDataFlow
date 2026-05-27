import { sendTestEmail } from "@/lib/pipeline/emailer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) return Response.json({ error: "email required" }, { status: 400 });
  try {
    await sendTestEmail(email);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
