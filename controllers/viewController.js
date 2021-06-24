const Tour = require(`${__dirname}/../models/tourModel`);
const Booking = require(`${__dirname}/../models/bookingModel`);
const catchAsyncError = require(`${__dirname}/../utils/catchAsyncError`);
const AppError = require(`${__dirname}/../utils/appError`);

exports.getOverview = catchAsyncError(async (req, res, next) => {
  // 1) get tour data from collection
  const tours = await Tour.find();

  // 2) render template using tour data
  res.render('overview', { title: 'All tours', tours });
});

exports.getTour = catchAsyncError(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }

  res.render('tour', { title: tour.name, tour });
});

exports.getLoginForm = catchAsyncError(async (req, res, next) => {
  res.render('login', { title: 'Login' });
});

exports.getAccount = (req, res) => {
  res.render('account', { title: req.user.name });
};

// Updating user data without API
// exports.updateUserData = catchAsyncError(async (req, res, next) => {
//   const user = await User.findByIdAndUpdate(req.user.id, req.body, {
//     new: true,
//     runValidators: true,
//   });
//   res.locals.user = user;
//   res.render('account', { title: req.user.name });
// });

exports.getMyBookings = catchAsyncError(async (req, res, next) => {
  // 1) Find all bookings made by current user
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find the booked tours
  const tourIds = bookings.map((el) => el.tour.id);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.render('overview', { title: 'My Bookings', tours });
});
