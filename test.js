(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'other',  
    version: '3.7.8',  
    name: 'Quality Badge',  
    component: 'quality_badge'  
  };  
  
  Lampa.Manifest.plugins = manifest;  
  
  var CONFIG = {  
    CACHE_KEY: 'lampa_quality_cache',  
    CACHE_TTL_MS: 24 * 60 * 60 * 1000,  
    JACRED_URL: 'http://redapi.cfhttp.top/api/v1.0/torrents'  
  };  
  
  // Точно как в исходном плагине - простые массивы  
  var QUALITY_PRIORITY = {  
    '2160': 100,  
    '1080': 90,  
    '1080i': 88,  
    '720': 80,  
    '480': 70,  
    'Blu-Ray': 60,  
    'BDRemux': 58,  
    'BDRip': 56,  
    'HDRip': 54,  
    'DVDRip': 52,  
    'WEB-DL': 50,  
    'TVRip': 40,  
    'VHSRip': 38,  
    'CAMRip': 36,  
    'TC': 30,  
    'TS': 20  
  };  
  
  // === Функции кэширования ===  
    
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
  
  // === Работа с качеством (точно как в исходнике) ===  
    
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
    }, callback);  
  }  
  
  function parseQuality(title) {  
    const patterns = [  
      [/2160p|\buhd\b|\b4k\b/i, '2160'],  
      [/1080p|\bfhd\b/i, '1080'],  
      [/1080i/i, '1080i'],  
      [/720p|\bhd\b/i, '720'],  
      [/480p|\bsd\b/i, '480'],  
      [/blu-?ray remux|bd-?remux/i, 'BDRemux'],  
      [/blu-?ray|\bbd\b/i, 'Blu-Ray'],  
      [/bd-?rip/i, 'BDRip'],  
      [/hd-?rip/i, 'HDRip'],  
      [/dvd-?rip/i, 'DVDRip'],  
      [/web-?dl|webdl-?rip|web-?rip/i, 'WEB-DL'],  
      [/vhs-?rip/i, 'VHSRip'],  
      [/cam-?rip/i, 'CAMRip'],  
      [/hdtv|iptv|sat|dvb|\btv\b|tvrip/i, 'TV'],  
      [/telecine|\btc\b/i, 'TC'],  
      [/telesync|\bts\b/i, 'TS']  
    ];  
  
    for (const [pattern, quality] of patterns) {  
      if (pattern.test(title)) return quality;  
    }  
    return null;  
  }  
  
  function findBestQuality(torrents, targetYear) {  
    const TS_audio = /звук с ts|audio ts/i;  
    const trailer = /трейлер|trailer/i;  
      
    if (torrents.every(t => trailer.test(t.title || ''))) return null;  
      
    const result = torrents.reduce((best, t) => {  
      const title = (t.title || '').toLowerCase();  
      const yearMatch = title.match(/\b(19|20)\d{2}\b/);  
      const quality = parseQuality(title);  
      const priority = TS_audio.test(title) ? 22 : (QUALITY_PRIORITY[quality] || 0);  
        
      if ((yearMatch && Math.abs(parseInt(yearMatch[0]) - targetYear) > 1) || !quality) return best;  
      return priority > best.priority ? { priority, quality, title } : best;  
    }, { priority: -1, quality: null, title: '' });  
      
    return result.quality ? (TS_audio.test(result.title) ? result.quality + '/TS' : result.quality) : null;  
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
        return;  
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
      return;   
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
      setTimeout(processCards, 80);  
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
