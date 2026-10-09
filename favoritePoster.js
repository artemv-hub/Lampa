(function () {
  'use strict';

  const manifest = {
    type: 'other',
    version: '5.0.2',
    name: 'Favorite Poster',
    component: 'favorite_poster'
  };
  Lampa.Manifest.plugins = manifest;

  // STORAGE
  const LAST_RUN_KEY = 'poster_refresh_last';
  const DAY = 24 * 60 * 60 * 1000;
  const DELAY = 250;

  const cardType = (card) => card.original_name ? 'tv' : 'movie';
  const isTmdb = (card) => card && card.id && card.poster_path && (!card.source || card.source === 'tmdb');

  function collect() {
    const fav = Lampa.Storage.get('favorite', {});
    const plus = Lampa.Storage.get('favorite_plus', {});

    return [
      { key: 'favorite', cards: (fav.card || []).filter(isTmdb) },
      { key: 'favorite_plus', cards: ((plus.plusTypes && plus.plusTypes.card) || []).filter(isTmdb) }
    ];
  }

  function server(path, options) {
    let url = window.location.origin + path;

    const email = Lampa.Storage.get('account_email');
    if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));

    const uid = Lampa.Storage.get('lampac_unic_id', '');
    if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));

    return fetch(url, options).then((res) => res.json());
  }

  // TMDB
  function tmdbPoster(card) {
    return new Promise((resolve) => {
      Lampa.Api.sources.tmdb.get(cardType(card) + '/' + card.id, {}, (data) => {
        resolve(data && data.poster_path ? data.poster_path : null);
      }, () => resolve(null));
    });
  }

  // SYNC
  function pushFavorite(cards) {
    server('/bookmark/dump').then((dump) => {
      const rows = (dump && dump.rows) || [];
      const payload = cards.map((card) => {
        const row = rows.filter((r) => String(r.id) === String(card.id))[0];
        return {
          id: card.id,
          card: Lampa.Utils.clearCard(card),
          categories: (row && row.categories) || {}
        };
      });
      return server('/bookmark/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: JSON.stringify(payload)
      });
    }).catch(() => {});
  }

  function apply(cards, key, posters) {
    const changed = cards.filter((card) => {
      const poster = posters[card.id];
      if (!poster || poster === card.poster_path) return false;
      card.poster_path = poster;
      card.img = Lampa.Api.img(poster, 'w300');
      return true;
    });

    if (!changed.length) return 0;

    Lampa.Storage.set(key, Lampa.Storage.get(key, {}));
    if (key === 'favorite') pushFavorite(changed);
    return changed.length;
  }

  function run() {
    const groups = collect();

    const queue = [];
    const seen = {};
    groups.forEach((group) => group.cards.forEach((card) => {
      if (!seen[card.id]) { seen[card.id] = true; queue.push(card); }
    }));

    const posters = {};

    Promise.all(queue.map((card, i) => new Promise((resolve) => {
      setTimeout(() => tmdbPoster(card).then((poster) => {
        posters[card.id] = poster;
        resolve();
      }), i * DELAY);
    }))).then(() => {
      const updated = groups.reduce((sum, group) => sum + apply(group.cards, group.key, posters), 0);
      console.log('UI Poster', 'обновлено ' + updated + ' из ' + queue.length);
    });
  }

  // INIT
  function start() {
    if (window.ui_poster) return;
    window.ui_poster = true;

    window.posterRefreshNow = () => {
      Lampa.Storage.set(LAST_RUN_KEY, Date.now());
      run();
    };

    const check = () => {
      if (Date.now() - Lampa.Storage.get(LAST_RUN_KEY, 0) < DAY) return;
      Lampa.Storage.set(LAST_RUN_KEY, Date.now());
      run();
    };

    Lampa.Timer.add(DAY, check, true, true);
  }

  if (window.appready) start();
  else Lampa.Listener.follow('app', (event) => { if (event.type === 'ready') start(); });

})();
