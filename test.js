(function () {  
  "use strict";  
    
  let manifest = {    
    type: 'modification',    
    version: '1.0.0',    
    name: 'Timeline Always Visible',    
    description: 'Делает card-watched всегда видимым с момента загрузки'  
  }    
      
  Lampa.Manifest.plugins = manifest    
  
  function startPlugin() {  
    // Добавляем CSS стиль для постоянного отображения  
    let style = document.createElement('style')  
    style.textContent = `  
      .card-watched {  
        display: block !important;  
      }  
    `  
    document.head.appendChild(style)  
      
    // Переопределяем шаблон timeline  
    Lampa.Template.add('timeline_details', `<span class="time-line-details" data-hash="{hash}">  
<b a="t">{time}</b> / <b a="d">{duration}</b>  
</span>`)  
      
    // Переопределяем функцию форматирования  
    Lampa.Timeline.format = function(params) {  
      function toMM_HH(seconds) {  
        if (!seconds) return '00:00'  
        const hours = Math.floor(seconds / 3600)  
        const minutes = Math.floor((seconds % 3600) / 60)  
        return `${String(minutes).padStart(2, '0')}:${String(hours).padStart(2, '0')}`  
      }  
        
      let road = {  
        percent: params.percent + '%',  
        time: toMM_HH(params.time),  
        duration: toMM_HH(params.duration)  
      }  
      return road  
    }  
  
    // Принудительно инициализируем watched для всех карточек  
    function initAllWatched() {  
      if (!Lampa.Storage.field('card_episodes')) return  
        
      document.querySelectorAll('.card').forEach(card => {  
        // Проверяем что у карточки есть модуль watched  
        if (card.card && card.card.emit && card.card.watched_checked !== true) {  
          // Принудительно вызываем событие watched  
          card.card.emit('watched')  
        }  
      })  
    }  
  
    // Запускаем инициализацию с задержкой  
    setTimeout(initAllWatched, 2000)  
      
    // Отслеживаем изменения DOM  
    const observer = new MutationObserver((mutations) => {  
      let shouldInit = false  
      mutations.forEach(mutation => {  
        mutation.addedNodes.forEach(node => {  
          if (node.nodeType === 1 && node.classList && node.classList.contains('card')) {  
            shouldInit = true  
          }  
        })  
      })  
      if (shouldInit) {  
        setTimeout(initAllWatched, 1000)  
      }  
    })  
      
    observer.observe(document.body, { childList: true, subtree: true })  
      
    // Также отслеживаем изменение настроек  
    Lampa.Listener.follow('state', (e) => {  
      if (e.name === 'card_episodes') {  
        setTimeout(initAllWatched, 500)  
      }  
    })  
  }  
    
  if (window.appready) { startPlugin(); }  
  else {  
    Lampa.Listener.follow("app", function (e) {  
      if (e.type === "ready") { startPlugin(); }  
    });  
  }  
})();
