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

import { ConfirmDialog } from '@/components/confirm-dialog'

import { deleteDerouterKey } from '../../api'
import { useDerouterKeys } from '../derouter-keys-provider'

export function DeleteDerouterKeyDialog({
  onDeleted,
}: {
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const { open, setOpen, currentRow } = useDerouterKeys()
  const [isDeleting, setIsDeleting] = useState(false)
  const dialogOpen = open === 'delete'

  const handleDelete = async () => {
    if (!currentRow) return
    setIsDeleting(true)
    try {
      const res = await deleteDerouterKey(currentRow.id)
      if (res.success) {
        toast.success(t('Deleted'))
        onDeleted()
        setOpen(null)
      } else {
        toast.error(res.message || t('Failed to delete Derouter API key'))
      }
    } catch {
      toast.error(t('Failed to delete Derouter API key'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <ConfirmDialog
      destructive
      open={dialogOpen}
      onOpenChange={(v) => !v && setOpen(null)}
      handleConfirm={handleDelete}
      isLoading={isDeleting}
      className='max-w-md'
      title={t('Delete Derouter API Key')}
      desc={
        <>
          {t('This will delete the upstream Derouter sub-key and the local API key. This cannot be undone.')}{' '}
          <span className='font-semibold'>{currentRow?.name}</span>
        </>
      }
      confirmText={t('Delete')}
    />
  )
}
