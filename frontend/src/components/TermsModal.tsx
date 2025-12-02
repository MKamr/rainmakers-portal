import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { TermsOfServicePage } from '../pages/TermsOfServicePage';

interface TermsModalProps {
  onAccept: () => void;
}

export function TermsModal({ onAccept }: TermsModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      await authAPI.acceptTerms();
      onAccept();
    } catch (err: any) {
      console.error('Error accepting terms:', err);
      setError(err.response?.data?.error || 'Failed to accept terms. Please try again.');
      setIsAccepting(false);
    }
  };

  // Track scroll to enable accept button
  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.getElementById('terms-content');
      if (scrollable) {
        const scrolled = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 50;
        setHasScrolled(scrolled);
      }
    };

    const scrollable = document.getElementById('terms-content');
    if (scrollable) {
      scrollable.addEventListener('scroll', handleScroll);
      // Check initial state
      handleScroll();
    }

    return () => {
      if (scrollable) {
        scrollable.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
      <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-yellow-500 p-4 sm:p-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-2">
            Terms & Conditions
          </h2>
          <p className="text-gray-400 text-sm">
            Please read and accept the Terms & Conditions to continue
          </p>
        </div>

        {/* Scrollable Content */}
        <div
          id="terms-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          style={{ maxHeight: 'calc(90vh - 200px)' }}
        >
          <div className="prose prose-lg dark:prose-invert max-w-none text-gray-300">
            <TermsOfServicePage />
          </div>
        </div>

        {/* Footer with Accept Button */}
        <div className="border-t border-yellow-500 p-4 sm:p-6 bg-gray-900">
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-500 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}
          
          {!hasScrolled && (
            <div className="mb-4 text-center">
              <p className="text-yellow-400 text-sm">
                Please scroll to the bottom to accept the terms
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-gray-400 text-sm text-center sm:text-left">
              By clicking "I Accept", you agree to be bound by these Terms & Conditions
            </p>
            <button
              onClick={handleAccept}
              disabled={isAccepting || !hasScrolled}
              className="matrix-button-secondary px-6 py-3 text-base font-bold rounded-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isAccepting ? 'Accepting...' : 'I Accept'}
            </button>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .matrix-button-secondary {
          background: linear-gradient(90deg, #FFD700, #FFA500);
          border: 2px solid #FFD700;
          color: #000;
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
          box-shadow: 
            0 0 20px rgba(255, 215, 0, 0.5),
            inset 0 0 20px rgba(255, 215, 0, 0.1);
        }

        .matrix-button-secondary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 
            0 5px 25px rgba(255, 215, 0, 0.7),
            inset 0 0 25px rgba(255, 215, 0, 0.2);
        }

        #terms-content::-webkit-scrollbar {
          width: 8px;
        }

        #terms-content::-webkit-scrollbar-track {
          background: #1a1a1a;
        }

        #terms-content::-webkit-scrollbar-thumb {
          background: #FFD700;
          border-radius: 4px;
        }

        #terms-content::-webkit-scrollbar-thumb:hover {
          background: #FFA500;
        }
      `}</style>
    </div>
  );
}

