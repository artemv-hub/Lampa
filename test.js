(function () {
  'use strict';

  function init() {
    if (!window.Lampa || !Lampa.Utils) {
      setTimeout(init, 500);
      return;
    }

    const originalSecondsToTimeHuman = Lampa.Utils.secondsToTimeHuman;

    Lampa.Utils.secondsToTimeHuman = function (seconds) {
      if (typeof seconds === 'number' && seconds > 0) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
          return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
      }

      return originalSecondsToTimeHuman.apply(this, arguments);
    };
  }

  init();
})();
