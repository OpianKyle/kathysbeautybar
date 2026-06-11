import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useLocation } from "wouter";

import { useListServices, useGetAvailability, useCreateAppointment } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  notes: z.string().optional(),
});

export default function Booking() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const { data: services, isLoading: servicesLoading } = useListServices();
  const createAppointment = useCreateAppointment();

  const { data: availability, isLoading: availabilityLoading } = useGetAvailability(
    { 
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      serviceId: selectedServiceId || 0
    },
    { query: { enabled: !!selectedServiceId && !!selectedDate } }
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      email: "",
      phone: "",
      notes: "",
    },
  });

  const selectedService = services?.find(s => s.id === selectedServiceId);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!selectedServiceId || !selectedDate || !selectedTime) return;

    // Combine date and time for startTime
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const startTime = `${dateStr}T${selectedTime}:00`;

    createAppointment.mutate(
      {
        data: {
          ...values,
          serviceId: selectedServiceId,
          startTime,
        }
      },
      {
        onSuccess: () => {
          setStep(5); // Success step
        },
        onError: () => {
          toast({
            title: "Booking Failed",
            description: "There was an error booking your appointment. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-[80vh] bg-muted/20 py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4">Book an Appointment</h1>
          <p className="text-muted-foreground">Select a service, choose a time, and we'll take care of the rest.</p>
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
                {i < 4 && (
                  <div className={`w-12 h-1 transition-colors ${
                    step > i ? "bg-primary" : "bg-muted"
                  }`} />
                )}
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
                  <h2 className="text-2xl font-serif text-primary mb-4">Select a Service</h2>
                  {servicesLoading ? (
                    <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(
                        (services ?? []).reduce((acc, service) => {
                          if (!acc[service.category]) acc[service.category] = [];
                          acc[service.category].push(service);
                          return acc;
                        }, {} as Record<string, typeof services>)
                      ).map(([category, items]) => (
                        <div key={category}>
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="font-serif text-lg text-primary whitespace-nowrap">{category}</h3>
                            <div className="h-px bg-border flex-1" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {items?.map(service => (
                              <div
                                key={service.id}
                                onClick={() => setSelectedServiceId(service.id)}
                                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                                  selectedServiceId === service.id
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : "border-border hover:border-primary/50"
                                }`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-medium text-sm">{service.name}</h4>
                                  <span className="text-primary font-semibold text-sm ml-2 whitespace-nowrap">R{service.price}</span>
                                </div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                  {service.durationMinutes} min
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={() => setStep(2)} 
                      disabled={!selectedServiceId}
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
                        onSelect={setSelectedDate}
                        className="rounded-xl border shadow-sm mx-auto"
                        disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-medium text-lg">Available Times</h3>
                      {!selectedDate ? (
                        <p className="text-muted-foreground text-sm">Please select a date first.</p>
                      ) : availabilityLoading ? (
                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
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

                  <div className="bg-primary/5 p-4 rounded-xl mb-6 border border-primary/10">
                    <h3 className="font-medium mb-2">Appointment Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      <strong>Service:</strong> {selectedService?.name} (R{selectedService?.price})<br/>
                      <strong>Date:</strong> {selectedDate ? format(selectedDate, 'EEEE, MMMM do, yyyy') : ''}<br/>
                      <strong>Time:</strong> {selectedTime}
                    </p>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane Doe" {...field} />
                            </FormControl>
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
                              <FormControl>
                                <Input type="email" placeholder="jane@example.com" {...field} />
                              </FormControl>
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
                              <FormControl>
                                <Input placeholder="082 123 4567" {...field} />
                              </FormControl>
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
                          {createAppointment.isPending ? "Confirming..." : "Confirm Booking"}
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
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h2 className="text-3xl font-serif text-primary">Booking Confirmed!</h2>
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
