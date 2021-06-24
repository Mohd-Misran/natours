/* eslint-disable*/
import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51IBh2aAL0tKSBG8QKvHyQYyvWtaQdWN8Na70Gn0TvzhznxhFjkhqtgFkY98Iqc5Mp6r2P04Jgybvris4PqQXwe9J00qps5v1hj'
);

export const bookTour = async (tourId) => {
  // 1) Get session from the server
  try {
    const res = await axios({
      method: 'GET',
      url: `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`,
    });
    console.log(res);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({ sessionId: res.data.session.id });
  } catch (err) {
    showAlert('error', err);
  }
};
