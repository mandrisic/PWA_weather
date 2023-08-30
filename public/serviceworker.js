const CACHE_NAME = "version-5";
const urlsToCache = ['index.html', 'offline.html'];

const self = this;

// Handle storing and retrieving data in IndexedDB
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('myDatabase', 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const store = db.createObjectStore('dataStore', { keyPath: 'key' });
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

function storeData(key, data) {
    openDatabase().then((db) => {
        const transaction = db.transaction(['dataStore'], 'readwrite');
        const objectStore = transaction.objectStore('dataStore');
        objectStore.put({ key, data });
    });
}

function retrieveData(key) {
    return new Promise((resolve, reject) => {
        openDatabase().then((db) => {
            const transaction = db.transaction(['dataStore'], 'readonly');
            const objectStore = transaction.objectStore('dataStore');
            const request = objectStore.get(key);

            request.onsuccess = (event) => {
                const data = event.target.result ? event.target.result.data : null;
                resolve(data);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

// Install SW
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Otvoren cache');
                return cache.addAll(urlsToCache);
            })
    )
});

// Listen for requests
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cacheResponse) => {
                if (cacheResponse) {
                    return cacheResponse;
                }

                if (event.request.url.includes('offline.html')) {
                    return caches.match('offline.html');
                }

                return fetch(event.request)
                    .then((fetchResponse) => {
                        const responseToCache = fetchResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return fetchResponse;
                    })
                    .catch(() => caches.match('offline.html'));
            })
    )
});

// Handle message from page
self.addEventListener('message', (event) => {
    if (event.data.action === 'storeData') {
        const { key, data } = event.data;
        storeData(key, data);
    } else if (event.data.action === 'retrieveData') {
        const { key } = event.data;
        retrieveData(key).then((data) => {
            event.source.postMessage(data);
        });
    } else if (event.data.action === 'getOnlineStatus') {
        event.source.postMessage({ type: 'onlineStatus', isOnline: navigator.onLine });
    }
});

// Activate the SW
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [];
    cacheWhitelist.push(CACHE_NAME);

    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames.map((cacheName) => {
                if (!cacheWhitelist.includes(cacheName)) {
                    return caches.delete(cacheName);
                }
            })
        )).then(() => {
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'onlineStatus', isOnline: navigator.onLine });
                });
            });
        })
    )
});