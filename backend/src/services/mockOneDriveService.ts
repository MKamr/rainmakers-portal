import { OneDriveFile } from './oneDriveService';

export class MockOneDriveService {
  private static mockFiles: Map<string, OneDriveFile[]> = new Map();
  private static mockToken = 'mock-access-token';

  static async getAccessToken(): Promise<string> {
    console.log('[MOCK] Getting access token');
    return this.mockToken;
  }

  static async refreshAccessToken(refreshToken: string): Promise<string> {
    console.log('[MOCK] Refreshing access token');
    return this.mockToken;
  }

  static async createDealFolder(dealId: string): Promise<string> {
    console.log([MOCK] Creating folder for deal: );
    const folderId = mock-folder-;
    
    // Initialize empty file array for this deal
    if (!this.mockFiles.has(dealId)) {
      this.mockFiles.set(dealId, []);
    }
    
    return folderId;
  }

  static async uploadFile(dealId: string, filename: string, fileBuffer: Buffer, mimeType: string): Promise<OneDriveFile> {
    console.log([MOCK] Uploading file:  for deal: );
    console.log([MOCK] File size:  bytes, MIME type: );
    
    const mockFile: OneDriveFile = {
      id: mock-file--,
      name: filename,
      size: fileBuffer.length,
      createdDateTime: new Date().toISOString(),
      lastModifiedDateTime: new Date().toISOString(),
      webUrl: https://mock-onedrive.com/files/,
      downloadUrl: https://mock-onedrive.com/download/
    };

    // Store in mock storage
    if (!this.mockFiles.has(dealId)) {
      this.mockFiles.set(dealId, []);
    }
    this.mockFiles.get(dealId)!.push(mockFile);

    console.log([MOCK] File uploaded successfully. ID: );
    return mockFile;
  }

  static async getDealFiles(dealId: string): Promise<OneDriveFile[]> {
    console.log([MOCK] Getting files for deal: );
    const files = this.mockFiles.get(dealId) || [];
    console.log([MOCK] Found  files for deal );
    return files;
  }

  static async deleteFile(fileId: string): Promise<void> {
    console.log([MOCK] Deleting file: );
    
    // Remove from all deal folders
    for (const [dealId, files] of this.mockFiles.entries()) {
      const index = files.findIndex(f => f.id === fileId);
      if (index !== -1) {
        files.splice(index, 1);
        console.log([MOCK] File  deleted from deal );
        return;
      }
    }
    
    console.log([MOCK] File  not found);
  }

  // Helper method to get all mock data (for debugging)
  static getAllMockData(): { [dealId: string]: OneDriveFile[] } {
    const result: { [dealId: string]: OneDriveFile[] } = {};
    for (const [dealId, files] of this.mockFiles.entries()) {
      result[dealId] = files;
    }
    return result;
  }

  // Helper method to clear all mock data (for testing)
  static clearAllMockData(): void {
    this.mockFiles.clear();
    console.log('[MOCK] All mock data cleared');
  }
}
