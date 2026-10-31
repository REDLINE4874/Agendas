// Registro de Service Worker y gestión de instalación PWA (Chrome App)
(() => {
  // 1. Registro del Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado correctamente:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Error al registrar Service Worker:', err);
        });
    });
  }

  // 2. Control de instalación (beforeinstallprompt)
  let deferredPrompt = null;
  const installBtn = document.getElementById('pwa-install-btn');

  // Si la aplicación ya está abierta como app independiente (standalone), ocultar botón
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone && installBtn) {
    installBtn.style.display = 'none';
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    // Evita el banner por defecto en móviles si se desea disparar manualmente
    e.preventDefault();
    deferredPrompt = e;

    if (installBtn && !isStandalone) {
      installBtn.style.display = 'inline-flex';
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        // En caso de que el navegador soporte instalación pero no haya guardado el evento
        alert('Para instalar esta app, también puedes usar el botón de instalación en la barra de direcciones de Chrome o el menú (tres puntos > Instalar Agenda de prospectos).');
        return;
      }

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Elección del usuario:', outcome);
      deferredPrompt = null;
      installBtn.style.display = 'none';
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Agenda de prospectos instalada como Chrome App');
    deferredPrompt = null;
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  });
})();
