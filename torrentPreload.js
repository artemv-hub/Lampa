(function () {
  'use strict';

  const manifest = {
    type: 'torrent',
    version: '5.2.0',
    name: 'Torrent Preload',
    component: 'torrent_preload'
  };
  Lampa.Manifest.plugins = manifest;

  // PATCH
  const oldStream = Lampa.Torserver.stream;
  Lampa.Torserver.stream = function () {
    return oldStream.apply(this, arguments).replace('&preload', '&play');
  };

  const oldPlay = Lampa.Player.play;
  Lampa.Player.play = function (data) {
    const needPreload =
      Lampa.Torserver.ip() &&
      data.url.includes(Lampa.Torserver.ip()) &&
      Lampa.Storage.field('torrserver_preload');

    if (!needPreload || data.url.indexOf('&play') === -1) {
      return oldPlay.apply(this, arguments);
    }
    runPreload(data, () => oldPlay.call(this, data));
  };

  // PRELOAD
  function runPreload(data, onDone) {
    let interval;
    const network = new Lampa.Reguest();
    const hash = data.url.match(/link=(.*?)&/)[1];

    Lampa.Loading.start(() => {
      clearInterval(interval);
      Lampa.Loading.stop();
      network.clear();
    });

    network.silent(data.url.replace('&play', '&preload'));

    function update() {
      Lampa.Torserver.cache(hash, (res) => {
        const t = res.Torrent;
        if (!t) return;

        const speed = Lampa.Utils.bytesToSize((t.download_speed || 0) * 8, true);
        const loaded = Lampa.Utils.bytesToSize(t.preloaded_bytes || 0);
        const progress = Math.min(100, ((t.preloaded_bytes || 0) * 100) / (t.preload_size || 1));

        if (progress >= 95) {
          clearInterval(interval);
          Lampa.Loading.stop();
          onDone();
          return;
        }

        Lampa.Loading.setText(
          `Раздают:\t${t.connected_seeders || 0}/${t.active_peers || 0} (${t.total_peers || 0})\n` +
          `Скорость:\t${speed}\n` +
          `Прогресс:\t${loaded} (${Math.round(progress)}%)`
        );
      });
    }

    interval = setInterval(update, 1000);
    update();
  }

})();