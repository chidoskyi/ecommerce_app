"use client";

import React, { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";

const ShareButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  const openModal = () => {
    setCurrentUrl(window.location.href);
    setIsModalOpen(true);
    setIsCopied(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsCopied(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const shareViaNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: 'Check this out!',
          url: currentUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <>
      <button 
        onClick={openModal}
        className="cursor-pointer text-sm flex items-center space-x-2 bg-orange-50 text-orange-600 px-4 py-2 font-semibold rounded-lg flex-1 justify-center hover:bg-orange-100 transition-colors"
      >
        <Share2 size={20} />
        <span>Share</span>
      </button>

      {/* Share Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Share this product</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            {/* URL Display */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share this link:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={currentUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
                <button
                  onClick={copyToClipboard}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    isCopied 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isCopied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              {isCopied && (
                <p className="text-green-600 text-sm mt-2 flex items-center">
                  <Check size={16} className="mr-1" />
                  Copied to clipboard!
                </p>
              )}
            </div>

            {/* Share Options */}
            <div className="grid grid-cols-2 gap-3">
              {/* Native Share (for mobile) - FIXED CONDITION */}
              {'share' in navigator && (
                <button
                  onClick={shareViaNative}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Share2 size={18} />
                  Share
                </button>
              )}

              {/* Social Media Options */}
              <button
                onClick={() => window.open(`https://twitter.com/intent/tweet?text=Check this out!&url=${encodeURIComponent(currentUrl)}`, '_blank')}
                className="flex items-center justify-center gap-2 bg-[#1DA1F2] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#1a8cd8] transition-colors cursor-pointer"
              >
                <span>Twitter</span>
              </button>

              <button
                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank')}
                className="flex items-center justify-center gap-2 bg-[#1877F2] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#166fe5] transition-colors cursor-pointer"
              >
                <span>Facebook</span>
              </button>

              <button
                onClick={() => window.open(`https://wa.me/?text=Check this out! ${encodeURIComponent(currentUrl)}`, '_blank')}
                className="flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#20bd5a] transition-colors cursor-pointer"
              >
                <span>WhatsApp</span>
              </button>
            </div>

            {/* Close Button */}
            <div className="mt-6">
              <button
                onClick={closeModal}
                className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareButton;