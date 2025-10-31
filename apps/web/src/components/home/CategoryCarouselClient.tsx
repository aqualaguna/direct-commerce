import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

interface Category {
  name: string;
  slug: string;
  image: string;
  productCount: number;
  color: string;
}

interface CategoryCarouselProps {
  categories: Category[];
}

const CategoryCarousel: React.FC<CategoryCarouselProps> = ({ categories }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    skipSnaps: false,
    dragFree: false,
    containScroll: 'trimSnaps',
    slidesToScroll: 1,
    breakpoints: {
      '(min-width: 768px)': { slidesToScroll: 2 },
      '(min-width: 1024px)': { slidesToScroll: 4 }
    }
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative">
      <div className="embla category-carousel overflow-hidden" ref={emblaRef}>
        <div className="embla__container flex p-1 gap-3">
          {categories.map((category, index) => (
            <div key={category.slug} className="flex-shrink-0" style={{ width: '120px' }}>
              <div className="group cursor-pointer bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow duration-200 w-full">
                <div className="relative overflow-hidden rounded-lg mb-3">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-24 sm:h-28 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900 text-center">{category.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <button
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 ${
          canScrollPrev 
            ? 'opacity-100 hover:scale-110 hover:shadow-xl' 
            : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label="Previous categories"
      >
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
      </button>

      <button
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 ${
          canScrollNext 
            ? 'opacity-100 hover:scale-110 hover:shadow-xl' 
            : 'opacity-50 cursor-not-allowed'
        }`}
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Next categories"
      >
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
      </button>
    </div>
  );
};

const CategoryCarouselClient: React.FC<CategoryCarouselProps> = ({ categories }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Server-side fallback - show first 4 categories in a grid
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {categories.slice(0, 6).map((category, index) => (
          <div key={category.slug} className={`group animate-fade-in stagger-${index + 1} bg-white rounded-xl p-3 shadow-sm flex-shrink-0`} style={{ width: '120px' }}>
            <div className="relative overflow-hidden rounded-lg mb-3">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-24 sm:h-28 object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 text-center">{category.name}</h3>
          </div>
        ))}
      </div>
    );
  }

  return <CategoryCarousel categories={categories} />;
};

export default CategoryCarouselClient;
