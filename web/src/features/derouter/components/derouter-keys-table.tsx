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
import type { Table as TanstackTable } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Database } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  DataTablePage,
  useDataTable,
} from '@/components/data-table'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import {
  getAllDerouterKeys,
  getDerouterKeys,
  searchDerouterKeys,
} from '../api'
import type { DerouterKeyListItem } from '../types'
import {
  DEROUTER_STATUS_OPTIONS,
  isDerouterKeyExhausted,
} from '../constants'
import { DerouterStatusBadge } from './derouter-key-cells'
import { useDerouterKeys } from './derouter-keys-provider'
import { useDerouterKeysColumns } from './derouter-keys-columns'
import { DerouterKeysRowActions } from './derouter-keys-row-actions'

const route = getRouteApi('/_authenticated/derouter-keys/')
const DEROUTER_KEYS_COLUMN_VISIBILITY_STORAGE_KEY =
  'derouter-keys:column-visibility'

const DISABLED_ROW_MOBILE =
  '[--data-table-card-bg:var(--table-disabled)] data-[state=selected]:![--data-table-card-bg:var(--table-disabled)] [background-color:var(--table-disabled)]'
const DISABLED_ROW_DESKTOP =
  '[--data-table-card-bg:var(--table-disabled)] hover:[--data-table-card-bg:var(--table-disabled-hover)] data-[state=selected]:![--data-table-card-bg:var(--table-disabled)] data-[state=selected]:hover:![--data-table-card-bg:var(--table-disabled-hover)] [background-color:var(--table-disabled)] hover:[background-color:var(--table-disabled-hover)] [&>td:first-child]:[border-left-color:var(--table-disabled-border)] [&>td:first-child]:border-l-4 [&>td:first-child]:pl-1'

const MOBILE_SKELETON_IDS = Array.from(
  { length: 5 },
  (_, index) => `derouter-key-mobile-skeleton-${index + 1}`
)

function DerouterKeysMobileSkeleton() {
  return (
    <div className='divide-border overflow-hidden rounded-lg border'>
      {MOBILE_SKELETON_IDS.map((id) => (
        <div
          key={id}
          className='space-y-2 border-b px-3 py-2.5 last:border-b-0'
        >
          <div className='flex items-center justify-between'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-5 w-16 rounded-md' />
          </div>
          <div className='flex items-center justify-between gap-3'>
            <Skeleton className='h-7 w-44' />
            <Skeleton className='h-8 w-16' />
          </div>
          <Skeleton className='h-3 w-28' />
        </div>
      ))}
    </div>
  )
}

function DerouterKeysMobileList({
  table,
  isLoading,
}: {
  table: TanstackTable<DerouterKeyListItem>
  isLoading: boolean
}) {
  const { t } = useTranslation()
  const rows = table.getRowModel().rows

  if (isLoading) return <DerouterKeysMobileSkeleton />

  if (!rows.length) {
    return (
      <div className='rounded-lg border p-8'>
        <Empty className='border-none p-0'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Database className='size-6' />
            </EmptyMedia>
            <EmptyTitle>{t('No Derouter API Keys')}</EmptyTitle>
            <EmptyDescription>
              {t(
                'No Derouter API keys available. Create your first Derouter API key to get started.'
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className='divide-border overflow-hidden rounded-lg border'>
      {rows.map((row) => {
        const item = row.original
        return (
          <div
            key={row.id}
            className={cn(
              'bg-card space-y-2.5 border-b px-3 py-2.5 last:border-b-0',
              isDerouterKeyExhausted(item.balance) && DISABLED_ROW_MOBILE
            )}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='truncate text-sm font-semibold'>
                  {item.name}
                </div>
                <div className='text-muted-foreground text-[11px]'>
                  {t('API Key')}
                </div>
              </div>
              <DerouterStatusBadge balance={item.balance} />
            </div>

            <div className='flex min-w-0 items-center justify-between gap-2'>
              <div className='text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs'>
                {item.key}
              </div>
              <DerouterKeysRowActions row={row} />
            </div>

            <div className='text-muted-foreground flex items-center justify-between gap-2 text-xs'>
              <span>{t('Budget')}</span>
              {item.balance ? (
                <span className='font-medium tabular-nums'>
                  {item.balance.remainingVirtual?.toFixed(2) ?? '-'}
                  <span className='text-muted-foreground font-normal'>
                    {' / '}
                    {item.balance.budgetVirtual?.toFixed(2) ?? '-'}
                  </span>
                </span>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DerouterKeysTable() {
  const { t } = useTranslation()
  const { refreshTrigger } = useDerouterKeys()
  const user = useAuthStore((s) => s.auth.user)
  const isAdmin = Boolean(user && (user.role ?? 0) >= ROLE.ADMIN)
  const [now, setNow] = useState(() => Date.now())
  const columns = useDerouterKeysColumns(now)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [])

  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search: route.useSearch(),
    navigate: route.useNavigate(),
    pagination: { defaultPage: 1, defaultPageSize: 20 },
    globalFilter: { enabled: true, key: 'filter' },
    columnFilters: [
      { columnId: 'status', searchKey: 'status', type: 'array' },
    ],
  })

  const shouldSearch = Boolean(globalFilter?.trim())

  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'derouter-keys',
      pagination.pageIndex + 1,
      pagination.pageSize,
      globalFilter,
      refreshTrigger,
      isAdmin,
    ],
    queryFn: async () => {
      const page = pagination.pageIndex + 1
      const size = pagination.pageSize
      const params = { p: page, size }

      let result: Awaited<ReturnType<typeof getDerouterKeys>>
      if (isAdmin) {
        result = await getAllDerouterKeys({
          ...params,
          keyword: shouldSearch ? globalFilter : '',
        })
      } else if (shouldSearch) {
        result = await searchDerouterKeys({
          ...params,
          keyword: globalFilter,
        })
      } else {
        result = await getDerouterKeys(params)
      }

      if (!result.success) {
        toast.error(result.message || t('Failed to load API keys'))
        return { items: [], total: 0 }
      }

      return {
        items: (result.data?.items as DerouterKeyListItem[]) || [],
        total: result.data?.total || 0,
      }
    },
    placeholderData: (previousData) => previousData,
  })

  const items = data?.items || []

  const { table } = useDataTable({
    data: items,
    columns,
    enableRowSelection: true,
    columnFilters,
    columnVisibilityStorageKey: DEROUTER_KEYS_COLUMN_VISIBILITY_STORAGE_KEY,
    globalFilter,
    pagination,
    globalFilterFn: () => true,
    onPaginationChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
    manualPagination: true,
    totalCount: data?.total || 0,
    ensurePageInRange,
  })

  return (
    <DataTablePage
      table={table}
      columns={columns}
      isLoading={isLoading}
      isFetching={isFetching}
      emptyTitle={t('No Derouter API Keys')}
      emptyDescription={t(
        'No Derouter API keys available. Create your first Derouter API key to get started.'
      )}
      skeletonKeyPrefix='derouter-keys-skeleton'
      applyHeaderSize
      toolbarProps={{
        searchPlaceholder: t('Filter by name...'),
        searchDebounceMs: 500,
        filters: [
          {
            columnId: 'status',
            title: t('Status'),
            options: DEROUTER_STATUS_OPTIONS,
            singleSelect: true,
          },
        ],
      }}
      mobile={<DerouterKeysMobileList table={table} isLoading={isLoading} />}
      getRowClassName={(row) =>
        isDerouterKeyExhausted(row.original.balance)
          ? DISABLED_ROW_DESKTOP
          : undefined
      }
    />
  )
}
