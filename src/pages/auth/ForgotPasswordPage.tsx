import React, { useState } from 'react';
import { apiRequest } from '../../lib/api.ts';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordPageProps {
  onNavigate: (path: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });

      setMessage(res.message);
      if (res.developmentResetToken) {
        setDevToken(res.developmentResetToken);
        setToken(res.developmentResetToken);
      }
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: token.trim(),
          newPassword,
        }),
      });

      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={() => onNavigate('/login')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>

        <div className="bg-white py-8 px-6 shadow-xs rounded-2xl sm:px-8 border border-slate-200/90">
          {step === 'request' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center font-bold text-white text-xs tracking-tight">
                  BL
                </div>
                <span className="font-bold text-slate-900 tracking-tight text-base">Brightloop</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Reset Account Password</h3>
              <p className="text-xs text-slate-500 mb-6">
                Enter your registered corporate email address and we'll generate an account recovery token.
              </p>

              {error && (
                <div className="p-3.5 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="alex@acmecorp.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Sending Request...' : 'Send Password Reset Token'}
                </button>
              </form>
            </div>
          )}

          {step === 'reset' && (
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Enter New Password</h3>
              <p className="text-xs text-slate-500 mb-4">{message}</p>

              {devToken && (
                <div className="p-3.5 mb-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                  <div className="font-bold flex items-center gap-1 text-indigo-700">
                    <KeyRound className="w-3.5 h-3.5" />
                    Development Reset Token Auto-Filled:
                  </div>
                  <code className="text-[10px] break-all bg-white px-2 py-1 rounded block mt-1.5 border border-indigo-200/60 font-mono">
                    {devToken}
                  </code>
                </div>
              )}

              {error && (
                <div className="p-3.5 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reset Token *</label>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs font-mono bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 9 chars, 1 uppercase, 1 special..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Resetting Password...' : 'Confirm & Save New Password'}
                </button>
              </form>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Password Reset Completed</h3>
              <p className="text-xs text-slate-500">Your password has been successfully updated. You can now log in.</p>
              <button
                onClick={() => onNavigate('/login')}
                className="mt-2 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                Sign In Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
