'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react'; // npm install lucide-react

export default function InstallPWA() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferredPrompt(null);
  };

  if (!showInstall) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-5 right-5 bg-[#d8c3a5] p-3 rounded-md shadow-sm border border-[#bfae91] hover:bg-[#cbb799] transition-all flex items-center justify-center"
      title="Install App"
    >
      <Download className="text-[#4a3f35] w-6 h-6" />
    </button>
  );
}
