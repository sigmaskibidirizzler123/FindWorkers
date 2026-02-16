
import { PrismaClient } from '@prisma/client';
import path from 'path';
import dotenv from 'dotenv';

// Load .env relative to this script
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const USERS_TO_DELETE = [
    // --- DOANH NGHIỆP ---
    "cmlmhz1xw0001u8mgka26suxj", // 2. luongnguyennhatminh2005123@gmail.com
    "cmlmht0rp002qu8u43rvs8o3v", // 3. Chuỗi Nhà hàng K-BBQ
    "cmlmht0ri002pu8u4in8enf42", // 4. Cafe Bida Nhật Minh

    // --- ỨNG VIÊN ---
    "cmloxlojd0002u82wzupdj5mr", // 1. 0939559556
    "cmlnspfz30000u81syqkzz13d", // 2. 0987111222
    "cmlnpsjf10005u8lw5pe570mf", // 3. 0907697034
    "cmlnavn4t0003u8jsy2blm3ui", // 4. 0907697041
    "cmln9tu1a0000u8jsxvwvsq65", // 5. 0907697042
    "cmlmht0s0002ru8u4p0i1xrt2", // 7. Nguyễn Minh Tuấn
];

async function main() {
    console.log(`🗑️ Đang xóa ${USERS_TO_DELETE.length} tài khoản thành viên...\n`);

    const result = await prisma.user.deleteMany({
        where: {
            id: {
                in: USERS_TO_DELETE,
            },
        },
    });

    console.log(`✅ Đã xóa thành công ${result.count} tài khoản!`);
    console.log('--------------------------------------------------');
    console.log('Danh sách ID đã xóa:');
    USERS_TO_DELETE.forEach(id => console.log(` - ${id}`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
