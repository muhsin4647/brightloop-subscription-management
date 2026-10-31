import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api.ts';
import { Customer, User } from '../../types/index.ts';
import { UserCheck, Lock, CheckCircle2, Building, ShieldCheck, Mail, Phone, MapPin, Hash } from 'lucide-react';

export const PortalProfilePage: React.FC = () => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Form
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      const data = await apiRequest<{ customer: Customer; user: User }>('/portal/profile');
      setCustomer(data.customer);
      setUser(data.user);
      if (data.customer) {
        setName(data.customer.name || '');
        setCompany(data.customer.company || '');
        setPhone(data.customer.phone || '');
        setBillingAddress(data.customer.billing_address || '');
        setTaxId(data.customer.tax_id || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setUpdatingProfile(true);
    try {
      await apiRequest('/portal/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          phone: phone.trim() || undefined,
          billing_address: billingAddress.trim() || undefined,
          tax_id: taxId.trim() || undefined,
        }),
      });
      setProfileMsg('Company and billing profile details saved successfully.');
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);
    setUpdatingPassword(true);
    try {
      await apiRequest('/portal/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setPasswordMsg('Account password updated securely.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Account &amp; Billing Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your organization credentials, billing address, tax registration number, and security access.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profile Card (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-700" />
              Company &amp; Invoicing Details
            </h2>
            <span className="text-[11px] font-mono text-slate-400">ID: {customer?.id || '—'}</span>
          </div>

          {profileMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Primary Contact Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 rounded-xl text-xs text-slate-900 bg-white placeholder:text-slate-400 transition-all shadow-2xs outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Company / Legal Entity</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 rounded-xl text-xs text-slate-900 bg-white placeholder:text-slate-400 transition-all shadow-2xs outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Account Email (Verified)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-500 font-mono cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 rounded-xl text-xs text-slate-900 bg-white placeholder:text-slate-400 transition-all shadow-2xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Registered Invoicing Address</label>
              <textarea
                rows={2}
                placeholder="Plot / Street, City, State, PIN"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 rounded-xl text-xs text-slate-900 bg-white placeholder:text-slate-400 transition-all shadow-2xs outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">GSTIN / Tax Identification ID</label>
              <input
                type="text"
                placeholder="07AAAAA0000A1Z5"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 rounded-xl text-xs text-slate-900 bg-white font-mono uppercase placeholder:text-slate-400 transition-all shadow-2xs outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Printed on all tax invoices generated by the recurring billing engine.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {updatingProfile ? 'Saving...' : 'Update Invoicing Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Security Card (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-700" />
              Security &amp; Password
            </h2>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>

          {passwordMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordMsg}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-700 font-medium">
              {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 rounded-xl text-xs text-slate-900 bg-white placeholder:text-slate-400 transition-all shadow-2xs outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">New Account Password</label>
              <input
                type="password"
                required
                placeholder="•••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 rounded-xl text-xs text-slate-900 bg-white placeholder:text-slate-400 transition-all shadow-2xs outline-none"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
              Password must be at least 9 characters long, containing uppercase, lowercase, and a special character.
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={updatingPassword}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {updatingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
