import { ClubRole, PrismaClient, RecordStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: {
      openId: "dev:user-current"
    },
    update: {},
    create: {
      openId: "dev:user-current",
      nickname: "小陈",
      avatarColor: "#4C7CF0",
      status: RecordStatus.ACTIVE
    }
  });

  await prisma.club.upsert({
    where: {
      id: "seed-club-penguin"
    },
    update: {},
    create: {
      id: "seed-club-penguin",
      name: "企鹅羽球俱乐部",
      creatorId: user.id,
      status: RecordStatus.ACTIVE,
      members: {
        create: {
          userId: user.id,
          role: ClubRole.OWNER
        }
      }
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
