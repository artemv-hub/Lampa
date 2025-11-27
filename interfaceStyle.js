(function () {
  "use strict";
  
  let manifest = {  
    type: 'interface',  
    version: '3.4.0',  
    name: 'UI Style',  
    component: 'ui_style'  
  }  
    
  Lampa.Manifest.plugins = manifest  

  const style = document.createElement('style');
  style.textContent = `
    .full-start__title-original { font-size: 1.6em; margin-bottom: 0em; }
    .full-start-new__buttons .full-start__button:not(.focus) span { display: unset; }

    .card__quality { font-weight: bold; font-size: 1.2em; left: 0.2em; bottom: 0.2em; border-radius: 1em; padding: 0.2em 0.5em; color: #fff; background: rgba(0, 0, 0, 0.5); text-transform: none; }
    .card__vote { font-weight: bold; font-size: 1.2em; right: 0.2em; bottom: 0.2em; }
    .card__type { top: 2.2em; }
    .card__icons { top: 1.6em; }
    .card__marker { top: 0.1em; bottom: unset; left: 50%; transform: translate(-50%); }
    .card__marker > span { font-size: 0.8em; max-width: 16em; }
    `;
  document.head.appendChild(style);

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
