// components/Breadcrumb.tsx
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Container from '@/components/reuse/Container'; // Adjust import based on your project structure

function Breadcrumb() {
  const pathname = usePathname();
  
const currentPageSlug = pathname!.split("/").filter(Boolean).pop() || ""
  
  // Capitalize the page name (e.g., 'about' -> 'About')
  // Handles multi-word slugs like 'my-page' -> 'My Page'
  const currentPageName = currentPageSlug
    ? currentPageSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '';

  return (
    <div className="w-full bg-white mx-auto px-4 sm:px-6 lg:px-8 py-5 mb-5">
      <Container className="text-lg text-gray-500">
        <Link href="/">
          <span className="hover:text-orange-600 cursor-pointer">Home</span>
        </Link>
        {currentPageName && (
          <>
            <span className="mx-2">›</span>
            <span className="text-gray-900 text-sm capitalize">{currentPageName}</span>
          </>
        )}
      </Container>
    </div>
  );
}

export default Breadcrumb;