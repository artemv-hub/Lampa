(function () {
  "use strict";

  let manifest = {
    type: 'interface',
    version: '3.4.4',
    name: 'UI Fix',
    component: 'ui_fix'
  }

  Lampa.Manifest.plugins = manifest

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

  function fixSyncBookmarks() {
    if (typeof Lampa.WebSocket !== 'undefined') {
      Lampa.WebSocket.on('bookmark', function (event) {
        if (event.type === 'set' || event.type === 'add' || event.type === 'remove') {
          Lampa.Api.request('{localhost}/bookmark/list', '', function (data) {
            if (data && !data.dbInNotInitialization) {
              Lampa.Storage.set('favorite', data);
              const active = Lampa.Activity.active();
              if (active && (active.component === 'bookmarks' || active.component === 'favorite')) {
                active.activity.render();
              }
            }
          });
        }
      });
    }
  }

  function fixSize() {
    let originalLineInit = Lampa.Maker.map('Line').Items.onInit
    Lampa.Maker.map('Line').Items.onInit = function () {
      originalLineInit.call(this)
      this.view = 12
    }

    let originalCategoryInit = Lampa.Maker.map('Category').Items.onInit
    Lampa.Maker.map('Category').Items.onInit = function () {
      originalCategoryInit.call(this)
      this.limit_view = 12
    }

    Lampa.SettingsApi.addParam({
      component: 'interface',
      param: {
        name: 'interface_fixsize',
        type: 'select',
        default: '12',
        values: {
          '10': '10',
          '12': '12',
          '14': '14'
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
      var font_size = parseInt(Lampa.Storage.field('interface_fixsize')) || 12;
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

        let torrentBtn = render.find('.view--torrent')
        let onlineBtn = render.find('.view--online').removeClass('hide')

        buttonsContainer.prepend(onlineBtn[0])
        if (Lampa.Storage.field('parser_use')) {
          torrentBtn.removeClass('hide')
          buttonsContainer.prepend(torrentBtn[0])
        }
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
    fixSyncBookmarks();
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
