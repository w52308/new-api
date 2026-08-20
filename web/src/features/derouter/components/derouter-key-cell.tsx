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
import { Check, Copy, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { copyToClipboard } from '@/lib/copy-to-clipboard'

import { formatFullKey } from '@/features/keys/constants'

import type { DerouterKeyListItem } from '../types'
import { useDerouterKeys } from './derouter-keys-provider'

export function DerouterKeyCell({ item }: { item: DerouterKeyListItem }) {
  const { t } = useTranslation()
  const { resolveFullKey, fullKey, setFullKey } = useDerouterKeys()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [loadingKey, setLoadingKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const maskedKey = formatFullKey(item.key)

  const handlePopoverOpen = useCallback(
    (open: boolean) => {
      setPopoverOpen(open)
      if (open) {
        setFullKey('')
        setLoadingKey(true)
        void resolveFullKey(item.id)
          .then((key) => {
            if (key) setFullKey(key)
          })
          .finally(() => setLoadingKey(false))
      }
    },
    [item.id, resolveFullKey, setFullKey]
  )

  const handleCopy = useCallback(async () => {
    const realKey = await resolveFullKey(item.id)
    if (!realKey) return
    const ok = await copyToClipboard(realKey)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }, [item.id, resolveFullKey])

  let copyIcon = <Copy className='size-3.5' />
  let copyTooltip = t('Copy API key')
  if (loadingKey) {
    copyIcon = <Loader2 className='size-3.5 animate-spin' />
    copyTooltip = t('Loading...')
  } else if (copied) {
    copyIcon = <Check className='size-3.5 text-green-600' />
    copyTooltip = t('Copied!')
  }

  return (
    <div className='flex max-w-full min-w-0 items-center'>
      <Popover open={popoverOpen} onOpenChange={handlePopoverOpen}>
        <PopoverTrigger
          render={
            <Button
              variant='ghost'
              size='sm'
              className='text-muted-foreground h-7 max-w-full min-w-0 justify-start truncate px-0 font-mono text-xs hover:bg-transparent aria-expanded:bg-transparent'
            />
          }
        >
          <span className='truncate'>{maskedKey}</span>
        </PopoverTrigger>
        <PopoverContent
          className='w-auto max-w-[min(90vw,28rem)]'
          align='start'
        >
          <div className='space-y-2'>
            <p className='text-muted-foreground text-xs'>
              {t('Full API Key')}
            </p>
            {loadingKey ? (
              <div className='flex items-center gap-2 py-2'>
                <Loader2 className='size-3.5 animate-spin' />
                <span className='text-muted-foreground text-xs'>
                  {t('Loading...')}
                </span>
              </div>
            ) : (
              <input
                readOnly
                value={fullKey || maskedKey}
                autoFocus
                onFocus={(e) => e.target.select()}
                className='bg-muted/50 w-full min-w-[280px] rounded-md border px-3 py-2 font-mono text-xs outline-none'
              />
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon'
              className='size-7 shrink-0'
              onClick={handleCopy}
              disabled={loadingKey}
            />
          }
        >
          {copyIcon}
        </TooltipTrigger>
        <TooltipContent>{copyTooltip}</TooltipContent>
      </Tooltip>
    </div>
  )
}
