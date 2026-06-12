import { motion } from "framer-motion";

export default function About() {
  return (
    <div className="min-h-screen bg-background pt-10">
      <div className="container mx-auto px-4 py-16">
        
        <div className="text-center mb-16">
          <h1 className="font-serif text-5xl md:text-6xl text-foreground mb-4">Our Story</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-16 items-center max-w-5xl mx-auto">
          <motion.div 
            className="md:w-1/2"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="aspect-[4/5] rounded-3xl overflow-hidden relative">
              <img src="/images/hero-bg.png" alt="Kat's Beauty Bar Interior" className="w-full h-full object-cover" />
            </div>
          </motion.div>
          
          <motion.div 
            className="md:w-1/2 space-y-6"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <h2 className="font-serif text-4xl text-primary mb-6">A Sanctuary of Elegance</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Founded with a passion for helping people look and feel their absolute best, Kat's Beauty Bar is more than just a salon — it's a destination for luxurious self-care.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Located conveniently at the Caltex Garage on Heideveld Road, we've created a blush pink and rose gold haven where you can escape the daily grind. 
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Our team specializes in hair — from cuts and colour to highlights and treatments. We believe in enhancing your natural beauty using premium products, expert techniques, and an unwavering commitment to excellence. You deserve to feel beautiful, and we are here to ensure you do.
            </p>
            
            <div className="pt-8 border-t border-border mt-8 flex gap-8">
              <div>
                <h4 className="font-medium uppercase tracking-wider text-sm mb-2">Tanya</h4>
                <p className="text-muted-foreground">067 134 4631</p>
              </div>
              <div>
                <h4 className="font-medium uppercase tracking-wider text-sm mb-2">Kathy</h4>
                <p className="text-muted-foreground">084 821 0018</p>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
