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

const RawDataViewer: React.FC = () => {
  const [ghlData, setGhlData] = useState<RawGHLData | null>(null);
  const [portalData, setPortalData] = useState<RawPortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ghl' | 'portal'>('ghl');

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
    </div>
  );
};

export default RawDataViewer;
