(function(){  
    Lampa.Select.show = function(params){  
        if(params.title === Lampa.Lang.translate('title_out')){  
            const confirm = params.items.find(i=>i.out);  
            if(confirm && params.onSelect) params.onSelect(confirm);  
            return;  
        }  
        return Lampa.Select.show.original.call(this, params);  
    };  
    Lampa.Select.show.original = Lampa.Select.show;  
})();
