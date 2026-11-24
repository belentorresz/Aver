import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreens } from './components/auth/AuthScreens';
import { DocentePanel } from './components/docente/DocentePanel';
import { GuardianSpace } from './components/guardian/GuardianSpace';

function AppContent() {
  const { user, isAuthenticated, role, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#F8F7FC' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div className="logo-mark" style={{ width: '48px', height: '48px' }}>
            <span style={{ fontSize: '24px' }}>A</span>
            <i />
          </div>
          <strong style={{ color: '#492477', fontSize: '15px' }}>Cargando AVer...</strong>
        </div>
      </div>
    );
  }

  // Si no está autenticado, muestra la pantalla de selección e inicio de sesión
  if (!isAuthenticated || !user) {
    return <AuthScreens />;
  }

  // Si está autenticado como docente, accede al panel con las 10 pantallas de Figma
  if (role === 'DOCENTE') {
    return <DocentePanel user={user} onLogout={logout} />;
  }

  // Si está autenticado como apoderado, accede a su espacio protegido
  if (role === 'APODERADO') {
    return <GuardianSpace />;
  }

  return <AuthScreens />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
