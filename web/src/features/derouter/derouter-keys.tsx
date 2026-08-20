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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Database, Eye, Plus, Trash2, Wallet } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SectionPageLayout } from '@/components/layout'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import dayjs from '@/lib/dayjs'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { formatFullKey } from '@/features/keys/constants'
import { searchUsers } from '@/features/users/api'
import type { User } from '@/features/users/types'

import {
  adjustDerouterKeyBudget,
  createDerouterKey,
  deleteDerouterKey,
  getAllDerouterKeys,
  getDerouterChannels,
  getDerouterKey,
  getDerouterKeyBalance,
  getDerouterKeys,
} from './api'
import type {
  DerouterChannelOption,
  DerouterKeyBalance,
} from './types'

type Row = {
  id: number
  name: string
  key: string
  created_time: number
  status: number
  user_id?: number
  username?: string
  display_name?: string
}

// Budget usage bar color: low remaining budget reads as danger, mid as warning.
function budgetBarColor(pct: number): string {
  if (pct <= 20) return 'bg-destructive'
  if (pct <= 50) return 'bg-warning'
  return 'bg-primary'
}

// Derouter keys are always active upstream; the badge reflects the local record
// state (exhausted when the remaining budget hits zero).
function DerouterStatusBadge({ balance }: { balance?: DerouterKeyBalance }) {  const { t } = useTranslation()
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

function DerouterKeysTable({
  rows,
  isLoading,
  adminView,
  onView,
  onAdjust,
  onDelete,
  onCopied,
}: {
  rows: Row[]
  isLoading: boolean
  adminView: boolean
  onView: (row: Row) => void
  onAdjust: (row: Row) => void
  onDelete: (row: Row) => void
  onCopied: (id: number) => void
}) {
  const { t } = useTranslation()
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const handleCopy = async (row: Row) => {
    // The list payload only carries the masked key; resolve the full sub-key
    // before copying so users never copy the masked value.
    let full = row.key
    try {
      const res = await getDerouterKey(row.id)
      if (res.success && res.data?.key) full = res.data.key
    } catch {
      // fall back to whatever the row carried
    }
    const ok = await copyToClipboard(formatFullKey(full))
    if (ok) {
      setCopiedId(row.id)
      onCopied(row.id)
      window.setTimeout(() => setCopiedId(null), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className='space-y-2'>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-16 w-full' />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
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
      {rows.map((row) => (
        <div
          key={row.id}
          className='bg-card flex items-start justify-between gap-3 border-b px-4 py-3 last:border-b-0'
        >
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <div className='truncate text-sm font-semibold'>{row.name}</div>
              <DerouterStatusBadge />
            </div>
            <div className='text-muted-foreground mt-0.5 flex items-center gap-2 font-mono text-xs'>
              <span className='truncate'>{formatFullKey(row.key)}</span>
              <button
                type='button'
                aria-label={t('View full API key')}
                title={t('View full API key')}
                className='text-muted-foreground hover:text-foreground shrink-0'
                onClick={() => onView(row)}
              >
                <Eye className='size-3.5' />
              </button>
              <button
                type='button'
                aria-label={t('Copy API key')}
                className='text-muted-foreground hover:text-foreground shrink-0'
                onClick={() => void handleCopy(row)}
              >
                {copiedId === row.id ? (
                  <Check className='size-3.5 text-green-600' />
                ) : (
                  <Copy className='size-3.5' />
                )}
              </button>
            </div>
            {adminView && (
              <div className='text-muted-foreground mt-0.5 text-xs'>
                {t('Owner')}: {row.display_name || row.username || `#${row.user_id}`}
              </div>
            )}
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <span className='text-muted-foreground text-xs'>
              {dayjs(row.created_time * 1000).format('YYYY-MM-DD')}
            </span>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onAdjust(row)}
            >
              <Wallet className='size-4' />
              {t('Adjust')}
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='text-destructive'
              onClick={() => onDelete(row)}
            >
              <Trash2 className='size-4' />
              {t('Delete')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CreateDerouterKeyDialog({
  open,
  admin,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  admin: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const { data: channelsRes, isLoading: channelsLoading } = useQuery({
    queryKey: ['derouter-channels'],
    queryFn: getDerouterChannels,
    enabled: open,
  })
  const channels: DerouterChannelOption[] = channelsRes?.data ?? []
  const [channelId, setChannelId] = useState<string>('')
  const [name, setName] = useState('')
  const [userId, setUserId] = useState<number | null>(null)
  const [userKeyword, setUserKeyword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const { data: usersRes, isFetching: usersFetching } = useQuery({
    queryKey: ['derouter-users', userKeyword],
    queryFn: () =>
      searchUsers({
        keyword: userKeyword,
        p: 1,
        page_size: 20,
      }),
    enabled: open && admin,
  })
  const users: User[] = usersRes?.data?.items ?? []

  const reset = () => {
    setChannelId('')
    setName('')
    setUserId(null)
    setUserKeyword('')
    setCreatedKey(null)
  }

  const handleClose = (v: boolean) => {
    if (!creating) reset()
    onOpenChange(v)
  }

  const handleCreate = async () => {
    if (!channelId) {
      toast.error(t('Please select a channel'))
      return
    }
    setCreating(true)
    try {
      const res = await createDerouterKey({
        channel_id: Number(channelId),
        name: name.trim() || t('Derouter API Key'),
        user_id: admin && userId ? userId : undefined,
      })
      if (res.success && res.data) {
        setCreatedKey(res.data.key)
        onCreated()
      } else {
        toast.error(res.message || t('Failed to create Derouter API key'))
      }
    } catch {
      toast.error(t('Failed to create Derouter API key'))
    } finally {
      setCreating(false)
    }
  }

  let channelField: ReactNode
  if (channelsLoading) {
    channelField = <Skeleton className='h-9 w-full' />
  } else if (channels.length === 0) {
    channelField = (
      <div className='text-muted-foreground rounded-md border border-dashed px-3 py-2.5 text-sm'>
        {t(
          'No enabled Derouter channel is available. Enable a Derouter channel in the Channels page first.'
        )}
      </div>
    )
  } else {
    channelField = (
      <Select
        value={channelId}
        onValueChange={(value) => {
          if (value !== null) setChannelId(value)
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('Select a derouter channel')} />
        </SelectTrigger>
        <SelectContent>
          {channels.map((ch) => (
            <SelectItem key={ch.id} value={String(ch.id)}>
              {ch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  let userField: ReactNode
  if (admin) {
    if (usersFetching) {
      userField = <Skeleton className='h-9 w-full' />
    } else if (users.length === 0) {
      userField = (
        <div className='text-muted-foreground rounded-md border border-dashed px-3 py-2.5 text-sm'>
          {t('No users found')}
        </div>
      )
    } else {
      userField = (
        <Select
          value={userId != null ? String(userId) : ''}
          onValueChange={(value) => {
            if (value !== null) setUserId(Number(value))
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('Select user')} />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.display_name || u.username} (#{u.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('Create Derouter API Key')}</DialogTitle>
          <DialogDescription>
            {t(
              'Creates a Derouter sub-key (fixed budget) on the selected channel. The full key is shown once — copy it now.'
            )}
          </DialogDescription>
        </DialogHeader>
        {createdKey ? (
          <div className='space-y-3'>
            <div className='text-muted-foreground text-sm'>
              {t('Your Derouter API key (shown once):')}
            </div>
            <div className='bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-xs'>
              <span className='min-w-0 flex-1 truncate'>{createdKey}</span>
              <button
                type='button'
                className='text-muted-foreground hover:text-foreground shrink-0'
                onClick={() => void copyToClipboard(createdKey)}
              >
                <Copy className='size-4' />
              </button>
            </div>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>{t('Channel')}</label>
              {channelField}
            </div>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>{t('Name')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('Optional')}
              />
            </div>
            {admin && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-2'>
                  <label className='text-sm font-medium'>
                    {t('Bind to user')}
                  </label>
                  <Input
                    value={userKeyword}
                    onChange={(e) => setUserKeyword(e.target.value)}
                    placeholder={t('Search users')}
                    className='h-8 w-44'
                  />
                </div>
                {userField}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          {createdKey ? (
            <Button type='button' onClick={() => handleClose(false)}>
              {t('Done')}
            </Button>
          ) : (
            <>
              <Button
                type='button'
                variant='outline'
                onClick={() => handleClose(false)}
              >
                {t('Cancel')}
              </Button>
              <Button
                type='button'
                disabled={creating || channels.length === 0}
                onClick={() => void handleCreate()}
              >
                {creating ? t('Creating...') : t('Create')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ViewDerouterKeyDialog({
  row,
  onOpenChange,
}: {
  row: Row | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [fullKey, setFullKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [balance, setBalance] = useState<DerouterKeyBalance | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  // Fetch the full sub-key on demand when the dialog opens for a row. The row
  // prop flips from null to a value when the user clicks "view", and the dialog
  // opens in the same render — so we react to that change here instead of
  // relying on onOpenChange (Base UI does not fire it for controlled open
  // prop changes).
  useEffect(() => {
    if (!row) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setFullKey(null)
    setError(null)
    setCopied(false)
    setBalance(null)
    setBalanceError(null)
    void getDerouterKey(row.id)
      .then((res) => {
        if (res.success && res.data?.key) {
          setFullKey(res.data.key)
        } else {
          setError(res.message || t('Failed to load API key'))
        }
      })
      .catch(() => setError(t('Failed to load API key')))
      .finally(() => setLoading(false))
    void getDerouterKeyBalance(row.id)
      .then((res) => {
        if (res.success && res.data) {
          setBalance(res.data)
        } else {
          setBalanceError(res.message || t('Failed to load balance'))
        }
      })
      .catch(() => setBalanceError(t('Failed to load balance')))
  }, [row, t])

  const handleCopy = async () => {
    if (!fullKey) return
    const ok = await copyToClipboard(fullKey)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  let keyContent: ReactNode
  if (loading) {
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

  let balanceContent: ReactNode
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
            className={cn('h-full rounded-full transition-all', budgetBarColor(pct))}
            style={{ width: `${pct}%` }}
          />
        </div>        <div className='flex items-center justify-between text-xs text-muted-foreground'>
          <span>{t('Spent')}: {spent.toFixed(2)}</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      </div>
    )
  } else {
    balanceContent = <Skeleton className='h-10 w-full' />
  }

  return (
    <Dialog open={row != null} onOpenChange={onOpenChange}>
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
          <Button type='button' onClick={() => onOpenChange(false)}>
            {t('Done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AdjustBudgetDialog({
  row,
  onOpenChange,
  onAdjusted,
}: {
  row: Row | null
  onOpenChange: (open: boolean) => void
  onAdjusted: () => void
}) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [balance, setBalance] = useState<DerouterKeyBalance | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  // Load live balance whenever the dialog opens for a row so the user sees the
  // current state before adjusting (same pattern as ViewDerouterKeyDialog).
  useEffect(() => {
    if (!row) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAmount('')
    setBalance(null)
    setBalanceError(null)
    void getDerouterKeyBalance(row.id)
      .then((res) => {
        if (res.success && res.data) {
          setBalance(res.data)
        } else {
          setBalanceError(res.message || t('Failed to load balance'))
        }
      })
      .catch(() => setBalanceError(t('Failed to load balance')))
  }, [row, t])

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
        onOpenChange(false)
      } else {
        toast.error(res.message || t('Failed to adjust budget'))
      }
    } catch {
      toast.error(t('Failed to adjust budget'))
    } finally {
      setAdjusting(false)
    }
  }

  let balanceBlock: ReactNode
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
    <Dialog open={row != null} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
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

function DeleteDerouterKeyDialog({
  row,
  onOpenChange,
  onDeleted,
}: {
  row: Row | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!row) return
    setDeleting(true)
    try {
      const res = await deleteDerouterKey(row.id)
      if (res.success) {
        toast.success(t('Deleted'))
        onDeleted()
        onOpenChange(false)
      } else {
        toast.error(res.message || t('Failed to delete Derouter API key'))
      }
    } catch {
      toast.error(t('Failed to delete Derouter API key'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={row != null} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('Delete Derouter API Key')}</DialogTitle>
          <DialogDescription>
            {t(
              'This will delete the upstream Derouter sub-key and the local API key. This cannot be undone.'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            {t('Cancel')}
          </Button>
          <Button
            type='button'
            variant='destructive'
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? t('Deleting...') : t('Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DerouterKeys() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.auth.user)
  const isAdmin = Boolean(user && (user.role ?? 0) >= ROLE.ADMIN)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewRow, setViewRow] = useState<Row | null>(null)
  const [adjustRow, setAdjustRow] = useState<Row | null>(null)
  const [deleteRow, setDeleteRow] = useState<Row | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['derouter-keys', page, isAdmin],
    queryFn: () =>
      isAdmin
        ? getAllDerouterKeys({ p: page, size: 20 })
        : getDerouterKeys({ p: page, size: 20 }),
  })
  const rows: Row[] = (data?.data?.items ?? []).map((item) => item as Row)
  const total = data?.data?.total ?? 0

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['derouter-keys'] })
  }

  return (
    <>
      <SectionPageLayout fixedContent>
        <SectionPageLayout.Title>
          {isAdmin ? t('All Derouter API Keys') : t('Derouter API Keys')}
        </SectionPageLayout.Title>
        <SectionPageLayout.Actions>
          <Button size='sm' onClick={() => setCreateOpen(true)}>
            <Plus className='size-4' />
            {t('Create Derouter API Key')}
          </Button>
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <DerouterKeysTable
            rows={rows}
            isLoading={isLoading}
            adminView={isAdmin}
            onView={(row) => setViewRow(row)}
            onAdjust={(row) => setAdjustRow(row)}
            onDelete={(row) => setDeleteRow(row)}
            onCopied={() => undefined}
          />
          {total > 20 && (
            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('Previous')}
              </Button>
              <span className='text-muted-foreground text-sm'>
                {page} / {Math.ceil(total / 20)}
              </span>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('Next')}
              </Button>
            </div>
          )}
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <CreateDerouterKeyDialog
        open={createOpen}
        admin={isAdmin}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
      <ViewDerouterKeyDialog
        row={viewRow}
        onOpenChange={(v) => !v && setViewRow(null)}
      />
      <AdjustBudgetDialog
        row={adjustRow}
        onOpenChange={(v) => !v && setAdjustRow(null)}
        onAdjusted={refresh}
      />
      <DeleteDerouterKeyDialog
        row={deleteRow}
        onOpenChange={(v) => !v && setDeleteRow(null)}
        onDeleted={refresh}
      />
    </>
  )
}
