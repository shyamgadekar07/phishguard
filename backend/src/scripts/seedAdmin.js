import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
  const adminName = process.env.ADMIN_NAME || 'PhishGuard Admin';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@phishguard.local').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('[Seed Admin Error] ADMIN_PASSWORD environment variable is required to seed an admin account.');
    process.exit(1);
  }

  console.log('[Seed Admin] Initializing database connection...');
  await connectDB();

  try {
    // Check if admin already exists by email or by ADMIN role
    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { role: 'ADMIN' }],
    });

    if (existingAdmin) {
      console.log(
        `[Seed Admin] Admin account exists (${existingAdmin.email} - role: ${existingAdmin.role}).`
      );

      // Synchronize admin configuration from environment variables.
      existingAdmin.name = adminName;
      existingAdmin.email = adminEmail;
      existingAdmin.password = adminPassword;
      existingAdmin.role = 'ADMIN';
      existingAdmin.department = 'Cybersecurity Operations';
      existingAdmin.isActive = true;
      existingAdmin.riskScore = 0;
      existingAdmin.riskLevel = 'LOW';

      // User model pre-save hook will hash the new password.
      await existingAdmin.save();

      console.log('[Seed Admin] Existing admin account synchronized successfully.');

      await mongoose.connection.close();
      process.exit(0);
    }

    // Create the initial admin account
    const newAdmin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword, // Hashed via pre-save hook in User model
      role: 'ADMIN',
      department: 'Cybersecurity Operations',
      isActive: true,
      riskScore: 0,
      riskLevel: 'LOW',
    });

    console.log(`[Seed Admin] Successfully created initial ADMIN account: ${newAdmin.email} (ID: ${newAdmin._id})`);
    console.log('[Seed Admin] Security Notice: Initial administrator credentials seeded from environment configuration.');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Admin Error] Failed to seed administrator: ${error.message}`);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedAdmin();
