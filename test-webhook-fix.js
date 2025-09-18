const axios = require('axios');

// Test webhook endpoint
async function testWebhook() {
  try {
    console.log('🧪 Testing webhook endpoint...');
    
    // Replace with your new ngrok URL
    const webhookUrl = 'https://YOUR_NEW_NGROK_URL.ngrok.io/api/deals/webhook/ghl-opportunity-update';
    
    const testPayload = {
      type: 'OpportunityStageUpdate',
      opportunity: {
        id: 'test-opportunity-id',
        pipelineId: 'test-pipeline-id',
        pipelineStageId: 'test-stage-id',
        name: 'Test Opportunity'
      }
    };
    
    const response = await axios.post(webhookUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Webhook test successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Webhook test failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

// Test info endpoint
async function testInfo() {
  try {
    console.log('📊 Testing info endpoint...');
    
    const infoUrl = 'https://YOUR_NEW_NGROK_URL.ngrok.io/api/deals/webhook/test-info';
    
    const response = await axios.get(infoUrl);
    
    console.log('✅ Info endpoint successful!');
    console.log('Deals:', response.data);
    
  } catch (error) {
    console.error('❌ Info endpoint failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting webhook tests...\n');
  
  await testInfo();
  console.log('\n' + '='.repeat(50) + '\n');
  await testWebhook();
}

runTests();
