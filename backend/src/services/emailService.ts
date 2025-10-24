import nodemailer from 'nodemailer';
import { Deal } from './firebaseService';

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  notificationEmails: string[];
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  private static config: EmailConfig | null = null;

  static async initialize(config: EmailConfig): Promise<void> {
    this.config = config;
    
    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });

    // Verify connection configuration
    try {
      await this.transporter.verify();
      console.log('✅ [EMAIL] SMTP connection verified successfully');
    } catch (error) {
      console.error('❌ [EMAIL] SMTP connection failed:', error);
      throw new Error('Email service configuration failed');
    }
  }

  static async sendDealNotificationEmail(deal: Deal): Promise<void> {
    if (!this.transporter || !this.config) {
      console.log('⚠️ [EMAIL] Email service not configured, skipping notification');
      return;
    }

    if (!this.config.notificationEmails || this.config.notificationEmails.length === 0) {
      console.log('⚠️ [EMAIL] No notification emails configured, skipping');
      return;
    }

    try {
      const emailHtml = this.generateDealNotificationHtml(deal);
      
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: this.config.notificationEmails.join(', '),
        subject: `🎯 New Deal Created: ${deal.dealId}`,
        html: emailHtml,
        text: this.generateDealNotificationText(deal),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ [EMAIL] Deal notification sent successfully:', result.messageId);
    } catch (error) {
      console.error('❌ [EMAIL] Failed to send deal notification:', error);
      // Don't throw error to avoid breaking deal creation
    }
  }

  static async sendDealUpdateNotificationEmail(deal: Deal, changes: string[], updatedBy: string): Promise<void> {
    if (!this.transporter || !this.config) {
      console.log('⚠️ [EMAIL] Email service not configured, skipping update notification');
      return;
    }

    if (!this.config.notificationEmails || this.config.notificationEmails.length === 0) {
      console.log('⚠️ [EMAIL] No notification emails configured, skipping update notification');
      return;
    }

    try {
      const emailHtml = this.generateDealUpdateNotificationHtml(deal, changes, updatedBy);
      
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: this.config.notificationEmails.join(', '),
        subject: `🔄 Deal Updated: ${deal.dealId}`,
        html: emailHtml,
        text: this.generateDealUpdateNotificationText(deal, changes, updatedBy),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ [EMAIL] Deal update notification sent successfully:', result.messageId);
    } catch (error) {
      console.error('❌ [EMAIL] Failed to send deal update notification:', error);
      // Don't throw error to avoid breaking deal update
    }
  }

  static async sendDocumentUploadNotificationEmail(deal: Deal, fileName: string, uploadedBy: string): Promise<void> {
    if (!this.transporter || !this.config) {
      console.log('⚠️ [EMAIL] Email service not configured, skipping document upload notification');
      return;
    }

    if (!this.config.notificationEmails || this.config.notificationEmails.length === 0) {
      console.log('⚠️ [EMAIL] No notification emails configured, skipping document upload notification');
      return;
    }

    try {
      const emailHtml = this.generateDocumentUploadNotificationHtml(deal, fileName, uploadedBy);
      
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: this.config.notificationEmails.join(', '),
        subject: `📄 Document Uploaded: ${fileName} for Deal ${deal.dealId}`,
        html: emailHtml,
        text: this.generateDocumentUploadNotificationText(deal, fileName, uploadedBy),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ [EMAIL] Document upload notification sent successfully:', result.messageId);
    } catch (error) {
      console.error('❌ [EMAIL] Failed to send document upload notification:', error);
      // Don't throw error to avoid breaking document upload
    }
  }

  private static generateDealNotificationHtml(deal: Deal): string {
    const dealUrl = `${process.env.FRONTEND_URL}/deals`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light">
        <title>New Deal Created - ${deal.dealId}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #000; /* Force dark text for email clients/dark mode */
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: #e8f0ff; /* light background that survives email clients */
                color: #000; /* dark text to avoid white-on-white */
                padding: 30px;
                text-align: center;
                border-bottom: 1px solid #d1d9ea;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
                color: #0b1957; /* dark navy for title */
            }
            .header p {
                margin: 10px 0 0 0;
                opacity: 1;
                color: #223;
                font-size: 16px;
            }
            .content {
                padding: 30px;
                color: #000;
            }
            .deal-id {
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
                font-family: 'Courier New', monospace;
                font-size: 18px;
                font-weight: bold;
                color: #000;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
            }
            .info-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            .info-card h3 {
                margin: 0 0 10px 0;
                color: #000;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .info-card p {
                margin: 0;
                font-size: 16px;
                font-weight: 500;
                color: #000;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-weight: 600;
                text-align: center;
                margin: 20px 0;
                transition: transform 0.2s;
            }
            .cta-button:hover {
                transform: translateY(-2px);
            }
            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #444;
                font-size: 14px;
                border-top: 1px solid #e9ecef;
            }
            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .status-open {
                background: #d4edda;
                color: #155724;
            }
            .stage-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: #e3f2fd;
                color: #1565c0;
            }
            @media (max-width: 600px) {
                .info-grid {
                    grid-template-columns: 1fr;
                }
                .header h1 {
                    font-size: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 New Deal Created</h1>
                <p>A new opportunity has been added to your pipeline</p>
            </div>
            
            <div class="content">
                <div class="deal-id">${deal.dealId}</div>
                
                <div class="info-grid">
                    <div class="info-card">
                        <h3>Property Address</h3>
                        <p>${deal.propertyAddress || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Property Type</h3>
                        <p>${deal.propertyType || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Contact Name</h3>
                        <p>${deal.contactName || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Contact Email</h3>
                        <p>${deal.contactEmail || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Loan Request</h3>
                        <p>${deal.loanRequest || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Deal Type</h3>
                        <p>${deal.dealType || 'Not specified'}</p>
                    </div>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <span class="status-badge status-open">${deal.status || 'Open'}</span>
                    <span class="stage-badge" style="margin-left: 10px;">${deal.stage || 'Qualification'}</span>
                </div>

                ${deal.additionalInformation ? `
                <div class="info-card">
                    <h3>Additional Information</h3>
                    <p>${deal.additionalInformation}</p>
                </div>
                ` : ''}

                <div style="text-align: center;">
                    <a href="${dealUrl}" class="cta-button">View Deal in Portal</a>
                </div>

                <p style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px;">
                    Created on ${currentDate}
                </p>
            </div>
            
            <div class="footer">
                <p>This is an automated notification from Rainmakers Portal</p>
                <p>If you no longer wish to receive these notifications, please contact your administrator.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private static generateDealNotificationText(deal: Deal): string {
    const dealUrl = `${process.env.FRONTEND_URL}/deals`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
🎯 NEW DEAL CREATED

Deal ID: ${deal.dealId}
Property Address: ${deal.propertyAddress || 'Not specified'}
Property Type: ${deal.propertyType || 'Not specified'}
Contact Name: ${deal.contactName || 'Not specified'}
Contact Email: ${deal.contactEmail || 'Not specified'}
Loan Request: ${deal.loanRequest || 'Not specified'}
Deal Type: ${deal.dealType || 'Not specified'}
Status: ${deal.status || 'Open'}
Stage: ${deal.stage || 'Qualification'}

${deal.additionalInformation ? `Additional Information: ${deal.additionalInformation}` : ''}

View Deal: ${dealUrl}

Created on: ${currentDate}

---
This is an automated notification from Rainmakers Portal
    `.trim();
  }

  private static generateDealUpdateNotificationHtml(deal: Deal, changes: string[], updatedBy: string): string {
    const dealUrl = `${process.env.FRONTEND_URL}/deals`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const changesList = changes.map(change => `<li>${change}</li>`).join('');

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light">
        <title>Deal Updated - ${deal.dealId}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #000;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-bottom: 1px solid #d1d9ea;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }
            .header p {
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
            }
            .content {
                padding: 30px;
                color: #000;
            }
            .deal-id {
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
                font-family: 'Courier New', monospace;
                font-size: 18px;
                font-weight: bold;
                color: #000;
            }
            .changes-section {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .changes-section h3 {
                margin: 0 0 15px 0;
                color: #856404;
                font-size: 16px;
            }
            .changes-list {
                margin: 0;
                padding-left: 20px;
            }
            .changes-list li {
                margin: 8px 0;
                color: #856404;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
            }
            .info-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            .info-card h3 {
                margin: 0 0 10px 0;
                color: #000;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .info-card p {
                margin: 0;
                font-size: 16px;
                font-weight: 500;
                color: #000;
            }
            .updated-by {
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 15px;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
                color: #1565c0;
                font-weight: 500;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-weight: 600;
                text-align: center;
                margin: 20px 0;
                transition: transform 0.2s;
            }
            .cta-button:hover {
                transform: translateY(-2px);
            }
            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #444;
                font-size: 14px;
                border-top: 1px solid #e9ecef;
            }
            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .status-open {
                background: #d4edda;
                color: #155724;
            }
            .stage-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: #e3f2fd;
                color: #1565c0;
            }
            @media (max-width: 600px) {
                .info-grid {
                    grid-template-columns: 1fr;
                }
                .header h1 {
                    font-size: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔄 Deal Updated</h1>
                <p>Changes have been made to an existing deal</p>
            </div>
            
            <div class="content">
                <div class="deal-id">${deal.dealId}</div>
                
                <div class="changes-section">
                    <h3>📝 Changes Made</h3>
                    <ul class="changes-list">
                        ${changesList}
                    </ul>
                </div>

                <div class="updated-by">
                    <strong>Updated by:</strong> ${updatedBy}
                </div>
                
                <div class="info-grid">
                    <div class="info-card">
                        <h3>Property Address</h3>
                        <p>${deal.propertyAddress || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Property Type</h3>
                        <p>${deal.propertyType || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Contact Name</h3>
                        <p>${deal.contactName || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Contact Email</h3>
                        <p>${deal.contactEmail || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Loan Request</h3>
                        <p>${deal.loanRequest || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Deal Type</h3>
                        <p>${deal.dealType || 'Not specified'}</p>
                    </div>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <span class="status-badge status-open">${deal.status || 'Open'}</span>
                    <span class="stage-badge" style="margin-left: 10px;">${deal.stage || 'Qualification'}</span>
                </div>

                <div style="text-align: center;">
                    <a href="${dealUrl}" class="cta-button">View Updated Deal</a>
                </div>

                <p style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px;">
                    Updated on ${currentDate}
                </p>
            </div>
            
            <div class="footer">
                <p>This is an automated notification from Rainmakers Portal</p>
                <p>If you no longer wish to receive these notifications, please contact your administrator.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private static generateDealUpdateNotificationText(deal: Deal, changes: string[], updatedBy: string): string {
    const dealUrl = `${process.env.FRONTEND_URL}/deals`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const changesList = changes.map(change => `• ${change}`).join('\n');

    return `
🔄 DEAL UPDATED

Deal ID: ${deal.dealId}
Updated by: ${updatedBy}

Changes Made:
${changesList}

Property Address: ${deal.propertyAddress || 'Not specified'}
Property Type: ${deal.propertyType || 'Not specified'}
Contact Name: ${deal.contactName || 'Not specified'}
Contact Email: ${deal.contactEmail || 'Not specified'}
Loan Request: ${deal.loanRequest || 'Not specified'}
Deal Type: ${deal.dealType || 'Not specified'}
Status: ${deal.status || 'Open'}
Stage: ${deal.stage || 'Qualification'}

View Deal: ${dealUrl}

Updated on: ${currentDate}

---
This is an automated notification from Rainmakers Portal
    `.trim();
  }

  private static generateDocumentUploadNotificationHtml(deal: Deal, fileName: string, uploadedBy: string): string {
    const dealUrl = `${process.env.FRONTEND_URL}/deals`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light">
        <title>Document Uploaded - ${fileName}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #000;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-bottom: 1px solid #d1d9ea;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }
            .header p {
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
            }
            .content {
                padding: 30px;
                color: #000;
            }
            .deal-id {
                background: #f8f9fa;
                border-left: 4px solid #28a745;
                padding: 15px;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
                font-family: 'Courier New', monospace;
                font-size: 18px;
                font-weight: bold;
                color: #000;
            }
            .document-section {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
            }
            .document-section h3 {
                margin: 0 0 10px 0;
                color: #155724;
                font-size: 18px;
            }
            .document-name {
                font-size: 20px;
                font-weight: bold;
                color: #155724;
                margin: 10px 0;
                word-break: break-all;
            }
            .uploaded-by {
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 15px;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
                color: #1565c0;
                font-weight: 500;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
            }
            .info-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e9ecef;
            }
            .info-card h3 {
                margin: 0 0 10px 0;
                color: #000;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .info-card p {
                margin: 0;
                font-size: 16px;
                font-weight: 500;
                color: #000;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-weight: 600;
                text-align: center;
                margin: 20px 0;
                transition: transform 0.2s;
            }
            .cta-button:hover {
                transform: translateY(-2px);
            }
            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #444;
                font-size: 14px;
                border-top: 1px solid #e9ecef;
            }
            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .status-open {
                background: #d4edda;
                color: #155724;
            }
            .stage-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                background: #e3f2fd;
                color: #1565c0;
            }
            @media (max-width: 600px) {
                .info-grid {
                    grid-template-columns: 1fr;
                }
                .header h1 {
                    font-size: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📄 Document Uploaded</h1>
                <p>A new document has been added to a deal</p>
            </div>
            
            <div class="content">
                <div class="deal-id">${deal.dealId}</div>
                
                <div class="document-section">
                    <h3>📁 New Document</h3>
                    <div class="document-name">${fileName}</div>
                </div>

                <div class="uploaded-by">
                    <strong>Uploaded by:</strong> ${uploadedBy}
                </div>
                
                <div class="info-grid">
                    <div class="info-card">
                        <h3>Property Address</h3>
                        <p>${deal.propertyAddress || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Property Type</h3>
                        <p>${deal.propertyType || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Contact Name</h3>
                        <p>${deal.contactName || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Contact Email</h3>
                        <p>${deal.contactEmail || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Loan Request</h3>
                        <p>${deal.loanRequest || 'Not specified'}</p>
                    </div>
                    <div class="info-card">
                        <h3>Deal Type</h3>
                        <p>${deal.dealType || 'Not specified'}</p>
                    </div>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <span class="status-badge status-open">${deal.status || 'Open'}</span>
                    <span class="stage-badge" style="margin-left: 10px;">${deal.stage || 'Qualification'}</span>
                </div>

                <div style="text-align: center;">
                    <a href="${dealUrl}" class="cta-button">View Deal & Documents</a>
                </div>

                <p style="text-align: center; color: #6c757d; font-size: 14px; margin-top: 30px;">
                    Uploaded on ${currentDate}
                </p>
            </div>
            
            <div class="footer">
                <p>This is an automated notification from Rainmakers Portal</p>
                <p>If you no longer wish to receive these notifications, please contact your administrator.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private static generateDocumentUploadNotificationText(deal: Deal, fileName: string, uploadedBy: string): string {
    const dealUrl = `${process.env.FRONTEND_URL}/deals`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
📄 DOCUMENT UPLOADED

Deal ID: ${deal.dealId}
Document: ${fileName}
Uploaded by: ${uploadedBy}

Property Address: ${deal.propertyAddress || 'Not specified'}
Property Type: ${deal.propertyType || 'Not specified'}
Contact Name: ${deal.contactName || 'Not specified'}
Contact Email: ${deal.contactEmail || 'Not specified'}
Loan Request: ${deal.loanRequest || 'Not specified'}
Deal Type: ${deal.dealType || 'Not specified'}
Status: ${deal.status || 'Open'}
Stage: ${deal.stage || 'Qualification'}

View Deal: ${dealUrl}

Uploaded on: ${currentDate}

---
This is an automated notification from Rainmakers Portal
    `.trim();
  }

  static async testEmailConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('❌ [EMAIL] Test connection failed:', error);
      return false;
    }
  }

  static async sendTestEmail(to: string): Promise<boolean> {
    if (!this.transporter || !this.config) {
      return false;
    }

    try {
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: to,
        subject: '🧪 Test Email - Rainmakers Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #667eea;">✅ Email Service Test</h2>
            <p>This is a test email to verify that the email service is working correctly.</p>
            <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>From:</strong> ${this.config.fromName} (${this.config.fromEmail})</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">If you received this email, the email service is configured correctly!</p>
          </div>
        `,
        text: `Email Service Test\n\nThis is a test email to verify that the email service is working correctly.\n\nSent at: ${new Date().toLocaleString()}\nFrom: ${this.config.fromName} (${this.config.fromEmail})\n\nIf you received this email, the email service is configured correctly!`
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('❌ [EMAIL] Test email failed:', error);
      return false;
    }
  }

  // Send a JSON attachment to configured notification emails
  static async sendJsonAttachmentEmail(filename: string, jsonData: any, subject?: string, bodyText?: string): Promise<boolean> {
    if (!this.transporter || !this.config) {
      console.log('⚠️ [EMAIL] Email service not configured, cannot send JSON attachment');
      return false;
    }

    if (!this.config.notificationEmails || this.config.notificationEmails.length === 0) {
      console.log('⚠️ [EMAIL] No notification emails configured, skipping JSON attachment email');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: this.config.notificationEmails.join(', '),
        subject: subject || `📄 ${filename}`,
        text: bodyText || `Attached is ${filename}.`,
        attachments: [
          {
            filename,
            content: Buffer.from(JSON.stringify(jsonData, null, 2), 'utf-8'),
            contentType: 'application/json'
          }
        ]
      } as any;

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ [EMAIL] JSON attachment email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ [EMAIL] Failed to send JSON attachment email:', error);
      return false;
    }
  }
}
