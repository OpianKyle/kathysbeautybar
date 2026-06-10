import { useState } from "react";
import { useListAppointments } from "@workspace/api-client-react";
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminCalendar() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Get appointments for the current week range
  // We can fetch a broad range or just let the API return all and filter client side for simplicity here
  const { data: appointments, isLoading } = useListAppointments();

  const handlePrevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const handleNextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  const hours = Array.from({ length: 11 }).map((_, i) => i + 8); // 8 AM to 6 PM

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 border-yellow-200 text-yellow-800";
      case "confirmed": return "bg-blue-100 border-blue-200 text-blue-800";
      case "completed": return "bg-green-100 border-green-200 text-green-800";
      default: return "hidden"; // hide cancelled in calendar usually
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-foreground">Calendar</h1>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border">
        {/* Header Row */}
        <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b bg-muted/30">
          <div className="p-3 text-center border-r text-sm font-medium text-muted-foreground">Time</div>
          {days.map((day, i) => (
            <div key={i} className={`p-3 text-center border-r last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-primary/5 text-primary' : ''}`}>
              <div className="text-xs uppercase tracking-wider">{format(day, "EEE")}</div>
              <div className="text-lg font-medium">{format(day, "d")}</div>
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="flex-1 overflow-y-auto relative bg-card">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          
          <div className="relative min-h-max">
            {/* Grid lines */}
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b h-20">
                <div className="border-r p-2 text-xs text-muted-foreground text-center relative">
                  <span className="absolute -top-3 left-0 right-0 bg-card">{hour}:00</span>
                </div>
                {days.map((_, i) => (
                  <div key={i} className="border-r last:border-r-0 relative"></div>
                ))}
              </div>
            ))}

            {/* Appointments */}
            {appointments?.filter(a => a.status !== 'cancelled').map(appointment => {
              const start = parseISO(appointment.startTime);
              const apptDay = days.findIndex(d => isSameDay(d, start));
              
              if (apptDay === -1) return null; // Not in current week view
              
              const startHour = start.getHours() + (start.getMinutes() / 60);
              if (startHour < 8 || startHour > 19) return null; // Outside display hours

              const top = (startHour - 8) * 80; // 80px per hour
              const height = (appointment.durationMinutes / 60) * 80;

              return (
                <div 
                  key={appointment.id}
                  className={`absolute rounded-md border p-2 overflow-hidden shadow-sm text-xs cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all z-10 ${getStatusColor(appointment.status)}`}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `calc(80px + ${apptDay} * ((100% - 80px) / 7) + 4px)`,
                    width: `calc(((100% - 80px) / 7) - 8px)`
                  }}
                  title={`${appointment.customerName} - ${appointment.serviceName}`}
                >
                  <div className="font-semibold truncate">{format(start, "HH:mm")}</div>
                  <div className="font-medium truncate">{appointment.customerName}</div>
                  <div className="truncate opacity-80">{appointment.serviceName}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
