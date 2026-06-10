import { useGetSettings } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  const { data: settings, isLoading } = useGetSettings();

  const daysOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  const formatDay = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  return (
    <div className="min-h-screen bg-background pt-10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl md:text-6xl text-foreground mb-4">Get in Touch</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            We'd love to hear from you. Book an appointment or ask us any questions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-10"
          >
            <div className="bg-card border rounded-2xl p-8 shadow-sm">
              <h3 className="font-serif text-2xl text-primary mb-6 flex items-center gap-3">
                <MapPin className="w-6 h-6" /> Visit Us
              </h3>
              <p className="text-muted-foreground text-lg mb-2">Caltex Garage</p>
              <p className="text-muted-foreground text-lg mb-6">Heideveld Road</p>
              
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted">
                {/* Embedded Google Map Placeholder - using a static iframe for safety/simplicity without API key */}
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3308.825227705494!2d18.555239!3d-33.971253!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzPCsDU4JzE2LjUiUyAxOMKwMzMnMTguOSJF!5e0!3m2!1sen!2sza!4v1620000000000!5m2!1sen!2sza" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy"
                ></iframe>
              </div>
            </div>
            
            <div className="bg-card border rounded-2xl p-8 shadow-sm">
              <h3 className="font-serif text-2xl text-primary mb-6 flex items-center gap-3">
                <Phone className="w-6 h-6" /> Contact Numbers
              </h3>
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-medium text-lg">Tanya</p>
                    <p className="text-muted-foreground">067 134 4631</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open('tel:0671344631')}>
                      <Phone className="w-4 h-4 mr-2" /> Call
                    </Button>
                    <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => window.open('https://wa.me/27671344631')}>
                      <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-medium text-lg">Kathy</p>
                    <p className="text-muted-foreground">084 821 0018</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open('tel:0848210018')}>
                      <Phone className="w-4 h-4 mr-2" /> Call
                    </Button>
                    <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => window.open('https://wa.me/27848210018')}>
                      <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                    </Button>
                  </div>
                </div>
                
                {settings?.ownerEmail && (
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-xl">
                     <div>
                       <p className="font-medium text-lg">Email</p>
                       <p className="text-muted-foreground">{settings.ownerEmail}</p>
                     </div>
                     <Button variant="outline" size="sm" onClick={() => window.open(`mailto:${settings.ownerEmail}`)}>
                       <Mail className="w-4 h-4 mr-2" /> Email Us
                     </Button>
                   </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 shadow-sm h-full">
              <h3 className="font-serif text-2xl text-primary mb-8 flex items-center gap-3">
                <Clock className="w-6 h-6" /> Business Hours
              </h3>
              
              {isLoading ? (
                <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
              ) : settings?.openingHours ? (
                <div className="space-y-4">
                  {daysOrder.map(day => {
                    const hours = settings.openingHours[day];
                    if (!hours) return null;
                    
                    return (
                      <div key={day} className="flex justify-between items-center py-3 border-b border-primary/10 last:border-0">
                        <span className="font-medium text-lg w-32">{formatDay(day)}</span>
                        <span className="text-muted-foreground text-right flex-1">
                          {hours.open && hours.openTime && hours.closeTime
                            ? `${hours.openTime.slice(0,5)} - ${hours.closeTime.slice(0,5)}`
                            : <span className="text-destructive/80 font-medium">Closed</span>
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">Hours currently unavailable.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
