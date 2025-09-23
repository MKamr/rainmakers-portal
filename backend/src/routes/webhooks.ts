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
    
    // Find the deal by GHL opportunity ID, or by opportunity name if ID doesn't match
    const deals = await FirebaseService.getAllDeals();
    console.log('🔍 [GHL WEBHOOK] Total deals in database:', deals.length);
    console.log('🔍 [GHL WEBHOOK] Looking for opportunity ID:', opportunity.id);
    console.log('🔍 [GHL WEBHOOK] Looking for opportunity name:', opportunity.name);
    
    // First try to find by GHL opportunity ID
    let deal = deals.find(d => d.ghlOpportunityId === opportunity.id);
    
    // If not found by ID, try to find by opportunity name (deal title)
    if (!deal && opportunity.name) {
      console.log('🔍 [GHL WEBHOOK] Not found by ID, trying to find by name...');
      deal = deals.find(d => d.title === opportunity.name || d.title?.includes(opportunity.name));
    }
    
    // If still not found, try to find by partial name match
    if (!deal && opportunity.name) {
      console.log('🔍 [GHL WEBHOOK] Not found by exact name, trying partial match...');
      deal = deals.find(d => {
        if (!d.title || !opportunity.name) return false;
        return d.title.toLowerCase().includes(opportunity.name.toLowerCase()) || 
               opportunity.name.toLowerCase().includes(d.title.toLowerCase());
      });
    }
    
    // If still not found, try to find by property address
    if (!deal && opportunity.customFields) {
      console.log('🔍 [GHL WEBHOOK] Not found by name, trying property address...');
      const propertyAddress = opportunity.customFields['opportunity.property_address'] || 
                             opportunity.customFields['property_address'] ||
                             opportunity.propertyAddress;
      
      if (propertyAddress) {
        console.log('🔍 [GHL WEBHOOK] Looking for property address:', propertyAddress);
        deal = deals.find(d => {
          if (!(d as any).propertyAddress) return false;
          return (d as any).propertyAddress.toLowerCase().includes(propertyAddress.toLowerCase()) ||
                 propertyAddress.toLowerCase().includes((d as any).propertyAddress.toLowerCase());
        });
      }
    }
    
    // If still not found, try to find by any custom field that might contain address info
    if (!deal && opportunity.customFields) {
      console.log('🔍 [GHL WEBHOOK] Not found by property address, trying other custom fields...');
      const customFields = opportunity.customFields;
      
      // Look for any field that might contain address information
      const addressFields = Object.entries(customFields).find(([key, value]) => {
        if (!value || typeof value !== 'string') return false;
        const lowerValue = value.toLowerCase();
        return lowerValue.includes('la, usa') || 
               lowerValue.includes('pakistan') ||
               lowerValue.includes('address') ||
               lowerValue.includes('property');
      });
      
      if (addressFields) {
        const [fieldKey, fieldValue] = addressFields;
        console.log('🔍 [GHL WEBHOOK] Found potential address field:', fieldKey, '=', fieldValue);
        
        // Try to find deal by this field value
        deal = deals.find(d => {
          if (!(d as any).propertyAddress) return false;
          return (d as any).propertyAddress.toLowerCase().includes((fieldValue as string).toLowerCase()) ||
                 (fieldValue as string).toLowerCase().includes((d as any).propertyAddress.toLowerCase());
        });
      }
    }
    
    if (!deal) {
      console.log('⚠️ [GHL WEBHOOK] No deal found with GHL opportunity ID:', opportunity.id);
      console.log('⚠️ [GHL WEBHOOK] No deal found with GHL opportunity name:', opportunity.name);
      console.log('⚠️ [GHL WEBHOOK] Available deals:', deals.map(d => ({ id: d.id, title: d.title, ghlId: d.ghlOpportunityId })));
      
      // Return success to prevent GHL from retrying, but log the issue
      return res.json({ 
        success: true, 
        message: 'Webhook received but no matching deal found',
        note: 'This GHL opportunity was not found in our portal',
        opportunityId: opportunity.id,
        opportunityName: opportunity.name
      });
    }
    
    console.log('✅ [GHL WEBHOOK] Found deal:', deal.id, 'Title:', deal.title, 'Current stage:', deal.stage);
    
    // Prepare updates from GHL opportunity
    const updates: any = {};
    
    // Update basic fields
    if (opportunity.name) updates.title = opportunity.name;
    if (opportunity.status) updates.status = opportunity.status;
    if (opportunity.pipelineId) updates.pipeline = opportunity.pipelineId;
    
    // Update GHL opportunity ID if not already set
    if (!deal.ghlOpportunityId && opportunity.id) {
      updates.ghlOpportunityId = opportunity.id;
      console.log('🔗 [GHL WEBHOOK] Setting GHL opportunity ID:', opportunity.id);
    }
    
    // Handle stage changes - GHL sends stage name directly in the webhook
    console.log('🔍 [GHL WEBHOOK] Checking for stage fields...');
    console.log('🔍 [GHL WEBHOOK] pipleline_stage:', opportunity.pipleline_stage);
    console.log('🔍 [GHL WEBHOOK] pipeline_stage:', opportunity.pipeline_stage);
    console.log('🔍 [GHL WEBHOOK] All opportunity fields:', Object.keys(opportunity));
    
    if (opportunity.pipleline_stage || opportunity.pipeline_stage) {
      try {
        console.log('🔄 [GHL WEBHOOK] Processing stage change for opportunity:', opportunity.id);
        console.log('🔄 [GHL WEBHOOK] Received stage:', opportunity.pipleline_stage || opportunity.pipeline_stage);
        
        // Get the stage name from GHL webhook (note the typo in GHL field name)
        const ghlStageName = opportunity.pipleline_stage || opportunity.pipeline_stage;
        const currentStage = deal.stage;
        const normalizedStage = mapGHLStageToSystemStage(ghlStageName);
        
        console.log('🔄 [GHL WEBHOOK] Current deal stage:', currentStage);
        console.log('🔄 [GHL WEBHOOK] GHL stage name:', ghlStageName);
        console.log('🔄 [GHL WEBHOOK] Normalized stage:', normalizedStage);
        console.log('🔄 [GHL WEBHOOK] Stage changed?', currentStage !== normalizedStage);
        
        // Only update if stage actually changed
        if (currentStage !== normalizedStage) {
          updates.stage = normalizedStage;
          updates.stageLastUpdated = new Date().toISOString();
          console.log('🎯 [GHL WEBHOOK] Stage changed from:', currentStage, 'to:', normalizedStage);
          console.log('🎯 [GHL WEBHOOK] GHL stage name:', ghlStageName, '-> System stage:', normalizedStage);
        } else {
          console.log('ℹ️ [GHL WEBHOOK] Stage unchanged:', normalizedStage);
        }
      } catch (error) {
        console.error('❌ [GHL WEBHOOK] Error processing stage change:', error);
      }
    } else {
      console.log('⚠️ [GHL WEBHOOK] No stage field found in webhook data');
    }
    
    // Also handle the old pipelineStageId method for backward compatibility
    if (opportunity.pipelineStageId && opportunity.pipelineId) {
      try {
        console.log('🔄 [GHL WEBHOOK] Processing stage change by ID for opportunity:', opportunity.id);
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
    console.log('🔍 [GHL WEBHOOK] Updates to apply:', Object.keys(updates));
    console.log('🔍 [GHL WEBHOOK] Updates object:', JSON.stringify(updates, null, 2));
    
    if (Object.keys(updates).length > 0) {
      console.log('🔄 [GHL WEBHOOK] Updating deal with changes:', JSON.stringify(updates, null, 2));
      try {
        await FirebaseService.updateDeal(deal.id, updates);
        console.log('✅ [GHL WEBHOOK] Deal updated successfully in Firebase');
      } catch (error) {
        console.error('❌ [GHL WEBHOOK] Error updating deal in Firebase:', error);
        return res.status(500).json({ error: 'Failed to update deal in database' });
      }
    } else {
      console.log('ℹ️ [GHL WEBHOOK] No relevant changes to sync');
    }
    
    res.json({ 
      success: true, 
      message: 'Deal updated successfully',
      dealId: deal.id,
      updates: updates,
      stageChanged: updates.stage ? true : false
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
