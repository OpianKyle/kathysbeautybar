import { useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const daySchema = z.object({
  day: z.string(),
  open: z.boolean(),
  openTime: z.string().nullable().optional(),
  closeTime: z.string().nullable().optional(),
});

const settingsSchema = z.object({
  ownerEmail: z.string().email(),
  slotIntervalMinutes: z.coerce.number().min(15).max(120),
  days: z.array(daySchema),
});

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      ownerEmail: "",
      slotIntervalMinutes: 30,
      days: [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "days",
  });

  useEffect(() => {
    if (settings) {
      const daysArray = Object.entries(settings.openingHours).map(([day, hrs]) => ({
        day,
        open: hrs.open,
        openTime: hrs.openTime,
        closeTime: hrs.closeTime,
      }));
      
      form.reset({
        ownerEmail: settings.ownerEmail,
        slotIntervalMinutes: settings.slotIntervalMinutes,
        days: daysArray,
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof settingsSchema>) => {
    const openingHours: Record<string, any> = {};
    values.days.forEach(d => {
      openingHours[d.day] = {
        open: d.open,
        openTime: d.openTime,
        closeTime: d.closeTime,
      };
    });

    updateSettings.mutate(
      {
        data: {
          ownerEmail: values.ownerEmail,
          slotIntervalMinutes: values.slotIntervalMinutes,
          openingHours,
        }
      },
      {
        onSuccess: () => {
          toast({ title: "Settings updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to update settings", variant: "destructive" });
        }
      }
    );
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-serif text-foreground">Business Settings</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle>General Info</CardTitle>
              <CardDescription>Basic salon configuration and contact details.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="ownerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Email</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slotIntervalMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calendar Slot Interval (minutes)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>Set your standard operating hours. This controls availability for bookings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => {
                const dayName = form.watch(`days.${index}.day`);
                const isOpen = form.watch(`days.${index}.open`);
                
                return (
                  <div key={field.id} className="flex items-center gap-6 py-3 border-b last:border-0 border-border">
                    <div className="w-32 font-medium">{capitalize(dayName)}</div>
                    
                    <FormField
                      control={form.control}
                      name={`days.${index}.open`}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0 w-24">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal m-0">{field.value ? 'Open' : 'Closed'}</FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    {isOpen && (
                      <div className="flex items-center gap-2 flex-1">
                        <FormField
                          control={form.control}
                          name={`days.${index}.openTime`}
                          render={({ field }) => (
                            <FormItem className="flex-1 max-w-[150px]">
                              <FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-muted-foreground">to</span>
                        <FormField
                          control={form.control}
                          name={`days.${index}.closeTime`}
                          render={({ field }) => (
                            <FormItem className="flex-1 max-w-[150px]">
                              <FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
