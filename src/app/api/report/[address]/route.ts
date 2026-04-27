import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  const report = await prisma.report.findUnique({
    where: { address: address.toLowerCase() },
  });

  if (!report || !report.markdown) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({
    address: report.address,
    markdown: report.markdown,
    archetype: report.archetype,
    archetypeLabel: report.archetypeLabel,
    grade: report.grade,
    netPnl: report.netPnl,
    winRate: report.winRate,
    totalFills: report.totalFills,
    uniqueAssets: report.uniqueAssets,
    generatedAt: report.generatedAt.toISOString(),
    costUsd: report.costUsd ?? null,
    inputTokens: report.inputTokens ?? null,
    outputTokens: report.outputTokens ?? null,
  });
}
