import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Assessments from "./pages/Assessments";
import Benchmarks from "./pages/Benchmarks";
import Certifications from "./pages/Certifications";
import ActionPlans from "./pages/ActionPlans";
import Reports from "./pages/Reports";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import AssessmentTake from "./pages/AssessmentTake";
import Organizations from "./pages/Organizations";
import OrganizationProfile from "./pages/OrganizationProfile";
import NotFound from "./pages/NotFound";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import NewOrganization from "./pages/NewOrganization";
import VerifyCertificate from "./pages/VerifyCertificate";
import UsersAdmin from "./pages/UsersAdmin";
import AssessmentsAdmin from "./pages/AssessmentsAdmin";
import CertificationsAdmin from "./pages/CertificationsAdmin";
import BenchmarkAnalytics from "./pages/BenchmarkAnalytics";
import AssessmentConfig from "./pages/AssessmentConfig";
import SystemSettings from "./pages/SystemSettings";
// New feature pages
import SelfAssessmentTake from "./pages/SelfAssessmentTake";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<VerifyCertificate />} />
            <Route path="/verify/:code" element={<VerifyCertificate />} />

            {/* ── Super Admin Routes ────────────────────────────── */}
            <Route path="/super-admin-dashboard" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute requiredRole="super_admin"><Navigate to="/super-admin-dashboard" replace /></ProtectedRoute>} />
            <Route path="/assessments-admin" element={<ProtectedRoute requiredRole="super_admin"><Navigate to="/super-admin-dashboard" replace /></ProtectedRoute>} />
            <Route path="/certifications-admin" element={<ProtectedRoute requiredRole="super_admin"><Navigate to="/super-admin-dashboard" replace /></ProtectedRoute>} />
            <Route path="/benchmark-analytics" element={<ProtectedRoute requiredRole="super_admin"><Navigate to="/super-admin-dashboard" replace /></ProtectedRoute>} />
            <Route path="/assessment-config" element={<ProtectedRoute requiredRole="super_admin"><AssessmentConfig /></ProtectedRoute>} />
            <Route path="/system-settings" element={<ProtectedRoute requiredRole="super_admin"><SystemSettings /></ProtectedRoute>} />

            {/* ── HR Admin / General Protected Routes ──────────── */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/assessments" element={<ProtectedRoute><Assessments /></ProtectedRoute>} />
            <Route path="/assessments/take/:assessmentId" element={<ProtectedRoute><AssessmentTake /></ProtectedRoute>} />
            <Route path="/benchmarks" element={<ProtectedRoute><Benchmarks /></ProtectedRoute>} />
            <Route path="/certifications" element={<ProtectedRoute><Certifications /></ProtectedRoute>} />
            <Route path="/action-plans" element={<ProtectedRoute><ActionPlans /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/organizations" element={<ProtectedRoute><Organizations /></ProtectedRoute>} />
            <Route path="/organization/:orgId" element={<ProtectedRoute><OrganizationProfile /></ProtectedRoute>} />
            <Route path="/organizations/new" element={<ProtectedRoute><NewOrganization /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* ── New Feature Routes ────────────────────────────── */}
            <Route path="/self-assessments" element={<ProtectedRoute><Navigate to="/assessments?tab=self" replace /></ProtectedRoute>} />
            <Route path="/user-report" element={<ProtectedRoute><Navigate to="/reports" replace /></ProtectedRoute>} />
            
            <Route path="/self-assessments/take/new" element={<ProtectedRoute><SelfAssessmentTake /></ProtectedRoute>} />
            <Route path="/self-assessments/take/:id" element={<ProtectedRoute><SelfAssessmentTake /></ProtectedRoute>} />
            <Route path="/improvement-tracking" element={<ProtectedRoute><Navigate to="/action-plans" replace /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
