const express = require('express');

const reviewController = require(`${__dirname}/../controllers/reviewController`);
const authController = require(`${__dirname}/../controllers/authController`);

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.tourReviewsFilter, reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourAndUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('admin', 'user'),
    reviewController.confirmReviewUser,
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('admin', 'user'),
    reviewController.confirmReviewUser,
    reviewController.deleteReview
  );

module.exports = router;
