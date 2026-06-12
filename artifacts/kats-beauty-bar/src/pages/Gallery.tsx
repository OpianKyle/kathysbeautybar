import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const CATEGORIES = ["All", "Hair"];

const IMAGES = [
  { id: 1, src: "/images/hair-wash.jpg", category: "Hair", alt: "Hair wash and treatment" },
  { id: 2, src: "/images/hair-colour.jpg", category: "Hair", alt: "Hair colour and styling" },
  { id: 3, src: "/images/hair-highlights.jpg", category: "Hair", alt: "Highlights and balayage" },
  { id: 4, src: "/images/hair-treatment.jpg", category: "Hair", alt: "Hair wash treatment" },
  { id: 5, src: "/images/hero-bg.png", category: "Hair", alt: "Salon interior" },
];

export default function Gallery() {
  const [filter, setFilter] = useState("All");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const filteredImages = filter === "All"
    ? IMAGES
    : IMAGES.filter(img => img.category === filter);

  return (
    <div className="min-h-screen bg-background pt-10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-serif text-5xl md:text-6xl text-foreground mb-4">Gallery</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A glimpse into the Kat's Beauty Bar experience.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`px-6 py-2 rounded-full text-sm uppercase tracking-wider transition-colors ${
                filter === category
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filteredImages.map(img => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                key={img.id}
                className="aspect-square rounded-2xl overflow-hidden cursor-pointer group relative"
                onClick={() => setSelectedImage(img.src)}
              >
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <span className="text-white text-sm uppercase tracking-widest font-medium border border-white/50 px-6 py-2 rounded-full backdrop-blur-sm">View</span>
                </div>
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
          <DialogContent className="max-w-5xl bg-transparent border-none p-0 overflow-hidden shadow-none">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Enlarged view"
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
