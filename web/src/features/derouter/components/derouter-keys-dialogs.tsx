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
import { AdjustBudgetDialog } from './dialogs/adjust-budget-dialog'
import { CreateDerouterKeyDialog } from './dialogs/create-derouter-key-dialog'
import { DeleteDerouterKeyDialog } from './dialogs/delete-derouter-key-dialog'
import { MultiplierDialog } from './dialogs/multiplier-dialog'
import { ViewDerouterKeyDialog } from './dialogs/view-derouter-key-dialog'
import { useDerouterKeys } from './derouter-keys-provider'

export function DerouterKeysDialogs() {
  const { triggerRefresh } = useDerouterKeys()

  return (
    <>
      <CreateDerouterKeyDialog onCreated={triggerRefresh} />
      <ViewDerouterKeyDialog />
      <AdjustBudgetDialog onAdjusted={triggerRefresh} />
      <MultiplierDialog onUpdated={triggerRefresh} />
      <DeleteDerouterKeyDialog onDeleted={triggerRefresh} />
    </>
  )
}
