import axios from 'axios';
import { User, Deal, Document, Analytics, AuthResponse, Appointment, CallNotesData, AppointmentFilters, SubAccount } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://rain.club/api');

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
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  login: (email: string, password: string): Promise<AuthResponse> =>
    api.post('/auth/login', { email, password }).then(res => res.data),
  
  loginWithDiscord: (code: string): Promise<AuthResponse> =>
    api.post('/auth/discord', { code }).then(res => res.data),
  
  loginAfterPayment: (discordId?: string, email?: string, username?: string, customerId?: string, subscriptionId?: string): Promise<AuthResponse> =>
    api.post('/auth/login-after-payment', { discordId, email, username, customerId, subscriptionId }).then(res => res.data),
  
  createPassword: (password: string, confirmPassword: string, username?: string): Promise<{ success: boolean; message: string }> =>
    api.post('/auth/create-password', { password, confirmPassword, username }).then(res => res.data),
  
  checkUsername: (username: string): Promise<{ available: boolean }> =>
    api.get('/auth/username/check', { params: { username } }).then(res => res.data),
  
  acceptTerms: (): Promise<{ success: boolean; message: string }> =>
    api.post('/auth/accept-terms').then(res => res.data),
  
  getMe: (): Promise<User> =>
    api.get('/auth/me').then(res => res.data),
  
  logout: (): Promise<void> =>
    api.post('/auth/logout').then(res => res.data),
  
  requestOTP: (email: string): Promise<{ success: boolean; message: string }> =>
    api.post('/auth/otp/request', { email }).then(res => res.data),
  
  verifyOTP: (email: string, code: string): Promise<AuthResponse> =>
    api.post('/auth/otp/verify', { email, code }).then(res => res.data),
  
  linkDiscord: (discordCode: string, verificationCode: string): Promise<AuthResponse> =>
    api.post('/auth/discord/link', { code: discordCode, verificationCode }).then(res => res.data),
  
  resendVerificationCode: (): Promise<{ success: boolean; message: string }> =>
    api.post('/auth/verification/resend').then(res => res.data),
  
  getDiscordStatus: (): Promise<{ connected: boolean; discordId?: string; discordEmail?: string }> =>
    api.get('/auth/discord/status').then(res => res.data),
  
  disconnectDiscord: (): Promise<{ success: boolean; message: string }> =>
    api.post('/auth/discord/disconnect').then(res => res.data),
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

  uploadMultipleDocuments: (dealId: string, files: File[], tags: string[] = []): Promise<{ message: string; uploaded: number; failed: number }> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('dealId', dealId);
    formData.append('tags', JSON.stringify(tags));
    
    return api.post('/documents/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },
  
  updateDocument: (id: string, data: { tags: string[] }): Promise<Document> =>
    api.put(`/documents/${id}`, data).then(res => res.data),
  
  deleteDocument: (id: string): Promise<void> =>
    api.delete(`/documents/${id}`).then(res => res.data),

  deleteMultipleDocuments: (documentIds: string[]): Promise<{ message: string; deleted: number }> =>
    api.post('/documents/delete-multiple', { documentIds }).then(res => res.data),
};

// Admin API
export const adminAPI = {
  getUsers: (): Promise<User[]> =>
    api.get('/admin/users').then(res => res.data),
  
  getUserById: (id: string): Promise<User> =>
    api.get(`/admin/users/${id}`).then(res => res.data),
  
  updateUser: (id: string, data: { isWhitelisted?: boolean; isAdmin?: boolean; hasManualSubscription?: boolean }): Promise<User> =>
    api.put(`/admin/users/${id}`, data).then(res => res.data),
  
  grantManualSubscription: (id: string, grant: boolean): Promise<{ success: boolean; message: string; user: User }> =>
    api.post(`/admin/users/${id}/manual-subscription`, { grant }).then(res => res.data),
  
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

// Appointments API
export const appointmentsAPI = {
  // User methods
  getTermsText: (): Promise<{ terms: string }> =>
    api.get('/appointments/terms').then(res => res.data),
  
  acceptTerms: (): Promise<{ message: string }> =>
    api.post('/appointments/accept-terms').then(res => res.data),
  
  getTermsStatus: (): Promise<{ hasAccepted: boolean }> =>
    api.get('/appointments/terms-status').then(res => res.data),
  
  getMyAssignments: (): Promise<{ appointments: Appointment[] }> =>
    api.get('/appointments/my-assignments').then(res => res.data),
  
  submitCallNotes: (id: string, data: CallNotesData): Promise<{ appointment: Appointment }> =>
    api.post(`/appointments/${id}/call-notes`, data).then(res => res.data),
  
  getAppointmentDetails: (id: string): Promise<{ appointment: Appointment }> =>
    api.get(`/appointments/${id}`).then(res => res.data),
  
  // Admin methods
  listAllAppointments: (filters?: AppointmentFilters): Promise<{ appointments: Appointment[] }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assignedToUserId) params.append('assignedToUserId', filters.assignedToUserId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    
    const queryString = params.toString();
    const url = queryString ? `/appointments/admin/list?${queryString}` : '/appointments/admin/list';
    return api.get(url).then(res => res.data);
  },
  
  syncFromGHL: (data?: { startDate?: string; endDate?: string; calendarId?: string; subAccountId?: string }): Promise<{ 
    message: string; 
    syncedCount: number; 
    skippedCount: number; 
    totalFromGHL: number;
    subAccountName?: string;
  }> =>
    api.post('/appointments/admin/sync', data).then(res => res.data),
  
  assignAppointment: (appointmentId: string, userId: string): Promise<{ appointment: Appointment }> =>
    api.post('/appointments/admin/assign', { appointmentId, userId }).then(res => res.data),
  
  unassignAppointment: (id: string): Promise<{ appointment: Appointment }> =>
    api.put(`/appointments/admin/${id}/unassign`).then(res => res.data),
  
  getAppointmentStats: (): Promise<{ 
    stats: {
      total: number;
      unassigned: number;
      assigned: number;
      called: number;
      completed: number;
      noAnswer: number;
      rescheduled: number;
      cancelled: number;
    }
  }> =>
    api.get('/appointments/admin/stats').then(res => res.data),

  // Sub-account management methods
  getSubAccounts: (): Promise<{ subAccounts: SubAccount[] }> =>
    api.get('/appointments/admin/sub-accounts').then(res => res.data),

  createSubAccount: (data: { name: string; apiKey: string; v2Token?: string; locationId: string; ghlUserId?: string }): Promise<{ subAccount: SubAccount }> =>
    api.post('/appointments/admin/sub-accounts', data).then(res => res.data),

  updateSubAccount: (id: string, data: { name?: string; apiKey?: string; v2Token?: string; locationId?: string; ghlUserId?: string; isActive?: boolean }): Promise<{ subAccount: SubAccount }> =>
    api.put(`/appointments/admin/sub-accounts/${id}`, data).then(res => res.data),

  deleteSubAccount: (id: string): Promise<{ message: string }> =>
    api.delete(`/appointments/admin/sub-accounts/${id}`).then(res => res.data),

  testSubAccount: (id: string): Promise<{ success: boolean; message: string; testResult?: any; statusCode?: number; details?: any }> =>
    api.post(`/appointments/admin/sub-accounts/${id}/test`).then(res => res.data),
};

// Payment API
export const paymentAPI = {
  createPaymentLink: (plan: 'monthly', email?: string, discordId?: string, username?: string): Promise<{ paymentLinkId: string; url: string }> => {
    const body: any = { plan }
    if (email) body.email = email
    if (discordId) body.discordId = discordId
    if (username) body.username = username
    return api.post('/payments/create-payment-link', body).then(res => res.data)
  },
  
  createCheckoutSession: (plan: 'monthly', email?: string, discordId?: string): Promise<{ sessionId: string; url: string }> => {
    const body: any = { plan }
    if (email) body.email = email
    if (discordId) body.discordId = discordId
    return api.post('/payments/create-checkout-session', body).then(res => res.data)
  },
  
  createSetupIntent: (customerEmail: string, discordId?: string, discordUsername?: string): Promise<{ clientSecret: string; customerId: string }> => {
    const body: any = { customerEmail }
    if (discordId) body.discordId = discordId
    if (discordUsername) body.discordUsername = discordUsername
    return api.post('/subscriptions/create-setup-intent', body).then(res => res.data)
  },
  
  createSubscription: (paymentMethodId: string, customerId: string, customerEmail: string, plan: 'monthly', discordId?: string, discordUsername?: string, hasTrial?: boolean): Promise<{
    subscriptionId: string;
    clientSecret: string | null;
    status: string;
    customerId: string;
  }> => {
    const body: any = { paymentMethodId, customerId, customerEmail, plan }
    if (discordId) body.discordId = discordId
    if (discordUsername) body.discordUsername = discordUsername
    if (hasTrial) body.hasTrial = hasTrial
    return api.post('/subscriptions/create-subscription', body).then(res => res.data)
  },
  
  getSubscriptionStatus: (): Promise<{
    hasSubscription: boolean;
    canAccess: boolean;
    subscription?: {
      id: string;
      status: string;
      plan: 'monthly';
      currentPeriodStart: any;
      currentPeriodEnd: any;
      cancelAtPeriodEnd: boolean;
      canceledAt?: any;
      gracePeriodEnd?: any;
    };
  }> =>
    api.get('/payments/subscription').then(res => res.data),
  
  cancelSubscription: (cancelAtPeriodEnd: boolean = true): Promise<{ success: boolean; message: string }> =>
    api.post('/payments/cancel', { cancelAtPeriodEnd }).then(res => res.data),
  
  getCustomerPortalUrl: (): Promise<{ url: string }> =>
    api.get('/payments/customer-portal').then(res => res.data),
};

export default api;