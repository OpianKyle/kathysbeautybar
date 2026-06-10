import { useState } from "react";
import { useListAppointments, useUpdateAppointment, useCancelAppointment, getListAppointmentsQueryKey } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminAppointments() {
  const [dateFilter, setDateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = {
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {}),
  };

  const { data: appointments, isLoading } = useListAppointments(queryParams);
  const updateAppointment = useUpdateAppointment();
  const cancelAppointment = useCancelAppointment();

  const selectedAppointment = appointments?.find(a => a.id === selectedAppointmentId);

  const handleStatusChange = (id: number, newStatus: any) => {
    updateAppointment.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey(queryParams) });
        },
        onError: () => {
          toast({ title: "Failed to update status", variant: "destructive" });
        }
      }
    );
  };

  const handleCancel = (id: number) => {
    if (confirm("Are you sure you want to cancel this appointment?")) {
      cancelAppointment.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Appointment cancelled" });
            queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey(queryParams) });
            setSelectedAppointmentId(null);
          },
          onError: () => {
            toast({ title: "Failed to cancel appointment", variant: "destructive" });
          }
        }
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed": return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-serif text-foreground">Appointments</h1>
        
        <div className="flex gap-4">
          <Input 
            type="date" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-[160px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {(dateFilter || statusFilter !== "all") && (
            <Button variant="ghost" onClick={() => { setDateFilter(""); setStatusFilter("all"); }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : !appointments?.length ? (
          <div className="text-center p-12 text-muted-foreground">No appointments found matching criteria.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div className="font-medium">{format(parseISO(appointment.startTime), "MMM d, yyyy")}</div>
                    <div className="text-sm text-muted-foreground">{format(parseISO(appointment.startTime), "HH:mm")} ({appointment.durationMinutes}m)</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{appointment.customerName}</div>
                    <div className="text-xs text-muted-foreground">{appointment.phone}</div>
                  </TableCell>
                  <TableCell>{appointment.serviceName}</TableCell>
                  <TableCell>
                    <Select 
                      value={appointment.status} 
                      onValueChange={(v) => handleStatusChange(appointment.id, v)}
                      disabled={appointment.status === 'cancelled'}
                    >
                      <SelectTrigger className={`w-[120px] h-8 text-xs ${getStatusColor(appointment.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedAppointmentId(appointment.id)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!selectedAppointmentId} onOpenChange={(open) => !open && setSelectedAppointmentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Customer</p>
                  <p className="font-medium">{selectedAppointment.customerName}</p>
                  <p className="text-muted-foreground">{selectedAppointment.email}</p>
                  <p className="text-muted-foreground">{selectedAppointment.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Date & Time</p>
                  <p className="font-medium">{format(parseISO(selectedAppointment.startTime), "EEEE, MMMM do, yyyy")}</p>
                  <p>{format(parseISO(selectedAppointment.startTime), "HH:mm")} ({selectedAppointment.durationMinutes} mins)</p>
                </div>
                <div className="col-span-2 mt-2">
                  <p className="text-muted-foreground mb-1">Service</p>
                  <p className="font-medium">{selectedAppointment.serviceName}</p>
                </div>
                {selectedAppointment.notes && (
                  <div className="col-span-2 mt-2">
                    <p className="text-muted-foreground mb-1">Notes</p>
                    <p className="p-3 bg-muted rounded-md text-sm">{selectedAppointment.notes}</p>
                  </div>
                )}
                <div className="col-span-2 mt-2">
                  <p className="text-muted-foreground mb-1">Status</p>
                  <Badge className={getStatusColor(selectedAppointment.status)} variant="outline">
                    {selectedAppointment.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                {selectedAppointment.status !== 'cancelled' && (
                  <Button variant="destructive" onClick={() => handleCancel(selectedAppointment.id)}>
                    Cancel Appointment
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedAppointmentId(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
