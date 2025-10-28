import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not set" },
      { status: 500 }
    );
  }
//   NS1.VERCEL-DNS.COM
//   NS2.VERCEL-DNS.COM
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const data = await resend.emails.send({
      from: "support@shopgrocery.org", // Your verified domain
      to: "okpalachidiebere99@gmail.com",
      subject: "New email Orders",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E8B57;">Order Confirmed!</h2>
          <p>Hello,</p>
          <p>Thank you for shopping with ShopGrocery. We've received your order and will notify you when it ships.</p>
          <p>Order details will be sent in a separate email.</p>
          <br>
          <p>Best regards,<br>ShopGrocery Team</p>
          <hr style="margin-top: 20px;">
          <p style="font-size: 12px; color: #666;">
            ShopGrocery LLC<br>
            [Your Business Address Here]
          </p>
        </div>
      `,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
