const Review = require(`${__dirname}/../models/reviewModel`);
const factory = require(`${__dirname}/handlerFactory`);

const AppError = require(`${__dirname}/../utils/appError`);

// Middleware to apply initial filter to get reviews based on tour
exports.tourReviewsFilter = (req, res, next) => {
  if (req.params.tourId) req.initialFilter = { tour: req.params.tourId };
  next();
};

exports.getAllReviews = factory.getAll(Review);

// exports.getAllReviews = catchAsyncError(async (req, res, next) => {
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   const reviews = await Review.find(filter);
//   res.json({ status: 'success', results: reviews.length, data: { reviews } });
// });

exports.getReview = factory.getOne(Review);

// Middleware to set tour id and user id before executing createReview()
exports.setTourAndUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user._id;
  next();
};

exports.createReview = factory.createOne(Review);

exports.confirmReviewUser = async (req, res, next) => {
  if (req.user.role === 'admin') return next();

  const review = await Review.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!review)
    return next(new AppError('You are not the owner of this review', 403));
  next();
};

exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
