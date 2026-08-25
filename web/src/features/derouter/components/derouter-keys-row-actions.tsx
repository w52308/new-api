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
import type { Row } from '@tanstack/react-table'
import { Eye, Wallet, Trash2, Copy, Loader2, Percent } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { DataTableRowActionMenu } from '@/components/data-table/core/row-action-menu'
import { Button } from '@/components/ui/button'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import type { DerouterKeyListItem } from '../types'
import { useDerouterKeys } from './derouter-keys-provider'

type DerouterKeysRowActionsProps<TData> = {
  row: Row<TData>
}

export function DerouterKeysRowActions<TData>({
  row,
}: DerouterKeysRowActionsProps<TData>) {
  const { t } = useTranslation()
  const item = row.original as DerouterKeyListItem
  const user = useAuthStore((s) => s.auth.user)
  const isAdmin = Boolean(user && (user.role ?? 0) >= ROLE.ADMIN)
  const {
    setOpen,
    setCurrentRow,
    resolveFullKey,
    resolvedKeys,
  } = useDerouterKeys()
  const [isCopying, setIsCopying] = useState(false)
  const resolvedKey = resolvedKeys[item.id]

  const handleCopy = useCallback(async () => {
    const key = resolvedKey || (await resolveFullKey(item.id))
    if (!key) {
      toast.info(t('API key is loading, please try again in a moment'))
      return
    }
    setIsCopying(true)
    const ok = await copyToClipboard(key)
    if (ok) toast.success(t('Copied'))
    setIsCopying(false)
  }, [item.id, resolvedKey, resolveFullKey, t])

  return (
    <div className='-ml-1.5 flex items-center gap-1'>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={() => {
                setCurrentRow(item)
                setOpen('view')
              }}
              aria-label={t('View')}
            />
          }
        >
          <Eye />
        </TooltipTrigger>
        <TooltipContent>{t('View')}</TooltipContent>
      </Tooltip>

      {isAdmin && (
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => {
                    setCurrentRow(item)
                    setOpen('adjust')
                  }}
                  aria-label={t('Adjust')}
                />
              }
            >
              <Wallet />
            </TooltipTrigger>
            <TooltipContent>{t('Adjust')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => {
                    setCurrentRow(item)
                    setOpen('multiplier')
                  }}
                  aria-label={t('Multiplier')}
                />
              }
            >
              <Percent />
            </TooltipTrigger>
            <TooltipContent>{t('Multiplier')}</TooltipContent>
          </Tooltip>
        </>
      )}

      <DataTableRowActionMenu ariaLabel={t('Open menu')} contentClassName='w-[200px]' modal={false}>
        <DropdownMenuItem onClick={handleCopy} disabled={isCopying}>
          {isCopying ? (
            <Loader2 className='mr-2 size-4 animate-spin' />
          ) : (
            <>
              {t('Copy Key')}
              <DropdownMenuShortcut>
                <Copy size={16} />
              </DropdownMenuShortcut>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(item)
            setOpen('delete')
          }}
          className='text-destructive focus:text-destructive'
        >
          {t('Delete')}
          <DropdownMenuShortcut>
            <Trash2 size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DataTableRowActionMenu>
    </div>
  )
}
