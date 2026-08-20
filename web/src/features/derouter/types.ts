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
import { z } from 'zod'

export const derouterKeySchema = z.object({
  id: z.number(),
  name: z.string(),
  key: z.string(),
  status: z.number(),
  type: z.number().default(1),
  created_time: z.number(),
  channel_id: z.number().nullish(),
})

export type DerouterKey = z.infer<typeof derouterKeySchema>

export interface DerouterKeyListItem extends DerouterKey {
  // Name of the owning derouter channel, joined from the channel id.
  channel_name?: string
  // Owner info (admin list only).
  user_id?: number
  username?: string
  display_name?: string
  // Live upstream budget state, enriched by the list endpoint (one sub-keys
  // call per channel). Absent when the upstream read failed.
  balance?: DerouterKeyBalance
}

export interface DerouterChannelOption {
  id: number
  name: string
}

export interface DerouterKeyBalance {
  budgetVirtual?: number
  spentVirtual?: number
  remainingVirtual?: number
}

export interface CreateDerouterKeyPayload {
  channel_id: number
  name: string
  label?: string
  user_id?: number
}

export interface CreateDerouterKeyResult {
  id: number
  name: string
  key: string
  sub_key: string
  key_id: string
  type: number
  channel: string
}

export interface UsageLogRow {
  model?: string
  tokens?: number
  cost_usdc?: number
  duration?: number
  timestamp?: number | string
  request_id?: string
  [key: string]: unknown
}
