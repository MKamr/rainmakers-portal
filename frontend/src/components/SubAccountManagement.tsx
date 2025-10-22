import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  TestTube, 
  RefreshCw, 
  Settings,
  Key,
  MapPin
} from 'lucide-react';
import { appointmentsAPI } from '../services/api';
import { SubAccount } from '../types';

export const SubAccountManagement: React.FC = () => {
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    v2Token: '',
    locationId: ''
  });

  useEffect(() => {
    fetchSubAccounts();
  }, []);

  const fetchSubAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await appointmentsAPI.getSubAccounts();
      setSubAccounts(response.subAccounts);
    } catch (error: any) {
      console.error('Error fetching sub-accounts:', error);
      setError(error.response?.data?.error || 'Failed to fetch sub-accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      setError(null);
      await appointmentsAPI.createSubAccount(formData);
      await fetchSubAccounts();
      setFormData({ name: '', apiKey: '', v2Token: '', locationId: '' });
    } catch (error: any) {
      console.error('Error creating sub-account:', error);
      setError(error.response?.data?.error || 'Failed to create sub-account');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      setError(null);
      await appointmentsAPI.updateSubAccount(id, formData);
      await fetchSubAccounts();
      setEditingId(null);
      setFormData({ name: '', apiKey: '', v2Token: '', locationId: '' });
    } catch (error: any) {
      console.error('Error updating sub-account:', error);
      setError(error.response?.data?.error || 'Failed to update sub-account');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sub-account?')) {
      return;
    }

    try {
      setError(null);
      await appointmentsAPI.deleteSubAccount(id);
      await fetchSubAccounts();
    } catch (error: any) {
      console.error('Error deleting sub-account:', error);
      setError(error.response?.data?.error || 'Failed to delete sub-account');
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTestingId(id);
      setError(null);
      const result = await appointmentsAPI.testSubAccount(id);
      if (result.success) {
        alert(`✅ Connection successful! Found ${result.appointmentsFound || 0} appointments.`);
      } else {
        let errorMsg = result.message;
        if (result.statusCode) {
          errorMsg += ` (Status: ${result.statusCode})`;
        }
        if (result.details) {
          errorMsg += `\nDetails: ${JSON.stringify(result.details)}`;
        }
        alert(`❌ ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Error testing sub-account:', error);
      setError(error.response?.data?.error || 'Failed to test sub-account');
    } finally {
      setTestingId(null);
    }
  };

  const startEdit = (subAccount: SubAccount) => {
    setEditingId(subAccount.id);
    setFormData({
      name: subAccount.name,
      apiKey: subAccount.apiKey,
      v2Token: subAccount.v2Token || '',
      locationId: subAccount.locationId
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', apiKey: '', v2Token: '', locationId: '' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sub-Account Management</h2>
          <p className="text-gray-600">Manage GoHighLevel sub-accounts for appointment syncing</p>
        </div>
        <button
          onClick={fetchSubAccounts}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Create Form */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {editingId ? 'Edit Sub-Account' : 'Add New Sub-Account'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Main Account, Client A"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location ID *
            </label>
            <input
              type="text"
              value={formData.locationId}
              onChange={(e) => setFormData(prev => ({ ...prev, locationId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="GHL Location ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key *
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="GHL API Key"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              V2 Token (Optional)
            </label>
            <input
              type="password"
              value={formData.v2Token}
              onChange={(e) => setFormData(prev => ({ ...prev, v2Token: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="GHL V2 Private Integration Token"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          {editingId && (
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            onClick={editingId ? () => handleUpdate(editingId) : handleCreate}
            disabled={isCreating || !formData.name || !formData.apiKey || !formData.locationId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{editingId ? 'Updating...' : 'Creating...'}</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>{editingId ? 'Update' : 'Create'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Accounts List */}
      {subAccounts.length === 0 ? (
        <div className="bg-white p-8 rounded-lg border text-center">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sub-accounts configured</h3>
          <p className="text-gray-600">Add your first sub-account to start syncing appointments from multiple GoHighLevel accounts.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Sub-Accounts ({subAccounts.length})</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {subAccounts.map((subAccount) => (
              <div key={subAccount.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {subAccount.name}
                      </h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        subAccount.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {subAccount.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Key className="h-4 w-4" />
                        <span>API Key: {subAccount.apiKey ? '••••••••' : 'Not set'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>Location: {subAccount.locationId}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>V2 Token: {subAccount.v2Token ? '••••••••' : 'Not set'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleTest(subAccount.id)}
                      disabled={testingId === subAccount.id}
                      className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {testingId === subAccount.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      <span>Test</span>
                    </button>
                    
                    <button
                      onClick={() => startEdit(subAccount)}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    
                    <button
                      onClick={() => handleDelete(subAccount.id)}
                      className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
