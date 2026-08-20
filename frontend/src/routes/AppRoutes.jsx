import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/layout/ProtectedRoute";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import CasePage from "../pages/CasePage";
import FinalReviewPage from "../pages/FinalReviewPage";
import InvitePage from "../pages/InvitePage";
import AdminDashboard from "../pages/AdminDashboard";
import AdminCaseReview from "../pages/AdminCaseReview";
import AdminTemplates from "../pages/AdminTemplates";
import NotificationsPage from "../pages/NotificationsPage";

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

      <Route
        path="/cases/:caseId/final-review"
        element={
          <ProtectedRoute>
            <FinalReviewPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/invite"
        element={
          <ProtectedRoute>
            <InvitePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/templates"
        element={
          <ProtectedRoute adminOnly>
            <AdminTemplates />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/cases/:caseId"
        element={
          <ProtectedRoute adminOnly>
            <AdminCaseReview />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<div style={{ padding: 16 }}>Not found</div>} />
    </Routes>
  );
}
