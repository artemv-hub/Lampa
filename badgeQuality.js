(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.6.6',
    name: 'Quality Badge',
    component: 'quality_badge'
  };

  Lampa.Manifest.plugins = manifest;

  const CONFIG = {
    CACHE_KEY: 'lampa_quality_cache',
    CACHE_TTL_MS: 24 * 60 * 60 * 1000,
    JACRED_URL: 'https://redapi.cfhttp.top/api/v1.0/torrents'
  };

  function getDate(title, year, callback) {
    const network = new Lampa.Reguest();
    network.timeout(5000);
    network.silent(
      CONFIG.JACRED_URL + '?search=' + encodeURIComponent(title) + '&year=' + year + '&exact=true&uid=' + Lampa.Storage.get('lampac_unic_id', ''),
      torrents => callback(!torrents?.length ? null : findBestQuality(torrents, year)),
      () => callback(null)
    );
  }

  function parseQuality(title) {
    const QUALITY_PATTERNS = [
      { priority: 98, quality: '2160', pattern: /2160p|\buhd\b|\b4k\b/i },
      { priority: 90, quality: '1080', pattern: /1080p|\bfhd\b/i },
      { priority: 88, quality: '1080i', pattern: /1080i/i },
      { priority: 80, quality: '720', pattern: /720p|\bhd\b/i },
      { priority: 70, quality: '480', pattern: /480p|\bsd\b/i },
      { priority: 58, quality: 'BDRemux', pattern: /blu-?ray remux|bd-?remux/i },
      { priority: 60, quality: 'Blu-Ray', pattern: /blu-?ray|\bbd\b/i },
      { priority: 56, quality: 'BDRip', pattern: /bd-?rip/i },
      { priority: 54, quality: 'HDRip', pattern: /hd-?rip/i },
      { priority: 52, quality: 'DVDRip', pattern: /dvd-?rip/i },
      { priority: 50, quality: 'WEB-DL', pattern: /web-?dl|webdl-?rip|web-?rip/i },
      { priority: 38, quality: 'VHSRip', pattern: /vhs-?rip/i },
      { priority: 36, quality: 'CAMRip', pattern: /cam-?rip/i },
      { priority: 40, quality: 'TV', pattern: /hdtv|iptv|sat|dvb|\btv\b|tvrip/i },
      { priority: 30, quality: 'TC', pattern: /telecine|\btc\b/i },
      { priority: 20, quality: 'TS', pattern: /telesync|\bts\b/i }
    ];
    for (const { priority, quality, pattern } of QUALITY_PATTERNS) {
      if (pattern.test(title)) return { quality, priority };
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
      const parsed = parseQuality(title);
      if (!parsed || (yearMatch && Math.abs(parseInt(yearMatch[0]) - targetYear) > 1)) return best;
      const priority = TS_audio.test(title) ? 22 : parsed.priority;
      return priority > best.priority ? { priority, quality: parsed.quality, title } : best;
    }, { priority: -1, quality: null, title: '' });

    return result.quality ? (TS_audio.test(result.title) ? result.quality + '/TS' : result.quality) : null;
  }

  function setCache(key, quality) {
    const cache = Lampa.Storage.cache(CONFIG.CACHE_KEY, 400, {});
    cache[key] = { quality, ts: Date.now() };
    Lampa.Storage.set(CONFIG.CACHE_KEY, cache);
  }
  function getCache(key) {
    const cache = Lampa.Storage.cache(CONFIG.CACHE_KEY, 400, {});
    const item = cache[key];
    return (item && Date.now() - item.ts < CONFIG.CACHE_TTL_MS) ? item.quality : null;
  }

  function renderQualityBadge(cardElement, quality) {
    let badge = cardElement.querySelector('.card__view .card__quality');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'card__quality';
      cardElement.querySelector('.card__view').appendChild(badge);
    }
    badge.innerText = quality;
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
      cached ? renderQualityBadge(cardElement, cached) : getDate(title, year, quality => {
        quality && (setCache(cacheKey, quality), renderQualityBadge(cardElement, quality));
      });
    });
  }

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

  if (window.appready) { processCards(); }
  else {
    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready") { processCards(); }
    });
  }
})();
