import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface RawGHLData {
  success: boolean;
  totalOpportunities: number;
  fetchedAt: string;
  opportunities: any[];
  metadata: {
    apiKeyConfigured: boolean;
    apiKeyPreview: string;
    baseUrl: string;
    targetPipelineId: string;
    customFieldsIncluded: boolean;
  };
}

interface RawPortalData {
  success: boolean;
  totalDeals: number;
  fetchedAt: string;
  deals: any[];
  metadata: {
    dealsWithGhlId: number;
    dealsWithGhlContactId: number;
    dealsBySource: Record<string, number>;
  };
}

interface ComparisonResult {
  portalDeal: any;
  ghlOpportunity: any | null;
  differences: Array<{
    field: string;
    portalValue: any;
    ghlValue: any;
    type: 'basic' | 'custom' | 'missing' | 'ghl_only';
  }>;
  matchType: 'id_match' | 'contact_match' | 'no_match';
}

const RawDataViewer: React.FC = () => {
  const [ghlData, setGhlData] = useState<RawGHLData | null>(null);
  const [portalData, setPortalData] = useState<RawPortalData | null>(null);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ghl' | 'portal' | 'comparison'>('ghl');
  const [testOpportunityId, setTestOpportunityId] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{current: number, total: number, currentDeal: string}>({current: 0, total: 0, currentDeal: ''});
  const [syncResults, setSyncResults] = useState<Array<{dealId: string, success: boolean, error?: string}>>([]);

  const fetchGHLData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/ghl/opportunities/raw');
      setGhlData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch GHL data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/deals/raw');
      setPortalData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch portal data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([fetchGHLData(), fetchPortalData()]);
  };

  const compareData = () => {
    if (!ghlData || !portalData) {
      setError('Please fetch both GHL and Portal data first');
      return;
    }

    const results: ComparisonResult[] = [];

    // Compare each portal deal with GHL opportunities
    portalData.deals.forEach(portalDeal => {
      let matchedOpportunity = null;
      let matchType: 'id_match' | 'contact_match' | 'no_match' = 'no_match';

      // First try to match by GHL opportunity ID
      if (portalDeal.ghlOpportunityId) {
        matchedOpportunity = ghlData.opportunities.find(opp => 
          opp.id === portalDeal.ghlOpportunityId
        );
        if (matchedOpportunity) {
          matchType = 'id_match';
        }
      }

      // If no ID match, try to match by contact ID
      if (!matchedOpportunity && portalDeal.ghlContactId) {
        matchedOpportunity = ghlData.opportunities.find(opp => 
          opp.contactId === portalDeal.ghlContactId
        );
        if (matchedOpportunity) {
          matchType = 'contact_match';
        }
      }

      // Compare fields
      const differences: Array<{
        field: string;
        portalValue: any;
        ghlValue: any;
        type: 'basic' | 'custom' | 'missing' | 'ghl_only';
      }> = [];

      if (matchedOpportunity) {
        // Basic field comparisons
        const basicFields = [
          { portal: 'title', ghl: 'name' },
          { portal: 'propertyAddress', ghl: 'name' },
          { portal: 'status', ghl: 'status' },
          { portal: 'contactName', ghl: 'contact?.name' },
          { portal: 'contactEmail', ghl: 'contact?.email' },
          { portal: 'contactPhone', ghl: 'contact?.phone' }
        ];

        basicFields.forEach(({ portal, ghl }) => {
          const portalValue = portalDeal[portal];
          let ghlValue = ghl.split('.').reduce((obj, key) => obj?.[key], matchedOpportunity);
          
          // If the basic field lookup failed and we have custom fields, try to find it there
          if (!ghlValue && matchedOpportunity.customFields) {
            const ghlCustomFieldsById = matchedOpportunity.customFields.reduce((acc: any, field: any) => {
              acc[field.id] = field.field_value || field.fieldValue;
              return acc;
            }, {});
            
            // Map basic fields to potential custom field IDs (from the image data)
            const basicFieldToCustomIdMap: { [key: string]: string } = {
              'contactPhone': 'TQYpu0alDvrq1D1wGFic', // Phone number from image
              'propertyAddress': 'LHxZmz2YirytBOhD6nTT' // Property address from image
            };
            
            if (basicFieldToCustomIdMap[portal]) {
              ghlValue = ghlCustomFieldsById[basicFieldToCustomIdMap[portal]];
            }
          }
          
          if (String(portalValue || '').trim() !== String(ghlValue || '').trim()) {
            differences.push({
              field: portal,
              portalValue: portalValue || '(empty)',
              ghlValue: ghlValue || '(empty)',
              type: 'basic'
            });
          }
        });

        // Custom field comparisons
        if (matchedOpportunity.customFields) {
          // Create a map of GHL custom fields by field ID for easier lookup
          const ghlCustomFieldsById = matchedOpportunity.customFields.reduce((acc: any, field: any) => {
            acc[field.id] = field.field_value || field.fieldValue;
            return acc;
          }, {});

          // Map portal fields to GHL custom field IDs (based on the actual GHL data structure)
          const customFieldMappings = [
            { portal: 'dealType', ghlFieldId: 'km8O2SU2QW9ka5ItStr1' }, // Refinance
            { portal: 'propertyType', ghlFieldId: 'sWtzj1WAHJWaAIBK5yoh' }, // Multifamily
            { portal: 'propertyVintage', ghlFieldId: 'A2NRf0Go0BYzaKtqMrOw' }, // Property vintage
            { portal: 'sponsorNetWorth', ghlFieldId: 'eZFXdR4ADEDZDXplXBAs' }, // Sponsor net worth
            { portal: 'sponsorLiquidity', ghlFieldId: 'dySlW74ZykeVJwnNciQH' }, // Sponsor liquidity
            { portal: 'loanRequest', ghlFieldId: '0arbFwqGN5CkJ8juGi7r' }, // Loan amount (4.8million)
            { portal: 'additionalInformation', ghlFieldId: '8Hup5EejJhfD2c55gTAv' }, // Additional info
            { portal: 'notes', ghlFieldId: '8Hup5EejJhfD2c55gTAv' }, // Same as additional info
            // Additional fields that might be stored in custom fields
            { portal: 'contactPhone', ghlFieldId: 'TQYpu0alDvrq1D1wGFic' }, // Phone number from image
            { portal: 'propertyAddress', ghlFieldId: 'LHxZmz2YirytBOhD6nTT' } // Property address from image
          ];

          customFieldMappings.forEach(({ portal, ghlFieldId }) => {
            const portalValue = portalDeal[portal];
            const ghlValue = ghlCustomFieldsById[ghlFieldId];
            
            if (String(portalValue || '').trim() !== String(ghlValue || '').trim()) {
              differences.push({
                field: portal,
                portalValue: portalValue || '(empty)',
                ghlValue: ghlValue || '(empty)',
                type: 'custom'
              });
            }
          });

          // Check for GHL-only custom fields
          Object.entries(ghlCustomFieldsById).forEach(([fieldId, value]) => {
            if (value && String(value).trim() !== '') {
              const mappedField = customFieldMappings.find(m => m.ghlFieldId === fieldId);
              if (!mappedField) {
                differences.push({
                  field: `ghl_only_${fieldId}`,
                  portalValue: '(not in portal)',
                  ghlValue: value,
                  type: 'ghl_only'
                });
              }
            }
          });
        }
      } else {
        // No match found
        differences.push({
          field: 'match_status',
          portalValue: 'Portal deal exists',
          ghlValue: 'No matching GHL opportunity found',
          type: 'missing'
        });
      }

      results.push({
        portalDeal,
        ghlOpportunity: matchedOpportunity,
        differences,
        matchType
      });
    });

    setComparisonResults(results);
    setActiveTab('comparison');
  };

  const syncSingleDeal = async (dealId: string) => {
    try {
      setSyncing(true);
      setError(null);
      
      // Find the deal and its corresponding GHL opportunity
      const deal = portalData?.deals.find(d => d.id === dealId);
      const comparison = comparisonResults.find(c => c.portalDeal.id === dealId);
      
      if (!deal || !comparison || !comparison.ghlOpportunity) {
        setError('Deal or GHL opportunity not found for sync');
        return;
      }
      
      // Update the deal with GHL data
      const updateData: any = {};
      
      // Update basic fields
      if (comparison.ghlOpportunity.name && comparison.ghlOpportunity.name !== deal.propertyName) {
        updateData.propertyName = comparison.ghlOpportunity.name;
      }
      
      // Update custom fields from GHL opportunity
      if (comparison.ghlOpportunity.customFields && Array.isArray(comparison.ghlOpportunity.customFields)) {
        const ghlCustomFields = comparison.ghlOpportunity.customFields.reduce((acc: any, field: any) => {
          const value = field.field_value || field.fieldValue;
          acc[field.key] = value;
          return acc;
        }, {});
        
        // Map GHL custom fields to our deal fields
        const fieldMapping: Record<string, string> = {
          'opportunity.deal_type': 'dealType',
          'opportunity.property_type': 'propertyType',
          'opportunity.property_address': 'propertyAddress',
          'opportunity.property_vintage': 'propertyVintage',
          'opportunity.sponsor_net_worth': 'sponsorNetWorth',
          'opportunity.sponsor_liquidity': 'sponsorLiquidity',
          'opportunity.loan_request': 'loanRequest',
          'opportunity.additional_information': 'additionalInformation',
          'contact.contact_name': 'contactName',
          'contact.contact_email': 'contactEmail',
          'contact.contact_phone': 'contactPhone',
          'opportunity.opportunity_source': 'opportunitySource',
          'opportunity.notes': 'notes'
        };
        
        Object.entries(fieldMapping).forEach(([ghlField, ourField]) => {
          if (ghlCustomFields[ghlField] !== undefined && ghlCustomFields[ghlField] !== deal[ourField]) {
            updateData[ourField] = ghlCustomFields[ghlField];
          }
        });
      }
      
      // Update the deal if there are changes
      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = new Date();
        await api.put(`/deals/${dealId}`, updateData);
        
        // Refresh data after successful sync
        await fetchAllData();
        setError(null);
      } else {
        setError('No changes needed - deal is already in sync');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync deal');
    } finally {
      setSyncing(false);
    }
  };

  const syncAllDeals = async () => {
    if (!comparisonResults.length) {
      setError('No comparison results to sync');
      return;
    }

    try {
      setSyncing(true);
      setError(null);
      setSyncResults([]);
      
      const dealsToSync = comparisonResults
        .filter(result => result.ghlOpportunity && result.differences.length > 0)
        .map(result => result.portalDeal.id);
      
      if (dealsToSync.length === 0) {
        setError('No deals with differences found to sync');
        setSyncing(false);
        return;
      }

      setSyncProgress({current: 0, total: dealsToSync.length, currentDeal: ''});
      
      const results: Array<{dealId: string, success: boolean, error?: string}> = [];
      
      for (let i = 0; i < dealsToSync.length; i++) {
        const dealId = dealsToSync[i];
        const deal = portalData?.deals.find(d => d.id === dealId);
        
        setSyncProgress({
          current: i + 1,
          total: dealsToSync.length,
          currentDeal: deal?.dealId || dealId
        });
        
        try {
          // Find the deal and its corresponding GHL opportunity
          const deal = portalData?.deals.find(d => d.id === dealId);
          const comparison = comparisonResults.find(c => c.portalDeal.id === dealId);
          
          if (!deal || !comparison || !comparison.ghlOpportunity) {
            results.push({
              dealId,
              success: false,
              error: 'Deal or GHL opportunity not found'
            });
            continue;
          }
          
          // Update the deal with GHL data
          const updateData: any = {};
          
          // Update basic fields
          if (comparison.ghlOpportunity.name && comparison.ghlOpportunity.name !== deal.propertyName) {
            updateData.propertyName = comparison.ghlOpportunity.name;
          }
          
          // Update custom fields from GHL opportunity
          if (comparison.ghlOpportunity.customFields && Array.isArray(comparison.ghlOpportunity.customFields)) {
            const ghlCustomFields = comparison.ghlOpportunity.customFields.reduce((acc: any, field: any) => {
              const value = field.field_value || field.fieldValue;
              acc[field.key] = value;
              return acc;
            }, {});
            
            // Map GHL custom fields to our deal fields
            const fieldMapping: Record<string, string> = {
              'opportunity.deal_type': 'dealType',
              'opportunity.property_type': 'propertyType',
              'opportunity.property_address': 'propertyAddress',
              'opportunity.property_vintage': 'propertyVintage',
              'opportunity.sponsor_net_worth': 'sponsorNetWorth',
              'opportunity.sponsor_liquidity': 'sponsorLiquidity',
              'opportunity.loan_request': 'loanRequest',
              'opportunity.additional_information': 'additionalInformation',
              'contact.contact_name': 'contactName',
              'contact.contact_email': 'contactEmail',
              'contact.contact_phone': 'contactPhone',
              'opportunity.opportunity_source': 'opportunitySource',
              'opportunity.notes': 'notes'
            };
            
            Object.entries(fieldMapping).forEach(([ghlField, ourField]) => {
              if (ghlCustomFields[ghlField] !== undefined && ghlCustomFields[ghlField] !== deal[ourField]) {
                updateData[ourField] = ghlCustomFields[ghlField];
              }
            });
          }
          
          // Update the deal if there are changes
          if (Object.keys(updateData).length > 0) {
            updateData.updatedAt = new Date();
            await api.put(`/deals/${dealId}`, updateData);
            results.push({
              dealId,
              success: true,
              error: undefined
            });
          } else {
            results.push({
              dealId,
              success: true,
              error: 'No changes needed'
            });
          }
        } catch (err: any) {
          results.push({
            dealId,
            success: false,
            error: err.response?.data?.error || 'Sync failed'
          });
        }
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setSyncResults(results);
      
      // Refresh data after sync
      await fetchAllData();
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (failCount === 0) {
        setError(null);
      } else {
        setError(`Sync completed: ${successCount} successful, ${failCount} failed`);
      }
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync deals');
    } finally {
      setSyncing(false);
      setSyncProgress({current: 0, total: 0, currentDeal: ''});
    }
  };

  const testGHLConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/ghl/test-connection');
      console.log('GHL Connection Test Results:', response.data);
      
      // Show results in a modal or alert
      const results = response.data;
      let message = `GHL Connection Test Results:\n\n`;
      message += `API Key: ${results.apiKeyPreview}\n`;
      message += `V2 Token: ${results.v2TokenPreview}\n\n`;
      
      results.tests.forEach((test: any) => {
        message += `${test.api} API (${test.endpoint}):\n`;
        message += `Status: ${test.status}\n`;
        message += `Message: ${test.message}\n\n`;
      });
      
      alert(message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to test GHL connection');
    } finally {
      setLoading(false);
    }
  };

  const testSpecificOpportunity = async () => {
    if (!testOpportunityId.trim()) {
      alert('Please enter an opportunity ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/admin/ghl/opportunity/${testOpportunityId}`);
      console.log('Specific Opportunity Test Results:', response.data);
      
      const result = response.data;
      let message = `Opportunity Test Results:\n\n`;
      message += `Opportunity ID: ${result.metadata.opportunityId}\n`;
      message += `API Key: ${result.metadata.apiKeyPreview}\n`;
      message += `Custom Fields Count: ${result.metadata.customFieldsCount}\n\n`;
      
      if (result.opportunity.customFields && result.opportunity.customFields.length > 0) {
        message += `Custom Fields:\n`;
        result.opportunity.customFields.forEach((field: any, index: number) => {
          message += `${index + 1}. ${field.key}: ${field.field_value}\n`;
        });
      } else {
        message += `No custom fields found.\n`;
      }
      
      alert(message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch specific opportunity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };


  const renderGHLOpportunity = (opportunity: any, index: number) => (
    <div key={opportunity.id || index} className="border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-lg">Opportunity #{index + 1}</h4>
        <span className="text-sm text-gray-500">ID: {opportunity.id}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h5 className="font-medium text-gray-700 mb-2">Basic Info</h5>
          <div className="space-y-1 text-sm">
            <div><strong>Name:</strong> {opportunity.name || 'N/A'}</div>
            <div><strong>Status:</strong> {opportunity.status || 'N/A'}</div>
            <div><strong>Pipeline ID:</strong> {opportunity.pipelineId || 'N/A'}</div>
            <div><strong>Stage ID:</strong> {opportunity.stageId || 'N/A'}</div>
            <div><strong>Contact ID:</strong> {opportunity.contactId || 'N/A'}</div>
            <div><strong>Monetary Value:</strong> {opportunity.monetaryValue || 'N/A'}</div>
            <div><strong>Created:</strong> {opportunity.createdAt || 'N/A'}</div>
            <div><strong>Updated:</strong> {opportunity.updatedAt || 'N/A'}</div>
          </div>
        </div>
        
        <div>
          <h5 className="font-medium text-gray-700 mb-2">Custom Fields ({opportunity.customFields?.length || 0})</h5>
          {opportunity.customFields && opportunity.customFields.length > 0 ? (
            <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
              {opportunity.customFields.map((field: any, fieldIndex: number) => (
                <div key={fieldIndex} className="border-l-2 border-blue-200 pl-2">
                  <div><strong>{field.key}:</strong> {field.field_value || 'N/A'}</div>
                  <div className="text-xs text-gray-500">ID: {field.id}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No custom fields</div>
          )}
        </div>
      </div>
      
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
          View Raw JSON
        </summary>
        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
          {formatJson(opportunity)}
        </pre>
      </details>
    </div>
  );

  const renderPortalDeal = (deal: any, index: number) => (
    <div key={deal.id || index} className="border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-lg">Deal #{index + 1}</h4>
        <span className="text-sm text-gray-500">ID: {deal.id}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h5 className="font-medium text-gray-700 mb-2">Basic Info</h5>
          <div className="space-y-1 text-sm">
            <div><strong>Deal ID:</strong> {deal.dealId || 'N/A'}</div>
            <div><strong>Title:</strong> {deal.title || 'N/A'}</div>
            <div><strong>Property Address:</strong> {deal.propertyAddress || 'N/A'}</div>
            <div><strong>Property Type:</strong> {deal.propertyType || 'N/A'}</div>
            <div><strong>Stage:</strong> {deal.stage || 'N/A'}</div>
            <div><strong>Status:</strong> {deal.status || 'N/A'}</div>
            <div><strong>Source:</strong> {deal.source || 'N/A'}</div>
          </div>
        </div>
        
        <div>
          <h5 className="font-medium text-gray-700 mb-2">GHL Integration</h5>
          <div className="space-y-1 text-sm">
            <div><strong>GHL Opportunity ID:</strong> {deal.ghlOpportunityId || 'N/A'}</div>
            <div><strong>GHL Contact ID:</strong> {deal.ghlContactId || 'N/A'}</div>
            <div><strong>Contact Name:</strong> {deal.contactName || 'N/A'}</div>
            <div><strong>Contact Email:</strong> {deal.contactEmail || 'N/A'}</div>
            <div><strong>Contact Phone:</strong> {deal.contactPhone || 'N/A'}</div>
            <div><strong>Created:</strong> {deal.createdAt ? new Date(deal.createdAt).toISOString() : 'N/A'}</div>
            <div><strong>Updated:</strong> {deal.updatedAt ? new Date(deal.updatedAt).toISOString() : 'N/A'}</div>
          </div>
        </div>
      </div>
      
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
          View Raw JSON
        </summary>
        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
          {formatJson(deal)}
        </pre>
      </details>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Raw Data Viewer</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchGHLData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Refresh GHL Data
          </button>
          <button
            onClick={fetchPortalData}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Refresh Portal Data
          </button>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Refresh All
          </button>
          <button
            onClick={testGHLConnection}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
          >
            Test GHL Connection
          </button>
          <button
            onClick={compareData}
            disabled={loading || !ghlData || !portalData}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Compare Data
          </button>
        </div>
      </div>

      {/* Test Specific Opportunity */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Test Specific Opportunity</h3>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={testOpportunityId}
            onChange={(e) => setTestOpportunityId(e.target.value)}
            placeholder="Enter opportunity ID (e.g., bCzX0fA5MCXSEIxTII6j)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={testSpecificOpportunity}
            disabled={loading || !testOpportunityId.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Test Opportunity
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error</div>
          <div className="text-red-700 text-sm mt-1">{error}</div>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('ghl')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ghl'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            GHL Opportunities ({ghlData?.totalOpportunities || 0})
          </button>
          <button
            onClick={() => setActiveTab('portal')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'portal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Portal Deals ({portalData?.totalDeals || 0})
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'comparison'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Comparison ({comparisonResults.length})
          </button>
        </nav>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-2 text-gray-600">Loading data...</div>
        </div>
      )}

      {!loading && activeTab === 'ghl' && ghlData && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">GHL Data Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Total Opportunities:</strong> {ghlData.totalOpportunities}
              </div>
              <div>
                <strong>Pipeline ID:</strong> {ghlData.metadata.targetPipelineId}
              </div>
              <div>
                <strong>Custom Fields:</strong> {ghlData.metadata.customFieldsIncluded ? 'Included' : 'Not Included'}
              </div>
              <div>
                <strong>API Key:</strong> {ghlData.metadata.apiKeyPreview}
              </div>
              <div>
                <strong>Base URL:</strong> {ghlData.metadata.baseUrl}
              </div>
              <div>
                <strong>Fetched At:</strong> {new Date(ghlData.fetchedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {ghlData.opportunities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No GHL opportunities found</p>
            </div>
          ) : (
            <div>
              {ghlData.opportunities.map((opportunity, index) => renderGHLOpportunity(opportunity, index))}
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === 'portal' && portalData && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">Portal Data Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Total Deals:</strong> {portalData.totalDeals}
              </div>
              <div>
                <strong>With GHL ID:</strong> {portalData.metadata.dealsWithGhlId}
              </div>
              <div>
                <strong>With GHL Contact ID:</strong> {portalData.metadata.dealsWithGhlContactId}
              </div>
              <div>
                <strong>Fetched At:</strong> {new Date(portalData.fetchedAt).toLocaleString()}
              </div>
            </div>
            <div className="mt-2">
              <strong>Deals by Source:</strong>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(portalData.metadata.dealsBySource).map(([source, count]) => (
                  <span key={source} className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs">
                    {source}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {portalData.deals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No portal deals found</p>
            </div>
          ) : (
            <div>
              {portalData.deals.map((deal, index) => renderPortalDeal(deal, index))}
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === 'comparison' && (
        <div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 mb-2">Comparison Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Total Comparisons:</strong> {comparisonResults.length}
              </div>
              <div>
                <strong>ID Matches:</strong> {comparisonResults.filter(r => r.matchType === 'id_match').length}
              </div>
              <div>
                <strong>Contact Matches:</strong> {comparisonResults.filter(r => r.matchType === 'contact_match').length}
              </div>
              <div>
                <strong>No Matches:</strong> {comparisonResults.filter(r => r.matchType === 'no_match').length}
              </div>
            </div>
            <div className="mt-2">
              <strong>Total Differences:</strong> {comparisonResults.reduce((sum, r) => sum + r.differences.length, 0)}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={syncAllDeals}
                disabled={syncing || comparisonResults.filter(r => r.ghlOpportunity && r.differences.length > 0).length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Sync All Deals ({comparisonResults.filter(r => r.ghlOpportunity && r.differences.length > 0).length})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sync Progress */}
          {syncing && syncProgress.total > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">Sync Progress</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm text-blue-700 mb-1">
                    <span>Progress: {syncProgress.current} of {syncProgress.total}</span>
                    <span>{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-blue-700">
                  {syncProgress.currentDeal && `Syncing: ${syncProgress.currentDeal}`}
                </div>
              </div>
            </div>
          )}

          {/* Sync Results */}
          {syncResults.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Sync Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                <div>
                  <strong>Total:</strong> {syncResults.length}
                </div>
                <div>
                  <strong>Successful:</strong> <span className="text-green-600">{syncResults.filter(r => r.success).length}</span>
                </div>
                <div>
                  <strong>Failed:</strong> <span className="text-red-600">{syncResults.filter(r => !r.success).length}</span>
                </div>
              </div>
              {syncResults.some(r => !r.success) && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                    View Failed Syncs ({syncResults.filter(r => !r.success).length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {syncResults.filter(r => !r.success).map((result, index) => (
                      <div key={index} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                        <strong>{result.dealId}:</strong> {result.error}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {comparisonResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No comparison results. Click "Compare Data" to start comparison.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {comparisonResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold text-lg">Comparison #{index + 1}</h4>
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        result.matchType === 'id_match' ? 'bg-green-100 text-green-800' :
                        result.matchType === 'contact_match' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.matchType === 'id_match' ? 'ID Match' :
                         result.matchType === 'contact_match' ? 'Contact Match' :
                         'No Match'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        result.differences.length === 0 ? 'bg-green-100 text-green-800' :
                        result.differences.length <= 3 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.differences.length} differences
                      </span>
                      {result.ghlOpportunity && result.differences.length > 0 && (
                        <button
                          onClick={() => syncSingleDeal(result.portalDeal.id)}
                          disabled={syncing}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {syncing ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Syncing
                            </>
                          ) : (
                            <>
                              <span>🔄</span>
                              Sync Deal
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                    {/* Portal Deal */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 mb-3">Portal Deal</h5>
                      <div className="space-y-1 text-sm">
                        <div><strong>ID:</strong> {result.portalDeal.id}</div>
                        <div><strong>Deal ID:</strong> {result.portalDeal.dealId || 'N/A'}</div>
                        <div><strong>Title:</strong> {result.portalDeal.title || 'N/A'}</div>
                        <div><strong>Property Address:</strong> {result.portalDeal.propertyAddress || 'N/A'}</div>
                        <div><strong>Contact Name:</strong> {result.portalDeal.contactName || 'N/A'}</div>
                        <div><strong>Contact Email:</strong> {result.portalDeal.contactEmail || 'N/A'}</div>
                        <div><strong>GHL Opportunity ID:</strong> {result.portalDeal.ghlOpportunityId || 'N/A'}</div>
                        <div><strong>GHL Contact ID:</strong> {result.portalDeal.ghlContactId || 'N/A'}</div>
                      </div>
                    </div>

                    {/* GHL Opportunity */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-medium text-green-800 mb-3">GHL Opportunity</h5>
                      {result.ghlOpportunity ? (
                        <div className="space-y-1 text-sm">
                          <div><strong>ID:</strong> {result.ghlOpportunity.id}</div>
                          <div><strong>Name:</strong> {result.ghlOpportunity.name || 'N/A'}</div>
                          <div><strong>Status:</strong> {result.ghlOpportunity.status || 'N/A'}</div>
                          <div><strong>Contact Name:</strong> {result.ghlOpportunity.contact?.name || 'N/A'}</div>
                          <div><strong>Contact Email:</strong> {result.ghlOpportunity.contact?.email || 'N/A'}</div>
                          <div><strong>Contact ID:</strong> {result.ghlOpportunity.contactId || 'N/A'}</div>
                          <div><strong>Custom Fields:</strong> {result.ghlOpportunity.customFields?.length || 0}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No matching GHL opportunity found</div>
                      )}
                    </div>
                  </div>

                  {/* Differences */}
                  {result.differences.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-medium text-yellow-800 mb-3">Differences ({result.differences.length})</h5>
                      <div className="space-y-2">
                        {result.differences.map((diff, diffIndex) => (
                          <div key={diffIndex} className="bg-white border border-yellow-200 rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-sm">{diff.field}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                diff.type === 'basic' ? 'bg-blue-100 text-blue-800' :
                                diff.type === 'custom' ? 'bg-purple-100 text-purple-800' :
                                diff.type === 'ghl_only' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {diff.type}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong className="text-blue-600">Portal:</strong>
                                <div className="mt-1 p-2 bg-blue-50 rounded text-xs">
                                  {String(diff.portalValue)}
                                </div>
                              </div>
                              <div>
                                <strong className="text-green-600">GHL:</strong>
                                <div className="mt-1 p-2 bg-green-50 rounded text-xs">
                                  {String(diff.ghlValue)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No differences */}
                  {result.differences.length === 0 && result.ghlOpportunity && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-green-800 font-medium">✅ No differences found - Data is in sync!</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RawDataViewer;
