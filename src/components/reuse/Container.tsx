import React from 'react'

function Container({ children, className }: { children?: React.ReactNode, className?: string }) {
  return (
    <div className={`px-4 sm:container max-w-2xl mx-auto ${className}`}>
      {children}
    </div>
  )
}

export default Container