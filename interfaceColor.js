(function () {
  "use strict";
  
  let manifest = {  
    type: 'interface',  
    version: '3.3.2',  
    name: 'Цветные рейтинги и качество',  
    component: 'color_ratings_quality'  
  }  
    
  Lampa.Manifest.plugins = manifest  

  function colorRating() {
    const colorR = rating => {
      if (rating >= 9) return "#3498db";
      if (rating >= 7) return "#2ecc71";
      if (rating >= 6) return "#f1c40f";
      if (rating >= 4) return "#e67e22";
      if (rating >= 0) return "#e74c3c";
      return null;
    };
    
    const elements = document.querySelectorAll(".card__vote, .full-start__rate > div, .info__rate > span");
    
    elements.forEach(el => {
      const rating = parseFloat(el.textContent.trim());
      const color = colorR(rating);
      if (color) el.style.color = color;
    });
  }
  
  function colorQuality() {
    const colorQ = [
      { qualities: ["2160p"], color: "#3498db" },
      { qualities: ["1080p"], color: "#2ecc71" },
      { qualities: ["1080i", "720p", "bdrip", "hdrip", "dvdrip", "web-dl", "webrip", "iptv", "hdtv", "tv"], color: "#f1c40f" },
      { qualities: ["480p", "camrip", "vhsrip", "tc", "ts"], color: "#e67e22" },
    ];
    
    const elements = document.querySelectorAll(".card__quality");
    
    elements.forEach(el => {
      const quality = el.textContent.trim().toLowerCase();
      const found = colorQ.find(qc => qc.qualities.some(q => quality.includes(q)));
      if (found) {
        el.style.color = found.color;
      }
    });
  }
  
  function startPlugin() {
    colorRating();
    colorQuality();
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            colorRating();
            colorQuality();
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => { colorRating(); colorQuality(); }, 200);
    });
  }
  
  if (window.appready) { startPlugin(); }
  else {
    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready") { startPlugin(); }
    });
  }
})();
