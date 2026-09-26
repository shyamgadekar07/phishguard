import SimulationEvent from '../models/SimulationEvent.js';
import Campaign from '../models/Campaign.js';
import Template from '../models/Template.js';

/**
 * @route   GET /api/simulation/:trackingId
 * @desc    Process clicked simulation link safely and present security awareness guidance
 * @access  Public (Simulation link)
 */
export const handleSimulationClick = async (req, res, next) => {
  try {
    const { trackingId } = req.params;

    if (!trackingId || trackingId.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid simulation tracking identifier',
      });
    }

    // 1. Find simulation event
    const event = await SimulationEvent.findOne({ trackingId })
      .populate('campaign', 'name channel status')
      .populate('template', 'name channel difficulty subject');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Simulation tracking link not found or expired',
      });
    }

    // 2. Safely record CLICKED event
    event.eventType = 'CLICKED';
    event.timestamp = new Date();
    event.metadata.set('ipAddress', req.ip || req.headers['x-forwarded-for'] || '127.0.0.1');
    event.metadata.set('userAgent', req.headers['user-agent'] || 'Unknown Browser');
    event.metadata.set('clickedAt', new Date().toISOString());

    await event.save();

    const awarenessData = {
      simulationTitle: 'PhishGuard Security Awareness Simulation',
      isSimulated: true,
      message: 'This was an authorized simulated phishing test for cybersecurity awareness training.',
      campaignName: event.campaign?.name || 'Awareness Campaign',
      channel: event.template?.channel || 'EMAIL',
      difficulty: event.template?.difficulty || 'LOW',
      eventLogged: 'CLICKED',
      redFlags: [
        'Unexpected communication with urgent requests or deadlines',
        'Unverified links or external redirects attempting to prompt action',
        'Suspicious or mismatching sender information and domain names',
        'Generic greetings or unusual language patterns',
      ],
      securityGuidance: [
        'Never submit passwords, OTPs, or financial details into links received in messages.',
        'Verify suspicious requests through an independent, official communication channel.',
        'Report potential phishing attempts to your organization cybersecurity team immediately.',
      ],
      timestamp: event.timestamp,
    };

    // If request accepts HTML (direct browser click), return clean awareness landing page
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PhishGuard Awareness Training</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0b132b; color: #f8fafc; margin: 0; padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background-color: #1c2541; border: 1px solid #3a506b; border-radius: 16px; max-width: 640px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background-color: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; text-transform: uppercase; }
    h1 { font-size: 24px; font-weight: 800; margin: 0 0 12px; color: #ffffff; }
    p { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 20px; }
    .section-title { font-size: 15px; font-weight: 700; color: #60a5fa; margin: 20px 0 8px; }
    ul { margin: 0; padding-left: 20px; color: #e2e8f0; font-size: 13px; line-height: 1.8; }
    .notice { margin-top: 24px; padding: 14px; background-color: #0b132b; border-radius: 8px; border-left: 4px solid #3b82f6; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">PhishGuard Security Simulation</div>
    <h1>${awarenessData.simulationTitle}</h1>
    <p>${awarenessData.message}</p>
    
    <div class="section-title">Critical Red Flags in this Simulation:</div>
    <ul>
      ${awarenessData.redFlags.map((flag) => `<li>${flag}</li>`).join('')}
    </ul>

    <div class="section-title">Safe Cybersecurity Guidelines:</div>
    <ul>
      ${awarenessData.securityGuidance.map((g) => `<li>${g}</li>`).join('')}
    </ul>

    <div class="notice">
      <strong>Zero Credential Harvesting:</strong> No passwords or private credentials were collected. This simulation was conducted strictly for authorized awareness evaluation.
    </div>
  </div>
</body>
</html>
      `;
      return res.status(200).send(html);
    }

    return res.status(200).json({
      success: true,
      message: 'Simulation tracking recorded safely. Displaying educational debrief.',
      data: awarenessData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/simulation/:trackingId/report
 * @desc    Simulate user reporting the suspicious link as phishing
 * @access  Public (Simulation link)
 */
export const handleSimulationReport = async (req, res, next) => {
  try {
    const { trackingId } = req.params;

    const event = await SimulationEvent.findOne({ trackingId });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Simulation tracking link not found',
      });
    }

    event.eventType = 'REPORTED';
    event.timestamp = new Date();
    event.metadata.set('reportedAt', new Date().toISOString());
    await event.save();

    return res.status(200).json({
      success: true,
      message: 'Great job! You successfully identified and reported a simulated phishing attempt.',
      data: {
        eventType: 'REPORTED',
        trackingId: event.trackingId,
        timestamp: event.timestamp,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  handleSimulationClick,
  handleSimulationReport,
};
