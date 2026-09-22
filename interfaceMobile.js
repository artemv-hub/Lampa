(function () {
  'use strict';

  let manifest = {
    type: 'interface',
    version: '5.1.0',
    name: 'UI Mobile',
    component: 'ui_mobile'
  };
  Lampa.Manifest.plugins = manifest;

  // Navigation Bar
  const NAV_BAR_ACTION = 'favorite';

  function navBarStyles() {
    if (document.getElementById('navigation-bar-styles')) return;
    const style = document.createElement('style');
    style.id = 'navigation-bar-styles';
    style.textContent = '.navigation-bar-favorite { cursor: pointer; }';
    document.head.appendChild(style);
  }

  function navBarExtract() {
    const item = document.querySelector('.menu__item[data-action="' + NAV_BAR_ACTION + '"]');
    if (!item) return null;

    const textElement = item.querySelector('.menu__text');
    const iconElement = item.querySelector('.menu__ico svg use');
    const iconHref = iconElement ? iconElement.getAttribute('xlink:href') : null;

    return {
      action: NAV_BAR_ACTION,
      title: textElement ? textElement.textContent.trim() : 'Избранное',
      sprite: iconHref ? iconHref.replace('#sprite-', '') : 'favorite'
    };
  }

  function navBarClick() {
    const menuItem = document.querySelector('.menu__item[data-action="' + NAV_BAR_ACTION + '"]');
    if (!menuItem) return;
    $(menuItem).trigger('hover:enter');
    if (Lampa.Menu && Lampa.Menu.close) Lampa.Menu.close();
  }

  function navBarInsert() {
    const bar = document.querySelector('.navigation-bar__body');
    if (!bar) return;
    if (bar.querySelector('.navigation-bar-favorite')) return;

    const info = navBarExtract();
    if (!info) return;

    const orders = { back: 1, main: 2, search: 4, settings: 5 };
    Object.keys(orders).forEach(action => {
      const btn = bar.querySelector('[data-action="' + action + '"]');
      if (btn) btn.style.order = String(orders[action]);
    });

    const el = document.createElement('div');
    el.className = 'navigation-bar__item navigation-bar-favorite';
    el.setAttribute('data-action', info.action);
    el.style.order = '3';
    el.innerHTML =
      '<div class="navigation-bar__icon"><svg><use xlink:href="#sprite-' + info.sprite + '"></use></svg></div>' +
      '<div class="navigation-bar__label">' + info.title + '</div>';
    el.addEventListener('click', navBarClick);

    bar.appendChild(el);
  }

  function navBarWait(attemptsLeft) {
    const bar = document.querySelector('.navigation-bar__body');
    const menu = document.querySelector('.menu__list');
    if (bar && menu) { navBarInsert(); return; }
    if (attemptsLeft <= 0) return;
    setTimeout(() => navBarWait(attemptsLeft - 1), 500);
  }

  function navBarInit() {
    if (!Lampa.Platform.screen('mobile')) return;

    navBarStyles();
    navBarWait(30);

    Lampa.Listener.follow('menu', event => {
      if (event.type === 'end') setTimeout(navBarInsert, 300);
    });
  }

  if (window.appready) navBarInit();
  else Lampa.Listener.follow('app', event => { if (event.type === 'ready') navBarInit(); });

})();