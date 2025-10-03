const axios = require('axios');

// Check if a GHL opportunity ID is valid
async function checkGHLOpportunity(opportunityId) {
  try {
    const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';
    const GHL_API_KEY = process.env.GHL_API_KEY;
    
    if (!GHL_API_KEY) {
      console.error('❌ GHL_API_KEY environment variable not set');
      return;
    }

    const headers = {
      'Authorization': `Bearer ${GHL_API_KEY}`,
      'Content-Type': 'application/json'
    };

    console.log(`🔍 Checking GHL opportunity: ${opportunityId}`);
    
    const response = await axios.get(
      `${GHL_BASE_URL}/opportunities/${opportunityId}`,
      { headers }
    );
    
    console.log('✅ Opportunity found!');
    console.log('📋 Opportunity details:');
    console.log(`   - Name: ${response.data.opportunity?.name || 'N/A'}`);
    console.log(`   - Status: ${response.data.opportunity?.status || 'N/A'}`);
    console.log(`   - Pipeline: ${response.data.opportunity?.pipelineId || 'N/A'}`);
    console.log(`   - Stage: ${response.data.opportunity?.pipelineStageId || 'N/A'}`);
    console.log(`   - Source: ${response.data.opportunity?.source || 'N/A'}`);
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.error(`❌ Opportunity not found: ${opportunityId}`);
      console.error('   This opportunity may have been deleted or the ID is incorrect.');
    } else if (error.response?.status === 401) {
      console.error('❌ Authentication failed. Please check your GHL_API_KEY.');
    } else if (error.response?.status === 403) {
      console.error('❌ Access denied. Please check your GHL API permissions.');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Get opportunity ID from command line argument
const opportunityId = process.argv[2];

if (!opportunityId) {
  console.error('Usage: node check-ghl-opportunity.js <opportunity-id>');
  console.error('Example: node check-ghl-opportunity.js Ca8lYk2GTRzQakcCXP3y');
  process.exit(1);
}

checkGHLOpportunity(opportunityId);
