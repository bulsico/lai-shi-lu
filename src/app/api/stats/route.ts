import { prisma } from "@/lib/db";

export const revalidate = 60;

export async function GET() {
  const [total, recent] = await Promise.all([
    prisma.report.count(),
    prisma.report.findMany({
      select: { address: true, grade: true, archetypeLabel: true, netPnl: true, winRate: true },
      orderBy: { generatedAt: "desc" },
      take: 8,
    }),
  ]);

  return Response.json({ total, recent });
}
