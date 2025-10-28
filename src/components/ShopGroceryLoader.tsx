export default function ShopGroceryLoader() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          {/* Logo Text */}
          <h1 className="text-6xl font-bold text-orange-500 mb-10 animate-pulse-scale">
            shopgrocery
          </h1>
          
          {/* Bouncing Dots */}
          <div className="flex justify-center gap-3 mb-8">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce-custom" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce-custom" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce-custom" style={{ animationDelay: '0.4s' }}></div>
          </div>
          
          {/* Loading Text */}
          <p className="text-gray-600 text-base mt-4">Loading...</p>
        </div>
  
        <style jsx>{`
          @keyframes pulse-scale {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.02);
            }
          }
  
          @keyframes bounce-custom {
            0%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-15px);
            }
          }
  
          .animate-pulse-scale {
            animation: pulse-scale 2s ease-in-out infinite;
          }
  
          .animate-bounce-custom {
            animation: bounce-custom 1.4s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }