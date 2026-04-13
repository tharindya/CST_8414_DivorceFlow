import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/layout/ProtectedRoute";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import CasePage from "../pages/CasePage";

import InvitePage from "../pages/InvitePage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cases/:caseId"
        element={
          <ProtectedRoute>
            <CasePage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<div style={{ padding: 16 }}>Not found</div>} />

      <Route path="/invite" element={<ProtectedRoute><InvitePage /></ProtectedRoute>} />
    </Routes>
  );
}