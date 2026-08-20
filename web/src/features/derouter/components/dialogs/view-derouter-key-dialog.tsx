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
import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { cn } from '@/lib/utils'

import { useDerouterKeys } from '../derouter-keys-provider'

function budgetBarColor(pct: number): string {
  if (pct <= 20) return 'bg-destructive'
  if (pct <= 50) return 'bg-warning'
  return 'bg-primary'
}

export function ViewDerouterKeyDialog() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow: row } = useDerouterKeys()
  const dialogOpen = open === 'view'
  const [loadingKey, setLoadingKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [balance, setBalance] = useState<{
    budgetVirtual?: number
    spentVirtual?: number
    remainingVirtual?: number
  } | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const { resolveFullKey, resolveBalance, fullKey, setFullKey } =
    useDerouterKeys()

  // Fetch the full sub-key + live balance on demand when the dialog opens for a
  // row. We react to the row change instead of onOpenChange (Base UI does not
  // fire onOpenChange for controlled open prop changes).
  useEffect(() => {
    if (!dialogOpen || !row) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingKey(true)
    setError(null)
    setCopied(false)
    setBalance(null)
    setBalanceError(null)
    setFullKey('')
    void resolveFullKey(row.id)
      .then((key) => {
        if (key) {
          setFullKey(key)
        } else {
          setError(t('Failed to load API key'))
        }
      })
      .finally(() => setLoadingKey(false))
    void resolveBalance(row.id)
      .then((b) => {
        if (b) {
          setBalance(b)
        } else {
          setBalanceError(t('Failed to load balance'))
        }
      })
  }, [dialogOpen, row, resolveFullKey, resolveBalance, setFullKey, t])

  const handleCopy = async () => {
    if (!fullKey) return
    const ok = await copyToClipboard(fullKey)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  let keyContent: React.ReactNode
  if (loadingKey) {
    keyContent = <Skeleton className='h-10 w-full' />
  } else if (error) {
    keyContent = (
      <div className='text-destructive rounded-md border px-3 py-2 text-sm'>
        {error}
      </div>
    )
  } else if (fullKey) {
    keyContent = (
      <div className='bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-xs'>
        <span className='min-w-0 flex-1 break-all'>{fullKey}</span>
        <button
          type='button'
          className='text-muted-foreground hover:text-foreground shrink-0'
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <Check className='size-4 text-green-600' />
          ) : (
            <Copy className='size-4' />
          )}
        </button>
      </div>
    )
  } else {
    keyContent = null
  }

  let balanceContent: React.ReactNode
  if (balanceError) {
    balanceContent = (
      <div className='text-destructive rounded-md border px-3 py-2 text-sm'>
        {balanceError}
      </div>
    )
  } else if (balance) {
    const spent = balance.spentVirtual ?? 0
    const budget = balance.budgetVirtual ?? 0
    const remaining = balance.remainingVirtual ?? 0
    const pct =
      budget > 0 ? Math.max(0, Math.min(100, (remaining / budget) * 100)) : 0
    balanceContent = (
      <div className='space-y-2'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>{t('Budget')}</span>
          <span className='font-medium tabular-nums'>
            {budget.toFixed(2)}
            <span className='text-muted-foreground font-normal'> / </span>
            {remaining.toFixed(2)}
          </span>
        </div>
        <div className='h-2 w-full overflow-hidden rounded-full bg-muted'>
          <div
            className={cn(
              'h-full rounded-full transition-all',
              budgetBarColor(pct)
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className='text-muted-foreground flex items-center justify-between text-xs'>
          <span>
            {t('Spent')}: {spent.toFixed(2)}
          </span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      </div>
    )
  } else {
    balanceContent = <Skeleton className='h-10 w-full' />
  }

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(v) => !v && setOpen(null)}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('View Derouter API Key')}</DialogTitle>
          <DialogDescription>
            {t('The full API key is sensitive. Copy it to your clipboard now.')}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-3'>
          {row && (
            <div className='text-muted-foreground text-sm'>{row.name}</div>
          )}
          {keyContent}
          <div className='text-muted-foreground text-xs'>{t('Balance')}</div>
          {balanceContent}
        </div>
        <DialogFooter>
          <Button type='button' onClick={() => setOpen(null)}>
            {t('Done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
