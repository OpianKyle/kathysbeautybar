import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-bg.png" 
            alt="Kat's Beauty Bar Interior" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/20 to-white/90" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 text-center mt-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <h2 className="text-sm md:text-base uppercase tracking-[0.3em] mb-6 text-primary font-semibold">
              Welcome to
            </h2>
            <h1 className="font-serif text-7xl md:text-9xl text-foreground mb-4 leading-tight">
              Kat's Beauty Bar
            </h1>
            <p className="text-2xl md:text-3xl font-light text-foreground/80 mb-6 italic">
              Enhancing Your Natural Beauty
            </p>
            <div className="flex items-center justify-center gap-4 text-sm tracking-widest uppercase text-muted-foreground mb-12">
              <span>Cuts</span>
              <span className="w-1 h-1 rounded-full bg-primary/50" />
              <span>Colour</span>
              <span className="w-1 h-1 rounded-full bg-primary/50" />
              <span>Highlights</span>
              <span className="w-1 h-1 rounded-full bg-primary/50" />
              <span>Treatments</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/book">
                <Button size="lg" className="w-full sm:w-auto rounded-full px-8 text-base h-14 bg-foreground text-background hover:bg-foreground/90">
                  Book Appointment
                </Button>
              </Link>
              <Link href="/services">
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 text-base h-14 border-foreground text-foreground hover:bg-foreground hover:text-background">
                  View Services
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-5xl text-foreground mb-4">Our Services</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Experience luxury treatments tailored to enhance your natural beauty.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Wash, Blow & Style", image: "/images/hair-wash.jpg", desc: "Professional wash, blow dry and styling." },
              { title: "Colour", image: "/images/hair-colour.jpg", desc: "Full colour, roots and toning services." },
              { title: "Highlights", image: "/images/hair-highlights.jpg", desc: "Balayage, foils and creative highlights." },
              { title: "Treatments", image: "/images/hair-treatment.jpg", desc: "Deep conditioning and keratin treatments." }
            ].map((service, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-2xl mb-6 relative">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
                  <img 
                    src={service.image} 
                    alt={service.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <h3 className="text-xl font-medium mb-2">{service.title}</h3>
                <p className="text-muted-foreground text-sm">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2">
            <motion.img 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              src="/images/hero-bg.png" 
              alt="Salon Interior" 
              className="rounded-3xl shadow-xl aspect-square object-cover"
            />
          </div>
          <div className="md:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="font-serif text-5xl text-foreground mb-6">The Kat's Experience</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Step into a world of pure relaxation and luxury. At Kat's Beauty Bar, we believe that everyone deserves to feel beautiful. Our expert stylists and technicians are dedicated to providing you with the highest quality service in a warm, welcoming environment.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Whether you're preparing for a special occasion or just treating yourself to some well-deserved self-care, we ensure every visit leaves you feeling refreshed, confident, and radiant.
              </p>
              <Link href="/about">
                <Button variant="outline" className="rounded-full px-8 border-primary text-primary hover:bg-primary hover:text-white">
                  Read Our Story
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
