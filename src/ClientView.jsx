import RepPCCore from './RepPCCore';

export default function ClientView() {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A1628 0%, #162B50 100%)'
    }}>
      <RepPCCore viewMode="client" />
    </div>
  );
}
