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
      'POST /api/webhooks/ghl-opportunity-field-change',
      'POST /api/webhooks/test-field-change',
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
      return systemStage;
    }
  }
  
  return ghlStageName;
}

// GHL Webhook endpoint for opportunity updates
router.post('/ghl', async (req: Request, res: Response) => {
  try {
    
    // Basic webhook validation (optional - can be enabled with GHL_WEBHOOK_SECRET)
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = req.headers['x-webhook-secret'] as string;
      if (providedSecret !== webhookSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    
    // Get the opportunity data from the webhook
    let opportunity = req.body.opportunity || req.body;
    
    if (!opportunity) {
      return res.status(400).json({ error: 'No opportunity data received' });
    }
    
    // Get all deals and find the matching one
    const deals = await FirebaseService.getAllDeals();
    
    // Find deal by opportunity name (property address) or dealId
    const deal = deals.find(d => 
      d.propertyAddress === opportunity.opportunity_name || 
      d.propertyName === opportunity.opportunity_name ||
      d.dealId === opportunity.opportunity_name
    );
    
    if (!deal) {
      return res.json({ 
        success: true, 
        message: 'Webhook received but no matching deal found',
        opportunityName: opportunity.opportunity_name,
        availableDealIds: deals.map(d => d.dealId).filter(Boolean)
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
router.post('/test', async (req: Request, res: Response) => {
  try {
    console.log('🧪 [TEST WEBHOOK] Received POST request:', JSON.stringify(req.body, null, 2));
    
    // Get the opportunity data from the webhook
    let opportunity = req.body.opportunity || req.body;
    
    if (!opportunity) {
      console.log('❌ [TEST WEBHOOK] No opportunity data received');
      return res.status(400).json({ error: 'No opportunity data received' });
    }
    
    // Get all deals and find the matching one
    const deals = await FirebaseService.getAllDeals();
    console.log('🔍 [TEST WEBHOOK] Looking for deal with opportunity name:', opportunity.opportunity_name);
    console.log('🔍 [TEST WEBHOOK] Available dealIds in database:', deals.map(d => d.dealId).filter(Boolean));
    
    // Find deal by opportunity name (property address) or dealId
    const deal = deals.find(d => 
      d.propertyAddress === opportunity.opportunity_name || 
      d.propertyName === opportunity.opportunity_name ||
      d.dealId === opportunity.opportunity_name
    );
    
    if (!deal) {
      console.log('⚠️ [TEST WEBHOOK] No deal found with opportunity name:', opportunity.opportunity_name);
      console.log('⚠️ [TEST WEBHOOK] Available deals:', deals.map(d => ({ id: d.id, dealId: d.dealId, title: d.title })));
      return res.json({ 
        success: true, 
        message: 'Webhook received but no matching deal found',
        opportunityName: opportunity.opportunity_name,
        availableDealIds: deals.map(d => d.dealId).filter(Boolean),
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        body: req.body
      });
    }
    
    console.log('✅ [TEST WEBHOOK] Found deal:', deal.id, 'Current stage:', deal.stage);
    
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
        console.log('🎯 [TEST WEBHOOK] Stage changed from:', currentStage, 'to:', normalizedStage);
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
      console.log('✅ [TEST WEBHOOK] Deal updated successfully');
    }
    
    res.json({ 
      success: true, 
      message: 'Deal updated successfully',
      dealId: deal.id,
      updates: updates,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      body: req.body
    });
  } catch (error) {
    console.error('❌ [TEST WEBHOOK] Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
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

// GHL Opportunity Field Change Webhook - Syncs specific field changes
router.post('/ghl-opportunity-field-change', async (req: Request, res: Response) => {
  try {
    console.log('🔄 [FIELD WEBHOOK] Received opportunity field change webhook:', JSON.stringify(req.body, null, 2));
    
    // Basic webhook validation (optional - can be enabled with GHL_WEBHOOK_SECRET)
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = req.headers['x-webhook-secret'] as string;
      if (providedSecret !== webhookSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    
    // Get the opportunity data from the webhook
    let opportunity = req.body.opportunity || req.body;
    
    if (!opportunity) {
      console.log('❌ [FIELD WEBHOOK] No opportunity data received');
      return res.status(400).json({ error: 'No opportunity data received' });
    }
    
    console.log('🔍 [FIELD WEBHOOK] Processing opportunity:', opportunity.id, 'Name:', opportunity.name);
    
    // Get all deals and find the matching one
    const deals = await FirebaseService.getAllDeals();
    
    // Find deal by GHL opportunity ID (most reliable) or by opportunity name
    let deal = deals.find(d => d.ghlOpportunityId === opportunity.id);
    
    if (!deal) {
      // Fallback: try to find by opportunity name (property address)
      deal = deals.find(d => 
        d.propertyAddress === opportunity.name || 
        d.propertyName === opportunity.name ||
        d.dealId === opportunity.name
      );
    }
    
    if (!deal) {
      console.log('⚠️ [FIELD WEBHOOK] No deal found for opportunity:', opportunity.id, 'Name:', opportunity.name);
      console.log('⚠️ [FIELD WEBHOOK] Available deals with GHL IDs:', deals.filter(d => d.ghlOpportunityId).map(d => ({ 
        id: d.id, 
        dealId: d.dealId, 
        ghlOpportunityId: d.ghlOpportunityId,
        propertyAddress: d.propertyAddress 
      })));
      
      return res.json({ 
        success: true, 
        message: 'Webhook received but no matching deal found',
        opportunityId: opportunity.id,
        opportunityName: opportunity.name,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('✅ [FIELD WEBHOOK] Found deal:', deal.id, 'Current stage:', deal.stage);
    
    // Prepare updates from GHL opportunity
    const updates: any = {};
    let fieldsUpdated = 0;
    
    // Update GHL opportunity ID if not already set
    if (!deal.ghlOpportunityId && opportunity.id) {
      updates.ghlOpportunityId = opportunity.id;
      fieldsUpdated++;
    }
    
    // Handle basic opportunity fields
    if (opportunity.name && opportunity.name !== deal.propertyName) {
      updates.propertyName = opportunity.name;
      fieldsUpdated++;
    }
    
    if (opportunity.status && opportunity.status !== deal.status) {
      updates.status = opportunity.status;
      fieldsUpdated++;
    }
    
    if (opportunity.monetaryValue && opportunity.monetaryValue !== deal.opportunityValue) {
      updates.opportunityValue = opportunity.monetaryValue;
      fieldsUpdated++;
    }
    
    if (opportunity.assignedTo && opportunity.assignedTo !== deal.owner) {
      updates.owner = opportunity.assignedTo;
      fieldsUpdated++;
    }
    
    if (opportunity.source && opportunity.source !== deal.opportunitySource) {
      updates.opportunitySource = opportunity.source;
      fieldsUpdated++;
    }
    
    // Handle stage changes
    if (opportunity.pipelineStageId && opportunity.pipelineId) {
      try {
        console.log('🔄 [FIELD WEBHOOK] Processing stage change for opportunity:', opportunity.id);
        console.log('🔄 [FIELD WEBHOOK] Pipeline ID:', opportunity.pipelineId, 'Stage ID:', opportunity.pipelineStageId);
        
        const currentStage = deal.stage;
        const stageName = await GHLService.getStageNameById(opportunity.pipelineId, opportunity.pipelineStageId);
        
        if (stageName) {
          const normalizedStage = mapGHLStageToSystemStage(stageName);
          
          if (currentStage !== normalizedStage) {
            updates.stage = normalizedStage;
            updates.stageLastUpdated = new Date().toISOString();
            fieldsUpdated++;
            console.log('🎯 [FIELD WEBHOOK] Stage changed from:', currentStage, 'to:', normalizedStage);
          }
        }
      } catch (error) {
        console.error('❌ [FIELD WEBHOOK] Error fetching stage name:', error);
      }
    }
    
    // Handle custom fields - map GHL custom fields to our deal fields
    if (opportunity.customFields && Array.isArray(opportunity.customFields)) {
      console.log('🔍 [FIELD WEBHOOK] Processing custom fields:', opportunity.customFields.length);
      
      // Convert custom fields array to object for easier lookup
      const customFieldsObj = opportunity.customFields.reduce((acc: any, field: any) => {
        if (field.key && field.field_value !== undefined) {
          acc[field.key] = field.field_value;
        }
        return acc;
      }, {});
      
      // Map GHL custom fields to our deal fields
      const fieldMappings = {
        // Opportunity-level fields
        'opportunity.deal_type': 'dealType',
        'opportunity.property_type': 'propertyType',
        'opportunity.property_address': 'propertyAddress',
        'opportunity.property_vintage': 'propertyVintage',
        'opportunity.sponsor_net_worth': 'sponsorNetWorth',
        'opportunity.sponsor_liquidity': 'sponsorLiquidity',
        'opportunity.loan_request': 'loanRequest',
        'opportunity.additional_information': 'additionalInformation',
        'opportunity.loan_amount': 'loanAmount',
        'opportunity.purchase_price': 'purchasePrice',
        'opportunity.property_name': 'propertyName',
        'opportunity.number_of_units': 'numberOfUnits',
        'opportunity.occupancy': 'occupancy',
        'opportunity.appraised_value': 'appraisedValue',
        'opportunity.ltv': 'ltv',
        'opportunity.dscr': 'dscr',
        'opportunity.term': 'term',
        'opportunity.index': 'index',
        'opportunity.spread_percentage': 'spreadPercentage',
        'opportunity.rate_percentage': 'ratePercentage',
        'opportunity.amortization': 'amortization',
        'opportunity.close_date': 'closeDate',
        'opportunity.lost_reason': 'lostReason',
        
        // Contact-level fields (if they come through opportunity webhook)
        'contact.application_deal_type': 'applicationDealType',
        'contact.application_property_type': 'applicationPropertyType',
        'contact.application_property_address': 'applicationPropertyAddress',
        'contact.application_property_vintage': 'applicationPropertyVintage',
        'contact.application_sponsor_net_worth': 'applicationSponsorNetWorth',
        'contact.application_sponsor_liquidity': 'applicationSponsorLiquidity',
        'contact.application_loan_request': 'applicationLoanRequest',
        'contact.application_additional_information': 'applicationAdditionalInformation',
        'contact.discord_username': 'discordUsername',
        'contact.contact_name': 'contactName',
        'contact.contact_email': 'contactEmail',
        'contact.contact_phone': 'contactPhone'
      };
      
      // Process each field mapping
      Object.entries(fieldMappings).forEach(([ghlFieldKey, ourFieldKey]) => {
        if (customFieldsObj[ghlFieldKey] !== undefined && customFieldsObj[ghlFieldKey] !== deal[ourFieldKey]) {
          updates[ourFieldKey] = customFieldsObj[ghlFieldKey];
          fieldsUpdated++;
          console.log(`🔄 [FIELD WEBHOOK] Field updated: ${ghlFieldKey} -> ${ourFieldKey}:`, customFieldsObj[ghlFieldKey]);
        }
      });
      
      // Handle any unmapped fields that might be important
      Object.entries(customFieldsObj).forEach(([fieldKey, fieldValue]) => {
        if (!fieldMappings[fieldKey] && fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          console.log(`ℹ️ [FIELD WEBHOOK] Unmapped field detected: ${fieldKey} = ${fieldValue}`);
        }
      });
    }
    
    // Update the deal in Firebase if there are changes
    if (Object.keys(updates).length > 0) {
      console.log('🔄 [FIELD WEBHOOK] Updating deal with changes:', JSON.stringify(updates, null, 2));
      await FirebaseService.updateDeal(deal.id, updates);
      console.log('✅ [FIELD WEBHOOK] Deal updated successfully with', fieldsUpdated, 'field changes');
      
      res.json({ 
        success: true, 
        message: 'Deal updated successfully',
        dealId: deal.id,
        fieldsUpdated: fieldsUpdated,
        updates: updates,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('ℹ️ [FIELD WEBHOOK] No relevant changes to sync');
      res.json({ 
        success: true, 
        message: 'No changes needed',
        dealId: deal.id,
        fieldsUpdated: 0,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ [FIELD WEBHOOK] Error processing field change webhook:', error);
    res.status(500).json({ 
      error: 'Failed to process field change webhook',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for field change webhook
router.post('/test-field-change', async (req: Request, res: Response) => {
  try {
    console.log('🧪 [TEST FIELD WEBHOOK] Received test field change webhook:', JSON.stringify(req.body, null, 2));
    
    // Simulate the field change webhook processing
    const result = await router.handle(req, res);
    
    return result;
  } catch (error) {
    console.error('❌ [TEST FIELD WEBHOOK] Error processing test:', error);
    res.status(500).json({ 
      error: 'Failed to process test field change webhook',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
