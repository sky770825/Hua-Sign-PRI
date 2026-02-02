/**
 * 前端服務層：封裝 API 呼叫
 * 提供類型安全的 CRUD 函式
 */

import type { Member, Meeting, Prize } from '@/types'

const jsonHeaders = { 'Content-Type': 'application/json' }

// ==================== 會員 ====================

export async function createMember(data: { id: number; name: string; profession?: string }) {
  const res = await fetch('/api/members/create', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateMember(id: number, data: Partial<Member>) {
  const res = await fetch(`/api/members/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteMember(id: number) {
  const res = await fetch(`/api/members/${id}`, { method: 'DELETE' })
  return res.json()
}

// ==================== 會議 ====================

export async function createMeeting(data: { date: string; status?: string }) {
  const res = await fetch('/api/meetings', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateMeeting(id: number, data: Partial<Meeting>) {
  const res = await fetch(`/api/meetings/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteMeeting(id: number) {
  const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' })
  return res.json()
}

// ==================== 簽到 ====================

export async function submitCheckin(data: {
  memberId: number
  date: string
  message?: string
  status?: string
}) {
  const res = await fetch('/api/checkin', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteCheckin(data: { memberId: number; date: string }) {
  const res = await fetch('/api/checkin/delete', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
  return res.json()
}

// ==================== 獎品 ====================

export async function createPrize(formData: FormData) {
  const res = await fetch('/api/prizes', {
    method: 'POST',
    body: formData,
  })
  return res.json()
}

export async function updatePrize(id: number, formData: FormData) {
  const res = await fetch(`/api/prizes/${id}`, {
    method: 'PUT',
    body: formData,
  })
  return res.json()
}

export async function deletePrize(id: number) {
  const res = await fetch(`/api/prizes/${id}`, { method: 'DELETE' })
  return res.json()
}

// ==================== 抽獎 ====================

export async function drawLottery(data: { prizeId: number; date: string }) {
  const res = await fetch('/api/lottery/draw', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteWinner(id: number) {
  const res = await fetch(`/api/lottery/winners/${id}`, { method: 'DELETE' })
  return res.json()
}
