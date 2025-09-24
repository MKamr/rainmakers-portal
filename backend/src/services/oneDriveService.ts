import axios from 'axios';
import { FirebaseService, OneDriveToken } from './firebaseService';
import { Timestamp } from 'firebase-admin/firestore';

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  webUrl: string;
  downloadUrl?: string;
}

export class OneDriveService {
  private static readonly GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

  // Helper method to get the deal folder name
  private static async getDealFolderName(dealId: string): Promise<string> {
    try {
      // Try to get the deal from Firebase to get property address
      const deal = await FirebaseService.getDealById(dealId);
      if (deal && deal.propertyAddress) {
        return `${deal.propertyAddress} (${dealId})`;
      }
      return dealId;
    } catch (error) {
      console.warn('⚠️ [ONEDRIVE] Could not get deal info, using dealId as folder name:', error);
      return dealId;
    }
  }

  static async getAccessToken(): Promise<string> {
    const token = await FirebaseService.getLatestOneDriveToken();

    if (!token) {
      throw new Error('OneDrive not connected. Please connect in admin dashboard.');
    }

    // Check if token is expired
    if (new Date() >= token.expiresAt.toDate()) {
      return await this.refreshAccessToken(token.refreshToken);
    }

    return token.accessToken;
  }

  private static async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      console.log('🔄 [TOKEN] Refreshing OneDrive token (Web App Flow)...');
      console.log('🔄 [TOKEN] Client ID:', process.env.MICROSOFT_CLIENT_ID ? 'Set' : 'Not set');
      console.log('🔄 [TOKEN] Client Secret:', process.env.MICROSOFT_CLIENT_SECRET ? 'Set' : 'Not set');
      console.log('🔄 [TOKEN] Redirect URI:', process.env.MICROSOFT_REDIRECT_URI || 'Not set');
      
      // Use Web app flow with client secret
      const formData = new URLSearchParams();
      formData.append('client_id', process.env.MICROSOFT_CLIENT_ID || '');
      formData.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET || '');
      formData.append('refresh_token', refreshToken);
      formData.append('grant_type', 'refresh_token');
      formData.append('redirect_uri', process.env.MICROSOFT_REDIRECT_URI || '');
      formData.append('scope', 'https://graph.microsoft.com/Files.ReadWrite.All offline_access User.Read');

      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, refresh_token, expires_in } = response.data;
      console.log('✅ [TOKEN] Tokens refreshed successfully');

      // Update token in Firebase
      const token = await FirebaseService.getLatestOneDriveToken();
      if (token) {
        await FirebaseService.saveOneDriveToken({
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: Timestamp.fromDate(new Date(Date.now() + expires_in * 1000)),
          scope: token.scope
        });
        console.log('✅ [TOKEN] Updated tokens saved to Firebase');
      }

      return access_token;
    } catch (error) {
      console.error('❌ [TOKEN] Error refreshing OneDrive token:', error);
      throw new Error('Failed to refresh OneDrive token');
    }
  }

  static async createDealFolder(dealId: string, propertyAddress?: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Create the hierarchical folder structure: Hardwell Capital/Hardwell Capital $/Hardwell Capital Origination/Prospects/Pre-Approved Property
      const folderPath = 'Hardwell Capital/Hardwell Capital $/Hardwell Capital Origination/Prospects/Pre-Approved Property';
      
      console.log('📁 [ONEDRIVE] Creating hierarchical folder structure:', folderPath);
      
      // Split the path into individual folder names
      const folderNames = folderPath.split('/');
      let currentPath = '';
      
      // Create each folder in the hierarchy
      for (let i = 0; i < folderNames.length; i++) {
        const folderName = folderNames[i];
        currentPath += (currentPath ? '/' : '') + folderName;
        
        try {
          // Check if folder exists
          await axios.get(
            `${this.GRAPH_BASE_URL}/me/drive/root:/${encodeURIComponent(currentPath)}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );
          console.log(`📁 [ONEDRIVE] Folder exists: ${currentPath}`);
        } catch (error: any) {
          // If folder doesn't exist, create it
          if (error.response?.status === 404) {
            console.log(`📁 [ONEDRIVE] Creating folder: ${currentPath}`);
            
            const parentPath = i === 0 ? 'root' : folderNames.slice(0, i).join('/');
            const createUrl = i === 0 
              ? `${this.GRAPH_BASE_URL}/me/drive/root/children`
              : `${this.GRAPH_BASE_URL}/me/drive/root:/${encodeURIComponent(parentPath)}:/children`;
            
            await axios.post(
              createUrl,
              {
                name: folderName,
                folder: {},
                '@microsoft.graph.conflictBehavior': 'rename'
              },
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log(`✅ [ONEDRIVE] Folder created: ${currentPath}`);
          } else {
            throw error;
          }
        }
      }
      
      // Now create the deal-specific folder inside the final folder
      // Use property address as folder name, fallback to dealId if not provided
      const folderName = propertyAddress ? 
        `${propertyAddress} (${dealId})` : 
        dealId;
      
      const dealFolderPath = `${folderPath}/${folderName}`;
      console.log(`📁 [ONEDRIVE] Creating deal folder: ${dealFolderPath}`);
      
      const response = await axios.post(
        `${this.GRAPH_BASE_URL}/me/drive/root:/${encodeURIComponent(folderPath)}:/children`,
        {
          name: folderName,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ [ONEDRIVE] Deal folder created:', dealFolderPath);
      return response.data.id;
    } catch (error) {
      console.error('❌ [ONEDRIVE] Error creating OneDrive folder:', error);
      throw new Error('Failed to create deal folder');
    }
  }

  static async uploadFile(dealId: string, filename: string, fileBuffer: Buffer, mimeType: string): Promise<OneDriveFile> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Get the dynamic folder name based on property address
      const dealFolderName = await this.getDealFolderName(dealId);
      
      // Use the hierarchical folder structure
      const folderPath = 'Hardwell Capital/Hardwell Capital $/Hardwell Capital Origination/Prospects/Pre-Approved Property';
      const filePath = `${folderPath}/${dealFolderName}/${filename}`;
      
      console.log('📤 [ONEDRIVE] Uploading file to:', filePath);
      
      // First, ensure the deal folder exists
      try {
        const deal = await FirebaseService.getDealById(dealId);
        await this.createDealFolder(dealId, deal?.propertyAddress);
        console.log('✅ [ONEDRIVE] Deal folder ensured to exist');
      } catch (error) {
        console.log('⚠️ [ONEDRIVE] Deal folder creation failed, proceeding with upload:', error);
      }
      
      const response = await axios.put(
        `${this.GRAPH_BASE_URL}/me/drive/root:/${encodeURIComponent(filePath)}:/content`,
        fileBuffer,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': mimeType
          }
        }
      );

      console.log('✅ [ONEDRIVE] File uploaded successfully:', filename);
      return {
        id: response.data.id,
        name: response.data.name,
        size: response.data.size,
        createdDateTime: response.data.createdDateTime,
        lastModifiedDateTime: response.data.lastModifiedDateTime,
        webUrl: response.data.webUrl,
        downloadUrl: response.data['@microsoft.graph.downloadUrl']
      };
    } catch (error) {
      console.error('❌ [ONEDRIVE] Error uploading file to OneDrive:', error);
      throw new Error('Failed to upload file');
    }
  }

  static async getDealFiles(dealId: string): Promise<OneDriveFile[]> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Get the dynamic folder name based on property address
      const dealFolderName = await this.getDealFolderName(dealId);
      
      // Use the hierarchical folder structure
      const folderPath = 'Hardwell Capital/Hardwell Capital $/Hardwell Capital Origination/Prospects/Pre-Approved Property';
      const dealFolderPath = `${folderPath}/${dealFolderName}`;
      
      console.log('📁 [ONEDRIVE] Getting files from:', dealFolderPath);
      
      const response = await axios.get(
        `${this.GRAPH_BASE_URL}/me/drive/root:/${encodeURIComponent(dealFolderPath)}:/children`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      console.log('📄 [ONEDRIVE] Files retrieved:', response.data.value.length);
      return response.data.value.map((file: any) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        createdDateTime: file.createdDateTime,
        lastModifiedDateTime: file.lastModifiedDateTime,
        webUrl: file.webUrl,
        downloadUrl: file['@microsoft.graph.downloadUrl']
      }));
    } catch (error) {
      console.error('❌ [ONEDRIVE] Error fetching OneDrive files:', error);
      throw new Error('Failed to fetch files');
    }
  }

  static async deleteFile(fileId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();
      
      await axios.delete(
        `${this.GRAPH_BASE_URL}/me/drive/items/${fileId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
    } catch (error) {
      console.error('Error deleting OneDrive file:', error);
      throw new Error('Failed to delete file');
    }
  }
}
