import { runPipeline } from "@/lib/pipeline/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    const runId = await runPipeline("cron");
    return Response.json({ ok: true, runId });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
