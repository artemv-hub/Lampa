(function() {  
    'use strict';  
      
    // Ждем инициализации Lampa  
    if (window.Lampa) {  
        startPlugin();  
    } else {  
        window.addEventListener('lampa:ready', startPlugin);  
    }  
      
    function startPlugin() {  
        // Сохраняем оригинальную функцию format  
        let originalFormat = Lampa.Timeline.format;  
          
        // Переопределяем format для изменения данных  
        Lampa.Timeline.format = function(params) {  
            let result = originalFormat(params);  
              
            // Заменяем процент на формат времени HH:MM  
            if (params.time && params.duration) {  
                result.percent = Lampa.Utils.secondsToTime(params.time, true) + '/' +   
                               Lampa.Utils.secondsToTime(params.duration, true);  
            }  
              
            return result;  
        };  
          
        // Переопределяем details для постоянного отображения  
        let originalDetails = Lampa.Timeline.details;  
          
        Lampa.Timeline.details = function(params, str = '') {  
            let line = originalDetails(params, str);  
            line.removeClass('hide'); // Всегда показываем  
            return line;  
        };  
          
        console.log('Timeline format plugin loaded');  
    }  
})();