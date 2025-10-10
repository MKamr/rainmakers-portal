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
          const ghlValue = ghl.split('.').reduce((obj, key) => obj?.[key], matchedOpportunity);
          
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
          const ghlCustomFields = matchedOpportunity.customFields.reduce((acc: any, field: any) => {
            acc[field.key] = field.field_value || field.fieldValue;
            return acc;
          }, {});

          // Map portal fields to GHL custom fields
          const customFieldMappings = [
            { portal: 'dealType', ghl: 'opportunity.deal_type' },
            { portal: 'propertyType', ghl: 'opportunity.property_type' },
            { portal: 'propertyVintage', ghl: 'opportunity.property_vintage' },
            { portal: 'sponsorNetWorth', ghl: 'opportunity.sponsor_net_worth' },
            { portal: 'sponsorLiquidity', ghl: 'opportunity.sponsor_liquidity' },
            { portal: 'loanRequest', ghl: 'opportunity.loan_request' },
            { portal: 'additionalInformation', ghl: 'opportunity.additional_information' },
            { portal: 'notes', ghl: 'opportunity.notes' }
          ];

          customFieldMappings.forEach(({ portal, ghl }) => {
            const portalValue = portalDeal[portal];
            const ghlValue = ghlCustomFields[ghl];
            
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
          Object.entries(ghlCustomFields).forEach(([key, value]) => {
            if (value && String(value).trim() !== '') {
              const mappedField = customFieldMappings.find(m => m.ghl === key);
              if (!mappedField) {
                differences.push({
                  field: `ghl_only_${key}`,
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
          </div>

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
                    <div className="flex gap-2">
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
