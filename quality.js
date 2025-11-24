(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.1.3',
    name: 'Quality Badge',
    component: 'quality_badge'
  };

  Lampa.Manifest.plugins = manifest;

  var CONFIG = {
    CACHE_KEY: 'lampa_quality_cache',
    CACHE_TTL_MS: 24 * 60 * 60 * 1000,
    JACRED_URL: 'https://jacred.xyz/api/v1.0/torrents',
    TIMEOUT_MS: 5000
  };

  var QUALITY_PRIORITY = {
    '2160p': 100,
    '1080p': 90,
    '1080i': 88,
    '720p': 80,
    '480p': 70,
    'Blu-Ray': 60,
    'BDRemux': 58,
    'BDRip': 56,
    'HDRip': 54,
    'DVDRip': 52,
    'WEB-DL': 50,
    'WEBRip': 48,
    'VHSRip': 40,
    'CAMRip': 30,
    'TV': 20,
    'TC': 10,
    'TS': 8
  };

  function fetchQuality(title, year, callback) {
    var userId = Lampa.Storage.get('lampac_unic_id', '');
    var url = CONFIG.JACRED_URL + '?search=' + encodeURIComponent(title) + '&year=' + year + '&exact=true&uid=' + userId;

    var network = new Lampa.Reguest();
    network.timeout(CONFIG.TIMEOUT_MS);

    network.silent(url, function (torrents) {
      if (!torrents || !torrents.length) return callback(null);
      var best = findBestQuality(torrents, year);
      callback(best);
    }, function () {
      callback(null);
    });
  }

  function findBestQuality(torrents, targetYear) {
    const result = torrents.reduce((best, t) => {
      const title = (t.title || '').toLowerCase();

      const yearMatch = title.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const torrentYear = parseInt(yearMatch[0]);
        if (Math.abs(torrentYear - targetYear) > 1) return best;
      }

      const quality = parseQuality(title);
      if (!quality) return best;

      const priority = QUALITY_PRIORITY[quality] || 0;
      if (priority > best.priority) {
        return { priority, quality, title };
      }
      return best;
    }, { priority: -1, quality: null, title: '' });

    if (!result.quality) return null;

    let displayQuality = result.quality;
    const hasTSAudio = /звук с ts|audio ts/i.test(result.title);
    if (hasTSAudio) {
      displayQuality = displayQuality + '/TS)';
    }
    return displayQuality;
  }

  function parseQuality(title) {
    if (/2160p|\b4k\b/i.test(title)) return '2160p';
    if (/1080p|\bfhd\b/i.test(title)) return '1080p';
    if (/1080i/i.test(title)) return '1080i';
    if (/720p|\bhd\b/i.test(title)) return '720p';
    if (/480p|\bsd\b/i.test(title)) return '480p';

    if (/blu-?ray|\bbd\b/i.test(title)) return 'Blu-Ray';
    if (/blu-?ray remux|bd-?remux/i.test(title)) return 'BDRemux';
    if (/bd-?rip/i.test(title)) return 'BDRip';
    if (/hd-?rip/i.test(title)) return 'HDRip';
    if (/dvd-?rip/i.test(title)) return 'DVDRip';
    if (/web-?dl/i.test(title)) return 'WEB-DL';
    if (/web-?rip|webdl-?rip/i.test(title)) return 'WEBRip';
    if (/vhs-?rip/i.test(title)) return 'VHSRip';
    if (/cam-?rip/i.test(title)) return 'CAMRip';
    if (/hdtv|iptv|sat|dvb|\btv\b|tvrip/i.test(title)) return 'TV';
    if (/telecine|\btc\b/i.test(title)) return 'TC';
    if (/telesync|\bts\b/i.test(title)) return 'TS';

    return null;
  }

  function getCache(key) {
    var cache = Lampa.Storage.get(CONFIG.CACHE_KEY) || {};
    var item = cache[key];
    if (item && Date.now() - item.ts < CONFIG.CACHE_TTL_MS) {
      return item.quality;
    }
    return null;
  }

  function setCache(key, quality) {
    var cache = Lampa.Storage.get(CONFIG.CACHE_KEY) || {};
    cache[key] = { quality: quality, ts: Date.now() };
    Lampa.Storage.set(CONFIG.CACHE_KEY, cache);
  }

  function renderQualityBadge(cardElement, quality) {
    const cardView = cardElement.querySelector('.card__view');
    if (!cardView) return;

    const oldBadge = cardView.querySelector('.card__quality');
    if (oldBadge) oldBadge.remove();

    const badge = document.createElement('div');
    badge.className = 'card__quality';

    const inner = document.createElement('div');
    inner.innerText = quality;
    badge.appendChild(inner);
    cardView.appendChild(badge);
  }

  function processCards() {
    const cards = document.querySelectorAll('.card:not([data-quality-processed])');
    cards.forEach(cardElement => {
      cardElement.setAttribute('data-quality-processed', 'true');
      const cardData = cardElement.card_data;
      if (!cardData) return;

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
      setTimeout(processCards, 50);
    }
  });

  var observer = new MutationObserver(function (mutations) {
    var shouldProcess = false;

    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1 && node.classList && node.classList.contains('card')) {
          shouldProcess = true;
        }
      });
    });
    if (shouldProcess) {
      processCards();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processCards);
  } else {
    processCards();
  }
})();
