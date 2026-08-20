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
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import dayjs from '@/lib/dayjs'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { getAllDerouterKeys, getDerouterKeyUsage, getDerouterKeys } from './api'
import { formatFullKey } from '@/features/keys/constants'

function UsageTable({ tokenId }: { tokenId: number }) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['derouter-usage', tokenId],
    queryFn: () => getDerouterKeyUsage(tokenId, { page: 1, limit: 50 }),
    enabled: tokenId > 0,
  })

  if (isLoading) {
    return (
      <div className='space-y-2'>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className='h-10 w-full' />
        ))}
      </div>
    )
  }

  if (!data?.success) {
    return (
      <div className='text-muted-foreground rounded-lg border p-8 text-center text-sm'>
        {data?.message || t('Failed to load usage statistics')}
      </div>
    )
  }

  // The upstream usage-logs payload shape is not strongly typed; surface it as a
  // table when a usable list is present, otherwise as a raw JSON view.
  const rows = Array.isArray((data as unknown as { data?: unknown }).data)
    ? ((data as unknown as { data: unknown[] }).data ?? [])
    : extractUsageRows(data)

  if (rows.length === 0) {
    return (
      <div className='text-muted-foreground rounded-lg border p-8 text-center text-sm'>
        {t('No usage data')}
      </div>
    )
  }

  return (
    <div className='divide-border overflow-hidden rounded-lg border'>
      {rows.map((row, idx) => {
        const r = (row ?? {}) as Record<string, unknown>
        const model = r.model ?? r.model_name ?? '-'
        const tokens = r.tokens ?? r.token_count ?? '-'
        const cost = r.cost_usdc ?? r.cost ?? '-'
        const ts = r.timestamp ?? r.created_at ?? r.time ?? null
        const time = ts
          ? dayjs(
              typeof ts === 'number' && ts < 1e12 ? ts * 1000 : Number(ts)
            ).format('YYYY-MM-DD HH:mm')
          : '-'
        const rowKey =
          String(r.request_id ?? r.id ?? `${model}-${time}-${idx}`)
        return (
          <div
            key={rowKey}
            className='bg-card flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0'
          >
            <span className='min-w-0 flex-1 truncate text-sm'>{String(model)}</span>
            <span className='text-muted-foreground text-sm tabular-nums'>
              {String(tokens)}
            </span>
            <span className='text-muted-foreground w-20 text-right text-sm tabular-nums'>
              {typeof cost === 'number' ? cost.toFixed(4) : String(cost)}
            </span>
            <span className='text-muted-foreground w-36 text-right text-xs'>
              {String(time)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function extractUsageRows(payload: unknown): unknown[] {
  const root = (payload ?? {}) as Record<string, unknown>
  // The backend wraps the upstream body under {success, data}; the upstream
  // array may be at the top of that data object or nested under a list key.
  const data =
    typeof root.data === 'object' && root.data != null
      ? (root.data as Record<string, unknown>)
      : root
  for (const key of ['logs', 'usageLogs', 'items', 'data', 'rows', 'list']) {
    const v = data[key]
    if (Array.isArray(v)) return v
  }
  return []
}

export function DerouterUsage() {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState(0)
  const user = useAuthStore((s) => s.auth.user)
  const isAdmin = Boolean(user && (user.role ?? 0) >= ROLE.ADMIN)

  const { data: keysRes, isLoading } = useQuery({
    queryKey: ['derouter-keys', 1, isAdmin],
    queryFn: () =>
      isAdmin
        ? getAllDerouterKeys({ p: 1, size: 100 })
        : getDerouterKeys({ p: 1, size: 100 }),
  })
  const keys = (keysRes?.data?.items ?? []) as Array<{
    id: number
    name: string
    key: string
  }>

  return (
    <SectionPageLayout fixedContent>
      <SectionPageLayout.Title>
        {t('AI Usage Statistics')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>{t('Derouter API Key')}</label>
            {isLoading ? (
              <Skeleton className='h-9 w-72' />
            ) : (
              <select
                className='bg-background h-9 w-full max-w-sm rounded-md border px-3 text-sm'
                value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}
              >
                <option value={0}>{t('Select a Derouter API key')}</option>
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({formatFullKey(k.key)})
                  </option>
                ))}
              </select>
            )}
          </div>
          {selectedId > 0 ? (
            <UsageTable tokenId={selectedId} />
          ) : (
            <div className='text-muted-foreground rounded-lg border p-8 text-center text-sm'>
              {t('Select a Derouter API key to view its usage statistics')}
            </div>
          )}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
