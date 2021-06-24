module.exports = class {
  constructor(query, reqQuery) {
    this.query = query;
    this.reqQuery = reqQuery;
  }

  filter() {
    // 1) Filtering
    const queryObj = { ...this.reqQuery };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 2) Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);

    // console.log(this.reqQuery, JSON.parse(queryStr));
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  // 3) Sorting
  sort() {
    if (this.reqQuery.sort) this.query = this.query.sort(this.reqQuery.sort);
    else this.query = this.query.sort('-createdAt');
    return this;
  }

  // 4) Limiting fields
  limitFields() {
    if (this.reqQuery.fields)
      this.query = this.query.select(this.reqQuery.fields);
    else this.query = this.query.select('-__v');
    return this;
  }

  // 5) Pagination
  paginate() {
    const page = this.reqQuery.page * 1 || 1;
    const limit = this.reqQuery.limit * 1 || 10;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
};

// module.exports = APIFeatures;
