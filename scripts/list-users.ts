
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

// Load .env relative to this script
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Đang kết nối database...\n');

    try {
        await prisma.$connect();
        console.log('✅ Đã kết nối!\n');
    } catch (err) {
        console.error('❌ Lỗi kết nối DB:', err);
        process.exit(1);
    }

    // 1. Lấy danh sách CANDIDATE
    const candidates = await prisma.user.findMany({
        where: { role: 'CANDIDATE' },
        include: { candidateProfile: true },
        orderBy: { createdAt: 'desc' },
    });

    console.log(`👤 ỨNG VIÊN (${candidates.length})`);
    console.log('='.repeat(50));
    if (candidates.length === 0) console.log('  (Chưa có ứng viên nào)');

    candidates.forEach((user, index) => {
        const profile = user.candidateProfile;
        // Format ngày giờ đẹp hơn
        const date = new Date(user.createdAt).toLocaleString('vi-VN');

        console.log(`${index + 1}. [${user.phone || 'SĐT?'}] - ${profile?.fullName || 'Chưa có tên'}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email || 'None'}`);
        console.log(`   Ngày tạo: ${date}`);
        console.log(`   Profile: ${profile ? '✅ Đã tạo' : '❌ Chưa tạo'}`);
        if (profile) {
            console.log(`   - Vị trí mong muốn: ${profile.desiredJob || 'N/A'}`);
            console.log(`   - Khu vực: ${profile.currentLocation || 'N/A'}`);
        }
        console.log('-'.repeat(30));
    });
    console.log('\n');

    // 2. Lấy danh sách EMPLOYER
    const employers = await prisma.user.findMany({
        where: { role: 'EMPLOYER' },
        include: { employerProfile: true },
        orderBy: { createdAt: 'desc' },
    });

    console.log(`🏢 DOANH NGHIỆP (${employers.length})`);
    console.log('='.repeat(50));
    if (employers.length === 0) console.log('  (Chưa có doanh nghiệp nào)');

    employers.forEach((user, index) => {
        const profile = user.employerProfile;
        const date = new Date(user.createdAt).toLocaleString('vi-VN');

        console.log(`${index + 1}. [${profile?.businessName || 'Chưa có tên DN'}]`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email || 'None'}`);
        console.log(`   SĐT Login: ${user.phone || 'None'}`);
        console.log(`   SĐT Liên hệ: ${profile?.phone || 'None'}`);
        console.log(`   Ngày tạo: ${date}`);
        console.log(`   Xác minh: ${user.isVerified ? '✅ Đã xác minh' : '⏳ Chưa xác minh'}`);
        if (profile) {
            console.log(`   - Loại hình: ${profile.businessType || 'N/A'}`);
            console.log(`   - Khu vực: ${profile.location || 'N/A'}`);
            console.log(`   - Địa chỉ: ${profile.address || 'N/A'}`);
        }
        console.log('-'.repeat(30));
    });
    console.log('\n');

    // 3. Lấy danh sách ADMIN
    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'desc' },
    });

    console.log(`🛡️ QUẢN TRỊ VIÊN (${admins.length})`);
    console.log('='.repeat(50));
    admins.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email || user.phone}`);
        console.log(`   ID: ${user.id}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
