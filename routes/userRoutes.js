const express = require('express');

const userController = require(`${__dirname}/../controllers/userController`);
const authController = require(`${__dirname}/../controllers/authController`);

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

router.use(authController.protect);
// routes below this middleware function require user to be logged in

router
  .route('/')
  .get(authController.restrictTo('admin'), userController.getAllUsers);

router.get('/me', userController.getMe, userController.getUser);
router.patch('/update-my-password', authController.updateUserPassword);
router.patch(
  '/update-my-data',
  userController.getMe,
  userController.validatePostDataBeforeUpdate,
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateUserData
);
router.delete('/deactivate-account', userController.deactivateUserAccount);

router
  .route('/:id')
  .get(authController.restrictTo('admin'), userController.getUser)
  .patch(
    authController.restrictTo('admin'),
    userController.validatePostDataBeforeUpdate,
    userController.updateUser
  )
  .delete(authController.restrictTo('admin'), userController.deleteUser);

module.exports = router;
