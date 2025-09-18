#!/usr/bin/env node

/**
 * Test script for GHL webhook stage synchronization
 * 
 * Usage:
 * node test-webhook.js
 * 
 * This script will:
 * 1. Test the webhook endpoint
 * 2. Simulate a stage change
 * 3. Show the results
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const WEBHOOK_URL = `${BASE_URL}/api/deals/webhook/ghl-opportunity-update`;
const TEST_URL = `${BASE_URL}/api/deals/webhook/test-stage-change`;

// Sample webhook payload that GHL would send
const sampleWebhookPayload = {
  opportunity: {
    id: "test-opportunity-123",
    name: "Test Deal - Stage Change",
    status: "open",
    pipelineId: "VDm7RPYC2GLUvdpKmBfC", // Replace with your actual pipeline ID
    pipelineStageId: "7915dedc-8f18-44d5-8bc3-77c04e994a10", // Replace with your actual stage ID
    monetaryValue: 500000,
    assignedTo: "082goXVW3lIExEQPOnd3", // Replace with your actual user ID
    source: "Test Webhook",
    customFields: [
      {
        id: "test-field-id",
        key: "opportunity.deal_type",
        field_value: "Commercial"
      }
    ]
  }
};

async function testWebhookEndpoint() {
  console.log('🧪 Testing GHL Webhook Endpoint...\n');
  
  try {
    // Test 1: Check if webhook endpoint is accessible
    console.log('1️⃣ Testing webhook endpoint accessibility...');
    const response = await axios.get(`${BASE_URL}/api/deals/webhook/test`);
    console.log('✅ Webhook endpoint is accessible');
    console.log('📋 Available endpoints:', response.data.endpoints);
    console.log('');
    
    // Test 2: Get all deals to find a test deal
    console.log('2️⃣ Fetching deals to find a test target...');
    const dealsResponse = await axios.get(`${BASE_URL}/api/deals`);
    const deals = dealsResponse.data;
    
    if (deals.length === 0) {
      console.log('❌ No deals found. Please create a deal first.');
      return;
    }
    
    const testDeal = deals[0]; // Use first deal for testing
    console.log(`✅ Found test deal: ${testDeal.propertyName || testDeal.id}`);
    console.log(`📊 Current stage: ${testDeal.stage || 'No stage'}`);
    console.log('');
    
    // Test 3: Simulate webhook with real deal data
    console.log('3️⃣ Simulating GHL webhook with real deal data...');
    
    const webhookPayload = {
      ...sampleWebhookPayload,
      opportunity: {
        ...sampleWebhookPayload.opportunity,
        id: testDeal.ghlOpportunityId || 'test-opportunity-123'
      }
    };
    
    console.log('📤 Sending webhook payload:', JSON.stringify(webhookPayload, null, 2));
    
    const webhookResponse = await axios.post(WEBHOOK_URL, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.GHL_WEBHOOK_SECRET || 'test-secret'
      }
    });
    
    console.log('✅ Webhook processed successfully');
    console.log('📋 Response:', webhookResponse.data);
    console.log('');
    
    // Test 4: Verify the deal was updated
    console.log('4️⃣ Verifying deal was updated...');
    const updatedDealsResponse = await axios.get(`${BASE_URL}/api/deals`);
    const updatedDeal = updatedDealsResponse.data.find(d => d.id === testDeal.id);
    
    if (updatedDeal) {
      console.log(`✅ Deal updated successfully`);
      console.log(`📊 New stage: ${updatedDeal.stage || 'No stage'}`);
      console.log(`🕒 Stage last updated: ${updatedDeal.stageLastUpdated || 'Not set'}`);
    } else {
      console.log('❌ Deal not found after update');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📋 Error response:', error.response.data);
    }
  }
}

async function testStageChangeEndpoint() {
  console.log('\n🧪 Testing Stage Change Endpoint...\n');
  
  try {
    // Get deals first
    const dealsResponse = await axios.get(`${BASE_URL}/api/deals`);
    const deals = dealsResponse.data;
    
    if (deals.length === 0) {
      console.log('❌ No deals found. Please create a deal first.');
      return;
    }
    
    const testDeal = deals[0];
    console.log(`📊 Testing with deal: ${testDeal.propertyName || testDeal.id}`);
    console.log(`📊 Current stage: ${testDeal.stage || 'No stage'}`);
    
    // Test stage change
    const stageChangePayload = {
      dealId: testDeal.id,
      newStageId: "7915dedc-8f18-44d5-8bc3-77c04e994a10", // Replace with actual stage ID
      pipelineId: "VDm7RPYC2GLUvdpKmBfC" // Replace with actual pipeline ID
    };
    
    console.log('📤 Sending stage change payload:', JSON.stringify(stageChangePayload, null, 2));
    
    const response = await axios.post(TEST_URL, stageChangePayload);
    
    console.log('✅ Stage change test completed');
    console.log('📋 Response:', response.data);
    
  } catch (error) {
    console.error('❌ Stage change test failed:', error.message);
    if (error.response) {
      console.error('📋 Error response:', error.response.data);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 GHL Webhook Test Script');
  console.log('========================\n');
  
  console.log('📝 Note: Make sure your backend is running on http://localhost:5000');
  console.log('📝 Note: Update the pipeline and stage IDs in this script with your actual GHL values');
  console.log('📝 Note: For GHL webhook testing, use ngrok: npm install -g ngrok && ngrok http 5000\n');
  
  await testWebhookEndpoint();
  await testStageChangeEndpoint();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Update the pipeline and stage IDs in this script');
  console.log('2. Install ngrok: npm install -g ngrok');
  console.log('3. Start ngrok: ngrok http 5000');
  console.log('4. Set up the webhook in GHL with the ngrok URL: https://abc123.ngrok.io/api/deals/webhook/ghl-opportunity-update');
  console.log('5. Test by changing a deal stage in GHL');
  console.log('6. Check the portal for the green dot indicator on stage badges');
}

// Run the tests
main().catch(console.error);
