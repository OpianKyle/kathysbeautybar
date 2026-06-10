import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetAdminMe } from "@workspace/api-client-react";
import { LogOut, LayoutDashboard, Calendar, CalendarDays, Scissors, Settings } from "lucide-react";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: admin, isLoading, isError } = useGetAdminMe();

  useEffect(() => {
    if (isError || (!isLoading && !admin)) {
      setLocation("/admin/login");
    }
  }, [admin, isLoading, isError, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!admin) {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLocation("/admin/login");
  };

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/appointments", label: "Appointments", icon: Calendar },
    { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/admin/services", label: "Services", icon: Scissors },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="font-serif text-2xl text-primary font-bold">Kat's Admin</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                location === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {admin.name.charAt(0)}
            </div>
            <div>
              <div className="font-medium text-foreground">{admin.name}</div>
              <div className="text-xs">{admin.email}</div>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
