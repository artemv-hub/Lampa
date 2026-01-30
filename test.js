listener.follow('backward',(event)=>{  
    let noout = Platform.is('browser') || Platform.desktop();  
  
    if(event.count == 1 && Date.now() > start_time + (1000 * 2) && !noout){  
        let enabled = Controller.enabled().name;  
          
        out();  
        Controller.toggle(enabled);  
        App.close();  
    }  
});
