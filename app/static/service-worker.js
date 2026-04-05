const CACHE_NAME = 'xdownloader-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
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
          if (cache !== CACHE_NAME) {
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
      // Se estiver no cache, retorna. Senão, busca na rede.
      return response || fetch(event.request);
    })
  );
});
