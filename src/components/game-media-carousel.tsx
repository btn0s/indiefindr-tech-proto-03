"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";

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
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Only use screenshots for carousel (header image will be in header row)
  const allImages = steamData.screenshots || [];

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-scroll thumbnail container to keep active thumbnail visible
  useEffect(() => {
    const thumbnailContainer = document.querySelector(".thumbnail-container");
    const activeThumbnail = document.querySelector(
      `[data-thumbnail-index="${current}"]`
    );

    if (thumbnailContainer && activeThumbnail) {
      activeThumbnail.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [current]);

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (allImages.length <= 1) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setCurrent((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setCurrent((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
          break;
        // Escape is handled by Dialog automatically
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, allImages.length]);

  if (allImages.length === 0) {
    return (
      <div className="w-full aspect-[16/9] bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">No Media Available</span>
      </div>
    );
  }

  return (
    <>
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
                  <div className="relative overflow-hidden rounded-lg">
                    <Image
                      src={image.path_full}
                      alt={`${steamData.name} - Image ${index + 1}`}
                      width={800}
                      height={450}
                      className="w-full aspect-[16/9] object-cover rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200"
                      onClick={() => setLightboxOpen(true)}
                      unoptimized
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Navigation arrows */}
            {allImages.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => api?.scrollPrev()}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white px-2 py-1 rounded-md backdrop-blur-sm hover:bg-black/50 border-none z-10"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => api?.scrollNext()}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white px-2 py-1 rounded-md backdrop-blur-sm hover:bg-black/50 border-none z-10"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Image counter */}
            {allImages.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/30 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm z-10">
                {current + 1} / {allImages.length}
              </div>
            )}
          </div>
        </Carousel>

        {/* Thumbnail strip */}
        {allImages.length > 1 && (
          <div className="thumbnail-container flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scroll-smooth">
            <div className="flex gap-2 px-1">
              {allImages.map((image: GameImage, index: number) => (
                <button
                  key={`thumb-${image.id || index}`}
                  data-thumbnail-index={index}
                  onClick={() => api?.scrollTo(index)}
                  className="flex-shrink-0 focus:outline-none rounded"
                >
                  <Image
                    src={image.path_thumbnail}
                    alt={`Thumbnail ${index + 1}`}
                    width={120}
                    height={67}
                    className={`w-20 h-11 object-cover rounded transition-all duration-200 ${
                      current === index
                        ? "brightness-100"
                        : "brightness-50 hover:brightness-75"
                    }`}
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-0 bg-transparent border-none">
          <Image
            src={allImages[current]?.path_full}
            alt={`${steamData.name} - Screenshot ${current + 1}`}
            width={1920}
            height={1080}
            className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
            unoptimized
            priority
          />

          {/* Navigation in lightbox */}
          {allImages.length > 1 && (
            <>
              <Button
                size="icon"
                variant="secondary"
                onClick={() =>
                  setCurrent((prev) =>
                    prev === 0 ? allImages.length - 1 : prev - 1
                  )
                }
                aria-label="Previous image"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white px-2 py-1 rounded-md backdrop-blur-sm hover:bg-black/50"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>

              <span className="text-sm text-muted-foreground absolute left-1/2 -translate-x-1/2 bottom-2 bg-black/30 text-white px-2 py-1 rounded-md backdrop-blur-sm">
                {current + 1} / {allImages.length}
              </span>

              <Button
                size="icon"
                variant="secondary"
                onClick={() =>
                  setCurrent((prev) =>
                    prev === allImages.length - 1 ? 0 : prev + 1
                  )
                }
                aria-label="Next image"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white px-2 py-1 rounded-md backdrop-blur-sm hover:bg-black/50"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
