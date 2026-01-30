(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'other',  
    version: '1.0.0',  
    name: 'Direct Exit',  
    component: 'direct_exit'  
  };  
  
  Lampa.Manifest.plugins = manifest;  
  
  function init() {  
    // Переопределяем обработчик кнопки "назад" для прямого выхода  
    Lampa.Listener.follow('backward', (event) => {  
      let noout = Lampa.Platform.is('browser') || Lampa.Platform.desktop();  
  
      if (event.count == 1 && Date.now() > Lampa.Activity.start_time + (1000 * 2) && !noout) {  
        let enabled = Lampa.Controller.enabled().name;  
          
        // Прямой выход без меню подтверждения  
        Lampa.Activity.out();  
        Lampa.Controller.toggle(enabled);  
        Lampa.App.close();  
      }  
    });  
  }  
  
  if (window.appready) {   
    init();   
  }  
  else {  
    Lampa.Listener.follow("app", function (e) {  
      if (e.type === "ready") {   
        init();   
      }  
    });  
  }  
})();
