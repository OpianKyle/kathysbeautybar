import { useGetAdminStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CalendarCheck, TrendingUp, Scissors } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      icon: CalendarCheck,
      color: "text-blue-500",
      bg: "bg-blue-100",
    },
    {
      title: "Upcoming Appointments",
      value: stats.upcomingAppointments,
      icon: Calendar,
      color: "text-purple-500",
      bg: "bg-purple-100",
    },
    {
      title: "Monthly Bookings",
      value: stats.monthlyBookings,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-100",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-foreground">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2 rounded-full ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="text-xl font-medium mt-12 mb-4">Popular Services</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.popularServices.map((service, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Scissors className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-medium">{service.serviceName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{service.bookingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Total bookings</p>
            </CardContent>
          </Card>
        ))}
        {stats.popularServices.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No bookings data available yet.
          </div>
        )}
      </div>
    </div>
  );
}
