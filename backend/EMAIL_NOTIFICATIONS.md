# Email Notification System

This document describes the email notification system implemented for the Rainmakers Portal, which sends beautiful HTML email notifications for deal updates and document uploads.

## Features

### 1. Deal Update Notifications
- **Trigger**: When a deal is updated through the API
- **Content**: Shows what fields were changed, who made the changes, and current deal information
- **Design**: Modern HTML template with gradient headers and organized information cards

### 2. Document Upload Notifications
- **Trigger**: When a document is uploaded to a deal
- **Content**: Shows the uploaded file name, who uploaded it, and deal information
- **Design**: Green-themed template highlighting the document upload action

### 3. New Deal Notifications (Existing)
- **Trigger**: When a new deal is created
- **Content**: Complete deal information with all relevant details
- **Design**: Blue-themed template for new deal creation

## Email Templates

All email templates are designed with:
- **Responsive Design**: Works on desktop and mobile devices
- **Modern Styling**: Clean, professional appearance with gradients and shadows
- **Accessibility**: High contrast colors and readable fonts
- **Email Client Compatibility**: Tested with major email clients
- **Dark Mode Support**: Proper color schemes for both light and dark modes

### Template Features
- Gradient headers with appropriate colors for each notification type
- Information cards displaying deal details in an organized grid
- Status badges for deal status and stage
- Call-to-action buttons linking to the portal
- Footer with unsubscribe information
- Mobile-responsive design

## Configuration

### Email Service Setup
The email service requires the following configuration in Firebase:

```typescript
interface EmailConfig {
  smtpHost: string;           // SMTP server hostname
  smtpPort: number;           // SMTP server port (usually 587 or 465)
  smtpUser: string;           // SMTP username
  smtpPassword: string;       // SMTP password
  fromEmail: string;          // Sender email address
  fromName: string;            // Sender display name
  notificationEmails: string[]; // Array of recipient email addresses
}
```

### Environment Variables
Make sure these environment variables are set:
- `FRONTEND_URL`: The URL of your frontend application (used in email links)

## API Endpoints

### Automatic Notifications
These notifications are sent automatically when actions occur:

1. **Deal Updates** (`PUT /api/deals/:id`)
   - Sends notification when deal fields are updated
   - Includes list of changed fields and user who made changes

2. **Document Uploads** (`POST /api/documents/upload`)
   - Sends notification when documents are uploaded to deals
   - Includes file name and user who uploaded

### Test Endpoints
Test the email notification system:

```bash
# Test deal update notification
POST /api/deals/test-email-notifications
{
  "type": "deal-update",
  "dealId": "your-deal-id"
}

# Test document upload notification
POST /api/deals/test-email-notifications
{
  "type": "document-upload", 
  "dealId": "your-deal-id"
}
```

## Email Service Methods

### Public Methods

```typescript
// Send deal update notification
await EmailService.sendDealUpdateNotificationEmail(
  deal: Deal, 
  changes: string[], 
  updatedBy: string
);

// Send document upload notification
await EmailService.sendDocumentUploadNotificationEmail(
  deal: Deal, 
  fileName: string, 
  uploadedBy: string
);

// Send new deal notification (existing)
await EmailService.sendDealNotificationEmail(deal: Deal);

// Test email connection
await EmailService.testEmailConnection(): Promise<boolean>;

// Send test email
await EmailService.sendTestEmail(to: string): Promise<boolean>;
```

## Error Handling

The email notification system is designed to be non-blocking:
- Email failures do not prevent deal updates or document uploads
- Errors are logged but do not throw exceptions
- The system gracefully handles missing email configuration
- Cold start scenarios are handled for serverless deployments

## Customization

### Template Customization
To customize the email templates:

1. **Colors**: Modify the CSS color variables in the template methods
2. **Layout**: Adjust the HTML structure and CSS grid layouts
3. **Content**: Update the information displayed in each template
4. **Branding**: Add your company logo and branding elements

### Notification Recipients
Configure notification recipients in the Firebase email configuration:
- Add/remove email addresses from the `notificationEmails` array
- Each notification type uses the same recipient list
- Recipients can be team members, managers, or external stakeholders

## Monitoring and Debugging

### Logs
The system provides detailed logging:
- `✅ [EMAIL]` - Successful email sends
- `❌ [EMAIL]` - Email failures
- `⚠️ [EMAIL]` - Configuration warnings

### Testing
Use the test endpoint to verify email functionality:
```bash
curl -X POST http://localhost:5000/api/deals/test-email-notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"type": "deal-update", "dealId": "DEAL_ID"}'
```

## Security Considerations

- Email credentials are stored securely in Firebase
- SMTP connections use TLS encryption
- No sensitive deal information is exposed in email subjects
- Email addresses are validated before sending

## Performance

- Email sending is asynchronous and non-blocking
- Templates are generated efficiently with minimal memory usage
- SMTP connections are reused when possible
- Failed emails don't retry automatically (to prevent spam)

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check SMTP configuration in Firebase
   - Verify network connectivity to SMTP server
   - Check email service initialization

2. **Template rendering issues**
   - Verify HTML template syntax
   - Test with different email clients
   - Check CSS compatibility

3. **Missing notifications**
   - Ensure email service is properly initialized
   - Check notification email configuration
   - Verify user permissions

### Debug Steps

1. Test email connection: `GET /api/email/test-connection`
2. Send test email: `POST /api/email/test`
3. Check logs for error messages
4. Verify Firebase configuration
5. Test with different email providers

## Future Enhancements

Potential improvements for the email notification system:

1. **Email Preferences**: Allow users to configure which notifications they receive
2. **Rich Templates**: Add more interactive elements and animations
3. **Attachment Support**: Include deal documents in email notifications
4. **Digest Emails**: Send daily/weekly summaries instead of individual notifications
5. **Template Editor**: Web interface for customizing email templates
6. **Analytics**: Track email open rates and engagement
7. **Multi-language Support**: Localized email templates
8. **Advanced Filtering**: Smart filtering based on deal importance or user roles
