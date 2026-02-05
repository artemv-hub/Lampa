(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.11.3',
    name: 'Badge Quality',
    component: 'badge_quality'
  };

  Lampa.Manifest.plugins = manifest;

  const CONFIG = {
    CACHE_KEY: 'badge_quality_cache',
    CACHE_TTL_MS: 24 * 60 * 60 * 1000
  };

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

  function getDate(title, year, callback) {
    const cached = getCache(`${title}_${year}`);
    if (cached) return callback(cached);

    const network = new Lampa.Reguest();
    network.timeout(5000);
    network.silent('http://' + 'jac-red.ru' + '/api/v2.0/indexers/all/results' + '?title=' + encodeURIComponent(title) + '&year=' + year,
      response => {
        const torrents = response.Results || [];
        callback(!torrents.length ? null : findBestQuality(torrents, year));
      },
      () => callback(null)
    );
  }

  function parseQuality(title) {
    const QUALITY_PATTERNS = [
      { priority: 98, quality: '2160', pattern: /2160p|\buhd\b|\b4k\b/i },
      { priority: 88, quality: '1080', pattern: /1080p|\bfhd\b/i },
      { priority: 86, quality: '1080i', pattern: /1080i/i },
      { priority: 78, quality: '720', pattern: /720p|\bhd\b/i },
      { priority: 76, quality: '480', pattern: /480p|\bsd\b/i },
      { priority: 68, quality: 'BDRemux', pattern: /blu-?ray remux|bd-?remux/i },
      { priority: 66, quality: 'Blu-Ray', pattern: /blu-?ray|\bbd\b/i },
      { priority: 58, quality: 'BDRip', pattern: /bd-?rip/i },
      { priority: 56, quality: 'HDRip', pattern: /hd-?rip/i },
      { priority: 54, quality: 'DVDRip', pattern: /dvd-?rip/i },
      { priority: 52, quality: 'WEB-DL', pattern: /web-?dl|webdl-?rip|web-?rip/i },
      { priority: 48, quality: 'VHSRip', pattern: /vhs-?rip/i },
      { priority: 46, quality: 'CAMRip', pattern: /cam-?rip/i },
      { priority: 38, quality: 'TV', pattern: /hdtv|iptv|sat|dvb|\btv\b|tvrip/i },
      { priority: 36, quality: 'TC', pattern: /telecine|\btc\b/i },
      { priority: 28, quality: 'TS', pattern: /telesync|\bts\b/i }
    ];
    for (const { priority, quality, pattern } of QUALITY_PATTERNS) {
      if (pattern.test(title)) return { quality, priority };
    }
    return null;
  }

  function findBestQuality(torrents, targetYear) {
    const TS_audio = /звук с ts|audio ts/i;
    const trailer = /трейлер|trailer/i;
    if (torrents.every(t => trailer.test(t.Title || ''))) return null;

    const result = torrents.reduce((best, t) => {
      const title = (t.Title || '').toLowerCase();
      const yearMatch = title.match(/\b(19|20)\d{2}\b/);
      const parsed = parseQuality(title);
      if (!parsed || (yearMatch && Math.abs(parseInt(yearMatch[0]) - targetYear) > 1)) return best;
      const priority = TS_audio.test(title) ? 30 : parsed.priority;
      return priority > best.priority ? { priority, quality: parsed.quality, title } : best;
    }, { priority: -1, quality: null, title: '' });

    return result.quality ? (TS_audio.test(result.title) ? result.quality + '/TS' : result.quality) : null;
  }

  function renderQualityBadge(card, quality) {
    let badge = card.querySelector('.card__view .card__quality');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'card__quality';
      card.querySelector('.card__view').appendChild(badge);
    }
    badge.innerText = quality;
  }

  function processCards() {
    Array.from(document.querySelectorAll('.card')).forEach(card => {
      const cardData = card.card_data;
      if (!cardData) return;

      const title = cardData.title || cardData.name;
      const year = (cardData.release_date || cardData.first_air_date || '').substring(0, 4);
      if (!title || !year) return;

      getDate(title, year, quality => {
        if (quality) {
          setCache(`${title}_${year}`, quality);
          renderQualityBadge(card, quality);
        }
      });
    });
  }

  Lampa.Listener.follow('activity', (e) => {
    if (e.type === 'start') {
      setTimeout(processCards, 100);
    }
  });

  var observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList?.contains('card')) {
          processCards();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (window.appready) { processCards(); }
  else {
    Lampa.Listener.follow("app", (e) => {
      if (e.type === "ready") { processCards(); }
    });
  }
})();
