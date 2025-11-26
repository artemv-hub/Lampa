(function() {  
    'use strict';  
      
    function init() {  
        if (!window.Lampa || !Lampa.Utils) {  
            setTimeout(init, 500);  
            return;  
        }  
          
        // Переопределяем secondsToTimeHuman для короткого формата  
        const originalSecondsToTimeHuman = Lampa.Utils.secondsToTimeHuman;  
          
        Lampa.Utils.secondsToTimeHuman = function(seconds) {  
            // Для фильмов возвращаем короткий формат  
            if (typeof seconds === 'number' && seconds > 0) {  
                const hours = Math.floor(seconds / 3600);  
                const minutes = Math.floor((seconds % 3600) / 60);  
                const secs = Math.floor(seconds % 60);  
                  
                return hours > 0   
                    ? ${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}  
                    : ${minutes}:${secs.toString().padStart(2, '0')};  
            }  
              
            return originalSecondsToTimeHuman.apply(this, arguments);  
        };  
          
        console.log('[Fix Time Format] Plugin loaded');  
    }  
      
    init();  
})();