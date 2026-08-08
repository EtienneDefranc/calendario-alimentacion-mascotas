import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/family/join — Join a family via invite code
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { code } = await req.json();

  if (!code) {
    return NextResponse.json({ message: "Código requerido" }, { status: 400 });
  }

  // Find the invite
  const invite = await prisma.familyInvite.findUnique({
    where: { code },
    include: { family: true },
  });

  if (!invite) {
    return NextResponse.json({ message: "Código de invitación inválido" }, { status: 404 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ message: "El código de invitación ha expirado" }, { status: 410 });
  }

  // Check if user is already a member
  const existingMembership = await prisma.familyMember.findUnique({
    where: {
      userId_familyId: { userId: session.user.id, familyId: invite.familyId },
    },
  });

  if (existingMembership) {
    return NextResponse.json({ message: "Ya eres miembro de esta familia", familyName: invite.family.name }, { status: 200 });
  }

  // Add user to family
  await prisma.familyMember.create({
    data: {
      userId: session.user.id,
      familyId: invite.familyId,
      role: "MEMBER",
    },
  });

  return NextResponse.json({ message: "¡Te uniste exitosamente!", familyName: invite.family.name }, { status: 201 });
}
