"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    const registerWorker = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // La app sigue funcionando aunque el navegador no permita registrar el service worker.
      });
    };

    window.addEventListener("load", registerWorker);
    return () => window.removeEventListener("load", registerWorker);
  }, []);

  useEffect(() => {
    const beforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setVisible(true);
    };

    const installed = () => {
      setInstallPrompt(null);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
    setVisible(false);
  }

  if (!visible || !installPrompt) return null;

  return (
    <aside className="install-app-prompt" role="dialog" aria-label="Instalar aplicación">
      <button className="install-app-close" type="button" aria-label="Ocultar instalación" onClick={() => setVisible(false)}>
        <X size={15} aria-hidden="true" />
      </button>
      <div>
        <strong>Instalar app</strong>
        <span>Acceso rápido desde el celular o escritorio.</span>
      </div>
      <button className="install-app-button" type="button" onClick={installApp}>
        <Download size={17} aria-hidden="true" />
        <span>Instalar</span>
      </button>
    </aside>
  );
}
