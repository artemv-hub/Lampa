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
