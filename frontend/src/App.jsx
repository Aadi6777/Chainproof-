import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ShipmentDetails from './pages/ShipmentDetails';
import CreateShipment from './pages/CreateShipment';
import Login from './pages/Login';
import MediatorHandoff from './pages/MediatorHandoff';
import ManagerSignoff from './pages/ManagerSignoff';
import ConsumerSearch from './pages/ConsumerSearch';
import ConsumerDashboard from './pages/ConsumerDashboard';
import DriverScan from './pages/DriverScan';
import AboutPage from './pages/AboutPage';
import FaceVerification from './pages/FaceVerification';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* ── Public full-page routes (own header/footer) ── */}
      <Route path="/about" element={<AboutPage />} />
      <Route path="/driver-scan" element={<DriverScan />} />
      <Route path="/face-verify" element={<FaceVerification />} />
      
      {/* Login is now the Home Page at "/" */}
      <Route path="/" element={!user ? <Login /> : (
        <Navigate to={
          user.role === 'mediator' ? "/handoff" : 
          user.role === 'consumer' ? "/consumer" : "/dashboard"
        } />
      )} />

      {/* ── Authenticated routes (shared Navbar + layout) ── */}
      <Route path="/*" element={
        <>
          <Navbar />
          <div className="layout-container" style={{ paddingTop: '80px' }}>
            <Routes>
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/search" element={
                <ProtectedRoute>
                  <ConsumerSearch />
                </ProtectedRoute>
              } />
              <Route path="/shipment/:id" element={
                <ProtectedRoute>
                  <ShipmentDetails />
                </ProtectedRoute>
              } />
              <Route path="/consumer" element={
                <ProtectedRoute allowedRoles={['consumer']}>
                  <ConsumerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/create" element={
                <ProtectedRoute allowedRoles={['manager', 'senior_manager']}>
                  <CreateShipment />
                </ProtectedRoute>
              } />
              <Route path="/signoff" element={
                <ProtectedRoute allowedRoles={['manager', 'senior_manager']}>
                  <ManagerSignoff />
                </ProtectedRoute>
              } />
              <Route path="/handoff" element={<MediatorHandoff />} />
            </Routes>
          </div>
        </>
      } />
      <Route path="/login" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
