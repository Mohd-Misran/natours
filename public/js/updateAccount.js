/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// type will be either 'password' or 'data'
export const updateSettings = async (type, data) => {
  try {
    const url =
      type === 'password'
        ? 'http://127.0.0.1:3000/api/v1/users/update-my-password'
        : 'http://127.0.0.1:3000/api/v1/users/update-my-data';
    const res = await axios({ method: 'PATCH', url: url, data });

    if (res.data.status === 'success') {
      showAlert('success', 'Changes are saved.');
      location.reload();
    }
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};
