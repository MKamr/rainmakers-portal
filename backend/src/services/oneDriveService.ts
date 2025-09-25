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
      
      // Use the SharePoint shared folder path structure
      const folderPath = 'Hardwell Capital - Hardwell Capital Origination/Prospects/Pre-Approved Property';
      
      // For SharePoint shared folders, we need to find the correct SharePoint site first
      console.log('🔍 [ONEDRIVE] Searching for SharePoint site with shared folder...');
      
      // Use the specific SharePoint site we know exists
      let sharePointSiteId = null;
      try {
        console.log('🔍 [ONEDRIVE] Getting SharePoint site: hardwellcapital.sharepoint.com/sites/HardwellCapital');
        
        // Use the specific site hostname and site name from the URL
        const siteResponse = await axios.get(
          `${this.GRAPH_BASE_URL}/sites/hardwellcapital.sharepoint.com:/sites/HardwellCapital`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        if (siteResponse.data && siteResponse.data.id) {
          sharePointSiteId = siteResponse.data.id;
          console.log('✅ [ONEDRIVE] Found SharePoint site:', siteResponse.data.displayName, 'ID:', siteResponse.data.id);
        }
      } catch (siteError: any) {
        console.log('⚠️ [ONEDRIVE] Error accessing specific SharePoint site:', siteError.message);
        console.log('⚠️ [ONEDRIVE] Falling back to OneDrive approach...');
      }
      
      // If we found a SharePoint site, use it; otherwise fall back to OneDrive
      const baseUrl = sharePointSiteId 
        ? `${this.GRAPH_BASE_URL}/sites/${sharePointSiteId}/drive`
        : `${this.GRAPH_BASE_URL}/me/drive`;
      
      console.log('🔍 [ONEDRIVE] Checking if parent folder exists:', folderPath);
      try {
        await axios.get(
          `${baseUrl}/root:/${encodeURIComponent(folderPath)}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        console.log('✅ [ONEDRIVE] Parent folder exists:', folderPath);
      } catch (parentError: any) {
        if (parentError.response?.status === 404) {
          console.log('📁 [ONEDRIVE] Parent folder does not exist, creating it...');
          
          // Create the parent folder structure
          const folderNames = folderPath.split('/');
          let currentPath = '';
          
          for (let i = 0; i < folderNames.length; i++) {
            const folderName = folderNames[i];
            currentPath += (currentPath ? '/' : '') + folderName;
            
            try {
              // Check if this specific folder exists
              await axios.get(
                `${baseUrl}/root:/${encodeURIComponent(currentPath)}`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`
                  }
                }
              );
              console.log(`✅ [ONEDRIVE] Folder exists: ${currentPath}`);
            } catch (folderError: any) {
              // If folder doesn't exist, create it
              if (folderError.response?.status === 404) {
                console.log(`📁 [ONEDRIVE] Creating folder: ${currentPath}`);
                
                const parentPath = i === 0 ? 'root' : folderNames.slice(0, i).join('/');
                const createUrl = i === 0 
                  ? `${baseUrl}/root/children`
                  : `${baseUrl}/root:/${encodeURIComponent(parentPath)}:/children`;
                
                try {
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
                } catch (createError: any) {
                  // If we get a 409 conflict, the folder already exists, so continue
                  if (createError.response?.status === 409) {
                    console.log(`📁 [ONEDRIVE] Folder already exists (409 conflict): ${currentPath}`);
                    continue;
                  } else {
                    throw createError;
                  }
                }
        } else {
                throw folderError;
              }
            }
          }
        } else {
          throw parentError;
        }
      }
      
      // Use property address as folder name, fallback to dealId if not provided
      const folderName = propertyAddress ? 
        `${propertyAddress} (${dealId})` : 
        dealId;
      
      const dealFolderPath = `${folderPath}/${folderName}`;
      console.log(`📁 [ONEDRIVE] Creating deal folder: ${dealFolderPath}`);
      
      // Now search for existing deal folders
      console.log('🔍 [ONEDRIVE] Searching for existing deal folders...');
      try {
        const searchResponse = await axios.get(
          `${baseUrl}/root:/${encodeURIComponent(folderPath)}:/children`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        if (searchResponse.data.value && searchResponse.data.value.length > 0) {
          // Look for folders that contain the dealId
          const matchingFolder = searchResponse.data.value.find((folder: any) => 
            folder.name.includes(dealId) && folder.folder
          );
          
          if (matchingFolder) {
            console.log('✅ [ONEDRIVE] Found existing deal folder:', matchingFolder.name);
            return matchingFolder.id;
          }
        }
      } catch (searchError: any) {
        console.log('⚠️ [ONEDRIVE] Could not search parent folder, proceeding with creation...');
      }

      // If no existing folder found, try to create it
      console.log('📁 [ONEDRIVE] No existing folder found, creating new one...');
      try {
      const response = await axios.post(
          `${baseUrl}/root:/${encodeURIComponent(folderPath)}:/children`,
          {
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename' // This will rename if conflict
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('✅ [ONEDRIVE] Deal folder created successfully:', response.data.name);
        return response.data.id;
      } catch (createError: any) {
        // If we get a 409 conflict, try to find the renamed folder
        if (createError.response?.status === 409) {
          console.log('📁 [ONEDRIVE] Folder creation conflict (409), searching for renamed folder...');
          
              try {
                const searchResponse = await axios.get(
                  `${baseUrl}/root:/${encodeURIComponent(folderPath)}:/children`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            );
            
            if (searchResponse.data.value && searchResponse.data.value.length > 0) {
              // Find the folder that contains the dealId (might be renamed)
              const matchingFolder = searchResponse.data.value.find((folder: any) => 
                folder.name.includes(dealId) && folder.folder
              );
              
              if (matchingFolder) {
                console.log('✅ [ONEDRIVE] Found renamed deal folder:', matchingFolder.name);
                return matchingFolder.id;
              }
            }
            
            // If still not found, create with timestamp
            console.log('⚠️ [ONEDRIVE] Creating folder with unique timestamp...');
            const uniqueFolderName = `${folderName} - ${Date.now()}`;
                const uniqueResponse = await axios.post(
                  `${baseUrl}/root:/${encodeURIComponent(folderPath)}:/children`,
              {
                name: uniqueFolderName,
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
            console.log('✅ [ONEDRIVE] Created unique deal folder:', uniqueResponse.data.name);
            return uniqueResponse.data.id;
          } catch (finalError: any) {
            console.error('❌ [ONEDRIVE] Final error creating folder:', finalError);
            throw finalError;
          }
        } else {
          throw createError;
        }
      }
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
      
      // Use the SharePoint shared folder structure
      const folderPath = 'Hardwell Capital - Hardwell Capital Origination/Prospects/Pre-Approved Property';
      const filePath = `${folderPath}/${dealFolderName}/${filename}`;
      
      console.log('📤 [ONEDRIVE] Uploading file to:', filePath);
      
      // Ensure the deal folder exists (createDealFolder handles duplicates gracefully)
      try {
        const deal = await FirebaseService.getDealById(dealId);
        await this.createDealFolder(dealId, deal?.propertyAddress);
        console.log('✅ [ONEDRIVE] Deal folder ensured to exist');
      } catch (error) {
        console.log('⚠️ [ONEDRIVE] Deal folder creation failed, proceeding with upload:', error);
      }
      
      // Find the SharePoint site for the upload
      let sharePointSiteId = null;
      try {
        console.log('🔍 [ONEDRIVE] Getting SharePoint site for upload: hardwellcapital.sharepoint.com/sites/HardwellCapital');
        
        const siteResponse = await axios.get(
          `${this.GRAPH_BASE_URL}/sites/hardwellcapital.sharepoint.com:/sites/HardwellCapital`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        if (siteResponse.data && siteResponse.data.id) {
          sharePointSiteId = siteResponse.data.id;
          console.log('✅ [ONEDRIVE] Found SharePoint site for upload:', siteResponse.data.displayName);
        }
      } catch (siteError: any) {
        console.log('⚠️ [ONEDRIVE] Could not access SharePoint site for upload, using OneDrive...');
      }
      
      const baseUrl = sharePointSiteId 
        ? `${this.GRAPH_BASE_URL}/sites/${sharePointSiteId}/drive`
        : `${this.GRAPH_BASE_URL}/me/drive`;
      
      const response = await axios.put(
        `${baseUrl}/root:/${encodeURIComponent(filePath)}:/content`,
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
      
      // Use the SharePoint shared folder structure
      const folderPath = 'Hardwell Capital - Hardwell Capital Origination/Prospects/Pre-Approved Property';
      const dealFolderPath = `${folderPath}/${dealFolderName}`;
      
      console.log('📁 [ONEDRIVE] Getting files from:', dealFolderPath);
      
      // Find the SharePoint site for the file retrieval
      let sharePointSiteId = null;
      try {
        console.log('🔍 [ONEDRIVE] Getting SharePoint site for file retrieval: hardwellcapital.sharepoint.com/sites/HardwellCapital');
        
        const siteResponse = await axios.get(
          `${this.GRAPH_BASE_URL}/sites/hardwellcapital.sharepoint.com:/sites/HardwellCapital`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        if (siteResponse.data && siteResponse.data.id) {
          sharePointSiteId = siteResponse.data.id;
          console.log('✅ [ONEDRIVE] Found SharePoint site for file retrieval:', siteResponse.data.displayName);
        }
      } catch (siteError: any) {
        console.log('⚠️ [ONEDRIVE] Could not access SharePoint site for file retrieval, using OneDrive...');
      }
      
      const baseUrl = sharePointSiteId 
        ? `${this.GRAPH_BASE_URL}/sites/${sharePointSiteId}/drive`
        : `${this.GRAPH_BASE_URL}/me/drive`;
      
      const response = await axios.get(
        `${baseUrl}/root:/${encodeURIComponent(dealFolderPath)}:/children`,
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
        originalName: file.name,
        filename: file.name,
        size: file.size,
        fileSize: file.size,
        mimeType: file.file?.mimeType || 'application/octet-stream',
        tags: [],
        oneDriveId: file.id,
        oneDriveUrl: file.webUrl,
        downloadUrl: file['@microsoft.graph.downloadUrl'],
        createdDateTime: file.createdDateTime,
        lastModifiedDateTime: file.lastModifiedDateTime,
        createdAt: file.createdDateTime,
        updatedAt: file.lastModifiedDateTime,
        userId: '', // Will be set by the route handler
        dealId: dealId
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
