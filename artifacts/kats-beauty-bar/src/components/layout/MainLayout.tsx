import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/gallery", label: "Gallery" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col relative selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-3xl text-primary font-bold tracking-wider">Kat's</span>
            <span className="text-sm tracking-[0.2em] uppercase mt-2 hidden sm:inline-block">Beauty Bar</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm tracking-wide uppercase transition-colors hover:text-primary ${
                  location === link.href ? "text-primary font-medium" : "text-foreground/70"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/book">
              <Button className="rounded-full px-6 font-medium tracking-wide">Book Appointment</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-white border-t py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="md:col-span-1">
              <Link href="/" className="inline-block mb-4">
                <span className="font-serif text-4xl text-primary">Kat's</span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto md:mx-0">
                Enhancing your natural beauty. You deserve to feel beautiful.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-6 uppercase tracking-wider text-sm">Services</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Hair Styling & Treatments</li>
                <li>Brow Lamination & Tint</li>
                <li>Luxury Lash Extensions</li>
                <li>Gel & Acrylic Nails</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-6 uppercase tracking-wider text-sm">Contact</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Tanya: 067 134 4631</li>
                <li>Kathy: 084 821 0018</li>
                <li>Caltex Garage, Heideveld Road</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-6 uppercase tracking-wider text-sm">Hours</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Mon - Fri: 9:00 - 18:00</li>
                <li>Saturday: 9:00 - 15:00</li>
                <li>Sunday: Closed</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between">
            <p>&copy; {new Date().getFullYear()} Kat's Beauty Bar. All rights reserved.</p>
            <Link href="/admin/login" className="hover:text-primary transition-colors mt-4 sm:mt-0">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
