/* eslint-disable */
import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './auth';
import { updateSettings } from './updateAccount';
import { bookTour } from './stripe';

const mapBox = document.getElementById('map');
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await login(email, password);
  });
}

const logoutBtn = document.querySelector('.nav__el--logout');
if (logoutBtn)
  logoutBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    await logout();
  });

const updateDataForm = document.getElementById('update-user-data-form');
if (updateDataForm)
  updateDataForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);

    const files = document.getElementById('photo').files;
    if (files.length > 0) form.append('photo', files[0]);

    await updateSettings('data', form);
  });

const updatePasswordForm = document.getElementById('update-user-password-form');
if (updatePasswordForm)
  updatePasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const currentPassword = document.getElementById('password-current').value;
    const newPassword = document.getElementById('password-new').value;
    const newPasswordConfirm = document.getElementById('password-new-confirm')
      .value;
    await updateSettings('password', {
      currentPassword,
      newPassword,
      newPasswordConfirm,
    });
  });

const bookTourBtn = document.getElementById('book-tour-btn');
if (bookTourBtn)
  bookTourBtn.addEventListener('click', async (event) => {
    event.target.textContent = 'Processing...';
    const { tourId } = event.target.dataset;
    bookTour(tourId);
  });
