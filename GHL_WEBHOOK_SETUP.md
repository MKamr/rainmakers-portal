# GoHighLevel Webhook Setup for Bidirectional Sync

This document explains how to set up bidirectional synchronization between the Rainmakers Portal and GoHighLevel (GHL).

## Overview

The system now supports bidirectional sync:
- **Portal → GHL**: When you update fields in the portal, they sync to GHL custom fields
- **GHL → Portal**: When you update fields in GHL, they sync back to the portal

## Webhook Endpoint

**URL**: `https://your-domain.com/api/deals/webhook/ghl-opportunity-update`
**Method**: `POST`
**Content-Type**: `application/json`

## Setup Instructions

### 1. Configure Environment Variables

Add these to your `.env` file:

```env
# GHL Webhook Security (optional but recommended)
GHL_WEBHOOK_SECRET=your-secret-key-here
```

### 2. Set Up GHL Webhook

1. Log into your GoHighLevel account
2. Go to **Settings** → **Integrations** → **Webhooks**
3. Click **Add Webhook**
4. Configure the webhook:
   - **Event**: `Opportunity Updated`
   - **URL**: `https://your-domain.com/api/deals/webhook/ghl-opportunity-update`
   - **Method**: `POST`
   - **Headers**: 
     - `Content-Type: application/json`
     - `X-Webhook-Secret: your-secret-key-here` (if using secret)
   - **Status**: `Active`

### 3. Test the Webhook

You can test if the webhook endpoint is working by visiting:
```
GET https://your-domain.com/api/deals/webhook/test
```

This should return:
```json
{
  "message": "GHL Webhook endpoint is working!",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "endpoint": "/api/deals/webhook/ghl-opportunity-update",
  "method": "POST"
}
```

## Field Mapping

### Portal → GHL (Outbound Sync)
When you update fields in the portal, they are mapped to GHL custom fields:

| Portal Field | GHL Custom Field |
|--------------|------------------|
| Property Address | Property Address |
| Property Type | Property Type |
| Loan Amount | Loan Amount |
| Sponsor Name | Sponsor Name |
| Stage | Stage |
| Status | Status |
| ... | ... |

### GHL → Portal (Inbound Sync)
When you update fields in GHL, they are mapped back to portal fields:

| GHL Custom Field | Portal Field |
|------------------|--------------|
| Property Address | propertyAddress |
| Property Type | propertyType |
| Loan Amount | loanAmount |
| Sponsor Name | sponsorName |
| Stage | stage |
| Status | status |
| ... | ... |

## Supported Fields

### Property Details
- Property Address, APN, Type, Vintage, Status
- Number of Units, Purchase Price, Original Purchase Date
- Occupancy %, Appraised Value, Debit Yield
- Property CapEx, Cost Basis, Management Entity
- Occupancy % Date

### Loan Details
- Borrowing Entity, Lender, Loan Amount
- Unpaid Principal Balance, Deal Type, Investment Type
- LTV, DSCR, HC Origination Fee, YSP
- Processing Fee, Lender Origination Fee, Term
- Index, Index %, Spread %, Rate %
- Amortization, Exit Fee

### Sponsor Details
- Sponsor Name, Sponsor Net Worth, Sponsor Liquidity

### Opportunity Details
- Opportunity Name, Pipeline, Stage, Status
- Opportunity Value, Owner, Business Name
- Opportunity Source, Application Date

### Contact Details
- Contact Name, Contact Email, Contact Phone

## How It Works

1. **Portal Update**: When you change a field in the portal and click "Update"
   - The change is saved to Firebase
   - The change is synced to GHL custom fields
   - GHL receives the update

2. **GHL Update**: When you change a field in GHL
   - GHL sends a webhook to our endpoint
   - We find the corresponding deal by GHL opportunity ID
   - We update the deal in Firebase with the new values
   - The portal will show the updated values on next refresh

## Troubleshooting

### Webhook Not Working
1. Check if the webhook URL is accessible
2. Verify the webhook secret matches (if using one)
3. Check server logs for error messages
4. Ensure GHL is sending the correct payload format

### Fields Not Syncing
1. Verify the field names match exactly between portal and GHL
2. Check if the deal has a valid `ghlOpportunityId`
3. Ensure the webhook is configured for the correct event type
4. Check server logs for sync errors

### Common Issues
- **404 Error**: Deal not found - ensure the GHL opportunity ID is correctly stored
- **401 Error**: Invalid webhook secret - check the secret configuration
- **500 Error**: Server error - check the server logs for details

## Security Notes

- The webhook endpoint is public but validates the webhook secret
- Only deals with valid GHL opportunity IDs are updated
- All webhook requests are logged for debugging
- Failed webhook processing doesn't affect the main application

## Monitoring

Check the server logs for webhook activity:
- `🔗 [GHL WEBHOOK]` - Webhook received
- `✅ [GHL WEBHOOK]` - Successful processing
- `❌ [GHL WEBHOOK]` - Error processing
- `⚠️ [GHL WEBHOOK]` - Warning (deal not found, etc.)
