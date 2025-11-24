(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.0.5',
    name: 'Quality Badge',
    component: 'quality_badge'
  };

  Lampa.Manifest.plugins = manifest;

  var CONFIG = {
    CACHE_KEY: 'lampa_quality_cache',
    CACHE_TTL_MS: 3 * 24 * 60 * 60 * 1000,
    JACRED_URL: 'https://jacred.xyz/api/v1.0/torrents',
    TIMEOUT_MS: 5000
  };

  var QUALITY_PRIORITY = {
    '2160p': 100,
    '1080p': 90,
    '1080i': 85,
    '720p': 80,
    '480p': 70,
    'Blu-Ray': 95,
    'BDRemux': 92,
    'BDRip': 88,
    'HDRip': 78,
    'DVDRip': 68,
    'WEB-DL': 83,
    'WEBRip': 81,
    'VHSRip': 40,
    'CAMRip': 30,
    'HDTV': 65,
    'IPTV': 60,
    'TV': 55,
    'TC': 35,
    'TS': 32
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
    var best = null;
    var bestPriority = -1;

    for (var i = 0; i < torrents.length; i++) {
      var t = torrents[i];
      var title = (t.title || '').toLowerCase();

      var yearMatch = title.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        var torrentYear = parseInt(yearMatch[0]);
        if (Math.abs(torrentYear - targetYear) > 1) continue;
      }

      var quality = parseQuality(title);
      if (!quality) continue;

      var priority = QUALITY_PRIORITY[quality] || 0;

      if (priority > bestPriority) {
        bestPriority = priority;
        best = quality;
      }
    }

    return best;
  }

  function parseQuality(title) {
    var video = null;
    var audio = null;

    if (/2160p/i.test(title)) video = '2160p';
    else if (/1080p/i.test(title)) video = '1080p';
    else if (/1080i/i.test(title)) video = '1080i';
    else if (/720p/i.test(title)) video = '720p';
    else if (/480p/i.test(title)) video = '480p';

    if (/звук с ts|аудио ts|audio ts/i.test(title)) audio = 'TS audio';

    if (video && audio) return video + ' / ' + audio;
    if (video) return video;

    if (/blu-?ray/i.test(title)) return 'Blu-Ray';
    if (/blu-?ray remux|bd-?remux/i.test(title)) return 'BDRemux';
    if (/bdrip|bd-?rip/i.test(title)) return 'BDRip';
    if (/web-?dl/i.test(title)) return 'WEB-DL';
    if (/webrip|web-?rip/i.test(title)) return 'WEBRip';
    if (/hdrip|hd-?rip/i.test(title)) return 'HDRip';
    if (/dvdrip|dvd-?rip/i.test(title)) return 'DVDRip';
    if (/hdtv/i.test(title)) return 'HDTV';
    if (/iptv/i.test(title)) return 'IPTV';
    if (/\btv\b|tvrip/i.test(title)) return 'TV';
    if (/vhsrip|vhs-?rip/i.test(title)) return 'VHSRip';
    if (/camrip|cam-?rip/i.test(title)) return 'CAMRip';
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
    var cardView = cardElement.querySelector('.card__view');
    if (!cardView) return;

    var old = cardView.querySelector('.card__quality');
    if (old) old.remove();

    var badge = document.createElement('div');
    badge.className = 'card__quality';
    var inner = document.createElement('div');
    inner.innerText = quality;
    badge.appendChild(inner);
    cardView.appendChild(badge);
  }

  function processCards() {
    var cards = document.querySelectorAll('.card');

    cards.forEach(function (cardElement) {
      if (cardElement.hasAttribute('data-quality-processed')) return;
      cardElement.setAttribute('data-quality-processed', 'true');

      var cardData = cardElement.card_data;

      if (!cardData) return;

      var title = cardData.title || cardData.name;
      var year = (cardData.release_date || cardData.first_air_date || '').substring(0, 4);

      if (!title || !year) return;

      var cacheKey = cardData.id + '_' + year;
      var cached = getCache(cacheKey);

      if (cached) {
        renderQualityBadge(cardElement, cached);
      } else {
        fetchQuality(title, year, function (quality) {
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
