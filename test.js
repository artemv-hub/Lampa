(function () {  
  "use strict";  
    
  let manifest = {    
    type: 'modification',    
    version: '1.0.0',    
    name: 'Timeline Time Display',    
    description: 'Отображает время просмотра вместо процента в card-watched'  
  }    
      
  Lampa.Manifest.plugins = manifest    
  
  function startPlugin() {  
    // Переопределяем функцию форматирования таймлайна  
    Lampa.Timeline.format = function(params) {  
      let road = {  
        percent: params.time ? Lampa.Utils.secondsToTimeHuman(params.time) : params.percent + '%',  
        time: Lampa.Utils.secondsToTimeHuman(params.time),  
        duration: Lampa.Utils.secondsToTimeHuman(params.duration)  
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
