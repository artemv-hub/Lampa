(function(){  
    // Сначала сохраняем оригинал  
    Lampa.Select.show.original = Lampa.Select.show;  
      
    // Потом переопределяем  
    Lampa.Select.show = function(params){  
        if(params.title === Lampa.Lang.translate('title_out')){  
            const confirm = params.items.find(i=>i.out);  
            if(confirm && params.onSelect) {  
                // Выполняем полный выход как в оригинале  
                Lampa.Activity.out();  
                Lampa.Controller.toggle(Lampa.Controller.enabled().name);  
                Lampa.App.close();  
                return;  
            }  
        }  
        return Lampa.Select.show.original.call(this, params);  
    };  
})();
