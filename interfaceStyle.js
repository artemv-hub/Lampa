(function () {
  "use strict";

  let manifest = {
    type: 'interface',
    version: '3.10.0',
    name: 'UI Style',
    component: 'ui_style'
  };
  Lampa.Manifest.plugins = manifest;

  // Style
  const style = document.createElement('style');
  style.textContent = `

    .full-start-new__buttons .full-start__button:not(.focus) span { display: unset; }
    .full-start__title-original { font-size: 1.6em; margin-bottom: 0em; }

    .card__vote { font-size: 1.2em; font-weight: bold; border-radius: 0.2em; padding: 0.2em 0.2em; color: #000; left: -0.4em; right: unset; top: 0.8em; bottom: unset; }
    .card__quality { font-size: 1.2em; font-weight: bold; border-radius: 0.2em; padding: 0.2em 0.2em; color: #000; left: -0.4em; top: 2.4em; bottom: unset; text-transform: none; }
    .card__watched { font-size: 1em; font-weight: bold; border-radius: 1em; padding: 0.2em 0.4em; background: rgb(29, 31, 32); left: 50%; bottom: -0.8em; position: absolute; transform: translate(-50%); white-space: nowrap; }
    .card--tv .card__type { font-size: 1em; border-radius: 1em; padding: 0.2em 0.4em; background: rgb(29, 31, 32); left: 50%; top: -0.8em; transform: translate(-50%); }
    .card__marker { display: none; }

    .time-line > div,
    .torrent-serial__progress,
    .player-panel__position,
    .player-panel__position > div:after { background-color: #3498db }

  `;
  document.head.appendChild(style);

  // Color
  const colorRating = [
    { ratings: 9, color: "#3498db" },
    { ratings: 7, color: "#2ecc71" },
    { ratings: 6, color: "#f1c40f" },
    { ratings: 4, color: "#e67e22" },
    { ratings: 0, color: "#e74c3c" }
  ];
  const colorQuality = [
    { qualities: ["/ts"], color: "#e74c3c" },
    { qualities: ["2160", "blu-ray", "bdremux"], color: "#3498db" },
    { qualities: ["1080", "bdrip", "hdrip", "dvdrip", "web-dl"], color: "#2ecc71" },
    { qualities: ["1080i", "720"], color: "#f1c40f" },
    { qualities: ["480", "tv", "tc"], color: "#e67e22" },
    { qualities: ["vhsrip", "camrip", "ts"], color: "#e74c3c" }
  ];

  // Size
  const originalLine = Lampa.Maker.map('Line').Items.onInit;
  Lampa.Maker.map('Line').Items.onInit = function () { originalLine.call(this); this.view = 12; };
  const originalCategory = Lampa.Maker.map('Category').Items.onInit;
  Lampa.Maker.map('Category').Items.onInit = function () { originalCategory.call(this); this.limit_view = 12; };

  Lampa.Params.select('interface_size', { '10': '10', '12': '12', '14': '14' }, '12');
  const getSize = () => Lampa.Platform.screen('mobile') ? 10 : parseInt(Lampa.Storage.field('interface_size')) || 12;
  const updateSize = () => $('body').css({ fontSize: getSize() + 'px' });
  updateSize();
  Lampa.Storage.listener.follow('change', e => {
    if (e.name == 'interface_size') updateSize();
  });

  // CardFull
  Lampa.Listener.follow('full', e => {
    if (e.type == 'complite') {
      let buttonsContainer = e.body.find('.full-start-new__buttons');
      let buttonTorrent = e.body.find('.view--torrent').removeClass('hide');
      let buttonOnline = e.body.find('.view--online').removeClass('hide');
      buttonsContainer.find('.button--play, .button--reaction, .button--subscribe, .button--options').remove();
      buttonsContainer.prepend(buttonTorrent[0], buttonOnline[0]);
      buttonTorrent.toggleClass('hide', !Lampa.Storage.field('parser_use'));

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

  // MenuSettings
  Lampa.Settings.listener.follow('open', function (e) {
    e.body.find('[data-component="parental_control"]').remove();
    e.body.find('[data-name="light_version"]').remove();
    e.body.find('[data-name="jackett_url"]').hide();
    e.body.find('[data-name="jackett_key"]').hide();
    e.body.find('[data-name="torrserver_url"]').hide();
    e.body.find('[data-name="torrserver_password"]').hide();
    e.body.find('[data-name="card_quality"]').hide();
    e.body.find('[data-name="card_episodes"]').hide();
  });

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.card__type').forEach(e => {
      if (e.innerText === 'TV') e.innerText = 'Сериал';
    });
    document.querySelectorAll(".card__vote").forEach(e => {
      const ratingValue = parseFloat(e.textContent.trim());
      const colorMatch = colorRating.find(colorRule => ratingValue >= colorRule.ratings);
      if (colorMatch) e.style.backgroundColor = colorMatch.color;
    });
    document.querySelectorAll(".card__quality").forEach(e => {
      const qualityText = e.textContent.trim().toLowerCase();
      const colorMatch = colorQuality.find(colorRule => colorRule.qualities.some(q => qualityText.includes(q)));
      if (colorMatch) e.style.backgroundColor = colorMatch.color;
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
