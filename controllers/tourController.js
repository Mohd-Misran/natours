const multer = require('multer');
const sharp = require('sharp');

const Tour = require(`${__dirname}/../models/tourModel`);
const catchAsyncError = require(`${__dirname}/../utils/catchAsyncError`);
const AppError = require(`${__dirname}/../utils/appError`);
const factory = require(`${__dirname}/handlerFactory`);

// Handler function for Param Middleware
// exports.checkId = (req, res, next, val) => {
//   if (val * 1 > tours.length) {
//     return res.status(404).json({ status: 'fail', message: 'Oos! Invalid ID' });
//   }
//   next();
// };

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new AppError('Please upload only images', 400), false);
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

// Upload to multiple fields
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsyncError(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Process cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];
  const allImages = req.files.images.map(async (file, i) => {
    const imageFilename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
    req.body.images.push(imageFilename);
    await sharp(req.files.images[i].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${imageFilename}`);
  });

  await Promise.all(allImages);

  next();
});

// Upload multiple images to one field
// exports.uploadTourImages = upload.array('images', 3);

// Factory Handler Functions for making CRUD easier to use
exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews', select: '-__v' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);

// Get All Tours
// exports.getAllTours = catchAsyncError(async (req, res, next) => {
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   res.json({
//     status: 'success',
//     user: req.user.name,
//     requestedAt: req.requestTime,
//     results: tours.length,
//     data: { tours },
//   });
// });

// Get Tour by Id

// Create New Tour
// exports.createTour = catchAsyncError(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({ status: 'success', data: { tour: newTour } });
// });

// Update Tour by Id (NOTE: not actually updating, just testing to see if API is working)
// exports.updateTour = catchAsyncError(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//     useFindAndModify: false,
//   });

//   if (!tour) {
//     return next(new AppError(`No tour found with id: ${req.params.id}`, 404));
//   }

//   res.json({ status: 'success', data: { tour } });
// });

// Delete Tour by Id (NOTE: not actually updating, just testing to see if API is working)
// exports.deleteTour = catchAsyncError(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError(`No tour found with id: ${req.params.id}`, 404));
//   }

//   res.json({ status: 'success', message: 'Deleted successfully!' });
// });

exports.deleteTour = factory.deleteOne(Tour);

exports.aliasTopFiveCheapTours = (req, res, next) => {
  req.query = {
    limit: '5',
    sort: '-ratingsAverage price',
    fields: 'name price ratingsAverage summary difficulty',
  };
  next();
};

exports.getTourStats = catchAsyncError(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);

  res.json({ status: 'success', data: { stats } });
});

exports.getMonthlyPlan = catchAsyncError(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTours: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: { month: 1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.json({ status: 'success', results: plan.length, data: { plan } });
});

exports.getToursWithin = catchAsyncError(async (req, res, next) => {
  const { distance, coordinates, unit } = req.params;
  const [lat, lng] = coordinates.split(',');

  // To get radius sphere: divide the distance by radius of earth
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng)
    return next(new AppError('Please provide coordinates', 400));

  const options = { $centerSphere: [[lng, lat], radius] };

  const tours = await Tour.find({ startLocation: { $geoWithin: options } });

  res.json({
    status: 'success',
    message: 'Booyah',
    results: tours.length,
    data: { tours },
  });
});

exports.getDistances = catchAsyncError(async (req, res, next) => {
  const { coordinates, unit } = req.params;
  const [lat, lng] = coordinates.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng)
    return next(new AppError('Please provide coordinates', 400));

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng * 1, lat * 1] },
        distanceField: 'distanceInKm',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: { name: 1, distanceInKm: 1, distanceInMiles: 1 },
    },
  ]);

  res.json({
    status: 'success',
    message: 'Booyah',
    data: { distances },
  });
});
