import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { RegisterPage } from './pages/auth/RegisterPage.tsx';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.tsx';
import { DashboardPage } from './pages/admin/DashboardPage.tsx';
import { SubscriptionsPage } from './pages/admin/SubscriptionsPage.tsx';
import { InvoicesPage } from './pages/admin/InvoicesPage.tsx';
import { QuotationsPage } from './pages/admin/QuotationsPage.tsx';
import { CustomersPage } from './pages/admin/CustomersPage.tsx';
import { ProductsPage } from './pages/admin/ProductsPage.tsx';
import { PlansPage } from './pages/admin/PlansPage.tsx';
import { PaymentsPage } from './pages/admin/PaymentsPage.tsx';
import { BillingOperationsPage } from './pages/admin/BillingOperationsPage.tsx';
import { ReportsPage } from './pages/admin/ReportsPage.tsx';
import { TaxesDiscountsPage } from './pages/admin/TaxesDiscountsPage.tsx';
import { StaffPage } from './pages/admin/StaffPage.tsx';
import { AuditLogsPage } from './pages/admin/AuditLogsPage.tsx';
import { PortalDashboardPage } from './pages/portal/PortalDashboardPage.tsx';
import { PortalSubscriptionsPage } from './pages/portal/PortalSubscriptionsPage.tsx';
import { PortalInvoicesPage } from './pages/portal/PortalInvoicesPage.tsx';
import { PortalPaymentsPage } from './pages/portal/PortalPaymentsPage.tsx';
import { PortalProfilePage } from './pages/portal/PortalProfilePage.tsx';

function MainRouter() {
  const { user, role, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  // Handle browser popstate
  useEffect(() => {
    const onPop = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Redirect based on role when path is root or mismatched
  useEffect(() => {
    if (user) {
      if (role === 'CUSTOMER' && (currentPath === '/' || !currentPath.startsWith('/portal'))) {
        navigate('/portal');
      } else if (role !== 'CUSTOMER' && currentPath.startsWith('/portal')) {
        navigate('/');
      }
    }
  }, [user, role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f3fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-500/20 animate-pulse">
            BL
          </div>
          <span className="text-xs text-slate-600 font-bold tracking-wider uppercase">Loading Brightloop Platform...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated routes
  if (!user) {
    if (currentPath === '/register') {
      return <RegisterPage onNavigate={navigate} />;
    }
    if (currentPath === '/forgot-password') {
      return <ForgotPasswordPage onNavigate={navigate} />;
    }
    return <LoginPage onNavigate={navigate} />;
  }

  // Render main application shell
  return (
    <div className="min-h-screen bg-[#f8f9fb] flex font-sans text-slate-900 antialiased selection:bg-[#6342e8] selection:text-white">
      {/* Fixed Sidebar matching reference UI */}
      <Sidebar currentPath={currentPath} onNavigate={navigate} />

      {/* Main Content Area physically offset by fixed 320px sidebar */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto ml-[320px]">
        {/* Sticky Top Navbar pinned at the top-left of the viewport */}
        <div className="sticky top-0 z-20 bg-[#f8f9fb]/95 backdrop-blur-md px-6 sm:px-8 pt-5 pb-3 border-b border-slate-200/60 shadow-2xs">
          <Navbar onNavigate={navigate} />
        </div>

        {/* Page Content View */}
        <div className="flex-1 p-6 sm:p-8 pt-4 flex flex-col w-full max-w-[1600px]">

          {/* Operations & Admin Routes */}
          {role !== 'CUSTOMER' && (
            <div className="flex-1">
              {currentPath === '/' && <DashboardPage onNavigate={navigate} />}
              {currentPath === '/subscriptions' && <SubscriptionsPage />}
              {currentPath === '/invoices' && <InvoicesPage />}
              {currentPath === '/quotations' && <QuotationsPage />}
              {currentPath === '/customers' && <CustomersPage />}
              {currentPath === '/products' && <ProductsPage />}
              {currentPath === '/plans' && <PlansPage />}
              {currentPath === '/payments' && <PaymentsPage />}
              {currentPath === '/billing' && <BillingOperationsPage />}
              {currentPath === '/reports' && <ReportsPage />}
              {currentPath === '/taxes-discounts' && <TaxesDiscountsPage />}
              {currentPath === '/staff' && <StaffPage />}
              {currentPath === '/audit-logs' && <AuditLogsPage />}
            </div>
          )}

          {/* Customer Self-Service Portal Routes */}
          {role === 'CUSTOMER' && (
            <div className="flex-1">
              {currentPath === '/portal' && <PortalDashboardPage onNavigate={navigate} />}
              {currentPath === '/portal/subscriptions' && <PortalSubscriptionsPage />}
              {currentPath === '/portal/invoices' && <PortalInvoicesPage />}
              {currentPath === '/portal/payments' && <PortalPaymentsPage />}
              {currentPath === '/portal/profile' && <PortalProfilePage />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
