const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const templateRoutes = require("./routes/template.routes");
const exportRoutes = require("./routes/export.routes");
const mockReviewRoutes = require("./routes/mockReview.routes");
const adminRoutes = require("./routes/admin.routes");
const { errorHandler } = require("./middleware/error");
const messageRoutes = require("./routes/message.routes");

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:5173"],
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "divorceflow-api" });
});

app.use("/auth", authRoutes);

app.use("/cases", require("./routes/case.routes"));
app.use("/", require("./routes/clause.routes"));
app.use("/", require("./routes/workflow.routes"));
app.use("/", exportRoutes);
app.use("/", templateRoutes);
app.use("/", mockReviewRoutes);
app.use("/", messageRoutes);

app.use("/admin", adminRoutes);

app.use(errorHandler);

module.exports = { app };