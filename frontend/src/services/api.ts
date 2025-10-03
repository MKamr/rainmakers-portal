import axios from 'axios';
import { User, Deal, Document, Analytics, AuthResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rain.club/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('🔵 API Request:', {
    url: config.url,
    method: config.method,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
  });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response logging
api.interceptors.response.use(
  (response) => {
    console.log('🟢 API Response Success:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.log('🔴 API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Force reload to ensure clean state and redirect to login
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  loginWithDiscord: (code: string): Promise<AuthResponse> =>
    api.post('/auth/discord', { code }).then(res => res.data),
  
  getMe: (): Promise<User> =>
    api.get('/auth/me').then(res => res.data),
  
  logout: (): Promise<void> =>
    api.post('/auth/logout').then(res => res.data),
};

// User API
export const userAPI = {
  getProfile: (): Promise<User> =>
    api.get('/user/profile').then(res => res.data),
  
  updateProfile: (data: Partial<User>): Promise<User> =>
    api.put('/user/profile', data).then(res => res.data),
};

// Deals API
export const dealsAPI = {
  getDeals: (): Promise<Deal[]> =>
    api.get('/deals').then(res => res.data),
  
  createDeal: (data: any): Promise<Deal> =>
    api.post('/deals', data).then(res => res.data),
  
  updateDeal: (id: string, data: Partial<Deal>): Promise<Deal> =>
    api.put(`/deals/${id}`, data).then(res => res.data),
  
  deleteDeal: (id: string): Promise<void> =>
    api.delete(`/deals/${id}`).then(res => res.data),
  
  getDealDocuments: (dealId: string): Promise<Document[]> =>
    api.get(`/deals/${dealId}/documents`).then(res => res.data),
};

// Documents API
export const documentsAPI = {
  getDocuments: (): Promise<Document[]> =>
    api.get('/documents').then(res => res.data),
  
  getDealDocuments: (dealId: string): Promise<Document[]> =>
    api.get(`/documents/deal/${dealId}`).then(res => res.data),
  
  uploadDocument: (dealId: string, file: File, tags: string[] = []): Promise<{ message: string; dealId: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dealId', dealId);
    formData.append('tags', JSON.stringify(tags));
    
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },
  
  updateDocument: (id: string, data: { tags: string[] }): Promise<Document> =>
    api.put(`/documents/${id}`, data).then(res => res.data),
  
  deleteDocument: (id: string): Promise<void> =>
    api.delete(`/documents/${id}`).then(res => res.data),
};

// Admin API
export const adminAPI = {
  getUsers: (): Promise<User[]> =>
    api.get('/admin/users').then(res => res.data),
  
  updateUser: (id: string, data: { isWhitelisted?: boolean; isAdmin?: boolean }): Promise<User> =>
    api.put(`/admin/users/${id}`, data).then(res => res.data),
  
  getOneDriveStatus: (): Promise<{ connected: boolean; expired?: boolean; expiresAt?: string }> =>
    api.get('/admin/onedrive/status').then(res => res.data),
  
  getAllDeals: (filters?: { userId?: string; startDate?: string; endDate?: string; status?: string; propertyType?: string }): Promise<Deal[]> => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.propertyType) params.append('propertyType', filters.propertyType);
    
    const queryString = params.toString();
    const url = queryString ? `/admin/deals?${queryString}` : '/admin/deals';
    return api.get(url).then(res => res.data);
  },
  
  getAllDocuments: (): Promise<Document[]> =>
    api.get('/admin/documents').then(res => res.data),
  
  connectOneDrive: (code: string): Promise<{ message: string; user: { email: string; name: string } }> =>
    api.post('/admin/onedrive/connect', { code }).then(res => res.data),
  
  testGHL: (): Promise<{ connected: boolean; pipelines?: any[] }> =>
    api.get('/admin/ghl/test').then(res => res.data),

  getGHLPipelines: (): Promise<{ pipelines: any[] }> =>
    api.get('/admin/ghl/pipelines').then(res => res.data),

  getGHLPipelinesWithKey: (apiKey: string): Promise<{ pipelines: any[] }> =>
    api.post('/admin/ghl/pipelines', { apiKey }).then(res => res.data),

  getGHLCalendars: (): Promise<{ calendars: any[] }> =>
    api.get('/admin/ghl/calendars').then(res => res.data),

  getGHLConfig: (): Promise<{
    apiKey?: string;
    v2Token?: string;
    pipelineId?: string;
    calendarId?: string;
    locationId?: string;
    assignedUserId?: string;
    underReviewStageId?: string;
    inUnderwritingStageId?: string;
    loeSentStageId?: string;
    closedStageId?: string;
    noShowStageId?: string;
  }> =>
    api.get('/admin/ghl/config').then(res => res.data),
  
  saveGHLConfig: (config: {
    apiKey: string;
    v2Token?: string;
    pipelineId?: string;
    calendarId?: string;
    locationId?: string;
    assignedUserId?: string;
    underReviewStageId?: string;
    inUnderwritingStageId?: string;
    loeSentStageId?: string;
    closedStageId?: string;
    noShowStageId?: string;
  }): Promise<{ message: string }> =>
    api.post('/admin/ghl/config', config).then(res => res.data),
  
  getAnalytics: (): Promise<Analytics> =>
    api.get('/admin/analytics').then(res => res.data),

  testGHLContact: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }): Promise<{ success: boolean; contact: any }> =>
    api.post('/admin/ghl/test-contact', data).then(res => res.data),

  fetchGHLCustomFields: (): Promise<{
    success: boolean;
    summary: {
      totalFields: number;
      contactFields: number;
      opportunityFields: number;
    };
    contactFields: any[];
    opportunityFields: any[];
  }> =>
    api.post('/admin/ghl/fetch-custom-fields').then(res => res.data),

  // GHL Import methods
  getGHLOpportunities: (): Promise<{ opportunities: any[] }> =>
    api.get('/admin/ghl/opportunities').then(res => res.data),

  importGHLOpportunity: (data: {
    opportunityId: string;
    userId: string;
    opportunity: any;
  }): Promise<{ success: boolean; dealId: string; message: string }> =>
    api.post('/admin/ghl/import-opportunity', data).then(res => res.data),

  // Pipeline-specific methods
  getGHLPipelineOpportunities: (pipelineId: string): Promise<{ opportunities: any[] }> =>
    api.get(`/admin/ghl/pipeline/${pipelineId}/opportunities`).then(res => res.data),

  // Email configuration methods
  getEmailConfig: (): Promise<any> =>
    api.get('/admin/email/config').then(res => res.data),

  saveEmailConfig: (config: any): Promise<{ success: boolean; message: string }> =>
    api.post('/admin/email/config', config).then(res => res.data),

  testEmail: (data: { testEmail: string }): Promise<{ success: boolean; message: string }> =>
    api.post('/admin/email/test', data).then(res => res.data),
};

export default api;