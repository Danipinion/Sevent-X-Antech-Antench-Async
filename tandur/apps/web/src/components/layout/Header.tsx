import React from 'react';

export const Header: React.FC = () => {
  return (
    <header style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>🌱 TANDUR</span>
        <span style={{ fontSize: '0.875rem', color: '#6b7280', paddingLeft: '0.5rem', borderLeft: '1px solid #e5e7eb' }}>
          Rantai Pasok Pertanian Digital
        </span>
      </div>
      <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
        <a href="#dashboard" style={{ color: '#16a34a', textDecoration: 'none' }}>Dashboard</a>
        <a href="#commodities" style={{ color: '#4b5563', textDecoration: 'none' }}>Komoditas</a>
        <a href="#prices" style={{ color: '#4b5563', textDecoration: 'none' }}>Harga Pasar</a>
        <a href="#inventory" style={{ color: '#4b5563', textDecoration: 'none' }}>Inventaris</a>
        <a href="#orders" style={{ color: '#4b5563', textDecoration: 'none' }}>Pesanan</a>
      </nav>
    </header>
  );
};
