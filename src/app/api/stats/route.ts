import { prisma } from "@/lib/db";

export const revalidate = 60;

export async function GET() {
  const [total, archetypes] = await Promise.all([
    prisma.report.count(),
    prisma.report.groupBy({
      by: ["archetypeLabel"],
      _count: { archetypeLabel: true },
      orderBy: { _count: { archetypeLabel: "desc" } },
      take: 6,
    }),
  ]);

  return Response.json({
    total,
    archetypes: archetypes.map((a) => ({
      label: a.archetypeLabel,
      count: a._count.archetypeLabel,
    })),
  });
}
