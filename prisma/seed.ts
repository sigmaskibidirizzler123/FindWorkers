import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ============================================================
    // CATEGORIES (tree structure)
    // ============================================================
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
            name: 'Sản xuất - Nhà máy',
            slug: 'san-xuat',
            icon: '🏭',
            children: [
                { name: 'Công nhân sản xuất', slug: 'cn-san-xuat' },
                { name: 'QC - Kiểm tra', slug: 'qc-kiem-tra' },
                { name: 'Kỹ thuật máy', slug: 'ky-thuat-may' },
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
        {
            name: 'IT - Công nghệ',
            slug: 'it-cong-nghe',
            icon: '💻',
            children: [
                { name: 'Lập trình viên', slug: 'lap-trinh-vien' },
                { name: 'Thiết kế', slug: 'thiet-ke' },
                { name: 'Tester', slug: 'tester' },
                { name: 'DevOps', slug: 'devops' },
            ],
        },
    ];

    console.log('📂 Creating categories...');
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
                    create: {
                        name: child.name,
                        slug: child.slug,
                        parentId: parent.id,
                    },
                });
                categoryMap[child.slug] = created.id;
            }
        }
    }

    // ============================================================
    // SKILLS
    // ============================================================
    console.log('🎯 Creating skills...');
    const skillNames = [
        'Nấu ăn', 'Phục vụ bàn', 'Pha chế', 'Giao tiếp', 'Tiếng Anh',
        'Tiếng Trung', 'Tiếng Nhật', 'Tiếng Hàn', 'Lái xe', 'Sửa chữa',
        'Tin học VP', 'Photoshop', 'Excel', 'Bán hàng', 'Quản lý',
        'Kế toán',
    ];

    for (const name of skillNames) {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        await prisma.skill.upsert({
            where: { slug },
            update: { name },
            create: { name, slug },
        });
    }

    // ============================================================
    // USERS
    // ============================================================
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('123456', 12);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@findworkers.vn' },
        update: {},
        create: {
            email: 'admin@findworkers.vn',
            password: hashedPassword,
            role: 'ADMIN',
            phone: '0900000001',
        },
    });

    const employer1User = await prisma.user.upsert({
        where: { email: 'employer@demo.com' },
        update: {},
        create: {
            email: 'employer@demo.com',
            password: hashedPassword,
            role: 'EMPLOYER',
            phone: '0900000002',
        },
    });

    const employer2User = await prisma.user.upsert({
        where: { email: 'employer2@demo.com' },
        update: {},
        create: {
            email: 'employer2@demo.com',
            password: hashedPassword,
            role: 'EMPLOYER',
            phone: '0900000003',
        },
    });

    const candidateUser = await prisma.user.upsert({
        where: { email: 'candidate@demo.com' },
        update: {},
        create: {
            email: 'candidate@demo.com',
            password: hashedPassword,
            role: 'CANDIDATE',
            phone: '0900000004',
        },
    });

    // ============================================================
    // EMPLOYER PROFILES
    // ============================================================
    console.log('🏢 Creating employer profiles...');

    const employer1 = await prisma.employerProfile.upsert({
        where: { userId: employer1User.id },
        update: {},
        create: {
            userId: employer1User.id,
            companyName: 'Khách sạn Biển Đông',
            companySize: '50-100',
            industry: 'Hospitality',
            website: 'https://biendong-hotel.vn',
            description: 'Khách sạn 4 sao tại trung tâm TP.HCM với 120 phòng, nhà hàng, bar và spa. Luôn tìm kiếm nhân viên nhiệt huyết.',
            address: '123 Nguyễn Huệ, Q1',
            city: 'TP.HCM',
            isVerified: true,
        },
    });

    const employer2 = await prisma.employerProfile.upsert({
        where: { userId: employer2User.id },
        update: {},
        create: {
            userId: employer2User.id,
            companyName: 'Chuỗi Nhà hàng K-BBQ',
            companySize: '100-500',
            industry: 'F&B',
            website: 'https://kbbq.vn',
            description: 'Chuỗi nhà hàng BBQ Hàn Quốc với 15 chi nhánh trên toàn quốc. Môi trường làm việc năng động.',
            address: '88 Trần Hưng Đạo, Q5',
            city: 'TP.HCM',
            isVerified: true,
        },
    });

    // ============================================================
    // COMPANY BRANCHES
    // ============================================================
    console.log('🏬 Creating company branches...');

    await prisma.companyBranch.createMany({
        data: [
            { employerId: employer1.id, name: 'Chi nhánh Quận 1', address: '123 Nguyễn Huệ', city: 'TP.HCM', district: 'Quận 1', phone: '028.1234.5678', managerName: 'Nguyễn Văn A' },
            { employerId: employer1.id, name: 'Chi nhánh Quận 7', address: '456 Nguyễn Thị Thập', city: 'TP.HCM', district: 'Quận 7', phone: '028.8765.4321', managerName: 'Trần Thị B' },
            { employerId: employer2.id, name: 'K-BBQ Quận 1', address: '22 Lê Lợi', city: 'TP.HCM', district: 'Quận 1', phone: '028.1111.2222' },
            { employerId: employer2.id, name: 'K-BBQ Quận 3', address: '55 Pasteur', city: 'TP.HCM', district: 'Quận 3', phone: '028.3333.4444' },
            { employerId: employer2.id, name: 'K-BBQ Thảo Điền', address: '10 Đ. Thảo Điền', city: 'TP.HCM', district: 'Quận 2', phone: '028.5555.6666', managerName: 'Lê Văn C' },
        ],
    });

    // ============================================================
    // CANDIDATE PROFILE
    // ============================================================
    console.log('🧑 Creating candidate profile...');

    const candidateProfile = await prisma.candidateProfile.upsert({
        where: { userId: candidateUser.id },
        update: {},
        create: {
            userId: candidateUser.id,
            fullName: 'Nguyễn Minh Tuấn',
            phone: '0912345678',
            location: 'Quận 1',
            city: 'TP.HCM',
            bio: 'Có 2 năm kinh nghiệm phục vụ nhà hàng, chăm chỉ, nhiệt tình.',
            experienceYears: 2,
            expectedSalary: 10000000,
            availableShift: 'FLEXIBLE',
        },
    });

    // Link candidate preferred categories
    const preferredSlugs = ['nha-hang-khach-san', 'ban-le-sieu-thi'];
    for (const slug of preferredSlugs) {
        if (categoryMap[slug]) {
            await prisma.candidatePreferredCategory.upsert({
                where: {
                    candidateId_categoryId: {
                        candidateId: candidateProfile.id,
                        categoryId: categoryMap[slug],
                    },
                },
                update: {},
                create: {
                    candidateId: candidateProfile.id,
                    categoryId: categoryMap[slug],
                },
            });
        }
    }

    // ============================================================
    // JOBS
    // ============================================================
    console.log('📝 Creating jobs...');

    const jobsData = [
        {
            employerId: employer1.id,
            title: 'Phục vụ nhà hàng',
            description: 'Tìm nhân viên phục vụ cho nhà hàng hải sản 4 sao. Phục vụ khách bàn, dọn dẹp, set up bàn ăn.',
            requirements: 'Ngoại hình ưa nhìn, giao tiếp tốt, chịu được áp lực công việc.',
            benefits: 'Bao ăn, tip khách, BHXH, thưởng KPI, môi trường chuyên nghiệp.',
            salaryMin: 8000000,
            salaryMax: 12000000,
            location: '123 Nguyễn Huệ, Quận 1',
            district: 'Quận 1',
            city: 'TP.HCM',
            jobType: 'FULLTIME' as const,
            shift: 'FLEXIBLE' as const,
            experienceRequired: 0,
            positions: 3,
            isUrgent: true,
            isFeatured: true,
            categoryId: categoryMap['phuc-vu'],
        },
        {
            employerId: employer1.id,
            title: 'Phụ bếp – Bếp Á',
            description: 'Hỗ trợ đầu bếp sơ chế nguyên liệu, chuẩn bị gia vị, vệ sinh khu bếp.',
            requirements: 'Không cần kinh nghiệm. Chăm chỉ, sạch sẽ.',
            benefits: 'Học nghề từ đầu bếp chuyên nghiệp. Bao ăn ở, lương tháng 13.',
            salaryMin: 7000000,
            salaryMax: 10000000,
            location: '123 Nguyễn Huệ, Quận 1',
            district: 'Quận 1',
            city: 'TP.HCM',
            jobType: 'FULLTIME' as const,
            shift: 'MORNING' as const,
            experienceRequired: 0,
            positions: 2,
            isUrgent: true,
            categoryId: categoryMap['phu-bep'],
        },
        {
            employerId: employer1.id,
            title: 'Lễ tân khách sạn',
            description: 'Đón tiếp khách, check-in/check-out, xử lý yêu cầu khách hàng, quản lý đặt phòng.',
            requirements: 'Tiếng Anh giao tiếp tốt. Ngoại hình ưa nhìn, chuyên nghiệp.',
            benefits: 'Lương + phụ cấp tiếng Anh, training chuyên nghiệp, cơ hội thăng tiến.',
            salaryMin: 10000000,
            salaryMax: 15000000,
            location: '123 Nguyễn Huệ, Quận 1',
            district: 'Quận 1',
            city: 'TP.HCM',
            jobType: 'FULLTIME' as const,
            shift: 'FLEXIBLE' as const,
            experienceRequired: 1,
            positions: 1,
            categoryId: categoryMap['le-tan-khach-san'],
            isFeatured: true,
        },
        {
            employerId: employer1.id,
            title: 'Nhân viên buồng phòng',
            description: 'Dọn dẹp, vệ sinh phòng khách, thay ga giường, bổ sung amenities.',
            requirements: 'Chăm chỉ, cẩn thận, có sức khỏe tốt.',
            benefits: 'Bao ăn, phụ cấp chuyên cần, BHXH đầy đủ.',
            salaryMin: 7000000,
            salaryMax: 9000000,
            location: '123 Nguyễn Huệ, Quận 1',
            district: 'Quận 1',
            city: 'TP.HCM',
            jobType: 'FULLTIME' as const,
            shift: 'MORNING' as const,
            experienceRequired: 0,
            positions: 4,
            isUrgent: false,
            categoryId: categoryMap['buong-phong'],
        },
        {
            employerId: employer2.id,
            title: 'Đầu bếp Hàn Quốc',
            description: 'Chế biến các món BBQ Hàn Quốc, quản lý bếp, đào tạo phụ bếp.',
            requirements: 'Ít nhất 2 năm kinh nghiệm nấu ăn Hàn Quốc. Có chứng chỉ ưu tiên.',
            benefits: 'Lương cao, bao ăn ở, tip khách, thưởng tháng.',
            salaryMin: 15000000,
            salaryMax: 25000000,
            location: '22 Đ. Thảo Điền, Q2',
            district: 'Quận 2',
            city: 'TP.HCM',
            jobType: 'FULLTIME' as const,
            experienceRequired: 2,
            positions: 1,
            isUrgent: true,
            isFeatured: true,
            categoryId: categoryMap['dau-bep'],
        },
        {
            employerId: employer2.id,
            title: 'Nhân viên pha chế',
            description: 'Pha chế cocktail, mocktail, đồ uống theo menu. Tư vấn khách hàng.',
            requirements: '1 năm kinh nghiệm pha chế.',
            benefits: 'Tip cao, phụ cấp ca tối, training từ Bartender chính.',
            salaryMin: 12000000,
            salaryMax: 18000000,
            location: '22 Đ. Thảo Điền, Q2',
            district: 'Quận 2',
            city: 'TP.HCM',
            jobType: 'FULLTIME' as const,
            shift: 'EVENING' as const,
            experienceRequired: 1,
            positions: 2,
            isUrgent: true,
            categoryId: categoryMap['pha-che'],
        },
        {
            employerId: employer2.id,
            title: 'Nhân viên bán hàng – Cửa hàng TGDĐ',
            description: 'Tư vấn, giới thiệu sản phẩm điện tử cho khách hàng. Đạt doanh số.',
            requirements: 'Giao tiếp tốt, đam mê công nghệ.',
            benefits: 'Thưởng doanh số hấp dẫn, BHXH, du lịch hàng năm.',
            salaryMin: 9000000,
            salaryMax: 14000000,
            location: '456 Nguyễn Thị Thập, Q7',
            district: 'Quận 7',
            city: 'TP.HCM',
            jobType: 'FULLTIME' as const,
            experienceRequired: 0,
            positions: 3,
            categoryId: categoryMap['nv-ban-hang'],
        },
        {
            employerId: employer1.id,
            title: 'Bảo vệ ca đêm',
            description: 'Tuần tra, giám sát an ninh khách sạn ban đêm. Xử lý sự cố.',
            requirements: 'Nam, sức khỏe tốt, có kinh nghiệm bảo vệ ưu tiên.',
            benefits: 'Phụ cấp ca đêm, bao ăn, BHXH.',
            salaryMin: 8000000,
            salaryMax: 11000000,
            location: '123 Nguyễn Huệ, Quận 1',
            district: 'Quận 1',
            city: 'TP.HCM',
            jobType: 'FULLTIME' as const,
            shift: 'NIGHT' as const,
            experienceRequired: 0,
            positions: 2,
            isUrgent: true,
            genderRequirement: 'Nam',
            categoryId: categoryMap['bao-ve-ks'],
        },
    ];

    for (const jobData of jobsData) {
        await prisma.job.create({ data: jobData });
    }

    // ============================================================
    // FEATURE FLAGS
    // ============================================================
    console.log('🚩 Creating feature flags...');

    const featureFlags = [
        { key: 'matching_score', name: 'Matching Score', description: 'Tính điểm phù hợp ứng viên - job', isEnabled: true },
        { key: 'auto_screening', name: 'Auto Screening', description: 'Câu hỏi sàng lọc tự động cho ứng viên', isEnabled: false },
        { key: 'auto_close_jobs', name: 'Auto Close Jobs', description: 'Tự động đóng tin khi đủ người', isEnabled: true },
        { key: 'notifications', name: 'Notifications', description: 'Hệ thống thông báo cho user', isEnabled: true },
        { key: 'ai_recommendations', name: 'AI Recommendations', description: 'Gợi ý việc/ứng viên bằng AI', isEnabled: false },
        { key: 'multi_branch', name: 'Multi Branch', description: 'Hỗ trợ nhiều chi nhánh cho doanh nghiệp', isEnabled: true },
        { key: 'kpi_dashboard', name: 'KPI Dashboard', description: 'Dashboard hiệu quả tuyển dụng', isEnabled: true },
        { key: 'candidate_preferred_categories', name: 'Preferred Categories', description: 'Ứng viên chọn ngành mong muốn', isEnabled: true },
    ];

    for (const flag of featureFlags) {
        await prisma.featureFlag.upsert({
            where: { key: flag.key },
            update: { name: flag.name, description: flag.description, isEnabled: flag.isEnabled },
            create: flag,
        });
    }

    // ============================================================
    // JOB TEMPLATES (FNB Category)
    // ============================================================
    console.log('📋 Creating job templates...');

    const jobTemplates = [
        {
            categoryId: categoryMap['phu-bep'] || null,
            category: 'FNB',
            title: 'Phụ bếp',
            description: 'Hỗ trợ bếp chính trong việc sơ chế nguyên liệu, chuẩn bị gia vị, vệ sinh khu vực bếp. Phụ trách cắt rau củ, ướp thịt, chuẩn bị dụng cụ nấu nướng. Đảm bảo vệ sinh an toàn thực phẩm theo tiêu chuẩn nhà hàng.',
            requirements: '- Siêng năng, chăm chỉ, sạch sẽ\n- Có thể làm theo ca (sáng/chiều/tối)\n- Không cần kinh nghiệm, sẽ được đào tạo\n- Sức khỏe tốt, chịu được áp lực công việc\n- Ưu tiên có kinh nghiệm sơ chế',
            benefits: '- Bao ăn, bao ở (nếu cần)\n- Tip chia đều theo ca\n- Được đào tạo nghề bếp miễn phí\n- Lương tháng 13, thưởng Lễ Tết\n- BHXH đầy đủ sau thử việc\n- Cơ hội thăng tiến lên Bếp chính',
            defaultSalaryMin: 5000000,
            defaultSalaryMax: 7000000,
            suggestedShifts: JSON.stringify(['MORNING', 'AFTERNOON']),
            sortOrder: 1,
        },
        {
            categoryId: categoryMap['phuc-vu'] || null,
            category: 'FNB',
            title: 'Phục vụ bàn',
            description: 'Đón tiếp khách, hướng dẫn chỗ ngồi, ghi order, phục vụ món ăn và đồ uống. Giới thiệu menu, tư vấn món ăn cho khách. Dọn dẹp bàn, set up bàn ăn cho lượt khách tiếp theo. Đảm bảo khách hàng có trải nghiệm tốt nhất.',
            requirements: '- Nhanh nhẹn, giao tiếp tốt\n- Ngoại hình ưa nhìn, tác phong chuyên nghiệp\n- Có thể làm ca tối và cuối tuần\n- Ưu tiên biết tiếng Anh cơ bản\n- Không cần kinh nghiệm, có đào tạo',
            benefits: '- Tip cao từ khách hàng\n- Môi trường làm việc thân thiện\n- Bao ăn ca, phụ cấp xăng xe\n- Training kỹ năng phục vụ chuyên nghiệp\n- Thưởng KPI hàng tháng\n- Lương tháng 13',
            defaultSalaryMin: 5000000,
            defaultSalaryMax: 8000000,
            suggestedShifts: JSON.stringify(['MORNING', 'AFTERNOON', 'NIGHT']),
            sortOrder: 2,
        },
        {
            categoryId: categoryMap['tap-vu-ks'] || null,
            category: 'FNB',
            title: 'Tạp vụ',
            description: 'Dọn dẹp, vệ sinh khu vực nhà hàng/khách sạn. Lau sàn, rửa bát đĩa, vệ sinh toilet, sắp xếp khu vực lưu trữ. Hỗ trợ các bộ phận khác khi cần thiết. Đảm bảo môi trường làm việc luôn sạch sẽ và ngăn nắp.',
            requirements: '- Chăm chỉ, cẩn thận\n- Sức khỏe tốt\n- Có tinh thần trách nhiệm\n- Không yêu cầu kinh nghiệm\n- Có thể làm ca sáng sớm',
            benefits: '- Bao ăn, bao ở\n- Lương ổn định, trả đúng hạn\n- BHXH đầy đủ\n- Phụ cấp chuyên cần\n- Môi trường làm việc thoải mái',
            defaultSalaryMin: 4500000,
            defaultSalaryMax: 6000000,
            suggestedShifts: JSON.stringify(['MORNING']),
            sortOrder: 3,
        },
        {
            categoryId: categoryMap['le-tan-khach-san'] || null,
            category: 'FNB',
            title: 'Lễ tân',
            description: 'Đón tiếp khách hàng, xử lý check-in/check-out, quản lý đặt phòng/đặt bàn. Giải đáp thắc mắc, xử lý yêu cầu của khách. Điều phối với các bộ phận liên quan. Duy trì sổ sách, báo cáo hàng ngày.',
            requirements: '- Giao tiếp tốt, tác phong chuyên nghiệp\n- Ngoại hình ưa nhìn\n- Tiếng Anh giao tiếp cơ bản trở lên\n- Biết sử dụng máy tính, phần mềm quản lý\n- Ưu tiên có kinh nghiệm lễ tân\n- Xử lý tình huống tốt',
            benefits: '- Lương + phụ cấp tiếng Anh\n- Đào tạo kỹ năng chuyên nghiệp\n- BHXH, BHYT đầy đủ\n- Thưởng KPI, tip khách\n- Cơ hội thăng tiến nhanh\n- Du lịch hàng năm',
            defaultSalaryMin: 7000000,
            defaultSalaryMax: 10000000,
            suggestedShifts: JSON.stringify(['MORNING', 'AFTERNOON', 'NIGHT']),
            sortOrder: 4,
        },
        {
            categoryId: categoryMap['bao-ve-ks'] || null,
            category: 'FNB',
            title: 'Bảo vệ',
            description: 'Tuần tra, giám sát an ninh khu vực nhà hàng/khách sạn. Kiểm soát ra vào, hướng dẫn đỗ xe. Xử lý các tình huống phát sinh, đảm bảo an toàn cho khách và nhân viên. Phối hợp với công an khu vực khi cần.',
            requirements: '- Nam, sức khỏe tốt\n- Cao từ 1m65 trở lên\n- Có tinh thần trách nhiệm cao\n- Có kinh nghiệm bảo vệ là lợi thế\n- Không tiền án tiền sự\n- Có thể làm ca đêm',
            benefits: '- Phụ cấp ca đêm\n- Bao ăn, bao ở\n- BHXH đầy đủ\n- Phụ cấp chuyên cần\n- Tăng lương định kỳ\n- Thưởng Lễ Tết',
            defaultSalaryMin: 6000000,
            defaultSalaryMax: 9000000,
            suggestedShifts: JSON.stringify(['MORNING', 'NIGHT']),
            sortOrder: 5,
        },
    ];

    for (const template of jobTemplates) {
        await prisma.jobTemplate.create({ data: template });
    }

    // ============================================================
    // SAMPLE NOTIFICATIONS
    // ============================================================
    console.log('🔔 Creating sample notifications...');

    await prisma.notification.createMany({
        data: [
            {
                userId: employer1User.id,
                type: 'APPLICATION_NEW',
                title: '📩 Ứng viên mới!',
                message: 'Nguyễn Minh Tuấn vừa ứng tuyển vị trí "Phục vụ nhà hàng"',
                link: '/employer/dashboard',
            },
            {
                userId: employer1User.id,
                type: 'REMINDER',
                title: '🔔 Nhắc nhở xem CV',
                message: 'Có 5 ứng viên chưa xem cho vị trí "Phụ bếp – Bếp Á"',
                link: '/employer/dashboard',
            },
            {
                userId: candidateUser.id,
                type: 'JOB_MATCH',
                title: '🎯 Việc phù hợp với bạn!',
                message: 'Phục vụ nhà hàng tại Khách sạn Biển Đông (phù hợp 85%)',
                link: '/jobs',
            },
            {
                userId: candidateUser.id,
                type: 'APPLICATION_STATUS',
                title: '⭐ Cập nhật ứng tuyển',
                message: 'Đơn ứng tuyển "Phục vụ nhà hàng" tại Khách sạn Biển Đông được chọn',
                link: '/candidate/applications',
            },
        ],
    });

    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('📋 Demo Accounts:');
    console.log('  Admin:      admin@findworkers.vn / 123456');
    console.log('  Employer 1: employer@demo.com / 123456 (Khách sạn Biển Đông)');
    console.log('  Employer 2: employer2@demo.com / 123456 (K-BBQ)');
    console.log('  Candidate:  candidate@demo.com / 123456 (Nguyễn Minh Tuấn)');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
