import { db } from "./server/db";
import { users, emails } from "./shared/schema";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcrypt";

async function seed() {
    console.log("Starting seed process...");

    // 1. Check if 'demo_user' exists or create one
    let user = await db.select().from(users).where(eq(users.username, 'demo_user')).limit(1);
    let userId;

    if (user.length === 0) {
        const hashedPassword = await bcrypt.hash("DemoPassword123!", 10);
        const [newUser] = await db.insert(users).values({
            username: "demo_user",
            email: "demo@eomail.co",
            password: hashedPassword,
            displayName: "Demo User",
            avatarInitials: "DU",
        }).returning();
        userId = newUser.id;
        console.log("Created new demo user:", userId);
    } else {
        userId = user[0].id;
        console.log("Found existing demo user:", userId);
    }

    // Clear existing mock emails for clean state
    await db.delete(emails).where(eq(emails.userId, userId));

    // 2. Insert FinOps Email
    await db.insert(emails).values({
        userId,
        from: "Stripe",
        fromEmail: "receipts@stripe.com",
        to: "demo@eomail.co",
        toEmail: "demo@eomail.co",
        subject: "Your receipt from EOMail Pro - $29.00",
        body: "<p>Thank you for your payment. Amount: $29.00. Invoice appended.</p>",
        preview: "Thank you for your payment. Amount: $29.00. Invoice appended.",
        timestamp: new Date(),
        read: false,
        folder: "inbox",
        aiCategory: "finance",
        aiProcessed: true,
        aiSummary: "Receipt for EOMail Pro subscription: $29.00",
    });

    // 3. Insert Chrono Email
    await db.insert(emails).values({
        userId,
        from: "Priya Patel",
        fromEmail: "priya@example.com",
        to: "demo@eomail.co",
        toEmail: "demo@eomail.co",
        subject: "Coffee chat next week?",
        body: "<p>Hey! I came across your work and I'd love to grab a coffee next Tuesday at 2 PM PST to discuss some potential synergies. Let me know if that works!</p>",
        preview: "Hey! I came across your work and I'd love to grab a coffee next Tuesday at 2 PM PST...",
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        read: false,
        folder: "inbox",
        aiCategory: "scheduling",
        aiProcessed: true,
        aiSummary: "Priya Patel requested a 2 PM PST meeting next Tuesday.",
    });

    // 4. Insert Aegis Warning Email
    await db.insert(emails).values({
        userId,
        from: "PayPal Support",
        fromEmail: "security-alert-urgent@paypal-verify-account.com",
        to: "demo@eomail.co",
        toEmail: "demo@eomail.co",
        subject: "URGENT: Your account has been suspended",
        body: "<p>Dear User, please click here immediately to verify your identity or your account will be permanently closed.</p>",
        preview: "Dear User, please click here immediately to verify your identity...",
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        read: false,
        folder: "inbox",
        aiCategory: "notification",
        aiProcessed: true,
        aiSpamScore: 98,
        aiSpamReason: "Suspicious sender domain mimicking PayPal. High urgency language urging immediate action via an external link.",
    });

    // 5. Insert General / Newsletter Email
    await db.insert(emails).values({
        userId,
        from: "Netflix",
        fromEmail: "info@mailer.netflix.com",
        to: "demo@eomail.co",
        toEmail: "demo@eomail.co",
        subject: "New on Netflix: Shows you'll love this October",
        body: "<p>Based on your watching history, here are our top picks.</p>",
        preview: "Based on your watching history, here are our top picks...",
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        read: true,
        folder: "inbox",
        aiCategory: "newsletter",
        aiProcessed: true,
        aiSummary: "Netflix's monthly recommendations for October.",
    });

    console.log("Mock emails inserted successfully.");
    process.exit(0);
}

seed().catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
});
