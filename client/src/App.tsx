import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import VehicleProfilePage from "@/pages/vehicle-profile";
import AdminPage from "@/pages/admin";
import ThankYouPage from "@/pages/thank-you";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/v/:qrId/thank-you" component={ThankYouPage} />
      <Route path="/v/:qrId" component={VehicleProfilePage} />
      <Route path="/admin" component={AdminPage} />
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
