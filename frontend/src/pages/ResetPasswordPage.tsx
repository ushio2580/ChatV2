import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ResetPasswordModal from '../components/ResetPasswordModal';

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (token) {
      setShowModal(true);
    } else {
      // Redirect to login if no token
      navigate('/login');
    }
  }, [token, navigate]);

  const handleClose = () => {
    setShowModal(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        {!token && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">
              <h3 className="font-medium">Invalid Reset Link</h3>
              <p className="mt-1 text-sm">
                This password reset link is invalid or has expired.
              </p>
              <div className="mt-3">
                <Link
                  to="/login"
                  className="text-red-600 hover:text-red-500 font-medium"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          </div>
        )}

        {token && (
          <ResetPasswordModal
            isOpen={showModal}
            onClose={handleClose}
            token={token}
          />
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
