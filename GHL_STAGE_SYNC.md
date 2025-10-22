# GHL Stage Synchronization

## Overview
The Rainmakers Portal automatically synchronizes deal stages with GoHighLevel (GHL) when stages are changed in GHL. This ensures both systems stay in sync without manual intervention.

## How It Works

### 1. Webhook Setup
- **Endpoint**: `/api/deals/webhook/ghl-opportunity-update`
- **Method**: POST
- **Trigger**: When an opportunity's stage is changed in GHL

### 2. Stage Mapping
The system maps GHL stage names to internal system stages:

| GHL Stage Name | System Stage |
|----------------|--------------|
| Initial Qualification | Qualification |
| Qualification | Qualification |
| Needs Analysis | Needs Analysis |
| Lender Submission | Lender Submission |
| Proposal | Proposal |
| Signed Proposal | Signed Proposal |
| Underwriting | Underwriting |

### 3. Process Flow
1. **Stage Change in GHL** → GHL sends webhook to our portal
2. **Webhook Processing** → Portal receives opportunity update
3. **Stage Lookup** → Portal fetches stage name from GHL using stage ID
4. **Stage Mapping** → GHL stage name is mapped to system stage
5. **Database Update** → Firebase is updated with new stage
6. **Visual Indicator** → Frontend shows green dot for recently updated stages

### 4. Visual Indicators
- **Green Dot**: Shows when stage was recently updated from GHL
- **Tooltip**: Shows exact timestamp of last stage update
- **Stage Badge**: Displays current stage with update indicator

## Testing

### Test Endpoint
You can test stage synchronization using:
```
POST /api/deals/webhook/test-stage-change
```

**Body:**
```json
{
  "dealId": "your-deal-id",
  "newStageId": "ghl-stage-id", 
  "pipelineId": "ghl-pipeline-id"
}
```

### Manual Testing
1. Change a deal's stage in GHL
2. Check the portal - stage should update automatically
3. Look for green dot indicator on the stage badge
4. Hover over stage badge to see last update timestamp

## Configuration

### Environment Variables
- `GHL_WEBHOOK_SECRET`: Secret for webhook validation (optional)

### GHL Webhook Setup
1. Go to GHL Settings → Webhooks
2. Add new webhook:
   - **Event**: Opportunity Update
   - **URL**: `http://localhost:5000/api/deals/webhook/ghl-opportunity-update` (for local testing with ngrok)
   - **URL**: `https://your-domain.com/api/deals/webhook/ghl-opportunity-update` (for production)
   - **Secret**: (optional) Set `GHL_WEBHOOK_SECRET`

### Local Testing with ngrok
Since GHL doesn't accept localhost URLs, use ngrok to create a public tunnel:

1. **Install ngrok**: `npm install -g ngrok`
2. **Start your backend**: `npm run dev` (in backend folder)
3. **Start ngrok**: `ngrok http 5000`
4. **Copy ngrok URL**: Use the HTTPS URL from ngrok (e.g., `https://abc123.ngrok.io`)
5. **Set up GHL webhook**: Use `https://abc123.ngrok.io/api/deals/webhook/ghl-opportunity-update`

## Troubleshooting

### Common Issues
1. **Stage not updating**: Check webhook URL and GHL API key
2. **Wrong stage mapping**: Update `mapGHLStageToSystemStage` function
3. **Webhook not firing**: Verify GHL webhook configuration

### Logs to Check
- `🔄 [GHL WEBHOOK] Processing stage change`
- `🎯 [GHL WEBHOOK] Stage changed from: X to: Y`
- `✅ [GHL WEBHOOK] Deal updated successfully`

## Benefits
- **Real-time Sync**: Stages update instantly when changed in GHL
- **No Manual Work**: Eliminates need to manually update stages
- **Audit Trail**: Timestamps track when stages were last updated
- **Visual Feedback**: Users can see which stages were updated from GHL
