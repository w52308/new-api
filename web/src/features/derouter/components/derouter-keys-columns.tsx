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
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { toIntlLocale } from '@/i18n/languages'

import { ApiKeyTimestampCell } from '@/features/keys/components/api-key-timestamp-cell'

import type { DerouterKeyListItem } from '../types'
import { derouterKeyDerivedStatus } from '../constants'
import {
  DerouterBudgetCell,
  DerouterStatusBadge,
} from './derouter-key-cells'
import { DerouterKeyCell } from './derouter-key-cell'
import { DerouterKeysRowActions } from './derouter-keys-row-actions'

export function useDerouterKeysColumns(
  now: number
): ColumnDef<DerouterKeyListItem>[] {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)

  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='translate-y-[2px]'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label='Select row'
          className='translate-y-[2px]'
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      accessorKey: 'name',
      header: t('Name'),
      cell: ({ row }) => (
        <span className='font-medium'>{row.getValue('name')}</span>
      ),
      size: 180,
      meta: { mobileTitle: true },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('Status'),
      cell: ({ row }) => <DerouterStatusBadge balance={row.original.balance} />,
      // Derive the filter value from the live balance, not the local status.
      filterFn: (row, _id, value) =>
        value.includes(derouterKeyDerivedStatus(row.original.balance)),
      enableSorting: false,
      size: 120,
      meta: { mobileBadge: true },
    },
    {
      id: 'key',
      accessorKey: 'key',
      header: t('API Key'),
      cell: ({ row }) => <DerouterKeyCell item={row.original} />,
      enableSorting: false,
      size: 260,
    },
    {
      id: 'balance',
      accessorKey: 'balance',
      header: t('Budget'),
      cell: ({ row }) => <DerouterBudgetCell balance={row.original.balance} />,
      enableSorting: false,
      size: 170,
      meta: { mobileHidden: true },
    },
    {
      id: 'owner',
      accessorKey: 'user_id',
      header: t('Owner'),
      cell: ({ row }) => {
        const item = row.original
        if (!item.user_id) {
          return <span className='text-muted-foreground text-xs'>-</span>
        }
        return (
          <span className='text-muted-foreground text-xs'>
            {item.display_name || item.username || `#${item.user_id}`}
          </span>
        )
      },
      enableSorting: false,
      size: 160,
      meta: { mobileHidden: true },
    },
    {
      accessorKey: 'created_time',
      header: t('Created'),
      cell: ({ row }) => (
        <ApiKeyTimestampCell
          timestamp={row.getValue('created_time')}
          now={now}
          locale={locale}
          justNowLabel={t('Just now')}
          className='text-muted-foreground'
        />
      ),
      size: 180,
      meta: { mobileHidden: true },
    },
    {
      id: 'actions',
      header: () => t('Actions'),
      cell: ({ row }) => <DerouterKeysRowActions row={row} />,
      meta: { pinned: 'right' as const },
    },
  ]
}
