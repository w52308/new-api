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
import { api } from '@/lib/api'

import type {
  CreateDerouterKeyPayload,
  CreateDerouterKeyResult,
  DerouterChannelOption,
  DerouterKeyBalance,
} from './types'

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

// List derouter API keys (type=1) for the current user.
export async function getDerouterKeys(params: {
  p?: number
  size?: number
} = {}): Promise<{
  success: boolean
  message?: string
  data?: { items: unknown[]; total: number }
}> {
  const { p = 1, size = 20 } = params
  const res = await api.get(`/api/token/?p=${p}&size=${size}&type=1`)
  return res.data
}

// List enabled derouter channels for the create dropdown.
export async function getDerouterChannels(): Promise<
  ApiResponse<DerouterChannelOption[]>
> {
  const res = await api.get('/api/token/derouter/channels')
  return res.data
}

// Provision a derouter sub-key and create a type=1 token.
export async function createDerouterKey(
  payload: CreateDerouterKeyPayload
): Promise<ApiResponse<CreateDerouterKeyResult>> {
  const res = await api.post('/api/token/derouter', payload)
  return res.data
}

// Delete a derouter key: deletes the upstream sub-key then the local record.
export async function deleteDerouterKey(id: number): Promise<ApiResponse> {
  const res = await api.delete(`/api/token/derouter/${id}`)
  return res.data
}

// Fetch the full plaintext sub-key for a derouter key (shown on demand).
export async function getDerouterKey(id: number): Promise<{
  success: boolean
  message?: string
  data?: { id: number; key: string }
}> {
  const res = await api.get(`/api/token/derouter/${id}/key`)
  return res.data
}

// Fetch upstream usage logs for a derouter key's sub-key.
export async function getDerouterKeyUsage(
  id: number,
  params: { page?: number; limit?: number } = {}
): Promise<{ success: boolean; message?: string; upstream_status?: number }> {
  const queryParams = new URLSearchParams()
  if (params.page != null) queryParams.set('page', String(params.page))
  if (params.limit != null) queryParams.set('limit', String(params.limit))
  const qs = queryParams.toString()
  const res = await api.get(
    `/api/token/derouter/${id}/usage${qs ? `?${qs}` : ''}`
  )
  return res.data
}

// Adjust a derouter key's upstream budget. Positive amount recharges, negative
// amount deducts.
export async function adjustDerouterKeyBudget(
  id: number,
  amount: number
): Promise<ApiResponse> {
  const res = await api.put(`/api/token/derouter/${id}/budget`, { amount })
  return res.data
}

// Fetch live upstream budget state for a derouter key's sub-key.
export async function getDerouterKeyBalance(
  id: number
): Promise<ApiResponse<DerouterKeyBalance>> {
  const res = await api.get(`/api/token/derouter/${id}/balance`)
  return res.data
}

// Admin list of derouter keys across all users. Non-admins fall back to
// getDerouterKeys which only returns their own keys.
export async function getAllDerouterKeys(params: {
  p?: number
  size?: number
} = {}): Promise<{
  success: boolean
  message?: string
  data?: { items: unknown[]; total: number }
}> {
  const { p = 1, size = 20 } = params
  const res = await api.get(`/api/token/derouter/all?p=${p}&size=${size}`)
  return res.data
}
