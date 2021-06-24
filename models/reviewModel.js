const mongoose = require('mongoose');

const Tour = require(`${__dirname}/tourModel`);
const AppError = require(`${__dirname}/../utils/appError`);

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [true, 'Review cannot be empty'],
    trim: true,
  },
  rating: { type: Number, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now() },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Review must belong to a tour'],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Review must belong to a user'],
  },
});

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// reviewSchema.pre(/^find/, function (next) {
//   this.populate({ path: 'user', select: '-__v' });
//   next();
// });

reviewSchema.statics.calculateRatingsAverage = async function (tourId) {
  // console.log(tourId);
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: 'tour',
        nRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRatings,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 0,
    });
  }
};

reviewSchema.post('save', async (doc, next) => {
  await doc.constructor.calculateRatingsAverage(doc.tour);
  next();
});

reviewSchema.post(/^findOneAnd/, async (doc, next) => {
  try {
    await doc.constructor.calculateRatingsAverage(doc.tour);
  } catch (err) {
    return next(new AppError('Requested object does not exist.', 400));
  }
  next();
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
