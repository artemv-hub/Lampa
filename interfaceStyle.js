(function () {
  "use strict";

  let manifest = {
    type: 'interface',
    version: '3.14.1',
    name: 'UI Style',
    component: 'ui_style'
  };
  Lampa.Manifest.plugins = manifest;

  const style = document.createElement('style');
  const badgeStyle = `
    position: absolute;
    left: unset;
    right: unset; 
    top: unset;
    bottom: unset;
    font-size: 1.2em;
    font-weight: bold;
    border-radius: 0.2em;
    padding: 0em 0.2em;
    color: #000;
    background-color: rgba(255, 255, 255, 1);
    z-index: 1;
    white-space: nowrap;
    text-transform: none; 
  `;
  style.textContent = `
    .card__age { ${badgeStyle} bottom: 0em; left: 0em; }  
    .card__vote { ${badgeStyle} bottom: 1.2em; left: 0em; }  
    .card__quality { ${badgeStyle} bottom: 2.4em; left: 0em; }  
    .card__watched { ${badgeStyle} bottom: 0em; right: 0em; }
    .card--tv .card__type { ${badgeStyle} bottom: 0em; right: 0em; z-index: 0; }
    .card__marker { display: none; }
    
    .full-start-new__buttons .full-start__button:not(.focus) span { display: unset; }
    .full-start__title-original { font-size: 1.6em; margin-bottom: 0em; }

    .items-line { padding-bottom: 2em; }
    .register { line-height: 1; min-width: 8em; }
    
    .time-line > div,
    .torrent-serial__progress,
    .player-panel__position,
    .player-panel__position > div:after { background-color: #3498db }
  `;
  document.head.appendChild(style);

  const colorRating = [
    { ratings: 9, color: "rgba(52, 152, 219, 1)" },
    { ratings: 7, color: "rgba(46, 204, 113, 1)" },
    { ratings: 6, color: "rgba(241, 196, 15, 1)" },
    { ratings: 4, color: "rgba(230, 126, 34, 1)" },
    { ratings: 0, color: "rgba(231, 76, 60, 1)" }
  ];
  const colorQuality = [
    { qualities: ["/ts"], color: "rgba(231, 76, 60, 1)" },
    { qualities: ["2160", "blu-ray", "bdremux"], color: "rgba(52, 152, 219, 1)" },
    { qualities: ["1080", "bdrip", "hdrip", "dvdrip", "web-dl"], color: "rgba(46, 204, 113, 1)" },
    { qualities: ["1080i", "720"], color: "rgba(241, 196, 15, 1)" },
    { qualities: ["480", "tv", "tc"], color: "rgba(230, 126, 34, 1)" },
    { qualities: ["vhsrip", "camrip", "ts"], color: "rgba(231, 76, 60, 1)" }
  ];

  const originalLine = Lampa.Maker.map('Line').Items.onInit;
  Lampa.Maker.map('Line').Items.onInit = function () { originalLine.call(this); this.view = 12; };
  const originalCategory = Lampa.Maker.map('Category').Items.onInit;
  Lampa.Maker.map('Category').Items.onInit = function () { originalCategory.call(this); this.limit_view = 12; };

  Lampa.Params.select('interface_size', { '10': '10', '12': '12', '14': '14' }, '12');
  const getSize = () => Lampa.Platform.screen('mobile') ? 10 : parseInt(Lampa.Storage.field('interface_size')) || 12;
  const updateSize = () => $('body').css({ fontSize: getSize() + 'px' });
  updateSize();
  Lampa.Storage.listener.follow('change', e => {
    if (e.name == 'interface_size')
      updateSize();
  });

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

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.card__age').forEach(e => e.parentElement.querySelector('.card__view')?.appendChild(e));
    document.querySelectorAll('.card__type').forEach(e => e.innerText === 'TV' && (e.innerText = 'Сериал'));
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