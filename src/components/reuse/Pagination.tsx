import { PaginationProps } from "@/lib/types"
import { ChevronLeft, ChevronRight } from "lucide-react"


export const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page, current range, and last page with ellipsis
      if (currentPage <= 3) {
        // Show first 3 pages + ellipsis + last page
        pages.push(1, 2, 3)
        if (totalPages > 4) {
          pages.push('...')
          pages.push(totalPages)
        }
      } else if (currentPage >= totalPages - 2) {
        // Show first page + ellipsis + last 3 pages
        pages.push(1)
        if (totalPages > 4) {
          pages.push('...')
        }
        pages.push(totalPages - 2, totalPages - 1, totalPages)
      } else {
        // Show first + ellipsis + current range + ellipsis + last
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-center gap-2 mt-10">
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`
          flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${currentPage === 1 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-gray-600 cursor-pointer hover:text-gray-900 hover:bg-gray-100'
          }
        `}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`
                min-w-[40px] h-[40px] flex items-center cursor-pointer justify-center rounded-md text-sm font-medium transition-colors
                ${currentPage === page
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                }
              `}
            >
              {page}
            </button>
          )
        ))}
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`
          flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
          ${currentPage === totalPages 
            ? 'text-gray-400 cursor-not-allowed' 
            : 'text-gray-600 cursor-pointer hover:text-gray-900 hover:bg-gray-100'
          }
        `}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}