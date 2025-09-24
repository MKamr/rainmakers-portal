import express from 'express';
import { body, validationResult } from 'express-validator';
import { FirebaseService } from '../services/firebaseService';
import { GHLService } from '../services/ghlService';
import { OneDriveService } from '../services/oneDriveService';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to load GHL custom fields and determine field ownership
const loadGHLFieldMapping = () => {
  try {
    const ghlFieldsPath = path.join(__dirname, '../../ghl-custom-fields.json');
    const ghlFieldsData = fs.readFileSync(ghlFieldsPath, 'utf8');
    const ghlFields = JSON.parse(ghlFieldsData);
    
    const fieldMapping: { [fieldId: string]: { model: string; name: string; fieldKey: string } } = {};
    
    // Process contact fields
    if (ghlFields.contactFields && Array.isArray(ghlFields.contactFields)) {
      ghlFields.contactFields.forEach((field: any) => {
        if (field.id) {
          fieldMapping[field.id] = {
            model: 'contact',
            name: field.name || field.fieldName || '',
            fieldKey: field.fieldKey || field.fieldName || ''
          };
        }
      });
    }
    
    // Process opportunity fields
    if (ghlFields.opportunityFields && Array.isArray(ghlFields.opportunityFields)) {
      ghlFields.opportunityFields.forEach((field: any) => {
        if (field.id) {
          fieldMapping[field.id] = {
            model: 'opportunity',
            name: field.name || field.fieldName || '',
            fieldKey: field.fieldKey || field.fieldName || ''
          };
        }
      });
    }
    
    console.log('✅ [FIELD MAPPING] Loaded', Object.keys(fieldMapping).length, 'fields from GHL custom fields');
    return fieldMapping;
  } catch (error) {
    console.error('❌ [FIELD MAPPING] Error loading GHL custom fields:', error);
    return {};
  }
};

// Helper function to dynamically separate fields based on GHL field mapping
const separateFieldsByModel = (updates: any, fieldMapping: { [fieldId: string]: { model: string; name: string; fieldKey: string } }) => {
  const opportunityCustomFields: Record<string, any> = {};
  const contactCustomFields: Record<string, any> = {};
  
  // Create mapping from internal field names to GHL field keys
  const fieldNameToGHLKeyMap: { [fieldName: string]: string } = {
    // Opportunity fields
    'propertyName': 'opportunity.property_name',
    'propertyAddress': 'opportunity.property_address',
    'propertyCity': 'opportunity.property_city',
    'propertyState': 'opportunity.property_state',
    'propertyZip': 'opportunity.property_zip',
    'propertyType': 'opportunity.property_type',
    'numberOfUnits': 'opportunity.number_of_units',
    'purchasePrice': 'opportunity.purchase_price',
    'originalPurchaseDate': 'opportunity.original_purchase_date',
    'occupancy': 'opportunity.occupancy',
    'occupancyPercentage': 'opportunity.occupancy_percentage',
    'appraisedValue': 'opportunity.appraised_value',
    'debitYield': 'opportunity.debit_yield',
    'propertyCapEx': 'opportunity.property_cap_ex',
    'costBasis': 'opportunity.cost_basis',
    'managementEntity': 'opportunity.management_entity',
    'borrowingEntity': 'opportunity.borrowing_entity',
    'lender': 'opportunity.lender',
    'loanAmount': 'opportunity.loan_amount',
    'unpaidPrincipalBalance': 'opportunity.unpaid_principal_balance',
    'dealType': 'opportunity.deal_type',
    'investmentType': 'opportunity.investment_type',
    'ltv': 'opportunity.ltv',
    'dscr': 'opportunity.dscr',
    'hcOriginationFee': 'opportunity.hc_origination_fee',
    'ysp': 'opportunity.ysp',
    'processingFee': 'opportunity.processing_fee',
    'lenderOriginationFee': 'opportunity.lender_origination_fee',
    'term': 'opportunity.term',
    'index': 'opportunity.index',
    'sponsorName': 'opportunity.sponsor_name',
    'sponsorNetWorth': 'opportunity.sponsor_net_worth',
    'sponsorLiquidity': 'opportunity.sponsor_liquidity',
    'indexPercentage': 'opportunity.index_percentage',
    'spreadPercentage': 'opportunity.spread_percentage',
    'ratePercentage': 'opportunity.rate_percentage',
    'probabilityPercentage': 'opportunity.probability_percentage',
    'amortization': 'opportunity.amortization',
    'exitFee': 'opportunity.exit_fee',
    'prepaymentPenalty': 'opportunity.prepayment_penalty',
    'recourse': 'opportunity.recourse',
    'fixedMaturityDate': 'opportunity.fixed_maturity_date',
    'floatingMaturityDate': 'opportunity.floating_maturity_date',
    'closeDate': 'opportunity.close_date',
    'callCenterEmployee': 'opportunity.call_center_employee',
    'mondaycomItemId': 'opportunity.mondaycom_item_id',
    
    // Contact fields
    'applicationDealType': 'contact.application_deal_type',
    'applicationPropertyType': 'contact.application_property_type',
    'applicationPropertyAddress': 'contact.application_property_address',
    'applicationPropertyVintage': 'contact.application_property_vintage',
    'applicationSponsorNetWorth': 'contact.application_sponsor_net_worth',
    'applicationSponsorLiquidity': 'contact.application_sponsor_liquidity',
    'applicationLoanRequest': 'contact.application_loan_request',
    'applicationDocumentUpload': 'contact.application_document_upload',
    'applicationAdditionalInformation': 'contact.application_additional_information',
    'discordUsername': 'contact.discord_username',
    'applicationSubmittedBy': 'contact.application_submitted_by',
    'leadPropertyType': 'contact.lead_property_type',
    'leadPropertyAddress': 'contact.lead_property_address',
    'leadPropertyCity': 'contact.lead_property_city',
    'leadPropertyState': 'contact.lead_property_state',
    'leadPropertyPurchaseDate': 'contact.lead_property_purchase_date',
    'leadPropertyPurchasePrice': 'contact.lead_property_purchase_price',
    'leadPropertyNoOfUnits': 'contact.lead_property_no_of_units',
    'contactName': 'contact.contact_name',
    'contactEmail': 'contact.contact_email',
    'contactPhone': 'contact.contact_phone',
    'businessName': 'contact.business_name'
  };
  
  // Create reverse mapping from fieldKey to fieldId for dynamic lookup
  const fieldKeyToIdMap: { [fieldKey: string]: string } = {};
  Object.entries(fieldMapping).forEach(([fieldId, fieldInfo]) => {
    if (fieldInfo.fieldKey) {
      fieldKeyToIdMap[fieldInfo.fieldKey] = fieldId;
    }
  });
  
  console.log('🔍 [FIELD MAPPING] Available field keys:', Object.keys(fieldKeyToIdMap).slice(0, 10), '...');
  
  // Process each update field
  Object.entries(updates).forEach(([fieldName, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Try to find the field by mapped GHL key first
      const ghlKey = fieldNameToGHLKeyMap[fieldName];
      let fieldId = ghlKey ? fieldKeyToIdMap[ghlKey] : null;
      
      // If not found by mapped key, try to find by exact field name match
      if (!fieldId) {
        // Look for fields where the fieldKey matches the fieldName
        const matchingField = Object.entries(fieldMapping).find(([id, info]) => 
          info.fieldKey === fieldName || info.name === fieldName
        );
        if (matchingField) {
          fieldId = matchingField[0];
        }
      }
      
      if (fieldId && fieldMapping[fieldId]) {
        const fieldInfo = fieldMapping[fieldId];
        console.log(`🔍 [FIELD MAPPING] Field "${fieldName}" (ID: ${fieldId}) belongs to model: ${fieldInfo.model}`);
        
        if (fieldInfo.model === 'opportunity') {
          opportunityCustomFields[fieldId] = value;
        } else if (fieldInfo.model === 'contact') {
          contactCustomFields[fieldId] = value;
        }
      } else {
        console.log(`⚠️ [FIELD MAPPING] Field "${fieldName}" not found in GHL field mapping`);
      }
    }
  });
  
  return { opportunityCustomFields, contactCustomFields };
};

// Normalize incoming form fields from the minimal form (image) to our canonical keys
// Only keep and map the allowed fields for contact/opportunity syncing
const normalizeDealFormFields = (raw: any) => {
  const firstName = (raw.clientFirstName || raw.firstName || '').trim();
  const lastName = (raw.clientLastName || raw.lastName || '').trim();
  const contactName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const contactEmail = raw.clientEmail || raw.email || '';
  const contactPhone = raw.clientPhone || raw.phone || '';
  const discordUsername = raw.discordUsername || raw.discord || '';

  // Map to canonical keys used by fieldNameToGHLKeyMap above
  const normalized: Record<string, any> = {
    contactName,
    contactEmail,
    contactPhone,
    source: discordUsername,
    // Map form fields to opportunity fields instead of application fields
    dealType: raw.dealType || '',
    propertyType: raw.propertyType || '',
    propertyAddress: raw.propertyAddress || '',
    propertyVintage: raw.propertyVintage || '',
    sponsorNetWorth: raw.sponsorNetWorth || '',
    sponsorLiquidity: raw.sponsorLiquidity || '',
    loanRequest: raw.loanRequest || '',
    additionalInformation: raw.anyAdditionalInformation || raw.additionalInformation || '',
    // Keep legacy application fields for backward compatibility
    applicationDealType: raw.dealType || '',
    applicationPropertyType: raw.propertyType || '',
    applicationPropertyAddress: raw.propertyAddress || '',
    applicationPropertyVintage: raw.propertyVintage || '',
    applicationSponsorNetWorth: raw.sponsorNetWorth || '',
    applicationSponsorLiquidity: raw.sponsorLiquidity || '',
    applicationLoanRequest: raw.loanRequest || '',
    applicationAdditionalInformation: raw.anyAdditionalInformation || raw.additionalInformation || ''
  };

  return { normalized, meta: { firstName, lastName, discordUsername } };
};

// Stage mapping function to normalize GHL stage names to our system
const mapGHLStageToSystemStage = (ghlStageName: string): string => {
  if (!ghlStageName) return 'No Stage';
  
  const stageMap: Record<string, string> = {
    // Common GHL stage name variations
    'Initial Qualification': 'Qualification',
    'Qualification': 'Qualification',
    'Initial Qualification Stage': 'Qualification',
    'Qualification Stage': 'Qualification',
    
    'Needs Analysis': 'Needs Analysis',
    'Needs Analysis Stage': 'Needs Analysis',
    'Analysis': 'Needs Analysis',
    
    'Lender Submission': 'Lender Submission',
    'Lender Submission Stage': 'Lender Submission',
    'Submission': 'Lender Submission',
    
    'Proposal': 'Proposal',
    'Proposal Stage': 'Proposal',
    'Proposal Sent': 'Proposal',
    
    'Signed Proposal': 'Signed Proposal',
    'Signed Proposal Stage': 'Signed Proposal',
    'Proposal Signed': 'Signed Proposal',
    'Proposal Accepted': 'Signed Proposal',
    
    'Underwriting': 'Underwriting',
    'Underwriting Stage': 'Underwriting',
    'In Underwriting': 'Underwriting',
    'Under Review': 'Underwriting'
  };
  
  return stageMap[ghlStageName] || ghlStageName;
};

// Function to map our system stage names to GHL stage IDs
const mapSystemStageToGHLStageId = async (systemStage: string, pipelineId: string): Promise<string | null> => {
  try {
    console.log('🔍 [STAGE MAPPING] Fetching stages for pipeline:', pipelineId);
    const stages = await GHLService.getPipelineStages(pipelineId);
    console.log('🔍 [STAGE MAPPING] Available stages:', stages.map((s: any) => ({ name: s.name, id: s.id })));
    
    // Try to find a stage that matches our system stage name
    const matchingStage = stages.find((stage: any) => {
      const stageName = stage.name || '';
      return stageName.toLowerCase().includes(systemStage.toLowerCase()) ||
             systemStage.toLowerCase().includes(stageName.toLowerCase());
    });
    
    if (matchingStage) {
      console.log('✅ [STAGE MAPPING] Found GHL stage:', matchingStage.name, '->', matchingStage.id);
      return matchingStage.id;
    }
    
    console.log('⚠️ [STAGE MAPPING] No matching GHL stage found for:', systemStage);
    console.log('⚠️ [STAGE MAPPING] Available stage names:', stages.map((s: any) => s.name));
    return null;
  } catch (error) {
    console.error('❌ [STAGE MAPPING] Error mapping stage to GHL:', error);
    return null;
  }
};

const router = express.Router();

// Generate unique deal ID
const generateDealId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `RM-${timestamp}-${random}`.toUpperCase();
};

// Test endpoint to check all deals in Firebase
router.get('/debug/all-deals', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [DEBUG] Fetching all deals from Firebase...');
    
    const allDeals = await FirebaseService.getAllDeals();
    console.log('🔍 [DEBUG] Total deals in Firebase:', allDeals.length);
    
    const dealsByUser = allDeals.reduce((acc, deal) => {
      if (!acc[deal.userId]) {
        acc[deal.userId] = [];
      }
      acc[deal.userId].push(deal);
      return acc;
    }, {} as { [userId: string]: Deal[] });
    
    console.log('🔍 [DEBUG] Deals by user:', Object.keys(dealsByUser).map(userId => ({
      userId,
      count: dealsByUser[userId].length,
      deals: dealsByUser[userId].map(d => ({ id: d.id, title: d.title, status: d.status }))
    })));
    
    res.json({
      totalDeals: allDeals.length,
      dealsByUser,
      currentUser: req.user?.id,
      currentUserDeals: dealsByUser[req.user?.id || ''] || []
    });
  } catch (error) {
    console.error('❌ [DEBUG] Error fetching all deals:', error);
    res.status(500).json({ error: 'Failed to fetch debug data' });
  }
});

// Get user's deals
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('📋 [DEALS] Fetching deals for user:', req.user!.id);
    console.log('🔍 [DEALS] User details:', {
      id: req.user!.id,
      username: req.user!.username,
      email: req.user!.email,
      isAdmin: req.user!.isAdmin,
      isWhitelisted: req.user!.isWhitelisted
    });
    
    // Debug: Check all deals in Firebase
    const allDeals = await FirebaseService.getAllDeals();
    console.log('🔍 [DEALS DEBUG] Total deals in Firebase:', allDeals.length);
    console.log('🔍 [DEALS DEBUG] All deals details:', allDeals.map(deal => ({
      id: deal.id,
      userId: deal.userId,
      title: deal.title,
      status: deal.status,
      stage: deal.stage,
      value: deal.value
    })));
    
    // Debug: Check if any deals have the current user's ID
    const userDeals = allDeals.filter(deal => deal.userId === req.user!.id);
    console.log('🔍 [DEALS DEBUG] Deals matching current user ID:', userDeals.length);
    console.log('🔍 [DEALS DEBUG] Current user ID:', req.user!.id);
    console.log('🔍 [DEALS DEBUG] User ID type:', typeof req.user!.id);
    
    const deals = await FirebaseService.getDealsByUserId(req.user!.id);
    console.log('📋 [DEALS] Found deals for user:', deals.length);
    console.log('📋 [DEALS] Deal details:', deals.map(deal => ({
      id: deal.id,
      clientName: (deal as any).clientName || 'No client name',
      status: deal.status,
      createdAt: deal.createdAt
    })));
    
    res.json(deals);
  } catch (error) {
    console.error('❌ [DEALS] Get deals error:', error);
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('❌ [DEALS] Error details:', {
        message: (error as any).message,
        stack: (error as any).stack
      });
    }
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Create new deal
router.post('/', [
  body('clientFirstName').notEmpty().withMessage('Client First Name is required'),
  body('clientLastName').notEmpty().withMessage('Client Last Name is required'),
  body('clientPhone').notEmpty().withMessage('Client Phone is required'),
  body('clientEmail').notEmpty().withMessage('Client Email is required'),
  body('dealType').optional(),
  body('propertyType').optional(),
  body('propertyAddress').notEmpty().withMessage('Property Address is required'),
  body('propertyVintage').optional(),
  body('sponsorNetWorth').optional(),
  body('sponsorLiquidity').optional(),
  body('loanRequest').optional(),
  body('anyAdditionalInformation').optional(),
], async (req: Request, res: Response) => {
  try {
    console.log('🚀 [DEAL CREATE] Starting deal creation process');
    console.log('📝 [DEAL CREATE] Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 [DEAL CREATE] User:', req.user);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [DEAL CREATE] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Normalize minimal form fields
    const { normalized, meta } = normalizeDealFormFields(req.body);

    const dealId = generateDealId();
    console.log('🆔 [DEAL CREATE] Generated deal ID:', dealId);

    // Create deal in Firebase
    console.log('🔥 [DEAL CREATE] Creating deal in Firebase...');
    const dealData = {
      dealId,
      propertyName: normalized.applicationPropertyAddress || 'Unknown Property',
      propertyAddress: normalized.applicationPropertyAddress || '',
      loanAmount: undefined,
      purchasePrice: undefined,
      propertyType: normalized.applicationPropertyType || '',
      stage: 'Qualification',
      status: 'Open',
      notes: normalized.applicationAdditionalInformation || '',
      userId: req.user!.id,
      contactName: normalized.contactName,
      contactEmail: normalized.contactEmail,
      contactPhone: normalized.contactPhone,
      opportunitySource: normalized.source,
      // Add all form fields to Firebase
      dealType: normalized.dealType,
      propertyVintage: normalized.propertyVintage,
      sponsorNetWorth: normalized.sponsorNetWorth,
      sponsorLiquidity: normalized.sponsorLiquidity,
      loanRequest: normalized.loanRequest,
      additionalInformation: normalized.additionalInformation
    } as any;
    console.log('📊 [DEAL CREATE] Deal data for Firebase:', JSON.stringify(dealData, null, 2));
    
    const deal = await FirebaseService.createDeal(dealData);
    console.log('✅ [DEAL CREATE] Deal created in Firebase:', deal.id);

    // Create folder in OneDrive (only if configured)
    console.log('📁 [DEAL CREATE] Checking OneDrive configuration...');
    try {
      const oneDriveToken = await FirebaseService.getLatestOneDriveToken();
      if (oneDriveToken) {
        console.log('📁 [DEAL CREATE] OneDrive connected, creating folder...');
        await OneDriveService.createDealFolder(dealId, normalized.applicationPropertyAddress);
        console.log('✅ [DEAL CREATE] OneDrive folder created');
      } else {
        console.log('⚠️ [DEAL CREATE] OneDrive not connected, skipping folder creation');
      }
    } catch (error) {
      console.warn('⚠️ [DEAL CREATE] Failed to create OneDrive folder:', error);
      // Don't fail the deal creation if OneDrive fails
    }

    // Sync with GHL if configured
    console.log('🔗 [DEAL CREATE] Attempting GHL sync...');
    try {
      const ghlPipelineId = await FirebaseService.getConfiguration('ghl_pipeline_id');
      const ghlStageId = await FirebaseService.getConfiguration('ghl_under_review_stage_id'); // This should be the "Qualification" stage
      const ghlLocationId = await FirebaseService.getConfiguration('ghl_location_id'); // Add locationId
      const skipGHL = await FirebaseService.getConfiguration('skip_ghl_sync'); // Add option to skip GHL
      
      console.log('🔧 [DEAL CREATE] GHL Config - Pipeline ID:', ghlPipelineId, '(type:', typeof ghlPipelineId, ')');
      console.log('🔧 [DEAL CREATE] GHL Config - Stage ID:', ghlStageId, '(type:', typeof ghlStageId, ')');
      console.log('🔧 [DEAL CREATE] GHL Config - Location ID:', ghlLocationId, '(type:', typeof ghlLocationId, ')');
      console.log('🔧 [DEAL CREATE] Skip GHL Sync:', skipGHL);
      
      if (skipGHL === 'true') {
        console.log('⏭️ [DEAL CREATE] GHL sync disabled, skipping...');
      } else if (ghlPipelineId && ghlPipelineId.trim() !== '' && ghlStageId && ghlStageId.trim() !== '' && ghlLocationId && ghlLocationId.trim() !== '') {
        console.log('🔗 [DEAL CREATE] GHL is configured, proceeding with sync...');
        // First, create or find the contact
        console.log('👤 [DEAL CREATE] Creating/finding GHL contact...');
        console.log('👤 [DEAL CREATE] Searching for contact with email:', req.body.contactEmail);
        let ghlContact;
        
        try {
          // TEMPORARY: Always create new contact to avoid search issues
          console.log('👤 [DEAL CREATE] Creating new contact (skipping search due to GHL search issues)...');
          const contactName = normalized.contactName || 'Unknown Contact';
          const nameParts = contactName.split(' ');
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || 'Contact';
          
          console.log('👤 [DEAL CREATE] Contact name parts:', { firstName, lastName, fullName: contactName });
          console.log('👤 [DEAL CREATE] Contact data to create:', {
            firstName,
            lastName,
            email: normalized.contactEmail || '',
            phone: normalized.contactPhone || '',
            companyName: req.body.businessName || ''
          });
          
          // Load GHL field mapping and build contact custom fields from normalized
          const fieldMappingForCreate = loadGHLFieldMapping();
          const { contactCustomFields: contactFieldsForCreate } = separateFieldsByModel(normalized, fieldMappingForCreate);
          console.log('🔍 [DEAL CREATE] Contact custom fields found:', Object.keys(contactFieldsForCreate));
          
          const contactCustomFieldsArrayForCreate = Object.entries(contactFieldsForCreate).map(([fieldId, value]) => {
            const fieldInfo = fieldMappingForCreate[fieldId];
            console.log(`🔍 [DEAL CREATE] Processing contact field ${fieldId}:`, { value, fieldInfo });
            return { id: fieldId, key: fieldInfo?.fieldKey || fieldInfo?.name || fieldId, field_value: value };
          });
          
          console.log('🔍 [DEAL CREATE] Final contact custom fields array:', JSON.stringify(contactCustomFieldsArrayForCreate, null, 2));

          ghlContact = await GHLService.createContact({
            firstName,
            lastName,
            email: normalized.contactEmail,
            phone: normalized.contactPhone,
            locationId: ghlLocationId, // Add locationId as required by GHL
            companyName: '',
            customFields: contactCustomFieldsArrayForCreate
          });
          console.log('✅ [DEAL CREATE] Created new GHL contact:', ghlContact.id);
          console.log('✅ [DEAL CREATE] Contact details:', JSON.stringify(ghlContact, null, 2));
        } catch (contactError) {
          console.warn('⚠️ [DEAL CREATE] Failed to create/find contact:', contactError);
          console.log('🔄 [DEAL CREATE] Trying to create opportunity without contactId...');
          
          // Fallback: Try to create opportunity without contactId
          try {
            const ghlDeal = await GHLService.createDeal({
              name: normalized.applicationPropertyAddress || dealId,
              pipelineId: ghlPipelineId,
              stageId: ghlStageId,
              locationId: ghlLocationId,
              source: normalized.source, // Add Discord username as source
              // No contactId - let GHL create opportunity without contact
              customFields: []
            });
            
            console.log('✅ [DEAL CREATE] GHL opportunity created without contact:', ghlDeal.id);
            
            // Update deal with GHL info
            await FirebaseService.updateDeal(deal.id, {
              ghlOpportunityId: ghlDeal.id,
              pipelineId: ghlDeal.pipelineId,
              stageId: ghlDeal.stageId
            });
            console.log('✅ [DEAL CREATE] Deal updated with GHL info');
            return; // Exit early since we handled it
          } catch (fallbackError) {
            console.warn('⚠️ [DEAL CREATE] Fallback also failed:', fallbackError);
            throw contactError; // Throw original error
          }
        }

        // Check if we have a valid contact
        if (!ghlContact || !ghlContact.id) {
          console.error('❌ [DEAL CREATE] No valid GHL contact available, skipping opportunity creation');
          throw new Error('No valid GHL contact available');
        }

        // Check for existing opportunities for this contact in this pipeline
        console.log('🔍 [DEAL CREATE] Checking for existing opportunities...');
        console.log('🔍 [DEAL CREATE] Contact ID:', ghlContact.id);
        console.log('🔍 [DEAL CREATE] Pipeline ID:', ghlPipelineId);
        const existingOpportunities = await GHLService.getOpportunitiesByContact(ghlContact.id, ghlPipelineId);
        console.log('🔍 [DEAL CREATE] Found opportunities:', existingOpportunities.length);
        console.log('🔍 [DEAL CREATE] Opportunity details:', JSON.stringify(existingOpportunities, null, 2));
        
        let ghlDeal;
        if (existingOpportunities.length > 0) {
          // Update existing opportunity
          console.log('🔄 [DEAL CREATE] Updating existing GHL opportunity:', existingOpportunities[0].id);
          ghlDeal = await GHLService.updateOpportunity(existingOpportunities[0].id, {
            title: `${dealId}`,
            status: 'open',
            stageId: ghlStageId,
            customFields: []
          });
          console.log('✅ [DEAL CREATE] GHL opportunity updated:', ghlDeal.id);
        } else {
          // Create new opportunity
          console.log('🚀 [DEAL CREATE] Creating new GHL opportunity...');
          try {
          ghlDeal = await GHLService.createDeal({
            name: normalized.applicationPropertyAddress || dealId,
            pipelineId: ghlPipelineId,
            stageId: ghlStageId,
            locationId: ghlLocationId,
            contactId: ghlContact.id,
            source: normalized.source, // Add Discord username as source
            customFields: []
          });
            
            // After creation/update, push source and opportunity custom fields
            const fieldMappingForOpp = loadGHLFieldMapping();
            const { opportunityCustomFields: oppFieldsForCreate } = separateFieldsByModel(normalized, fieldMappingForOpp);
            console.log('🔍 [DEAL CREATE] Opportunity custom fields found:', Object.keys(oppFieldsForCreate));
            console.log('🔍 [DEAL CREATE] Field mapping loaded:', Object.keys(fieldMappingForOpp).length, 'fields');
            
            const oppCustomFieldsArrayForCreate = Object.entries(oppFieldsForCreate).map(([fieldId, value]) => {
              const fieldInfo = fieldMappingForOpp[fieldId];
              console.log(`🔍 [DEAL CREATE] Processing field ${fieldId}:`, { value, fieldInfo });
              return { id: fieldId, key: fieldInfo?.fieldKey || fieldInfo?.name || fieldId, field_value: value };
            });
            
            console.log('🔍 [DEAL CREATE] Final custom fields array:', JSON.stringify(oppCustomFieldsArrayForCreate, null, 2));
            
            if (ghlDeal && ghlDeal.id) {
              try {
                await GHLService.updateDeal(ghlDeal.id, {
                  name: normalized.applicationPropertyAddress || dealId,
                  customFields: oppCustomFieldsArrayForCreate
                });
              } catch (postCreateUpdateErr) {
                console.warn('⚠️ [DEAL CREATE] Failed to update opportunity with source/custom fields:', postCreateUpdateErr);
              }
              console.log('✅ [DEAL CREATE] GHL opportunity created:', ghlDeal.id);
            } else {
              console.warn('⚠️ [DEAL CREATE] Opportunity creation failed, skipping custom fields update');
            }
          } catch (opportunityError) {
            console.error('❌ [DEAL CREATE] Failed to create GHL opportunity:', opportunityError);
            ghlDeal = null; // Set to null so we don't try to access its properties
          }
        }

        // Update deal with GHL info
        console.log('🔄 [DEAL CREATE] Updating deal with GHL info...');
        const dealUpdateData: any = {
          contactId: ghlContact.id // Always save the contact ID
        };
        
        if (ghlDeal && ghlDeal.id) {
          dealUpdateData.ghlOpportunityId = ghlDeal.id;
          dealUpdateData.pipelineId = ghlDeal.pipelineId;
          dealUpdateData.stageId = ghlDeal.stageId;
        }
        
        await FirebaseService.updateDeal(deal.id, dealUpdateData);
        console.log('✅ [DEAL CREATE] Deal updated with GHL info:', JSON.stringify(dealUpdateData, null, 2));
      } else {
        console.log('⚠️ [DEAL CREATE] GHL not configured or missing required fields, skipping sync...');
        console.log('⚠️ [DEAL CREATE] Missing fields:');
        if (!ghlPipelineId || ghlPipelineId.trim() === '') console.log('  - pipelineId');
        if (!ghlStageId || ghlStageId.trim() === '') console.log('  - stageId');
        if (!ghlLocationId || ghlLocationId.trim() === '') console.log('  - locationId');
      }
    } catch (error) {
      console.warn('⚠️ [DEAL CREATE] Failed to sync with GHL:', error);
      // Don't fail the deal creation if GHL sync fails
    }

    console.log('🎉 [DEAL CREATE] Deal creation completed successfully!');
    res.status(201).json(deal);
  } catch (error) {
    console.error('❌ [DEAL CREATE] Deal creation failed:', error);
    console.error('❌ [DEAL CREATE] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// Update deal
router.put('/:id', [
  body('clientFirstName').optional(),
  body('clientLastName').optional(),
  body('clientPhone').optional(),
  body('clientEmail').optional(),
  body('dealType').optional(),
  body('propertyType').optional(),
  body('propertyAddress').optional(),
  body('propertyVintage').optional(),
  body('sponsorNetWorth').optional(),
  body('sponsorLiquidity').optional(),
  body('loanRequest').optional(),
  body('anyAdditionalInformation').optional(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    // Normalize and restrict to allowed fields
    const { normalized, meta } = normalizeDealFormFields(req.body);
    const updates: any = {
      contactName: normalized.contactName,
      contactEmail: normalized.contactEmail,
      contactPhone: normalized.contactPhone,
      opportunitySource: normalized.source,
      propertyAddress: normalized.applicationPropertyAddress,
      propertyType: normalized.applicationPropertyType,
      notes: normalized.applicationAdditionalInformation,
      // Add all form fields to updates
      dealType: normalized.dealType,
      propertyVintage: normalized.propertyVintage,
      sponsorNetWorth: normalized.sponsorNetWorth,
      sponsorLiquidity: normalized.sponsorLiquidity,
      loanRequest: normalized.loanRequest,
      additionalInformation: normalized.additionalInformation
    };

    // Verify deal belongs to user
    const deal = await FirebaseService.getDealById(id);
    if (!deal || deal.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Add audit log for the update
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: 'UPDATE',
      userId: req.user!.id,
      changes: Object.keys(updates).filter(key => updates[key] !== undefined)
    };
    
    // Add audit log to updates
    updates.auditLogs = JSON.stringify(auditLog);

    // Update deal in Firebase
    const updatedDeal = await FirebaseService.updateDeal(id, updates);

    // Sync with GHL if deal has GHL ID
    if (deal.ghlOpportunityId) {
      try {
        console.log('🔗 [DEAL UPDATE] Syncing with GHL...');
        
        // Map deal fields to GHL custom fields
        const ghlUpdateData: any = {};
        
        // Basic fields - using V2 API format (matching working Python script)
        // Name is used in V2 API instead of title
        ghlUpdateData.name = deal.propertyAddress || deal.dealId || 'Untitled Deal';
        
        // Status must be one of the valid GHL statuses
        if (updates.status) {
          // Map our status to valid GHL status
          const statusMap: Record<string, string> = {
            'open': 'open',
            'won': 'won',
            'lost': 'lost',
            'abandoned': 'abandoned'
          };
          ghlUpdateData.status = statusMap[updates.status.toLowerCase()] || 'open';
        } else {
          ghlUpdateData.status = 'open'; // Default status
        }
        
        // V2 API supports pipelineId and pipelineStageId (as shown in your curl example)
        if (updates.pipeline) {
          // Check if it's already a pipeline ID (UUID format) or a pipeline name
          if (updates.pipeline.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
            // It's already a pipeline ID
            ghlUpdateData.pipelineId = updates.pipeline;
            console.log('✅ [DEAL UPDATE] Using pipeline ID directly:', updates.pipeline);
          } else {
            // It's a pipeline name, we'll look it up later
            console.log('🔍 [DEAL UPDATE] Pipeline name provided, will look up ID:', updates.pipeline);
          }
        }
        
        // Handle stage mapping for outbound sync
        if (updates.stage && updates.pipeline) {
          try {
            console.log('🔄 [DEAL UPDATE] Mapping stage to GHL:', updates.stage);
            // Use the pipeline ID if we have it, otherwise use the pipeline name
            const pipelineIdForMapping = ghlUpdateData.pipelineId || updates.pipeline;
            const ghlStageId = await mapSystemStageToGHLStageId(updates.stage, pipelineIdForMapping);
            if (ghlStageId) {
              ghlUpdateData.pipelineStageId = ghlStageId;
              console.log('✅ [DEAL UPDATE] Mapped stage to GHL ID:', ghlStageId);
            } else {
              console.log('⚠️ [DEAL UPDATE] Could not map stage, skipping pipelineStageId to avoid validation error');
              // Don't set pipelineStageId if we can't map it to a valid GHL stage ID
              // This prevents the 400 error from GHL API
            }
      } catch (error) {
            console.error('❌ [DEAL UPDATE] Error mapping stage:', error);
            console.log('⚠️ [DEAL UPDATE] Skipping pipelineStageId due to mapping error');
            // Don't set pipelineStageId if there's an error mapping
          }
        }
        
        if (updates.opportunityValue) ghlUpdateData.monetaryValue = updates.opportunityValue;
        
        // AssignedTo must be a valid user ID, not a name
        if (updates.owner) {
          try {
            // Try to find the user ID by name
            const users = await GHLService.getUsers();
            const user = users.find((u: any) => 
              u.firstName?.toLowerCase().includes(updates.owner.toLowerCase()) ||
              u.lastName?.toLowerCase().includes(updates.owner.toLowerCase()) ||
              u.name?.toLowerCase().includes(updates.owner.toLowerCase())
            );
            
            if (user) {
              ghlUpdateData.assignedTo = user.id;
              console.log('✅ [DEAL UPDATE] Mapped owner to user ID:', updates.owner, '->', user.id);
            } else {
              console.log('⚠️ [DEAL UPDATE] Could not find user ID for owner:', updates.owner);
            }
          } catch (error) {
            console.log('⚠️ [DEAL UPDATE] Error fetching users, skipping assignedTo:', error);
          }
        }
        
        if (updates.opportunitySource) ghlUpdateData.source = updates.opportunitySource;
        
        // Load GHL field mapping to determine field ownership dynamically
        const fieldMapping = loadGHLFieldMapping();
        console.log('🔍 [FIELD MAPPING] Loaded field mapping with', Object.keys(fieldMapping).length, 'fields');
        
        // Dynamically separate fields based on GHL field model
        const { opportunityCustomFields, contactCustomFields } = separateFieldsByModel(normalized, fieldMapping);
        
        console.log('🔍 [FIELD SEPARATION] Opportunity fields:', Object.keys(opportunityCustomFields).length);
        console.log('🔍 [FIELD SEPARATION] Contact fields:', Object.keys(contactCustomFields).length);
        
        // Sync Contact-level fields if we have a contactId and contact fields to update
        if (deal.contactId && Object.keys(contactCustomFields).length > 0) {
          try {
            console.log('👤 [DEAL UPDATE] Syncing Contact-level fields to GHL contact:', deal.contactId);
            console.log('👤 [DEAL UPDATE] Contact custom fields:', JSON.stringify(contactCustomFields, null, 2));
            
            // Format: Array with id, key and field_value for Contact API
            const contactCustomFieldsArray = Object.entries(contactCustomFields).map(([fieldId, value]) => {
              const fieldInfo = fieldMapping[fieldId];
              return {
                id: fieldId,
                key: fieldInfo?.fieldKey || fieldInfo?.name || fieldId,
                field_value: value
              };
            });
            
            await GHLService.updateContactCustomFields(deal.contactId, contactCustomFieldsArray);
            console.log('✅ [DEAL UPDATE] Successfully synced Contact-level fields to GHL');
          } catch (contactError: any) {
            console.warn('⚠️ [DEAL UPDATE] Failed to sync Contact-level fields to GHL:', contactError);
            // Don't fail the deal update if contact sync fails
          }
        } else if (Object.keys(contactCustomFields).length > 0) {
          console.log('⚠️ [DEAL UPDATE] No contactId available for Contact-level field sync');
        }
        
        
        // Update opportunity first without custom fields
        console.log('🔗 [DEAL UPDATE] GHL update data (without custom fields):', JSON.stringify(ghlUpdateData, null, 2));
        
        console.log('🔗 [DEAL UPDATE] GHL update data:', JSON.stringify(ghlUpdateData, null, 2));
        
        // Get the pipeline ID from the pipeline name for the update data
        const pipelineName = updates.pipeline || deal.pipeline;
        if (pipelineName) {
          const pipelineId = await GHLService.getPipelineId(pipelineName);
          if (pipelineId) {
            ghlUpdateData.pipelineId = pipelineId;
            console.log('✅ [DEAL UPDATE] Using pipeline ID:', pipelineId);
          } else {
            console.log('⚠️ [DEAL UPDATE] Could not find pipeline ID for:', pipelineName);
          }
        }
        
        // Add OPPORTUNITY custom fields to the GHL update data
        if (Object.keys(opportunityCustomFields).length > 0) {
          // Format: Array with id, key and field_value for Opportunity API
          const opportunityCustomFieldsArray = Object.entries(opportunityCustomFields).map(([fieldId, value]) => {
            const fieldInfo = fieldMapping[fieldId];
            return {
              id: fieldId,
              key: fieldInfo?.fieldKey || fieldInfo?.name || fieldId,
              field_value: value
            };
          });
          
          ghlUpdateData.customFields = opportunityCustomFieldsArray;
          console.log('🔗 [DEAL UPDATE] Opportunity custom fields:', JSON.stringify(opportunityCustomFieldsArray, null, 2));
        }
        
        console.log('🚀 [DEAL UPDATE] Calling GHL updateDeal with:', {
          dealId: deal.ghlOpportunityId,
          data: ghlUpdateData,
          pipelineId: ghlUpdateData.pipelineId
        });
        
        await GHLService.updateDeal(deal.ghlOpportunityId, ghlUpdateData);
        console.log('✅ [DEAL UPDATE] Successfully synced with GHL');
        
        // Custom fields are included in the main update above
      } catch (error: any) {
        console.warn('⚠️ [DEAL UPDATE] Failed to sync with GHL:', error);
        
        // If it's a 404 error, the GHL opportunity might be invalid
        if (error.message?.includes('not found')) {
          console.warn(`⚠️ [DEAL UPDATE] GHL opportunity ID ${deal.ghlOpportunityId} is invalid. Consider creating a new opportunity in GHL.`);
        }
        
        // Don't fail the deal update if GHL sync fails
      }
    }

    res.json(updatedDeal);
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// GHL Webhook endpoint for opportunity updates
router.post('/webhook/ghl-opportunity-update', async (req: Request, res: Response) => {
  try {
    // Basic webhook validation
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
    const providedSecret = req.headers['x-webhook-secret'] as string;
    
    if (webhookSecret && providedSecret !== webhookSecret) {
      console.log('❌ [GHL WEBHOOK] Invalid webhook secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('🔗 [GHL WEBHOOK] Received opportunity update:', JSON.stringify(req.body, null, 2));
    
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
    
    // Update basic fields - using actual GHL field names
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
    if (opportunity.source) {
      updates.opportunitySource = opportunity.source;
    }
    if (opportunity.lostReason) updates.lostReason = opportunity.lostReason;
    
    // Update custom fields if they exist
    if (opportunity.customFields) {
      const customFields = opportunity.customFields;
      
      // Map GHL custom fields back to our deal fields using actual GHL field names
      
      // Application Date
      if (customFields['opportunity.application_date']) updates.applicationDate = customFields['opportunity.application_date'];
      
      // Property Details (Opportunity Level)
      if (customFields['opportunity.property_address']) updates.propertyAddress = customFields['opportunity.property_address'];
      if (customFields['opportunity.property_apn']) updates.propertyAPN = customFields['opportunity.property_apn'];
      if (customFields['opportunity.property_type']) updates.propertyType = customFields['opportunity.property_type'];
      if (customFields['opportunity.property_vintage']) updates.propertyVintage = customFields['opportunity.property_vintage'];
      if (customFields['opportunity.property_status']) updates.propertyStatus = customFields['opportunity.property_status'];
      if (customFields['opportunity._of_units']) updates.numberOfUnits = customFields['opportunity._of_units'];
      if (customFields['opportunity.purchase_price']) updates.purchasePrice = customFields['opportunity.purchase_price'];
      if (customFields['opportunity.original_purchase_date']) updates.originalPurchaseDate = customFields['opportunity.original_purchase_date'];
      if (customFields['opportunity.occupancy']) updates.occupancy = customFields['opportunity.occupancy'];
      if (customFields['opportunity.occupancy_']) updates.occupancyPercentage = customFields['opportunity.occupancy_'];
      if (customFields['opportunity.appraised_value']) updates.appraisedValue = customFields['opportunity.appraised_value'];
      if (customFields['opportunity.debit_yield']) updates.debitYield = customFields['opportunity.debit_yield'];
      if (customFields['opportunity.property_capex']) updates.propertyCapEx = customFields['opportunity.property_capex'];
      if (customFields['opportunity.cost_basis']) updates.costBasis = customFields['opportunity.cost_basis'];
      if (customFields['opportunity.management_entity']) updates.managementEntity = customFields['opportunity.management_entity'];
      
      // Loan Details (Opportunity Level)
      if (customFields['opportunity.borrowing_entity']) updates.borrowingEntity = customFields['opportunity.borrowing_entity'];
      if (customFields['opportunity.lender']) updates.lender = customFields['opportunity.lender'];
      if (customFields['opportunity.loan_amount']) updates.loanAmount = customFields['opportunity.loan_amount'];
      if (customFields['opportunity.unpaid_principal_balance']) updates.unpaidPrincipalBalance = customFields['opportunity.unpaid_principal_balance'];
      if (customFields['opportunity.deal_type']) updates.dealType = customFields['opportunity.deal_type'];
      if (customFields['opportunity.investment_type']) updates.investmentType = customFields['opportunity.investment_type'];
      if (customFields['opportunity.ltv']) updates.ltv = customFields['opportunity.ltv'];
      if (customFields['opportunity.dscr']) updates.dscr = customFields['opportunity.dscr'];
      if (customFields['opportunity.hc_origination_fee']) updates.hcOriginationFee = customFields['opportunity.hc_origination_fee'];
      if (customFields['opportunity.ysp']) updates.ysp = customFields['opportunity.ysp'];
      if (customFields['opportunity.processing_fee']) updates.processingFee = customFields['opportunity.processing_fee'];
      if (customFields['opportunity.lender_origination_fee']) updates.lenderOriginationFee = customFields['opportunity.lender_origination_fee'];
      if (customFields['opportunity.term']) updates.term = customFields['opportunity.term'];
      if (customFields['opportunity.index']) updates.index = customFields['opportunity.index'];
      
      // Sponsor Details (Opportunity Level)
      if (customFields['opportunity.sponsor_name']) updates.sponsorName = customFields['opportunity.sponsor_name'];
      if (customFields['opportunity.sponsor_net_worth']) updates.sponsorNetWorth = customFields['opportunity.sponsor_net_worth'];
      if (customFields['opportunity.sponsor_liquidity']) updates.sponsorLiquidity = customFields['opportunity.sponsor_liquidity'];
      
      // Additional Opportunity-level fields
      if (customFields['opportunity.index_']) updates.indexPercentage = customFields['opportunity.index_'];
      if (customFields['opportunity.spread_']) updates.spreadPercentage = customFields['opportunity.spread_'];
      if (customFields['opportunity.rate_']) updates.ratePercentage = customFields['opportunity.rate_'];
      if (customFields['opportunity.probability_']) updates.probabilityPercentage = customFields['opportunity.probability_'];
      if (customFields['opportunity.amortization']) updates.amortization = customFields['opportunity.amortization'];
      if (customFields['opportunity.exit_fee']) updates.exitFee = customFields['opportunity.exit_fee'];
      if (customFields['opportunity.prepayment_penalty']) updates.prepaymentPenalty = customFields['opportunity.prepayment_penalty'];
      if (customFields['opportunity.recourse']) updates.recourse = customFields['opportunity.recourse'];
      if (customFields['opportunity.fixed_maturity_date']) updates.fixedMaturityDate = customFields['opportunity.fixed_maturity_date'];
      if (customFields['opportunity.floating_maturity_date']) updates.floatingMaturityDate = customFields['opportunity.floating_maturity_date'];
      if (customFields['opportunity.close_date']) updates.closeDate = customFields['opportunity.close_date'];
      if (customFields['opportunity.call_center_employee']) updates.callCenterEmployee = customFields['opportunity.call_center_employee'];
      if (customFields['opportunity.mondaycom_item_id']) updates.mondaycomItemId = customFields['opportunity.mondaycom_item_id'];
      
      // Contact-level fields (these come from contact custom fields, not opportunity)
      // Note: These would need to be handled via contact webhook or separate contact sync
      // These fields use {{ contact.field_name }} in GHL and require separate contact sync
      // TODO: Implement contact-level field sync via GHL contact webhook
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

// GHL Contact webhook endpoint for contact updates
router.post('/webhook/ghl-contact-update', async (req: Request, res: Response) => {
  try {
    // Basic webhook validation
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
    const providedSecret = req.headers['x-webhook-secret'] as string;
    
    if (webhookSecret && providedSecret !== webhookSecret) {
      console.log('❌ [GHL CONTACT WEBHOOK] Invalid webhook secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('👤 [GHL CONTACT WEBHOOK] Received contact update:', JSON.stringify(req.body, null, 2));
    
    const { contact } = req.body;
    
    if (!contact || !contact.id) {
      console.log('❌ [GHL CONTACT WEBHOOK] Invalid contact data received');
      return res.status(400).json({ error: 'Invalid contact data' });
    }
    
    // Find deals associated with this contact
    const deals = await FirebaseService.getAllDeals();
    const relatedDeals = deals.filter(d => d.contactId === contact.id);
    
    if (relatedDeals.length === 0) {
      console.log('⚠️ [GHL CONTACT WEBHOOK] No deals found with contact ID:', contact.id);
      return res.status(404).json({ error: 'No related deals found' });
    }
    
    console.log('✅ [GHL CONTACT WEBHOOK] Found related deals:', relatedDeals.length);
    
    // Prepare updates from GHL contact custom fields
    const updates: any = {};
    
    // Update Contact-level fields from GHL contact custom fields
    if (contact.customFields) {
      const customFields = contact.customFields;
      
      // Map GHL contact custom fields back to our deal fields using actual field keys
      if (customFields['contact.application_deal_type']) updates.applicationDealType = customFields['contact.application_deal_type'];
      if (customFields['contact.application_property_type']) updates.applicationPropertyType = customFields['contact.application_property_type'];
      if (customFields['contact.application_property_address']) updates.applicationPropertyAddress = customFields['contact.application_property_address'];
      if (customFields['contact.application_property_vintage']) updates.applicationPropertyVintage = customFields['contact.application_property_vintage'];
      if (customFields['contact.application_sponsor_net_worth']) updates.applicationSponsorNetWorth = customFields['contact.application_sponsor_net_worth'];
      if (customFields['contact.application_sponsor_liquidity']) updates.applicationSponsorLiquidity = customFields['contact.application_sponsor_liquidity'];
      if (customFields['contact.application_loan_request']) updates.applicationLoanRequest = customFields['contact.application_loan_request'];
      if (customFields['contact.application_document_upload']) updates.applicationDocumentUpload = customFields['contact.application_document_upload'];
      if (customFields['contact.application_additional_information']) updates.applicationAdditionalInformation = customFields['contact.application_additional_information'];
      
      // Additional contact-level fields
      if (customFields['contact.discord_username']) updates.discordUsername = customFields['contact.discord_username'];
      if (customFields['contact.application_submitted_by']) updates.applicationSubmittedBy = customFields['contact.application_submitted_by'];
      if (customFields['contact.lead_property_type']) updates.leadPropertyType = customFields['contact.lead_property_type'];
      if (customFields['contact.lead_property_address']) updates.leadPropertyAddress = customFields['contact.lead_property_address'];
      if (customFields['contact.lead_property_city']) updates.leadPropertyCity = customFields['contact.lead_property_city'];
      if (customFields['contact.lead_property_state']) updates.leadPropertyState = customFields['contact.lead_property_state'];
      if (customFields['contact.lead_property_purchase_date']) updates.leadPropertyPurchaseDate = customFields['contact.lead_property_purchase_date'];
      if (customFields['contact.lead_property_purchase_price']) updates.leadPropertyPurchasePrice = customFields['contact.lead_property_purchase_price'];
      if (customFields['contact.lead_property_no_of_units']) updates.leadPropertyNoOfUnits = customFields['contact.lead_property_no_of_units'];
    }
    
    // Update all related deals with the contact field changes
    if (Object.keys(updates).length > 0) {
      console.log('🔄 [GHL CONTACT WEBHOOK] Updating deals with contact changes:', JSON.stringify(updates, null, 2));
      
      for (const deal of relatedDeals) {
        try {
          await FirebaseService.updateDeal(deal.id, updates);
          console.log('✅ [GHL CONTACT WEBHOOK] Updated deal:', deal.id);
        } catch (error) {
          console.error('❌ [GHL CONTACT WEBHOOK] Failed to update deal:', deal.id, error);
        }
      }
      
      console.log('✅ [GHL CONTACT WEBHOOK] Successfully updated all related deals');
    } else {
      console.log('ℹ️ [GHL CONTACT WEBHOOK] No relevant contact field changes to sync');
    }
    
    res.json({ success: true, message: 'Contact updates processed successfully', updatedDeals: relatedDeals.length });
  } catch (error) {
    console.error('❌ [GHL CONTACT WEBHOOK] Error processing contact webhook:', error);
    res.status(500).json({ error: 'Failed to process contact webhook' });
  }
});

// Test webhook endpoint
router.get('/webhook/test', async (req: Request, res: Response) => {
  res.json({ 
    message: 'GHL Webhook endpoints are working!', 
    timestamp: new Date().toISOString(),
    endpoints: {
      opportunity: '/api/deals/webhook/ghl-opportunity-update',
      contact: '/api/deals/webhook/ghl-contact-update'
    },
    method: 'POST'
  });
});

// Test stage change webhook endpoint
router.post('/webhook/test-stage-change', async (req: Request, res: Response) => {
  try {
    const { dealId, newStageId, pipelineId } = req.body;
    
    if (!dealId || !newStageId || !pipelineId) {
      return res.status(400).json({ 
        error: 'Missing required fields: dealId, newStageId, pipelineId' 
      });
    }
    
    // Find the deal
    const deals = await FirebaseService.getAllDeals();
    const deal = deals.find(d => d.id === dealId);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    // Get stage name from GHL
    const stageName = await GHLService.getStageNameById(pipelineId, newStageId);
    
    if (!stageName) {
      return res.status(400).json({ error: 'Could not fetch stage name from GHL' });
    }
    
    // Map to system stage
    const normalizedStage = mapGHLStageToSystemStage(stageName);
    
    // Update the deal
    const updates = {
      stage: normalizedStage,
      stageLastUpdated: new Date().toISOString()
    };
    
    await FirebaseService.updateDeal(dealId, updates);
    
    res.json({
      success: true,
      message: 'Stage change test completed',
      dealId,
      oldStage: deal.stage,
      newStage: normalizedStage,
      ghlStageName: stageName,
      updates
    });
    
  } catch (error) {
    console.error('❌ [TEST WEBHOOK] Error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

// Helper endpoint to get deal IDs and GHL info for testing
router.get('/webhook/test-info', async (req: Request, res: Response) => {
  try {
    const deals = await FirebaseService.getAllDeals();
    
    // Get first few deals with their GHL info
    const testDeals = deals.slice(0, 5).map(deal => ({
      id: deal.id,
      propertyName: deal.propertyName,
      currentStage: deal.stage,
      ghlOpportunityId: deal.ghlOpportunityId,
      ghlContactId: deal.contactId
    }));
    
    res.json({
      message: 'Test information for webhook testing',
      localWebhookUrl: 'http://localhost:5000/api/deals/webhook/ghl-opportunity-update',
      testEndpoints: {
        webhookTest: 'GET /api/deals/webhook/test',
        stageChangeTest: 'POST /api/deals/webhook/test-stage-change',
        testInfo: 'GET /api/deals/webhook/test-info'
      },
      sampleDeals: testDeals,
      instructions: {
        step1: 'Use a deal ID from sampleDeals above',
        step2: 'Get pipeline and stage IDs from GHL',
        step3: 'Test with POST /api/deals/webhook/test-stage-change',
        step4: 'Set up GHL webhook with local URL'
      }
    });
    
  } catch (error) {
    console.error('❌ [TEST INFO] Error:', error);
    res.status(500).json({ error: 'Failed to get test info' });
  }
});

// Test field separation logic
router.get('/test-field-separation', async (req: Request, res: Response) => {
  try {
    console.log('🧪 [FIELD TEST] Testing field separation logic...');
    
    // Load field mapping
    const fieldMapping = loadGHLFieldMapping();
    console.log('🔍 [FIELD TEST] Loaded field mapping with', Object.keys(fieldMapping).length, 'fields');
    
    // Test with sample updates
    const testUpdates = {
      propertyAddress: '123 Test St',
      loanAmount: 1000000,
      applicationDealType: 'Commercial',
      discordUsername: 'testuser123',
      propertyType: 'Multifamily',
      applicationSponsorNetWorth: '5000000'
    };
    
    console.log('🧪 [FIELD TEST] Test updates:', testUpdates);
    
    // Separate fields
    const { opportunityCustomFields, contactCustomFields } = separateFieldsByModel(testUpdates, fieldMapping);
    
    console.log('🧪 [FIELD TEST] Opportunity fields:', opportunityCustomFields);
    console.log('🧪 [FIELD TEST] Contact fields:', contactCustomFields);
    
    res.json({
      success: true,
      message: 'Field separation test completed',
      testUpdates,
      opportunityFields: opportunityCustomFields,
      contactFields: contactCustomFields,
      fieldMappingCount: Object.keys(fieldMapping).length
    });
  } catch (error) {
    console.error('❌ [FIELD TEST] Error testing field separation:', error);
    res.status(500).json({ 
      error: 'Failed to test field separation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test GHL API endpoint
router.get('/test-ghl/:dealId', async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    console.log('🧪 [TEST] Testing GHL API for deal:', dealId);
    
    // Test getting the opportunity first
    console.log('🧪 [TEST] Step 1: Testing getOpportunity...');
    const opportunity = await GHLService.getOpportunity(dealId);
    if (!opportunity) {
      return res.status(404).json({ 
        error: 'Opportunity not found in GHL',
        dealId: dealId,
        message: 'The opportunity exists in GHL but our API call failed to find it'
      });
    }
    
    console.log('✅ [TEST] Step 1: Successfully found opportunity');
    
    // Test updating with minimal data
    const testData = {
      name: `Test Update ${new Date().toISOString()}`,
      customFields: [
        { id: 'Test Field', key: 'Test Field', field_value: 'Test Value' }
      ]
    };
    
    console.log('🧪 [TEST] Step 2: Testing update with data:', testData);
    const result = await GHLService.updateDeal(dealId, testData);
    
    res.json({
      message: 'GHL API test successful!',
      dealId: dealId,
      opportunity: opportunity,
      updateResult: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [TEST] GHL API test failed:', error);
    res.status(500).json({
      error: 'GHL API test failed',
      dealId: req.params.dealId,
      message: error.message,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

// List all GHL opportunities for debugging
router.get('/list-ghl-opportunities', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [DEBUG] Listing all GHL opportunities...');
    
    // Get all opportunities
    const opportunities = await GHLService.listAllOpportunities();
    
    // Also try to get opportunities from specific pipelines
    const pipelineId = await GHLService.getPipelineId('Hardwell DEALFLOW');
    let pipelineOpportunities: any[] = [];
    
    if (pipelineId) {
      console.log('🔍 [DEBUG] Also checking pipeline opportunities...');
      pipelineOpportunities = await GHLService.listAllOpportunities(pipelineId);
    }
    
    res.json({
      message: 'GHL opportunities listed successfully',
      totalOpportunities: opportunities.length,
      pipelineOpportunitiesCount: pipelineOpportunities.length,
      allOpportunities: opportunities.map(opp => ({
        id: opp.id,
        name: opp.name,
        status: opp.status,
        pipelineId: opp.pipelineId,
        stageId: opp.stageId
      })),
      pipelineOpportunities: pipelineOpportunities.map(opp => ({
        id: opp.id,
        name: opp.name,
        status: opp.status,
        pipelineId: opp.pipelineId,
        stageId: opp.stageId
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [DEBUG] Error listing GHL opportunities:', error);
    res.status(500).json({
      error: 'Failed to list GHL opportunities',
      message: error.message,
      details: error.response?.data
    });
  }
});

// List all GHL users for debugging
router.get('/list-ghl-users', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [DEBUG] Listing all GHL users...');
    
    const users = await GHLService.getUsers();
    
    res.json({
      message: 'GHL users listed successfully',
      totalUsers: users.length,
      users: users.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [DEBUG] Error listing GHL users:', error);
    res.status(500).json({
      error: 'Failed to list GHL users',
      message: error.message,
      details: error.response?.data
    });
  }
});

// Fetch and store GHL custom fields
router.get('/fetch-ghl-custom-fields', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [CUSTOM FIELDS] Fetching GHL custom fields...');
    
    const fs = require('fs');
    const path = require('path');
    
    // Fetch all custom fields
    const allFields = await GHLService.getAllCustomFields();
    const contactFields = await GHLService.getContactCustomFields();
    const opportunityFields = await GHLService.getOpportunityCustomFields();
    
    // Create the custom fields data structure
    const customFieldsData = {
      timestamp: new Date().toISOString(),
      locationId: allFields.locationId,
      summary: {
        totalFields: allFields.totalFields,
        contactFields: contactFields.totalFields,
        opportunityFields: opportunityFields.totalFields
      },
      allFields: allFields.customFields,
      contactFields: contactFields.customFields,
      opportunityFields: opportunityFields.customFields
    };
    
    // Save to JSON file
    const filePath = path.join(__dirname, '../../ghl-custom-fields.json');
    fs.writeFileSync(filePath, JSON.stringify(customFieldsData, null, 2));
    
    console.log('✅ [CUSTOM FIELDS] Custom fields saved to:', filePath);
    
    res.json({
      message: 'GHL custom fields fetched and stored successfully',
      filePath: filePath,
      summary: customFieldsData.summary,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [CUSTOM FIELDS] Error fetching custom fields:', error);
    res.status(500).json({
      error: 'Failed to fetch GHL custom fields',
      message: error.message,
      details: error.response?.data
    });
  }
});

// Get GHL custom fields (without storing)
router.get('/ghl-custom-fields', async (req: Request, res: Response) => {
  try {
    const { model } = req.query;
    
    console.log('🔍 [CUSTOM FIELDS] Fetching GHL custom fields for model:', model || 'all');
    
    let result;
    if (model === 'contact') {
      result = await GHLService.getContactCustomFields();
    } else if (model === 'opportunity') {
      result = await GHLService.getOpportunityCustomFields();
    } else {
      result = await GHLService.getAllCustomFields();
    }
    
    res.json({
      message: 'GHL custom fields fetched successfully',
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ [CUSTOM FIELDS] Error fetching custom fields:', error);
    res.status(500).json({
      error: 'Failed to fetch GHL custom fields',
      message: error.message,
      details: error.response?.data
    });
  }
});

// Delete deal
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify deal belongs to user
    const deal = await FirebaseService.getDealById(id);
    if (!deal || deal.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Delete deal from Firebase
    await FirebaseService.deleteDeal(id);

    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

// Get deal documents
router.get('/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify deal belongs to user
    const deal = await FirebaseService.getDealById(id);
    if (!deal || deal.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Return empty array - documents are not stored in Firebase
    res.json([]);
  } catch (error) {
    console.error('Get deal documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;
