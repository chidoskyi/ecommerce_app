// app/not-found.tsx
import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-white text-center">
      {/* Large Center Image */}
      <div className="relative w-full max-w-md h-90 sm:h-96 mb-10">
      <Image
  src="/404.gif"
  alt="Page Not Found"
  unoptimized
  width={600}
  height={400}
  priority
/>

      </div>

      {/* Heading */}
      <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-4">
        404 — Page Not Found
      </h1>

      {/* Subtext */}
      <p className="text-lg text-gray-500 mb-6">
        Sorry, the page you were looking for doesn’t exist.
      </p>

      {/* Go Home Button */}
      <Link
        href="/"
        className="inline-block bg-black text-white px-6 py-3 rounded-xl shadow hover:bg-gray-800 transition"
      >
        Go to Homepage
      </Link>
    </div>
  );
}
