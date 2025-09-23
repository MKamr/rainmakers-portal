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
      'POST /api/webhooks/ghl'
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
  
  return stageMap[ghlStageName] || ghlStageName;
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
    
    const { opportunity } = req.body;
    
    if (!opportunity || !opportunity.id) {
      console.log('❌ [GHL WEBHOOK] Invalid opportunity data received');
      return res.status(400).json({ error: 'Invalid opportunity data' });
    }
    
    // Find the deal by GHL opportunity ID
    const deals = await FirebaseService.getAllDeals();
    const deal = deals.find(d => d.ghlOpportunityId === opportunity.id);
    
    if (!deal) {
      console.log('⚠️ [GHL WEBHOOK] No deal found with GHL opportunity ID:', opportunity.id);
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    console.log('✅ [GHL WEBHOOK] Found deal:', deal.id);
    
    // Prepare updates from GHL opportunity
    const updates: any = {};
    
    // Update basic fields
    if (opportunity.name) updates.opportunityName = opportunity.name;
    if (opportunity.status) updates.status = opportunity.status;
    if (opportunity.pipelineId) updates.pipeline = opportunity.pipelineId;
    
    // Handle stage changes - fetch stage name from GHL if stage ID is provided
    if (opportunity.pipelineStageId && opportunity.pipelineId) {
      try {
        console.log('🔄 [GHL WEBHOOK] Processing stage change for opportunity:', opportunity.id);
        console.log('🔄 [GHL WEBHOOK] Pipeline ID:', opportunity.pipelineId, 'Stage ID:', opportunity.pipelineStageId);
        
        // Check if stage actually changed
        const currentStage = deal.stage;
        const stageName = await GHLService.getStageNameById(opportunity.pipelineId, opportunity.pipelineStageId);
        
        if (stageName) {
          const normalizedStage = mapGHLStageToSystemStage(stageName);
          
          // Only update if stage actually changed
          if (currentStage !== normalizedStage) {
            updates.stage = normalizedStage;
            updates.stageLastUpdated = new Date().toISOString();
            console.log('🎯 [GHL WEBHOOK] Stage changed from:', currentStage, 'to:', normalizedStage);
            console.log('🎯 [GHL WEBHOOK] GHL stage name:', stageName, '-> System stage:', normalizedStage);
          } else {
            console.log('ℹ️ [GHL WEBHOOK] Stage unchanged:', normalizedStage);
          }
        } else {
          console.log('⚠️ [GHL WEBHOOK] Could not fetch stage name for ID:', opportunity.pipelineStageId);
          // Fallback to using the stage ID as is
          updates.stage = opportunity.pipelineStageId;
        }
      } catch (error) {
        console.error('❌ [GHL WEBHOOK] Error fetching stage name:', error);
        // Fallback to using the stage ID as is
        updates.stage = opportunity.pipelineStageId;
      }
    }
    
    if (opportunity.monetaryValue) updates.opportunityValue = opportunity.monetaryValue;
    if (opportunity.assignedTo) updates.owner = opportunity.assignedTo;
    if (opportunity.source) updates.opportunitySource = opportunity.source;
    if (opportunity.lostReason) updates.lostReason = opportunity.lostReason;
    
    // Handle custom fields if they exist
    if (opportunity.customFields) {
      const customFields = opportunity.customFields;
      
      // Map GHL custom fields to our deal fields
      if (customFields['opportunity.deal_type']) updates.dealType = customFields['opportunity.deal_type'];
      if (customFields['opportunity.property_type']) updates.propertyType = customFields['opportunity.property_type'];
      if (customFields['opportunity.property_address']) updates.propertyAddress = customFields['opportunity.property_address'];
      if (customFields['opportunity.property_vintage']) updates.propertyVintage = customFields['opportunity.property_vintage'];
      if (customFields['opportunity.sponsor_net_worth']) updates.sponsorNetWorth = customFields['opportunity.sponsor_net_worth'];
      if (customFields['opportunity.sponsor_liquidity']) updates.sponsorLiquidity = customFields['opportunity.sponsor_liquidity'];
      if (customFields['opportunity.loan_request']) updates.loanRequest = customFields['opportunity.loan_request'];
      if (customFields['opportunity.additional_information']) updates.additionalInformation = customFields['opportunity.additional_information'];
      if (customFields['opportunity.call_center_employee']) updates.callCenterEmployee = customFields['opportunity.call_center_employee'];
      if (customFields['opportunity.mondaycom_item_id']) updates.mondaycomItemId = customFields['opportunity.mondaycom_item_id'];
    }
    
    // Update the deal in Firebase
    if (Object.keys(updates).length > 0) {
      console.log('🔄 [GHL WEBHOOK] Updating deal with changes:', JSON.stringify(updates, null, 2));
      await FirebaseService.updateDeal(deal.id, updates);
      console.log('✅ [GHL WEBHOOK] Deal updated successfully');
    } else {
      console.log('ℹ️ [GHL WEBHOOK] No relevant changes to sync');
    }
    
    res.json({ success: true, message: 'Deal updated successfully' });
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

export default router;
