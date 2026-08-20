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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

import { adjustDerouterKeyBudget } from '../../api'
import type { DerouterKeyBalance } from '../../types'
import { useDerouterKeys } from '../derouter-keys-provider'

export function AdjustBudgetDialog({ onAdjusted }: { onAdjusted: () => void }) {
  const { t } = useTranslation()
  const { open, setOpen, currentRow: row, resolveBalance } = useDerouterKeys()
  const dialogOpen = open === 'adjust'
  const [amount, setAmount] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [balance, setBalance] = useState<DerouterKeyBalance | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  // Load live balance whenever the dialog opens for a row so the user sees the
  // current state before adjusting.
  useEffect(() => {
    if (!dialogOpen || !row) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAmount('')
    setBalance(null)
    setBalanceError(null)
    void resolveBalance(row.id)
      .then((b) => {
        if (b) {
          setBalance(b)
        } else {
          setBalanceError(t('Failed to load balance'))
        }
      })
  }, [dialogOpen, row, resolveBalance, t])

  const handleAdjust = async () => {
    if (!row) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value === 0) {
      toast.error(t('Invalid amount'))
      return
    }
    setAdjusting(true)
    try {
      const res = await adjustDerouterKeyBudget(row.id, value)
      if (res.success) {
        toast.success(t('Balance updated'))
        onAdjusted()
        setOpen(null)
      } else {
        toast.error(res.message || t('Failed to adjust budget'))
      }
    } catch {
      toast.error(t('Failed to adjust budget'))
    } finally {
      setAdjusting(false)
    }
  }

  let balanceBlock: React.ReactNode
  if (balanceError) {
    balanceBlock = (
      <div className='text-destructive rounded-md border px-3 py-2 text-sm'>
        {balanceError}
      </div>
    )
  } else if (balance) {
    balanceBlock = (
      <div className='bg-muted/50 flex items-center justify-between rounded-md border px-3 py-2 text-sm'>
        <span className='text-muted-foreground'>{t('Remaining')}</span>
        <span className='font-medium tabular-nums'>
          {balance.remainingVirtual?.toFixed(2) ?? '-'}
        </span>
      </div>
    )
  } else {
    balanceBlock = <Skeleton className='h-9 w-full' />
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('Adjust Budget')}</DialogTitle>
          <DialogDescription>
            {t(
              'Enter a positive amount to recharge, or a negative amount to deduct.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          {row && (
            <div className='text-muted-foreground text-sm'>{row.name}</div>
          )}
          {balanceBlock}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('Amount')}</label>
            <Input
              type='number'
              step='0.01'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder='e.g. 5 or -3'
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => setOpen(null)}
          >
            {t('Cancel')}
          </Button>
          <Button
            type='button'
            disabled={adjusting}
            onClick={() => void handleAdjust()}
          >
            {adjusting ? t('Adjusting...') : t('Adjust')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
