(function () {
  "use strict";

  let manifest = {
    type: 'interface',
    version: '3.5.47',
    name: 'UI Fix',
    component: 'ui_fix'
  };

  Lampa.Manifest.plugins = manifest;

  function fixLabelsTV() {
    document.querySelectorAll('.card__type').forEach(elem => {
      if (elem.textContent === 'TV') elem.textContent = 'Сериал';
    });
  }

  function fixButtons() {
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

  function fixTitle() {
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

    function fixView() {  
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
  
    // Функция для изменения размера интерфейса  
    function fixSize() {  
            Lampa.Layer.size = function() {  
        let selectedLevel = Lampa.Storage.field('interface_size');  
        let sizeMap = {  
            small: 10,  
            normal: 12,  
            bigger: 14  
        };  
        let fontSize = Lampa.Platform.screen('mobile') ? 10 : sizeMap[selectedLevel];  
        $('body').css({ fontSize: fontSize + 'px' });
    };  
    Lampa.Layer.size();  
  })  

  function startPlugin() {
    fixLabelsTV();
    fixButtons();
    fixTitle();
    fixView();
    fixSize();

    const observer = new MutationObserver(() => {
      fixLabelsTV();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (window.appready) { 
    startPlugin(); 
  }
  else {
    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready") { startPlugin(); }
    });
  }

})();
