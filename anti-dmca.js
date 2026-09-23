(function () {
    'use strict';

    if (window.__lampac_anti_dmca) return;
    window.__lampac_anti_dmca = true;

    // 1. Disable DMCA block list immediately
    window.lampa_settings = window.lampa_settings || {};
    window.lampa_settings.dcma = false;
    window.lampa_settings.disable_features = window.lampa_settings.disable_features || {};
    window.lampa_settings.disable_features.dmca = true;

    // ── Data normalization ───────────────────────────────────
    function normalizeData(data) {
        if (!data || typeof data !== 'object') return;
        if ('results' in data && !Array.isArray(data.results)) data.results = [];
        normalizeCard(data);
        if (data.movie && typeof data.movie === 'object') normalizeCard(data.movie);
        if (Array.isArray(data.results)) {
            for (var i = 0; i < data.results.length; i++) {
                if (data.results[i] && typeof data.results[i] === 'object') normalizeCard(data.results[i]);
            }
        }
    }

    function normalizeCard(card) {
        if (!card || typeof card !== 'object' || !card.id) return;
        if (!card.title) card.title = card.name || card.original_title || card.original_name || '';
        if (!Array.isArray(card.production_countries)) card.production_countries = card.production_countries || [];
        if (!Array.isArray(card.production_companies)) card.production_companies = card.production_companies || [];
        if (!Array.isArray(card.genres)) card.genres = card.genres || [];
    }

    // ── request_before hook (ASAP) ───────────────────────────
    var _hooked = false;
    function hookRequestBefore() {
        if (_hooked || typeof Lampa === 'undefined' || !Lampa.Listener) return;
        _hooked = true;
        Lampa.Listener.follow('request_before', function (event) {
            if (!event || !event.params) return;
            var params = event.params;
            if (typeof params.complite !== 'function') return;
            var _origComplite = params.complite;
            params.complite = function (data) {
                try { normalizeData(data); } catch (e) {}
                return _origComplite(data);
            };
        });
    }

    hookRequestBefore();
    if (!_hooked) {
        var _hookTimer = setInterval(function () {
            hookRequestBefore();
            if (_hooked) clearInterval(_hookTimer);
        }, 50);
        setTimeout(function () { clearInterval(_hookTimer); }, 10000);
    }

    // ── Appready fixes ───────────────────────────────────────
    function start() {
        hookRequestBefore();

        if (Lampa && Lampa.Utils) {
            Lampa.Utils.dcma = function () { return false; };
        }

        // Fix parseCountries: returns '' instead of []
        var tmdb = Lampa.TMDB || (Lampa.Api && Lampa.Api.sources && Lampa.Api.sources.tmdb);
        if (tmdb && typeof tmdb.parseCountries === 'function') {
            var _orig = tmdb.parseCountries;
            tmdb.parseCountries = function (movie) {
                var result = _orig(movie);
                return Array.isArray(result) ? result : [];
            };
        }

        // DMCA bypass: when CUB returns {blocked:true} for a card detail request,
        // abort the request and re-fetch from TMDB via sendSecuses.
        // request_secuses fires BEFORE complite — we can abort and provide clean data.
        Lampa.Listener.follow('request_secuses', function (event) {
            if (!event || !event.data) return;

            // Only handle blocked responses (CUB DMCA block)
            if (!event.data.blocked) return;

            // Detect if this is a movie/TV detail request by checking URL
            var url = event.params && event.params.url || '';
            var isDetail = url.indexOf('append_to_response') >= 0 ||
                           (url.indexOf('/api/3/') >= 0 && url.indexOf('/movie/') >= 0) ||
                           (url.indexOf('/api/3/') >= 0 && url.indexOf('/tv/') >= 0);

            if (!isDetail) {
                // For non-detail requests, just clear blocked flag
                event.data.blocked = false;
                return;
            }

            // Extract movie/TV id and method from URL
            var match = url.match(/\/api\/3\/(movie|tv)\/(\d+)/);
            if (!match) {
                event.data.blocked = false;
                return;
            }

            var method = match[1];
            var id = match[2];

            console.log('[anti-dmca] CUB blocked ' + method + '/' + id + ', fetching from TMDB...');

            // Abort the current (blocked) request
            var sendSecuses = event.abort();

            // Fetch from TMDB directly
            var tmdbKey = Lampa.TMDB && Lampa.TMDB.key ? Lampa.TMDB.key() : '4ef0d7355d9ffb5151e987764708ce96';
            var lang = Lampa.Storage ? Lampa.Storage.field('tmdb_lang') : 'ru';
            var tmdbUrl = 'https://api.themoviedb.org/3/' + method + '/' + id +
                '?api_key=' + tmdbKey +
                '&append_to_response=content_ratings,release_dates,keywords,alternative_titles' +
                '&language=' + lang;

            $.ajax({
                url: tmdbUrl,
                dataType: 'json',
                timeout: 8000,
                success: function (json) {
                    console.log('[anti-dmca] TMDB data received for ' + method + '/' + id);
                    json.source = 'tmdb';
                    sendSecuses(json);
                },
                error: function () {
                    console.log('[anti-dmca] TMDB fetch failed, showing blocked');
                    // Let original blocked response through
                    sendSecuses(event.data);
                }
            });
        });

        // Lock dcma property
        try {
            Object.defineProperty(window.lampa_settings, 'dcma', {
                get: function () { return false; },
                set: function () { /* noop */ },
                configurable: true,
                enumerable: true
            });
        } catch (e) {
            setInterval(function () {
                if (window.lampa_settings.dcma !== false) window.lampa_settings.dcma = false;
            }, 5000);
        }
    }

    if (window.appready) {
        start();
    } else if (typeof Lampa !== 'undefined' && Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') start();
        });
    } else {
        var _timer = setInterval(function () {
            if (typeof Lampa !== 'undefined' && Lampa.Listener) {
                clearInterval(_timer);
                if (window.appready) start();
                else Lampa.Listener.follow('app', function (event) {
                    if (event.type === 'ready') start();
                });
            }
        }, 200);
    }
})();
