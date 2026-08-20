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
  ApiKey,
  ApiResponse,
  GetApiKeysParams,
  GetApiKeysResponse,
  SearchApiKeysParams,
  ApiKeyFormData,
  TokenAutoGroupsConfig,
} from './types'

// ============================================================================
// API Key Management
// ============================================================================

// Get paginated API keys list
export async function getApiKeys(
  params: GetApiKeysParams = {}
): Promise<GetApiKeysResponse> {
  const { p = 1, size = 10, type } = params
  const typeParam = type != null ? `&type=${type}` : ''
  const res = await api.get(`/api/token/?p=${p}&size=${size}${typeParam}`)
  return res.data
}

// Search API keys by keyword or token (with pagination)
export async function searchApiKeys(
  params: SearchApiKeysParams
): Promise<GetApiKeysResponse> {
  const { keyword = '', token = '', p, size, type } = params
  const queryParams = new URLSearchParams()
  if (keyword) queryParams.set('keyword', keyword)
  if (token) queryParams.set('token', token)
  if (p != null) queryParams.set('p', String(p))
  if (size != null) queryParams.set('size', String(size))
  if (type != null) queryParams.set('type', String(type))
  const res = await api.get(`/api/token/search?${queryParams.toString()}`)
  return res.data
}

// Get single API key by ID
export async function getApiKey(id: number): Promise<ApiResponse<ApiKey>> {
  const res = await api.get(`/api/token/${id}`)
  return res.data
}

// Get the current user's global Auto order and the per-token selection limit.
export async function getTokenAutoGroups(): Promise<
  ApiResponse<TokenAutoGroupsConfig>
> {
  const res = await api.get('/api/token/auto-groups')
  return res.data
}

// Create a new API key
export async function createApiKey(
  data: ApiKeyFormData
): Promise<ApiResponse<ApiKey>> {
  const res = await api.post('/api/token/', data)
  return res.data
}

// Update an existing API key
export async function updateApiKey(
  data: ApiKeyFormData & { id: number }
): Promise<ApiResponse<ApiKey>> {
  const res = await api.put('/api/token/', data)
  return res.data
}

// Delete a single API key
export async function deleteApiKey(id: number): Promise<ApiResponse> {
  const res = await api.delete(`/api/token/${id}/`)
  return res.data
}

// Batch delete multiple API keys
export async function batchDeleteApiKeys(
  ids: number[]
): Promise<ApiResponse<number>> {
  const res = await api.post('/api/token/batch', { ids })
  return res.data
}

// Update API key status (enable/disable)
export async function updateApiKeyStatus(
  id: number,
  status: number
): Promise<ApiResponse<ApiKey>> {
  const res = await api.put('/api/token/?status_only=true', { id, status })
  return res.data
}

// Fetch the real (unmasked) key for a token by ID
export async function fetchTokenKey(
  id: number
): Promise<{ success: boolean; message?: string; data?: { key: string } }> {
  const res = await api.post(`/api/token/${id}/key`)
  return res.data
}

// Batch fetch real (unmasked) keys for multiple tokens
export async function fetchTokenKeysBatch(ids: number[]): Promise<{
  success: boolean
  message?: string
  data?: { keys: Record<number, string> }
}> {
  const res = await api.post('/api/token/batch/keys', { ids })
  return res.data
}

// ============================================================================
// Derouter API Keys
// ============================================================================

export interface CreateDerouterKeyPayload {
  channel_id: number
  name: string
  label?: string
}

export interface CreateDerouterKeyResponse {
  success: boolean
  message?: string
  data?: {
    id: number
    name: string
    key: string
    sub_key: string
    key_id: string
    type: number
    channel: string
  }
}

export interface DerouterChannelOption {
  id: number
  name: string
}

// List enabled derouter channels available for key provisioning.
export async function getDerouterChannels(): Promise<
  ApiResponse<DerouterChannelOption[]>
> {
  const res = await api.get('/api/token/derouter/channels')
  return res.data
}

// Provision a derouter sub-key on the given channel and create a derouter token.
export async function createDerouterKey(
  payload: CreateDerouterKeyPayload
): Promise<CreateDerouterKeyResponse> {
  const res = await api.post('/api/token/derouter', payload)
  return res.data
}

// Delete a derouter token: deletes the upstream sub-key then the local record.
export async function deleteDerouterKey(id: number): Promise<ApiResponse> {
  const res = await api.delete(`/api/token/derouter/${id}`)
  return res.data
}

// Fetch upstream usage logs for a derouter token's sub-key.
export async function getDerouterKeyUsage(
  id: number,
  params: { page?: number; limit?: number } = {}
): Promise<{ success: boolean; message?: string; upstream_status?: number }> {
  const queryParams = new URLSearchParams()
  if (params.page != null) queryParams.set('page', String(params.page))
  if (params.limit != null) queryParams.set('limit', String(params.limit))
  const qs = queryParams.toString()
  const res = await api.get(`/api/token/derouter/${id}/usage${qs ? `?${qs}` : ''}`)
  return res.data
}
