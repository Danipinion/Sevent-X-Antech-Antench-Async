import React from 'react';
import { Header } from './Header';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb', color: '#111827', fontFamily: 'system-ui, sans-serif' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </main>
      <footer style={{ borderTop: '1px solid #e5e7eb', padding: '1rem 2rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', background: '#ffffff' }}>
        &copy; 2026 TANDUR Team (Sevent-X Antech). Seluruh Hak Cipta Dilindungi.
      </footer>
    </div>
  );
};
