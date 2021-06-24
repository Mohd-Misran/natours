const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require(`${__dirname}/utils/appError`);

const globalErrorHandler = require(`${__dirname}/controllers/errorController`);

// 1) ROUTERS
const tourRouter = require(`${__dirname}/routes/tourRoutes`);
const userRouter = require(`${__dirname}/routes/userRoutes`);
const reviewRouter = require(`${__dirname}/routes/reviewRoutes`);
const viewRouter = require(`${__dirname}/routes/viewRoutes`);
const bookingRouter = require(`${__dirname}/routes/bookingRoutes`);

const app = express();

// 2) PUG ENGINE
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 3) GLOBAL MIDDLEWARES

// Set security HTTP headers
// app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'default-src': ["'self'", 'https:', 'ws:'],
        'script-src': ["'self'", 'https:', 'blob:'],
      },
    },
  })
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour.',
});

app.use('/api', limiter);

// Body-parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
// Body-parser, reading data from forms into req.body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie-parser
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against Cross Site Scripting (XSS) attacks
// Prevent malicious users from inputting html code or javascript code (HTML injection)
app.use(xss());

// Prevent parameter pollution
app.use(hpp({ whitelist: ['duration', 'fields'] }));

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Creating our own middleware function

// app.use((req, res, next) => {
//   console.log('Hello from the middleware 😄');
//   next();
// });

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.query);
  // console.log(req.cookies);
  next();
});

// 4) ROUTES
app.use('/', viewRouter);

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// 5) Middleware for unhandled routes
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server.`,
  // });

  // const err = new Error(`Can't find ${req.originalUrl} on this server.`);
  // err.statusCode = 404;
  // err.status = 'whoopsie';
  const appErr = new AppError(
    `Can't find ${req.originalUrl} on this server.`,
    404
  );
  next(appErr);
});

// 6) Global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
