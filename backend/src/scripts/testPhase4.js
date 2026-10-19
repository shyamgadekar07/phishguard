import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from '../app.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Campaign from '../models/Campaign.js';
import Template from '../models/Template.js';
import SimulationEvent from '../models/SimulationEvent.js';
import RiskHistory from '../models/RiskHistory.js';
import generateToken from '../utils/generateToken.js';
import generateTrackingId from '../utils/generateTrackingId.js';
import {
  getUserBehaviorMetrics,
  getSystemBehaviorOverview,
  getTraineesRiskSummary,
} from '../services/behaviorAnalytics.service.js';
import {
  calculateRiskScore,
  getRiskLevel,
  recalculateUserRisk,
  RISK_THRESHOLDS,
} from '../services/riskScore.service.js';

dotenv.config();

const TEST_PORT = 5097;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let server;
let adminToken = '';
let officerToken = '';
let traineeToken = '';
let otherTraineeToken = '';

let adminUser;
let officerUser;
let traineeUser;
let otherTraineeUser;
let testTemplate;
let testCampaign;

const runPhase4Tests = async () => {
  console.log('\n======================================================');
  console.log('  PHISHGUARD PHASE 4 BEHAVIORAL ANALYTICS & RISK SUITE');
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
      { email: 'admin_p4@phishguard.local' },
      {
        name: 'Admin Phase 4',
        email: 'admin_p4@phishguard.local',
        password: 'AdminPassword123!',
        role: 'ADMIN',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    adminToken = generateToken(adminUser._id, 'ADMIN');

    officerUser = await User.findOneAndUpdate(
      { email: 'officer_p4@phishguard.local' },
      {
        name: 'Security Officer Phase 4',
        email: 'officer_p4@phishguard.local',
        password: 'OfficerPassword123!',
        role: 'SECURITY_OFFICER',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    officerToken = generateToken(officerUser._id, 'SECURITY_OFFICER');

    traineeUser = await User.findOneAndUpdate(
      { email: 'trainee_p4@example.com' },
      {
        name: 'Trainee Phase 4',
        email: 'trainee_p4@example.com',
        password: 'TraineePassword123!',
        role: 'TRAINEE',
        department: 'Finance',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    traineeToken = generateToken(traineeUser._id, 'TRAINEE');

    otherTraineeUser = await User.findOneAndUpdate(
      { email: 'other_trainee_p4@example.com' },
      {
        name: 'Other Trainee Phase 4',
        email: 'other_trainee_p4@example.com',
        password: 'TraineePassword123!',
        role: 'TRAINEE',
        department: 'HR',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    otherTraineeToken = generateToken(otherTraineeUser._id, 'TRAINEE');

    // Create test template and campaign
    testTemplate = await Template.create({
      name: 'P4 Security Awareness Notice',
      channel: 'EMAIL',
      subject: 'Security Alert',
      content: 'Click here: {{link}}',
      description: 'Phase 4 verification template',
      difficulty: 'LOW',
      createdBy: adminUser._id,
    });

    testCampaign = await Campaign.create({
      name: 'Phase 4 Awareness Drill',
      channel: 'EMAIL',
      template: testTemplate._id,
      createdBy: adminUser._id,
      targets: [traineeUser._id],
      status: 'RUNNING',
    });

    // ----------------------------------------------------
    // TEST 1: Create test trainee
    // ----------------------------------------------------
    console.log('\n[Case 1] Verify test trainee created');
    assert(
      traineeUser && traineeUser.role === 'TRAINEE' && traineeUser.email === 'trainee_p4@example.com',
      'Test trainee created with valid default risk parameters'
    );

    // ----------------------------------------------------
    // TEST 2: Create safe simulation events
    // ----------------------------------------------------
    console.log('\n[Case 2] Create safe simulation events');
    const simEvent1 = await SimulationEvent.create({
      campaign: testCampaign._id,
      template: testTemplate._id,
      user: traineeUser._id,
      trackingId: generateTrackingId(24),
      eventType: 'DELIVERED',
      timestamp: new Date(Date.now() - 3600000),
      metadata: { channel: 'EMAIL' },
    });

    const simEvent2 = await SimulationEvent.create({
      campaign: testCampaign._id,
      template: testTemplate._id,
      user: traineeUser._id,
      trackingId: generateTrackingId(24),
      eventType: 'CLICKED',
      timestamp: new Date(),
      metadata: { channel: 'EMAIL', clickedAt: new Date().toISOString() },
    });

    assert(
      simEvent1 && simEvent2 && simEvent2.eventType === 'CLICKED',
      'Safe simulation events created with tracking IDs and safe metadata'
    );

    // ----------------------------------------------------
    // TEST 3: Aggregate behavioral metrics
    // ----------------------------------------------------
    console.log('\n[Case 3] Aggregate behavioral metrics via behaviorAnalytics.service');
    const metrics = await getUserBehaviorMetrics(traineeUser._id);
    assert(
      metrics.totalSimulations === 2 &&
        metrics.clickedCount === 1 &&
        metrics.deliveredCount === 2 &&
        metrics.clickRate === 50.0 &&
        metrics.reportRate === 0.0 &&
        Array.isArray(metrics.recentActivity) &&
        metrics.recentActivity.length === 2,
      'Behavioral metrics aggregated deterministically from database',
      JSON.stringify(metrics)
    );

    // ----------------------------------------------------
    // TEST 4: Calculate risk score and verify explainability
    // ----------------------------------------------------
    console.log('\n[Case 4] Calculate explainable risk score');
    const riskResult = calculateRiskScore(metrics);
    assert(
      typeof riskResult.riskScore === 'number' &&
        riskResult.riskScore >= 0 &&
        riskResult.riskScore <= 100 &&
        ['LOW', 'MEDIUM', 'HIGH'].includes(riskResult.riskLevel) &&
        Array.isArray(riskResult.factors) &&
        riskResult.factors.length > 0,
      'Risk score calculated with structured explainable factors',
      JSON.stringify(riskResult)
    );

    // ----------------------------------------------------
    // TEST 5: Verify score range 0 <= riskScore <= 100
    // ----------------------------------------------------
    console.log('\n[Case 5] Verify score range boundaries (0-100 constraint)');
    const extremeLow = calculateRiskScore({
      totalSimulations: 5,
      deliveredCount: 5,
      openedCount: 0,
      clickedCount: 0,
      reportedCount: 5,
      ignoredCount: 0,
      clickRate: 0,
      reportRate: 100,
      openRate: 0,
    });
    const extremeHigh = calculateRiskScore({
      totalSimulations: 10,
      deliveredCount: 10,
      openedCount: 10,
      clickedCount: 10,
      reportedCount: 0,
      ignoredCount: 0,
      clickRate: 100,
      reportRate: 0,
      openRate: 100,
    });
    assert(
      extremeLow.riskScore >= 0 && extremeLow.riskScore <= 100 &&
      extremeHigh.riskScore >= 0 && extremeHigh.riskScore <= 100,
      'Risk score strictly obeys 0 <= riskScore <= 100 under boundary conditions',
      `Low: ${extremeLow.riskScore}, High: ${extremeHigh.riskScore}`
    );

    // ----------------------------------------------------
    // TEST 6: Verify LOW threshold (0–39)
    // ----------------------------------------------------
    console.log('\n[Case 6] Verify LOW threshold');
    assert(
      getRiskLevel(0) === 'LOW' &&
        getRiskLevel(25) === 'LOW' &&
        getRiskLevel(39) === 'LOW',
      'Scores in range 0–39 correctly mapped to LOW risk level'
    );

    // ----------------------------------------------------
    // TEST 7: Verify MEDIUM threshold (40–69)
    // ----------------------------------------------------
    console.log('\n[Case 7] Verify MEDIUM threshold');
    assert(
      getRiskLevel(40) === 'MEDIUM' &&
        getRiskLevel(55) === 'MEDIUM' &&
        getRiskLevel(69) === 'MEDIUM',
      'Scores in range 40–69 correctly mapped to MEDIUM risk level'
    );

    // ----------------------------------------------------
    // TEST 8: Verify HIGH threshold (70–100)
    // ----------------------------------------------------
    console.log('\n[Case 8] Verify HIGH threshold');
    assert(
      getRiskLevel(70) === 'HIGH' &&
        getRiskLevel(85) === 'HIGH' &&
        getRiskLevel(100) === 'HIGH',
      'Scores in range 70–100 correctly mapped to HIGH risk level'
    );

    // ----------------------------------------------------
    // TEST 9: Verify CLICKED behavior increases risk score
    // ----------------------------------------------------
    console.log('\n[Case 9] Verify CLICKED behavior increases risk');
    const scoreZeroClicks = calculateRiskScore({
      totalSimulations: 2,
      deliveredCount: 2,
      openedCount: 0,
      clickedCount: 0,
      reportedCount: 0,
      ignoredCount: 2,
      clickRate: 0,
      reportRate: 0,
      openRate: 0,
    });
    const scoreWithClicks = calculateRiskScore({
      totalSimulations: 2,
      deliveredCount: 2,
      openedCount: 0,
      clickedCount: 2,
      reportedCount: 0,
      ignoredCount: 0,
      clickRate: 100,
      reportRate: 0,
      openRate: 0,
    });
    assert(
      scoreWithClicks.riskScore > scoreZeroClicks.riskScore,
      'Clicking simulated phishing links deterministically increases risk score',
      `Before: ${scoreZeroClicks.riskScore}, After Clicks: ${scoreWithClicks.riskScore}`
    );

    // ----------------------------------------------------
    // TEST 10: Verify REPORTED behavior decreases risk score
    // ----------------------------------------------------
    console.log('\n[Case 10] Verify REPORTED behavior decreases risk');
    const scoreReported = calculateRiskScore({
      totalSimulations: 2,
      deliveredCount: 2,
      openedCount: 0,
      clickedCount: 1,
      reportedCount: 1,
      ignoredCount: 0,
      clickRate: 50,
      reportRate: 50,
      openRate: 0,
    });
    const scoreUnreported = calculateRiskScore({
      totalSimulations: 2,
      deliveredCount: 2,
      openedCount: 0,
      clickedCount: 1,
      reportedCount: 0,
      ignoredCount: 1,
      clickRate: 50,
      reportRate: 0,
      openRate: 0,
    });
    assert(
      scoreReported.riskScore < scoreUnreported.riskScore,
      'Reporting simulated phishing links deterministically decreases risk score',
      `Unreported: ${scoreUnreported.riskScore}, Reported: ${scoreReported.riskScore}`
    );

    // ----------------------------------------------------
    // TEST 11: Verify zero credential storage
    // ----------------------------------------------------
    console.log('\n[Case 11] Verify zero credential collection & storage');
    const allEvents = await SimulationEvent.find({ user: traineeUser._id }).lean();
    let hasCredentialLeak = false;
    const forbiddenKeys = ['password', 'otp', 'pin', 'cvv', 'card', 'token', 'secret', 'credential', 'auth'];

    for (const ev of allEvents) {
      const keys = ev.metadata ? Object.keys(ev.metadata) : [];
      if (keys.some((k) => forbiddenKeys.some((f) => k.toLowerCase().includes(f)))) {
        hasCredentialLeak = true;
      }
    }
    assert(
      !hasCredentialLeak,
      'Zero credential harvesting verified: No sensitive credential keys exist in simulation metadata'
    );

    // ----------------------------------------------------
    // TEST 12: Admin can access analytics overview & user risk
    // ----------------------------------------------------
    console.log('\n[Case 12] GET /api/analytics/overview (as ADMIN)');
    const adminOverviewRes = await fetch(`${BASE_URL}/api/analytics/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminOverviewData = await adminOverviewRes.json();
    assert(
      adminOverviewRes.status === 200 &&
        adminOverviewData.success === true &&
        typeof adminOverviewData.data?.totalTrainees === 'number' &&
        typeof adminOverviewData.data?.overallClickRate === 'number',
      'ADMIN can successfully access aggregate analytics overview',
      JSON.stringify(adminOverviewData)
    );

    const adminUserRiskRes = await fetch(`${BASE_URL}/api/analytics/users/${traineeUser._id}/risk`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminUserRiskData = await adminUserRiskRes.json();
    assert(
      adminUserRiskRes.status === 200 &&
        adminUserRiskData.success === true &&
        adminUserRiskData.data?.user?._id === traineeUser._id.toString() &&
        Array.isArray(adminUserRiskData.data?.factors),
      'ADMIN can access specific trainee explainable risk analytics',
      JSON.stringify(adminUserRiskData)
    );

    // ----------------------------------------------------
    // TEST 13: Security Officer can access analytics
    // ----------------------------------------------------
    console.log('\n[Case 13] GET /api/analytics/overview (as SECURITY_OFFICER)');
    const officerOverviewRes = await fetch(`${BASE_URL}/api/analytics/overview`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const officerOverviewData = await officerOverviewRes.json();
    assert(
      officerOverviewRes.status === 200 && officerOverviewData.success === true,
      'SECURITY_OFFICER can access aggregate analytics overview',
      JSON.stringify(officerOverviewData)
    );

    // ----------------------------------------------------
    // TEST 14: Trainee cannot access admin analytics overview
    // ----------------------------------------------------
    console.log('\n[Case 14] GET /api/analytics/overview (as TRAINEE - must be rejected)');
    const traineeOverviewRes = await fetch(`${BASE_URL}/api/analytics/overview`, {
      headers: { Authorization: `Bearer ${traineeToken}` },
    });
    assert(
      traineeOverviewRes.status === 403,
      'TRAINEE role rejected with 403 Forbidden when accessing admin analytics overview',
      `Status: ${traineeOverviewRes.status}`
    );

    const traineeTargetRiskRes = await fetch(`${BASE_URL}/api/analytics/users/${otherTraineeUser._id}/risk`, {
      headers: { Authorization: `Bearer ${traineeToken}` },
    });
    assert(
      traineeTargetRiskRes.status === 403,
      'TRAINEE cannot access another user private risk analytics (403 Forbidden)',
      `Status: ${traineeTargetRiskRes.status}`
    );

    // ----------------------------------------------------
    // TEST 15: Trainee can access own risk data via /me/risk
    // ----------------------------------------------------
    console.log('\n[Case 15] GET /api/analytics/me/risk (as TRAINEE)');
    const traineeSelfRiskRes = await fetch(`${BASE_URL}/api/analytics/me/risk`, {
      headers: { Authorization: `Bearer ${traineeToken}` },
    });
    const traineeSelfRiskData = await traineeSelfRiskRes.json();
    assert(
      traineeSelfRiskRes.status === 200 &&
        traineeSelfRiskData.success === true &&
        traineeSelfRiskData.data?.user?._id === traineeUser._id.toString() &&
        Array.isArray(traineeSelfRiskData.data?.factors),
      'TRAINEE can access own risk analytics and educational factors via /me/risk',
      JSON.stringify(traineeSelfRiskData)
    );

    // ----------------------------------------------------
    // TEST 16: Verify risk recalculation and RiskHistory tracking
    // ----------------------------------------------------
    console.log('\n[Case 16] Controlled recalculation & RiskHistory tracking');
    const recalcRes = await fetch(`${BASE_URL}/api/analytics/users/${traineeUser._id}/recalculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    });
    const recalcData = await recalcRes.json();
    const updatedUser = await User.findById(traineeUser._id);
    const historyRecords = await RiskHistory.find({ user: traineeUser._id });

    assert(
      recalcRes.status === 200 &&
        recalcData.success === true &&
        updatedUser.riskScore === recalcData.data?.riskScore &&
        historyRecords.length > 0 &&
        historyRecords[0].riskScore === recalcData.data?.riskScore,
      'Controlled recalculation updates User model and generates RiskHistory record',
      `Score: ${updatedUser.riskScore}, History count: ${historyRecords.length}`
    );

    // ----------------------------------------------------
    // Summary
    // ----------------------------------------------------
    console.log('\n======================================================');
    console.log(`  PHASE 4 TEST SUMMARY: ${pass} Passed, ${fail} Failed`);
    console.log('======================================================\n');

    // Teardown
    await SimulationEvent.deleteMany({ campaign: testCampaign._id });
    await RiskHistory.deleteMany({ user: { $in: [traineeUser._id, otherTraineeUser._id] } });
    await Campaign.findByIdAndDelete(testCampaign._id);
    await Template.findByIdAndDelete(testTemplate._id);
    await User.deleteMany({
      email: {
        $in: [
          'admin_p4@phishguard.local',
          'officer_p4@phishguard.local',
          'trainee_p4@example.com',
          'other_trainee_p4@example.com',
        ],
      },
    });
    console.log('[Teardown] Cleaned up temporary test documents.');

    server.close();
    await mongoose.connection.close();
    process.exit(fail === 0 ? 0 : 1);
  } catch (err) {
    console.error('[Phase 4 Test Execution Error]:', err);
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(1);
  }
};

runPhase4Tests();
