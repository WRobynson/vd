const CACHE_NAME = 'xdownloader-v10';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/favicon.png',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/manifest.json'
];

// Instalação - Faz cache inicial dos arquivos
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Criando cache e adicionando ativos...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.error('Erro ao adicionar ativos ao cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação - Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativado.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== 'xdownloader-v1' && cache !== 'xdownloader-v2' && cache !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Estratégia Cache-First para arquivos locais, Network-Only para a API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não intercepta chamadas de API
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
