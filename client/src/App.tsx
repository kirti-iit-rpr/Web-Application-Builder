import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import VehicleProfilePage from "@/pages/vehicle-profile";
import AdminPage from "@/pages/admin";
import ThankYouPage from "@/pages/thank-you";
import QRGeneratorPage from "@/pages/qr-generator";
import LoginPage from "@/pages/login";
import { isLoggedIn, removeToken } from "@/lib/auth";
import { getQueryFn } from "@/lib/queryClient";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const hasToken = isLoggedIn();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: hasToken,
    retry: false,
  });

  if (!hasToken) {
    return <Redirect to="/login" />;
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0e0d0b", color: "#a09888" }}>
        Loading...
      </div>
    );
  }

  if (isError || !data) {
    removeToken();
    navigate("/login");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/tag/:qrId/thank-you" component={ThankYouPage} />
      <Route path="/tag/:qrId" component={VehicleProfilePage} />
      <Route path="/admin">{() => <ProtectedRoute component={AdminPage} />}</Route>
      <Route path="/qr-generator">{() => <ProtectedRoute component={QRGeneratorPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
