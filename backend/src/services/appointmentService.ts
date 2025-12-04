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

                  const response = await axios.get(endpoint, {
        headers,
        params: queryParams
      });

            return response.data.events || [];
    } catch (error: any) {
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
            // If subAccountId is not provided or is empty string, get default credentials
      let subAccountCredentials = null;
      if (params?.subAccountId && params.subAccountId.trim() !== '') {
        subAccountCredentials = await FirebaseService.getSubAccountById(params.subAccountId);
        if (!subAccountCredentials) {
          throw new Error(`Sub-account with ID ${params.subAccountId} not found`);
        }
      }
      
      // For default account, check if there are any sub-accounts with ghlUserId configured
      // This is a fallback when no sub-account is explicitly provided
      if (!subAccountCredentials) {
              }
      
      // Try V2 API first
      try {
        let v2Token: string | null = null;
        let headers: any;
        
        if (subAccountCredentials?.v2Token) {
                    v2Token = subAccountCredentials.v2Token;
          headers = {
            'Authorization': `Bearer ${v2Token}`,
            'Version': '2021-04-15', // Use correct API version for calendars/events endpoint
            'Accept': 'application/json'
          };
        } else {
          v2Token = await FirebaseService.getConfiguration('ghl_v2_token');
          if (v2Token) {
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
          // If no calendarId provided, check for userId in sub-account or default config
          if (!queryParams.calendarId) {
            if (subAccountCredentials?.ghlUserId) {
                            queryParams.userId = subAccountCredentials.ghlUserId;
            } else {
              // Try to get userId from default configuration
              try {
                const defaultUserId = await FirebaseService.getConfiguration('ghl_user_id');
                if (defaultUserId) {
                                    queryParams.userId = defaultUserId;
                } else {
                                  }
              } catch (configError) {
                              }
            }
          }
          
          // Validate that we have at least one required identifier
          if (!queryParams.calendarId && !queryParams.userId && !queryParams.groupId) {
            throw new Error('GHL V2 API requires either calendarId, userId, or groupId parameter');
          }
          
                                        const response = await axios.get(endpoint, {
            headers,
            params: queryParams
          });
          
                    return response.data.events || [];
        }
      } catch (v2Error: any) {
                      }
      
      // Fallback to V1 API
            let headers: any;
      
      if (subAccountCredentials?.apiKey) {
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
      
      // V1 API needs locationId or userId or calendarId
      const locationId = params?.locationId || subAccountCredentials?.locationId;
      if (locationId) {
        queryParams.locationId = locationId;
      }
      
      if (params?.calendarId) {
        queryParams.calendarId = params.calendarId;
      }
      
      // Add userId if available and no calendarId
      if (!params?.calendarId) {
        if (subAccountCredentials?.ghlUserId) {
                    queryParams.userId = subAccountCredentials.ghlUserId;
        } else {
          // Try default userId
          try {
            const defaultUserId = await FirebaseService.getConfiguration('ghl_user_id');
            if (defaultUserId) {
                            queryParams.userId = defaultUserId;
            }
          } catch (configError) {
                      }
        }
      }
      
      // Validate that we have at least one required identifier
      if (!queryParams.locationId && !queryParams.calendarId && !queryParams.userId) {
        throw new Error('GHL V1 API requires either locationId, calendarId, or userId parameter');
      }
      
                  const response = await axios.get(endpoint, {
        headers,
        params: queryParams
      });
      
            return response.data.appointments || [];
    } catch (error: any) {
            throw error;
    }
  }

  static async getAppointmentById(appointmentId: string, subAccountId?: string): Promise<GHLAppointment | null> {
    try {
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
                        headers = await this.getV2Headers();
          }
        }
        
        if (v2Token) {
          const endpoint = `${this.GHL_V2_BASE_URL}/calendars/events/${appointmentId}`;
          
          const response = await axios.get(endpoint, { headers });
                    return response.data.event || response.data;
        }
      } catch (v2Error: any) {
              }
      
      // Fallback to V1 API
            let headers: any;
      
      if (subAccountCredentials?.apiKey) {
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
            return response.data.appointment || response.data;
    } catch (error: any) {
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
                return locationId;
      }
      
            return null;
    } catch (error: any) {
            return null;
    }
  }
}
