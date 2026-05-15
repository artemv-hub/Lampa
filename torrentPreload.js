(function () {
  'use strict';

  let manifest = {
    type: 'torrent',
    version: '4.0.2',
    name: 'Torrent Preload',
    component: 'torrent_preload'
  };
  Lampa.Manifest.plugins = manifest;

  const oldStream = Lampa.Torserver.stream;
  Lampa.Torserver.stream = function () {
    return oldStream.apply(this, arguments).replace('&preload', '&play');
  };
  const oldPlay = Lampa.Player.play;
  Lampa.Player.play = function (data) {
    const need_preload = Lampa.Torserver.ip() && data.url.includes(Lampa.Torserver.ip()) && Lampa.Storage.field('torrserver_preload');
    if (!need_preload || data.url.indexOf('&play') === -1) return oldPlay.apply(this, arguments);
    runPreload(data, () => oldPlay.call(this, data));
  };
  function runPreload(data, onDone) {
    let interval;
    const network = new Lampa.Reguest();
    const hash = data.url.match(/link=(.*?)\&/)[1];
    Lampa.Loading.start(() => (clearInterval(interval), Lampa.Loading.stop(), network.clear()));
    network.silent(data.url.replace('&play', '&preload'));
    const update = () => {
      Lampa.Torserver.cache(hash, (res) => {
        const t = res.Torrent;
        if (t) {
          const speed = Lampa.Utils.bytesToSize((t.download_speed || 0) * 8, true);
          const loaded = Lampa.Utils.bytesToSize(t.preloaded_bytes || 0);
          const progress = Math.min(100, ((t.preloaded_bytes || 0) * 100) / (t.preload_size || 1));
          if (progress >= 95) { clearInterval(interval); Lampa.Loading.stop(); onDone(); }
          else {
            const text =
              `Раздают:\t\t${t.connected_seeders || 0}/${t.active_peers} (${t.total_peers})\n` +
              `Скорость: \t${speed}\n` +
              `Прогресс: \t${loaded} (${Math.round(progress)}%)`;
            Lampa.Loading.setText(text);
          }
        }
      });
    };
    interval = setInterval(update, 1000);
    update();
  }
})();