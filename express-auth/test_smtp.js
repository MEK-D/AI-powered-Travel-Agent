const nodemailer = require('nodemailer');
require('dotenv').config({ path: '../.env' });

async function main() {
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '******' : 'MISSING');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('Connection verified successfully!');

    console.log('Sending test mail...');
    const info = await transporter.sendMail({
      from: `"TravelEase Test" <${process.env.SMTP_USER}>`,
      to: 'krishnanimesh878@gmail.com',
      subject: 'SMTP Test Mail',
      text: 'This is a test email to verify SMTP configuration.',
    });
    console.log('Message sent: %s', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('SMTP test failed:', err);
  }
}

main();
