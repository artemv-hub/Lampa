function startPlugin() {  
    window.plugin_direct_exit_ready = true  
  
    let manifest = {  
        type: 'other',  
        version: '1.0.0',  
        name: 'Прямой выход',  
        description: 'Выход из приложения без диалога подтверждения',  
        component: 'direct_exit'  
    }  
      
    Lampa.Manifest.plugins = manifest  
  
    function init() {  
        // Перехватываем событие backward для прямого выхода  
        Lampa.Listener.follow('backward', (event) => {  
            let noout = Lampa.Platform.is('browser') || Lampa.Platform.desktop()  
              
            if(event.count == 1 && Date.now() > start_time + (1000 * 2) && !noout){  
                // Прямой выход без диалога  
                Lampa.App.close()  
                  
                // Предотвращаем показ стандартного диалога  
                event.prevent = true  
            }  
        })  
    }  
  
    // Определяем start_time как в activity.js  
    let start_time = Date.now()  
  
    if(window.appready) init()  
    else{  
        Lampa.Listener.follow('app', function (e) {  
            if (e.type == 'ready') init()  
        })  
    }  
}  
  
if(!window.plugin_direct_exit_ready) startPlugin()
