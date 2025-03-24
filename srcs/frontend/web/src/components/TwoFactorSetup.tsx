import React, { useState } from 'react';
import Spinner from './ui/Spinner';
import { securityService } from '../services/securityService';
import { AlertCircle, CheckCircle, Copy } from 'lucide-react';

enum SetupStep {
  INTRO,
  QR_CODE,
  VERIFICATION,
  SUCCESS
}

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<SetupStep>(SetupStep.INTRO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');

  // Start setup process
  const startSetup = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await securityService.enable2FA();
      setSecret(response.secret);
      setQrCode(response.qrcode);
      setBackupCodes(response.backup_codes);
      setStep(SetupStep.QR_CODE);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start 2FA setup');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify 2FA code
  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await securityService.verify2FASetup(verificationCode);
      setStep(SetupStep.SUCCESS);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to verify 2FA code');
      }
    } finally {
      setLoading(false);
    }
  };

  // Copy backup codes to clipboard
  const copyBackupCodes = () => {
    const formattedCodes = backupCodes.join('\n');
    navigator.clipboard.writeText(formattedCodes).then(
      () => {
        // Show a temporary success message
        alert('Backup codes copied to clipboard!');
      },
      () => {
        alert('Failed to copy codes. Please select and copy them manually.');
      }
    );
  };

  // Handle complete
  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Introduction */}
        {step === SetupStep.INTRO && (
          <>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Set Up Two-Factor Authentication
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                Two-factor authentication adds an extra layer of security to your account.
                You'll need to enter a verification code from your authenticator app when signing in.
              </p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={startSetup}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-2 border-white" />
                    Setting up...
                  </>
                ) : 'Continue'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Step 2: QR Code */}
        {step === SetupStep.QR_CODE && (
          <>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Scan the QR Code
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                Scan this QR code with your authenticator app (like Google Authenticator, 
                Authy, or 1Password). If you can't scan the code, you can manually enter 
                the secret key below.
              </p>
            </div>

            <div className="mt-5 flex flex-col items-center">
              {qrCode && (
                <div className="p-2 bg-white border border-gray-200 rounded-lg mb-4">
                  <img 
                    src={qrCode} 
                    alt="QR Code for 2FA" 
                    className="w-48 h-48"
                  />
                </div>
              )}

              <div className="w-full mb-4">
                <label className="block text-sm font-medium text-gray-700">Secret Key</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    value={secret}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(secret)}
                    className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700">Backup Codes</label>
                <p className="text-xs text-gray-500 mb-2">
                  Save these backup codes in a secure place. You can use them if you lose access to your authenticator app.
                </p>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md mb-2 font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="mb-1">{code}</div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={copyBackupCodes}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Backup Codes
                </button>
              </div>

              <div className="mt-5 w-full">
                <button
                  type="button"
                  onClick={() => setStep(SetupStep.VERIFICATION)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Verification */}
        {step === SetupStep.VERIFICATION && (
          <>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Verify Your Setup
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                Enter the verification code from your authenticator app to confirm setup.
              </p>
            </div>

            <div className="mt-5">
              <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                type="text"
                id="verification-code"
                className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substr(0, 6))}
                maxLength={6}
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={verifyCode}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-2 border-white" />
                    Verifying...
                  </>
                ) : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => setStep(SetupStep.QR_CODE)}
                className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Back
              </button>
            </div>
          </>
        )}

        {/* Step 4: Success */}
        {step === SetupStep.SUCCESS && (
          <>
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Two-Factor Authentication Enabled
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500 mx-auto">
                <p>
                  You've successfully set up two-factor authentication for your account.
                  Make sure you've saved your backup codes in a secure place.
                </p>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleComplete}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Done
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetup;