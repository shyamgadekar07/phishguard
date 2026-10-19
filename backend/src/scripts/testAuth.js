import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from '../app.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Test state
let server;
let generatedToken = '';
const testEmail = `test_trainee_${Date.now()}@example.com`;
const testPassword = 'TraineeSecurePass123!';
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@phishguard.local').trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';

const runTests = async () => {
  console.log('\n========================================');
  console.log('  PHISHGUARD PHASE 2 AUTHENTICATION SUITE');
  console.log('========================================\n');

  try {
    // 1. Connect to MongoDB Atlas
    console.log('[Test Setup] Connecting to MongoDB Atlas...');
    await connectDB();

    // 2. Start HTTP server on test port
    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`[Test Setup] Test server listening on ${BASE_URL}\n`);
        resolve();
      });
    });

    let passCount = 0;
    let failCount = 0;

    const assert = (condition, testName, details) => {
      if (condition) {
        console.log(`  \x1b[32m[PASS]\x1b[0m ${testName}`);
        passCount++;
      } else {
        console.log(`  \x1b[31m[FAIL]\x1b[0m ${testName} - ${details}`);
        failCount++;
      }
    };

    // ----------------------------------------------------
    // TEST 1: Existing Health Check API
    // ----------------------------------------------------
    console.log('[Case 1] GET /api/health');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 && healthData.success === true,
      'GET /api/health returns 200 OK and success: true',
      JSON.stringify(healthData)
    );

    // ----------------------------------------------------
    // TEST 2: POST /api/auth/register (New Trainee)
    // ----------------------------------------------------
    console.log('\n[Case 2] POST /api/auth/register');
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Test Trainee',
        email: testEmail,
        password: testPassword,
        department: 'Information Security',
        role: 'ADMIN', // Privilege escalation attempt should be overridden to TRAINEE
      }),
    });
    const regData = await regRes.json();
    assert(
      regRes.status === 201 &&
        regData.success === true &&
        regData.data?.user?.role === 'TRAINEE' &&
        regData.data?.user?.password === undefined,
      'POST /api/auth/register returns 201, safe user object, and enforces TRAINEE role',
      JSON.stringify(regData)
    );

    // ----------------------------------------------------
    // TEST 3: Duplicate Registration
    // ----------------------------------------------------
    console.log('\n[Case 3] POST /api/auth/register (Duplicate Email)');
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: testEmail,
        password: 'AnotherPassword123!',
      }),
    });
    const dupData = await dupRes.json();
    assert(
      dupRes.status === 400 && dupData.success === false,
      'POST /api/auth/register rejects duplicate email with 400 Bad Request',
      JSON.stringify(dupData)
    );

    // ----------------------------------------------------
    // TEST 4: POST /api/auth/login (Correct Credentials)
    // ----------------------------------------------------
    console.log('\n[Case 4] POST /api/auth/login (Correct Credentials)');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    generatedToken = loginData.data?.token || '';
    assert(
      loginRes.status === 200 &&
        loginData.success === true &&
        generatedToken.length > 20 &&
        loginData.data?.user?.password === undefined,
      'POST /api/auth/login returns 200 OK, valid JWT, and safe user profile',
      JSON.stringify(loginData)
    );

    // ----------------------------------------------------
    // TEST 5: POST /api/auth/login (Wrong Credentials)
    // ----------------------------------------------------
    console.log('\n[Case 5] POST /api/auth/login (Wrong Password)');
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'IncorrectPassword999!',
      }),
    });
    const badLoginData = await badLoginRes.json();
    assert(
      badLoginRes.status === 401 && badLoginData.success === false,
      'POST /api/auth/login rejects wrong password with 401 Unauthorized',
      JSON.stringify(badLoginData)
    );

    // ----------------------------------------------------
    // TEST 6: GET /api/auth/me (Valid JWT)
    // ----------------------------------------------------
    console.log('\n[Case 6] GET /api/auth/me (With Valid Bearer Token)');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${generatedToken}`,
      },
    });
    const meData = await meRes.json();
    assert(
      meRes.status === 200 &&
        meData.success === true &&
        meData.data?.user?.email === testEmail,
      'GET /api/auth/me returns 200 OK and verified user profile',
      JSON.stringify(meData)
    );

    // ----------------------------------------------------
    // TEST 7: GET /api/auth/me (Without Token)
    // ----------------------------------------------------
    console.log('\n[Case 7] GET /api/auth/me (No Authorization Header)');
    const noTokenRes = await fetch(`${BASE_URL}/api/auth/me`);
    const noTokenData = await noTokenRes.json();
    assert(
      noTokenRes.status === 401 && noTokenData.success === false,
      'GET /api/auth/me rejects unauthenticated request with 401 Unauthorized',
      JSON.stringify(noTokenData)
    );

    // ----------------------------------------------------
    // TEST 8: GET /api/auth/me (Invalid / Tampered Token)
    // ----------------------------------------------------
    console.log('\n[Case 8] GET /api/auth/me (Invalid Token)');
    const badTokenRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid.tampered.token',
      },
    });
    const badTokenData = await badTokenRes.json();
    assert(
      badTokenRes.status === 401 && badTokenData.success === false,
      'GET /api/auth/me rejects invalid token with 401 Unauthorized',
      JSON.stringify(badTokenData)
    );

    // ----------------------------------------------------
    // TEST 9: Admin Seed & Admin Login
    // ----------------------------------------------------
    console.log('\n[Case 9] Admin Account Seeding & Verification');
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      console.log(`  Creating admin account (${adminEmail})...`);
      adminUser = await User.create({
        name: process.env.ADMIN_NAME || 'PhishGuard Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'ADMIN',
        department: 'Cybersecurity Operations',
        isActive: true,
      });
    }

    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.data?.token || '';

    const adminMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const adminMeData = await adminMeRes.json();

    assert(
      adminLoginRes.status === 200 &&
        adminMeData.data?.user?.role === 'ADMIN',
      'Admin account verified, can log in, and possesses ADMIN role',
      `Login: ${adminLoginRes.status}, Role: ${adminMeData.data?.user?.role}`
    );

    // ----------------------------------------------------
    // Summary
    // ----------------------------------------------------
    console.log('\n========================================');
    console.log(`  RESULTS: ${passCount} Passed, ${failCount} Failed`);
    console.log('========================================\n');

    // Clean up temporary test trainee user
    await User.deleteOne({ email: testEmail });
    console.log('[Test Teardown] Cleaned up temporary test user account.');

    server.close();
    await mongoose.connection.close();
    process.exit(failCount === 0 ? 0 : 1);
  } catch (err) {
    console.error('[Test Execution Error]:', err);
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(1);
  }
};

runTests();
