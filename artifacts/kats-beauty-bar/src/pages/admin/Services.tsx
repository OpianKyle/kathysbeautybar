import { useState } from "react";
import { useListServices, useCreateService, useUpdateService, useDeleteService, getListServicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(2, "Name required"),
  description: z.string().min(1, "Description required"),
  price: z.coerce.number().min(0, "Price required"),
  durationMinutes: z.coerce.number().min(1, "Duration required"),
  category: z.string().min(1, "Category required"),
  active: z.boolean().default(true),
});

export default function AdminServices() {
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: services, isLoading } = useListServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      durationMinutes: 30,
      category: "Hair",
      active: true,
    },
  });

  const handleEdit = (service: any) => {
    setEditingServiceId(service.id);
    form.reset({
      name: service.name,
      description: service.description,
      price: service.price,
      durationMinutes: service.durationMinutes,
      category: service.category,
      active: service.active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingServiceId(null);
    form.reset({
      name: "",
      description: "",
      price: 0,
      durationMinutes: 30,
      category: "Hair",
      active: true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteService.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Service deleted" });
            queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          },
          onError: () => {
            toast({ title: "Failed to delete service", variant: "destructive" });
          }
        }
      );
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingServiceId) {
      updateService.mutate(
        { id: editingServiceId, data: values },
        {
          onSuccess: () => {
            toast({ title: "Service updated" });
            queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
            setIsDialogOpen(false);
          },
          onError: () => {
            toast({ title: "Failed to update service", variant: "destructive" });
          }
        }
      );
    } else {
      createService.mutate(
        { data: values },
        {
          onSuccess: () => {
            toast({ title: "Service created" });
            queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
            setIsDialogOpen(false);
          },
          onError: () => {
            toast({ title: "Failed to create service", variant: "destructive" });
          }
        }
      );
    }
  };

  const categories = Array.from(new Set(services?.map(s => s.category) || ["Hair", "Brows", "Lashes", "Nails"]));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-serif text-foreground">Services Management</h1>
        <Button onClick={handleCreate}>Add New Service</Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services?.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">
                    {service.name}
                    <div className="text-xs text-muted-foreground truncate max-w-xs">{service.description}</div>
                  </TableCell>
                  <TableCell>{service.category}</TableCell>
                  <TableCell>R{service.price}</TableCell>
                  <TableCell>{service.durationMinutes} min</TableCell>
                  <TableCell>
                    {service.active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-500">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(service)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(service.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingServiceId ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (R)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (mins)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        <SelectItem value="new_category">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea className="resize-none h-20" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createService.isPending || updateService.isPending}>
                  {editingServiceId ? 'Save Changes' : 'Create Service'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
