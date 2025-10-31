import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta: {
    text: string;
    href: string;
  };
  backgroundImage: string;
  gradient: string;
}

const heroSlides: HeroSlide[] = [
  {
    id: 'slide-1',
    title: 'Welcome to Our',
    subtitle: 'Digital Store',
    description: 'Discover amazing products at great prices with our curated collection of premium electronics and accessories',
    primaryCta: {
      text: 'Shop Now',
      href: '/products'
    },
    secondaryCta: {
      text: 'Browse Categories',
      href: '/categories'
    },
    backgroundImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop&crop=center',
    gradient: 'linear-gradient(rgba(37, 99, 235, 0.8), rgba(168, 85, 247, 0.8), rgba(20, 184, 166, 0.8))'
  },
  {
    id: 'slide-2',
    title: 'Premium Quality',
    subtitle: 'Electronics',
    description: 'Experience the latest in technology with our handpicked selection of premium electronics and smart devices',
    primaryCta: {
      text: 'Explore Electronics',
      href: '/categories/electronics'
    },
    secondaryCta: {
      text: 'View Deals',
      href: '/deals'
    },
    backgroundImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1920&h=1080&fit=crop&crop=center',
    gradient: 'linear-gradient(rgba(239, 68, 68, 0.8), rgba(168, 85, 247, 0.8), rgba(59, 130, 246, 0.8))'
  },
  {
    id: 'slide-3',
    title: 'Lightning Fast',
    subtitle: 'Free Shipping',
    description: 'Get your orders delivered fast with our free shipping on orders over $50 and same-day processing',
    primaryCta: {
      text: 'Start Shopping',
      href: '/products'
    },
    secondaryCta: {
      text: 'Learn More',
      href: '/shipping'
    },
    backgroundImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop&crop=center',
    gradient: 'linear-gradient(rgba(20, 184, 166, 0.8), rgba(59, 130, 246, 0.8), rgba(168, 85, 247, 0.8))'
  },
  {
    id: 'slide-4',
    title: 'Expert Support',
    subtitle: '24/7 Service',
    description: 'Get help when you need it with our dedicated customer support team available around the clock',
    primaryCta: {
      text: 'Contact Support',
      href: '/contact'
    },
    secondaryCta: {
      text: 'View Products',
      href: '/products'
    },
    backgroundImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=1080&fit=crop&crop=center',
    gradient: 'linear-gradient(rgba(168, 85, 247, 0.8), rgba(239, 68, 68, 0.8), rgba(20, 184, 166, 0.8))'
  }
];

// Client-side only carousel component that uses the hook
const EmblaCarousel: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: false,
      align: 'center',
      skipSnaps: false,
      dragFree: false,
      containScroll: 'trimSnaps'
    },
    [Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const selectedIndex = emblaApi.selectedScrollSnap();
    setSelectedIndex(selectedIndex);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const scrollSnapsNumbers = emblaApi.scrollSnapList();
    setScrollSnaps(scrollSnapsNumbers);
    emblaApi.on('select', onSelect);
    onSelect();

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Keyboard navigation
  useEffect(() => {
    if (!emblaApi) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        scrollPrev();
      } else if (event.key === 'ArrowRight') {
        scrollNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [scrollPrev, scrollNext, emblaApi]);

  return (
    <>
      {/* Carousel Container */}
      <div className="embla overflow-hidden relative embla__viewport" ref={emblaRef}>
        <div className="embla__container flex">
          {heroSlides.map((slide) => (
            <div key={slide.id} className="embla__slide">
              <div 
                className="relative min-h-[500px] flex items-center justify-center rounded-2xl overflow-hidden"
                style={{
                  backgroundImage: `${slide.gradient}, url('${slide.backgroundImage}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div className="text-center max-w-4xl mx-auto px-6 relative z-10">
                  <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in text-white">
                    {slide.title}
                    <span className="block bg-gradient-to-r from-accent-coral-400 to-accent-teal-400 bg-clip-text">
                      {slide.subtitle}
                    </span>
                  </h1>
                  <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto animate-slide-up">
                    {slide.description}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
                    <a
                      href={slide.primaryCta.href}
                      className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-primary-600 bg-white rounded-xl hover:bg-gray-100 transition-colors duration-200 shadow-lg hover:shadow-xl"
                    >
                      {slide.primaryCta.text}
                    </a>
                    <a
                      href={slide.secondaryCta.href}
                      className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white rounded-xl hover:bg-white hover:text-primary-600 transition-colors duration-200"
                    >
                      {slide.secondaryCta.text}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Dot Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === selectedIndex 
                ? 'bg-white scale-110' 
                : 'bg-white/50 hover:bg-white/70'
            }`}
            onClick={() => scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </>
  );
};

const HeroCarouselClient: React.FC = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // SSR Fallback - show first slide only
  if (!isClient) {
    const firstSlide = heroSlides[0];
    return (
      <section className="relative text-white overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-float"></div>
          <div className="absolute top-32 right-20 w-16 h-16 bg-white/10 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="relative min-h-[500px] flex items-center justify-center rounded-2xl overflow-hidden"
            style={{
              backgroundImage: `${firstSlide.gradient}, url('${firstSlide.backgroundImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="text-center max-w-4xl mx-auto px-6">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in text-white">
                {firstSlide.title}
                <span className="block bg-gradient-to-r from-accent-coral-400 to-accent-teal-400 bg-clip-text">
                  {firstSlide.subtitle}
                </span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto animate-slide-up">
                {firstSlide.description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
                <a
                  href={firstSlide.primaryCta.href}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-primary-600 bg-white rounded-xl hover:bg-gray-100 transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  {firstSlide.primaryCta.text}
                </a>
                <a
                  href={firstSlide.secondaryCta.href}
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white rounded-xl hover:bg-white hover:text-primary-600 transition-colors duration-200"
                >
                  {firstSlide.secondaryCta.text}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-float"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-white/10 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-white/10 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 embla">
        <EmblaCarousel />
      </div>
    </section>
  );
};

export default HeroCarouselClient;