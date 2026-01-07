const { secondaryDB } = require("../db");
const mongoose = require("mongoose");

const CertificateSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  name: String,
  organization: String,
  issueDate: String
});

module.exports = secondaryDB.model("Certificate", CertificateSchema);
