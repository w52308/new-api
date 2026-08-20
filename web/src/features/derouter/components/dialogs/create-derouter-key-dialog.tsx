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
import { Copy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { searchUsers } from '@/features/users/api'
import type { User } from '@/features/users/types'

import {
  createDerouterKey,
  getDerouterChannels,
} from '../../api'
import type { DerouterChannelOption } from '../../types'
import { useDerouterKeys } from '../derouter-keys-provider'

export function CreateDerouterKeyDialog({
  onCreated,
}: {
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const { open, setOpen } = useDerouterKeys()
  const user = useAuthStore((s) => s.auth.user)
  const isAdmin = Boolean(user && (user.role ?? 0) >= ROLE.ADMIN)
  const dialogOpen = open === 'create'

  const { data: channelsRes, isLoading: channelsLoading } = useQuery({
    queryKey: ['derouter-channels'],
    queryFn: getDerouterChannels,
    enabled: dialogOpen,
  })
  const channels: DerouterChannelOption[] = channelsRes?.data ?? []

  const [channelId, setChannelId] = useState('')
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
    enabled: dialogOpen && isAdmin,
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
    setOpen(v ? 'create' : null)
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
        user_id: isAdmin && userId ? userId : undefined,
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
  if (isAdmin) {
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
    <Dialog open={dialogOpen} onOpenChange={handleClose}>
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
            {isAdmin && (
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
