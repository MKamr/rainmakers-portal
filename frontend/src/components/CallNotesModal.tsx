import React, { useState } from 'react';
import { X, Save, Clock, MessageSquare } from 'lucide-react';
import { appointmentsAPI } from '../services/api';
import { CallNotesData } from '../types';

interface CallNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  contactName: string;
  contactPhone: string;
  onSuccess: () => void;
}

export const CallNotesModal: React.FC<CallNotesModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  contactName,
  contactPhone,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CallNotesData>({
    callNotes: '',
    callOutcome: 'sat-qualified',
    callDuration: undefined,
    followUpDate: '',
    appointmentStatusUpdate: '',
    dealStatus: 'active'
  });

  const callOutcomeOptions = [
    { value: 'sat-qualified', label: 'Sat/Qualified' },
    { value: 'sat-unqualified', label: 'Sat/Unqualified' },
    { value: 'no-show', label: 'No Show' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.callNotes.trim()) {
      setError('Call notes are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await appointmentsAPI.submitCallNotes(appointmentId, formData);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error submitting call notes:', error);
      setError(error.response?.data?.error || 'Failed to submit call notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CallNotesData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCallNow = () => {
    // Open phone dialer with contact phone number
    window.open(`tel:${contactPhone}`, '_self');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Call Notes
              </h2>
              <p className="text-sm text-gray-600">
                {contactName} • {contactPhone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Call Now Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleCallNow}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center space-x-2"
              >
                <Clock className="h-5 w-5" />
                <span>Call Now</span>
              </button>
            </div>

            {/* Call Notes */}
            <div>
              <label htmlFor="callNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Call Notes *
              </label>
              <textarea
                id="callNotes"
                value={formData.callNotes}
                onChange={(e) => handleInputChange('callNotes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe what was discussed during the call..."
                required
              />
            </div>

            {/* Call Outcome */}
            <div>
              <label htmlFor="callOutcome" className="block text-sm font-medium text-gray-700 mb-2">
                Call Outcome *
              </label>
              <select
                id="callOutcome"
                value={formData.callOutcome}
                onChange={(e) => handleInputChange('callOutcome', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {callOutcomeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

                         {/* Deal Status (Conditional) */}
             {formData.callOutcome === 'sat-qualified' && (
               <div>
                 <label htmlFor="dealStatus" className="block text-sm font-medium text-gray-700 mb-2">
                   Deal Status *
                 </label>
                 <select
                   id="dealStatus"
                   value={formData.dealStatus}
                   onChange={(e) => handleInputChange('dealStatus', e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   required
                 >
                   <option value="active">Active</option>
                   <option value="inactive">Inactive</option>
                 </select>
               </div>
             )}

            {/* Call Duration */}
            <div>
              <label htmlFor="callDuration" className="block text-sm font-medium text-gray-700 mb-2">
                Call Duration (minutes)
              </label>
              <input
                type="number"
                id="callDuration"
                value={formData.callDuration || ''}
                onChange={(e) => handleInputChange('callDuration', parseInt(e.target.value) || 0)}
                min="0"
                max="300"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter duration in minutes"
              />
            </div>

            {/* Follow-up Date */}
            <div>
              <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Date
              </label>
              <input
                type="date"
                id="followUpDate"
                value={formData.followUpDate}
                onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Appointment Status Update */}
            <div>
              <label htmlFor="appointmentStatusUpdate" className="block text-sm font-medium text-gray-700 mb-2">
                Appointment Status Update
              </label>
              <textarea
                id="appointmentStatusUpdate"
                value={formData.appointmentStatusUpdate}
                onChange={(e) => handleInputChange('appointmentStatusUpdate', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any updates about the appointment status..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !formData.callNotes.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Submit Notes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
