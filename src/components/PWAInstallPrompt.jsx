import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing
      e.preventDefault();
      // Stash the event for later use
      setInstallPrompt(e);
      // Show the install prompt UI
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      setShowPrompt(false);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      return;
    }

    // Show the install prompt
    installPrompt.prompt();

    // Wait for outcome
    const { outcome } = await installPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);

    // Reset
    setInstallPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
  };

  if (!showPrompt || dismissed || !installPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm
                    bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] rounded-xl shadow-lg
                    p-4 flex items-center gap-3 z-50 animate-slide-up">
      <div className="flex-1">
        <p className="text-sm font-medium">Install Lifestyle OS</p>
        <p className="text-xs opacity-90 mt-1">Get quick access from your home screen</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium
                    transition-colors whitespace-nowrap"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
