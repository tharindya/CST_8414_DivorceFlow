require("dotenv").config();
const { app } = require("./app");
const { connectDB } = require("./config/db");

const PORT = Number(process.env.PORT || 5000);

async function start() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`✅ API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();