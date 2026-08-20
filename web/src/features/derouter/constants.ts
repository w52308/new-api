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
import type { DerouterKeyBalance } from './types'

// Derived status of a derouter key from its live budget: always enabled
// upstream, but reads Exhausted once the remaining budget hits zero.
export const DEROUTER_STATUS_ENABLED = '1'
export const DEROUTER_STATUS_EXHAUSTED = '4'

export function isDerouterKeyExhausted(
  balance?: DerouterKeyBalance
): boolean {
  const remaining = balance?.remainingVirtual
  return remaining != null && remaining <= 0
}

export function derouterKeyDerivedStatus(
  balance?: DerouterKeyBalance
): string {
  return isDerouterKeyExhausted(balance)
    ? DEROUTER_STATUS_EXHAUSTED
    : DEROUTER_STATUS_ENABLED
}

export const DEROUTER_STATUS_OPTIONS = [
  { label: 'Enabled', value: DEROUTER_STATUS_ENABLED },
  { label: 'Exhausted', value: DEROUTER_STATUS_EXHAUSTED },
]
