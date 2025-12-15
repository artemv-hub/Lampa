(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.6.0',
    name: 'Quality Badge',
    component: 'quality_badge'
  };

  Lampa.Manifest.plugins = manifest;

  var CONFIG = {
    CACHE_KEY: 'lampa_quality_cache',
    CACHE_TTL_MS: 24 * 60 * 60 * 1000,
    JACRED_URL: 'https://jacred.xyz/api/v1.0/torrents'
  };

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
    'VHSRip': 30,
    'CAMRip': 20,
    'TC': 10,
    'TS': 8
  };

  function fetchQuality(title, year, callback) {
    var userId = Lampa.Storage.get('lampac_unic_id', '');
    var url = CONFIG.JACRED_URL + '?search=' + encodeURIComponent(title) + '&year=' + year + '&exact=true&uid=' + userId;

    var network = new Lampa.Reguest();
    network.timeout(5000);

    network.silent(url, function (torrents) {
      if (!torrents || !torrents.length) return callback(null);
      var best = findBestQuality(torrents, year);
      callback(best);
    }, function () {
      callback(null);
    });
  }

  function findBestQuality(torrents, targetYear) {
    const TS_audio = /звук с ts|audio ts/i;

    const result = torrents.reduce((best, t) => {
      const title = (t.title || '').toLowerCase();

      const yearMatch = title.match(/\b(19|20)\d{2}\b/);
      if (yearMatch && Math.abs(parseInt(yearMatch[0]) - targetYear) > 1) return best;

      const quality = parseQuality(title);
      if (!quality) return best;

      const priority = TS_audio.test(title) ? 8 : (QUALITY_PRIORITY[quality] || 0);
      return priority > best.priority ? { priority, quality, title } : best;
    }, { priority: -1, quality: null, title: '' });

    return result.quality ? (TS_audio.test(result.title) ? result.quality + '/TS' : result.quality) : null;
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

  function setCache(key, quality) {
    var cache = Lampa.Storage.get(CONFIG.CACHE_KEY) || {};
    cache[key] = { quality: quality, ts: Date.now() };
    Lampa.Storage.set(CONFIG.CACHE_KEY, cache);
  }

  function getCache(key) {
    var cache = Lampa.Storage.get(CONFIG.CACHE_KEY) || {};
    var item = cache[key];
    if (item && Date.now() - item.ts < CONFIG.CACHE_TTL_MS) {
      return item.quality;
    }
    return null;
  }

  function cleanCache() {
    var cache = Lampa.Storage.get(CONFIG.CACHE_KEY) || {};
    var now = Date.now();
    var cleaned = {};

    Object.keys(cache).forEach(key => {
      if (now - cache[key].ts < CONFIG.CACHE_TTL_MS) {
        cleaned[key] = cache[key];
      }
    });

    Lampa.Storage.set(CONFIG.CACHE_KEY, cleaned);
  }

  function renderQualityBadge(cardElement, quality) {
    const cardView = cardElement.querySelector('.card__view');
    if (!cardView) return;

    const oldBadge = cardView.querySelector('.card__quality');
    if (oldBadge) oldBadge.remove();

    const badge = document.createElement('div');
    badge.className = 'card__quality';
    badge.innerText = quality;
    cardView.appendChild(badge);
  }

  function processCards() {
    document.querySelectorAll('.card:not([data-quality-processed])').forEach(cardElement => {
      const cardData = cardElement.card_data;
      if (!cardData) return;

      cardElement.setAttribute('data-quality-processed', 'true');

      const title = cardData.title || cardData.name;
      const year = (cardData.release_date || cardData.first_air_date || '').substring(0, 4);
      if (!title || !year) return;

      const cacheKey = `${cardData.id}_${year}`;
      const cached = getCache(cacheKey);

      if (cached) {
        renderQualityBadge(cardElement, cached);
      } else {
        fetchQuality(title, year, quality => {
          if (quality) {
            setCache(cacheKey, quality);
            renderQualityBadge(cardElement, quality);
          }
        });
      }
    });
  }

  Lampa.Listener.follow('activity', function (e) {
    if (e.type == 'start' || e.type == 'page') {
      setTimeout(processCards, 100);
    }
  });

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1 && node.classList && node.classList.contains('card')) {
          node.addEventListener('visible', function () {
            if (!node.hasAttribute('data-quality-processed')) {
              processCards();
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  cleanCache();

  if (window.appready) { processCards(); }
  else {
    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready") { processCards(); }
    });
  }
})();
