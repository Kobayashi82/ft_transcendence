document.addEventListener('DOMContentLoaded', () => {
    const routes = {
      '/': './pages/home.html',
      '/login': './pages/login.html'
    };
  
    function loadPage(url) {
      const path = routes[url] || routes['/'];
      fetch(path)
        .then(response => response.text())
        .then(html => {
          document.getElementById('app').innerHTML = html;
  
          // Cargar el script específico de la página (home.js)
          if (url === '/') {
            const script = document.createElement('script');
            script.src = './assets/js/home.js';
            document.body.appendChild(script);
          }
        })
        .catch(err => console.error('Error al cargar la página:', err));
    }
  
    document.querySelectorAll('[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.getAttribute('href');
        history.pushState(null, null, url);
        loadPage(url);
      });
    });
  
    window.addEventListener('popstate', () => {
      loadPage(window.location.pathname);
    });
  
    // Cargar la página inicial
    loadPage(window.location.pathname);
  });
  