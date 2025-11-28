import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import Messages from "@/pages/Messages";
import MetaTemplates from "@/pages/MetaTemplates";
import Contacts from "./pages/Contacts";
import Connections from "./pages/Connections";
import Users from "./pages/Users";
import Login from "./pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import { RealtimeProvider } from "./api/realtime/RealtimeProvider";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotAuthorized from "@/pages/NotAuthorized";
import Tags from "./pages/Tags";
import Organizations from "./pages/Organizations";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RealtimeProvider userId="1">
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={["admin", "dueno", "colaborador"]}>
                  {" "}
                  <Layout>
                    <Messages />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute allowedRoles={["admin", "dueno"]}>
                  {" "}
                  <Layout>
                    <MetaTemplates />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <ProtectedRoute allowedRoles={["admin", "dueno", "colaborador"]}>
                  {" "}
                  <Layout>
                    <Contacts />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin", "dueno"]}>
                  {" "}
                  <Layout>
                    <Users />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tags"
              element={
                <ProtectedRoute allowedRoles={["admin", "dueno"]}>
                  {" "}
                  <Layout>
                    <Tags />
                  </Layout>
                </ProtectedRoute>
              }
            />
             <Route
              path="/organizations"
              element={
                <ProtectedRoute allowedRoles={["dueno"]}>
                  {" "}
                  <Layout>
                    <Organizations />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/connections"
              element={
                <ProtectedRoute allowedRoles={["admin", "dueno"]}>
                  {" "}
                  <Layout>
                    <Connections />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <Layout>
                  <Login />
                </Layout>
              }
            />
            <Route
              path="/register"
              element={
                <Layout>
                  <Register />
                </Layout>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <Layout>
                  <ForgotPassword />
                </Layout>
              }
            />
            <Route
              path="/reset-password/:token"
              element={
                <Layout>
                  <ResetPassword />
                </Layout>
              }
            />
            <Route path="/not-authorized" element={<NotAuthorized />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RealtimeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
