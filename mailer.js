const admin = require('firebase-admin');
const nodemailer = require('nodemailer');


// Load Firebase credentials from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendEmailsFromContacts() {
  try {
    const snapshot = await db.collection('contacts').get();
    console.log(`📬 Found ${snapshot.size} contacts to process.`);

    for (const doc of snapshot.docs) {
      const data = doc.data();

      if (data.delivered === true) continue;

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: data.email,
        subject: '🔥 Message from Firebase',
        html: `
          <p><strong>Hello ${data.firstName} ${data.lastName},</strong></p>
          <p>Email: ${data.email}</p>
          <p>${data.message}</p>
          <p>${data.link}</p>
          <p>Best regards,<br/>Firebase Team</p>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${data.email}`);
        await doc.ref.update({ delivered: true });
        console.log(`📬 Updated 'delivered' status for ${doc.id}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${data.email}:`, error);
      }
    }
  } catch (err) {
    console.error('❌ Failed to fetch contacts:', err);
  }
}

sendEmailsFromContacts();
setInterval(sendEmailsFromContacts, 5 * 60 * 1000);

// Keep process alive
console.log('Mailer service started, polling every 5 minutes.');
