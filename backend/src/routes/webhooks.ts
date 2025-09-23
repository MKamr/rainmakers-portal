import { Router, Request, Response } from 'express';
import { FirebaseService } from '../services/firebaseService';
import { GHLService } from '../services/ghlService';

const router = Router();

// Health check for webhook routes
router.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Webhook routes are active!', 
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/webhooks/',
      'GET /api/webhooks/test',
      'POST /api/webhooks/test', 
      'POST /api/webhooks/ghl',
      'GET /api/webhooks/diagnose'
    ]
  });
});

// Helper function to map GHL stage names to system stage names
function mapGHLStageToSystemStage(ghlStageName: string): string {
  const stageMap: Record<string, string> = {
    'Initial Qualification Stage': 'Qualification',
    'Needs Analysis Stage': 'Needs Analysis', 
    'Lender Submission Stage': 'Lender Submission',
    'Proposal Stage': 'Proposal',
    'Signed Proposal Stage': 'Signed Proposal',
    'Underwriting Stage': 'Underwriting',
    'Qualification': 'Qualification',
    'Needs Analysis': 'Needs Analysis',
    'Lender Submission': 'Lender Submission',
    'Proposal': 'Proposal',
    'Signed Proposal': 'Signed Proposal',
    'Underwriting': 'Underwriting'
  };
  
  // Handle exact matches first
  if (stageMap[ghlStageName]) {
    return stageMap[ghlStageName];
  }
  
  // Handle partial matches (case insensitive)
  const lowerStageName = ghlStageName.toLowerCase();
  for (const [ghlStage, systemStage] of Object.entries(stageMap)) {
    if (lowerStageName.includes(ghlStage.toLowerCase()) || ghlStage.toLowerCase().includes(lowerStageName)) {
      console.log(`🔄 [STAGE MAPPING] Matched "${ghlStageName}" to "${systemStage}"`);
      return systemStage;
    }
  }
  
  console.log(`⚠️ [STAGE MAPPING] No mapping found for stage: "${ghlStageName}", using as-is`);
  return ghlStageName;
}

// GHL Webhook endpoint for opportunity updates
router.post('/ghl', async (req: Request, res: Response) => {
  try {
    console.log('🔗 [GHL WEBHOOK] Received webhook:', JSON.stringify(req.body, null, 2));
    
    // Basic webhook validation (optional - can be enabled with GHL_WEBHOOK_SECRET)
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = req.headers['x-webhook-secret'] as string;
      if (providedSecret !== webhookSecret) {
        console.log('❌ [GHL WEBHOOK] Invalid webhook secret');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    
    // Handle both opportunity object and direct fields from GHL webhook
    let opportunity = req.body.opportunity || req.body;
    
    if (!opportunity || !opportunity.id) {
      console.log('❌ [GHL WEBHOOK] Invalid opportunity data received');
      return res.status(400).json({ error: 'Invalid opportunity data' });
    }
    
    // Get all deals and find the matching one
    const deals = await FirebaseService.getAllDeals();
    console.log('🔍 [GHL WEBHOOK] Looking for deal with opportunity name:', opportunity.name);
    
    // Find deal by opportunity name (dealId in Firebase)
    const deal = deals.find(d => d.dealId === opportunity.name);
    
    if (!deal) {
      console.log('⚠️ [GHL WEBHOOK] No deal found with opportunity name:', opportunity.name);
      return res.json({ 
        success: true, 
        message: 'Webhook received but no matching deal found',
        opportunityName: opportunity.name
      });
    }
    
    console.log('✅ [GHL WEBHOOK] Found deal:', deal.id, 'Current stage:', deal.stage);
    
    // Prepare updates from GHL opportunity
    const updates: any = {};
    
    // Update GHL opportunity ID if not already set
    if (!deal.ghlOpportunityId && opportunity.id) {
      updates.ghlOpportunityId = opportunity.id;
    }
    
    // Handle stage changes
    const stageField = opportunity.pipleline_stage || opportunity.pipeline_stage;
    if (stageField) {
      const ghlStageName = stageField;
      const currentStage = deal.stage;
      const normalizedStage = mapGHLStageToSystemStage(ghlStageName);
      
      if (currentStage !== normalizedStage) {
        updates.stage = normalizedStage;
        updates.stageLastUpdated = new Date().toISOString();
        console.log('🎯 [GHL WEBHOOK] Stage changed from:', currentStage, 'to:', normalizedStage);
      }
    }
    
    // Update other fields from GHL data
    if (opportunity.monetaryValue) updates.opportunityValue = opportunity.monetaryValue;
    if (opportunity.assignedTo) updates.owner = opportunity.assignedTo;
    if (opportunity.source) updates.opportunitySource = opportunity.source;
    if (opportunity.lostReason) updates.lostReason = opportunity.lostReason;
    
    // Handle custom fields if they exist
    if (opportunity.customFields) {
      const customFields = opportunity.customFields;
      if (customFields['opportunity.deal_type']) updates.dealType = customFields['opportunity.deal_type'];
      if (customFields['opportunity.property_type']) updates.propertyType = customFields['opportunity.property_type'];
      if (customFields['opportunity.property_address']) updates.propertyAddress = customFields['opportunity.property_address'];
      if (customFields['opportunity.property_vintage']) updates.propertyVintage = customFields['opportunity.property_vintage'];
      if (customFields['opportunity.sponsor_net_worth']) updates.sponsorNetWorth = customFields['opportunity.sponsor_net_worth'];
      if (customFields['opportunity.sponsor_liquidity']) updates.sponsorLiquidity = customFields['opportunity.sponsor_liquidity'];
      if (customFields['opportunity.loan_request']) updates.loanRequest = customFields['opportunity.loan_request'];
      if (customFields['opportunity.additional_information']) updates.additionalInformation = customFields['opportunity.additional_information'];
    }
    
    // Update the deal in Firebase
    if (Object.keys(updates).length > 0) {
      await FirebaseService.updateDeal(deal.id, updates);
      console.log('✅ [GHL WEBHOOK] Deal updated successfully');
    }
    
    res.json({ 
      success: true, 
      message: 'Deal updated successfully',
      dealId: deal.id,
      updates: updates
    });
  } catch (error) {
    console.error('❌ [GHL WEBHOOK] Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Test webhook endpoint (GET)
router.get('/test', (req: Request, res: Response) => {
  res.json({ 
    message: 'Webhook endpoint is working!', 
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  });
});

// Test webhook endpoint (POST) - for GHL testing
router.post('/test', (req: Request, res: Response) => {
  console.log('🧪 [TEST WEBHOOK] Received POST request:', JSON.stringify(req.body, null, 2));
  res.json({ 
    message: 'Webhook POST endpoint is working!', 
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    body: req.body
  });
});

// Diagnostic endpoint to check deals and their GHL IDs
router.get('/diagnose', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [DIAGNOSE] Getting all deals for diagnosis...');
    const deals = await FirebaseService.getAllDeals();
    
    const dealInfo = deals.map(deal => ({
      id: deal.id,
      dealId: deal.dealId,
      title: deal.title,
      stage: deal.stage,
      ghlOpportunityId: deal.ghlOpportunityId,
      ghlContactId: deal.ghlContactId,
      createdAt: deal.createdAt?.toDate?.() || deal.createdAt,
      hasGhlId: !!deal.ghlOpportunityId
    }));
    
    const dealsWithGhl = deals.filter(d => d.ghlOpportunityId);
    const dealsWithoutGhl = deals.filter(d => !d.ghlOpportunityId);
    
    res.json({
      message: 'Deal diagnosis completed',
      timestamp: new Date().toISOString(),
      summary: {
        totalDeals: deals.length,
        dealsWithGhlId: dealsWithGhl.length,
        dealsWithoutGhlId: dealsWithoutGhl.length
      },
      allDeals: dealInfo,
      ghlOpportunityIds: dealsWithGhl.map(d => d.ghlOpportunityId).filter(Boolean)
    });
  } catch (error) {
    console.error('❌ [DIAGNOSE] Error getting deals:', error);
    res.status(500).json({ error: 'Failed to get deals for diagnosis' });
  }
});

export default router;
