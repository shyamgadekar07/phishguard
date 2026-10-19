import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from '../app.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Template from '../models/Template.js';
import Campaign from '../models/Campaign.js';
import SimulationEvent from '../models/SimulationEvent.js';
import generateToken from '../utils/generateToken.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TEST_PORT = 5096;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let server;
let adminToken = '';
let officerToken = '';
let traineeToken = '';
let adminUser;
let trainee1;
let trainee2;
let inactiveTrainee;
let officerUser;
let templateId = '';

const runTraineeAssignmentTests = async () => {
  console.log('\n=============================================================');
  console.log('  PHISHGUARD TRAINEE ASSIGNMENT & TARGET VALIDATION SUITE     ');
  console.log('=============================================================\n');

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
        console.log(`  \x1b[31m[FAIL]\x1b[0m ${testName} - ${details || ''}`);
        fail++;
      }
    };

    // --- SETUP TEST USERS ---
    console.log('[Setup] Preparing test users...');

    // 1. Admin
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@phishguard.local').trim().toLowerCase();
    adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin User',
        email: adminEmail,
        password: 'AdminPassword123!',
        role: 'ADMIN',
        isActive: true,
      });
    }
    adminToken = generateToken(adminUser._id, 'ADMIN');

    // 2. Security Officer
    officerUser = await User.findOne({ email: 'officer_assign_test@phishguard.local' });
    if (!officerUser) {
      officerUser = await User.create({
        name: 'Officer Assign Test',
        email: 'officer_assign_test@phishguard.local',
        password: 'OfficerPassword123!',
        role: 'SECURITY_OFFICER',
        isActive: true,
      });
    }
    officerToken = generateToken(officerUser._id, 'SECURITY_OFFICER');

    // 3. Active Trainee 1
    trainee1 = await User.findOne({ email: 'trainee_assign1@phishguard.local' });
    if (!trainee1) {
      trainee1 = await User.create({
        name: 'Trainee One',
        email: 'trainee_assign1@phishguard.local',
        password: 'TraineePassword123!',
        role: 'TRAINEE',
        department: 'Engineering',
        isActive: true,
      });
    } else {
      trainee1.isActive = true;
      trainee1.role = 'TRAINEE';
      await trainee1.save();
    }
    traineeToken = generateToken(trainee1._id, 'TRAINEE');

    // 4. Active Trainee 2
    trainee2 = await User.findOne({ email: 'trainee_assign2@phishguard.local' });
    if (!trainee2) {
      trainee2 = await User.create({
        name: 'Trainee Two',
        email: 'trainee_assign2@phishguard.local',
        password: 'TraineePassword123!',
        role: 'TRAINEE',
        department: 'Finance',
        isActive: true,
      });
    } else {
      trainee2.isActive = true;
      trainee2.role = 'TRAINEE';
      await trainee2.save();
    }

    // 5. Inactive Trainee
    inactiveTrainee = await User.findOne({ email: 'trainee_inactive@phishguard.local' });
    if (!inactiveTrainee) {
      inactiveTrainee = await User.create({
        name: 'Inactive Trainee',
        email: 'trainee_inactive@phishguard.local',
        password: 'TraineePassword123!',
        role: 'TRAINEE',
        department: 'Sales',
        isActive: false,
      });
    } else {
      inactiveTrainee.isActive = false;
      await inactiveTrainee.save();
    }

    // 6. Test Template
    let template = await Template.findOne({ name: 'Trainee Assignment Test Template' });
    if (!template) {
      template = await Template.create({
        name: 'Trainee Assignment Test Template',
        channel: 'EMAIL',
        subject: 'Security Alert: Password Verification',
        content: 'Click here to verify: {{tracking_link}}',
        difficulty: 'MEDIUM',
        createdBy: adminUser._id,
        isActive: true,
      });
    }
    templateId = template._id.toString();

    // ----------------------------------------------------
    // TEST GROUP 1: Authorization & Listing
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 1: Trainee Listing Authorization ---');

    // 1. Unauthenticated listing rejected
    const unauthRes = await fetch(`${BASE_URL}/api/analytics/users`);
    assert(
      unauthRes.status === 401,
      'Unauthenticated request to list trainees is rejected with 401 Unauthorized',
      `Status: ${unauthRes.status}`
    );

    // 2. Trainee role listing rejected
    const traineeListRes = await fetch(`${BASE_URL}/api/analytics/users`, {
      headers: { Authorization: `Bearer ${traineeToken}` },
    });
    assert(
      traineeListRes.status === 403,
      'Trainee role requesting trainee list is rejected with 403 Forbidden',
      `Status: ${traineeListRes.status}`
    );

    // 3. Admin role listing succeeds
    const adminListRes = await fetch(`${BASE_URL}/api/analytics/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminListData = await adminListRes.json();
    assert(
      adminListRes.status === 200 &&
        adminListData.success === true &&
        Array.isArray(adminListData.data?.trainees),
      'Admin can list trainees via authorized /api/analytics/users endpoint',
      `Status: ${adminListRes.status}`
    );

    // 4. Verify listed trainees only have TRAINEE role
    const listedTrainees = adminListData.data?.trainees || [];
    const containsOnlyTrainees = listedTrainees.every(
      (t) => !t.role || t.role === 'TRAINEE'
    );
    assert(
      containsOnlyTrainees && listedTrainees.length >= 2,
      'Endpoint returns trainee profiles with id, name, and email',
      `Count: ${listedTrainees.length}`
    );

    // 5. Trainee role creating campaign rejected
    const traineeCreateRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${traineeToken}`,
      },
      body: JSON.stringify({
        name: 'Forbidden Trainee Campaign',
        template: templateId,
        channel: 'EMAIL',
        targets: [trainee1._id.toString()],
      }),
    });
    assert(
      traineeCreateRes.status === 403,
      'Trainee role cannot create campaigns or assign targets (403 Forbidden)',
      `Status: ${traineeCreateRes.status}`
    );

    // ----------------------------------------------------
    // TEST GROUP 2: Campaign Creation with Targets
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 2: Campaign Creation & Target Assignment ---');

    let singleTargetCampaignId = '';
    let multiTargetCampaignId = '';
    let zeroTargetCampaignId = '';

    // 6. Campaign creation with 1 valid trainee
    const create1Res = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Single Target Drill',
        description: 'Single trainee campaign test',
        template: templateId,
        channel: 'EMAIL',
        status: 'DRAFT',
        targets: [trainee1._id.toString()],
      }),
    });
    const create1Data = await create1Res.json();
    singleTargetCampaignId = create1Data.data?.campaign?._id;
    assert(
      create1Res.status === 201 &&
        create1Data.success === true &&
        create1Data.data?.campaign?.targets?.length === 1 &&
        create1Data.data?.campaign?.status === 'DRAFT',
      'Campaign creation with one valid trainee succeeds with targets: [id] and status DRAFT',
      JSON.stringify(create1Data)
    );

    // 7. Campaign creation with multiple valid trainees
    const createMultiRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Multi Target Drill',
        description: 'Multiple trainees campaign test',
        template: templateId,
        channel: 'EMAIL',
        status: 'DRAFT',
        targets: [trainee1._id.toString(), trainee2._id.toString()],
      }),
    });
    const createMultiData = await createMultiRes.json();
    multiTargetCampaignId = createMultiData.data?.campaign?._id;
    assert(
      createMultiRes.status === 201 &&
        createMultiData.success === true &&
        createMultiData.data?.campaign?.targets?.length === 2 &&
        createMultiData.data?.campaign?.status === 'DRAFT',
      'Campaign creation with multiple valid trainees succeeds with targets: [id1, id2]',
      JSON.stringify(createMultiData)
    );

    // 8. Empty selection handled safely (creates DRAFT with 0 targets)
    const createZeroRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Zero Target Draft Drill',
        description: 'Draft with empty targets test',
        template: templateId,
        channel: 'EMAIL',
        status: 'DRAFT',
        targets: [],
      }),
    });
    const createZeroData = await createZeroRes.json();
    zeroTargetCampaignId = createZeroData.data?.campaign?._id;
    assert(
      createZeroRes.status === 201 &&
        createZeroData.success === true &&
        createZeroData.data?.campaign?.targets?.length === 0,
      'Empty selection (targets: []) is handled safely, creating a DRAFT campaign with 0 targets',
      JSON.stringify(createZeroData)
    );

    // ----------------------------------------------------
    // TEST GROUP 3: Target Validation & Launch Enforcement
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 3: Launch Gatekeeping & Target Validation ---');

    // 9. Launch blocked on 0 targets
    const launchZeroRes = await fetch(`${BASE_URL}/api/campaigns/${zeroTargetCampaignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'RUNNING',
      }),
    });
    const launchZeroData = await launchZeroRes.json();
    assert(
      launchZeroRes.status === 400 &&
        launchZeroData.message?.includes('at least one target trainee'),
      'Launching a zero-target campaign is blocked with 400 Bad Request',
      `Status: ${launchZeroRes.status}, Message: ${launchZeroData.message}`
    );

    // 10. Creation directly as RUNNING with 0 targets is blocked
    const directRunningZeroRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Direct Running Zero Target',
        template: templateId,
        channel: 'EMAIL',
        status: 'RUNNING',
        targets: [],
      }),
    });
    const directRunningZeroData = await directRunningZeroRes.json();
    assert(
      directRunningZeroRes.status === 400 &&
        directRunningZeroData.message?.includes('at least one target trainee'),
      'Direct creation as RUNNING with 0 targets is blocked with 400 Bad Request',
      `Status: ${directRunningZeroRes.status}`
    );

    // 11. Malformed target ID rejected
    const malformedIdRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Malformed Target ID Test',
        template: templateId,
        channel: 'EMAIL',
        targets: ['not-a-valid-mongo-id'],
      }),
    });
    const malformedIdData = await malformedIdRes.json();
    assert(
      malformedIdRes.status === 400 &&
        malformedIdData.message?.includes('Invalid target user identifier format'),
      'Invalid target ID format is rejected with 400 Bad Request',
      JSON.stringify(malformedIdData)
    );

    // 12. Non-existent target ID rejected
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const nonExistentRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Non-existent Target Test',
        template: templateId,
        channel: 'EMAIL',
        targets: [nonExistentId],
      }),
    });
    const nonExistentData = await nonExistentRes.json();
    assert(
      nonExistentRes.status === 400 &&
        nonExistentData.message?.includes('could not be found in the database'),
      'Non-existent target user ID is rejected with 400 Bad Request',
      JSON.stringify(nonExistentData)
    );

    // 13. Inactive target user rejected
    const inactiveTargetRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Inactive Target Test',
        template: templateId,
        channel: 'EMAIL',
        targets: [inactiveTrainee._id.toString()],
      }),
    });
    const inactiveTargetData = await inactiveTargetRes.json();
    assert(
      inactiveTargetRes.status === 400 &&
        inactiveTargetData.message?.includes('is inactive and cannot be enrolled'),
      'Inactive target user is rejected with 400 Bad Request',
      JSON.stringify(inactiveTargetData)
    );

    // 14. Non-TRAINEE target (ADMIN / SECURITY_OFFICER) rejected
    const nonTraineeTargetRes = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Non-Trainee Target Test',
        template: templateId,
        channel: 'EMAIL',
        targets: [adminUser._id.toString()],
      }),
    });
    const nonTraineeTargetData = await nonTraineeTargetRes.json();
    assert(
      nonTraineeTargetRes.status === 400 &&
        nonTraineeTargetData.message?.includes('is not a TRAINEE'),
      'Non-TRAINEE target (e.g. ADMIN) is rejected with 400 Bad Request',
      JSON.stringify(nonTraineeTargetData)
    );

    // ----------------------------------------------------
    // TEST GROUP 4: Target Editing & Successful Launch
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 4: Target Editing & Successful Launch ---');

    // 15. Update targets on draft campaign
    const updateTargetsRes = await fetch(`${BASE_URL}/api/campaigns/${zeroTargetCampaignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        targets: [trainee1._id.toString(), trainee2._id.toString()],
      }),
    });
    const updateTargetsData = await updateTargetsRes.json();
    assert(
      updateTargetsRes.status === 200 &&
        updateTargetsData.data?.campaign?.targets?.length === 2,
      'PUT /api/campaigns/:id successfully updates targets on a draft campaign',
      JSON.stringify(updateTargetsData)
    );

    // 16. Updating targets with non-TRAINEE user is rejected
    const badUpdateTargetsRes = await fetch(`${BASE_URL}/api/campaigns/${zeroTargetCampaignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        targets: [officerUser._id.toString()],
      }),
    });
    const badUpdateTargetsData = await badUpdateTargetsRes.json();
    assert(
      badUpdateTargetsRes.status === 400 &&
        badUpdateTargetsData.message?.includes('is not a TRAINEE'),
      'PUT /api/campaigns/:id rejects assigning non-TRAINEE targets with 400 Bad Request',
      JSON.stringify(badUpdateTargetsData)
    );

    // 17. Launching after valid target assignment succeeds
    const launchAfterAssignRes = await fetch(`${BASE_URL}/api/campaigns/${zeroTargetCampaignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'RUNNING',
      }),
    });
    const launchAfterAssignData = await launchAfterAssignRes.json();
    assert(
      launchAfterAssignRes.status === 200 &&
        launchAfterAssignData.data?.campaign?.status === 'RUNNING',
      'Launching campaign succeeds once valid trainees are assigned',
      JSON.stringify(launchAfterAssignData)
    );

    // 18. Verify simulation events generated for assigned trainees
    const simEvents = await SimulationEvent.find({ campaign: zeroTargetCampaignId });
    assert(
      simEvents.length === 2 &&
        simEvents.every((e) => e.eventType === 'DELIVERED' && e.trackingId),
      'DELIVERED simulation tracking events generated for each enrolled trainee upon launch',
      `Count: ${simEvents.length}`
    );

    // --- TEARDOWN ---
    console.log('\n[Teardown] Cleaning up temporary test campaigns & events...');
    await SimulationEvent.deleteMany({
      campaign: {
        $in: [singleTargetCampaignId, multiTargetCampaignId, zeroTargetCampaignId].filter(Boolean),
      },
    });
    await Campaign.deleteMany({
      _id: {
        $in: [singleTargetCampaignId, multiTargetCampaignId, zeroTargetCampaignId].filter(Boolean),
      },
    });
    await Template.findByIdAndDelete(templateId);
    await User.deleteMany({
      email: {
        $in: [
          'officer_assign_test@phishguard.local',
          'trainee_assign1@phishguard.local',
          'trainee_assign2@phishguard.local',
          'trainee_inactive@phishguard.local',
        ],
      },
    });

    console.log('\n=============================================================');
    console.log(`  RESULTS: ${pass} Passed, ${fail} Failed`);
    console.log('=============================================================\n');

    server.close();
    await mongoose.connection.close();
    process.exit(fail === 0 ? 0 : 1);
  } catch (err) {
    console.error('[Trainee Assignment Test Error]:', err);
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(1);
  }
};

runTraineeAssignmentTests();
