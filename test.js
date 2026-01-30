(function(){  
    const originalSelectShow = Lampa.Select.show;  
      
    Lampa.Select.show = function(params){  
        if(params.title === Lampa.Lang.translate('title_out')){  
            const confirm = params.items.find(i=>i.out);  
            if(confirm && params.onSelect) params.onSelect(confirm);  
            return;  
        }  
        return originalSelectShow.call(this, params);  
    };  
})();
