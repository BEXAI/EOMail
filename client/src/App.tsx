import React, { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/error-boundary";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

const MailPage = lazy(() => import("@/pages/mail"));
const WelcomePage = lazy(() => import("@/pages/welcome"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const VerifyEmailPage = lazy(() => import("@/pages/verify-email"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const NotFound = lazy(() => import("@/pages/not-found"));

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
            <span className="text-primary-foreground font-bold text-xl">AI</span>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <Component />;
}

function LazyFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// Signed-out visitors on phones get a focused welcome screen; desktop keeps the demo inbox
function HomeRoute() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  if (isMobile && !user) {
    return isLoading ? <LazyFallback /> : <WelcomePage />;
  }
  return <MailPage />;
}

function Router() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/verify-email" component={VerifyEmailPage} />
        <Route path="/settings">
          {() => <ProtectedRoute component={SettingsPage} />}
        </Route>
        <Route path="/">
          {() => <HomeRoute />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
