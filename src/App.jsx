import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AdminPanel from './AdminPanel';
import ClientView from './ClientView';
import Login from './Login';

// Duración máxima de la sesión: 2 horas
const SESSION_MAX_MS = 2 * 60 * 60 * 1000;
// Mostrar aviso cuando faltan 5 minutos
const SESSION_WARN_MS = 5 * 60 * 1000;

// Devuelve true si la sesión sigue siendo válida
function sessionIsValid() {
  if (localStorage.getItem('adminAuth') !== 'true') return false;
  const t = parseInt(localStorage.getItem('adminAuthTime') || '0', 10);
  if (!t) return false;
  return Date.now() - t < SESSION_MAX_MS;
}

function clearSession() {
  localStorage.removeItem('adminAuth');
  localStorage.removeItem('adminAuthTime');
}

function ProtectedRoute({ children }) {
  // Si la sesión ya venció (por ejemplo, al recargar la página después de mucho tiempo),
  // se limpia y se manda al login.
  if (!sessionIsValid()) {
    clearSession();
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <SessionMonitor />
      {children}
    </>
  );
}

// Vigila la expiración mientras estás dentro del admin.
// Cada 30 segundos comprueba si pasaron las 2 horas.
// 5 minutos antes muestra un aviso flotante con opción de extender.
function SessionMonitor() {
  const navigate = useNavigate();
  const [warn, setWarn] = useState(false);
  const [remainingMin, setRemainingMin] = useState(null);

  useEffect(() => {
    function check() {
      const t = parseInt(localStorage.getItem('adminAuthTime') || '0', 10);
      if (!t) {
        clearSession();
        navigate('/login', { replace: true });
        return;
      }
      const elapsed = Date.now() - t;
      const remaining = SESSION_MAX_MS - elapsed;
      if (remaining <= 0) {
        clearSession();
        navigate('/login', { replace: true });
      } else if (remaining <= SESSION_WARN_MS) {
        setWarn(true);
        setRemainingMin(Math.max(1, Math.ceil(remaining / 60000)));
      } else {
        setWarn(false);
      }
    }
    check();
    const id = setInterval(check, 30000); // cada 30 seg
    return () => clearInterval(id);
  }, [navigate]);

  if (!warn) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        background: '#0F2040',
        border: '1px solid #F59E0B',
        borderRadius: 12,
        padding: '14px 18px',
        color: '#FDE68A',
        boxShadow: '0 8px 24px rgba(0,0,0,.4)',
        maxWidth: 320,
        fontSize: 13,
        fontFamily: 'system-ui,-apple-system,sans-serif',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#F59E0B' }}>
        ⚠️ Tu sesion vence pronto
      </div>
      <div style={{ marginBottom: 10, color: '#FEF3C7' }}>
        Quedan aprox. {remainingMin} {remainingMin === 1 ? 'minuto' : 'minutos'}. Vas a tener que volver a iniciar sesion.
      </div>
      <button
        onClick={() => {
          // Renueva la sesión por otras 2 horas
          localStorage.setItem('adminAuthTime', Date.now().toString());
          setWarn(false);
        }}
        style={{
          background: '#F59E0B',
          color: '#1F2937',
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Extender 2 horas mas
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cliente" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        } />
        <Route path="/cliente" element={<ClientView />} />
      </Routes>
    </BrowserRouter>
  );
}
