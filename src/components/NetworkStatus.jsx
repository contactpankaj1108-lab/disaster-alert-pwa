import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Zap } from 'lucide-react';

export default function NetworkStatus({ isOnline, isSimulatedOffline, isDataSaver, onToggleDataSaver }) {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false
  });

  useEffect(() => {
    // Check Network Information API supported in Chromium / Edge
    if ('connection' in navigator && navigator.connection) {
      const conn = navigator.connection;
      const updateNetwork = () => {
        setNetworkInfo({
          effectiveType: conn.effectiveType || '4g',
          downlink: conn.downlink || 10,
          rtt: conn.rtt || 50,
          saveData: conn.saveData || false
        });
      };
      updateNetwork();
      conn.addEventListener('change', updateNetwork);
      return () => conn.removeEventListener('change', updateNetwork);
    }
  }, []);

  const isEffectivelyOnline = isOnline && !isSimulatedOffline;

  // Determine quality tier
  const getQualityBadge = () => {
    if (!isEffectivelyOnline) {
      return {
        label: isSimulatedOffline ? 'Offline (Simulated)' : 'Offline',
        badgeClass: 'offline',
        icon: WifiOff,
        color: '#f87171'
      };
    }

    const type = (networkInfo.effectiveType || '4g').toLowerCase();
    if (type === '2g' || type === 'slow-2g') {
      return {
        label: 'Online (Poor 2G)',
        badgeClass: 'warning',
        icon: Wifi,
        color: '#f97316'
      };
    }
    if (type === '3g') {
      return {
        label: 'Online (Slow 3G)',
        badgeClass: 'watch',
        icon: Wifi,
        color: '#f59e0b'
      };
    }
    return {
      label: `Online (Good ${type.toUpperCase()})`,
      badgeClass: 'online',
      icon: Wifi,
      color: '#10b981'
    };
  };

  const quality = getQualityBadge();
  const IconComp = quality.icon;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
      
      {/* Network Tier Badge */}
      <span className={`badge ${quality.badgeClass}`} title={`Round Trip: ~${networkInfo.rtt}ms • Bandwidth: ~${networkInfo.downlink}Mbps`}>
        <IconComp size={13} />
        <span>{quality.label}</span>
      </span>

      {/* Data Saver Mode Quick Toggle */}
      {onToggleDataSaver && (
        <button
          onClick={onToggleDataSaver}
          className="tab-btn"
          style={{
            fontSize: '0.74rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: isDataSaver ? 'rgba(234, 179, 8, 0.2)' : 'var(--bg-card)',
            color: isDataSaver ? '#fde047' : 'var(--text-secondary)',
            border: isDataSaver ? '1px solid #eab308' : '1px solid var(--border-color)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
          title="Data Saver limits tile downloads, pauses background syncs, and disables animations"
        >
          <Zap size={12} color={isDataSaver ? '#fde047' : 'var(--text-muted)'} />
          <span>{isDataSaver ? 'Data Saver: ON' : 'Data Saver'}</span>
        </button>
      )}

    </div>
  );
}
