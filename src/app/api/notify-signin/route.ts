import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { userName, userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    const notificationEmail = process.env.NOTIFICATION_EMAIL;
    if (!notificationEmail) {
      console.error('NOTIFICATION_EMAIL environment variable is not set');
      return NextResponse.json(
        { error: 'Notification recipient not configured' },
        { status: 500 }
      );
    }

    const { error } = await resend.emails.send({
      from: 'Observations to Insights <onboarding@resend.dev>',
      to: notificationEmail,
      subject: `Sign-in: ${userName || userEmail}`,
      html: `
        <h2>New Sign-In</h2>
        <p><strong>Name:</strong> ${userName || 'N/A'}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending sign-in notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
