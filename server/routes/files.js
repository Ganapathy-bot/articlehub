const express = require("express");
const fs = require("fs");
const path = require("path");
const { pdfsDir } = require("../config");

const router = express.Router();

/** GET /api/files/:filename — stream a PDF from the configured PDFs folder */
router.get("/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!filename.toLowerCase().endsWith(".pdf")) {
    return res.status(400).json({ error: "Only PDF files are served" });
  }

  const filePath = path.join(pdfsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found", filename });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
