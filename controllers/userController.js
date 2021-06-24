const multer = require('multer');
const sharp = require('sharp');

const User = require(`${__dirname}/../models/userModel`);
const AppError = require(`${__dirname}/../utils/appError`);
const catchAsyncError = require(`${__dirname}/../utils/catchAsyncError`);
const factory = require(`${__dirname}/handlerFactory`);

// For uploading images using multer

// Use disk storage for uploading images
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // user-user_id-timestamp.jpg
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user._id}-${Date.now()}.${ext}`);
//   },
// });

// Store the image in memory buffer
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new AppError('Please upload only images', 400), false);
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

// Only allow certain fields to be updated
const filterObjForUpdate = (obj, allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.validatePostDataBeforeUpdate = (req, res, next) => {
  // Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm)
    return next(new AppError('This route is not for changing password.'), 400);

  // Allow only certain fields to be edited
  const allowedFields = ['name', 'email'];

  // Only admin can edit role
  if (req.user.role === 'admin') allowedFields.push('role');

  req.body = { ...filterObjForUpdate(req.body, allowedFields) };
  next();
};

// Get All users
exports.getAllUsers = factory.getAll(User);

exports.getMe = (req, res, next) => {
  req.params.id = req.user._id;
  next();
};

exports.getUser = factory.getOne(User);

// Do NOT Update Passwords here
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

// exports.updateUserData = factory.updateOne(User);

// Logged in user can deactivate his account
exports.deactivateUserAccount = catchAsyncError(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user.id,
    { isActive: false },
    { useFindAndModify: false }
  );

  res.json({ status: 'success', message: 'Deactivated account!' });
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsyncError(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user._id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`); // Get image from buffer and save to destination

  next();
});

exports.updateUserData = catchAsyncError(async (req, res, next) => {
  if (req.file) req.body.photo = req.file.filename;

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  if (!user) {
    return next(new AppError(`No user found with id: ${req.params.id}`, 404));
  }

  // upload.single('photo');
  // if (req.file) user.photo = req.file.filename;
  // user = await user.save();

  res.json({ status: 'success', data: { user } });
});
