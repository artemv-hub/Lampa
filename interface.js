(function () {
  "use strict";

  let manifest = {
    type: 'interface',
    version: '3.7.9',
    name: 'UI Style',
    component: 'ui_style'
  };

  Lampa.Manifest.plugins = manifest;

  const style = document.createElement('style');
  style.textContent = `

    .full-start__title-original { font-size: 1.6em; margin-bottom: 0em; }
    .full-start-new__buttons .full-start__button:not(.focus) span { display: unset; }

    .card__watched { font-weight: bold; font-size: 1.2em; left: 50%; bottom: -0.8em; border-radius: 1em; padding: 0.2em 0.4em; color: #3498db; background: rgb(29, 31, 32); position: absolute; transform: translate(-50%); white-space: nowrap; }
    .card__quality { font-weight: bold; font-size: 1.2em; left: unset; right: 0.2em; top: 2.6em; bottom: unset; border-radius: 0.2em; padding: 0.2em 0.2em; color: #000; text-transform: none; }
    .card__vote { font-weight: bold; font-size: 1.4em; right: 0.2em; top: 0.6em; bottom: unset; border-radius: 0.2em; padding: 0.2em 0.2em; color: #000; }
    .card__type { font-size: 0.9em; top: 1.1em; }
    .card__marker { display: none; }

    .time-line > div,
    .torrent-serial__progress,
    .player-panel__position,
    .player-panel__position > div:after { background-color: #3498db }

  `;
  document.head.appendChild(style);

  function styleLabelsTV() {
    document.querySelectorAll('.card__type').forEach(function (e) {
      if (e.textContent === 'TV') e.textContent = 'Сериал';
    });
  }

  function styleButtons() {
    Lampa.Listener.follow('full', function (e) {
      if (e.type == 'complite') {
        let render = e.object.activity.render();
        let buttonsContainer = render.find('.full-start-new__buttons');
        buttonsContainer.find('.button--play, .button--reaction, .button--subscribe, .button--options').remove();

        let torrentBtn = render.find('.view--torrent');
        let onlineBtn = render.find('.view--online').removeClass('hide');

        buttonsContainer.prepend(onlineBtn[0]);
        if (Lampa.Storage.field('parser_use')) {
          torrentBtn.removeClass('hide');
          buttonsContainer.prepend(torrentBtn[0]);
        }
      }
    });
  }

  function styleTitle() {
    Lampa.Listener.follow('full', function (e) {
      if (e.type == 'complite') {
        let titleElement = e.body.find('.full-start-new__title');
        let title = e.data.movie.title || e.data.movie.name;
        let originalTitle = e.data.movie.original_title || e.data.movie.original_name;

        if (title && originalTitle && title !== originalTitle) {
          let originalTitleHtml = '<div class="full-start__title-original">' + originalTitle + '</div>';
          titleElement.before(originalTitleHtml);
          titleElement.text(title);
        }
      }
    });
  }

  function styleView() {
    let originalLineInit = Lampa.Maker.map('Line').Items.onInit;
    Lampa.Maker.map('Line').Items.onInit = function () {
      originalLineInit.call(this);
      this.view = 12;
    };

    let originalCategoryInit = Lampa.Maker.map('Category').Items.onInit;
    Lampa.Maker.map('Category').Items.onInit = function () {
      originalCategoryInit.call(this);
      this.limit_view = 12;
    };
  }

  function styleSize() {
    Lampa.Params.select('interface_size', {
      '10': '10',
      '12': '12',
      '14': '14'
    }, '12');

    function updateSize() {
      let selectedLevel = parseInt(Lampa.Storage.field('interface_size')) || 12;
      let fontSize = Lampa.Platform.screen('mobile') ? 10 : selectedLevel;
      $('body').css({ fontSize: fontSize + 'px' });
    }

    Lampa.Storage.listener.follow('change', function (e) {
      if (e.name == 'interface_size') updateSize();
    });
    updateSize();
  }

  function styleColors() {
    const colorRating = [
      { ratings: 9, color: "#3498db" },
      { ratings: 7, color: "#2ecc71" },
      { ratings: 6, color: "#f1c40f" },
      { ratings: 4, color: "#e67e22" },
      { ratings: 0, color: "#e74c3c" }
    ];

    const ratingElements = document.querySelectorAll(".card__vote, .full-start__rate > div, .info__rate > span");
    ratingElements.forEach(function (e) {
      const ratingValue = parseFloat(e.textContent.trim());
      const colorMatch = colorRating.find(colorRule => ratingValue >= colorRule.ratings);
      if (colorMatch) e.style.backgroundColor = colorMatch.color;
    });

    const colorQuality = [
      { qualities: ["/ts"], color: "#e74c3c" },
      { qualities: ["2160", "blu-ray", "bdremux"], color: "#3498db" },
      { qualities: ["1080", "bdrip", "hdrip", "dvdrip", "web-dl"], color: "#2ecc71" },
      { qualities: ["1080i", "720"], color: "#f1c40f" },
      { qualities: ["480", "tv", "tc"], color: "#e67e22" },
      { qualities: ["vhsrip", "camrip", "ts"], color: "#e74c3c" }
    ];

    const qualityElements = document.querySelectorAll(".card__quality");
    qualityElements.forEach(function (e) {
      const qualityText = e.textContent.trim().toLowerCase();
      const colorMatch = colorQuality.find(colorRule => colorRule.qualities.some(q => qualityText.includes(q)));
      if (colorMatch) e.style.backgroundColor = colorMatch.color;
    });
  }

  function startPlugin() {
    styleLabelsTV();
    styleButtons();
    styleTitle();
    styleView();
    styleSize();
    styleColors();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            styleLabelsTV();
            styleColors();
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (window.appready) { startPlugin(); }
  else {
    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready") { startPlugin(); }
    });
  }
})();
