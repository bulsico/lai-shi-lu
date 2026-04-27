import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isRunning, readState } from "@/lib/claude-sessions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const job = await prisma.job.findUnique({ where: { id: sessionId } });
  if (!job) return Response.json({ error: "not found" }, { status: 404 });

  // If DB says pending but process is gone, check actual state
  if (job.status === "pending") {
    const state = readState(sessionId);
    const running = isRunning(sessionId);

    if (!running && state?.finishedAt) {
      // Process exited but DB not updated yet — re-check report
      const report = await prisma.report.findUnique({ where: { address: job.address } });
      if (report?.markdown && report.markdown.length > 100) {
        await prisma.job.update({ where: { id: sessionId }, data: { status: "done" } });
        return Response.json({ status: "done", address: job.address });
      }
      // Give it a few more seconds
    }
  }

  if (job.status === "done") {
    return Response.json({ status: "done", address: job.address });
  }

  if (job.status === "error") {
    return Response.json({ status: "error", error: job.error ?? "生成失败，请重试" });
  }

  return Response.json({ status: "generating" });
}
