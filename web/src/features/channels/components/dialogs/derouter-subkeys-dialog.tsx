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

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
  createDerouterSubKey,
  deleteDerouterSubKey,
  listDerouterSubKeys,
} from '../../api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: number | null
}

type SubKeyRow = {
  keyId?: string | number
  label?: string
  budget?: number
  spent?: number
  remaining?: number
  rpm?: number
  [key: string]: unknown
}

export function DerouterSubKeysDialog({ open, onOpenChange, channelId }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [budget, setBudget] = useState('')
  const [label, setLabel] = useState('')

  const refresh = async () => {
    if (channelId == null) return
    setLoading(true)
    try {
      const res = await listDerouterSubKeys(channelId)
      setData(res)
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t('Failed to fetch subkeys')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (channelId == null) return
    try {
      await createDerouterSubKey(channelId, {
        budgetVirtual: Number(budget) || 0,
        label,
      })
      setBudget('')
      setLabel('')
      toast.success(t('Created'))
      await refresh()
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t('Failed to create subkey')
      )
    }
  }

  const handleDelete = async (id: string | number) => {
    if (channelId == null) return
    try {
      await deleteDerouterSubKey(channelId, String(id))
      toast.success(t('Deleted'))
      await refresh()
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : t('Failed to delete subkey')
      )
    }
  }

  const subKeys = (data?.subKeys as SubKeyRow[] | undefined) ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) void refresh()
        onOpenChange(v)
      }}
      title={t('Derouter Sub-keys')}
      contentClassName='sm:max-w-2xl'
      footer={
        <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
          {t('Close')}
        </Button>
      }
    >
      <div className='flex flex-col gap-4'>
        <div className='flex items-end gap-2'>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-xs'>{t('Budget')}</label>
            <Input
              type='number'
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder='0'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <label className='text-muted-foreground text-xs'>{t('Label')}</label>
            <Input
              type='text'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('Optional')}
            />
          </div>
          <Button type='button' onClick={() => void handleCreate()}>
            {t('Create')}
          </Button>
        </div>

        {loading ? (
          <p className='text-muted-foreground'>{t('Loading...')}</p>
        ) : null}
        {!loading && subKeys.length > 0 ? (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b text-left'>
                  <th className='px-2 py-1 font-medium'>{t('Label')}</th>
                  <th className='px-2 py-1 font-medium'>keyId</th>
                  <th className='px-2 py-1 font-medium'>{t('Budget')}</th>
                  <th className='px-2 py-1 font-medium'>{t('Remaining')}</th>
                  <th className='px-2 py-1 font-medium' />
                </tr>
              </thead>
              <tbody>
                {subKeys.map((sk, idx) => {
                  const key = sk.keyId ?? sk.label ?? idx
                  return (
                    <tr key={String(key)} className='border-b'>
                      <td className='px-2 py-1'>{String(sk.label ?? '-')}</td>
                      <td className='px-2 py-1 font-mono text-xs'>
                        {String(sk.keyId ?? '-')}
                      </td>
                      <td className='px-2 py-1'>{String(sk.budget ?? '-')}</td>
                      <td className='px-2 py-1'>{String(sk.remaining ?? '-')}</td>
                      <td className='px-2 py-1 text-right'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='text-destructive'
                          onClick={() => void handleDelete(String(key))}
                        >
                          {t('Delete')}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {!loading && subKeys.length === 0 ? (
          <p className='text-muted-foreground'>{t('No data')}</p>
        ) : null}
      </div>
    </Dialog>
  )
}
