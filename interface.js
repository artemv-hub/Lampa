(function () {
  "use strict";

  let manifest = {
    type: 'interface',
    version: '3.8.0',
    name: 'UI Style',
    component: 'ui_style'
  };

  Lampa.Manifest.plugins = manifest;

  const style = document.createElement('style');
  style.textContent = `

    .full-start-new__buttons .full-start__button:not(.focus) span { display: unset; }
    .full-start__title-original { font-size: 1.6em; margin-bottom: 0em; }

    .card__vote { font-size: 1.2em; font-weight: bold; border-radius: 0.2em; padding: 0.2em 0.2em; color: #000; left: -0.4em; right: unset; top: 0.8em; bottom: unset; }
    .card__quality { font-size: 1.2em; font-weight: bold; border-radius: 0.2em; padding: 0.2em 0.2em; color: #000; left: -0.4em; top: 2.4em; bottom: unset; text-transform: none; }
    .card__watched { font-size: 1.2em; font-weight: bold; border-radius: 1em; padding: 0.2em 0.4em; background: rgb(29, 31, 32); left: 50%; bottom: -0.8em; position: absolute; transform: translate(-50%); white-space: nowrap; }
    .card--tv .card__type { font-size: 1em; border-radius: 1em; padding: 0.2em 0.4em; background: rgb(29, 31, 32); left: 50%; top: -0.8em; transform: translate(-50%); white-space: nowrap; }
    .card__marker { display: none; }

    .time-line > div,
    .torrent-serial__progress,
    .player-panel__position,
    .player-panel__position > div:after { background-color: #3498db }

  `;
  document.head.appendChild(style);

  function styleLabelsTV() {
    document.querySelectorAll('.card__type').forEach(function (e) {
      if (e.textContent === 'TV' || e.textContent === 'Сериал') {
        let card = e.closest('.card');
        let cardData = card ? card.card_data : null;

        e.textContent = 'Сериал';

        if (cardData && cardData.status) {
          let statusKey = 'tv_status_' + cardData.status.toLowerCase().replace(/ /g, '_');
          let statusText = Lampa.Lang.translate(statusKey);

          if (statusText !== statusKey) {
            e.textContent = 'Сериал (' + statusText + ')';
          }
        }
      }
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
