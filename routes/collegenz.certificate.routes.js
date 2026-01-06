const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/* Load certificate data */
const certificates = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../certificates.json"), "utf-8")
);

/* Verify CollegenZ certificate */
router.get("/:code", (req, res) => {
  const { code } = req.params;

  const certificate = certificates.find(
    (c) => c.code.toLowerCase() === code.toLowerCase()
  );

  if (!certificate) {
    return res.status(404).json({
      error: "Invalid CollegenZ Certificate"
    });
  }

  res.json({
    code: certificate.code,
    name: certificate.name,
    organization: certificate.organization,
    issueDate: certificate.issueDate
  });
});

module.exports = router;
