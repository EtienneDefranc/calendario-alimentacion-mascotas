import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/family/invite — Generate or fetch existing invite code for a family
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { familyId } = await req.json();

  // Check that user is a member of the family
  const membership = await prisma.familyMember.findUnique({
    where: { userId_familyId: { userId: session.user.id, familyId } },
  });

  if (!membership) {
    return NextResponse.json({ message: "No perteneces a esta familia" }, { status: 403 });
  }

  // Check if a valid invite already exists (not expired)
  const existing = await prisma.familyInvite.findFirst({
    where: {
      familyId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (existing) {
    return NextResponse.json({ code: existing.code });
  }

  // Create a new invite
  const invite = await prisma.familyInvite.create({
    data: { familyId },
  });

  return NextResponse.json({ code: invite.code });
}
