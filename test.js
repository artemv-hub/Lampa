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
                    ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`  
                    : `${minutes}:${secs.toString().padStart(2, '0')}`;  
            }  
              
            return originalSecondsToTimeHuman.apply(this, arguments);  
        };  
          const originalView = Lampa.Timeline.view;  
  
Lampa.Timeline.view = function(hash) {  
    const result = originalView.call(this, hash);  
      
    // Для фильмов всегда устанавливаем time, чтобы не было процентов  
    if (result && result.percent && !result.time) {  
        result.time = Math.floor(result.percent * 90); // пример: 50% = 45 секунд для 90-секундного видео  
    }  
      
    return result;  
};
        console.log('[Fix Time Format] Plugin loaded');  
    }  
      
    init();  
})();