import axios from 'axios';
import { FirebaseService } from './firebaseService';

export interface GHLAppointment {
  id: string;
  calendarId: string;
  contactId: string;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
  status: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export class AppointmentService {
  private static readonly GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://rest.gohighlevel.com/v1';
  private static readonly GHL_V2_BASE_URL = 'https://services.leadconnectorhq.com';

  private static async getHeaders() {
    const apiKey = await FirebaseService.getConfiguration('ghl_api_key');
    if (!apiKey) {
      throw new Error('GHL API key not configured');
    }
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    };
  }

  private static async getV2Headers() {
    const v2Token = await FirebaseService.getConfiguration('ghl_v2_token');
    
    if (!v2Token) {
      throw new Error('GHL v2 private integration token not configured. V2 API requires a different token than V1 API.');
    }
    
    console.log('🔑 [GHL V2] Using V2 private integration token');
    
    return {
      'Authorization': `Bearer ${v2Token}`,
      'Version': '2021-04-15', // Use correct API version for calendars/events endpoint
      'Accept': 'application/json'
    };
  }

  // Calendar Events method
  static async getCalendarEvents(params: {
    locationId: string;
    calendarId: string;
    startTime: number;
    endTime: number;
    subAccountId?: string;
  }): Promise<any[]> {
    try {
      console.log('📅 [GHL CALENDAR EVENTS] Fetching calendar events with params:', params);

      let subAccountCredentials = null;
      if (params?.subAccountId) {
        subAccountCredentials = await FirebaseService.getSubAccountById(params.subAccountId);
        if (!subAccountCredentials) {
          throw new Error(`Sub-account with ID ${params.subAccountId} not found`);
        }
      }

      let v2Token: string | null = null;
      let headers: any;

      if (subAccountCredentials?.v2Token) {
        console.log('📅 [GHL CALENDAR EVENTS] Using sub-account V2 token');
        v2Token = subAccountCredentials.v2Token;
        headers = {
          'Authorization': `Bearer ${v2Token}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
      } else {
        v2Token = await FirebaseService.getConfiguration('ghl_v2_token');
        if (v2Token) {
          console.log('📅 [GHL CALENDAR EVENTS] Using default V2 API');
          headers = {
            'Authorization': `Bearer ${v2Token}`,
            'Version': '2021-04-15',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };
        } else {
          throw new Error('V2 token not configured');
        }
      }

      const endpoint = `${this.GHL_V2_BASE_URL}/calendars/events`;
      const queryParams: any = {
        locationId: params.locationId,
        calendarId: params.calendarId,
        startTime: params.startTime,
        endTime: params.endTime
      };

      console.log('📅 [GHL CALENDAR EVENTS] Using endpoint:', endpoint);
      console.log('📅 [GHL CALENDAR EVENTS] Query params:', queryParams);

      const response = await axios.get(endpoint, {
        headers,
        params: queryParams
      });

      console.log('✅ [GHL CALENDAR EVENTS] Success, found events:', response.data.events?.length || 0);
      return response.data.events || [];
    } catch (error: any) {
      console.error('❌ [GHL CALENDAR EVENTS] Error fetching calendar events:', error);
      throw error;
    }
  }

  // Appointment methods
  static async getAppointments(params?: {
    calendarId?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
    subAccountId?: string;
  }): Promise<GHLAppointment[]> {
    try {
      console.log('📅 [GHL APPOINTMENTS] Fetching appointments with params:', params);
      
      let subAccountCredentials = null;
      if (params?.subAccountId) {
        subAccountCredentials = await FirebaseService.getSubAccountById(params.subAccountId);
        if (!subAccountCredentials) {
          throw new Error(`Sub-account with ID ${params.subAccountId} not found`);
        }
      }
      
      // Try V2 API first
      try {
        let v2Token: string | null = null;
        let headers: any;
        
        if (subAccountCredentials?.v2Token) {
          console.log('📅 [GHL APPOINTMENTS] Using sub-account V2 token');
          v2Token = subAccountCredentials.v2Token;
          headers = {
            'Authorization': `Bearer ${v2Token}`,
            'Version': '2021-04-15', // Use correct API version for calendars/events endpoint
            'Accept': 'application/json'
          };
        } else {
          v2Token = await FirebaseService.getConfiguration('ghl_v2_token');
          if (v2Token) {
            console.log('📅 [GHL APPOINTMENTS] Using default V2 API');
            headers = {
              'Authorization': `Bearer ${v2Token}`,
              'Version': '2021-04-15', // Use correct API version for calendars/events endpoint
              'Accept': 'application/json'
            };
          }
        }
        
        if (v2Token) {
          const locationId = params?.locationId || subAccountCredentials?.locationId || await this.getLocationId();
          
          if (!locationId) {
            throw new Error('Location ID is required for appointments');
          }

          // Convert startDate and endDate to milliseconds (Unix timestamp)
          let startTime: number;
          let endTime: number;
          
          if (params?.startDate && params?.endDate) {
            startTime = new Date(params.startDate).getTime();
            endTime = new Date(params.endDate).getTime();
          } else {
            // Default to current month if no dates provided
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            startTime = startOfMonth.getTime();
            endTime = endOfMonth.getTime();
          }
          
          const endpoint = `${this.GHL_V2_BASE_URL}/calendars/events`;
          const queryParams: any = { 
            locationId,
            startTime,
            endTime
          };
          
          // Add calendarId if provided (optional - either calendarId, userId, or groupId is required)
          if (params?.calendarId) {
            queryParams.calendarId = params.calendarId;
          }
          
          // Add userId from sub-account if available (either calendarId, userId, or groupId is required)
          if (subAccountCredentials?.ghlUserId && !queryParams.calendarId) {
            queryParams.userId = subAccountCredentials.ghlUserId;
          }
          
          console.log('📅 [GHL APPOINTMENTS] Using V2 endpoint:', endpoint);
          console.log('📅 [GHL APPOINTMENTS] Query params:', queryParams);
          console.log('📅 [GHL APPOINTMENTS] Headers:', headers);
          
          const response = await axios.get(endpoint, {
            headers,
            params: queryParams
          });
          
          console.log('✅ [GHL APPOINTMENTS] V2 API success, found appointments:', response.data.events?.length || 0);
          return response.data.events || [];
        }
      } catch (v2Error: any) {
        console.log('⚠️ [GHL APPOINTMENTS] V2 API failed, trying V1 API:', v2Error.message);
        console.log('⚠️ [GHL APPOINTMENTS] V2 Error details:', v2Error.response?.data);
      }
      
      // Fallback to V1 API
      console.log('📅 [GHL APPOINTMENTS] Using V1 API');
      let headers: any;
      
      if (subAccountCredentials?.apiKey) {
        console.log('📅 [GHL APPOINTMENTS] Using sub-account V1 API key');
        headers = {
          'Authorization': `Bearer ${subAccountCredentials.apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        };
      } else {
        headers = await this.getHeaders();
      }
      
      const endpoint = `${this.GHL_BASE_URL}/appointments/`;
      
      const queryParams: any = {};
      if (params?.calendarId) {
        queryParams.calendarId = params.calendarId;
      }
      
      const response = await axios.get(endpoint, {
        headers,
        params: queryParams
      });
      
      console.log('✅ [GHL APPOINTMENTS] V1 API success, found appointments:', response.data.appointments?.length || 0);
      return response.data.appointments || [];
    } catch (error: any) {
      console.error('❌ [GHL APPOINTMENTS] Error fetching appointments:', error);
      throw error;
    }
  }

  static async getAppointmentById(appointmentId: string, subAccountId?: string): Promise<GHLAppointment | null> {
    try {
      console.log('📅 [GHL APPOINTMENT] Fetching appointment by ID:', appointmentId);
      
      let subAccountCredentials = null;
      if (subAccountId) {
        subAccountCredentials = await FirebaseService.getSubAccountById(subAccountId);
        if (!subAccountCredentials) {
          throw new Error(`Sub-account with ID ${subAccountId} not found`);
        }
      }
      
      // Try V2 API first
      try {
        let v2Token: string | null = null;
        let headers: any;
        
        if (subAccountCredentials?.v2Token) {
          console.log('📅 [GHL APPOINTMENT] Using sub-account V2 token');
          v2Token = subAccountCredentials.v2Token;
          headers = {
            'Authorization': `Bearer ${v2Token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };
        } else {
          v2Token = await FirebaseService.getConfiguration('ghl_v2_token');
          if (v2Token) {
            console.log('📅 [GHL APPOINTMENT] Using default V2 API');
            headers = await this.getV2Headers();
          }
        }
        
        if (v2Token) {
          const endpoint = `${this.GHL_V2_BASE_URL}/calendars/events/${appointmentId}`;
          
          const response = await axios.get(endpoint, { headers });
          console.log('✅ [GHL APPOINTMENT] V2 API success');
          return response.data.event || response.data;
        }
      } catch (v2Error: any) {
        console.log('⚠️ [GHL APPOINTMENT] V2 API failed, trying V1 API:', v2Error.message);
      }
      
      // Fallback to V1 API
      console.log('📅 [GHL APPOINTMENT] Using V1 API');
      let headers: any;
      
      if (subAccountCredentials?.apiKey) {
        console.log('📅 [GHL APPOINTMENT] Using sub-account V1 API key');
        headers = {
          'Authorization': `Bearer ${subAccountCredentials.apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        };
      } else {
        headers = await this.getHeaders();
      }
      
      const endpoint = `${this.GHL_BASE_URL}/appointments/${appointmentId}`;
      
      const response = await axios.get(endpoint, { headers });
      console.log('✅ [GHL APPOINTMENT] V1 API success');
      return response.data.appointment || response.data;
    } catch (error: any) {
      console.error('❌ [GHL APPOINTMENT] Error fetching appointment:', error);
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Helper method to get location ID
  private static async getLocationId(): Promise<string | null> {
    try {
      const locationId = await FirebaseService.getConfiguration('ghl_location_id');
      
      if (locationId) {
        console.log('✅ [GHL LOCATIONS] Found location from config:', locationId);
        return locationId;
      }
      
      console.log('⚠️ [GHL LOCATIONS] No location ID found in configurations');
      return null;
    } catch (error: any) {
      console.error('❌ [GHL LOCATIONS] Error getting location ID from config:', error);
      return null;
    }
  }
}
