import React, { useState, useEffect } from 'react';
import { appointmentsAPI } from '../services/api';
import { TermsAndConditionsModal } from '../components/TermsAndConditionsModal';
import { MyAppointments } from '../components/MyAppointments';

export const AppointmentsPage: React.FC = () => {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  useEffect(() => {
    checkTermsStatus();
  }, []);

  const checkTermsStatus = async () => {
    try {
      setIsLoading(true);
      const response = await appointmentsAPI.getTermsStatus();
      setHasAcceptedTerms(response.hasAccepted);
      
      if (!response.hasAccepted) {
        setIsTermsModalOpen(true);
      }
    } catch (error) {
      console.error('Error checking terms status:', error);
      // If there's an error, assume terms need to be accepted
      setHasAcceptedTerms(false);
      setIsTermsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTermsAccept = () => {
    setHasAcceptedTerms(true);
    setIsTermsModalOpen(false);
  };

  const handleTermsDecline = () => {
    // Redirect to home page or show a message
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (hasAcceptedTerms === false) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Terms and Conditions Required
            </h1>
            <p className="text-gray-600 mb-6">
              You must accept the terms and conditions to access the appointment calling system.
            </p>
            <button
              onClick={() => setIsTermsModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Review Terms and Conditions
            </button>
          </div>
        </div>

        <TermsAndConditionsModal
          isOpen={isTermsModalOpen}
          onAccept={handleTermsAccept}
          onDecline={handleTermsDecline}
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <MyAppointments />
        </div>
      </div>

      <TermsAndConditionsModal
        isOpen={isTermsModalOpen}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />
    </>
  );
};
