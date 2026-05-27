import { testConnection } from "@/lib/pipeline/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const result = await testConnection();
  return Response.json(result);
}
