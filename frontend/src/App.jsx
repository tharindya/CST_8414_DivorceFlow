import React from "react";
import Navbar from "./components/layout/Navbar";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <div>
      <Navbar />
      <AppRoutes />
    </div>
  );
}