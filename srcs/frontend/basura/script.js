function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}

document.addEventListener('click', function(event) {
    const profileImage = document.getElementById('profile-image');
    const profileMenu = document.getElementById('profile-menu');
    if (profileMenu.style.display === 'block' && !profileImage.contains(event.target) && !profileMenu.contains(event.target)) {
        profileMenu.style.display = 'none';
    }
});