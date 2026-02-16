/**
 * Production Seed — FindWorkers Phú Quốc
 * 
 * Only seeds ESSENTIAL data:
 * 1. Admin account
 * 2. Categories (job categories for Phú Quốc)
 * 3. Skills
 * 4. Feature Flags
 * 5. Job Templates
 * 
 * NO demo employers, candidates, jobs, or notifications.
 * Those will be created by Admin via Concierge workflow.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Production Seed — FindWorkers Phú Quốc');
    console.log('='.repeat(50));

    // ============================================================
    // 1. ADMIN ACCOUNT
    // ============================================================
    console.log('\n🛡️ Creating admin account...');
    const hashedPassword = await bcrypt.hash('Minh2024!@#', 12); // Strong admin password

    await prisma.user.upsert({
        where: { email: 'admin@findworkers.vn' },
        update: {
            password: hashedPassword,
            isVerified: true,
        },
        create: {
            email: 'admin@findworkers.vn',
            phone: '0907697043',
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true,
            isVerified: true,
        },
    });
    console.log('   ✅ admin@findworkers.vn created');

    // ============================================================
    // 2. CATEGORIES (tree structure — Phú Quốc market)
    // ============================================================
    console.log('\n📂 Creating categories...');
    const categories = [
        {
            name: 'Nhà hàng - Khách sạn',
            slug: 'nha-hang-khach-san',
            icon: '🍽️',
            children: [
                { name: 'Phụ bếp', slug: 'phu-bep' },
                { name: 'Đầu bếp', slug: 'dau-bep' },
                { name: 'Phục vụ', slug: 'phuc-vu' },
                { name: 'Pha chế / Bartender', slug: 'pha-che' },
                { name: 'Thu ngân', slug: 'thu-ngan-fb' },
                { name: 'Quản lý nhà hàng', slug: 'quan-ly-nha-hang' },
                { name: 'Lễ tân khách sạn', slug: 'le-tan-khach-san' },
                { name: 'Buồng phòng', slug: 'buong-phong' },
                { name: 'Tạp vụ', slug: 'tap-vu-ks' },
                { name: 'Bảo vệ khách sạn', slug: 'bao-ve-ks' },
            ],
        },
        {
            name: 'Bán lẻ - Siêu thị',
            slug: 'ban-le-sieu-thi',
            icon: '🛒',
            children: [
                { name: 'Nhân viên bán hàng', slug: 'nv-ban-hang' },
                { name: 'Thu ngân', slug: 'thu-ngan' },
                { name: 'Kho - Vận chuyển', slug: 'kho-van-chuyen' },
                { name: 'Trưng bày', slug: 'trung-bay' },
            ],
        },
        {
            name: 'Xây dựng - Công trình',
            slug: 'xay-dung',
            icon: '🏗️',
            children: [
                { name: 'Thợ xây', slug: 'tho-xay' },
                { name: 'Thợ sơn', slug: 'tho-son' },
                { name: 'Thợ điện', slug: 'tho-dien' },
                { name: 'Thợ nước', slug: 'tho-nuoc' },
                { name: 'Công nhân', slug: 'cong-nhan' },
            ],
        },
        {
            name: 'Giúp việc - Dọn dẹp',
            slug: 'giup-viec',
            icon: '🧹',
            children: [
                { name: 'Giúp việc nhà', slug: 'giup-viec-nha' },
                { name: 'Dọn dẹp văn phòng', slug: 'don-dep-vp' },
                { name: 'Giặt là', slug: 'giat-la' },
            ],
        },
        {
            name: 'Vận tải - Giao hàng',
            slug: 'van-tai-giao-hang',
            icon: '🚚',
            children: [
                { name: 'Tài xế', slug: 'tai-xe' },
                { name: 'Giao hàng', slug: 'giao-hang' },
                { name: 'Shipper', slug: 'shipper' },
            ],
        },
        {
            name: 'Spa - Làm đẹp',
            slug: 'spa-lam-dep',
            icon: '💆',
            children: [
                { name: 'Masseur / Masseuse', slug: 'masseur' },
                { name: 'Nail / Mi', slug: 'nail-mi' },
                { name: 'Tóc / Stylist', slug: 'toc-stylist' },
            ],
        },
        {
            name: 'Du lịch - Lữ hành',
            slug: 'du-lich-lu-hanh',
            icon: '✈️',
            children: [
                { name: 'Hướng dẫn viên', slug: 'huong-dan-vien' },
                { name: 'Điều hành tour', slug: 'dieu-hanh-tour' },
                { name: 'Lái cano / Thuyền', slug: 'lai-cano' },
            ],
        },
        {
            name: 'Văn phòng',
            slug: 'van-phong',
            icon: '💼',
            children: [
                { name: 'Nhân viên hành chính', slug: 'hanh-chinh' },
                { name: 'Kế toán', slug: 'ke-toan' },
                { name: 'Nhân sự', slug: 'nhan-su' },
                { name: 'Marketing', slug: 'marketing' },
            ],
        },
    ];

    const categoryMap: Record<string, string> = {};

    for (const cat of categories) {
        const parent = await prisma.category.upsert({
            where: { slug: cat.slug },
            update: { name: cat.name, icon: cat.icon },
            create: { name: cat.name, slug: cat.slug, icon: cat.icon },
        });
        categoryMap[cat.slug] = parent.id;

        if (cat.children) {
            for (const child of cat.children) {
                const created = await prisma.category.upsert({
                    where: { slug: child.slug },
                    update: { name: child.name, parentId: parent.id },
                    create: { name: child.name, slug: child.slug, parentId: parent.id },
                });
                categoryMap[child.slug] = created.id;
            }
        }
    }
    console.log(`   ✅ ${Object.keys(categoryMap).length} categories created`);

    // ============================================================
    // 3. SKILLS
    // ============================================================
    console.log('\n🎯 Creating skills...');
    const skillNames = [
        'Nấu ăn', 'Phục vụ bàn', 'Pha chế', 'Giao tiếp', 'Tiếng Anh',
        'Tiếng Trung', 'Tiếng Nhật', 'Tiếng Hàn', 'Lái xe', 'Sửa chữa',
        'Tin học VP', 'Photoshop', 'Excel', 'Bán hàng', 'Quản lý',
        'Kế toán', 'Massage', 'Hướng dẫn du lịch', 'Lặn biển',
    ];

    for (const name of skillNames) {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        await prisma.skill.upsert({
            where: { slug },
            update: { name },
            create: { name, slug },
        });
    }
    console.log(`   ✅ ${skillNames.length} skills created`);

    // ============================================================
    // 4. FEATURE FLAGS
    // ============================================================
    console.log('\n🚩 Creating feature flags...');
    const featureFlags = [
        { key: 'matching_score', name: 'Matching Score', description: 'Tính điểm phù hợp ứng viên - job', isEnabled: false },
        { key: 'auto_screening', name: 'Auto Screening', description: 'Câu hỏi sàng lọc tự động cho ứng viên', isEnabled: false },
        { key: 'auto_close_jobs', name: 'Auto Close Jobs', description: 'Tự động đóng tin khi đủ người', isEnabled: true },
        { key: 'notifications', name: 'Notifications', description: 'Hệ thống thông báo cho user', isEnabled: true },
        { key: 'ai_recommendations', name: 'AI Recommendations', description: 'Gợi ý việc/ứng viên bằng AI', isEnabled: false },
        { key: 'multi_branch', name: 'Multi Branch', description: 'Hỗ trợ nhiều chi nhánh cho doanh nghiệp', isEnabled: false },
        { key: 'kpi_dashboard', name: 'KPI Dashboard', description: 'Dashboard hiệu quả tuyển dụng', isEnabled: false },
        { key: 'candidate_preferred_categories', name: 'Preferred Categories', description: 'Ứng viên chọn ngành mong muốn', isEnabled: true },
    ];

    for (const flag of featureFlags) {
        await prisma.featureFlag.upsert({
            where: { key: flag.key },
            update: { name: flag.name, description: flag.description, isEnabled: flag.isEnabled },
            create: flag,
        });
    }
    console.log(`   ✅ ${featureFlags.length} feature flags created`);

    // ============================================================
    // 5. JOB TEMPLATES (Phú Quốc F&B focus)
    // ============================================================
    console.log('\n📋 Creating job templates...');
    const jobTemplates = [
        {
            categoryId: categoryMap['phu-bep'] || null,
            category: 'FNB',
            title: 'Phụ bếp',
            description: 'Hỗ trợ bếp chính trong việc sơ chế nguyên liệu, chuẩn bị gia vị, vệ sinh khu vực bếp.',
            requirements: '- Siêng năng, chăm chỉ, sạch sẽ\n- Có thể làm theo ca\n- Không cần kinh nghiệm, sẽ được đào tạo\n- Sức khỏe tốt',
            benefits: '- Bao ăn, bao ở (nếu cần)\n- Tip chia đều theo ca\n- Được đào tạo nghề bếp miễn phí\n- BHXH đầy đủ sau thử việc',
            defaultSalaryMin: 5000000,
            defaultSalaryMax: 7000000,
            suggestedShifts: JSON.stringify(['MORNING', 'AFTERNOON']),
            sortOrder: 1,
        },
        {
            categoryId: categoryMap['phuc-vu'] || null,
            category: 'FNB',
            title: 'Phục vụ bàn',
            description: 'Đón tiếp khách, ghi order, phục vụ món ăn và đồ uống. Dọn dẹp bàn, set up cho lượt khách tiếp.',
            requirements: '- Nhanh nhẹn, giao tiếp tốt\n- Ngoại hình ưa nhìn\n- Có thể làm ca tối và cuối tuần\n- Ưu tiên biết tiếng Anh',
            benefits: '- Tip cao từ khách hàng\n- Bao ăn ca, phụ cấp xăng xe\n- Training kỹ năng phục vụ chuyên nghiệp\n- Lương tháng 13',
            defaultSalaryMin: 5000000,
            defaultSalaryMax: 8000000,
            suggestedShifts: JSON.stringify(['MORNING', 'AFTERNOON', 'NIGHT']),
            sortOrder: 2,
        },
        {
            categoryId: categoryMap['tap-vu-ks'] || null,
            category: 'FNB',
            title: 'Tạp vụ',
            description: 'Dọn dẹp, vệ sinh khu vực nhà hàng/khách sạn. Lau sàn, rửa bát đĩa, sắp xếp khu vực lưu trữ.',
            requirements: '- Chăm chỉ, cẩn thận\n- Sức khỏe tốt\n- Không yêu cầu kinh nghiệm',
            benefits: '- Bao ăn, bao ở\n- Lương ổn định, trả đúng hạn\n- BHXH đầy đủ',
            defaultSalaryMin: 4500000,
            defaultSalaryMax: 6000000,
            suggestedShifts: JSON.stringify(['MORNING']),
            sortOrder: 3,
        },
        {
            categoryId: categoryMap['le-tan-khach-san'] || null,
            category: 'FNB',
            title: 'Lễ tân',
            description: 'Đón tiếp khách, check-in/check-out, quản lý đặt phòng. Điều phối với các bộ phận liên quan.',
            requirements: '- Giao tiếp tốt, tác phong chuyên nghiệp\n- Tiếng Anh giao tiếp cơ bản trở lên\n- Biết sử dụng máy tính',
            benefits: '- Lương + phụ cấp tiếng Anh\n- Đào tạo kỹ năng chuyên nghiệp\n- BHXH, BHYT đầy đủ\n- Cơ hội thăng tiến nhanh',
            defaultSalaryMin: 7000000,
            defaultSalaryMax: 10000000,
            suggestedShifts: JSON.stringify(['MORNING', 'AFTERNOON', 'NIGHT']),
            sortOrder: 4,
        },
        {
            categoryId: categoryMap['bao-ve-ks'] || null,
            category: 'FNB',
            title: 'Bảo vệ',
            description: 'Tuần tra, giám sát an ninh. Kiểm soát ra vào, hướng dẫn đỗ xe. Xử lý các tình huống phát sinh.',
            requirements: '- Nam, sức khỏe tốt\n- Có tinh thần trách nhiệm cao\n- Có thể làm ca đêm',
            benefits: '- Phụ cấp ca đêm\n- Bao ăn, bao ở\n- BHXH đầy đủ\n- Tăng lương định kỳ',
            defaultSalaryMin: 6000000,
            defaultSalaryMax: 9000000,
            suggestedShifts: JSON.stringify(['MORNING', 'NIGHT']),
            sortOrder: 5,
        },
    ];

    for (const template of jobTemplates) {
        await prisma.jobTemplate.create({ data: template });
    }
    console.log(`   ✅ ${jobTemplates.length} job templates created`);

    // ============================================================
    // DONE
    // ============================================================
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Production seed completed!');
    console.log('');
    console.log('🔑 Admin Login:');
    console.log('   Email:    admin@findworkers.vn');
    console.log('   Password: Minh2024!@#');
    console.log('');
    console.log('📌 Next steps:');
    console.log('   1. Deploy to Vercel');
    console.log('   2. Set DATABASE_URL to cloud PostgreSQL');
    console.log('   3. Run: npx prisma migrate deploy');
    console.log('   4. Run: npx prisma db seed');
    console.log('   5. Login as admin & start creating employers!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
