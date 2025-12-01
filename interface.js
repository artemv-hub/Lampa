(function () {
  "use strict";

  let manifest = {
    type: 'interface',
    version: '3.7.0',
    name: 'UI Style',
    component: 'ui_style'
  };

  Lampa.Manifest.plugins = manifest;

  const style = document.createElement('style');
  style.textContent = `
    .full-start__title-original { font-size: 1.6em; margin-bottom: 0em; }
    .full-start-new__buttons .full-start__button:not(.focus) span { display: unset; }

    .card__watched { position: absolute; font-weight: bold; font-size: 1em; left: 0.2em; bottom: 0.2em; border-radius: 0.4em; padding: 0.2em 0.4em; color: #fff; background: rgb(50, 50, 50); left: 50%; transform: translate(-50%); white-space: nowrap; }
    .card__quality { font-weight: bold; font-size: 1.2em; left: unset; right: 0.2em; top: 2.6em; bottom: unset; border-radius: 0.2em; padding: 0.2em 0.2em; color: #000; text-transform: none; }
    .card__vote { font-weight: bold; font-size: 1.4em; right: 0.2em; top: 0.6em; bottom: unset; border-radius: 0.2em; padding: 0.2em 0.2em; color: #000; }
    .card__type { font-size: 0.9em; top: 1.1em; }
    .card__marker { display: none; }
    `;
  document.head.appendChild(style);

  function styleLabelsTV() {
    document.querySelectorAll('.card__type').forEach(elem => {
      if (elem.textContent === 'TV') elem.textContent = 'Сериал';
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
    ratingElements.forEach(element => {
      const ratingValue = parseFloat(element.textContent.trim());
      const colorMatch = colorRating.find(colorRule => ratingValue >= colorRule.ratings);
      if (colorMatch) element.style.color = colorMatch.color;
    });

    const colorQuality = [
      { qualities: ["2160p", "blu-ray", "bdremux"], color: "#3498db" },
      { qualities: ["1080p", "bdrip", "hdrip", "dvdrip", "web-dl"], color: "#2ecc71" },
      { qualities: ["1080i", "720p"], color: "#f1c40f" },
      { qualities: ["480p", "tv", "tc"], color: "#e67e22" },
      { qualities: ["vhsrip", "camrip", "ts"], color: "#e74c3c" }
    ];

    const qualityElements = document.querySelectorAll(".card__quality");
    qualityElements.forEach(element => {
      const qualityText = element.textContent.trim().toLowerCase();
      const colorMatch = colorQuality.find(colorRule => colorRule.qualities.some(q => qualityText.includes(q)));
      if (colorMatch) element.style.color = colorMatch.color;
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
