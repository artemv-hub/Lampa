(function () {  
  "use strict";  
    
  let manifest = {    
    type: 'modification',    
    version: '1.0.0',    
    name: 'Timeline Always Visible',    
    description: 'Делает card-watched всегда видимым, а не только при наведении'  
  }    
      
  Lampa.Manifest.plugins = manifest    
  
  function startPlugin() {  
    // Добавляем CSS стиль для постоянного отображения card-watched  
    let style = document.createElement('style')  
    style.textContent = `  
      .card-watched {  
        display: block !important;  
      }  
    `  
    document.head.appendChild(style)  
      
    // Также переопределяем шаблон timeline для формата MM:HH  
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
  }  
    
  if (window.appready) { startPlugin(); }  
  else {  
    Lampa.Listener.follow("app", function (e) {  
      if (e.type === "ready") { startPlugin(); }  
    });  
  }  
})();
