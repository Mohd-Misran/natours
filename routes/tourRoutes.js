const express = require('express');

const tourController = require(`${__dirname}/../controllers/tourController`);
const authController = require(`${__dirname}/../controllers/authController`);
// const reviewController = require(`${__dirname}/../controllers/reviewController`);

const reviewRouter = require(`${__dirname}/reviewRoutes`);

const router = express.Router();

// // Param Middleware
// // router.param('id', tourController.checkId);

// Merge routers (Ex:- POST 127.0.0.1:3000/api/v1/tours/12345/reviews)
router.use('/:tourId/reviews', reviewRouter);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopFiveCheapTours, tourController.getAllTours);

router.route('/stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

// Ex:- /within/250/center/-40,45/unit/mi
router
  .route('/within/:distance/center/:coordinates/unit/:unit')
  .get(tourController.getToursWithin);

router
  .route('/distances/:coordinates/unit/:unit')
  .get(tourController.getDistances);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

// Alternatively way and much better way of doing this is merging routers (see top ⬆️)
// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview
//   );

module.exports = router;
