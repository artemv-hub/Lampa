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
  
  // Функция обновления отображения времени на карточке  
  function updateCardTimeDisplay(cardElement, hash) {  
    var acc = Lampa.Storage.get('account', '{}');  
    var viewedKey = 'file_view' + (acc.profile ? '_' + acc.profile.id : '');  
    var viewed = Lampa.Storage.cache(viewedKey, 10000, {});  
      
    var timeData = viewed[hash];  
      
    if (timeData && timeData.time && timeData.duration) {  
      var timeText = formatTime(timeData.time) + ' / ' + formatTime(timeData.duration);  
        
      // Находим элемент с процентами и заменяем текст  
      var percentElement = cardElement.find('.card__view-percent');  
      if (percentElement.length) {  
        percentElement.text(timeText);  
      }  
        
      // Также обновляем линию прогресса, если есть  
      var lineElement = cardElement.find('.card-watched__line');  
      if (lineElement.length) {  
        lineElement.attr('data-time', timeText);  
      }  
    }  
  }  
  
  // Перехватываем создание карточек  
  function patchCardCreation() {  
    Lampa.Listener.follow('card', function(e) {  
      if (e.object && e.object.card) {  
        var card = e.object.card;  
        var hash = card.hash || (card.id + '_' + (card.name ? 'tv' : 'movie'));  
          
        // Обновляем сразу при создании карточки  
        updateCardTimeDisplay($(card), hash);  
      }  
    });  
  }  
  
  // Перехватываем обновление данных таймкодов  
  function patchTimecodeUpdate() {  
    Lampa.Listener.follow('lampac', function(e) {  
      if (e.type == 'timecode_pullFromServer') {  
        // После обновления таймкодов с сервера, обновляем все видимые карточки  
        setTimeout(function() {  
          $('.card').each(function() {  
            var cardElement = $(this);  
            var cardData = cardElement.data('card');  
            if (cardData) {  
              var hash = cardData.hash || (cardData.id + '_' + (cardData.name ? 'tv' : 'movie'));  
              updateCardTimeDisplay(cardElement, hash);  
            }  
          });  
        }, 100);  
      }  
    });  
  }  
  
  // Периодическое обновление всех карточек  
  function startPeriodicUpdate() {  
    setInterval(function() {  
      $('.card').each(function() {  
        var cardElement = $(this);  
        var cardData = cardElement.data('card');  
        if (cardData) {  
          var hash = cardData.hash || (cardData.id + '_' + (cardData.name ? 'tv' : 'movie'));  
          updateCardTimeDisplay(cardElement, hash);  
        }  
      });  
    }, 5000); // Обновляем каждые 5 секунд  
  }  
  
  function startPlugin() {  
    window.lampac_timeformat_plugin = true;  
      
    patchCardCreation();  
    patchTimecodeUpdate();  
    startPeriodicUpdate();  
      
    console.log('TimeFormat plugin loaded - always visible mode');  
  }  
  
  if (!window.lampac_timeformat_plugin) startPlugin();  
  
})();
