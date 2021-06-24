const crypto = require('crypto');
const { promisify } = require('util');

const jwt = require('jsonwebtoken');

const User = require(`${__dirname}/../models/userModel`);
const AppError = require(`${__dirname}/../utils/appError`);
const catchAsyncError = require(`${__dirname}/../utils/catchAsyncError`);
const Email = require(`${__dirname}/../utils/sendEmail`);

const signToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRATION,
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRATION * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Prevent Cross Site Scripting attacks
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({ status: 'success', token, data: { user } });
};

// Signup new user
exports.signup = catchAsyncError(async (req, res, next) => {
  const { name, email, role, password, passwordConfirm } = req.body;
  const newUser = await User.create({
    name: name,
    email: email,
    role: role,
    password: password,
    passwordConfirm: passwordConfirm,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  sendToken(newUser, 201, res);
});

// Login new user
exports.login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password have been entered
  if (!email || !password)
    return next(new AppError('Please provide email and password'), 400);

  // 2) Check if user exists and password is correct
  const user = await User.findOne({ email: email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Incorrect email or password'), 401);

  // 3) If all ok, send jwt token to client
  sendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.json({ status: 'success', message: 'Logged out successfully' });
};

// Protect routes from unauthorized (not logged in) users
exports.protect = catchAsyncError(async (req, res, next) => {
  // 1) Get token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in', 401));
  }

  // 2) Verification of the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user exists
  const user = await User.findById(decoded.id);
  if (!user)
    return next(
      new AppError('The user belonging to this token does not exist', 401)
    );

  // 4) Check if user changed password after the token was issued

  if (user.changedPasswordAfter(decoded.iat))
    return next(
      new AppError('Password has been changed. Please login again', 401)
    );

  req.user = user;
  res.locals.user = user;
  next();
});

// Only for rendered pages
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const user = await User.findById(decoded.id);
      if (!user) return next();
      if (user.changedPasswordAfter(decoded.iat)) return next();

      res.locals.user = user;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// Restrict routes to users based on roles
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return next(
      new AppError('You do not have permission to perform this action', 403)
    );
  next();
};

// Forgot password
exports.forgotPassword = catchAsyncError(async (req, res, next) => {
  // 1) Get user based on POSTed email address
  let user = await User.findOne({ email: req.body.email });

  if (!user)
    return next(new AppError('There is no user with this email address', 404));

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  user = await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email

  // const message = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}`;

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/reset-password/${resetToken}`;

    // await sendEmail({
    //   email: user.email,
    //   subject: 'Password Reset Link',
    //   message: message,
    // });

    await new Email(user, resetURL).sendPasswordReset();

    res.json({ status: 'success', message: 'Token sent to mail!' });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error in sending the email! Try again later',
        500
      )
    );
  }
});

// Reset password
exports.resetPassword = catchAsyncError(async (req, res, next) => {
  // 1) Get user based on Token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  let user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError('Token expired! Please try again.', 400));

  // 2) If token has not expired, and there is user, set the new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user = await user.save();

  // 3) Log the user in, send JWT
  sendToken(user, 200, res);
});

// Logged in user updates password
exports.updateUserPassword = catchAsyncError(async (req, res, next) => {
  // 1) Check if all fields are entered
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;
  if (!currentPassword || !newPassword || !newPasswordConfirm)
    return next(new AppError('All fields are required', 400));

  // 2) Get user from collection
  let user = await User.findById(req.user.id).select('+password');

  // 3) Check if POSTed current password is correct
  if (!(await user.correctPassword(currentPassword, user.password)))
    return next(new AppError('Current password is wrong'), 401);

  // 4) If so, update password
  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;
  user = await user.save();

  // 5) Log user in, send JWT
  sendToken(user, 200, res);
});
