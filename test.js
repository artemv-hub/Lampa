(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'other',  
    version: '3.6.4',  
    name: 'Quality Badge',  
    component: 'quality_badge'  
  };  
  
  Lampa.Manifest.plugins = manifest;  
  
  var CONFIG = {  
    CACHE_KEY: 'lampa_quality_cache',  
    CACHE_TTL_MS: 24 * 60 * 60 * 1000,  
    JACRED_URL: 'http://redapi.cfhttp.top/api/v1.0/torrents'  
  };  
  
  // Объединённая структура качества  
  const QUALITY_PATTERNS = [  
    { priority: 100, pattern: /2160p|\buhd\b|\b4k\b/i, quality: '2160' },  
    { priority: 90, pattern: /1080p|\bfhd\b/i, quality: '1080' },  
    { priority: 88, pattern: /1080i/i, quality: '1080i' },  
    { priority: 80, pattern: /720p|\bhd\b/i, quality: '720' },  
    { priority: 70, pattern: /480p|\bsd\b/i, quality: '480' },  
    { priority: 58, pattern: /blu-?ray remux|bd-?remux/i, quality: 'BDRemux' },  
    { priority: 60, pattern: /blu-?ray|\bbd\b/i, quality: 'Blu-Ray' },  
    { priority: 56, pattern: /bd-?rip/i, quality: 'BDRip' },  
    { priority: 54, pattern: /hd-?rip/i, quality: 'HDRip' },  
    { priority: 52, pattern: /dvd-?rip/i, quality: 'DVDRip' },  
    { priority: 50, pattern: /web-?dl|webdl-?rip|web-?rip/i, quality: 'WEB-DL' },  
    { priority: 38, pattern: /vhs-?rip/i, quality: 'VHSRip' },  
    { priority: 36, pattern: /cam-?rip/i, quality: 'CAMRip' },  
    { priority: 40, pattern: /hdtv|iptv|sat|dvb|\btv\b|tvrip/i, quality: 'TV' },  
    { priority: 30, pattern: /telecine|\btc\b/i, quality: 'TC' },  
    { priority: 20, pattern: /telesync|\bts\b/i, quality: 'TS' }  
  ];  
  
  // === Функции кэширования (базовый кэш Lampa) ===  
    
  function setCache(key, quality) {  
    const cache = Lampa.Storage.cache(CONFIG.CACHE_KEY, 1000, {});  
    cache[key] = { quality, ts: Date.now() };  
    Lampa.Storage.set(CONFIG.CACHE_KEY, cache);  
  }  
    
  function getCache(key) {  
    const cache = Lampa.Storage.cache(CONFIG.CACHE_KEY, 1000, {});  
    const item = cache[key];  
    return (item && Date.now() - item.ts < CONFIG.CACHE_TTL_MS) ? item.quality : null;  
  }  
  
  // === Работа с качеством ===  
    
  function getData(title, year, callback) {  
    const userId = Lampa.Storage.get('lampac_unic_id', '');  
    const url = CONFIG.JACRED_URL + '?search=' + encodeURIComponent(title) + '&year=' + year + '&exact=true&uid=' + userId;  
    const network = new Lampa.Reguest();  
      
    network.timeout(5000);  
    network.silent(url, function (torrents) {  
      if (!torrents || !torrents.length) {  
        callback(null);  
        return;  
      }  
        
      const quality = findBestQuality(torrents, year);  
      callback(quality);  
    }, callback); // Объединённая обработка ошибок  
  }  
  
  function processQualityData(title) {  
    for (const { pattern, quality, priority } of QUALITY_PATTERNS) {  
      if (pattern.test(title)) return { quality, priority };  
    }  
    return { quality: null, priority: 0 };  
  }  
  
  function findBestQuality(torrents, targetYear) {  
    const TS_audio = /звук с ts|audio ts/i;  
    const trailer = /трейлер|trailer/i;  
      
    if (torrents.every(t => trailer.test(t.title || ''))) return null;  
      
    const best = torrents.reduce((best, t) => {  
      const title = (t.title || '').toLowerCase();  
      const yearMatch = title.match(/\b(19|20)\d{2}\b/);  
        
      if (yearMatch && Math.abs(parseInt(yearMatch[0]) - targetYear) > 1) return best;  
        
      const { quality, priority } = processQualityData(title);  
      if (!quality) return best;  
        
      const finalPriority = TS_audio.test(title) ? 22 : priority;  
      return finalPriority > best.priority ? { priority: finalPriority, quality, title } : best;  
    }, { priority: -1, quality: null, title: '' });  
      
    return best.quality ? (TS_audio.test(best.title) ? best.quality + '/TS' : best.quality) : null;  
  }  
  
  // === Основная логика ===  
  
  function processCards() {  
    const cards = Array.from(document.querySelectorAll('.card:not([data-quality-processed])'));  
      
    cards.forEach(card => {  
      card.setAttribute('data-quality-processed', 'true');  
        
      const data = card.card_data;  
      const title = data.title || data.name;  
      const year = (data.release_date || data.first_air_date || '').substring(0, 4);  
        
      if (!title || !year) {  
        return; // Убран лишний вызов renderQualityBadge  
      }  
        
      const cacheKey = `${data.id}_${year}`;  
      const cached = getCache(cacheKey);  
        
      if (cached) {  
        renderQualityBadge(card, cached);  
      } else {  
        getData(title, year, function(quality) {  
          if (quality) {  
            setCache(cacheKey, quality);  
          }  
          renderQualityBadge(card, quality);  
        });  
      }  
    });  
  }  
  
  // === Отрисовка ===  
    
  function renderQualityBadge(cardElement, quality) {  
    if (!quality) {   
      cardElement.querySelector('.card__view .card__quality')?.remove();  
      return; // Ранний выход  
    }  
      
    let badge = cardElement.querySelector('.card__view .card__quality');  
      
    if (!badge) {  
      badge = document.createElement('div');  
      badge.className = 'card__quality';  
      cardElement.querySelector('.card__view').appendChild(badge);  
    }  
    badge.innerText = quality;  
  }  
  
  // === Инициализация и события ===  
  
  Lampa.Listener.follow('activity', function (e) {  
    if (e.type == 'start' || e.type == 'page') {  
      setTimeout(processCards, 40);  
    }  
  });  
  
  var observer = new MutationObserver(function (mutations) {  
    mutations.forEach(function (mutation) {  
      mutation.addedNodes.forEach(function (node) {  
        if (node.nodeType === 1 && node.classList?.contains('card') && !node.hasAttribute('data-quality-processed')) {  
          processCards();  
        }  
      });  
    });  
  });  
    
  observer.observe(document.body, { childList: true, subtree: true });  
  
  if (window.appready) {   
    processCards();   
  } else {  
    Lampa.Listener.follow("app", function (e) {  
      if (e.type === "ready") {   
        processCards();   
      }  
    });  
  }  
})();
