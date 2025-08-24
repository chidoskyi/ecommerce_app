import Image from "next/image";
import { getCloudinaryUrl } from "@/utils/cloudinary";
import Container from "../reuse/Container";

const blackFriday = "v1752761851/banner3_yriwbu.webp";

export default function PromotionalSection() {
  return (
    <Container className="mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Promotion */}
        <div className="text-center py-12">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-semibold font-proxima">
            Order Today And <br />
            <span className="bg-[#161B20] mt-2 rounded-xl text-white px-3 py-1 inline-block rotate-[1.5deg]">
              Save Up To
            </span>
            20%!
          </h1>
          <p className="text-gray-500">
            Save when you order from FeedMe's top deals
          </p>
        </div>

        {/* Black Friday Card */}
        <div className="bg-gray-900 rounded-2xl text-center text-white">
          <div className="mb-4 p-6">
            <h3 className="text-xl font-bold mb-2">Blackfriday</h3>
            <p className="text-gray-400 text-sm">PROMO SALES</p>
          </div>

          <button className="bg-white text-gray-900 px-6 py-2 rounded-lg font-medium mb-6">
            Shop Now
          </button>

          <div className="flex items-center justify-center gap-2">
            <Image
              src={getCloudinaryUrl(blackFriday, {
                width: 800,
                height: 400,
              })}
              alt="Black Friday Promo"
              width={800}
              height={400}
            />
          </div>
        </div>
      </div>
    </Container>
  );
}
