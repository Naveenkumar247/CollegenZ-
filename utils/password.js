const bcryptjs = require("bcryptjs");

exports.hashPassword = async (password) => {
  return bcryptjs.hash(password, 10);
};

exports.comparePassword = async (password, hashedPassword) => {
  return bcryptjs.compare(password, hashedPassword);
};
