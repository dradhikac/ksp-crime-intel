import { useEffect } from 'react';

export default function Login() {
  useEffect(() => {
    if (window.catalyst && window.catalyst.auth) {
      window.catalyst.auth.signIn('loginDiv', {
        service_url: window.location.origin + '/app/'
      });
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem' }}>
      <h1>KSP Crime Intelligence Platform</h1>
      <p style={{ color: '#555', marginBottom: '2rem' }}>SCRB Analyst / Station Officer Login</p>
      <div
        id="loginDiv"
        style={{ width: '420px', minHeight: '480px' }}
      ></div>
    </div>
  );
}