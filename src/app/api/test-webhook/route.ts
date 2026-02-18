import { NextResponse } from 'next/server';
import { discordJobPosted, discordNewApplication, discordStatusChange } from '@/lib/discord';

export async function GET() {
    return NextResponse.json({
        channels: {
            'bang-tin-doanh-nghiep': '💼 Employer đăng tin',
            'tin-tuyen-dung-moi': '📊 Duyệt/từ chối ứng viên',
            'thong-bao-ung-tuyen': '📨 Ứng viên ứng tuyển',
        },
        hint: 'POST /api/test-webhook?channel=all để test cả 3 kênh',
    });
}

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || 'all';

    const results: Record<string, string> = {};

    try {
        if (channel === 'all' || channel === '1') {
            await discordJobPosted('🧪 TEST — Bảo vệ', 'Company Test', 'Phú Quốc', '8M - 12M');
            results['#bang-tin-doanh-nghiep'] = '✅ Sent';
        }

        if (channel === 'all' || channel === '2') {
            await discordStatusChange('Test Candidate', 'Bảo vệ', 'Company Test', 'APPLIED', 'HIRED');
            results['#tin-tuyen-dung-moi'] = '✅ Sent';
        }

        if (channel === 'all' || channel === '3') {
            await discordNewApplication('Test Candidate', '0901234567', 'test@test.com', 'Bảo vệ', 'Company Test');
            results['#thong-bao-ung-tuyen'] = '✅ Sent';
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message, results }, { status: 500 });
    }
}
