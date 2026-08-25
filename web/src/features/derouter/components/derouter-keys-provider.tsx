/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import React, { useState, useCallback, useRef } from 'react'

import useDialogState from '@/hooks/use-dialog'

import {
  getDerouterKey,
  getDerouterKeyBalance,
} from '../api'
import type { DerouterKeyBalance, DerouterKeyListItem } from '../types'

export type DerouterKeysDialogType =
  | 'view'
  | 'adjust'
  | 'multiplier'
  | 'delete'
  | 'create'

type DerouterKeysContextType = {
  open: DerouterKeysDialogType | null
  setOpen: (str: DerouterKeysDialogType | null) => void
  currentRow: DerouterKeyListItem | null
  setCurrentRow: React.Dispatch<
    React.SetStateAction<DerouterKeyListItem | null>
  >
  refreshTrigger: number
  triggerRefresh: () => void
  fullKey: string
  setFullKey: React.Dispatch<React.SetStateAction<string>>
  resolveFullKey: (id: number) => Promise<string | null>
  resolvedKeys: Record<number, string>
  balance: DerouterKeyBalance | null
  setBalance: React.Dispatch<React.SetStateAction<DerouterKeyBalance | null>>
  resolveBalance: (id: number) => Promise<DerouterKeyBalance | null>
}

const DerouterKeysContext =
  React.createContext<DerouterKeysContextType | null>(null)

export function DerouterKeysProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useDialogState<DerouterKeysDialogType>(null)
  const [currentRow, setCurrentRow] =
    useState<DerouterKeyListItem | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [fullKey, setFullKey] = useState('')
  const [balance, setBalance] = useState<DerouterKeyBalance | null>(null)
  const [resolvedKeys, setResolvedKeys] = useState<Record<number, string>>({})
  const pendingKeyRef = useRef<Record<number, Promise<string | null>>>({})
  const pendingBalanceRef = useRef<
    Record<number, Promise<DerouterKeyBalance | null>>
  >({})

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  const resolveFullKey = useCallback(
    async (id: number): Promise<string | null> => {
      if (resolvedKeys[id]) return resolvedKeys[id]
      const pending = pendingKeyRef.current[id]
      if (pending !== undefined) return pending
      const request = (async () => {
        try {
          const res = await getDerouterKey(id)
          if (res.success && res.data?.key) {
            const key = res.data.key
            setResolvedKeys((prev) => ({ ...prev, [id]: key }))
            return key
          }
          return null
        } catch {
          return null
        } finally {
          delete pendingKeyRef.current[id]
        }
      })()
      pendingKeyRef.current[id] = request
      return request
    },
    [resolvedKeys]
  )

  const resolveBalance = useCallback(
    async (id: number): Promise<DerouterKeyBalance | null> => {
      const pending = pendingBalanceRef.current[id]
      if (pending !== undefined) return pending
      const request = (async () => {
        try {
          const res = await getDerouterKeyBalance(id)
          if (res.success && res.data) {
            return res.data
          }
          return null
        } catch {
          return null
        } finally {
          delete pendingBalanceRef.current[id]
        }
      })()
      pendingBalanceRef.current[id] = request
      return request
    },
    []
  )

  // Reset per-row transient state whenever the target row changes. The reset
  // is deferred to avoid calling setState synchronously inside an effect.
  return (
    <DerouterKeysContext
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        refreshTrigger,
        triggerRefresh,
        fullKey,
        setFullKey,
        resolveFullKey,
        resolvedKeys,
        balance,
        setBalance,
        resolveBalance,
      }}
    >
      {children}
    </DerouterKeysContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDerouterKeys = () => {
  const ctx = React.useContext(DerouterKeysContext)
  if (!ctx) {
    throw new Error('useDerouterKeys has to be used within <DerouterKeysProvider>')
  }
  return ctx
}
