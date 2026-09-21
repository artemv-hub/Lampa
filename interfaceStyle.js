(function () {
  'use strict';

  let manifest = {
    type: 'interface',
    version: '4.0.5',
    name: 'UI Style',
    component: 'ui_style'
  };
  Lampa.Manifest.plugins = manifest;

  const style = document.createElement('style');
  style.textContent = `
    .full-start-new__buttons .full-start__button:not(.focus) span { display: unset; }
    .full-start__title-original { font-size: 1.6em; margin-bottom: 0em; }
    .source--name { display: none; }
    
    .time-line > div,
    .torrent-serial__progress,
    .player-panel__position,
    .player-panel__position > div:after { background-color: #3498DB }

    .loading-layer__box { width: 240px; }
    .loading-layer__text { font-size: 1.2em; line-height: 1.2; tab-size: 6; white-space: pre-wrap; }
  `;
  document.head.appendChild(style);

  const colorQuality = [
    { color: '#3498DB', quality: '4K' },
    { color: '#2ECC71', quality: 'FHD' },
    { color: '#F1C40F', quality: 'HD' },
    { color: '#E67E22', quality: 'SD' },
    { color: '#E74C3C', quality: 'TS' }
  ];
  const colorVote = [
    { color: '#3498DB', vote: 9 },
    { color: '#2ECC71', vote: 7 },
    { color: '#F1C40F', vote: 6 },
    { color: '#E67E22', vote: 4 },
    { color: '#E74C3C', vote: 0 }
  ];
  const colorPG = [
    { color: '#E74C3C', pg: 18 },
    { color: '#E67E22', pg: 16 },
    { color: '#F1C40F', pg: 12 },
    { color: '#2ECC71', pg: 6 },
    { color: '#3498DB', pg: 0 }
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
    document.querySelectorAll('.card__quality').forEach(e => {
      const qualityText = e.textContent.trim().toUpperCase();
      const colorMatch = colorQuality.find(colorRule => qualityText.includes(colorRule.quality));
      if (colorMatch) e.style.background = colorMatch.color;
    });
    document.querySelectorAll('.card__vote, .full-start__rate').forEach(e => {
      const voteTest = parseFloat(e.textContent.trim());
      const colorMatch = colorVote.find(colorRule => voteTest >= colorRule.vote);
      if (colorMatch) e.style.background = colorMatch.color;
    });
    document.querySelectorAll('.full-start__pg').forEach(e => {
      const pgText = parseInt((e.textContent.trim()).match(/\d+/)?.[0] || NaN);
      const colorMatch = colorPG.find(colorRule => pgText >= colorRule.pg);
      if (colorMatch) e.style.background = colorMatch.color;
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();