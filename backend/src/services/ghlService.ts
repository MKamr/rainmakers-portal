import axios from 'axios';
import { FirebaseService } from './firebaseService';

export interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  timezone?: string;
  dnd?: boolean;
  dndSettings?: {
    Call?: { status: string; message: string; code: string };
    Email?: { status: string; message: string; code: string };
    SMS?: { status: string; message: string; code: string };
    WhatsApp?: { status: string; message: string; code: string };
    GMB?: { status: string; message: string; code: string };
    FB?: { status: string; message: string; code: string };
  };
  inboundDndSettings?: {
    all?: { status: string; message: string };
  };
  tags?: string[];
  customFields: Array<{
    id: string;
    key: string;
    field_value?: any;  // V1 API format
    fieldValue?: any;    // V2 API format
  }>;
  source?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GHLDeal {
  id: string;
  name: string;
  status: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  monetaryValue?: number;
  assignedTo?: string;
  customFields: Array<{
    id: string;
    key: string;
    field_value?: any;  // V1 API format
    fieldValue?: any;    // V2 API format
  }>;
  createdAt: string;
  updatedAt: string;
}

export class GHLService {
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
    // V2 API requires a private integration token, not the V1 API key
    const v2Token = await FirebaseService.getConfiguration('ghl_v2_token');
    
    if (!v2Token) {
      throw new Error('GHL v2 private integration token not configured. V2 API requires a different token than V1 API.');
    }
    
        return {
      'Authorization': `Bearer ${v2Token}`,
      'Version': '2021-07-28', // Required for v2 API
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Token validation method
  static async validateToken(): Promise<boolean> {
    try {
      const headers = await this.getV2Headers();
      // Get the stored location ID from Firebase configurations
      const locationId = await FirebaseService.getConfiguration('ghl_location_id');
      
      if (!locationId) {
        return false;
      }
      
      // Use the stored location ID to validate the token with a simple API call
      // This is more efficient than calling the locations endpoint
      const response = await axios.get(`${this.GHL_V2_BASE_URL}/contacts/`, { 
        headers,
        params: { 
          limit: 1,
          locationId: locationId
        }
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Contact operations
  static async createContact(contactData: {
    firstName: string;
    lastName: string;
    name?: string;
    email: string;
    phone: string;
    locationId?: string; // Add locationId as in curl example
    companyName?: string;
    address1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    website?: string;
    timezone?: string;
    dnd?: boolean;
    dndSettings?: {
      Call?: { status: string; message: string; code: string };
      Email?: { status: string; message: string; code: string };
      SMS?: { status: string; message: string; code: string };
      WhatsApp?: { status: string; message: string; code: string };
      GMB?: { status: string; message: string; code: string };
      FB?: { status: string; message: string; code: string };
    };
    inboundDndSettings?: {
      all?: { status: string; message: string };
    };
    tags?: string[];
    customFields?: Array<{
      id: string;
      key: string;
      field_value: any;
    }>;
    source?: string;
    assignedTo?: string;
  }): Promise<GHLContact> {
    try {
      const headers = await this.getV2Headers(); // Use V2 API
      const endpoint = `${this.GHL_V2_BASE_URL}/contacts/`; // Use V2 endpoint
      
      // Ensure name is set if not provided
      if (!contactData.name && contactData.firstName && contactData.lastName) {
        contactData.name = `${contactData.firstName} ${contactData.lastName}`;
      }
      
      
      const response = await axios.post(endpoint, contactData, { headers });
      return response.data.contact;
    } catch (error) {
      throw new Error('Failed to create contact');
    }
  }

  static async getContactById(contactId: string, subAccountId?: string): Promise<GHLContact | null> {
    try {
      let headers;
      
      // If subAccountId is provided, use sub-account credentials
      if (subAccountId) {
        const subAccount = await FirebaseService.getSubAccountById(subAccountId);
        if (subAccount?.apiKey) {
          headers = {
            'Authorization': `Bearer ${subAccount.apiKey}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          };
        } else {
          headers = await this.getHeaders();
        }
      } else {
        headers = await this.getHeaders();
      }
      
      const response = await axios.get(`${this.GHL_BASE_URL}/contacts/${contactId}`, { headers });
      return response.data.contact;
    } catch (error) {
            return null;
    }
  }

  static async searchContactByEmail(email: string): Promise<GHLContact | null> {
    try {
      const headers = await this.getHeaders();
      const endpoint = `${this.GHL_BASE_URL}/contacts/`;
      
      // Try different search approaches
      let response;
      
      // Method 1: Try with email as query parameter
      try {
        response = await axios.get(endpoint, {
          headers,
          params: { email }
        });
        
        if (response.data.contacts && response.data.contacts.length > 0) {
          // Ensure exact match on email
          const exact = (response.data.contacts as any[]).find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
          if (exact) return exact;
        }
      } catch (method1Error) {
      }
      
      // Method 2: Try with search parameter
      try {
        response = await axios.get(endpoint, {
          headers,
          params: { search: email }
        });
        
        if (response.data.contacts && response.data.contacts.length > 0) {
          const exact = (response.data.contacts as any[]).find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
          if (exact) return exact;
        }
      } catch (method2Error) {
      }
      
      // Method 3: Get all contacts and filter by email (not recommended for production)
      try {
        response = await axios.get(endpoint, {
          headers,
          params: { limit: 100 } // Get first 100 contacts
        });
        
        const allContacts = response.data.contacts || [];
        const filteredContacts = allContacts.filter((contact: any) => contact.email && contact.email.toLowerCase() === email.toLowerCase());
        return filteredContacts.length > 0 ? filteredContacts[0] : null;
      } catch (method3Error) {
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  static async searchContactByPhone(phone: string): Promise<GHLContact | null> {
    try {
      const headers = await this.getHeaders();
      const endpoint = `${this.GHL_BASE_URL}/contacts/`;
      
      // Try different search approaches
      let response;
      const normalize = (p: string) => p.replace(/[^0-9]/g, '');
      const target = normalize(phone);
      
      // Method 1: Try with phone as query parameter
      try {
        response = await axios.get(endpoint, {
          headers,
          params: { phone }
        });
        
        if (response.data.contacts && response.data.contacts.length > 0) {
          const exact = (response.data.contacts as any[]).find((contact: any) => 
            contact.phone && normalize(contact.phone) === target
          );
          if (exact) return exact;
        }
      } catch (method1Error) {
      }
      
      // Method 2: Try with search parameter
      try {
        response = await axios.get(endpoint, {
          headers,
          params: { search: phone }
        });
        
        if (response.data.contacts && response.data.contacts.length > 0) {
          const exact = (response.data.contacts as any[]).find((contact: any) => 
            contact.phone && normalize(contact.phone) === target
          );
          if (exact) return exact;
        }
      } catch (method2Error) {
      }
      
      // Method 3: Get all contacts and filter by phone
      try {
        response = await axios.get(endpoint, {
          headers,
          params: { limit: 100 } // Get first 100 contacts
        });
        
        const allContacts = response.data.contacts || [];
        const filteredContacts = allContacts.filter((contact: any) => 
          contact.phone && normalize(contact.phone) === target
        );
        return filteredContacts.length > 0 ? filteredContacts[0] : null;
      } catch (method3Error) {
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Helper method to find existing contact by email OR phone
  static async findExistingContact(email?: string, phone?: string): Promise<GHLContact | null> {
    // First try to find by email
    if (email && email.trim()) {
      const contactByEmail = await this.searchContactByEmail(email.trim());
      if (contactByEmail) {
        return contactByEmail;
      }
    }
    
    // If no email match, try phone
    if (phone && phone.trim()) {
      const contactByPhone = await this.searchContactByPhone(phone.trim());
      if (contactByPhone) {
        return contactByPhone;
      }
    }
    
    return null;
  }

  static async getOpportunitiesByContact(contactId: string, pipelineId: string): Promise<GHLDeal[]> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.GHL_BASE_URL}/opportunities/`, {
        headers,
        params: { 
          contactId,
          pipelineId
        }
      });
      return response.data.opportunities || [];
    } catch (error) {
      return [];
    }
  }

  static async updateOpportunity(opportunityId: string, dealData: {
    title?: string;
    name?: string;
    status?: string;
    stageId?: string;
    pipelineStageId?: string;
    monetaryValue?: number;
    assignedTo?: string;
    customFields?: Array<{
      id: string;
      key: string;
      field_value: any;
    }>;
  }): Promise<GHLDeal> {
    try {
      const headers = await this.getHeaders();
      const endpoint = `${this.GHL_BASE_URL}/opportunities/${opportunityId}`;
      
      const response = await axios.put(endpoint, dealData, { headers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to update opportunity');
    }
  }

  // Helper method to create a minimal contact for deal creation
  static async createMinimalContact(contactData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    locationId: string;
  }): Promise<string> {
    try {
      const minimalContact = {
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        locationId: contactData.locationId,
        name: `${contactData.firstName} ${contactData.lastName}`
      };
      
      const contact = await this.createContact(minimalContact);
      return contact.id;
    } catch (error) {
      throw new Error('Failed to create minimal contact for deal');
    }
  }

  static async createDeal(dealData: {
    name: string;
    pipelineId: string;
    stageId: string;
    locationId: string; // Add required locationId
    contactId?: string; // Make contactId optional
    source?: string; // Add source field for Discord username
    monetaryValue?: number;
    assignedTo?: string;
    customFields: Array<{
      id: string;
      key: string;
      field_value: any;
    }>;
    // Add contact data for creating minimal contact if needed
    contactData?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  }): Promise<GHLDeal> {
    try {
      // Validate required fields
      if (!dealData.pipelineId || dealData.pipelineId.trim() === '') {
        throw new Error('pipelineId is required and cannot be empty');
      }
      if (!dealData.stageId || dealData.stageId.trim() === '') {
        throw new Error('stageId is required and cannot be empty');
      }
      if (!dealData.locationId || dealData.locationId.trim() === '') {
        throw new Error('locationId is required and cannot be empty');
      }
      
      const headers = await this.getV2Headers();
      const endpoint = `${this.GHL_V2_BASE_URL}/opportunities/`;
      
      // Prepare the payload with required fields (matching exact curl format)
      const payload: any = {
        name: dealData.name, // Use 'name' field as in curl example
        status: 'open', // GHL requires 'status' field
        locationId: dealData.locationId, // Required field
        pipelineId: dealData.pipelineId, // Required field
        pipelineStageId: dealData.stageId, // Use pipelineStageId as in curl example
        customFields: dealData.customFields
      };
      
      // Add optional fields if provided
      if (dealData.monetaryValue !== undefined) {
        payload.monetaryValue = dealData.monetaryValue;
      }
      if (dealData.assignedTo) {
        payload.assignedTo = dealData.assignedTo;
      }
      if (dealData.source) {
        payload.source = dealData.source;
      }
      
      // Handle contactId - create minimal contact if not provided
      let contactId = dealData.contactId;
      if (!contactId || contactId.trim() === '') {
        if (dealData.contactData) {
          try {
            contactId = await this.createMinimalContact({
              ...dealData.contactData,
              locationId: dealData.locationId
            });
          } catch (contactError) {
            throw new Error('Failed to create contact for opportunity');
          }
        } else {
        }
      }
      
      // Add contactId to payload if we have one
      if (contactId && contactId.trim() !== '') {
        payload.contactId = contactId;
      }
      
      
      const response = await axios.post(
        endpoint,
        payload,
        { headers }
      );
      return response.data.opportunity || response.data;
    } catch (error) {
      throw new Error('Failed to create deal');
    }
  }

  static async getDeals(pipelineId?: string): Promise<GHLDeal[]> {
    try {
      const headers = await this.getHeaders();
      if (!pipelineId) {
        throw new Error('Pipeline ID is required to fetch deals');
      }
      const endpoint = `${this.GHL_BASE_URL}/pipelines/${pipelineId}/opportunities/`;
      const response = await axios.get(endpoint, { headers });
      return response.data.opportunities || [];
    } catch (error) {
      throw new Error('Failed to fetch deals');
    }
  }

  static async listOpportunities(): Promise<any> {
    try {
            const targetPipelineId = '97i1G88fYPwGw5Hyiv0Y';
            // Try V2 API first (only if V2 token is available)
      try {
                const v2Token = await FirebaseService.getConfiguration('ghl_v2_token');
        
        if (v2Token) {
                    const allV2Opportunities = await this.getAllOpportunitiesV2();
                    // Filter opportunities by target pipeline
          const v2Opportunities = allV2Opportunities.filter((opp: any) => 
            opp.pipelineId === targetPipelineId
          );
                    // Get pipeline info to add to opportunities
          const pipelineInfo = await this.getPipelineInfo(targetPipelineId);
          
          const opportunitiesWithPipeline = v2Opportunities.map((opp: any) => ({
            ...opp,
            pipelineName: pipelineInfo?.name || 'Unknown Pipeline',
            pipelineId: targetPipelineId
          }));
          
          return { opportunities: opportunitiesWithPipeline };
        } else {
                    throw new Error('V2 token not configured');
        }
      } catch (v2Error: any) {
                // Fallback to V1 API
        try {
                    const opportunities = await this.getOpportunitiesByPipeline(targetPipelineId);
          
          // Get pipeline info to add to opportunities
          const pipelineInfo = await this.getPipelineInfo(targetPipelineId);
          
          const opportunitiesWithPipeline = opportunities.map((opp: any) => ({
            ...opp,
            pipelineName: pipelineInfo?.name || 'Unknown Pipeline',
            pipelineId: targetPipelineId
          }));
          
                    return { opportunities: opportunitiesWithPipeline };
        } catch (v1Error: any) {
                    throw v1Error;
        }
      }
    } catch (error: any) {
            if (error.response?.status === 401) {
        throw new Error('GHL API authentication failed. Please check your API credentials.');
      } else if (error.response?.status === 403) {
        throw new Error('GHL API access forbidden. Please check your API permissions.');
      } else if (error.response?.status === 404) {
        throw new Error('GHL API endpoint not found. Please check your API configuration.');
      }
      throw error;
    }
  }

  static async getAllOpportunitiesV2(): Promise<any[]> {
    try {
      const headers = await this.getV2Headers();
      const allOpportunities: any[] = [];
      let page = 1;
      let hasMorePages = true;
      
                  while (hasMorePages) {
                const response = await axios.get(
          `${this.GHL_V2_BASE_URL}/opportunities/`, 
          { 
            headers,
            params: {
              page: page,
              limit: 100 // Maximum per page
            }
          }
        );
        
        const opportunities = response.data.opportunities || [];
        const meta = response.data.meta || {};
        
        
        allOpportunities.push(...opportunities);
        
        // Check if there are more pages
        hasMorePages = meta.next_page_url ? true : false;
        page++;
        
        // Safety check to prevent infinite loops
        if (page > 50) {
          break;
        }
      }
      
      
      return allOpportunities;
    } catch (error: any) {
      throw error;
    }
  }

  static async getOpportunitiesByPipeline(pipelineId: string): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      const allOpportunities: any[] = [];
      let page = 1;
      let hasMorePages = true;
      
            while (hasMorePages) {
                const response = await axios.get(
          `${this.GHL_BASE_URL}/pipelines/${pipelineId}/opportunities/`, 
          { 
            headers,
            params: {
              page: page,
              limit: 100 // Maximum per page
            }
          }
        );
        
        const opportunities = response.data.opportunities || [];
        const meta = response.data.meta || {};
        
                        // Enhance opportunities with custom fields
        const enhancedOpportunities = await Promise.all(
          opportunities.map(async (opportunity: any) => {
            try {
              // Fetch detailed opportunity data including custom fields
              const detailedOpp = await this.getOpportunity(opportunity.id);
              if (detailedOpp) {
                return {
                  ...opportunity,
                  customFields: detailedOpp.customFields || opportunity.customFields || [],
                  // Ensure we have all the basic fields
                  id: detailedOpp.id || opportunity.id,
                  name: detailedOpp.name || opportunity.name,
                  status: detailedOpp.status || opportunity.status,
                  pipelineId: detailedOpp.pipelineId || opportunity.pipelineId,
                  stageId: detailedOpp.stageId || opportunity.stageId,
                  contactId: detailedOpp.contactId || opportunity.contactId,
                  monetaryValue: detailedOpp.monetaryValue || opportunity.monetaryValue,
                  createdAt: detailedOpp.createdAt || opportunity.createdAt,
                  updatedAt: detailedOpp.updatedAt || opportunity.updatedAt
                };
              }
              return opportunity;
            } catch (detailError: any) {
                            return opportunity;
            }
          })
        );
        
        allOpportunities.push(...enhancedOpportunities);
        
        // Check if there are more pages
        hasMorePages = meta.next_page_url ? true : false;
        page++;
        
        // Safety check to prevent infinite loops
        if (page > 50) {

          break;
        }
      }
      
            return allOpportunities;
    } catch (error: any) {
                        throw error;
    }
  }

  static async getOpportunitiesByPipelineV2(pipelineId: string): Promise<any[]> {
    try {
      const headers = await this.getV2Headers();
      const allOpportunities: any[] = [];
      let page = 1;
      let hasMorePages = true;
      
                  while (hasMorePages) {
                const response = await axios.get(
          `${this.GHL_V2_BASE_URL}/pipelines/${pipelineId}/opportunities/`, 
          { 
            headers,
            params: {
              page: page,
              limit: 100 // Maximum per page
            }
          }
        );
        
        const opportunities = response.data.opportunities || [];
        const meta = response.data.meta || {};
        
                        // Enhance opportunities with custom fields
        const enhancedOpportunities = await Promise.all(
          opportunities.map(async (opportunity: any) => {
            try {
              // Fetch detailed opportunity data including custom fields
              const detailedOpp = await this.getOpportunity(opportunity.id);
              if (detailedOpp) {
                return {
                  ...opportunity,
                  customFields: detailedOpp.customFields || opportunity.customFields || [],
                  // Ensure we have all the basic fields
                  id: detailedOpp.id || opportunity.id,
                  name: detailedOpp.name || opportunity.name,
                  status: detailedOpp.status || opportunity.status,
                  pipelineId: detailedOpp.pipelineId || opportunity.pipelineId,
                  stageId: detailedOpp.stageId || opportunity.stageId,
                  contactId: detailedOpp.contactId || opportunity.contactId,
                  monetaryValue: detailedOpp.monetaryValue || opportunity.monetaryValue,
                  createdAt: detailedOpp.createdAt || opportunity.createdAt,
                  updatedAt: detailedOpp.updatedAt || opportunity.updatedAt
                };
              }
              return opportunity;
            } catch (detailError: any) {
                            return opportunity;
            }
          })
        );
        
        allOpportunities.push(...enhancedOpportunities);
        
        // Check if there are more pages
        hasMorePages = meta.next_page_url ? true : false;
        page++;
        
        // Safety check to prevent infinite loops
        if (page > 50) {

          break;
        }
      }
      
            return allOpportunities;
    } catch (error: any) {
                        throw error;
    }
  }

  static async getOpportunitiesByStage(pipelineId: string, stageId?: string): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      const allOpportunities: any[] = [];
      let page = 1;
      let hasMorePages = true;
      
            while (hasMorePages) {
                const params: any = {
          page: page,
          limit: 100
        };
        
        // Add stage filter if specified
        if (stageId) {
          params.stage_id = stageId;
        }
        
        const response = await axios.get(
          `${this.GHL_BASE_URL}/pipelines/${pipelineId}/opportunities/`, 
          { 
            headers,
            params
          }
        );
        
        const opportunities = response.data.opportunities || [];
        const meta = response.data.meta || {};
        
                        allOpportunities.push(...opportunities);
        
        // Check if there are more pages
        hasMorePages = meta.next_page_url ? true : false;
        page++;
        
        // Safety check to prevent infinite loops
        if (page > 50) {

          break;
        }
      }
      
            return allOpportunities;
    } catch (error: any) {
                        throw error;
    }
  }

  static async getPipelineId(pipelineName: string): Promise<string | null> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${this.GHL_BASE_URL}/pipelines/`,
        { headers }
      );
      
      const pipelines = response.data.pipelines || [];
      const pipeline = pipelines.find((p: any) => p.name === pipelineName);
      return pipeline ? pipeline.id : null;
    } catch (error: any) {
            return null;
    }
  }

  static async getPipelineInfo(pipelineId: string): Promise<any | null> {
    try {
            // Try V1 API first
      try {
        const headers = await this.getHeaders();
        const response = await axios.get(
          `${this.GHL_BASE_URL}/pipelines/`,
          { headers }
        );
        
        const pipelines = response.data.pipelines || [];
        const pipeline = pipelines.find((p: any) => p.id === pipelineId);
        
        if (pipeline) {
                    return pipeline;
        }
      } catch (v1Error: any) {
              }
      
      // Try V2 API
      try {
        const headers = await this.getV2Headers();
        const response = await axios.get(
          `${this.GHL_V2_BASE_URL}/pipelines/`,
          { headers }
        );
        
        const pipelines = response.data.pipelines || [];
        const pipeline = pipelines.find((p: any) => p.id === pipelineId);
        
        if (pipeline) {
                    return pipeline;
        }
      } catch (v2Error: any) {
              }
      
            return null;
    } catch (error: any) {
            return null;
    }
  }

  static async getPipelineStages(pipelineId: string): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${this.GHL_BASE_URL}/pipelines/${pipelineId}/stages/`,
        { headers }
      );
      
      return response.data.stages || [];
    } catch (error: any) {
            return [];
    }
  }

  static async getStageNameById(pipelineId: string, stageId: string): Promise<string | null> {
    try {
      const stages = await this.getPipelineStages(pipelineId);
      const stage = stages.find((s: any) => s.id === stageId);
      return stage ? stage.name : null;
    } catch (error: any) {
            return null;
    }
  }

  static async listAllOpportunities(pipelineId?: string): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      
      let endpoint: string;
      if (pipelineId) {
        endpoint = `${this.GHL_BASE_URL}/pipelines/${pipelineId}/opportunities/`;
      } else {
        endpoint = `${this.GHL_BASE_URL}/opportunities/`;
      }
      
            const response = await axios.get(endpoint, { headers });
      
            return response.data.opportunities || [];
    } catch (error: any) {
            return [];
    }
  }

  static async getUsers(): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.GHL_BASE_URL}/users/`, { headers });
      
            return response.data.users || [];
    } catch (error: any) {
            return [];
    }
  }

  static async getOpportunity(dealId: string): Promise<GHLDeal | null> {
    try {
            // Try V2 API first (only if V2 token is available)
      try {
                const v2Token = await FirebaseService.getConfiguration('ghl_v2_token');
        
        if (v2Token) {
                    const v2Headers = await this.getV2Headers();
          
                    const v2Response = await axios.get(
            `${this.GHL_V2_BASE_URL}/opportunities/${dealId}`,
            { headers: v2Headers }
          );


          return v2Response.data.opportunity || v2Response.data;
        } else {
                    throw new Error('V2 token not configured');
        }
      } catch (v2Error: any) {
                // Fallback to V1 API
        try {
          const v1Headers = await this.getHeaders();
          
                    const v1Response = await axios.get(
            `${this.GHL_BASE_URL}/opportunities/${dealId}`,
            { headers: v1Headers }
          );

          return v1Response.data.opportunity || v1Response.data;
        } catch (v1Error: any) {
                    throw v1Error;
        }
      }
    } catch (error: any) {
                  if (error.response?.status === 404) {

        return null; // Opportunity not found
      }
      throw error;
    }
  }

  static async updateDeal(dealId: string, dealData: {
    name?: string;
    status?: string;
    pipelineId?: string;
    pipelineStageId?: string;
    monetaryValue?: number;
    assignedTo?: string;
    customFields?: Array<{
      id: string;
      key?: string;
      field_value?: any;
      value?: any;
    }>;
  }): Promise<any> {
    try {
      const headers = await this.getV2Headers();

      // Build V2-compliant payload
      const payload: any = {};
      if (dealData.name !== undefined) payload.name = dealData.name;
      if (dealData.status !== undefined) payload.status = dealData.status;
      if (dealData.pipelineId !== undefined) payload.pipelineId = dealData.pipelineId;
      if (dealData.pipelineStageId !== undefined) payload.pipelineStageId = dealData.pipelineStageId;
      if (dealData.monetaryValue !== undefined) payload.monetaryValue = dealData.monetaryValue;
      if (dealData.assignedTo !== undefined) payload.assignedTo = dealData.assignedTo;
      if (dealData.customFields && Array.isArray(dealData.customFields)) {
        // Keep the same shape as create (id, key, field_value)
        payload.customFields = dealData.customFields.map((cf: any) => ({
          id: cf.id,
          key: cf.key,
          field_value: cf.field_value !== undefined ? cf.field_value : cf.value
        }));
      }

      // Use V2 API for opportunities
      const endpoint = `${this.GHL_V2_BASE_URL}/opportunities/${dealId}`;
            // Use V2 API with PUT method (matching working Python script)
      const response = await axios.put(endpoint, payload, { headers });

      // Check if custom fields were actually updated
      if (response.data.opportunity && response.data.opportunity.customFields) {

      } else {
              }
      
      return response.data.opportunity || response.data;
    } catch (error: any) {
                        // If we get 404, the opportunity might not exist
      if (error.response?.status === 404) {

      }
      
      if (error.response?.status === 404) {
        throw new Error(`GHL opportunity not found. The opportunity with ID ${dealId} may have been deleted or the ID is incorrect.`);
      } else if (error.response?.status === 401) {
        throw new Error('GHL API authentication failed. Please check your API credentials.');
      } else if (error.response?.status === 403) {
        throw new Error('GHL API access denied. Please check your API permissions.');
      } else if (error.response?.data?.msg) {
        throw new Error(`GHL API error: ${error.response.data.msg}`);
      } else {
        throw new Error(`Failed to update deal: ${error.message}`);
      }
    }
  }

  // Contact update methods for Contact-level fields
  static async updateContact(contactId: string, contactData: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    address1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    website?: string;
    timezone?: string;
    dnd?: boolean;
    dndSettings?: {
      Call?: { status: string; message: string; code: string };
      Email?: { status: string; message: string; code: string };
      SMS?: { status: string; message: string; code: string };
      WhatsApp?: { status: string; message: string; code: string };
      GMB?: { status: string; message: string; code: string };
      FB?: { status: string; message: string; code: string };
    };
    inboundDndSettings?: {
      all?: { status: string; message: string };
    };
    tags?: string[];
    customFields?: Array<{
      id: string;
      key: string;
      field_value: any;
    }>;
    source?: string;
    assignedTo?: string;
  }): Promise<GHLContact> {
    try {
      const headers = await this.getV2Headers(); // Use V2 API
      const endpoint = `${this.GHL_V2_BASE_URL}/contacts/${contactId}`; // Use V2 endpoint

            const response = await axios.put(endpoint, contactData, { headers });

      return response.data.contact || response.data;
    } catch (error: any) {
                        if (error.response?.status === 404) {
        throw new Error(`GHL contact not found. The contact with ID ${contactId} may have been deleted or the ID is incorrect.`);
      } else if (error.response?.status === 401) {
        throw new Error('GHL API authentication failed. Please check your API credentials.');
      } else if (error.response?.status === 403) {
        throw new Error('GHL API access denied. Please check your API permissions.');
      } else if (error.response?.data?.msg) {
        throw new Error(`GHL API error: ${error.response.data.msg}`);
      } else {
        throw new Error(`Failed to update contact: ${error.message}`);
      }
    }
  }

  static async updateContactCustomFields(contactId: string, customFieldsArray: Array<{id: string, key: string, field_value: any}>): Promise<GHLContact> {
    try {

      // Get current contact data first
      const currentContact = await this.getContactById(contactId);
      if (!currentContact) {
        throw new Error(`Contact with ID ${contactId} not found`);
      }
      
      // Merge with existing custom fields (if any)
      const existingCustomFields = Array.isArray(currentContact.customFields) ? currentContact.customFields : [];
      const updatedCustomFields = existingCustomFields.map(field => ({
        id: field.id,
        key: field.key,
        field_value: field.field_value || field.fieldValue || ''
      }));
      
      // Update or add new custom fields
      customFieldsArray.forEach(newField => {
        const existingIndex = updatedCustomFields.findIndex(field => field.key === newField.key);
        if (existingIndex >= 0) {
          updatedCustomFields[existingIndex].field_value = newField.field_value;
        } else {
          updatedCustomFields.push({
            id: newField.id,
            key: newField.key,
            field_value: newField.field_value || ''
          });
        }
      });
      
      // Update contact with merged custom fields
      return await this.updateContact(contactId, {
        customFields: updatedCustomFields
      });
    } catch (error: any) {
            throw error;
    }
  }

  // Custom Fields API methods
  static async getLocationId(): Promise<string | null> {
    try {
      // Get the stored location ID from Firebase configurations instead of calling the API
      const locationId = await FirebaseService.getConfiguration('ghl_location_id');
      
      if (locationId) {
                return locationId;
      }
      
            return null;
    } catch (error: any) {
            return null;
    }
  }

  static async getCustomFields(model: 'contact' | 'opportunity' | 'all' = 'all'): Promise<any> {
    try {
      const locationId = await this.getLocationId();
      if (!locationId) {
        throw new Error('Location ID not found');
      }

      const headers = await this.getV2Headers();
      const endpoint = `https://services.leadconnectorhq.com/locations/${locationId}/customFields`;

      const response = await axios.get(endpoint, {
        headers,
        params: { model }
      });
      
                  return {
        locationId,
        model,
        customFields: response.data.customFields || [],
        totalFields: response.data.customFields?.length || 0
      };
    } catch (error: any) {
                  throw error;
    }
  }

  /**
   * Upload document to GHL contact
   */
  static async uploadDocumentToContact(
    contactId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    apiKey: string
  ): Promise<any> {
    try {
      // Convert buffer to base64
      const base64File = fileBuffer.toString('base64');
      
      // GHL document upload endpoint
      const response = await axios.post(
        `${process.env.GHL_BASE_URL}/contacts/${contactId}/documents/`,
        {
          fileName,
          fileData: base64File,
          mimeType
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
            throw error;
    }
  }

  static async getContactCustomFields(): Promise<any> {
    return await this.getCustomFields('contact');
  }

  static async getOpportunityCustomFields(): Promise<any> {
    return await this.getCustomFields('opportunity');
  }

  static async getAllCustomFields(): Promise<any> {
    return await this.getCustomFields('all');
  }

  // Test sub-account connection
  static async testSubAccountConnection(subAccountId: string): Promise<{ success: boolean; message: string; endpoint?: string }> {
    try {
            // Get sub-account credentials
      const subAccountCredentials = await FirebaseService.getSubAccountById(subAccountId);
      if (!subAccountCredentials) {
        throw new Error(`Sub-account with ID ${subAccountId} not found`);
      }

      // Try V2 API first with a simple endpoint
      if (subAccountCredentials.v2Token) {
        try {
                    const headers = {
            'Authorization': `Bearer ${subAccountCredentials.v2Token}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          };
          
          // Test with a simple endpoint that should work
          const response = await axios.get(`${this.GHL_V2_BASE_URL}/locations/${subAccountCredentials.locationId}`, {
            headers
          });
          
                    return { 
            success: true, 
            message: 'V2 API connection successful',
            endpoint: 'locations'
          };
        } catch (v2Error: any) {
                  }
      }

      // Fallback to V1 API
      if (subAccountCredentials.apiKey) {
        try {
                    const headers = {
            'Authorization': `Bearer ${subAccountCredentials.apiKey}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          };
          
          // Test with a simple endpoint that should work
          const response = await axios.get(`${this.GHL_BASE_URL}/locations/`, {
            headers
          });
          
                    return { 
            success: true, 
            message: 'V1 API connection successful',
            endpoint: 'locations'
          };
        } catch (v1Error: any) {
                    throw v1Error;
        }
      }

      throw new Error('No valid API credentials found for sub-account');
    } catch (error: any) {
            throw error;
    }
  }

}
