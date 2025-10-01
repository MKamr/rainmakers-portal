import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface ComparisonData {
  ourDeal: {
    id: string;
    dealId: string;
    propertyName: string;
    propertyAddress: string;
    propertyType: string;
    stage: string;
    status: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    dealType: string;
    propertyVintage: string;
    sponsorNetWorth: string;
    sponsorLiquidity: string;
    loanRequest: string;
    additionalInformation: string;
    ghlOpportunityId?: string;
    createdAt: any;
    updatedAt: any;
  };
  ghlOpportunity: {
    id: string;
    name: string;
    status: string;
    pipelineId: string;
    stageId: string;
    contactId: string;
    monetaryValue: number;
    customFields: Array<{
      id: string;
      key: string;
      field_value: any;
    }>;
    createdAt: string;
    updatedAt: string;
  } | null;
  differences: Array<{
    field: string;
    ourValue: any;
    ghlValue: any;
    type: 'basic' | 'custom' | 'missing';
  }>;
  hasDifferences: boolean;
}

interface ComparisonResponse {
  message: string;
  totalDeals: number;
  dealsWithDifferences: number;
  comparisons: ComparisonData[];
  timestamp: string;
}

interface SyncResponse {
  message: string;
  totalRequested: number;
  successful: number;
  failed: number;
  results: Array<{
    dealId: string;
    success: boolean;
    error?: string;
    updatedFields?: string[];
    message?: string;
  }>;
  timestamp: string;
}

const GHLComparison: React.FC = () => {
  const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchComparisons = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/deals/compare/ghl');
      const data: ComparisonResponse = response.data;
      setComparisons(data.comparisons);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch comparisons');
    } finally {
      setLoading(false);
    }
  };

  const syncSelectedDeals = async () => {
    if (selectedDeals.size === 0) return;
    
    setSyncing(true);
    setError(null);
    try {
      const response = await api.post('/deals/sync/ghl', {
        dealIds: Array.from(selectedDeals)
      });
      const data: SyncResponse = response.data;
      setSyncResults(data);
      
      // Refresh comparisons after sync
      await fetchComparisons();
      
      // Clear selection
      setSelectedDeals(new Set());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to sync deals');
    } finally {
      setSyncing(false);
    }
  };

  const handleDealSelect = (dealId: string) => {
    const newSelected = new Set(selectedDeals);
    if (newSelected.has(dealId)) {
      newSelected.delete(dealId);
    } else {
      newSelected.add(dealId);
    }
    setSelectedDeals(newSelected);
  };

  const handleSelectAll = () => {
    const dealsWithDifferences = comparisons.filter(c => c.hasDifferences);
    if (selectedDeals.size === dealsWithDifferences.length) {
      setSelectedDeals(new Set());
    } else {
      setSelectedDeals(new Set(dealsWithDifferences.map(c => c.ourDeal.id)));
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getFieldDisplayName = (field: string): string => {
    const fieldNames: { [key: string]: string } = {
      propertyName: 'Property Name',
      propertyAddress: 'Property Address',
      propertyType: 'Property Type',
      dealType: 'Deal Type',
      propertyVintage: 'Property Vintage',
      sponsorNetWorth: 'Sponsor Net Worth',
      sponsorLiquidity: 'Sponsor Liquidity',
      loanRequest: 'Loan Request',
      additionalInformation: 'Additional Information',
      ghl_opportunity: 'GHL Opportunity'
    };
    return fieldNames[field] || field;
  };

  const getGHLCustomFieldValue = (ghlOpportunity: ComparisonData['ghlOpportunity'], field: string): any => {
    if (!ghlOpportunity?.customFields) return null;
    const customField = ghlOpportunity.customFields.find(f => f.key === field);
    return customField?.field_value || null;
  };

  useEffect(() => {
    fetchComparisons();
  }, []);

  const dealsWithDifferences = comparisons.filter(c => c.hasDifferences);

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">GHL Deal Comparison</h2>
          <p className="text-gray-600 mt-1">
            Compare deals between our system and GoHighLevel
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchComparisons}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {dealsWithDifferences.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              {selectedDeals.size === dealsWithDifferences.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          {selectedDeals.size > 0 && (
            <button
              onClick={syncSelectedDeals}
              disabled={syncing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? 'Syncing...' : `Sync Selected (${selectedDeals.size})`}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {syncResults && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Sync Results</h3>
          <p className="text-green-700">
            {syncResults.successful} successful, {syncResults.failed} failed out of {syncResults.totalRequested} deals
          </p>
          {syncResults.results.some(r => !r.success) && (
            <div className="mt-2">
              <p className="text-red-700 font-medium">Failed deals:</p>
              <ul className="list-disc list-inside text-red-600">
                {syncResults.results.filter(r => !r.success).map((result, index) => (
                  <li key={index}>{result.dealId}: {result.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{comparisons.length}</div>
            <div className="text-sm text-gray-600">Total Deals</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{dealsWithDifferences.length}</div>
            <div className="text-sm text-gray-600">With Differences</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{comparisons.length - dealsWithDifferences.length}</div>
            <div className="text-sm text-gray-600">In Sync</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading comparisons...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comparisons.map((comparison) => (
            <div
              key={comparison.ourDeal.id}
              className={`border rounded-lg p-6 ${
                comparison.hasDifferences
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-green-200 bg-green-50'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDeals.has(comparison.ourDeal.id)}
                    onChange={() => handleDealSelect(comparison.ourDeal.id)}
                    disabled={!comparison.hasDifferences}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {comparison.ourDeal.dealId}
                    </h3>
                    <div className="text-sm text-gray-600">
                      <span>{comparison.ourDeal.propertyName}</span>
                      {comparison.ourDeal.ghlOpportunityId && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          GHL: {comparison.ourDeal.ghlOpportunityId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {comparison.hasDifferences ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                      {comparison.differences.length} differences
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      In sync
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Our System */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3">Our System</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Property Name:</span> {formatValue(comparison.ourDeal.propertyName)}</div>
                    <div><span className="font-medium">Property Address:</span> {formatValue(comparison.ourDeal.propertyAddress)}</div>
                    <div><span className="font-medium">Property Type:</span> {formatValue(comparison.ourDeal.propertyType)}</div>
                    <div><span className="font-medium">Deal Type:</span> {formatValue(comparison.ourDeal.dealType)}</div>
                    <div><span className="font-medium">Property Vintage:</span> {formatValue(comparison.ourDeal.propertyVintage)}</div>
                    <div><span className="font-medium">Sponsor Net Worth:</span> {formatValue(comparison.ourDeal.sponsorNetWorth)}</div>
                    <div><span className="font-medium">Sponsor Liquidity:</span> {formatValue(comparison.ourDeal.sponsorLiquidity)}</div>
                    <div><span className="font-medium">Loan Request:</span> {formatValue(comparison.ourDeal.loanRequest)}</div>
                    <div><span className="font-medium">Additional Info:</span> {formatValue(comparison.ourDeal.additionalInformation)}</div>
                    <div><span className="font-medium">Contact:</span> {formatValue(comparison.ourDeal.contactName)}</div>
                    <div><span className="font-medium">Email:</span> {formatValue(comparison.ourDeal.contactEmail)}</div>
                    <div><span className="font-medium">Phone:</span> {formatValue(comparison.ourDeal.contactPhone)}</div>
                  </div>
                </div>

                {/* GHL System */}
                <div className="bg-white p-4 rounded-lg border">
                  <h4 className="font-semibold text-gray-900 mb-3">GoHighLevel</h4>
                  {comparison.ghlOpportunity ? (
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Property Name:</span> {formatValue(comparison.ghlOpportunity.name)}</div>
                      <div><span className="font-medium">Property Address:</span> {formatValue(getGHLCustomFieldValue(comparison.ghlOpportunity, 'propertyAddress'))}</div>
                      <div><span className="font-medium">Property Type:</span> {formatValue(getGHLCustomFieldValue(comparison.ghlOpportunity, 'propertyType'))}</div>
                      <div><span className="font-medium">Deal Type:</span> {formatValue(getGHLCustomFieldValue(comparison.ghlOpportunity, 'dealType'))}</div>
                      <div><span className="font-medium">Property Vintage:</span> {formatValue(getGHLCustomFieldValue(comparison.ghlOpportunity, 'propertyVintage'))}</div>
                      <div><span className="font-medium">Sponsor Net Worth:</span> {formatValue(getGHLCustomFieldValue(comparison.ghlOpportunity, 'sponsorNetWorth'))}</div>
                      <div><span className="font-medium">Sponsor Liquidity:</span> {formatValue(getGHLCustomFieldValue(comparison.ghlOpportunity, 'sponsorLiquidity'))}</div>
                      <div><span className="font-medium">Loan Request:</span> {formatValue(getGHLCustomFieldValue(comparison.ghlOpportunity, 'loanRequest'))}</div>
                      <div><span className="font-medium">Additional Info:</span> {formatValue(getGHLCustomFieldValue(comparison.ghlOpportunity, 'additionalInformation'))}</div>
                      <div><span className="font-medium">Status:</span> {formatValue(comparison.ghlOpportunity.status)}</div>
                      <div><span className="font-medium">Monetary Value:</span> {formatValue(comparison.ghlOpportunity.monetaryValue)}</div>
                    </div>
                  ) : (
                    <div className="text-red-600 text-sm">
                      <p>GHL opportunity not found</p>
                      <p className="text-xs mt-1">
                        {comparison.ourDeal.ghlOpportunityId 
                          ? `Expected GHL ID: ${comparison.ourDeal.ghlOpportunityId}`
                          : 'This deal may not have been synced to GHL yet'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Differences */}
              {comparison.hasDifferences && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h5 className="font-semibold text-yellow-800 mb-2">Differences Found:</h5>
                  <div className="space-y-1 text-sm">
                    {comparison.differences.map((diff, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="font-medium text-yellow-800">
                          {getFieldDisplayName(diff.field)}:
                        </span>
                        <span className="text-yellow-700">
                          "{formatValue(diff.ourValue)}" → "{formatValue(diff.ghlValue)}"
                        </span>
                        <span className="px-1 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded">
                          {diff.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {comparisons.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              <p>No deals found to compare</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GHLComparison;
