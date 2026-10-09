(function () {
  'use strict';

  const manifest = {
    type: 'interface',
    version: '5.2.1',
    name: 'UI Style',
    component: 'ui_style'
  };
  Lampa.Manifest.plugins = manifest;

  // STYLES
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

  // SIZE
  const originalLine = Lampa.Maker.map('Line').Items.onInit;
  Lampa.Maker.map('Line').Items.onInit = function () {
    originalLine.call(this);
    this.view = 12;
  };
  const originalCategory = Lampa.Maker.map('Category').Items.onInit;
  Lampa.Maker.map('Category').Items.onInit = function () {
    originalCategory.call(this);
    this.limit_view = 12;
  };

  Lampa.Params.select('interface_size', { '10': '10', '12': '12', '14': '14' }, '12');
  const getSize = () => Lampa.Platform.screen('mobile') ? 10 : parseInt(Lampa.Storage.field('interface_size')) || 12;
  const updateSize = () => $('body').css({ fontSize: getSize() + 'px' });
  updateSize();
  Lampa.Storage.listener.follow('change', (e) => {
    if (e.name == 'interface_size') updateSize();
  });

  // FULL
  Lampa.Listener.follow('full', (e) => {
    if (e.type !== 'complite') return;

    // BUTTONS
    const buttonsContainer = e.body.find('.full-start-new__buttons');
    const buttonTorrent = e.body.find('.view--torrent').removeClass('hide');
    const buttonOnline = e.body.find('.view--online').removeClass('hide');
    buttonsContainer.find('.button--play, .button--reaction, .button--subscribe, .button--options').remove();
    buttonsContainer.prepend(buttonTorrent[0], buttonOnline[0]);
    buttonTorrent.toggleClass('hide', !Lampa.Storage.field('parser_use'));

    // TITLE
    const titleElement = e.body.find('.full-start-new__title');
    const title = e.data.movie.title || e.data.movie.name;
    const originalTitle = e.data.movie.original_title || e.data.movie.original_name;
    if (title && originalTitle && title !== originalTitle) {
      const originalTitleHtml = '<div class="full-start__title-original">' + originalTitle + '</div>';
      titleElement.before(originalTitleHtml);
      titleElement.text(title);
    }
  });

  // BAR
  const BAR_ACTION = 'favorite';
  const barOrders = { back: 1, main: 2, search: 4, settings: 5 };

  function barClick() {
    const item = document.querySelector('.menu__item[data-action="' + BAR_ACTION + '"]');
    if (!item) return;
    $(item).trigger('hover:enter');
    if (Lampa.Menu && Lampa.Menu.close) Lampa.Menu.close();
  }

  function barInsert() {
    const bar = document.querySelector('.navigation-bar__body');
    if (!bar || bar.querySelector('.navigation-bar-favorite')) return;

    const item = document.querySelector('.menu__item[data-action="' + BAR_ACTION + '"]');
    if (!item) return;

    const textEl = item.querySelector('.menu__text');
    const iconEl = item.querySelector('.menu__ico svg use');
    const title = textEl ? textEl.textContent.trim() : 'Избранное';
    const sprite = iconEl ? iconEl.getAttribute('xlink:href').replace('#sprite-', '') : BAR_ACTION;

    Object.keys(barOrders).forEach(action => {
      const btn = bar.querySelector('[data-action="' + action + '"]');
      if (btn) btn.style.order = String(barOrders[action]);
    });

    const el = document.createElement('div');
    el.className = 'navigation-bar__item navigation-bar-favorite';
    el.setAttribute('data-action', BAR_ACTION);
    el.style.order = '3';
    el.style.cursor = 'pointer';
    el.innerHTML =
      '<div class="navigation-bar__icon"><svg><use xlink:href="#sprite-' + sprite + '"></use></svg></div>' +
      '<div class="navigation-bar__label">' + title + '</div>';
    el.addEventListener('click', barClick);

    bar.appendChild(el);
  }

  function barWait(attempts) {
    const bar = document.querySelector('.navigation-bar__body');
    const menu = document.querySelector('.menu__list');
    if (bar && menu) { barInsert(); return; }
    if (attempts <= 0) return;
    setTimeout(() => barWait(attempts - 1), 500);
  }

  function barInit() {
    if (!Lampa.Platform.screen('mobile')) return;

    barWait(30);

    Lampa.Listener.follow('menu', (e) => {
      if (e.type === 'end') setTimeout(barInsert, 300);
    });
  }

  barInit();

})();