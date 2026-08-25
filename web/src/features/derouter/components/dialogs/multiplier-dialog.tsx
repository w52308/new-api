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
import { useState } from 'react'
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

import { setDerouterKeyMultiplier } from '../../api'
import { useDerouterKeys } from '../derouter-keys-provider'

const maxMultiplier = 100

export function MultiplierDialog({ onUpdated }: { onUpdated: () => void }) {
  const { t } = useTranslation()
  const { open, setOpen, currentRow: row } = useDerouterKeys()
  const dialogOpen = open === 'multiplier'
  const [multiplier, setMultiplier] = useState('')
  const [updating, setUpdating] = useState(false)

  const handleUpdate = async () => {
    if (!row) return
    const value = Number(multiplier)
    if (!Number.isFinite(value) || value <= 0 || value > maxMultiplier) {
      toast.error(t('Invalid multiplier'))
      return
    }
    setUpdating(true)
    try {
      const res = await setDerouterKeyMultiplier(row.id, value)
      if (res.success) {
        toast.success(t('Multiplier updated'))
        onUpdated()
        setOpen(null)
      } else {
        toast.error(res.message || t('Failed to set multiplier'))
      }
    } catch {
      toast.error(t('Failed to set multiplier'))
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('Set Multiplier')}</DialogTitle>
          <DialogDescription>
            {t(
              'Set the customer-facing display multiplier (倍率) for this sub-key.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          {row && (
            <div className='text-muted-foreground text-sm'>{row.name}</div>
          )}
          <div className='border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-md border px-3 py-2 text-sm'>
            {t(
              'Sensitive: this changes how much the sub-key customers are charged relative to the upstream cost.'
            )}
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('Multiplier')}</label>
            <Input
              type='number'
              step='0.01'
              min='0.01'
              max={maxMultiplier}
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              placeholder='e.g. 1.0'
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
            disabled={updating}
            onClick={() => void handleUpdate()}
          >
            {updating ? t('Updating...') : t('Confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
