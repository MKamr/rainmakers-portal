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
      // Microsoft expects form data, not JSON
      const formData = new URLSearchParams();
      formData.append('client_id', process.env.MICROSOFT_CLIENT_ID || '');
      formData.append('client_secret', process.env.MICROSOFT_CLIENT_SECRET || '');
      formData.append('refresh_token', refreshToken);
      formData.append('grant_type', 'refresh_token');
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
        await FirebaseService.updateOneDriveToken(token.id, {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: Timestamp.fromDate(new Date(Date.now() + expires_in * 1000))
        });
      }

      return access_token;
    } catch (error) {
      console.error('Error refreshing OneDrive token:', error);
      throw new Error('Failed to refresh OneDrive token');
    }
  }

  static async createDealFolder(dealId: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.GRAPH_BASE_URL}/me/drive/root/children`,
        {
          name: dealId,
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

      return response.data.id;
    } catch (error) {
      console.error('Error creating OneDrive folder:', error);
      throw new Error('Failed to create deal folder');
    }
  }

  static async uploadFile(dealId: string, filename: string, fileBuffer: Buffer, mimeType: string): Promise<OneDriveFile> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.put(
        `${this.GRAPH_BASE_URL}/me/drive/root:/Deals/${dealId}/${filename}:/content`,
        fileBuffer,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': mimeType
          }
        }
      );

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
      console.error('Error uploading file to OneDrive:', error);
      throw new Error('Failed to upload file');
    }
  }

  static async getDealFiles(dealId: string): Promise<OneDriveFile[]> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.GRAPH_BASE_URL}/me/drive/root:/Deals/${dealId}:/children`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

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
      console.error('Error fetching OneDrive files:', error);
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
