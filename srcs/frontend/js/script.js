document.addEventListener('DOMContentLoaded', function() {
    loadPage();

    // Manejador para el formulario de login
    document.addEventListener('submit', function(event) {
        if (event.target && event.target.id === 'login-form') {
            event.preventDefault();
            loadMainPage();
            history.pushState({page: 'main'}, '', '/main');
        }
    });
    
    // Maneja los eventos de popstate para navegar hacia atrás y adelante
    window.onpopstate = function(event) {
        if (event.state && event.state.page) {
            switch (event.state.page) {
                case 'main':
                    loadMainPage();
                    break;
                case 'stats':
                    loadStatsPage();
                    break;
                case 'login':
                default:
                    loadLoginPage();
                    break;
            }
        } else {
            loadLoginPage(); // Si no hay estado, cargamos la página de login
        }
    };
});

function isAuthenticated() {
    // Simula que el usuario no está autenticado
    return true;
}

function loadPage() {
    if (isAuthenticated()) {
        loadMainPage();
        history.replaceState({page: 'main'}, '', '/main');
    } else {
        loadLoginPage();
        history.replaceState({page: 'login'}, '', '/login');
    }
}

function loadLoginPage() {
    fetch('views/login.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('app').innerHTML = html;
        })
        .catch(err => console.error('Error al cargar la página de login:', err));
}

function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    menu.style.display = (menu.style.display === 'none' || menu.style.display === '') ? 'block' : 'none';
}

document.addEventListener('click', function(event) {
    const profileImage = document.getElementById('profile-image');
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu.style.display === 'block' && !profileImage.contains(event.target) && !profileMenu.contains(event.target)) {
        profileMenu.style.display = 'none';
    }
});

function loadMainPage() {
    fetch('views/main.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('app').innerHTML = html;

            // Botón para ver estadísticas
            document.getElementById('view-stats-button').addEventListener('click', function() {
                loadStatsPage();
                history.pushState({page: 'stats'}, '', '/stats');
            });

            // Botón para ir al login (cambiado a "login-button")
            document.getElementById('login-button').addEventListener('click', function() {
                loadLoginPage();
                history.pushState({page: 'login'}, '', '/login');
            });
        })
        .catch(err => console.error('Error al cargar la página principal:', err));
}

function loadStatsPage() {
    fetch('views/stats.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('app').innerHTML = html;
            document.getElementById('back-to-main').addEventListener('click', function() {
                loadMainPage();
                history.pushState({page: 'main'}, '', '/main');
            });
        })
        .catch(err => console.error('Error al cargar la página de estadísticas:', err));
}

