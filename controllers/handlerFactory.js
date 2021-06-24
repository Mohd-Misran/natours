const APIFeatures = require(`${__dirname}/../utils/apiFeatures`);
const catchAsyncError = require(`${__dirname}/../utils/catchAsyncError`);
const AppError = require(`${__dirname}/../utils/appError`);

exports.getAll = (Model) =>
  catchAsyncError(async (req, res, next) => {
    let reqQuery = {};
    if (req.initialFilter) reqQuery = { ...req.query, ...req.initialFilter };
    else reqQuery = { ...req.query };

    const features = new APIFeatures(Model.find(), reqQuery)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // const docs = await features.query.explain();
    const docs = await features.query;

    res.json({
      status: 'success',
      requestedAt: req.requestTime,
      results: docs.length,
      data: { docs },
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsyncError(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);
    const doc = await query;
    if (!doc) {
      return next(
        new AppError(
          `No ${Model.collection.collectionName} found with id: ${req.params.id}`,
          404
        )
      );
    }
    res.json({ status: 'success', data: { doc } });
  });

exports.createOne = (Model) =>
  catchAsyncError(async (req, res, next) => {
    const doc = await Model.create(req.body);
    res.status(201).json({ status: 'success', data: { doc } });
  });

exports.updateOne = (Model) =>
  catchAsyncError(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    // Document middleware runs after the above statement

    if (!doc) {
      return next(
        new AppError(
          `No ${Model.collection.collectionName} object found with id: ${req.params.id}`,
          404
        )
      );
    }

    res.json({ status: 'success', data: { doc } });
  });

exports.deleteOne = (Model) =>
  catchAsyncError(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id, {
      useFindAndModify: false,
    });

    if (!doc) {
      return next(
        new AppError(
          `No ${Model.collection.collectionName} object found with id: ${req.params.id}`,
          404
        )
      );
    }

    res
      .status(204)
      .json({ status: 'success', message: 'Deleted successfully!' });
  });
