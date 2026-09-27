(function () {
  'use strict';

  const manifest = {
    type: 'interface',
    version: '5.2.0',
    name: 'UI Mobile',
    component: 'ui_mobile'
  };
  Lampa.Manifest.plugins = manifest;

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

  // INIT
  function appInit() {
    if (!Lampa.Platform.screen('mobile')) return;

    barWait(30);

    Lampa.Listener.follow('menu', (e) => {
      if (e.type === 'end') setTimeout(barInsert, 300);
    });
  }

  if (window.appready) appInit();
  else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') appInit(); });

})();