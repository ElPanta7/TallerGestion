import RepPCCore from './RepPCCore';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('¿Cerrar sesión?')) {
      localStorage.removeItem('adminAuth');
      navigate('/login');
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Botón de logout flotante */}
      <div style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000,
        background: 'rgba(10,22,40,.95)',
        borderRadius: 12,
        border: '1px solid #1E3A5F',
        padding: '10px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,.5)'
      }}>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '1px solid #1E3A5F',
            borderRadius: 8,
            padding: '8px 14px',
            color: '#06B6D4',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}
          onMouseOver={(e) => {
            e.target.style.borderColor = '#06B6D4';
            e.target.style.background = 'rgba(6,182,212,.1)';
          }}
          onMouseOut={(e) => {
            e.target.style.borderColor = '#1E3A5F';
            e.target.style.background = 'transparent';
          }}
        >
          🚪 Cerrar Sesión
        </button>
      </div>
      
      {/* Panel admin completo */}
      <RepPCCore viewMode="admin" />
    </div>
  );
}
