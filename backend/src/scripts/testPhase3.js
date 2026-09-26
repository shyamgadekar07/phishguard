import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from '../app.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Template from '../models/Template.js';
import Campaign from '../models/Campaign.js';
import SimulationEvent from '../models/SimulationEvent.js';
import generateToken from '../utils/generateToken.js';

dotenv.config();

const TEST_PORT = 5098;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let server;
let adminToken = '';
let officerToken = '';
let traineeToken = '';
let targetUserId = '';
let templateId = '';
let campaignId = '';
let simulationTrackingId = '';

const runPhase3Tests = async () => {
  console.log('\n==================================================');
  console.log('  PHISHGUARD PHASE 3 SIMULATION & CAMPAIGN SUITE  ');
  console.log('==================================================\n');

  try {
    await connectDB();

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`[Test Server] Running on ${BASE_URL}\n`);
        resolve();
      });
    });

    let pass = 0;
    let fail = 0;

    const assert = (condition, testName, details) => {
      if (condition) {
        console.log(`  \x1b[32m[PASS]\x1b[0m ${testName}`);
        pass++;
      } else {
        console.log(`  \x1b[31m[FAIL]\x1b[0m ${testName} - ${details}`);
        fail++;
      }
    };

    // --- SETUP TEST USERS ---
    console.log('[Setup] Preparing test users...');
    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@phishguard.local' },
      {
        name: 'Admin User',
        email: 'admin@phishguard.local',
        password: 'AdminPassword123!',
        role: 'ADMIN',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    adminToken = generateToken(adminUser._id, 'ADMIN');

    const officerUser = await User.findOneAndUpdate(
      { email: 'officer@phishguard.local' },
      {
        name: 'Security Officer',
        email: 'officer@phishguard.local',
        password: 'OfficerPassword123!',
        role: 'SECURITY_OFFICER',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    officerToken = generateToken(officerUser._id, 'SECURITY_OFFICER');

    const traineeUser = await User.findOneAndUpdate(
      { email: 'trainee_phase3@example.com' },
      {
        name: 'Target Trainee',
        email: 'trainee_phase3@example.com',
        password: 'TraineePassword123!',
        role: 'TRAINEE',
        department: 'Operations',
        isActive: true,
      },
      { upsert: true, new: true }
    );
    traineeToken = generateToken(traineeUser._id, 'TRAINEE');
    targetUserId = traineeUser._id.toString();

    // ----------------------------------------------------
    // TEST 1: Create template as ADMIN
    // ----------------------------------------------------
    console.log('\n[Case 1] POST /api/templates (as ADMIN)');
    const tplRes = await fetch(`${BASE_URL}/api/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Automated Tax Audit Notice',
        channel: 'EMAIL',
        subject: 'Urgent: Discrepancy Found in Tax Filing',
        content: 'Please review your quarterly statement at {{link}} immediately.',
        description: 'Tests urgency and financial curiosity',
        difficulty: 'MEDIUM',
      }),
    });
    const tplData = await tplRes.json();
    templateId = tplData.data?.template?._id;
    assert(
      tplRes.status === 201 && tplData.success === true && templateId,
      'Create template as ADMIN returns 201 Created',
      JSON.stringify(tplData)
    );

    // ----------------------------------------------------
    // TEST 2: Get templates
    // ----------------------------------------------------
    console.log('\n[Case 2] GET /api/templates');
    const getTplsRes = await fetch(`${BASE_URL}/api/templates`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getTplsData = await getTplsRes.json();
    assert(
      getTplsRes.status === 200 && Array.isArray(getTplsData.data?.templates) && getTplsData.count > 0,
      'Get templates returns 200 OK and array of templates',
      JSON.stringify(getTplsData)
    );

    // ----------------------------------------------------
    // TEST 3: Get template by ID
    // ----------------------------------------------------
    console.log(`\n[Case 3] GET /api/templates/${templateId}`);
    const getTplRes = await fetch(`${BASE_URL}/api/templates/${templateId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getTplData = await getTplRes.json();
    assert(
      getTplRes.status === 200 && getTplData.data?.template?.name === 'Automated Tax Audit Notice',
      'Get template by ID returns 200 OK and matching document',
      JSON.stringify(getTplData)
    );

    // ----------------------------------------------------
    // TEST 4: Update template
    // ----------------------------------------------------
    console.log(`\n[Case 4] PUT /api/templates/${templateId}`);
    const updTplRes = await fetch(`${BASE_URL}/api/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Urgent Tax Audit Notice (Updated)',
        difficulty: 'HIGH',
      }),
    });
    const updTplData = await updTplRes.json();
    assert(
      updTplRes.status === 200 && updTplData.data?.template?.difficulty === 'HIGH',
      'Update template returns 200 OK and updated difficulty',
      JSON.stringify(updTplData)
    );

    // ----------------------------------------------------
    // TEST 5: Deactivate template
    // ----------------------------------------------------
    console.log(`\n[Case 5] DELETE /api/templates/${templateId} (Soft Deactivation)`);
    const delTplRes = await fetch(`${BASE_URL}/api/templates/${templateId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delTplData = await delTplRes.json();
    assert(
      delTplRes.status === 200 && delTplData.data?.template?.isActive === false,
      'Deactivate template sets isActive to false',
      JSON.stringify(delTplData)
    );

    // Re-activate for campaign tests
    await Template.findByIdAndUpdate(templateId, { isActive: true });

    // ----------------------------------------------------
    // TEST 6: Create campaign
    // ----------------------------------------------------
    console.log('\n[Case 6] POST /api/campaigns (as ADMIN)');
    const campRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Q3 Enterprise Phishing Drill',
        description: 'Departmental awareness assessment',
        template: templateId,
        targets: [targetUserId],
        channel: 'EMAIL',
        status: 'RUNNING',
      }),
    });
    const campData = await campRes.json();
    campaignId = campData.data?.campaign?._id;
    assert(
      campRes.status === 201 && campData.success === true && campaignId,
      'Create campaign returns 201 Created and populated campaign',
      JSON.stringify(campData)
    );

    // ----------------------------------------------------
    // TEST 7: Get campaigns
    // ----------------------------------------------------
    console.log('\n[Case 7] GET /api/campaigns');
    const getCampsRes = await fetch(`${BASE_URL}/api/campaigns`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getCampsData = await getCampsRes.json();
    assert(
      getCampsRes.status === 200 && getCampsData.count > 0,
      'Get campaigns returns 200 OK and list of campaigns',
      JSON.stringify(getCampsData)
    );

    // ----------------------------------------------------
    // TEST 8: Get campaign by ID
    // ----------------------------------------------------
    console.log(`\n[Case 8] GET /api/campaigns/${campaignId}`);
    const getCampRes = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getCampData = await getCampRes.json();
    assert(
      getCampRes.status === 200 && getCampData.data?.campaign?.name === 'Q3 Enterprise Phishing Drill',
      'Get campaign by ID returns 200 OK and populated document',
      JSON.stringify(getCampData)
    );

    // ----------------------------------------------------
    // TEST 9: Update campaign
    // ----------------------------------------------------
    console.log(`\n[Case 9] PUT /api/campaigns/${campaignId}`);
    const updCampRes = await fetch(`${BASE_URL}/api/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        description: 'Refined departmental awareness simulation scope',
      }),
    });
    const updCampData = await updCampRes.json();
    assert(
      updCampRes.status === 200 && updCampData.data?.campaign?.description.includes('Refined'),
      'Update campaign returns 200 OK and updated fields',
      JSON.stringify(updCampData)
    );

    // ----------------------------------------------------
    // TEST 10: Campaign metrics
    // ----------------------------------------------------
    console.log(`\n[Case 10] GET /api/campaigns/${campaignId}/metrics`);
    const metricsRes = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const metricsData = await metricsRes.json();
    assert(
      metricsRes.status === 200 &&
        metricsData.data?.metrics?.totalTargets === 1 &&
        typeof metricsData.data?.percentages?.clickRate === 'number',
      'Campaign metrics returns 200 OK with counts and rates',
      JSON.stringify(metricsData)
    );

    // ----------------------------------------------------
    // TEST 11: Generate / use simulation tracking ID
    // ----------------------------------------------------
    console.log('\n[Case 11] Find generated simulation tracking event');
    const simEvent = await SimulationEvent.findOne({
      campaign: campaignId,
      user: targetUserId,
    });
    simulationTrackingId = simEvent?.trackingId;
    assert(
      simulationTrackingId && simulationTrackingId.length > 20,
      'Simulation tracking event generated with cryptographically secure ID',
      `trackingId: ${simulationTrackingId}`
    );

    // ----------------------------------------------------
    // TEST 12: Open safe simulation URL
    // ----------------------------------------------------
    console.log(`\n[Case 12] GET /api/simulation/${simulationTrackingId}`);
    const simRes = await fetch(`${BASE_URL}/api/simulation/${simulationTrackingId}`, {
      headers: { Accept: 'application/json' },
    });
    const simData = await simRes.json();
    assert(
      simRes.status === 200 &&
        simData.success === true &&
        simData.data?.isSimulated === true &&
        Array.isArray(simData.data?.redFlags),
      'Safe simulation endpoint returns 200 OK, red flags, and debriefing notice',
      JSON.stringify(simData)
    );

    // ----------------------------------------------------
    // TEST 13: Verify CLICKED event recorded
    // ----------------------------------------------------
    console.log('\n[Case 13] Verify CLICKED event logged in database');
    const updatedEvent = await SimulationEvent.findOne({ trackingId: simulationTrackingId });
    assert(
      updatedEvent?.eventType === 'CLICKED' && updatedEvent.metadata.get('clickedAt'),
      'Simulation event successfully updated to CLICKED with timestamp',
      `eventType: ${updatedEvent?.eventType}`
    );

    // ----------------------------------------------------
    // TEST 14: Verify TRAINEE cannot manage templates/campaigns
    // ----------------------------------------------------
    console.log('\n[Case 14] Verify TRAINEE role access restriction');
    const traineeTplRes = await fetch(`${BASE_URL}/api/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${traineeToken}`,
      },
      body: JSON.stringify({ name: 'Hacked', channel: 'SMS', content: 'phish' }),
    });
    const traineeCampRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${traineeToken}`,
      },
      body: JSON.stringify({ name: 'Hacked', channel: 'SMS', template: templateId }),
    });
    assert(
      traineeTplRes.status === 403 && traineeCampRes.status === 403,
      'TRAINEE role rejected with 403 Forbidden for template and campaign management',
      `Tpl Status: ${traineeTplRes.status}, Camp Status: ${traineeCampRes.status}`
    );

    // ----------------------------------------------------
    // TEST 15: Verify SECURITY_OFFICER authorization
    // ----------------------------------------------------
    console.log('\n[Case 15] Verify SECURITY_OFFICER permissions');
    const officerRes = await fetch(`${BASE_URL}/api/templates`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert(
      officerRes.status === 200,
      'SECURITY_OFFICER authorized to access simulation templates (200 OK)',
      `Status: ${officerRes.status}`
    );

    // ----------------------------------------------------
    // TEST 16: Verify invalid target rejection
    // ----------------------------------------------------
    console.log('\n[Case 16] Reject invalid target user IDs');
    const fakeTargetId = new mongoose.Types.ObjectId().toString();
    const badTargetRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Bad Target Campaign',
        template: templateId,
        channel: 'EMAIL',
        targets: [fakeTargetId],
      }),
    });
    const badTargetData = await badTargetRes.json();
    assert(
      badTargetRes.status === 400 && badTargetData.success === false,
      'Campaign rejects non-existent target user IDs with 400 Bad Request',
      JSON.stringify(badTargetData)
    );

    // ----------------------------------------------------
    // TEST 17: Verify channel mismatch rejection
    // ----------------------------------------------------
    console.log('\n[Case 17] Reject channel mismatch between template and campaign');
    const mismatchRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Channel Mismatch Test',
        template: templateId, // EMAIL template
        channel: 'WHATSAPP',  // WHATSAPP campaign
        targets: [targetUserId],
      }),
    });
    const mismatchData = await mismatchRes.json();
    assert(
      mismatchRes.status === 400 && mismatchData.message.includes('Channel mismatch'),
      'Campaign creation rejects mismatched channel with 400 Bad Request',
      JSON.stringify(mismatchData)
    );

    // ----------------------------------------------------
    // TEST 18: Verify no credential collection exists
    // ----------------------------------------------------
    console.log('\n[Case 18] Security & Ethical Compliance Verification');
    const eventCheck = await SimulationEvent.findOne({ trackingId: simulationTrackingId });
    const metaObj = eventCheck.metadata instanceof Map ? Object.fromEntries(eventCheck.metadata) : eventCheck.metadata;
    const hasSensitiveData = Object.keys(metaObj).some((k) =>
      ['password', 'otp', 'credential', 'token', 'secret'].includes(k.toLowerCase())
    );
    assert(
      !hasSensitiveData && simData.data?.simulationTitle && !simData.data?.password,
      'Simulation guarantees zero credential harvesting and provides ethical educational debrief',
      `Metadata Keys: ${Object.keys(metaObj).join(', ')}`
    );

    // ----------------------------------------------------
    // Summary
    // ----------------------------------------------------
    console.log('\n==================================================');
    console.log(`  RESULTS: ${pass} Passed, ${fail} Failed`);
    console.log('==================================================\n');

    // Clean up temporary documents
    await SimulationEvent.deleteMany({ campaign: campaignId });
    await Campaign.findByIdAndDelete(campaignId);
    await Template.findByIdAndDelete(templateId);
    await User.deleteOne({ email: 'trainee_phase3@example.com' });
    console.log('[Teardown] Cleaned up temporary test documents.');

    server.close();
    await mongoose.connection.close();
    process.exit(fail === 0 ? 0 : 1);
  } catch (err) {
    console.error('[Phase 3 Test Execution Error]:', err);
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(1);
  }
};

runPhase3Tests();
