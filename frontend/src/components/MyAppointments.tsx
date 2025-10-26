import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, Calendar, Clock, User, Mail, Filter, RefreshCw } from 'lucide-react';
import { appointmentsAPI } from '../services/api';
import { Appointment } from '../types';
import { CallNotesModal } from './CallNotesModal';
import { formatDate, formatTime } from '../utils/dateUtils';

export const MyAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCallNotesModalOpen, setIsCallNotesModalOpen] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await appointmentsAPI.getMyAssignments();
      setAppointments(response.appointments);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      setError(error.response?.data?.error || 'Failed to fetch appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallNotesSubmit = () => {
    fetchAppointments(); // Refresh the list
    setIsCallNotesModalOpen(false);
    setSelectedAppointment(null);
  };

  const openCallNotesModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsCallNotesModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const filteredAppointments = appointments.filter(appointment => {
    if (statusFilter === 'all') return true;
    return appointment.status === statusFilter;
  });

  const stats = {
    total: appointments.length,
    assigned: appointments.filter(apt => apt.status === 'assigned').length,
    called: appointments.filter(apt => apt.status === 'called').length,
    completed: appointments.filter(apt => apt.status === 'completed').length
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Appointments</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your assigned appointments and call notes</p>
        </div>
        <button
          onClick={fetchAppointments}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 dark:bg-gray-800 p-4 rounded-lg border border-gray-700 dark:border-gray-700 shadow">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Total</p>
              <p className="text-2xl font-semibold text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 dark:bg-gray-800 p-4 rounded-lg border border-gray-700 dark:border-gray-700 shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Assigned</p>
              <p className="text-2xl font-semibold text-white">{stats.assigned}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 dark:bg-gray-800 p-4 rounded-lg border border-gray-700 dark:border-gray-700 shadow">
          <div className="flex items-center">
            <Phone className="h-8 w-8 text-orange-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Called</p>
              <p className="text-2xl font-semibold text-white">{stats.called}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 dark:bg-gray-800 p-4 rounded-lg border border-gray-700 dark:border-gray-700 shadow">
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-400">Completed</p>
              <p className="text-2xl font-semibold text-white">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Filter */}
      <div className="bg-gray-800 dark:bg-gray-800 p-4 rounded-lg border border-gray-700 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="called">Called</option>
            <option value="completed">Completed</option>
            <option value="no-answer">No Answer</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
          <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No appointments found</h3>
          <p className="text-gray-400">
            {statusFilter === 'all' 
              ? "You don't have any assigned appointments yet."
              : `No appointments with status "${getStatusLabel(statusFilter)}" found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {appointment.appointmentTitle}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <User className="h-4 w-4" />
                          <span>{appointment.contactName}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Mail className="h-4 w-4" />
                          <span>{appointment.contactEmail}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Phone className="h-4 w-4" />
                          <span>{appointment.contactPhone}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(appointment.appointmentDate)}</span>
                        </div>
                        {appointment.appointmentStartTime && (
                          <div className="flex items-center space-x-2 text-sm text-gray-300">
                            <Clock className="h-4 w-4" />
                            <span>Start: {formatTime(appointment.appointmentStartTime)}</span>
                          </div>
                        )}
                        {appointment.appointmentEndTime && (
                          <div className="flex items-center space-x-2 text-sm text-gray-300">
                            <Clock className="h-4 w-4" />
                            <span>End: {formatTime(appointment.appointmentEndTime)}</span>
                          </div>
                        )}
                      </div>

                      {appointment.appointmentNotes && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-300">
                            <strong>Notes:</strong> {appointment.appointmentNotes}
                          </p>
                        </div>
                      )}

                      {appointment.callNotes && (
                        <div className="mb-4 p-3 bg-gray-700 rounded-lg border border-gray-600">
                          <p className="text-sm font-medium text-white mb-1">Call Notes:</p>
                          <p className="text-sm text-gray-300">{appointment.callNotes}</p>
                          {appointment.callOutcome && (
                            <p className="text-sm text-gray-400 mt-1">
                              <strong>Outcome:</strong> {appointment.callOutcome}
                            </p>
                          )}
                          {appointment.callDuration && (
                            <p className="text-sm text-gray-400">
                              <strong>Duration:</strong> {appointment.callDuration} minutes
                            </p>
                          )}
                        </div>
                      )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {(appointment.status === 'assigned' || appointment.status === 'called') && (
                    <button
                      onClick={() => openCallNotesModal(appointment)}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 dark:bg-yellow-500 rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 flex items-center space-x-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>
                        {appointment.status === 'assigned' ? 'Add Notes' : 'Update Notes'}
                      </span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => window.open(`tel:${appointment.contactPhone}`, '_self')}
                    className="px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center space-x-2 border border-green-300 dark:border-green-700"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Call</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Call Notes Modal */}
      {selectedAppointment && (
        <CallNotesModal
          isOpen={isCallNotesModalOpen}
          onClose={() => {
            setIsCallNotesModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointmentId={selectedAppointment.id}
          contactName={selectedAppointment.contactName}
          contactPhone={selectedAppointment.contactPhone}
          onSuccess={handleCallNotesSubmit}
        />
      )}
    </div>
  );
};
