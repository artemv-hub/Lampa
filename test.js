(function() {  
  'use strict';  
  
  function formatTime(seconds) {  
    if (!seconds || seconds <= 0) return '0:00';  
      
    var hours = Math.floor(seconds / 3600);  
    var minutes = Math.floor((seconds % 3600) / 60);  
    var secs = Math.floor(seconds % 60);  
      
    if (hours > 0) {  
      return hours + ':' +   
             (minutes < 10 ? '0' : '') + minutes + ':' +   
             (secs < 10 ? '0' : '') + secs;  
    }  
    return minutes + ':' + (secs < 10 ? '0' : '') + secs;  
  }  
  
  // Получаем правильный ключ для хранилища  
  function getViewedKey() {  
    var acc = Lampa.Storage.get('account', '{}');  
    return 'file_view' + (acc.profile ? '_' + acc.profile.id : '');  
  }  
  
  // Обновление отображения времени  
  function updateCardTimeDisplay(cardElement, hash) {  
    try {  
      var viewed = Lampa.Storage.cache(getViewedKey(), 10000, {});  
      var timeData = viewed[hash];  
        
      if (timeData && timeData.time && timeData.duration) {  
        var timeText = formatTime(timeData.time) + ' / ' + formatTime(timeData.duration);  
          
        // Пробуем разные селекторы для поиска элемента  
        var selectors = [  
          '.card__view-percent',  
          '.card-watched__line',  
          '.card__time',  
          '.card-watched__text',  
          '.card__progress-text'  
        ];  
          
        var updated = false;  
        for (var i = 0; i < selectors.length; i++) {  
          var element = cardElement.find(selectors[i]);  
          if (element.length) {  
            element.text(timeText);  
            updated = true;  
            break;  
          }  
        }  
          
        if (!updated) {  
          console.log('TimeFormat: элемент для отображения не найден', hash);  
        }  
      }  
    } catch (e) {  
      console.error('TimeFormat error:', e);  
    }  
  }  
  
  // Перехватываем рендеринг карточек  
  function patchCardRender() {  
    // Перехватываем метод render карточек  
    if (Lampa.CardView && Lampa.CardView.prototype.render) {  
      var originalRender = Lampa.CardView.prototype.render;  
      Lampa.CardView.prototype.render = function() {  
        var result = originalRender.apply(this, arguments);  
          
        if (this.card && this.card.id) {  
          var hash = this.card.id + '_' + (this.card.name ? 'tv' : 'movie');  
          updateCardTimeDisplay($(this.render()), hash);  
        }  
          
        return result;  
      };  
    }  
  }  
  
  // Слушаем события Lampa  
  function setupListeners() {  
    // При обновлении таймкодов  
    Lampa.Listener.follow('lampac', function(e) {  
      if (e.type == 'timecode_pullFromServer') {  
        console.log('TimeFormat: обновление после синхронизации');  
        setTimeout(updateAllCards, 200);  
      }  
    });  
      
    // При изменении активности  
    Lampa.Listener.follow('activity', function(e) {  
      if (e.type == 'start') {  
        console.log('TimeFormat: обновление при смене активности');  
        setTimeout(updateAllCards, 500);  
      }  
    });  
  }  
  
  // Обновить все видимые карточки  
  function updateAllCards() {  
    $('.card').each(function() {  
      var cardElement = $(this);  
      var cardData = cardElement.data('card');  
        
      if (cardData && cardData.id) {  
        var hash = cardData.id + '_' + (cardData.name ? 'tv' : 'movie');  
        updateCardTimeDisplay(cardElement, hash);  
      }  
    });  
  }  
  
  // Периодическое обновление  
  function startPeriodicUpdate() {  
    setInterval(updateAllCards, 10000); // Каждые 10 секунд  
  }  
  
  function startPlugin() {  
    if (window.lampac_timeformat_plugin) return;  
    window.lampac_timeformat_plugin = true;  
      
    console.log('TimeFormat plugin starting...');  
      
    patchCardRender();  
    setupListeners();  
    startPeriodicUpdate();  
      
    // Первое обновление через 2 секунды после загрузки  
    setTimeout(function() {  
      console.log('TimeFormat: первое обновление');  
      updateAllCards();  
    }, 2000);  
      
    console.log('TimeFormat plugin loaded - always visible mode');  
  }  
  
  if (!window.lampac_timeformat_plugin) startPlugin();  
  
})();
