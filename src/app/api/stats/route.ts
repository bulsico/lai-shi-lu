import { prisma } from "@/lib/db";

export const revalidate = 60;

export async function GET() {
  const total = await prisma.report.count();
  return Response.json({ total });
}
