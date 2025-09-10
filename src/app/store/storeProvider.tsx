// app/store/store-provider.tsx
'use client'

import { useRef } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { makeStore } from '@/app/store'
import Loading from '@/components/ui/loading'

interface StoreProviderProps {
  children: React.ReactNode
}

export default function StoreProvider({ children }: StoreProviderProps) {
  const storeRef = useRef<ReturnType<typeof makeStore> | undefined>(undefined)
  
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  return (
    <Provider store={storeRef.current.store}>
      <PersistGate 
        loading={<Loading />} 
        persistor={storeRef.current.persistor}
      >
        {children}
      </PersistGate>
    </Provider>
  )
}