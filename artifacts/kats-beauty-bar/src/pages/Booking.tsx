import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { useListServices, useCreateAppointment } from "@workspace/api-client-react";
import { customFetch } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  notes: z.string().optional(),
});

interface AvailabilityResponse {
  date: string;
  slots: { time: string; available: boolean; reason?: string | null }[];
  businessHours: { open: boolean; openTime: string | null; closeTime: string | null };
}

export default function Booking() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const { data: services, isLoading: servicesLoading } = useListServices();
  const createAppointment = useCreateAppointment();

  const selectedServices = services?.filter(s => selectedServiceIds.includes(s.id)) ?? [];
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  const firstServiceId = selectedServiceIds[0] ?? 0;

  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ["availability", selectedDate ? format(selectedDate, "yyyy-MM-dd") : null, firstServiceId, totalDuration],
    enabled: selectedServiceIds.length > 0 && !!selectedDate,
    queryFn: () => {
      const date = format(selectedDate!, "yyyy-MM-dd");
      const url = `/api/availability?date=${date}&serviceId=${firstServiceId}&durationMinutes=${totalDuration}`;
      return customFetch<AvailabilityResponse>(url);
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerName: "", email: "", phone: "", notes: "" },
  });

  function toggleService(id: number) {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setSelectedTime(null);
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (selectedServiceIds.length === 0 || !selectedDate || !selectedTime) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    let currentMinutes =
      parseInt(selectedTime.split(":")[0]) * 60 + parseInt(selectedTime.split(":")[1]);

    try {
      for (const service of selectedServices) {
        const startHH = String(Math.floor(currentMinutes / 60)).padStart(2, "0");
        const startMM = String(currentMinutes % 60).padStart(2, "0");
        const startTime = `${dateStr}T${startHH}:${startMM}:00`;

        await createAppointment.mutateAsync({
          data: { ...values, serviceId: service.id, startTime },
        });

        currentMinutes += service.durationMinutes;
      }
      setStep(5);
    } catch {
      toast({
        title: "Booking Failed",
        description: "There was an error booking your appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const groupedServices = (services ?? []).reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  return (
    <div className="min-h-[80vh] bg-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">Book an Appointment</h1>
          <p className="text-muted-foreground">Select your services, choose a time, and we'll take care of the rest.</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {i}
                </div>
                {i < 4 && <div className={`w-12 h-1 transition-colors ${step > i ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
        </div>

        <Card className="border-border shadow-md">
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">

              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-serif text-primary">Select Services</h2>
                    {selectedServiceIds.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedServiceIds.length} selected · R{totalPrice} · {totalDuration} min
                      </span>
                    )}
                  </div>

                  {servicesLoading ? (
                    <div className="flex justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(groupedServices).map(([category, items]) => (
                        <div key={category}>
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="font-serif text-lg text-primary whitespace-nowrap">{category}</h3>
                            <div className="h-px bg-border flex-1" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {items?.map(service => {
                              const isSelected = selectedServiceIds.includes(service.id);
                              return (
                                <div
                                  key={service.id}
                                  onClick={() => toggleService(service.id)}
                                  className={`p-4 border rounded-xl cursor-pointer transition-all select-none ${
                                    isSelected
                                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
                                      }`}>
                                        {isSelected && (
                                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </div>
                                      <h4 className="font-medium text-sm truncate">{service.name}</h4>
                                    </div>
                                    <span className="text-primary font-semibold text-sm ml-2 whitespace-nowrap">R{service.price}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground uppercase tracking-wider ml-6">
                                    {service.durationMinutes} min
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedServiceIds.length > 0 && (
                    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                      <div className="text-sm">
                        <span className="font-medium">{selectedServiceIds.length} service{selectedServiceIds.length > 1 ? "s" : ""}</span>
                        <span className="text-muted-foreground"> · {totalDuration} min total</span>
                      </div>
                      <span className="font-semibold text-primary">R{totalPrice}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => setStep(2)}
                      disabled={selectedServiceIds.length === 0}
                      className="rounded-full px-8"
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-serif text-primary">Choose Date & Time</h2>
                    <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }}
                        className="rounded-xl border shadow-sm mx-auto"
                        disabled={(date) => date < new Date() || date.getDay() === 0}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Available Times</h3>
                      <p className="text-xs text-muted-foreground">
                        Showing slots for {totalDuration} min ({selectedServiceIds.length} service{selectedServiceIds.length > 1 ? "s" : ""} back-to-back)
                      </p>
                      {!selectedDate ? (
                        <p className="text-muted-foreground text-sm">Please select a date first.</p>
                      ) : availabilityLoading ? (
                        <div className="flex justify-center p-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                      ) : availability?.slots.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No availability on this date.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                          {availability?.slots.map(slot => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? "default" : "outline"}
                              className={`w-full justify-start ${!slot.available && "opacity-50 cursor-not-allowed"}`}
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                            >
                              <span className="mr-2">{slot.available ? "🟢" : "🔴"}</span>
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!selectedDate || !selectedTime}
                      className="rounded-full px-8"
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-serif text-primary">Your Details</h2>
                    <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-xl mb-6 border border-primary/10 space-y-3">
                    <h3 className="font-medium">Appointment Summary</h3>
                    <div className="space-y-1">
                      {selectedServices.map((s, i) => {
                        let startMin =
                          parseInt(selectedTime!.split(":")[0]) * 60 +
                          parseInt(selectedTime!.split(":")[1]);
                        for (let j = 0; j < i; j++) startMin += selectedServices[j].durationMinutes;
                        const hh = String(Math.floor(startMin / 60)).padStart(2, "0");
                        const mm = String(startMin % 60).padStart(2, "0");
                        return (
                          <div key={s.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {hh}:{mm} — {s.name}
                            </span>
                            <span className="font-medium">R{s.price}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2 border-t border-primary/10 flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {selectedDate ? format(selectedDate, "EEEE, MMMM do, yyyy") : ""} · {totalDuration} min
                      </span>
                      <span className="font-semibold text-primary">R{totalPrice}</span>
                    </div>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl><Input placeholder="082 123 4567" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Requests / Notes</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Any specific requirements?" className="resize-none" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={createAppointment.isPending}
                          className="rounded-full px-8"
                        >
                          {createAppointment.isPending ? "Confirming..." : `Confirm ${selectedServiceIds.length > 1 ? selectedServiceIds.length + " " : ""}Booking${selectedServiceIds.length > 1 ? "s" : ""}`}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 space-y-6"
                >
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-serif text-primary">
                    {selectedServiceIds.length > 1 ? "Bookings Confirmed!" : "Booking Confirmed!"}
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Thank you for booking with Kat's Beauty Bar. We've sent a confirmation email with all the details.
                  </p>
                  <div className="pt-8">
                    <Button onClick={() => setLocation("/")} variant="outline" className="rounded-full px-8">
                      Return to Home
                    </Button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
