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
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import type { DerouterKeyBalance } from '../types'

export function DerouterStatusBadge({
  balance,
}: {
  balance?: DerouterKeyBalance
}) {
  const { t } = useTranslation()
  const remaining = balance?.remainingVirtual
  if (remaining == null) {
    return (
      <StatusBadge label={t('Unknown')} variant='neutral' copyable={false} />
    )
  }
  if (remaining <= 0) {
    return (
      <StatusBadge label={t('Exhausted')} variant='danger' copyable={false} />
    )
  }
  return (
    <StatusBadge label={t('Enabled')} variant='success' copyable={false} />
  )
}

function getBudgetProgressColor(percentage: number): string {
  if (percentage <= 10) return '[&_[data-slot=progress-indicator]]:bg-rose-500'
  if (percentage <= 30) return '[&_[data-slot=progress-indicator]]:bg-amber-500'
  return '[&_[data-slot=progress-indicator]]:bg-emerald-500'
}

// Budget usage progress bar. Remaining budget maps to percentage; the color
// follows the same thresholds as the API keys quota bar.
export function DerouterBudgetCell({
  balance,
}: {
  balance?: DerouterKeyBalance
}) {
  const { t } = useTranslation()
  if (!balance) {
    return <span className='text-muted-foreground text-xs'>-</span>
  }
  const spent = balance.spentVirtual ?? 0
  const remaining = balance.remainingVirtual ?? 0
  const budget = balance.budgetVirtual ?? 0
  const total = budget > 0 ? budget : spent + remaining
  const percentage = total > 0 ? (remaining / total) * 100 : 0

  return (
    <Tooltip>
      <TooltipTrigger render={<div className='w-[150px] space-y-1' />}>
        <div className='flex justify-between text-xs'>
          <span className='font-medium tabular-nums'>
            {remaining.toFixed(2)}
          </span>
          <span className='text-muted-foreground tabular-nums'>
            {total.toFixed(2)}
          </span>
        </div>
        <Progress
          value={percentage}
          className={cn('h-1.5', getBudgetProgressColor(percentage))}
        />
      </TooltipTrigger>
      <TooltipContent>
        <div className='space-y-1 text-xs'>
          <div>
            {t('Budget:')} {budget.toFixed(2)}
          </div>
          <div>
            {t('Spent:')} {spent.toFixed(2)}
          </div>
          <div>
            {t('Remaining:')} {remaining.toFixed(2)} ({percentage.toFixed(1)}%)
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
