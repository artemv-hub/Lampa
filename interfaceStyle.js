(function () {
  "use strict";

  let manifest = {
    type: 'interface',
    version: '3.1.4',
    name: 'UI Style',
    component: 'ui_style'
  };

  Lampa.Manifest.plugins = manifest;

  const style = document.createElement('style');
  style.textContent = `
    .full-start__title-original { font-size: 1.6em; margin-bottom: 0em; }
    .full-start-new__buttons .full-start__button:not(.focus) span { display: unset; }

    .card__quality { font-size: 1em; left: 0.2em; bottom: 0.2em; border-radius: 1em; padding: 0.2em 0.5em; background: rgba(0, 0, 0, 0.5); text-transform: none; }
    .card__quality div { font-weight: bold; font-size: 1.2em; color: #fff; }
    .card__vote { font-weight: bold; font-size: 1.2em; right: 0.2em; bottom: 0.2em; }
    .card__type { top: 2.2em; }
    .card__icons { top: 1.6em; }
    .card__marker { top: 0.1em; bottom: unset; left: 50%; transform: translate(-50%); }
    .card__marker > span { font-size: 0.8em; max-width: 16em; }
    `;
  document.head.appendChild(style);

  function addTitle() {
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

  function fixSize() {
    let originalLineInit = Lampa.Maker.map('Line').Items.onInit
    Lampa.Maker.map('Line').Items.onInit = function () {
      originalLineInit.call(this)
      this.view = 16
    }

    let originalCategoryInit = Lampa.Maker.map('Category').Items.onInit
    Lampa.Maker.map('Category').Items.onInit = function () {
      originalCategoryInit.call(this)
      this.limit_view = 16
    }

    Lampa.SettingsApi.addParam({
      component: 'interface',
      param: {
        name: 'interface_fixsize',
        type: 'select',
        default: '16',
        values: {
          '10': '10',
          '12': '12',
          '14': '14',
          '16': '16'
        }
      },
      field: { name: 'Фиксированный размер' },
      onChange: function onChange() {
        var name = Lampa.Controller.enabled().name;
        Lampa.Layer.update();
        Lampa.Controller.toggle(name);
      }
    });

    Lampa.Settings.listener.follow('open', function (e) {
      if (e.name == 'interface') {
        var item = e.body.find('[data-name="interface_fixsize"]');
        item.detach();
        item.insertAfter(e.body.find('[data-name="interface_size"]'));
      }
    });

    var layer_update = Lampa.Layer.update;

    Lampa.Layer.update = function (where) {
      var font_size = parseInt(Lampa.Storage.field('interface_fixsize')) || 16;
      if (Lampa.Platform.screen('mobile')) { font_size = 10; }
      $('body').css({ fontSize: font_size + 'px' });
      layer_update(where);
    };

    Lampa.Layer.update();
  }

  function fixButtons() {
    Lampa.Listener.follow('full', (e) => {
      if (e.type == 'complite') {
        let render = e.object.activity.render()
        let buttonsContainer = render.find('.full-start-new__buttons')
        buttonsContainer.find('.button--play, .button--reaction, .button--subscribe, .button--options').remove()

        let torrentBtn = render.find('.view--torrent').removeClass('hide')
        let onlineBtn = render.find('.view--online').removeClass('hide')
        buttonsContainer.prepend([torrentBtn[0], onlineBtn[0]])
      }
    })
  }

  function fixLabelsTV(cards) {
    cards.forEach(card => {
      const typeElem = card.querySelector('.card__type');
      if (typeElem) typeElem.textContent = 'Сериал';
    });
  }

  function startPlugin() {
    addTitle();
    fixSize();
    fixButtons();
    fixLabelsTV(document.querySelectorAll('.card--tv'));

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const cards = node.matches?.('.card--tv') ? [node] : node.querySelectorAll?.('.card--tv');
            if (cards?.length) fixLabelsTV(cards);
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
