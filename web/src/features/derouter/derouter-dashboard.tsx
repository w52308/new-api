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
import {
  Activity,
  CircleDollarSign,
  Key,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FadeIn } from '@/components/page-transition'
import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/context/theme-provider'
import dayjs from '@/lib/dayjs'
import { ROLE } from '@/lib/roles'
import { VCHART_OPTION } from '@/lib/vchart'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { getAllDerouterKeys, getDerouterKeyUsage, getDerouterKeys } from './api'
import type { DerouterKeyListItem } from './types'

const VChart = lazy(() =>
  import('@visactor/react-vchart').then((m) => ({ default: m.VChart }))
)

interface StatItem {
  title: string
  value: string
  description: string
  icon: typeof Key
  iconTone: IconBadgeTone
}

function DashboardStatCards(props: {
  keys: DerouterKeyListItem[]
  loading: boolean
}) {
  const { t } = useTranslation()
  const { keys, loading } = props

  const stats = useMemo(() => {
    const totalBudget = keys.reduce(
      (sum, k) => sum + (k.balance?.budgetVirtual ?? 0),
      0
    )
    const totalSpent = keys.reduce(
      (sum, k) => sum + (k.balance?.spentVirtual ?? 0),
      0
    )
    const totalRemaining = keys.reduce(
      (sum, k) => sum + (k.balance?.remainingVirtual ?? 0),
      0
    )
    const activeKeys = keys.filter(
      (k) => (k.balance?.remainingVirtual ?? 0) > 0
    ).length

    return { totalBudget, totalSpent, totalRemaining, activeKeys }
  }, [keys])

  const items: StatItem[] = [
    {
      title: t('Total Keys'),
      value: String(keys.length),
      description: `${stats.activeKeys} ${t('active')}`,
      icon: Key,
      iconTone: 'chart-1',
    },
    {
      title: t('Total Budget'),
      value: stats.totalBudget.toFixed(2),
      description: t('Virtual budget'),
      icon: Wallet,
      iconTone: 'chart-2',
    },
    {
      title: t('Total Spent'),
      value: stats.totalSpent.toFixed(2),
      description: t('Virtual spent'),
      icon: CircleDollarSign,
      iconTone: 'chart-3',
    },
    {
      title: t('Total Remaining'),
      value: stats.totalRemaining.toFixed(2),
      description: t('Virtual remaining'),
      icon: Activity,
      iconTone: stats.totalRemaining > 0 ? 'success' : 'destructive',
    },
    {
      title: t('Usage Rate'),
      value:
        stats.totalBudget > 0
          ? `${((stats.totalSpent / stats.totalBudget) * 100).toFixed(1)}%`
          : '--',
      description: t('Spent / Budget'),
      icon: TrendingDown,
      iconTone: 'chart-4',
    },
  ]

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='divide-border/60 grid min-w-0 grid-cols-2 divide-x sm:grid-cols-3 lg:grid-cols-5'>
        {items.map((it, idx) => {
          const Icon = it.icon
          let valueContent
          if (loading) {
            valueContent = (
              <div className='mt-1 flex flex-col gap-1 sm:mt-2 sm:gap-1.5'>
                <Skeleton className='h-5 w-16 sm:h-7 sm:w-20' />
                <Skeleton className='hidden h-3.5 w-28 md:block' />
              </div>
            )
          } else {
            valueContent = (
              <>
                <div className='text-foreground mt-1 max-w-full truncate font-mono text-base leading-tight font-bold tracking-tight tabular-nums sm:mt-2 sm:text-2xl sm:leading-normal'>
                  {it.value}
                </div>
                <div className='text-muted-foreground/60 mt-1 hidden text-xs md:block'>
                  {it.description}
                </div>
              </>
            )
          }

          return (
            <div
              key={it.title}
              className={cn(
                'min-w-0 px-2.5 py-1.5 sm:px-5 sm:py-4',
                idx === items.length - 1 &&
                  items.length % 2 !== 0 &&
                  'col-span-2 sm:col-span-1'
              )}
            >
              <div className='flex min-w-0 items-center gap-1.5 sm:gap-2'>
                <IconBadge
                  tone={it.iconTone}
                  size='stat'
                  className='size-4 rounded-sm sm:size-7 sm:rounded-md [&>svg]:size-2.5 sm:[&>svg]:size-3.5'
                >
                  <Icon />
                </IconBadge>
                <div className='text-muted-foreground truncate text-[11px] leading-4 font-medium tracking-wide uppercase sm:text-xs sm:tracking-wider'>
                  {it.title}
                </div>
              </div>
              {valueContent}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BudgetDistributionChart(props: {
  keys: DerouterKeyListItem[]
  loading: boolean
  theme: string
}) {
  const { t } = useTranslation()
  const { keys, loading, theme } = props

  const spec = useMemo(() => {
    const values = keys
      .filter((k) => (k.balance?.budgetVirtual ?? 0) > 0)
      .map((k) => ({
        type: k.name || `Key-${k.id}`,
        value: Number((k.balance?.budgetVirtual ?? 0).toFixed(2)),
      }))

    return {
      type: 'pie',
      data: [{ id: 'budget', values: values.length > 0 ? values : [] }],
      outerRadius: 0.8,
      innerRadius: 0.5,
      padAngle: 0.6,
      valueField: 'value',
      categoryField: 'type',
      pie: { cornerRadius: 4 },
      title: {
        visible: true,
        text: t('Budget Distribution'),
      },
      legends: { visible: true, orient: 'left' },
      label: { visible: true },
      tooltip: {
        mark: {
          content: [
            {
              key: (datum: Record<string, unknown>) => datum?.type,
              value: (datum: Record<string, unknown>) =>
                Number(datum?.value ?? 0).toFixed(2),
            },
          ],
        },
      },
      background: { fill: 'transparent' },
      animation: true,
    }
  }, [keys, t])

  if (loading) {
    return (
      <div className='overflow-hidden rounded-lg border'>
        <div className='border-b px-3 py-2 sm:px-5 sm:py-3'>
          <Skeleton className='h-5 w-40' />
        </div>
        <div className='flex h-[300px] items-center justify-center sm:h-96'>
          <Skeleton className='size-48 rounded-full' />
        </div>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='flex items-center gap-2 border-b px-3 py-2 sm:px-5 sm:py-3'>
        <IconBadge tone='chart-2' size='sm'>
          <Wallet />
        </IconBadge>
        <span className='text-sm font-medium'>{t('Budget Distribution')}</span>
      </div>
      <div className='h-[300px] p-1.5 sm:h-96 sm:p-2'>
        <Suspense
          fallback={
            <div className='flex size-full items-center justify-center'>
              <Skeleton className='size-48 rounded-full' />
            </div>
          }
        >
          <VChart
            spec={{
              ...spec,
              theme: theme === 'dark' ? 'dark' : 'light',
              background: 'transparent',
            }}
            option={VCHART_OPTION}
          />
        </Suspense>
      </div>
    </div>
  )
}

function SpendingBarChart(props: {
  keys: DerouterKeyListItem[]
  loading: boolean
  theme: string
}) {
  const { t } = useTranslation()
  const { keys, loading, theme } = props

  const spec = useMemo(() => {
    const values = keys
      .filter((k) => (k.balance?.spentVirtual ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.balance?.spentVirtual ?? 0) - (a.balance?.spentVirtual ?? 0)
      )
      .map((k) => ({
        Key: k.name || `Key-${k.id}`,
        Spent: Number((k.balance?.spentVirtual ?? 0).toFixed(2)),
      }))

    return {
      type: 'bar',
      data: [{ id: 'spending', values: values.length > 0 ? values : [] }],
      xField: 'Key',
      yField: 'Spent',
      seriesField: 'Key',
      direction: 'horizontal',
      title: {
        visible: true,
        text: t('Spending by Key'),
      },
      legends: { visible: false },
      bar: {
        state: { hover: { stroke: '#000', lineWidth: 1 } },
      },
      label: {
        visible: true,
        position: 'outside',
        formatMethod: (value: number) => value.toFixed(2),
        style: { fontSize: 11 },
      },
      axes: [
        { orient: 'left', type: 'band' },
        { orient: 'bottom', type: 'linear', visible: false },
      ],
      tooltip: {
        mark: {
          content: [
            {
              key: (datum: Record<string, unknown>) => datum?.Key,
              value: (datum: Record<string, unknown>) =>
                Number(datum?.Spent ?? 0).toFixed(2),
            },
          ],
        },
      },
      background: { fill: 'transparent' },
      animation: true,
    }
  }, [keys, t])

  if (loading) {
    return (
      <div className='overflow-hidden rounded-lg border'>
        <div className='border-b px-3 py-2 sm:px-5 sm:py-3'>
          <Skeleton className='h-5 w-40' />
        </div>
        <div className='flex h-[300px] items-center justify-center sm:h-96'>
          <Skeleton className='h-48 w-full' />
        </div>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='flex items-center gap-2 border-b px-3 py-2 sm:px-5 sm:py-3'>
        <IconBadge tone='chart-3' size='sm'>
          <CircleDollarSign />
        </IconBadge>
        <span className='text-sm font-medium'>{t('Spending by Key')}</span>
      </div>
      <div className='h-[300px] p-1.5 sm:h-96 sm:p-2'>
        <Suspense
          fallback={
            <div className='flex size-full items-center justify-center'>
              <Skeleton className='h-48 w-full' />
            </div>
          }
        >
          <VChart
            spec={{
              ...spec,
              theme: theme === 'dark' ? 'dark' : 'light',
              background: 'transparent',
            }}
            option={VCHART_OPTION}
          />
        </Suspense>
      </div>
    </div>
  )
}

function RecentUsageTable(props: {
  keys: DerouterKeyListItem[]
  loading: boolean
}) {
  const { t } = useTranslation()
  const { keys, loading } = props
  const [selectedId, setSelectedId] = useState(0)

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['derouter-dashboard-usage', selectedId],
    queryFn: () => getDerouterKeyUsage(selectedId, { page: 1, limit: 20 }),
    enabled: selectedId > 0,
  })

  const rows = useMemo(() => {
    if (!usageData?.success) return []
    const raw = (usageData as unknown as { data?: unknown }).data
    if (Array.isArray(raw)) return raw as Record<string, unknown>[]
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>
      for (const key of ['logs', 'usageLogs', 'items', 'data', 'rows', 'list']) {
        if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[]
      }
    }
    return []
  }, [usageData])

  if (loading) {
    return (
      <div className='overflow-hidden rounded-lg border'>
        <div className='border-b px-3 py-2 sm:px-5 sm:py-3'>
          <Skeleton className='h-5 w-48' />
        </div>
        <div className='space-y-2 p-4'>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className='h-10 w-full' />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='flex items-center justify-between gap-3 border-b px-3 py-2 sm:px-5 sm:py-3'>
        <div className='flex items-center gap-2'>
          <IconBadge tone='chart-1' size='sm'>
            <Activity />
          </IconBadge>
          <span className='text-sm font-medium'>{t('Recent Usage')}</span>
        </div>
        <select
          className='bg-background h-7 max-w-48 rounded-md border px-2 text-xs'
          value={selectedId}
          onChange={(e) => setSelectedId(Number(e.target.value))}
        >
          <option value={0}>{t('Select a key')}</option>
          {keys.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </div>

      {selectedId === 0 ? (
        <div className='text-muted-foreground p-8 text-center text-sm'>
          {t('Select a key to view recent usage')}
        </div>
      ) : usageLoading ? (
        <div className='space-y-2 p-4'>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className='h-10 w-full' />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className='text-muted-foreground p-8 text-center text-sm'>
          {t('No usage data')}
        </div>
      ) : (
        <div className='divide-border overflow-hidden'>
          {rows.map((row, idx) => {
            const model = String(row.model ?? row.model_name ?? '-')
            const tokens = String(row.tokens ?? row.token_count ?? '-')
            const cost = row.cost_usdc ?? row.cost ?? '-'
            const ts = row.timestamp ?? row.created_at ?? row.time ?? null
            const time = ts
              ? dayjs(
                  typeof ts === 'number' && ts < 1e12
                    ? ts * 1000
                    : Number(ts)
                ).format('YYYY-MM-DD HH:mm')
              : '-'
            const rowKey = String(
              row.request_id ?? row.id ?? `${model}-${time}-${idx}`
            )

            return (
              <div
                key={rowKey}
                className='bg-card flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0'
              >
                <span className='min-w-0 flex-1 truncate text-sm'>
                  {model}
                </span>
                <span className='text-muted-foreground text-sm tabular-nums'>
                  {tokens}
                </span>
                <span className='text-muted-foreground w-20 text-right text-sm tabular-nums'>
                  {typeof cost === 'number' ? cost.toFixed(4) : String(cost)}
                </span>
                <span className='text-muted-foreground w-36 text-right text-xs'>
                  {time}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DerouterDashboard() {
  const user = useAuthStore((s) => s.auth.user)
  const isAdmin = Boolean(user && (user.role ?? 0) >= ROLE.ADMIN)
  const { resolvedTheme } = useTheme()

  const { data: keysRes, isLoading } = useQuery({
    queryKey: ['derouter-dashboard-keys', isAdmin],
    queryFn: () =>
      isAdmin
        ? getAllDerouterKeys({ p: 1, size: 100 })
        : getDerouterKeys({ p: 1, size: 100 }),
    staleTime: 30 * 1000,
  })

  const keys = (keysRes?.data?.items ?? []) as DerouterKeyListItem[]

  return (
    <div className='space-y-3 sm:space-y-4'>
      <FadeIn delay={0}>
        <DashboardStatCards keys={keys} loading={isLoading} />
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className='grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2'>
          <BudgetDistributionChart
            keys={keys}
            loading={isLoading}
            theme={resolvedTheme}
          />
          <SpendingBarChart
            keys={keys}
            loading={isLoading}
            theme={resolvedTheme}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <RecentUsageTable keys={keys} loading={isLoading} />
      </FadeIn>
    </div>
  )
}
