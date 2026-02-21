const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Tìm user với SĐT 0907697043
    const user = await prisma.user.findUnique({
        where: { phone: '0907697043' },
        include: { candidateProfile: true }
    });

    if (!user) {
        console.log('❌ Không tìm thấy user với SĐT 0907697043');
        return;
    }

    console.log(`Found user: id=${user.id}, role=${user.role}, phone=${user.phone}`);

    // Xoá profile trước (nếu có FK constraint)
    if (user.candidateProfile) {
        await prisma.candidateProfile.delete({ where: { userId: user.id } });
        console.log('Deleted candidate profile');
    }

    // Xoá notifications
    await prisma.notification.deleteMany({ where: { userId: user.id } });

    // Xoá applications
    await prisma.application.deleteMany({ where: { userId: user.id } });

    // Xoá user
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`✅ Đã xoá user ${user.phone} (${user.role})`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
