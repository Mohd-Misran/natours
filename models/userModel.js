const crypto = require('crypto');

const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'] },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    validate: [validator.isEmail, 'Invalid email address'],
  },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['admin', 'guide', 'lead-guide', 'user'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [8, 'Min length of password must be 8'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Password Confirmation is required'],
    validate: {
      // This works only on SAVE
      validator: function (val) {
        return val === this.password;
      },
      message: 'Passwords did not match',
    },
    select: false,
  },
  createdAt: { type: Date, default: Date.now() },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  passwordChangedAt: { type: Date, select: false },
  isActive: { type: Boolean, default: true, select: false },
});

// Encrypt password in the database
userSchema.pre('save', async function (next) {
  // Only run if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with the cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

// Set passwordChangedAt whenever password has been changed
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (tokenTimestamp) {
  if (this.passwordChangedAt) {
    const passwordChangedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // console.log({
    //   passwordChangedAt: passwordChangedTimestamp,
    //   tokenTimestamp: tokenTimestamp,
    // });
    return tokenTimestamp < passwordChangedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({
  //   user: this.name,
  //   resetToken: resetToken,
  //   passwordResetToken: this.passwordResetToken,
  // });

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Query middleware
// All find queries will return only active users
userSchema.pre(/^find/, function (next) {
  this.find({ isActive: true });
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
