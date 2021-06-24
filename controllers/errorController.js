const AppError = require(`${__dirname}/../utils/appError`);

const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFields = (err) => {
  const keys = Object.keys(err.keyPattern);
  const message = `Duplicate ${keys} value: ${err.keyValue.name}`;
  return new AppError(message, 400);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data:\n${errors.join('\n')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please login again.', 401);
const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please login again.', 401);

const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      errorName: err.name,
      error: err,
      message: err.message,
      stack: err.stack,
    });

    // RENDERED WEBSITE
  } else {
    console.error(`\n\n${err.stack}\n\n`);
    res
      .status(err.statusCode)
      .render('error', { title: 'Something went wrong', message: err.message });
  }
};

const sendErrorProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // Programming or other unknown error: don't leak error details
    console.error(`\n\n${err.statusCode}: ${err.message}\n\n`);
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong.',
    });
  }

  // RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Operational Error',
      message: err.message,
    });
  }
  console.error(`\n\n${err.statusCode}: ${err.message}\n\n`);
  return res.status(500).render('error', {
    title: 'Server Error',
    message: 'Oops! Something went very wrong.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'fail';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err, name: err.name, message: err.message };
    if (error.name === 'CastError') error = handleCastError(error);
    if (error.code === 11000) error = handleDuplicateFields(error);
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(error, req, res);
  }
  next();
};
