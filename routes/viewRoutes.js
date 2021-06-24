const express = require('express');

const viewController = require(`${__dirname}/../controllers/viewController`);
const authController = require(`${__dirname}/../controllers/authController`);
const bookingController = require(`${__dirname}/../controllers/bookingController`);

const router = express.Router();

router.get('/me', authController.protect, viewController.getAccount);
router.get(
  '/my-bookings',
  authController.protect,
  viewController.getMyBookings
);

// Updating user data without API
// router.post(
//   '/submit-user-data',
//   authController.protect,
//   userController.getMe,
//   userController.validatePostDataBeforeUpdate,
//   viewController.updateUserData
// );

router.use(authController.isLoggedIn);

router.get(
  '/',
  bookingController.createBookingCheckout,
  viewController.getOverview
);
router.get('/tour/:slug', viewController.getTour);
router.get('/login', viewController.getLoginForm);

module.exports = router;
