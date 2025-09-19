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
    console.log(`[MOCK] Creating folder for deal: ${dealId}`);
    const folderId = `mock-folder-${dealId}`;
    
    // Initialize empty file array for this deal
    if (!this.mockFiles.has(dealId)) {
      this.mockFiles.set(dealId, []);
    }
    
    return folderId;
  }

  static async uploadFile(dealId: string, filename: string, fileBuffer: Buffer, mimeType: string): Promise<OneDriveFile> {
    console.log(`[MOCK] Uploading file: ${filename} for deal: ${dealId}`);
    console.log(`[MOCK] File size: ${fileBuffer.length} bytes, MIME type: ${mimeType}`);
    
    const mockFile: OneDriveFile = {
      id: `mock-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: filename,
      size: fileBuffer.length,
      createdDateTime: new Date().toISOString(),
      lastModifiedDateTime: new Date().toISOString(),
      webUrl: `https://mock-onedrive.com/files/${filename}`,
      downloadUrl: `https://mock-onedrive.com/download/${filename}`
    };

    // Store in mock storage
    if (!this.mockFiles.has(dealId)) {
      this.mockFiles.set(dealId, []);
    }
    this.mockFiles.get(dealId)!.push(mockFile);

    console.log(`[MOCK] File uploaded successfully. ID: ${mockFile.id}`);
    return mockFile;
  }

  static async getDealFiles(dealId: string): Promise<OneDriveFile[]> {
    console.log(`[MOCK] Getting files for deal: ${dealId}`);
    const files = this.mockFiles.get(dealId) || [];
    console.log(`[MOCK] Found ${files.length} files for deal ${dealId}`);
    return files;
  }

  static async deleteFile(fileId: string): Promise<void> {
    console.log(`[MOCK] Deleting file: ${fileId}`);
    
    // Remove from all deal folders
    for (const [dealId, files] of this.mockFiles.entries()) {
      const index = files.findIndex(f => f.id === fileId);
      if (index !== -1) {
        files.splice(index, 1);
        console.log(`[MOCK] File ${fileId} deleted from deal ${dealId}`);
        return;
      }
    }
    
    console.log(`[MOCK] File ${fileId} not found`);
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
