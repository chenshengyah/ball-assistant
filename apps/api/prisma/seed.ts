import { ClubCategory, ClubRole, PrismaClient, RecordStatus } from "@prisma/client";

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
      category: ClubCategory.BADMINTON,
      coverUrl: "",
      logoUrl: "",
      description: "工作日晚场和周末固定组局。",
      province: "上海市",
      city: "上海市",
      district: "浦东新区",
      address: "金桥路 588 号 B1",
      latitude: 31.2572,
      longitude: 121.6073,
      wechatId: "penguin-club",
      contactName: "阿鹏",
      contactPhone: "13912345678",
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
