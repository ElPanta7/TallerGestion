import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_USER = 'Martino';
const ADMIN_PASS = 'TallerNFS';

export default function Login() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      localStorage.setItem('adminAuth', 'true');
      navigate('/admin');
    } else {
      setError('Usuario o contraseña incorrectos');
      setPass('');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0A1628 0%, #162B50 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#0F2040',
        border: '1px solid #1E3A5F',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: '#06B6D4',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 16px'
          }}>
            🖥️
          </div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 800, 
            color: '#06B6D4',
            margin: '0 0 8px',
            letterSpacing: '-0.5px'
          }}>
            RepPC
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: '#64748B',
            margin: 0
          }}>
            Panel de Administración
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#94A3B8',
              marginBottom: '8px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Usuario
            </label>
            <input
              type="text"
              value={user}
              onChange={(e) => { setUser(e.target.value); setError(''); }}
              placeholder="Martino"
              autoComplete="username"
              style={{
                width: '100%',
                background: '#162B50',
                border: '1px solid #1E3A5F',
                borderRadius: '10px',
                padding: '14px 16px',
                fontSize: '15px',
                color: '#F0F9FF',
                outline: 'none',
                transition: 'border-color .2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#06B6D4'}
              onBlur={(e) => e.target.style.borderColor = '#1E3A5F'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#94A3B8',
              marginBottom: '8px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setError(''); }}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: '100%',
                background: '#162B50',
                border: '1px solid #1E3A5F',
                borderRadius: '10px',
                padding: '14px 16px',
                fontSize: '15px',
                color: '#F0F9FF',
                outline: 'none',
                transition: 'border-color .2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#06B6D4'}
              onBlur={(e) => e.target.style.borderColor = '#1E3A5F'}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,.1)',
              border: '1px solid rgba(239,68,68,.3)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#FCA5A5',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              background: '#06B6D4',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#0A1628',
              cursor: 'pointer',
              transition: 'all .2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#22D3EE'}
            onMouseOut={(e) => e.target.style.background = '#06B6D4'}
          >
            Iniciar Sesión
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #1E3A5F',
          textAlign: 'center'
        }}>
          <a
            href="/cliente"
            style={{
              color: '#06B6D4',
              fontSize: '13px',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            ¿Sos cliente? Ver tu orden →
          </a>
        </div>
      </div>
    </div>
  );
}
