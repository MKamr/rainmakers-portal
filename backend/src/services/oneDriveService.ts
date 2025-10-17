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

  // Helper method to sanitize path components by removing trailing spaces and invalid characters
  private static sanitizePathComponent(component: string): string {
    return component.trim().replace(/[<>:"|?*\x00-\x1c\x7f]/g, '');
  }

  // Helper method to get the deal folder name
  private static async getDealFolderName(dealId: string): Promise<string> {
    try {
      // Try to get the deal from Firebase to get property address
      const deal = await FirebaseService.getDealById(dealId);
      if (deal && deal.propertyAddress) {
        return deal.propertyAddress;
      }
      return dealId;
    } catch (error) {
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

        // Update token in Firebase
        const token = await FirebaseService.getLatestOneDriveToken();
        if (token) {
        await FirebaseService.saveOneDriveToken({
            accessToken: access_token,
            refreshToken: refresh_token,
          expiresAt: Timestamp.fromDate(new Date(Date.now() + expires_in * 1000)),
          scope: token.scope
          });
        }

        return access_token;
    } catch (error) {
      throw new Error('Failed to refresh OneDrive token');
    }
  }

  static async createDealFolder(dealId: string, propertyAddress?: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Use the SharePoint shared folder path structure
      const folderPath = 'Hardwell Capital/Hardwell Capital Origination/Prospects/Pre-Approved Property';
      
      // For SharePoint shared folders, we need to find the correct SharePoint site first
      
      // Use the specific SharePoint site we know exists
      let sharePointSiteId = null;
      try {
        
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
        }
      } catch (siteError: any) {
      }
      
      // If we found a SharePoint site, use it; otherwise fall back to OneDrive
      const baseUrl = sharePointSiteId 
        ? `${this.GRAPH_BASE_URL}/sites/${sharePointSiteId}/drive`
        : `${this.GRAPH_BASE_URL}/me/drive`;
      
      try {
        await axios.get(
          `${baseUrl}/root:/${encodeURIComponent(folderPath)}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
      } catch (parentError: any) {
        if (parentError.response?.status === 404) {
          
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
            } catch (folderError: any) {
              // If folder doesn't exist, create it
              if (folderError.response?.status === 404) {
                
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
                } catch (createError: any) {
                  // If we get a 409 conflict, the folder already exists, so continue
                  if (createError.response?.status === 409) {
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
      const folderName = this.sanitizePathComponent(propertyAddress || dealId);
      
      const dealFolderPath = `${folderPath}/${folderName}`;
      
      // First, check if the exact deal folder already exists
      try {
        const existingFolderResponse = await axios.get(
          `${baseUrl}/root:/${encodeURIComponent(dealFolderPath)}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
        
        if (existingFolderResponse.data && existingFolderResponse.data.id) {
          return existingFolderResponse.data.id;
        }
      } catch (exactCheckError: any) {
        if (exactCheckError.response?.status === 404) {
        } else {
        }
      }
      
      // Now search for existing deal folders (fallback method)
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
          // Look for folders that match the property address or dealId
          const matchingFolder = searchResponse.data.value.find((folder: any) => 
            (propertyAddress && folder.name === propertyAddress) || 
            (!propertyAddress && folder.name === dealId) ||
            folder.name.includes(dealId)
          );
          
          if (matchingFolder) {
            return matchingFolder.id;
          }
        }
      } catch (searchError: any) {
      }

      // If no existing folder found, try to create it
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

  // Helper method to get the most appropriate MIME type for Graph API
  private static getOptimalMimeType(mimeType: string): string {
    // Map common MIME types to their optimal Graph API equivalents
    const mimeTypeMap: { [key: string]: string } = {
      'application/pdf': 'application/pdf',
      'application/msword': 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel': 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg': 'image/jpeg',
      'image/png': 'image/png',
      'image/gif': 'image/gif',
      'image/webp': 'image/webp',
      'application/zip': 'application/zip',
      'application/x-zip-compressed': 'application/zip',
      'application/x-rar-compressed': 'application/vnd.rar',
      'application/vnd.rar': 'application/vnd.rar',
      'application/x-7z-compressed': 'application/x-7z-compressed',
      'application/x-tar': 'application/x-tar',
      'application/gzip': 'application/gzip',
      'application/x-bzip2': 'application/x-bzip2',
      'text/plain': 'text/plain',
      'text/csv': 'text/csv'
    };
    
    return mimeTypeMap[mimeType] || 'application/octet-stream';
  }

  static async uploadFile(dealId: string, filename: string, fileBuffer: Buffer, mimeType: string): Promise<OneDriveFile> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Get the dynamic folder name based on property address and sanitize it
      const dealFolderName = this.sanitizePathComponent(await this.getDealFolderName(dealId));
      const sanitizedFilename = this.sanitizePathComponent(filename);
      
      // Use the SharePoint shared folder structure
      const folderPath = 'Hardwell Capital/Hardwell Capital Origination/Prospects/Pre-Approved Property';
      const filePath = `${folderPath}/${dealFolderName}/${sanitizedFilename}`;
      
      console.log('📤 [ONEDRIVE] Uploading file to:', filePath);
      console.log('📤 [ONEDRIVE] File size:', fileBuffer.length, 'bytes');
      console.log('📤 [ONEDRIVE] Original MIME type:', mimeType);
      
      // Get optimal MIME type for Graph API
      const optimalMimeType = this.getOptimalMimeType(mimeType);
      console.log('📤 [ONEDRIVE] Using MIME type:', optimalMimeType);
      
      // Check if file is larger than 4MB and needs upload session
      const FILE_SIZE_THRESHOLD = 4 * 1024 * 1024; // 4MB
      
      if (fileBuffer.length > FILE_SIZE_THRESHOLD) {
        console.log('📤 [ONEDRIVE] Large file detected, using upload session...');
        return await this.uploadLargeFile(accessToken, filePath, fileBuffer, optimalMimeType, sanitizedFilename);
      }
      
      // Note: Deal folder should already exist from deal creation or document check
      // If it doesn't exist, the upload will fail with 404, which is handled by the caller
      
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
      
      // Add conflict behavior parameter to handle file overwrites properly
      const uploadUrl = `${baseUrl}/root:/${encodeURIComponent(filePath)}:/content?@microsoft.graph.conflictBehavior=replace`;
      
      const response = await axios.put(
        uploadUrl,
        fileBuffer,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': optimalMimeType,
            'Content-Length': fileBuffer.length.toString(),
            'Prefer': 'respond-async'
          }
        }
      );

      console.log('✅ [ONEDRIVE] File uploaded successfully:', sanitizedFilename || filename);
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

  // Upload large files (>4MB) using upload sessions
  private static async uploadLargeFile(accessToken: string, filePath: string, fileBuffer: Buffer, mimeType: string, filename: string): Promise<OneDriveFile> {
    try {
      // Find the SharePoint site for the upload
      let sharePointSiteId = null;
      try {
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
        }
      } catch (siteError: any) {
        console.log('⚠️ [ONEDRIVE] Could not access SharePoint site for large file upload, using OneDrive...');
      }
      
      const baseUrl = sharePointSiteId 
        ? `${this.GRAPH_BASE_URL}/sites/${sharePointSiteId}/drive`
        : `${this.GRAPH_BASE_URL}/me/drive`;
      
      // Step 1: Create upload session
      const createSessionUrl = `${baseUrl}/root:/${encodeURIComponent(filePath)}:/createUploadSession`;
      
      const sessionResponse = await axios.post(
        createSessionUrl,
        {
          item: {
            '@microsoft.graph.conflictBehavior': 'replace'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const uploadUrl = sessionResponse.data.uploadUrl;
      console.log('📤 [ONEDRIVE] Created upload session for large file');
      
      // Step 2: Upload file in chunks
      const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks
      const totalSize = fileBuffer.length;
      
      for (let start = 0; start < totalSize; start += CHUNK_SIZE) {
        const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
        const chunk = fileBuffer.slice(start, end + 1);
        
        console.log(`📤 [ONEDRIVE] Uploading chunk ${Math.floor(start / CHUNK_SIZE) + 1}/${Math.ceil(totalSize / CHUNK_SIZE)}`);
        
        await axios.put(
          uploadUrl,
          chunk,
          {
            headers: {
              'Content-Length': chunk.length.toString(),
              'Content-Range': `bytes ${start}-${end}/${totalSize}`
            }
          }
        );
      }
      
      console.log('✅ [ONEDRIVE] Large file uploaded successfully:', filename);
      
      // Step 3: Get file metadata
      const fileUrl = `${baseUrl}/root:/${encodeURIComponent(filePath)}`;
      const fileResponse = await axios.get(fileUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return {
        id: fileResponse.data.id,
        name: fileResponse.data.name,
        size: fileResponse.data.size,
        createdDateTime: fileResponse.data.createdDateTime,
        lastModifiedDateTime: fileResponse.data.lastModifiedDateTime,
        webUrl: fileResponse.data.webUrl,
        downloadUrl: fileResponse.data['@microsoft.graph.downloadUrl']
      };
      
    } catch (error) {
      console.error('❌ [ONEDRIVE] Error uploading large file:', error);
      throw new Error('Failed to upload large file');
    }
  }

  static async getDealFiles(dealId: string): Promise<OneDriveFile[]> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Get the dynamic folder name based on property address and sanitize it
      const dealFolderName = this.sanitizePathComponent(await this.getDealFolderName(dealId));
      
      // Use the SharePoint shared folder structure
      const folderPath = 'Hardwell Capital/Hardwell Capital Origination/Prospects/Pre-Approved Property';
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
