# GHL Webhook Local Testing Commands

## 1. Test Webhook Endpoint (Basic)
```bash
curl -X GET http://localhost:5000/api/deals/webhook/test
```

## 2. Test Stage Change Endpoint
```bash
curl -X POST http://localhost:5000/api/deals/webhook/test-stage-change \
  -H "Content-Type: application/json" \
  -d '{
    "dealId": "YOUR_DEAL_ID",
    "newStageId": "YOUR_STAGE_ID", 
    "pipelineId": "YOUR_PIPELINE_ID"
  }'
```

## 3. Simulate GHL Webhook (Full Test)
```bash
curl -X POST http://localhost:5000/api/deals/webhook/ghl-opportunity-update \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-webhook-secret" \
  -d '{
    "opportunity": {
      "id": "YOUR_OPPORTUNITY_ID",
      "name": "Test Deal - Stage Change",
      "status": "open",
      "pipelineId": "YOUR_PIPELINE_ID",
      "pipelineStageId": "YOUR_STAGE_ID",
      "monetaryValue": 500000,
      "assignedTo": "YOUR_USER_ID",
      "source": "Test Webhook"
    }
  }'
```

## 4. Get All Deals (to find deal IDs)
```bash
curl -X GET http://localhost:5000/api/deals \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Setup Instructions

### Step 1: Start Your Backend
```bash
cd backend
npm run dev
```

### Step 2: Get Your GHL IDs
1. **Pipeline ID**: Go to GHL → Settings → Pipelines → Copy the ID
2. **Stage ID**: Go to GHL → Settings → Pipelines → Click on a stage → Copy the ID
3. **Deal ID**: Use the "Get All Deals" command above

### Step 3: Update the Commands
Replace these placeholders in the commands above:
- `YOUR_DEAL_ID` - From your Firebase deals
- `YOUR_STAGE_ID` - From GHL pipeline stages
- `YOUR_PIPELINE_ID` - From GHL pipelines
- `YOUR_OPPORTUNITY_ID` - From GHL opportunities
- `YOUR_USER_ID` - From GHL users
- `YOUR_TOKEN` - Your authentication token

### Step 4: Test the Webhook
1. Run the test commands above
2. Check your portal for the green dot indicator
3. Hover over stage badges to see update timestamps

### Step 5: Set Up GHL Webhook
1. Go to GHL → Settings → Webhooks
2. Add new webhook:
   - **Event**: Opportunity Update
   - **URL**: `http://localhost:5000/api/deals/webhook/ghl-opportunity-update`
   - **Secret**: (optional) Set in your `.env` file as `GHL_WEBHOOK_SECRET`

## Troubleshooting

### Webhook Not Working?
1. Check if backend is running on port 5000
2. Verify the webhook URL in GHL
3. Check browser console for errors
4. Look at backend logs for webhook activity

### Stage Not Updating?
1. Verify pipeline and stage IDs are correct
2. Check if deal has a `ghlOpportunityId` field
3. Ensure GHL API key is valid
4. Check webhook secret matches

### No Green Dot Appearing?
1. Verify `stageLastUpdated` field is being set
2. Check if the stage actually changed
3. Refresh the page after webhook test
4. Check browser console for errors
