import { useListServices } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Services() {
  const { data: services, isLoading } = useListServices();

  const groupedServices = services?.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  return (
    <div className="min-h-screen bg-background pt-10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl md:text-6xl text-foreground mb-4">Our Services</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Indulge in our luxurious treatments designed to enhance your natural beauty.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-20">
            {groupedServices && Object.entries(groupedServices).map(([category, items], categoryIndex) => (
              <motion.section 
                key={category}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7 }}
              >
                <div className="flex items-center gap-4 mb-10">
                  <h2 className="font-serif text-4xl text-primary">{category}</h2>
                  <div className="h-px bg-border flex-1"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((service, index) => (
                    <motion.div 
                      key={service.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-medium text-lg pr-4">{service.name}</h3>
                        <span className="text-primary font-semibold whitespace-nowrap">R{service.price}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-6 h-10 line-clamp-2">
                        {service.description || "Experience our signature treatment tailored for your unique needs."}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full uppercase tracking-wider">
                          {service.durationMinutes} min
                        </span>
                        <Link href={`/book?service=${service.id}`}>
                          <Button variant="ghost" size="sm" className="rounded-full hover:bg-primary hover:text-white transition-colors">
                            Book Now
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
