import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { TermsOfServicePage } from '../pages/TermsOfServicePage';

interface TermsModalProps {
  onAccept: () => void;
}

// TOS Version - Update this when Terms change
const TOS_VERSION = '1.0';
const TOS_EFFECTIVE_DATE = '2025-11-28';

export function TermsModal({ onAccept }: TermsModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false); // Clickwrap checkbox - MUST be unchecked by default

  const handleAccept = async () => {
    // Legal requirement: User MUST check the box
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service to continue.');
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      await authAPI.acceptTerms();
      onAccept();
    } catch (err: any) {
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

          {/* Clickwrap Agreement - LEGALLY REQUIRED */}
          <div className="mb-4 p-4 bg-gray-800 border border-yellow-500/50 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-5 h-5 text-yellow-500 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500 focus:ring-2 cursor-pointer flex-shrink-0"
                required
              />
              <span className="text-gray-300 text-sm leading-relaxed">
                I have read and agree to the{' '}
                <a
                  href="/terms-of-service.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </a>
                {' '}and{' '}
                <a
                  href="/privacy-policy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            {!agreedToTerms && (
              <p className="mt-2 text-red-400 text-xs">
                You must check this box to continue.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <p className="text-gray-400 text-xs text-center sm:text-left">
              Version {TOS_VERSION} | Effective {TOS_EFFECTIVE_DATE}
            </p>
            <button
              onClick={handleAccept}
              disabled={isAccepting || !hasScrolled || !agreedToTerms}
              className="matrix-button-secondary px-6 py-3 text-base font-bold rounded-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isAccepting ? 'Accepting...' : 'I Agree'}
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

