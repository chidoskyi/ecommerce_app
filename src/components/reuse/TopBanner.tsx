"use client";

import React, { useState, useEffect } from 'react';
import { Gift, X } from 'lucide-react';

interface TopBannerProps {
  className?: string;
  onClose?: () => void;
  // onHeightChange?: (height: number) => void;
}

export default function TopBanner({ className, onClose }: TopBannerProps) {
  const [visible, setVisible] = useState(true);
  const bannerRef = React.useRef<HTMLDivElement>(null);


  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
    // if (onHeightChange) onHeightChange(0); // Notify parent that height is now 0
  };

  if (!visible) return null;

  return (
    <div ref={bannerRef} className={`w-full ${className}`}>
      <section className="bg-orange-500">
        <div className="text-white px-4 md:py-4 py-2 text-sm">
          <div className="mx-auto flex items-center justify-between">
            <div></div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 cursor-pointer" />
                <span>Refer a friend and get ₦2,000 off your next purchase!</span>
              </div>
              <button className="underline sm:ml-2">Learn More</button>
            </div>
            <button
              className="text-white hover:text-gray-200"
              onClick={handleClose}
              aria-label="Close banner"
            >
              <X className="w-4 h-4 cursor-pointer" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}