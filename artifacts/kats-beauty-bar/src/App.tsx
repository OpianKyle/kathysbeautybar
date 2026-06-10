import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import MainLayout from "@/components/layout/MainLayout";
import AdminLayout from "@/components/layout/AdminLayout";

import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Booking from "@/pages/Booking";
import Gallery from "@/pages/Gallery";
import About from "@/pages/About";
import Contact from "@/pages/Contact";

import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminAppointments from "@/pages/admin/Appointments";
import AdminServices from "@/pages/admin/Services";
import AdminSettings from "@/pages/admin/Settings";
import AdminCalendar from "@/pages/admin/Calendar";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/admin/login" component={AdminLogin} />
      
      <Route path="/admin" nest>
        <AdminLayout>
          <Switch>
            <Route path="/" component={AdminDashboard} />
            <Route path="/appointments" component={AdminAppointments} />
            <Route path="/services" component={AdminServices} />
            <Route path="/settings" component={AdminSettings} />
            <Route path="/calendar" component={AdminCalendar} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      </Route>

      <Route path="/" nest>
        <MainLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/services" component={Services} />
            <Route path="/book" component={Booking} />
            <Route path="/gallery" component={Gallery} />
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
            <Route component={NotFound} />
          </Switch>
        </MainLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
