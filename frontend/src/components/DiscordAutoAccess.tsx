import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, AlertCircle, CheckCircle, Clock, Upload } from 'lucide-react';
import api from '../services/api';

interface DiscordAutoAccessUser {
  id: string;
  discordUsername: string;
  notes: string;
  addedBy: string;
  addedByUsername: string;
  createdAt: string;
  updatedAt: string;
}

const DiscordAutoAccess: React.FC = () => {
  const [users, setUsers] = useState<DiscordAutoAccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [bulkUsernames, setBulkUsernames] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/discord-auto-access');
      setUsers(response.data.users || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await api.post('/admin/discord-auto-access', {
        discordUsername: newUsername.trim(),
        notes: newNotes.trim()
      });
      
      setSuccess(`Discord username "${newUsername}" added to auto-access list successfully`);
      setNewUsername('');
      setNewNotes('');
      setShowAddForm(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUsernames.trim()) return;

    try {
      setBulkSubmitting(true);
      setError(null);
      
      // Parse usernames from textarea (split by newlines, commas, or spaces)
      const usernames = bulkUsernames
        .split(/[\n,]+/)
        .map(username => username.trim())
        .filter(username => username.length > 0);

      if (usernames.length === 0) {
        setError('Please enter at least one valid username');
        return;
      }

      const response = await api.post('/admin/discord-auto-access/bulk', {
        usernames,
        notes: bulkNotes.trim()
      });
      
      const { summary } = response.data;
      let message = `Bulk add completed: ${summary.successful} added successfully`;
      
      if (summary.duplicates > 0) {
        message += `, ${summary.duplicates} duplicates skipped`;
      }
      if (summary.failed > 0) {
        message += `, ${summary.failed} failed`;
      }
      
      setSuccess(message);
      setBulkUsernames('');
      setBulkNotes('');
      setShowBulkForm(false);
      await fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to bulk add users');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to remove "${username}" from the auto-access list?`)) {
      return;
    }

    try {
      setDeleting(id);
      setError(null);
      await api.delete(`/admin/discord-auto-access/${id}`);
      
      setSuccess(`Discord username "${username}" removed from auto-access list successfully`);
      await fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove user');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading Discord auto-access users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="mr-2 h-6 w-6 text-blue-600" />
            Discord Auto-Access Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage Discord usernames that automatically get portal access when they first log in
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Username
          </button>
          <button
            onClick={() => setShowBulkForm(!showBulkForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Add
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Discord Username</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Discord Username *
              </label>
              <input
                type="text"
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter Discord username (e.g., john_doe)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Add any notes about this user..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting || !newUsername.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Username
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewUsername('');
                  setNewNotes('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Add Form */}
      {showBulkForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="mr-2 h-5 w-5 text-green-600" />
            Bulk Add Discord Usernames
          </h3>
          <form onSubmit={handleBulkAdd} className="space-y-4">
            <div>
              <label htmlFor="bulkUsernames" className="block text-sm font-medium text-gray-700 mb-1">
                Discord Usernames *
              </label>
              <textarea
                id="bulkUsernames"
                value={bulkUsernames}
                onChange={(e) => setBulkUsernames(e.target.value)}
                placeholder="Enter usernames separated by new lines or commas:&#10;john_doe&#10;jane_smith&#10;bob_wilson"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate usernames with new lines or commas. Invalid usernames will be skipped.
              </p>
            </div>
            <div>
              <label htmlFor="bulkNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="bulkNotes"
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Add notes for all users (optional)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={bulkSubmitting || !bulkUsernames.trim()}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {bulkSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Add
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBulkForm(false);
                  setBulkUsernames('');
                  setBulkNotes('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Auto-Access Users ({users.length})
          </h3>
        </div>
        
        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>No Discord usernames in the auto-access list yet.</p>
            <p className="text-sm">Add usernames to automatically grant portal access to new Discord users.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discord Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {user.discordUsername}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {user.notes || <span className="text-gray-400 italic">No notes</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.addedByUsername}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.discordUsername)}
                        disabled={deleting === user.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {deleting === user.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-1 h-3 w-3" />
                            Remove
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">How it works</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>When a Discord user logs in for the first time, the system checks if their username is in this list</li>
                <li>If found, they are automatically granted portal access (whitelisted)</li>
                <li>If not found, they need to be manually whitelisted by an admin</li>
                <li>This only applies to first-time users - existing users are not affected</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordAutoAccess;
