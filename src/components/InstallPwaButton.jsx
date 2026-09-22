import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

export default function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already launched in standalone mode
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e) => {
      // Prevent automatic browser mini-infobar
      e.preventDefault();
      // Stash prompt event for custom trigger button
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  // If already installed, show small badge; if install prompt available, show button
  if (isInstalled) {
    return (
      <span className="badge normal" style={{ fontSize: '0.72rem' }} title="Running as installed standalone PWA">
        <CheckCircle2 size={12} /> App Installed
      </span>
    );
  }

  if (!installPrompt) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="tab-btn"
      style={{
        padding: '0.25rem 0.65rem',
        fontSize: '0.78rem',
        background: 'rgba(37, 99, 235, 0.2)',
        color: '#60a5fa',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        borderRadius: '9999px',
        fontWeight: '600'
      }}
      title="Install as a standalone Windows Desktop Application"
    >
      <Download size={13} /> Install App
    </button>
  );
}
