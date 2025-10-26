import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  RefreshCw, 
  Filter, 
  UserPlus, 
  UserMinus, 
  Phone, 
  Mail, 
  Clock,
  Upload
} from 'lucide-react';
import { appointmentsAPI, adminAPI } from '../services/api';
import { Appointment, User, AppointmentFilters, SubAccount } from '../types';
import { SubAccountManagement } from './SubAccountManagement';
import { formatDate, formatTime } from '../utils/dateUtils';

export const AppointmentManagement: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unassigned' | 'assigned' | 'sub-accounts'>('unassigned');
  const [filters, setFilters] = useState<AppointmentFilters>({});
  const [stats, setStats] = useState({
    total: 0,
    unassigned: 0,
    assigned: 0,
    called: 0,
    completed: 0,
    noAnswer: 0,
    rescheduled: 0,
    cancelled: 0
  });
  const [syncData, setSyncData] = useState({
    startDate: '',
    endDate: '',
    calendarId: '',
    subAccountId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [activeTab, filters]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchAppointments(),
        fetchUsers(),
        fetchStats(),
        fetchSubAccounts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const currentFilters = activeTab === 'unassigned' 
        ? { ...filters, status: 'unassigned' }
        : { ...filters, status: 'assigned' };
      
      const response = await appointmentsAPI.listAllAppointments(currentFilters);
      setAppointments(response.appointments);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      setError(error.response?.data?.error || 'Failed to fetch appointments');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await appointmentsAPI.getAppointmentStats();
      setStats(response.stats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSubAccounts = async () => {
    try {
      const response = await appointmentsAPI.getSubAccounts();
      setSubAccounts(response.subAccounts);
    } catch (error) {
      console.error('Error fetching sub-accounts:', error);
    }
  };

  const handleSyncFromGHL = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      const response = await appointmentsAPI.syncFromGHL(syncData);
      await fetchAppointments();
      await fetchStats();
      alert(`Sync completed! ${response.syncedCount} appointments synced, ${response.skippedCount} skipped.${response.subAccountName ? ` From: ${response.subAccountName}` : ''}`);
    } catch (error: any) {
      console.error('Error syncing appointments:', error);
      setError(error.response?.data?.error || 'Failed to sync appointments from GHL');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAssignAppointment = async (appointmentId: string, userId: string) => {
    try {
      await appointmentsAPI.assignAppointment(appointmentId, userId);
      await fetchAppointments();
      await fetchStats();
    } catch (error: any) {
      console.error('Error assigning appointment:', error);
      setError(error.response?.data?.error || 'Failed to assign appointment');
    }
  };

  const handleUnassignAppointment = async (appointmentId: string) => {
    try {
      await appointmentsAPI.unassignAppointment(appointmentId);
      await fetchAppointments();
      await fetchStats();
    } catch (error: any) {
      console.error('Error unassigning appointment:', error);
      setError(error.response?.data?.error || 'Failed to unassign appointment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unassigned':
        return 'bg-gray-100 text-gray-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'called':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'no-answer':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'unassigned':
        return 'Unassigned';
      case 'assigned':
        return 'Assigned';
      case 'called':
        return 'Called';
      case 'completed':
        return 'Completed';
      case 'no-answer':
        return 'No Answer';
      case 'rescheduled':
        return 'Rescheduled';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getEligibleUsers = () => {
    // Filter users who have accepted terms (this would need to be implemented)
    return users.filter(user => user.isWhitelisted);
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
          <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
          <p className="text-gray-600">Manage appointments and assignments from GoHighLevel</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSyncFromGHL}
            disabled={isSyncing}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
          >
            <Upload className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync from GHL'}</span>
          </button>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-gray-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Unassigned</p>
              <p className="text-xl font-semibold text-gray-900">{stats.unassigned}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <UserPlus className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Assigned</p>
              <p className="text-xl font-semibold text-gray-900">{stats.assigned}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Phone className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Called</p>
              <p className="text-xl font-semibold text-gray-900">{stats.called}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-xl font-semibold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Phone className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">No Answer</p>
              <p className="text-xl font-semibold text-gray-900">{stats.noAnswer}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Rescheduled</p>
              <p className="text-xl font-semibold text-gray-900">{stats.rescheduled}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-gray-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Cancelled</p>
              <p className="text-xl font-semibold text-gray-900">{stats.cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Configuration */}
      {activeTab !== 'sub-accounts' && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={syncData.startDate}
                onChange={(e) => setSyncData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={syncData.endDate}
                onChange={(e) => setSyncData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calendar ID
              </label>
              <input
                type="text"
                value={syncData.calendarId}
                onChange={(e) => setSyncData(prev => ({ ...prev, calendarId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sub-Account
              </label>
              <select
                value={syncData.subAccountId}
                onChange={(e) => setSyncData(prev => ({ ...prev, subAccountId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Default Account</option>
                {subAccounts.map((subAccount) => (
                  <option key={subAccount.id} value={subAccount.id}>
                    {subAccount.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('unassigned')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'unassigned'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Unassigned Appointments ({stats.unassigned})
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assigned'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Assigned Appointments ({stats.assigned})
            </button>
            <button
              onClick={() => setActiveTab('sub-accounts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sub-accounts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sub-Accounts ({subAccounts.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="mb-6 flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="End Date"
            />
            {activeTab === 'assigned' && (
              <select
                value={filters.assignedToUserId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, assignedToUserId: e.target.value || undefined }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Users</option>
                {getEligibleUsers().map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Appointments List */}
          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600">
                {activeTab === 'unassigned' 
                  ? "No unassigned appointments found."
                  : "No assigned appointments found."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {appointment.appointmentTitle}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{appointment.contactName}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>{appointment.contactEmail}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{appointment.contactPhone}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(appointment.appointmentDate)}</span>
                        </div>
                        {appointment.appointmentStartTime && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>Start: {formatTime(appointment.appointmentStartTime)}</span>
                          </div>
                        )}
                        {appointment.appointmentEndTime && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>End: {formatTime(appointment.appointmentEndTime)}</span>
                          </div>
                        )}
                      </div>

                      {appointment.appointmentNotes && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-700">
                            <strong>Notes:</strong> {appointment.appointmentNotes}
                          </p>
                        </div>
                      )}

                      {appointment.callNotes && (
                        <div className="mb-4 p-3 bg-white rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-1">Call Notes:</p>
                          <p className="text-sm text-gray-700">{appointment.callNotes}</p>
                          {appointment.callOutcome && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Outcome:</strong> {appointment.callOutcome}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      {activeTab === 'unassigned' ? (
                        <div className="flex items-center space-x-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignAppointment(appointment.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Assign to...</option>
                            {getEligibleUsers().map(user => (
                              <option key={user.id} value={user.id}>
                                {user.username}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUnassignAppointment(appointment.id)}
                          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center space-x-2"
                        >
                          <UserMinus className="h-4 w-4" />
                          <span>Unassign</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sub-Accounts Tab */}
      {activeTab === 'sub-accounts' && (
        <div className="bg-white rounded-lg border">
          <SubAccountManagement />
        </div>
      )}
    </div>
  );
};
