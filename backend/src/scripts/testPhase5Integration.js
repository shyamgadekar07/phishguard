/**
 * PhishGuard Phase 5: Backend Integration Test Suite
 * ==================================================
 * Tests:
 * 1. Metric mapping unit validation (percentage to ratio conversion, clamping, repeat click logic)
 * 2. Authorized trainee self-access (GET /api/analytics/me/risk) with separate mlPrediction
 * 3. Forbidden trainee access to other user's private risk data (GET /api/analytics/users/:id/risk -> 403)
 * 4. Authorized admin access (GET /api/analytics/users/:id/risk -> 200)
 * 5. Cold-start user with 0 simulations (safe 'insufficient_data' status)
 * 6. Graceful degradation on ML service failure/unreachable (HTTP 200 preserved, mlPrediction.status='unavailable')
 * 7. Privacy check: No credentials, tokens, or PII transmitted
 *
 * Run via:
 *   npm run test:phase5 (from backend directory)
 * or:
 *   node backend/src/scripts/testPhase5Integration.js (from project root)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from '../app.js';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import User from '../models/User.js';
import Campaign from '../models/Campaign.js';
import Template from '../models/Template.js';
import SimulationEvent from '../models/SimulationEvent.js';
import generateToken from '../utils/generateToken.js';
import generateTrackingId from '../utils/generateTrackingId.js';
import {
  mapBehaviorMetricsToMLFeatures,
  getMLRiskPrediction,
} from '../services/mlPrediction.service.js';

dotenv.config();

const TEST_PORT = 5098;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let server;
let adminToken = '';
let traineeToken = '';
let coldStartTraineeToken = '';
let otherTraineeToken = '';

let adminUser;
let traineeUser;
let coldStartTraineeUser;
let otherTraineeUser;
let testTemplate;
let testCampaign;

const runPhase5Tests = async () => {
  console.log('\n======================================================');
  console.log('  PHISHGUARD PHASE 5 BACKEND ML INTEGRATION SUITE');
  console.log('======================================================\n');

  let pass = 0;
  let fail = 0;

  const assert = (condition, testName, details) => {
    if (condition) {
      console.log(`  \x1b[32m[PASS]\x1b[0m ${testName}`);
      pass++;
    } else {
      console.log(`  \x1b[31m[FAIL]\x1b[0m ${testName} - ${details || ''}`);
      fail++;
    }
  };

  try {
    await connectDB();

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`[Test Server] Running on ${BASE_URL}\n`);
        resolve();
      });
    });

    // --- SETUP TEST USERS ---
    console.log('[Setup] Preparing test users & simulation records...');
    adminUser = await User.findOneAndUpdate(
      { email: 'admin_p5@phishguard.local' },
      {
        name: 'Admin Phase 5',
        email: 'admin_p5@phishguard.local',
        password: 'AdminPassword123!',
        role: 'ADMIN',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    adminToken = generateToken(adminUser._id, 'ADMIN');

    traineeUser = await User.findOneAndUpdate(
      { email: 'trainee_p5_active@example.com' },
      {
        name: 'Trainee P5 Active',
        email: 'trainee_p5_active@example.com',
        password: 'TraineePassword123!',
        role: 'TRAINEE',
        department: 'Finance',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    traineeToken = generateToken(traineeUser._id, 'TRAINEE');

    coldStartTraineeUser = await User.findOneAndUpdate(
      { email: 'trainee_p5_coldstart@example.com' },
      {
        name: 'Trainee P5 ColdStart',
        email: 'trainee_p5_coldstart@example.com',
        password: 'TraineePassword123!',
        role: 'TRAINEE',
        department: 'Operations',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    coldStartTraineeToken = generateToken(coldStartTraineeUser._id, 'TRAINEE');

    otherTraineeUser = await User.findOneAndUpdate(
      { email: 'trainee_p5_other@example.com' },
      {
        name: 'Trainee P5 Other',
        email: 'trainee_p5_other@example.com',
        password: 'TraineePassword123!',
        role: 'TRAINEE',
        department: 'Engineering',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    otherTraineeToken = generateToken(otherTraineeUser._id, 'TRAINEE');

    // Create template & campaign
    testTemplate = await Template.findOneAndUpdate(
      { name: 'Phase 5 Test Template' },
      {
        name: 'Phase 5 Test Template',
        description: 'Template for Phase 5 integration testing',
        channel: 'EMAIL',
        category: 'CREDENTIAL_HARVESTING',
        difficulty: 'MEDIUM',
        subject: 'Security Alert P5',
        body: 'Click here to verify your account.',
        createdBy: adminUser._id,
      },
      { upsert: true, new: true }
    );

    testCampaign = await Campaign.findOneAndUpdate(
      { name: 'Phase 5 Test Campaign' },
      {
        name: 'Phase 5 Test Campaign',
        description: 'Campaign for Phase 5 testing',
        template: testTemplate._id,
        targetUsers: [traineeUser._id],
        channel: 'EMAIL',
        status: 'LAUNCHED',
        createdBy: adminUser._id,
      },
      { upsert: true, new: true }
    );

    // Clean past simulation events for test users
    await SimulationEvent.deleteMany({ user: { $in: [traineeUser._id, coldStartTraineeUser._id] } });

    // Insert events for active trainee: 4 simulations, 2 clicks, 1 report, 3 opens
    const eventRecords = [
      { user: traineeUser._id, eventType: 'DELIVERED', trackingId: generateTrackingId() },
      { user: traineeUser._id, eventType: 'OPENED', trackingId: generateTrackingId() },
      { user: traineeUser._id, eventType: 'CLICKED', trackingId: generateTrackingId() },
      { user: traineeUser._id, eventType: 'REPORTED', trackingId: generateTrackingId() },
    ];

    for (const ev of eventRecords) {
      await SimulationEvent.create({
        campaign: testCampaign._id,
        template: testTemplate._id,
        user: ev.user,
        eventType: ev.eventType,
        trackingId: ev.trackingId,
      });
    }

    console.log('[Setup Complete] Beginning test execution...\n');

    // -------------------------------------------------------------
    // TEST 1: Metric Mapping & Conversion Unit Tests
    // -------------------------------------------------------------
    console.log('--- TEST GROUP 1: Feature Mapping & Boundary Normalization ---');

    const mappedValid = mapBehaviorMetricsToMLFeatures({
      totalSimulations: 10,
      clickRate: 25.5,
      reportRate: 80.0,
      openRate: 90.25,
      clickedCount: 3,
    });

    assert(
      mappedValid.simulation_count === 10 &&
      mappedValid.click_rate === 0.255 &&
      mappedValid.report_rate === 0.8 &&
      mappedValid.open_rate === 0.9025 &&
      mappedValid.repeat_click_count === 3,
      'mapBehaviorMetricsToMLFeatures converts percentage rates to [0.0, 1.0] ratios correctly',
      JSON.stringify(mappedValid)
    );

    // Test boundary clamping on anomalous input
    const mappedClamped = mapBehaviorMetricsToMLFeatures({
      totalSimulations: -5,
      clickRate: 150.0,
      reportRate: -20.0,
      openRate: NaN,
      clickedCount: 1, // Single click should map repeat_click_count to 0
    });

    assert(
      mappedClamped.simulation_count === 0 &&
      mappedClamped.click_rate === 1.0 &&
      mappedClamped.report_rate === 0.0 &&
      mappedClamped.open_rate === 0.0 &&
      mappedClamped.repeat_click_count === 0,
      'mapBehaviorMetricsToMLFeatures safely clamps out-of-bounds rates and handles single clicks',
      JSON.stringify(mappedClamped)
    );

    // Test privacy: Verify no sensitive properties in mapped features
    const forbiddenKeys = ['password', 'token', 'email', 'name', 'userId', '_id', 'otp'];
    const hasSensitiveKey = forbiddenKeys.some((k) => k in mappedValid);
    assert(
      !hasSensitiveKey && Object.keys(mappedValid).length === 5,
      'mapBehaviorMetricsToMLFeatures strictly emits only the 5 numerical features (zero credentials/PII)',
      `Keys found: ${Object.keys(mappedValid).join(', ')}`
    );

    // -------------------------------------------------------------
    // TEST 2: Authorized Trainee Self-Access
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 2: Authorized Trainee Self-Access ---');

    const resTraineeSelf = await fetch(`${BASE_URL}/api/analytics/me/risk`, {
      headers: { Authorization: `Bearer ${traineeToken}` },
    });
    const dataTraineeSelf = await resTraineeSelf.json();

    assert(
      resTraineeSelf.status === 200 && dataTraineeSelf.success === true,
      'GET /api/analytics/me/risk returns HTTP 200 for authenticated trainee'
    );

    assert(
      dataTraineeSelf.data?.user?._id?.toString() === traineeUser._id.toString(),
      'Trainee self-access returns strictly the authenticated user profile'
    );

    assert(
      typeof dataTraineeSelf.data?.riskScore === 'number' &&
      typeof dataTraineeSelf.data?.riskLevel === 'string' &&
      Array.isArray(dataTraineeSelf.data?.factors),
      'Phase 4 deterministic riskScore, riskLevel, and factors are preserved intact'
    );

    assert(
      dataTraineeSelf.data?.mlPrediction !== undefined &&
      typeof dataTraineeSelf.data?.mlPrediction === 'object',
      'Response includes separate advisory mlPrediction field'
    );

    // -------------------------------------------------------------
    // TEST 3: Authorization Barrier — Forbidden Trainee Cross-Access
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 3: Trainee Authorization Boundaries ---');

    const resTraineeCross = await fetch(
      `${BASE_URL}/api/analytics/users/${otherTraineeUser._id}/risk`,
      {
        headers: { Authorization: `Bearer ${traineeToken}` },
      }
    );
    const dataTraineeCross = await resTraineeCross.json();

    assert(
      resTraineeCross.status === 403,
      'GET /api/analytics/users/:id/risk returns HTTP 403 Forbidden when accessed by trainee',
      `Received status: ${resTraineeCross.status}`
    );

    assert(
      dataTraineeCross.message?.includes('Forbidden'),
      'Forbidden error message properly identifies role authorization failure'
    );

    // -------------------------------------------------------------
    // TEST 4: Authorized Admin Access
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 4: Authorized Administrative Access ---');

    const resAdminUserRisk = await fetch(
      `${BASE_URL}/api/analytics/users/${traineeUser._id}/risk`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    const dataAdminUserRisk = await resAdminUserRisk.json();

    assert(
      resAdminUserRisk.status === 200 && dataAdminUserRisk.success === true,
      'GET /api/analytics/users/:userId/risk returns HTTP 200 for authorized ADMIN'
    );

    assert(
      dataAdminUserRisk.data?.user?._id?.toString() === traineeUser._id.toString(),
      'Admin receives target user profile and risk analytics'
    );

    assert(
      dataAdminUserRisk.data?.riskScore !== undefined &&
      dataAdminUserRisk.data?.mlPrediction !== undefined,
      'Admin response contains both Phase 4 deterministic riskScore and Phase 5 mlPrediction'
    );

    // -------------------------------------------------------------
    // TEST 5: Cold-Start / Zero Simulations Handling
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 5: Cold-Start / Zero Simulations Handling ---');

    const resColdStart = await fetch(`${BASE_URL}/api/analytics/me/risk`, {
      headers: { Authorization: `Bearer ${coldStartTraineeToken}` },
    });
    const dataColdStart = await resColdStart.json();

    assert(
      resColdStart.status === 200,
      'Cold-start user receives HTTP 200 for self-risk assessment'
    );

    assert(
      dataColdStart.data?.metrics?.totalSimulations === 0,
      'Cold-start user metrics confirm 0 total simulations recorded'
    );

    assert(
      dataColdStart.data?.mlPrediction?.status === 'insufficient_data' &&
      dataColdStart.data?.mlPrediction?.risk_category === null,
      'Cold-start user safely returns status="insufficient_data" and null risk_category',
      JSON.stringify(dataColdStart.data?.mlPrediction)
    );

    assert(
      dataColdStart.data?.mlPrediction?.disclaimer?.includes('Academic prototype'),
      'Cold-start ML response includes required academic prototype disclaimer'
    );

    // -------------------------------------------------------------
    // TEST 6: Graceful Degradation on ML Service Offline/Timeout
    // -------------------------------------------------------------
    console.log('\n--- TEST GROUP 6: Graceful Degradation on ML Service Failure ---');

    const originalUrl = process.env.ML_SERVICE_URL;
    try {
      // Point ML_SERVICE_URL to a dead/unreachable local port
      process.env.ML_SERVICE_URL = 'http://127.0.0.1:59999';

      const resOffline = await fetch(`${BASE_URL}/api/analytics/me/risk`, {
        headers: { Authorization: `Bearer ${traineeToken}` },
      });
      const dataOffline = await resOffline.json();

      assert(
        resOffline.status === 200 && dataOffline.success === true,
        'Backend continues to return HTTP 200 when ML microservice is offline (fails safe)'
      );

      assert(
        typeof dataOffline.data?.riskScore === 'number' &&
        dataOffline.data?.riskScore > 0,
        'Authoritative Phase 4 deterministic risk score is completely preserved during ML outage'
      );

      assert(
        dataOffline.data?.mlPrediction?.status === 'unavailable' &&
        dataOffline.data?.mlPrediction?.isAvailable === false,
        'mlPrediction reports status="unavailable" and isAvailable=false without crashing',
        JSON.stringify(dataOffline.data?.mlPrediction)
      );

      assert(
        dataOffline.data?.mlPrediction?.disclaimer?.includes('Academic prototype'),
        'Unavailable ML response preserves prototype disclaimer'
      );
    } finally {
      // Restore original URL
      if (originalUrl !== undefined) {
        process.env.ML_SERVICE_URL = originalUrl;
      } else {
        delete process.env.ML_SERVICE_URL;
      }
    }

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n======================================================');
    console.log(`  PHASE 5 INTEGRATION SUITE FINISHED: ${pass} PASSED, ${fail} FAILED`);
    console.log('======================================================\n');

    return fail === 0;
  } catch (error) {
    console.error('[Error] Exception occurred during test execution:', error);
    return false;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.connection.close();
  }
};

runPhase5Tests().then((success) => {
  process.exit(success ? 0 : 1);
});
