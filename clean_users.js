const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function cleanDB() {
    try {
        // List all users
        const users = await p.user.findMany({
            select: { id: true, phone: true, role: true, email: true }
        });
        console.log(`Found ${users.length} users total`);
        users.forEach(u => console.log(`  - ${u.phone || u.email} (${u.role})`));

        const toDelete = users.filter(u => u.phone !== '0907697043');
        console.log(`\nWill delete ${toDelete.length} users (keeping 0907697043)`);

        for (const u of toDelete) {
            try {
                // Delete related records first
                await p.$executeRawUnsafe(`DELETE FROM "Notification" WHERE "userId" = '${u.id}'`).catch(() => { });
                await p.$executeRawUnsafe(`DELETE FROM "Application" WHERE "candidateId" = '${u.id}'`).catch(() => { });
                await p.$executeRawUnsafe(`DELETE FROM "Application" WHERE "employerId" = '${u.id}'`).catch(() => { });
                await p.$executeRawUnsafe(`DELETE FROM "Job" WHERE "employerId" = '${u.id}'`).catch(() => { });
                await p.$executeRawUnsafe(`DELETE FROM "CandidateProfile" WHERE "userId" = '${u.id}'`).catch(() => { });
                await p.$executeRawUnsafe(`DELETE FROM "EmployerProfile" WHERE "userId" = '${u.id}'`).catch(() => { });
                await p.user.delete({ where: { id: u.id } });
                console.log(`  ✅ Deleted: ${u.phone || u.email} (${u.role})`);
            } catch (err) {
                console.log(`  ❌ Failed: ${u.phone || u.email} - ${err.message}`);
            }
        }

        // Verify
        const remaining = await p.user.findMany({ select: { phone: true, role: true } });
        console.log(`\n✅ Done! Remaining users: ${remaining.length}`);
        remaining.forEach(u => console.log(`  - ${u.phone} (${u.role})`));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await p.$disconnect();
    }
}

cleanDB();
