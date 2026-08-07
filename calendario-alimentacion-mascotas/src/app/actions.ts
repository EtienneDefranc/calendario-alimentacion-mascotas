"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createFamily(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  if (!name) return;

  const family = await prisma.family.create({
    data: {
      name,
      members: {
        create: {
          userId: session.user.id,
          role: "ADMIN",
        }
      }
    }
  });

  revalidatePath("/dashboard");
  return family;
}

export async function addPet(familyId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const species = formData.get("species") as string;
  
  if (!name) return;

  await prisma.pet.create({
    data: {
      name,
      species,
      familyId,
    }
  });

  revalidatePath("/dashboard");
}

export async function feedPet(petId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.feedingRecord.create({
    data: {
      petId,
      userId: session.user.id,
    }
  });

  revalidatePath("/dashboard");
}
