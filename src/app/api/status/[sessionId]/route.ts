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

    if (!running) {
      // Check if the report landed anyway (race between close handler and this poll)
      const report = await prisma.report.findUnique({ where: { address: job.address } });
      if (report?.markdown && report.markdown.length > 100) {
        await prisma.job.update({ where: { id: sessionId }, data: { status: "done" } });
        return Response.json({ status: "done", address: job.address });
      }

      // Process is dead and no report — if the job is old enough it's not just warming up
      const age = Date.now() - job.createdAt.getTime();
      if (age > 30_000) {
        const errMsg = state?.finishedAt ? "生成失败，请返回重试" : "进程意外退出，请返回重新生成";
        await prisma.job.update({ where: { id: sessionId }, data: { status: "error", error: errMsg } });
        return Response.json({ status: "error", error: errMsg });
      }
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
