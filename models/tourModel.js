const mongoose = require('mongoose');
const slugify = require('slugify');
// const { Schema, Types } = require('mongoose');
// const validator = require('validator');

// const User = require(`${__dirname}/userModel`);

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [255, 'A tour name must have at most 40 characters'],
      minlength: [10, 'A tour name must be at least 10 characters'],
      // validate: [validator.isAlpha, 'A tour name must have only alphabets.'],
    },
    slug: String,
    duration: { type: Number, required: [true, 'A tour must have a duration'] },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a max group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Limited choices bruh!!',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      set: (val) => parseFloat(val.toFixed(2)),
    },
    ratingsQuantity: { type: Number, default: 0 },
    price: { type: Number, required: [true, 'A tour must have a price'] },
    priceDiscount: {
      type: Number,
      default: 0,
      validate: {
        validator: function (val) {
          // this keyword won't work on update
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) must be less than original price.',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image '],
    },
    images: [String],
    createdAt: { type: Date, default: Date.now(), select: false },
    startDates: [Date],
    // secretTour: { type: Boolean, default: false },
    startLocation: {
      // GeoJSON object
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: [Number],
      address: String,
      description: String,
    },
    // Embedding locations in tour
    locations: [
      {
        // GeoJSON object
        type: { type: String, default: 'Point', enum: ['Point'] },
        coordinates: [Number],
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Adding indexes to the model
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// Virtual properties: not stored in database explicitly
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual Populate Tour Reviews when request is made to get tour by id
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// Document Middleware
/* -------------------------------- */
/* schema.pre('save', funtion()); runs before .save() or Model.create()
[NOTE: but not Model.insertMany() or update functions]*/
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// Another pre middleware with same hook 'save'
// tourSchema.pre('save', function (next) {
//   console.log(this);
//   console.log('A schema can have multiple middlewares of the same hook');
// });

// Post middleware
// tourSchema.post('save', (doc, next) => {
//   console.log(doc);
//   next();
// });

// Embedding guides in tourModel using _id
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (el) => await User.findById(el));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// QUERY MIDDLEWARE
/* ------------------------------------------ */
// tourSchema.pre(/^find/, function (next) {
//   this.find({ secretTour: { $ne: true } });
//   this.start = Date.now();
//   next();
// });

tourSchema.pre(/^find/, function (next) {
  // this.start = Date.now();
  this.populate({ path: 'guides', select: '-__v' });
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   console.log(`Tour Find: Query took ${Date.now() - this.start} ms`);
//   next();
// });

// AGGREGATION MIDDLEWARE
/* ------------------------------------------ */
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   // console.log(this.pipeline());
//   next();
// });
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
