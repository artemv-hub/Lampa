(function () {
  'use strict';

  // MANIFEST
  let manifest = {
    type: 'interface',
    version: '5.0.6',
    name: 'UI Badge',
    component: 'ui_badge'
  };
  Lampa.Manifest.plugins = manifest;

  // STYLES
  const style = document.createElement('style');
  const styleBadge = `
    position: absolute;
    font-size: 1.2em;
    font-weight: 800;
    padding: 0.2em 0.4em;
    color: #000;
    background: rgba(255, 255, 255, 0.8);
    line-height: 1;
    white-space: nowrap;
  `;
  style.textContent = `
    .card__type           { ${styleBadge} top: 0em; left: 0em; border-radius: 0.8em 0 0.8em 0; }
    .card__vote           { ${styleBadge} top: 0em; bottom: unset; right: 0em; border-radius: 0 0.8em 0 0.8em; }
    .card__age            { ${styleBadge} bottom: 0em; left: 0em; border-radius: 0 0.8em 0 0.8em; }
    .card__status         { ${styleBadge} bottom: 0em; right: 0em; border-radius: 0.8em 0 0.8em 0; }
    .card__duration       { ${styleBadge} bottom: 0em; right: 0em; border-radius: 0.8em 0 0.8em 0; }
    .card__quality        { ${styleBadge} bottom: 2em; left: 0em; right: unset; border-radius: 0 0.8em 0.8em 0; }
    .card__watched        { ${styleBadge} bottom: 2em; right: 0em; border-radius: 0.8em 0 0 0.8em; }
    .card__icons          { left: 0em; right: unset; top: 50%; transform: translateY(-50%); }
    .card__icons-inner    { flex-direction: column; }
    .card__marker         { top: 2em; bottom: unset; left: 50%; transform: translateX(-50%); }

    [data-level="vgood"]  { background: rgba(52, 152, 219, 0.8) !important; }
    [data-level="good"]   { background: rgba(46, 204, 113, 0.8) !important; }
    [data-level="normal"] { background: rgba(241, 196, 15, 0.8) !important; }
    [data-level="bad"]    { background: rgba(230, 126, 34, 0.8) !important; }
    [data-level="vbad"]   { background: rgba(231, 76, 60, 0.8) !important; }
  `;
  document.head.appendChild(style);

  // MAPS
  const mapQuality = {
    '4K': 'vgood',
    'FHD': 'good',
    'HD': 'normal',
    'SD': 'bad',
    'TS': 'vbad'
  };
  const mapStatusKey = {
    'Ended': 'ended',
    'Canceled': 'canceled',
    'Returning Series': 'ongoing',
    'Released': 'released',
    'Post Production': 'post'
  };
  const mapStatus = {
    ended: 'vgood',
    ongoing: 'good',
    canceled: 'normal',
    released: 'good',
    post: 'normal'
  };
  const mapVote = [
    { level: 'vgood', min: 9 },
    { level: 'good', min: 7 },
    { level: 'normal', min: 6 },
    { level: 'bad', min: 4 },
    { level: 'vbad', min: 0 }
  ];
  const mapPG = [
    { level: 'vbad', min: 18 },
    { level: 'bad', min: 16 },
    { level: 'normal', min: 12 },
    { level: 'good', min: 6 },
    { level: 'vgood', min: 0 }
  ];

  // CACHE
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const CACHE_EMPTY_TTL = 6 * 60 * 60 * 1000;
  const CACHE_FAIL_TTL = 60 * 1000;
  const TMDB_CACHE_TV = 'badgeCache_tv';
  const TMDB_CACHE_MOVIE = 'badgeCache_movie';
  const QUALITY_CACHE = 'badgeCache_quality';

  const cacheData = {};
  const cacheTimers = {};

  function cacheGetStore(name) {
    if (cacheData[name]) return cacheData[name];
    let stored = null;
    try { stored = Lampa.Storage.get(name, null); } catch (_) { }
    if (!stored || typeof stored !== 'object') stored = {};
    const now = Date.now();
    let changed = false;
    for (const key in stored) {
      const entry = stored[key];
      if (!entry || !entry.timestamp) { delete stored[key]; changed = true; continue; }
      const ttl = entry.failed ? CACHE_FAIL_TTL : (entry.empty ? CACHE_EMPTY_TTL : CACHE_TTL);
      if (now - entry.timestamp > ttl) { delete stored[key]; changed = true; }
    }
    cacheData[name] = stored;
    if (changed) cacheSaveStore(name);
    return cacheData[name];
  }
  function cacheSaveStore(name) {
    if (cacheTimers[name]) return;
    cacheTimers[name] = setTimeout(() => {
      cacheTimers[name] = 0;
      try { Lampa.Storage.set(name, cacheData[name]); } catch (_) { }
    }, 800);
  }
  function cacheGet(name, id) { return cacheGetStore(name)[id] || null; }
  function cacheSet(name, id, value) {
    value.timestamp = Date.now();
    cacheGetStore(name)[id] = value;
    cacheSaveStore(name);
    return value;
  }

  // TMDB
  function tmdbGet(type, id, cacheKey, callback) {
    const idKey = String(id);
    const cached = cacheGet(cacheKey, idKey);
    if (cached) { callback(cached); return; }

    let url = '';
    try {
      if (Lampa.TMDB && Lampa.TMDB.api && Lampa.TMDB.key) url = Lampa.TMDB.api(type + '/' + id + '?api_key=' + Lampa.TMDB.key());
    } catch (_) { }
    if (!url) { callback(null); return; }

    const network = new Lampa.Reguest();
    network.timeout(7000);
    network.silent(url,
      (data) => {
        try { network.clear(); } catch (_) { }
        if (!data || typeof data !== 'object') { callback(null); return; }
        callback(cacheSet(cacheKey, idKey, data));
      },
      () => {
        try { network.clear(); } catch (_) { }
        callback(cacheSet(cacheKey, idKey, { failed: true }));
      },
      false
    );
  }

  // QUALITY
  const QUALITY_API_URL = 'jr.maxvol.pro';
  const qualityBadTerms = ['camrip', 'ts', 'telesync', 'telesynch', 'telecine', 'tc', 'upscale'];
  const qualityBadRegexps = qualityBadTerms.map(t => new RegExp('\\b' + t + '\\b', 'i'));

  function qualityMakeVideo(data) {
    return {
      id: data.id,
      type: data.original_name || data.first_air_date ? 'tv' : 'movie',
      title: data.title || data.name || '',
      original_title: data.original_title || data.original_name || '',
      release_date: data.release_date || data.first_air_date || ''
    };
  }
  function qualityIsBad(title) {
    return title ? qualityBadRegexps.some(p => p.test(title.toLowerCase())) : false;
  }
  function qualityConvert(res) {
    if (res === 2160) return '4K';
    if (res === 1080) return 'FHD';
    if (res === 720) return 'HD';
    if (res === 'TS') return 'TS';
    return res >= 720 ? 'HD' : 'SD';
  }
  function qualityFetch(video, callback) {
    const HIGHEST = 2160;
    let found = false;
    const year = (video.release_date || '').substring(0, 4);
    if (!year || isNaN(year)) { callback(null); return; }

    const uid = Lampa.Storage.get('lampac_unic_id', '');
    let url = 'https://' + QUALITY_API_URL + '/api/v2.0/indexers/all/results?apikey=&uid=' + uid + '&year=' + year;
    let hasTitle = false;
    if (video.title && /[a-zа-яё0-9]/i.test(video.title)) { url += '&title=' + encodeURIComponent(video.title.trim()); hasTitle = true; }
    if (video.original_title && /[a-zа-яё]/i.test(video.original_title)) { url += '&title_original=' + encodeURIComponent(video.original_title.trim()); hasTitle = true; }
    if (!hasTitle) { callback(null); return; }

    const network = new Lampa.Reguest();
    network.timeout(15000);
    network.silent(url,
      (resp) => {
        try { network.clear(); } catch (_) { }
        if (!resp) { callback(null); return; }
        try {
          const data = typeof resp === 'string' ? JSON.parse(resp) : resp;
          const list = data.Results || [];
          if (!Array.isArray(list) || !list.length) { callback(null); return; }
          let bestRes = -1;
          const ty = parseInt(year, 10);
          const py = ty - 1;
          for (let i = 0; i < list.length; i++) {
            const r = list[i];
            const info = r.info || r.Info || {};
            const res = info.quality;
            const yearVal = info.relased;
            const title = r.Title || '';
            if (typeof res !== 'number' || !res) continue;
            const y = parseInt(yearVal, 10);
            if (isNaN(y) || y < 1900) continue;
            if (y !== ty && y !== py) continue;
            if (qualityIsBad(title)) { found = true; continue; }
            if (res === HIGHEST) { callback('4K'); return; }
            if (res > bestRes) bestRes = res;
          }
          if (bestRes > 0) callback(qualityConvert(bestRes));
          else if (found) callback('TS');
          else callback(null);
        } catch (_) { callback(null); }
      },
      () => {
        try { network.clear(); } catch (_) { }
        callback(null);
      }
    );
  }
  function qualityGet(card, callback) {
    const data = card.card_data;
    if (!data || !data.id) { callback(null); return; }
    const video = qualityMakeVideo(data);
    const key = video.type + ':' + video.id;
    const cached = cacheGet(QUALITY_CACHE, key);
    if (cached) { callback(cached.quality); return; }
    qualityFetch(video, (quality) => {
      cacheSet(QUALITY_CACHE, key, { quality: quality || null, empty: !quality });
      callback(quality);
    });
  }

  // RENDER
  function renderEpisode(season, episode) {
    return `S${season}:E${episode}`;
  }
  function renderLevel(map, value) {
    const rule = map.find(r => value >= r.min);
    return rule ? rule.level : null;
  }
  function renderBadge(card, cls, text, level) {
    const view = card.querySelector('.card__view');
    if (!view) return;
    let el = view.querySelector('.' + cls);
    if (!text) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.className = cls; view.appendChild(el); }
    if (el.innerText !== text) el.innerText = text;
    if (level) el.setAttribute('data-level', level);
    else el.removeAttribute('data-level');
  }
  function renderVote(el) {
    const value = parseFloat(el.textContent);
    if (isNaN(value)) return;
    const level = renderLevel(mapVote, value);
    if (level) el.setAttribute('data-level', level);
  }
  function renderPG(el) {
    const m = (el.textContent.match(/\d+/) || [])[0];
    const value = parseInt(m, 10);
    if (isNaN(value)) return;
    const level = renderLevel(mapPG, value);
    if (level) el.setAttribute('data-level', level);
  }
  function renderAge(card) {
    const age = card.querySelector('.card__age');
    const view = card.querySelector('.card__view');
    if (age && view && age.parentNode !== view) view.appendChild(age);
  }
  function renderType(card, isTV) {
    renderBadge(card, 'card__type', isTV ? 'Сериал' : 'Фильм', isTV ? 'vgood' : 'good');
  }
  function renderQuality(card, quality) {
    renderBadge(card, 'card__quality', quality, quality ? mapQuality[quality] : null);
  }
  function renderDuration(card, info) {
    const data = card.card_data;
    if (!data) return;

    let progress = null;
    let total = null;
    if (data.original_title) {
      const t = Lampa.Timeline.view(Lampa.Utils.hash(data.original_title));
      if (t && t.time > 0 && t.duration > 0) {
        progress = Lampa.Utils.secondsToTime(t.time, true);
        total = Lampa.Utils.secondsToTime(t.duration, true);
      }
    }
    if (!total) {
      const runtime = info && info.runtime;
      if (!runtime) { renderBadge(card, 'card__duration', null); return; }
      total = Lampa.Utils.secondsToTime(runtime * 60, true);
    }

    const key = info && info.status ? mapStatusKey[info.status] : null;
    const level = key ? mapStatus[key] : 'good';

    renderBadge(card, 'card__duration', progress ? progress + '/' + total : total, level);
  }
  function renderWatched(card, info) {
    const data = card.card_data;
    if (!data || !data.original_name) return;

    const last = info && info.last_episode_to_air;
    if (!last) { renderBadge(card, 'card__watched', null); return; }

    const name = data.original_name;
    const seasonMap = {};
    (info.seasons || []).forEach(s => { if (s.season_number > 0) seasonMap[s.season_number] = s.episode_count; });

    for (let season = last.season_number; season >= 1; season--) {
      const maxEp = season === last.season_number ? last.episode_number : (seasonMap[season] || 0);
      for (let episode = maxEp; episode >= 1; episode--) {
        const hash = Lampa.Utils.hash([season, season > 10 ? ':' : '', episode, name].join(''));
        const t = Lampa.Timeline.view(hash);
        if (t.time > 0 || t.percent > 0) {
          renderBadge(card, 'card__watched', renderEpisode(season, episode), 'good');
          return;
        }
      }
    }
    renderBadge(card, 'card__watched', null);
  }
  function renderStatus(card, info) {
    const last = info && info.last_episode_to_air;
    if (!last || !last.season_number || !last.episode_number) {
      renderBadge(card, 'card__status', null);
      return;
    }
    const key = info.status ? mapStatusKey[info.status] : null;
    const level = key ? mapStatus[key] : null;
    renderBadge(card, 'card__status', renderEpisode(last.season_number, last.episode_number), level);
  }
  function renderStatusFull(movie, render) {
    if (!render || !movie) return;
    const key = mapStatusKey[movie.status];
    if (!key) return;
    const el = $(render).find('.full-start__status').first();
    if (el.length) el.attr('data-level', mapStatus[key]);
  }

  // PROCESS
  function processCard(card) {
    if (!card || !card.card_data) return;
    const data = card.card_data;
    if (!data.id || (!data.original_name && !data.original_title)) return;

    const isTV = !!data.original_name;

    renderType(card, isTV);
    renderAge(card);

    const vote = card.querySelector('.card__vote');
    if (vote) renderVote(vote);

    if (isTV) {
      tmdbGet('tv', data.id, TMDB_CACHE_TV, (info) => {
        if (!card.parentNode) return;
        renderStatus(card, info);
        renderWatched(card, info);
      });
    } else {
      tmdbGet('movie', data.id, TMDB_CACHE_MOVIE, (info) => {
        if (!card.parentNode) return;
        renderDuration(card, info);
      });
    }
    qualityGet(card, (quality) => {
      if (!card.parentNode) return;
      renderQuality(card, quality);
    });
  }
  function processSetupListener() {
    if (window.__ui_badge_card_patched__) return;
    window.__ui_badge_card_patched__ = true;

    try {
      if (Lampa.Maker && Lampa.Maker.map) {
        const CardMaker = Lampa.Maker.map('Card');
        if (CardMaker && CardMaker.Card && !CardMaker.Card.__ui_badge_patched__) {
          const originalOnVisible = CardMaker.Card.onVisible;
          CardMaker.Card.onVisible = function () {
            if (originalOnVisible) originalOnVisible.apply(this, arguments);
            const card = this.html || this.card;
            let data = card && card.card_data;
            if (!data && this.card && this.card.card_data) data = this.card.card_data;
            if (!data && this.card_data) data = this.card_data;
            if (card && data && data.id) { scanObserveCard(card); processCard(card); }
          };
          CardMaker.Card.__ui_badge_patched__ = true;
        }
      }
    } catch (_) { }
  }

  // SCAN
  const SCAN_LIMIT = 80;
  const SCAN_MARGIN = 200;

  const scanTimers = {};
  function scanLater(fn, delay, key) {
    const id = key || ('t' + Date.now() + Math.random());
    if (scanTimers[id]) clearTimeout(scanTimers[id]);
    scanTimers[id] = setTimeout(() => {
      delete scanTimers[id];
      try { fn(); } catch (_) { }
    }, delay || 0);
    return id;
  }

  let scanObserver = null;
  function scanObserveCard(card) {
    if (!scanObserver || !card || card.nodeType !== 1) return;
    if (card.getAttribute('data-observed') === '1') return;
    card.setAttribute('data-observed', '1');
    try { scanObserver.observe(card); } catch (_) { }
  }
  function scanIsBlocked() {
    if (document.hidden) return true;
    const selectors = ['.modal', '.settings-input__content', '.selectbox__content', '.menu-edit-list'];
    for (let i = 0; i < selectors.length; i++) {
      const node = document.querySelector(selectors[i]);
      if (node && node.offsetParent !== null) return true;
    }
    return false;
  }
  function scanIsNearViewport(card, windowHeight) {
    const rect = card.getBoundingClientRect();
    return !(rect.bottom < -SCAN_MARGIN || rect.top > windowHeight + SCAN_MARGIN);
  }
  function scanContainer(target) {
    if (!target || !target.querySelectorAll) return;
    if (scanIsBlocked()) return;

    const cards = target.querySelectorAll('.card:not([data-observed])');
    const wH = window.innerHeight || 1000;
    let updated = 0;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      scanObserveCard(card);

      if (updated >= SCAN_LIMIT) break;
      if (!card.card_data || !card.card_data.id) continue;
      if (!scanIsNearViewport(card, wH)) continue;

      const idStr = String(card.card_data.id);
      if (card.getAttribute('data-pulled') !== idStr) {
        card.setAttribute('data-pulled', idStr);
        Lampa.Storage.set('activity', { movie: card.card_data, card: card.card_data });
        Lampa.Listener.send('lampac', { type: 'timecode_pullFromServer' });
      }

      processCard(card);
      updated++;
    }
  }
  function scan() {
    let render = null;
    try {
      const a = Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
      render = a && a.activity && a.activity.render ? a.activity.render() : null;
      if (render && render.nodeType !== 1 && render.length) render = render[0];
    } catch (_) { }
    scanContainer(render && render.nodeType === 1 ? render : document.body);
  }

  // INIT
  function appInit() {
    if (window.__ui_badge_initialized__) return;
    window.__ui_badge_initialized__ = true;

    if (typeof IntersectionObserver !== 'undefined') {
      scanObserver = new IntersectionObserver((entries) => {
        for (let i = 0; i < entries.length; i++) {
          const card = entries[i].target;
          if (card && entries[i].isIntersecting && card.card_data && card.card_data.id) processCard(card);
        }
      }, { root: null, rootMargin: '250px 0px 250px 0px', threshold: 0.01 });
    }

    processSetupListener();

    Lampa.Listener.follow('activity', (e) => {
      if (e.type === 'destroy' || e.type === 'archive') return;
      scanLater(scan, 0, 'scan-0');
      scanLater(scan, 150, 'scan-150');
      scanLater(scan, 400, 'scan-400');
      scanLater(scan, 900, 'scan-900');
    });
    Lampa.Listener.follow('line', (e) => {
      if (!e || (e.type !== 'append' && e.type !== 'create' && e.type !== 'visible')) return;
      let body = null;
      if (e.body) {
        if (e.body.nodeType === 1) body = e.body;
        else if (e.body.length && e.body[0] && e.body[0].nodeType === 1) body = e.body[0];
      }
      scanLater(() => body ? scanContainer(body) : scan(), 30, 'scan-line');
    });
    Lampa.Listener.follow('card', (event) => {
      if (event.type === 'build' && event.object && event.object.card) {
        scanObserveCard(event.object.card);
        processCard(event.object.card);
      }
    });
    Lampa.Listener.follow('full', (event) => {
      if (event.type === 'complite' && event.data && event.data.movie) {
        const r = event.object && event.object.activity && event.object.activity.render
          ? event.object.activity.render() : null;
        if (!r) return;
        renderStatusFull(event.data.movie, r);
        $(r).find('.full-start__pg').each(function () { renderPG(this); });
        $(r).find('.full-start__rate').each(function () { renderVote(this); });
      }
    });

    document.addEventListener('visibilitychange', () => { if (!document.hidden) scanLater(scan, 0, 'scan-visible'); });

    scanLater(scan, 200, 'boot-200');
    scanLater(scan, 600, 'boot-600');
  }

  if (window.appready) appInit();
  else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') appInit(); });

})();