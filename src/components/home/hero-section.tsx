"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Container from "../reuse/Container";
import { getCloudinaryUrl } from "@/utils/cloudinary";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dgxsqjeun";

const slides = [

  { src: "v1752761850/banner2_uegfoo.webp", link: "/"},
  { src: "v1756822951/payday_deals_xc1r4b.jpg", link: "/"},
  { src: "v1756822520/fresh-clean_banner_q8obtw.jpg", link: "/"},
];
// { src: "v1752761841/banner1_lfgq3i.webp", link: "/"},

// { src: "v1752761851/banner4_sb3r5a.webp", title: "LOCAL GOODS", link: "/" },
const sideBanners = [
  { src: "v1752761841/banner1_lfgq3i.webp", title: "LOCAL GOODS", link: "/" },
  {
    src: "v1752761851/banner5_tcuozl.webp",
    title: "Order Your Groceries Now!",
    link: "/"
  },
];

export default function HeroSection() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (i: number) => {
    setIndex(i);
  };

  return (
    <Container className="mx-auto px-4 pt-8 pb-10 relative z-0">
      <div className="grid grid-cols-1 relative lg:grid-cols-3 gap-5">
        {/* Main Carousel */}
        <div className="lg:col-span-2 md:h-[520px] h-[200px] flex flex-col gap-5 justify-between relative overflow-hidden ">
          <div className="relative h-full w-full">
            {slides.map((path, i) => (
              <div
                key={path.src}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                  index === i
                    ? "opacity-100 translate-x-0"
                    : i < index
                    ? "opacity-0 -translate-x-full"
                    : "opacity-0 translate-x-full"
                }`}
              >
                <Link href={path.link}>
                <div className="relative w-full h-full">
                 <Image
                  src={getCloudinaryUrl(path.src, { width: 1600, height: 800 })}
                  alt={`Slide ${i + 1}`}
                  fill
                  className="object-cover w-full h-full"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={i === 0}
                />
                </div>
                </Link>
               
              </div>
            ))}
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`w-[8px] md:w-3 h-[8px] md:h-3 rounded-full transition-all cursor-pointer ${
                  index === i
                    ? "bg-gray-800 w-6"
                    : "bg-gray-800 " + "opacity-50 hover:opacity-100"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Side Banners */}
        <div className="flex flex-row space-x-4 md:flex-col md:space-x-0 md:space-y-4 z-0">
          {sideBanners.map((banner, i) => (
            <div
              key={banner.src}
              className="relative h-[100px] md:w-full w-1/2 md:h-[250px] overflow-hidden"
            >
              <Link href={banner.link}>
              <div className="relative w-full h-full">
              <Image
                src={getCloudinaryUrl(banner.src, { width: 800, height: 400 })}
                alt={banner.title}
                fill
                loading="lazy"
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 25vw"
              />
              </div>
              </Link>
              
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
