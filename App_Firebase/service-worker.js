const CACHE_NAME = 'frequencia-alunos-v1';
const urlsToCache = [
  '/Frequencia-Alunos/App_Firebase/frequencia_app_fb.html',
  '/Frequencia-Alunos/App_Firebase/frequencia_app_fb_script.js',
  '/Frequencia-Alunos/styles/main_styles.css',
  '/Frequencia-Alunos/styles/secondary_styles.css',
  '/Frequencia-Alunos/img/icon.png',
  'https://cdn.tailwindcss.com'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estratégia: Network First, fallback para Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a requisição foi bem-sucedida, clona e armazena no cache
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhar (offline), busca do cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Se a requisição for uma navegação (carregamento de página)
          if (event.request.mode === 'navigate') {
            // Tenta servir a página HTML principal cacheada
            return caches.match('/Frequencia-Alunos/App_Firebase/frequencia_app_fb.html');
          }
        });
      })
  );
});
