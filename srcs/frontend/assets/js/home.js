const profileImg = document.querySelector('.profile-img');
if (profileImg) {
  profileImg.addEventListener('click', () => {
    alert('¡Has hecho clic en tu foto de perfil!');
  });
} else {
  console.error('Elemento .profile-img no encontrado');
}
