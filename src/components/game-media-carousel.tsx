"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface GameImage {
  id?: string;
  path_full: string;
  path_thumbnail: string;
}

interface GameMediaCarouselProps {
  steamData: any;
}

export function GameMediaCarousel({ steamData }: GameMediaCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Only use screenshots for carousel (header image will be in header row)
  const allImages = steamData.screenshots || [];

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);


  if (allImages.length === 0) {
    return (
      <div className="w-full aspect-[16/9] bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">No Media Available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Carousel */}
      <Carousel
        setApi={setApi}
        className="w-full focus:outline-none"
        tabIndex={0}
      >
        <div className="relative">
          <CarouselContent>
            {allImages.map((image: GameImage, index: number) => (
              <CarouselItem key={image.id || index}>
                <div className="relative">
                  <Image
                    src={image.path_full}
                    alt={`${steamData.name} - Image ${index + 1}`}
                    width={800}
                    height={450}
                    className="w-full aspect-[16/9] object-cover rounded-lg shadow-lg"
                    unoptimized
                  />

                  {/* Image counter */}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {current + 1} / {allImages.length}
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation arrows */}
          {allImages.length > 1 && (
            <>
              <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 border-none" />
              <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 border-none" />
            </>
          )}
        </div>
      </Carousel>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <Carousel className="w-full">
          <CarouselContent>
            {allImages.map((image: GameImage, index: number) => (
              <CarouselItem
                key={`thumb-${image.id || index}`}
                className="basis-auto"
              >
                <button
                  onClick={() => api?.scrollTo(index)}
                  className="flex-shrink-0"
                >
                  <Image
                    src={image.path_thumbnail}
                    alt={`Thumbnail ${index + 1}`}
                    width={120}
                    height={67}
                    className={`w-20 h-11 object-cover rounded ${
                      current === index ? "" : "brightness-50"
                    }`}
                    unoptimized
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      )}
    </div>
  );
}
