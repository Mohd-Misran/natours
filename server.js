const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled rejection: 💥 Shutting down....');
  process.exit(1);
});

dotenv.config({
  path: `${__dirname}/config.env`,
});

const app = require(`${__dirname}/app.js`);

// console.log(process.env);

// Database hosted on Atlas
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// Local Database
// const DB = process.env.DATABASE_LOCAL;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Database connection successful!!! 🤟'));

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

// process.on('SIGTERM', () => {
//   console.log('SIGTERM received.');
//   server.close();
//   console.log('HTTP server closed');
// });

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled rejection: 💥 Shutting down....');
  server.close(() => {
    console.log('Server shutdown');
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  console.log('Goodbye 👋 App interrupted');
  process.exit(0);
});
