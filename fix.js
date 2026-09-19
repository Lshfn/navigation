(() => {
  
  const portfolioNav = document.querySelector('.nav[data-destination="official"]');
  const portfolioLabel = portfolioNav?.querySelector('text');

  if (portfolioLabel) {
    portfolioLabel.textContent = 'portfolio';
  }

  const style = document.createElement('style');
  style.textContent = `
    html, body, body *, svg, svg * {
      cursor: url("https://dariaivans.neocities.org/portfolio_img/2251-48x48x32.png") 0 0, auto !important;
    }
  `;
  document.head.appendChild(style);


  const nativeOpen = window.open.bind(window);

  window.open = function(url, target, features) {
    const destination =
      url === 'official-portfolio.html'
        ? 'portfolio.html'
        : url;

    return nativeOpen(destination, target, features);
  };
})();
