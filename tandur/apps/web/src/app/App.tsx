import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { formatRupiah } from '../utils/format';

interface SystemStatus {
  status: string;
  app: string;
  version: string;
  database: string;
  timestamp: string;
}

export const App: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/health');
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data);
      } else {
        setBackendStatus({
          status: 'offline',
          app: 'TANDUR API',
          version: 'v1.0.0',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      setBackendStatus({
        status: 'offline (development)',
        app: 'TANDUR API',
        version: 'v1.0.0',
        database: 'waiting for connection',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '0.75rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#15803d' }}>
            Selamat Datang di TANDUR 🌱
          </h1>
          <p style={{ color: '#4b5563', margin: 0, fontSize: '1rem', lineHeight: '1.5' }}>
            Fondasi platform digital rantai pasok komoditas pertanian dengan pemodelan Clean Architecture (Modular Monolith) dan Feature-Based Architecture.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Status Koneksi Service */}
          <div style={{ background: '#ffffff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 0, color: '#1f2937' }}>
              Status Sistem Development
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', fontSize: '0.925rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#6b7280' }}>Web Frontend (Vite + React)</span>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>● Online</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ color: '#6b7280' }}>API Backend (Fiber v3)</span>
                <span style={{ color: backendStatus?.status === 'ok' ? '#16a34a' : '#ea580c', fontWeight: 600 }}>
                  ● {backendStatus ? backendStatus.status : 'Mengecek...'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ color: '#6b7280' }}>Database (PostgreSQL + PostGIS)</span>
                <span style={{ color: backendStatus?.database === 'connected' ? '#16a34a' : '#6b7280', fontWeight: 600 }}>
                  {backendStatus?.database || 'Standby'}
                </span>
              </div>
            </div>
            <div style={{ marginTop: '1.25rem' }}>
              <Button onClick={checkHealth} disabled={loading} variant="primary">
                {loading ? 'Menghubungkan...' : 'Periksa Status API'}
              </Button>
            </div>
          </div>

          {/* Fitur Utama */}
          <div style={{ background: '#ffffff', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: 0, color: '#1f2937' }}>
              Modul Fitur TANDUR
            </h2>
            <ul style={{ margin: '0.75rem 0 0 0', paddingLeft: '1.25rem', color: '#4b5563', lineHeight: '1.7' }}>
              <li><strong>Smart Margin Control:</strong> Stabilitas harga petani & pembeli</li>
              <li><strong>Stock Consolidation:</strong> Agregasi inventaris multi-petani</li>
              <li><strong>Geospatial Map:</strong> Pelacakan komoditas & rute distribusi</li>
              <li><strong>Market Price Index:</strong> Referensi harga pasar terkini</li>
            </ul>
            <div style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Contoh acuan harga cabai hari ini: <strong>{formatRupiah(45000)} / kg</strong>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default App;
