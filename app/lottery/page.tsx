'use client'

import Image from 'next/image'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { formatId, formatIdWithHash } from '@/lib/format-utils'
import { getPrizeImageUrl } from '@/lib/prize-placeholder'
import { isLotteryClosed, isLotteryExpired, getLotteryDeadlineLabel } from '@/lib/lottery-deadline'
import type { Prize, CheckinMember, Winner, WinnerRecord } from '@/types'

export default function LotteryPage() {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [checkinMembers, setCheckinMembers] = useState<CheckinMember[]>([])
  const [checkinCount, setCheckinCount] = useState(0)
  const [eligibleCount, setEligibleCount] = useState(0)
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null)
  const [winner, setWinner] = useState<Winner | null>(null)
  const [winners, setWinners] = useState<WinnerRecord[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [today, setToday] = useState('')
  const [currentMeetingDate, setCurrentMeetingDate] = useState('')
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWinnerModal, setShowWinnerModal] = useState(false) // 中獎視窗顯示狀態
  const [winnerModalData, setWinnerModalData] = useState<{
    winner: Winner
    prize: Prize
    winnerProb: string
    prizeProb: string
    completionMessage?: string
  } | null>(null) // 中獎視窗數據
  const [deletingWinnerId, setDeletingWinnerId] = useState<number | null>(null) // 正在刪除的中獎記錄 ID
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null) // 待確認刪除的中獎記錄 ID
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [selectedPrizeIds, setSelectedPrizeIds] = useState<Set<number>>(new Set()) // 勾選的獎品 ID：有勾選則只從這些品項抽，無勾選則隨機
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageAlt, setPreviewImageAlt] = useState('')
  const [imagePreviewScale, setImagePreviewScale] = useState(1)
  const [lotteryExpired, setLotteryExpired] = useState(false)
  const [lotteryClosed, setLotteryClosed] = useState(false)
  const [lotteryDeadlineLabel, setLotteryDeadlineLabel] = useState('')
  const loadIdRef = useRef(0)

  const loadData = useCallback(async (showLoading = true) => {
    const currentLoadId = ++loadIdRef.current
    console.log('🔄 開始載入數據...')
    if (showLoading) {
      setLoading(true)
    }

    const LOAD_TIMEOUT_MS = 15000
    const timeoutId = showLoading ? window.setTimeout(() => {
      setLoading(false)
      console.warn('⏱️ 載入逾時，已停止載入畫面')
    }, LOAD_TIMEOUT_MS) : null
    
    try {
      const todayDate = new Date().toISOString().split('T')[0]
      setToday(todayDate)

      // 并行加载数据以提高性能
      const [prizesRes, checkinsRes, membersRes, winnersRes, meetingsRes] = await Promise.all([
        fetch(`/api/prizes?nocache=1&_t=${Date.now()}`).catch(err => {
          console.error('Error fetching prizes:', err)
          return { ok: false, json: async () => ({ prizes: [] }) }
        }),
        fetch(`/api/checkins?date=${todayDate}`).catch(err => {
          console.error('Error fetching checkins:', err)
          return { ok: false, json: async () => ({ checkins: [], meeting: null }) }
        }),
        fetch('/api/members').catch(err => {
          console.error('Error fetching members:', err)
          return { ok: false, json: async () => ({ members: [] }) }
        }),
        fetch(`/api/lottery/winners?date=${todayDate}&_t=${Date.now()}`).catch(err => {
          console.error('Error fetching winners:', err)
          return { ok: false, json: async () => ({ winners: [] }) }
        }),
        fetch('/api/meetings').catch(err => {
          console.error('Error fetching meetings:', err)
          return { ok: false, json: async () => ({ meetings: [] }) }
        }),
      ])

      const [prizesData, checkinsData, memberData, winnersData, meetingsData] = await Promise.all([
        prizesRes.json().catch(() => ({ prizes: [] })),
        checkinsRes.json().catch(() => ({ checkins: [], meeting: null })),
        membersRes.json().catch(() => ({ members: [] })),
        winnersRes.json().catch(() => ({ winners: [] })),
        meetingsRes.json().catch(() => ({ meetings: [] })),
      ])
      
      // 檢查是否有今天的會議，如果沒有，使用最新的會議日期
      const todayMeeting = checkinsData.meeting || (meetingsData.meetings || []).find((m: any) => m.date === todayDate)
      const latestMeeting = (meetingsData.meetings || []).sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
      
      // 如果有會議，使用會議日期；否則使用今天日期
      const targetDate = todayMeeting?.date || latestMeeting?.date || todayDate
      if (currentLoadId !== loadIdRef.current) return
      setCurrentMeetingDate(targetDate)
      const expired = isLotteryExpired(targetDate)
      const closed = isLotteryClosed(targetDate)
      setLotteryExpired(expired)
      setLotteryClosed(closed)
      setLotteryDeadlineLabel(getLotteryDeadlineLabel(targetDate))
      
      console.log('📅 日期選擇:', {
        todayDate,
        targetDate,
        todayMeeting: todayMeeting?.date,
        latestMeeting: latestMeeting?.date,
        hasTodayMeeting: !!todayMeeting,
      })
      
      // 如果目標日期不是今天，重新獲取該日期的簽到數據和中獎記錄
      if (targetDate !== todayDate) {
        console.log('🔄 目標日期不是今天，重新獲取數據:', targetDate)
        try {
          // 重新獲取簽到數據
          const checkinsResForDate = await fetch(`/api/checkins?date=${targetDate}`).catch(() => null)
          if (checkinsResForDate && checkinsResForDate.ok) {
            const checkinsDataForDate = await checkinsResForDate.json()
            checkinsData.checkins = checkinsDataForDate.checkins || []
            checkinsData.meeting = checkinsDataForDate.meeting || null
          }
          
          // 重新獲取中獎記錄
          const winnersResForDate = await fetch(`/api/lottery/winners?date=${targetDate}&_t=${Date.now()}`).catch(() => null)
          if (winnersResForDate && winnersResForDate.ok) {
            const winnersDataForDate = await winnersResForDate.json()
            // 格式化中獎記錄，添加編號
            const rawWinnersForDate = Array.isArray(winnersDataForDate.winners) ? winnersDataForDate.winners : []
            winnersData.winners = rawWinnersForDate.map((record: any, idx: number) => ({
              ...record,
              member_id_formatted: formatId(record.member_id || 0),
              draw_order: idx + 1,
            })).sort((a: any, b: any) => {
              // 按創建時間倒序排列（最新的在前）
              const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
              const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
              return timeB - timeA
            })
            console.log('📋 重新載入中獎記錄（目標日期）:', {
              targetDate,
              count: winnersData.winners.length,
              winners: winnersData.winners.map((w: any) => ({
                id: w.id,
                member_name: w.member_name,
                member_id: w.member_id,
                draw_order: w.draw_order,
              }))
            })
          } else {
            console.warn('⚠️ 無法獲取目標日期的中獎記錄:', targetDate)
          }
        } catch (err) {
          console.error('Error fetching data for target date:', err)
        }
      } else {
        console.log('✅ 使用今天的日期載入中獎記錄:', todayDate)
      }
      
      // 更新最後刷新時間
      setLastRefreshTime(new Date())

      setPrizes(prizesData.prizes || [])
      
      interface MemberInfo {
        id: number
        name: string
      }
      
      const memberMap = new Map<number, MemberInfo>(
        (memberData.members || []).map((m: MemberInfo) => [m.id, m])
      )
      
      // 獎品區僅計 7:00 前簽到者
      const LOTTERY_CUTOFF = new Date(targetDate + 'T07:00:00+08:00').getTime()
      const members: CheckinMember[] = []
      const seen = new Set<number>()
      const ATTENDANCE_STATUSES = ['present', 'early', 'late', 'early_leave', 'proxy']
      if (checkinsData.checkins) {
        checkinsData.checkins.forEach((checkin: { member_id: number; status?: string; checkin_time?: string }) => {
          if (!checkin.status || !ATTENDANCE_STATUSES.includes(checkin.status)) return
          const ct = checkin.checkin_time
          if (ct && new Date(ct).getTime() >= LOTTERY_CUTOFF) return
          if (seen.has(checkin.member_id)) return
          seen.add(checkin.member_id)
          const member = memberMap.get(checkin.member_id)
          if (member) {
            members.push({
              member_id: member.id,
              name: member.name,
            })
          }
        })
      }
      // 隔週四 6:30 起名單歸零；非 6:30～7:00 時僅禁用抽獎按鈕，仍顯示簽到數
      const effectiveMembers = expired ? [] : members
      const effectiveCount = effectiveMembers.length
      setCheckinMembers(effectiveMembers)
      setCheckinCount(effectiveCount)
      
      // 格式化中獎記錄，添加編號和排序
      // 確保 winnersData.winners 存在且為數組
      const rawWinners = Array.isArray(winnersData.winners) ? winnersData.winners : []
      
      console.log('📋 原始中獎記錄數據:', {
        targetDate,
        rawWinnersCount: rawWinners.length,
        rawWinners: rawWinners.map((w: any) => ({
          id: w.id,
          member_id: w.member_id,
          member_name: w.member_name,
          prize_name: w.prize_name,
          created_at: w.created_at,
        }))
      })
      
      // 先按創建時間排序（最新的在前）
      const sortedWinners = [...rawWinners].sort((a: any, b: any) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
        return timeB - timeA
      })
      
      // 然後添加格式化和編號
      const finalWinnerList = sortedWinners.map((record: any, index: number) => ({
        ...record,
        member_id_formatted: formatId(record.member_id || 0),
        draw_order: index + 1, // 從 1 開始編號
      }))
      
      console.log('📋 格式化後的中獎記錄:', {
        targetDate,
        finalCount: finalWinnerList.length,
        winners: finalWinnerList.map((w: any) => ({
          id: w.id,
          member_id: w.member_id,
          member_name: w.member_name,
          prize_name: w.prize_name,
          draw_order: w.draw_order,
          created_at: w.created_at,
        }))
      })
      
      setWinners(finalWinnerList)
      setEligibleCount(expired ? 0 : (closed ? 0 : Math.max(0, effectiveCount - finalWinnerList.length)))
      
      console.log('✅ 數據載入完成:', {
        prizes: prizesData.prizes?.length || 0,
        members: members.length,
        winners: finalWinnerList.length,
        eligibleCount: Math.max(0, members.length - finalWinnerList.length)
      })
    } catch (error) {
      console.error('❌ 載入數據時發生錯誤:', error)
      // 不显示alert，避免干扰用户体验
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    
    const fetchData = async () => {
      await loadData()
    }
    
    if (mounted) {
      fetchData()
    }
    
    // 移除自動更新，因為：
    // 1. 抽獎後會自動刷新數據
    // 2. 已有手動刷新按鈕
    // 3. 減少不必要的網絡請求，提升性能
    
    return () => {
      mounted = false
    }
  }, [loadData])

  const handleDraw = async () => {
    if (isSpinning) return
    if (lotteryClosed) {
      alert('抽獎已結束（例會日 6:30～7:00 可抽獎，7:00 截止）')
      return
    }
    if (checkinCount === 0) {
      alert('今天沒有簽到的會員，無法抽獎')
      return
    }
    if (eligibleCount === 0) {
      alert('今日可抽獎人數已抽完')
      return
    }
    if (prizes.length === 0) {
      alert('請先到後台添加獎品')
      return
    }
    
    // 檢查是否有可用的獎品
    const availablePrizes = prizes.filter(p => p.remaining_quantity > 0)
    if (availablePrizes.length === 0) {
      alert('所有獎品已被抽完，請到後台添加更多獎品')
      return
    }

    setIsSpinning(true)
    setSelectedPrize(null)
    setWinner(null)

    try {
      // 抽獎前強制取得最新獎品，確保轉盤與 API 一致
      let prizesForDraw = prizes
      try {
        const prizesRes = await fetch(`/api/prizes?nocache=1&_t=${Date.now()}`)
        if (prizesRes.ok) {
          const prizesData = await prizesRes.json()
          prizesForDraw = ((prizesData.prizes || []) as Prize[]).sort((a, b) => a.id - b.id)
          setPrizes(prizesForDraw)
        }
      } catch (e) {
        console.warn('抽獎前刷新獎品失敗，使用現有列表:', e)
      }

      const body: { date: string; prizeIds?: number[] } = { date: currentMeetingDate || today }
      if (selectedPrizeIds.size > 0) {
        const ids = Array.from(selectedPrizeIds)
        const validIds = ids.filter(id => prizesForDraw.some(p => p.id === id && p.remaining_quantity > 0))
        if (validIds.length > 0) body.prizeIds = validIds
      }

      const response = await fetch('/api/lottery/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      // 檢查響應狀態
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '抽獎失敗' }))
        throw new Error(errorData.error || `抽獎失敗 (${response.status})`)
      }

      const data = await response.json()
      
      // 驗證響應數據
      if (!data || !data.prize || !data.winner) {
        console.error('❌ 響應數據不完整:', data)
        throw new Error('抽獎響應數據不完整')
      }

      // 計算目標參與人在轉盤上的角度（轉盤以參與人為區塊）
      const winnerIds = new Set(winners.map((w: WinnerRecord) => w.member_id))
      const eligibleForDraw = checkinMembers
        .filter(m => !winnerIds.has(m.member_id))
        .sort((a, b) => a.member_id - b.member_id)
      const winnerMemberId = data.winner.member_id ?? data.winner.id
      const selectedIndex = eligibleForDraw.findIndex(p => p.member_id === winnerMemberId)
      if (selectedIndex < 0) {
        console.error('❌ 中獎者不在可抽獎參與人列表中', { winnerMemberId, memberName: data.winner.name })
      }
      const participantCount = Math.max(eligibleForDraw.length, 1)
      const anglePerParticipant = 360 / participantCount
      const targetAngle = selectedIndex >= 0
        ? (selectedIndex * anglePerParticipant + anglePerParticipant / 2)
        : 0

      // 旋转转盘（多转几圈 + 目标角度，確保3秒旋轉時間，增加情緒價值）
      // 轉5圈增加期待感，加上緩動效果
      const spinRotation = 360 * 5 + (360 - (rotation % 360)) + targetAngle
      setRotation(prev => prev + spinRotation)
      
      // 添加音效提示（可選，未來可擴展）
      console.log('🎰 轉盤開始旋轉！')

      // 等待转盘旋转完成（3秒，增加情緒價值）
      setTimeout(() => {
        setSelectedPrize(data.prize)
        setWinner(data.winner || null)
        setIsSpinning(false)
        
        // 立即重新載入數據以更新簽到人數和中獎記錄
        // 使用抽獎時使用的日期，確保一致性
        const drawDate = currentMeetingDate || today
        console.log('🔄 抽獎後重新載入數據，使用日期:', drawDate)
        
        setTimeout(async () => {
          try {
            // 強制重新載入中獎記錄（使用抽獎時的日期）
            const winnersRes = await fetch(`/api/lottery/winners?date=${drawDate}&_t=${Date.now()}`)
            if (winnersRes.ok) {
              const winnersData = await winnersRes.json()
              const rawWinners = Array.isArray(winnersData.winners) ? winnersData.winners : []
              
              const winnerList = rawWinners.map((record: any, index: number) => ({
                ...record,
                member_id_formatted: formatId(record.member_id || 0),
                draw_order: index + 1,
              })).sort((a: any, b: any) => {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
                return timeB - timeA
              })
              
              // 重新分配 draw_order
              const finalWinnerList = winnerList.map((record: any, index: number) => ({
                ...record,
                draw_order: index + 1,
              }))
              
              console.log('✅ 抽獎後更新中獎名單:', {
                date: drawDate,
                count: finalWinnerList.length,
                winners: finalWinnerList.map((w: any) => ({
                  id: w.id,
                  member_name: w.member_name,
                  prize_name: w.prize_name,
                }))
              })
              
              setWinners(finalWinnerList)
              
              // 更新可抽獎人數
              const checkinsRes = await fetch(`/api/checkins?date=${drawDate}`)
              if (checkinsRes.ok) {
                const checkinsData = await checkinsRes.json()
                const members: CheckinMember[] = []
                const memberMap = new Map<number, { id: number; name: string }>()
                
                // 獲取會員資料
                const membersRes = await fetch('/api/members')
                if (membersRes.ok) {
                  const memberData = await membersRes.json()
                  memberData.members?.forEach((m: { id: number; name: string }) => {
                    memberMap.set(m.id, m)
                  })
                }
                
                if (checkinsData.checkins) {
                  checkinsData.checkins.forEach((checkin: { member_id: number; status?: string }) => {
                    if (checkin.status && checkin.status !== 'present') return
                    const member = memberMap.get(checkin.member_id)
                    if (member) {
                      members.push({
                        member_id: member.id,
                        name: member.name,
                      })
                    }
                  })
                }
                
                setCheckinMembers(members)
                setCheckinCount(members.length)
                setEligibleCount(Math.max(0, members.length - finalWinnerList.length))
              }
            }
            
            // 背景重新載入完整數據（不顯示載入中，避免蓋住中獎視窗）
            await loadData(false)
          } catch (err) {
            console.error('Error reloading data after draw:', err)
            loadData(false).catch(e => {
              console.error('Error in fallback loadData:', e)
            })
          }
        }, 1000) // 延遲1秒確保數據已保存到資料庫
        
        // 檢查是否所有獎品都抽完了（使用抽獎時的獎品列表）
        const updatedPrizes = prizesForDraw.map(p => 
          p.id === data.prize.id ? { ...p, remaining_quantity: data.prize.remaining_quantity } : p
        )
        const remainingPrizes = updatedPrizes.filter(p => p.remaining_quantity > 0)
        const isAllPrizesGone = remainingPrizes.length === 0
        
        // 显示中奖信息（使用更大的 modal 替代 alert）
        if (data.winner) {
          const winnerProb = data.winnerProbability || (checkinCount > 0 ? (1 / checkinCount * 100).toFixed(2) + '%' : '0%')
          const availableBeforeDraw = prizesForDraw.filter(p => p.remaining_quantity > 0).length
          const prizeProb = data.prizeProbability || (availableBeforeDraw > 0 ? (1 / availableBeforeDraw * 100).toFixed(2) + '%' : '0%')
          
          // 設置中獎視窗數據
          setWinnerModalData({
            winner: data.winner,
            prize: data.prize,
            winnerProb,
            prizeProb,
            completionMessage: isAllPrizesGone ? (data.prize.completion_message || '感謝大家的參與！') : undefined
          })
          // 使用 setTimeout 確保狀態更新順序正確
          setTimeout(() => {
            setShowWinnerModal(true)
          }, 0)
        }
      }, 3000) // 確保3秒旋轉時間
    } catch (error) {
      console.error('❌ 抽獎錯誤:', error)
      const errorMessage = error instanceof Error ? error.message : '抽獎失敗'
      alert(`抽獎失敗：${errorMessage}`)
      setIsSpinning(false)
      // 背景重新載入數據（不顯示全頁載入中）
      setTimeout(() => {
        loadData(false).catch(err => {
          console.error('Error reloading data after error:', err)
        })
      }, 1000)
    }
  }

  // 刪除中獎記錄
  const handleDeleteWinner = async (winnerId: number, memberName: string) => {
    // 確認刪除
    const confirmed = window.confirm(`確定要刪除 ${memberName} 的中獎記錄嗎？\n\n此操作無法復原。`)
    
    if (!confirmed) {
      return
    }

    setDeletingWinnerId(winnerId)
    setDeleteConfirmId(null)

    try {
      console.log('開始刪除中獎記錄:', { winnerId, memberName, currentMeetingDate })
      
      // 先從本地狀態中移除（樂觀更新）
      const recordToDelete = winners.find(w => w.id === winnerId)
      setWinners(prev => prev.filter(w => w.id !== winnerId))
      
      const response = await fetch(`/api/lottery/winners/${winnerId}`, {
        method: 'DELETE',
      })

      console.log('刪除 API 響應:', { ok: response.ok, status: response.status })

      if (!response.ok) {
        // 如果刪除失敗，恢復本地狀態
        if (recordToDelete) {
          setWinners(prev => [...prev, recordToDelete].sort((a, b) => {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
            return timeB - timeA
          }))
        }
        
        const errorData = await response.json().catch(() => ({ error: '刪除失敗' }))
        console.error('刪除失敗:', errorData)
        throw new Error(errorData.error || `刪除失敗 (${response.status})`)
      }

      const result = await response.json()
      console.log('刪除成功:', result)

      // 如果刪除的是當前中獎者，清除相關狀態
      if (winner?.id === winnerId || (recordToDelete && winner?.member_id === recordToDelete.member_id)) {
        setWinner(null)
      }

      // 更新可抽獎人數（因為刪除了中獎記錄，所以可抽獎人數應該增加）
      setEligibleCount(prev => Math.max(0, prev + 1))

      // 不調用 loadData()，因為已經用樂觀更新移除了
      // 只在後台驗證一下數據是否真的刪除了
      setTimeout(async () => {
        try {
          // 只驗證刪除是否成功，不刷新列表
          const targetDate = currentMeetingDate || today
          console.log('驗證刪除，使用日期:', targetDate, 'winnerId:', winnerId)
          const verifyResponse = await fetch(`/api/lottery/winners?date=${targetDate}`)
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json()
            const rawWinners = Array.isArray(verifyData.winners) ? verifyData.winners : []
            const stillExists = rawWinners.some((w: any) => w.id === winnerId)
            
            if (stillExists) {
              console.error('❌ 刪除驗證失敗：記錄仍然存在！', { winnerId, targetDate })
              // 如果記錄仍然存在，說明刪除失敗，恢復記錄並顯示錯誤
              if (recordToDelete) {
                setWinners(prev => {
                  const updated = [...prev, recordToDelete].sort((a, b) => {
                    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
                    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
                    return timeB - timeA
                  })
                  return updated
                })
                setEligibleCount(prev => Math.max(0, prev - 1)) // 恢復可抽獎人數
              }
              alert(`❌ 刪除失敗：記錄仍然存在於資料庫中。請重試或聯繫管理員。`)
            } else {
              console.log('✅ 刪除驗證成功，記錄已不存在')
              // 更新列表為驗證後的數據（確保其他變化也被反映，但不包含已刪除的記錄）
              const winnerList = rawWinners.map((record: any, index: number) => ({
                ...record,
                member_id_formatted: formatId(record.member_id || 0),
                draw_order: index + 1,
              })).sort((a: any, b: any) => {
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
                return timeB - timeA
              })
              setWinners(winnerList)
            }
          } else {
            console.warn('驗證刪除時 API 響應失敗:', verifyResponse.status)
          }
        } catch (err) {
          console.error('驗證刪除失敗:', err)
          // 驗證失敗時不恢復記錄，因為已經用樂觀更新移除了
          // 如果刪除真的失敗，用戶可以手動刷新
        }
      }, 1000) // 延遲 1 秒確保資料庫已更新
      
      // 顯示成功訊息
      alert(`已成功刪除 ${memberName} 的中獎記錄`)
    } catch (error) {
      console.error('❌ 刪除中獎記錄錯誤:', error)
      const errorMessage = error instanceof Error ? error.message : '刪除失敗'
      alert(`刪除失敗：${errorMessage}`)
    } finally {
      setDeletingWinnerId(null)
    }
  }

  // 可抽獎的參與人（7:00 前簽到且尚未中獎），依編號排序以對應轉盤區塊（須在 early return 前呼叫，符合 Hooks 規則）
  const eligibleParticipants = useMemo(() => {
    const winnerIds = new Set(winners.map(w => w.member_id))
    return checkinMembers
      .filter(m => !winnerIds.has(m.member_id))
      .sort((a, b) => a.member_id - b.member_id)
  }, [checkinMembers, winners])

  const participantCount = eligibleParticipants.length
  const anglePerParticipant = 360 / Math.max(participantCount, 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white rounded-2xl shadow-xl mb-6 p-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-center flex-1">
              🎰 幸運轉盤抽獎 🎰
            </h1>
            <button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true)
                  await loadData(true)
                } catch (err) {
                  console.error('Error refreshing data:', err)
                  alert('刷新失敗，請稍後再試')
                }
              }}
              disabled={loading}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm font-semibold backdrop-blur-sm disabled:opacity-70 disabled:cursor-wait cursor-pointer"
              title="手動刷新數據"
            >
              {loading ? '⏳ 載入中...' : '🔄 刷新'}
            </button>
          </div>
          <p className="text-center text-purple-100 text-sm sm:text-base">
            今日抽獎進度
            {lastRefreshTime && (
              <span className="block text-xs text-purple-200 mt-1" suppressHydrationWarning>
                最後更新：{lastRefreshTime.toLocaleTimeString('zh-TW')}
              </span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base">
            <div className="px-3 py-1 rounded-full bg-white/15">
              已簽到 <strong className="text-white">{checkinCount}</strong> 人
            </div>
            <div className="px-3 py-1 rounded-full bg-white/15">
              已中獎 <strong className="text-white">{winners.length}</strong> 人
            </div>
            <div className="px-3 py-1 rounded-full bg-white/15">
              尚可抽 <strong className="text-white">{eligibleCount}</strong> 人
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 转盘区域 */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-3xl shadow-2xl p-8 border-2 border-purple-100 backdrop-blur-sm">
              {/* 装饰性边框 */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-200/20 via-pink-200/20 to-red-200/20 opacity-30 blur-xl"></div>
              
              <div className="relative mx-auto" style={{ width: '100%', maxWidth: '550px', aspectRatio: '1' }}>
                {/* 外圈装饰 */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-200/40 via-pink-200/40 to-red-200/40 blur-2xl -z-10"></div>
                
                {/* 转盘容器 */}
                <div className="relative w-full h-full">
                  {/* 转盘外圈装饰 */}
                  <div className="absolute inset-0 rounded-full border-[12px] border-gradient-to-r from-purple-300 via-pink-300 to-red-300 shadow-inner" 
                       style={{
                         background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(236, 72, 153, 0.1), rgba(239, 68, 68, 0.1))',
                         boxShadow: 'inset 0 0 30px rgba(147, 51, 234, 0.2), 0 0 40px rgba(147, 51, 234, 0.3)'
                       }}></div>
                  
                  {/* 转盘 - 以參與人為區塊，每格顯示編號，N 人 N 色 */}
                  {participantCount > 0 ? (
                    <>
                      {/* 转盘主体 */}
                      <div
                        className="absolute inset-[6px] rounded-full transition-transform duration-[3000ms] ease-out shadow-2xl"
                        style={{
                          transform: `rotate(${rotation}deg)`,
                          background: `conic-gradient(
                            ${eligibleParticipants.map((_, index) => {
                              const colorPairs = [
                                ['#FF6B9D', '#C44569'], ['#4ECDC4', '#44A08D'], ['#45B7D1', '#96C93D'],
                                ['#FFA07A', '#FF6B6B'], ['#98D8C8', '#6BCB77'], ['#F7DC6F', '#F39C12'],
                                ['#BB8FCE', '#9B59B6'], ['#85C1E2', '#3498DB'], ['#F1948A', '#E74C3C'],
                                ['#85C1E9', '#5DADE2'], ['#A8E6CF', '#56AB2F'], ['#FFD93D', '#F7971E'],
                                ['#C471ED', '#8E2DE2'], ['#EA384D', '#D31027'], ['#00C9FF', '#92FE9D'],
                              ]
                              const [color1, color2] = colorPairs[index % colorPairs.length]
                              const startAngle = index * anglePerParticipant
                              const endAngle = (index + 1) * anglePerParticipant
                              return `${color1} ${startAngle}deg, ${color2} ${endAngle}deg`
                            }).join(', ')}
                          )`,
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.3)',
                        }}
                      >
                        {/* 分隔線 */}
                        {eligibleParticipants.map((_, index) => {
                          const lineAngle = index * anglePerParticipant
                          return (
                            <div
                              key={`line-${index}`}
                              className="absolute top-0 left-1/2 origin-bottom"
                              style={{
                                transform: `translateX(-50%) rotate(${lineAngle}deg)`,
                                width: '2px',
                                height: '50%',
                                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.2))',
                                boxShadow: '0 0 4px rgba(255, 255, 255, 0.5)',
                              }}
                            />
                          )
                        })}
                        
                        {/* 參與人編號標籤 */}
                        {eligibleParticipants.map((p, index) => {
                          const angle = (index * anglePerParticipant + anglePerParticipant / 2) * (Math.PI / 180)
                          const radius = 38
                          const x = 50 + radius * Math.cos(angle - Math.PI / 2)
                          const y = 50 + radius * Math.sin(angle - Math.PI / 2)
                          const textRotation = -(index * anglePerParticipant + anglePerParticipant / 2)

                          return (
                            <div
                              key={p.member_id}
                              className="absolute"
                              style={{
                                left: `${x}%`,
                                top: `${y}%`,
                                transform: `translate(-50%, -50%) rotate(${textRotation}deg)`,
                              }}
                            >
                              <div 
                                className="px-2.5 py-1 rounded-lg backdrop-blur-sm"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.3)',
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
                                  border: '1px solid rgba(255, 255, 255, 0.4)',
                                }}
                              >
                                <p 
                                  className="text-white font-bold text-sm sm:text-base text-center whitespace-nowrap tabular-nums"
                                  style={{
                                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.6), 0 0 8px rgba(0, 0, 0, 0.3)',
                                    fontWeight: '700',
                                    letterSpacing: '0.5px',
                                  }}
                                >
                                  {formatId(p.member_id)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-[6px] rounded-full border-8 border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
                      <div className="text-center">
                        <div className="text-5xl mb-3">👥</div>
                        <p className="text-gray-600 font-semibold">尚無可抽獎的參與人</p>
                      </div>
                    </div>
                  )}

                  {/* 中心显示区域 - 中奖奖品：文字在上、照片置中、得獎者在下或疊在照片上 */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    {/* 中心圆环装饰 */}
                    <div className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-br from-purple-200/30 via-pink-200/30 to-red-200/30 blur-xl"></div>
                    
                    <div 
                      className="relative bg-gradient-to-br from-white via-purple-50 to-pink-50 rounded-full border-4 border-purple-400 shadow-2xl flex flex-col items-center justify-center transition-all duration-500"
                      style={{
                        width: '160px',
                        height: '160px',
                        boxShadow: '0 10px 40px rgba(147, 51, 234, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(236, 72, 153, 0.3)',
                      }}
                    >
                        {selectedPrize ? (
                        <>
                          {/* 獎品名稱：放在最上方，不搶照片焦點 */}
                          <p className="text-[10px] sm:text-xs font-bold text-gray-600 text-center px-2 mb-1 leading-tight line-clamp-2 max-w-full">
                            {selectedPrize.name}
                          </p>
                          {/* 照片置中、為主視覺 */}
                          <div className="flex-1 flex items-center justify-center min-h-0 pointer-events-auto">
                            <Image
                              src={getPrizeImageUrl(selectedPrize)}
                              alt={selectedPrize.name}
                              width={96}
                              height={96}
                              unoptimized
                              className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-full border-4 border-purple-300 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setPreviewImageUrl(getPrizeImageUrl(selectedPrize))
                                setPreviewImageAlt(selectedPrize.name)
                                setImagePreviewScale(1)
                                setShowImagePreview(true)
                              }}
                            />
                          </div>
                          {/* 得獎者：放在照片下方，不遮住照片 */}
                          {winner && (
                            <div className="mt-0.5 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-md">
                              <p className="text-[10px] sm:text-xs text-white font-semibold text-center truncate max-w-[120px]">
                                🎉 {winner.name}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center">
                          <div className="text-4xl sm:text-5xl mb-2 animate-bounce">🎁</div>
                          <p className="text-xs sm:text-sm font-bold text-gray-700 mb-1">點擊抽獎</p>
                          {eligibleCount > 0 && prizes.filter(p => p.remaining_quantity > 0).length === 0 && (
                            <div className="mt-1">
                              <div className="px-2 py-0.5 bg-red-100 rounded-full">
                                <p className="text-xs text-red-700 font-semibold">無可用獎品</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 指针 - 更精致的设计 */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-30">
                    {/* 指针主体 */}
                    <div className="relative">
                      {/* 指针三角形 */}
                      <div 
                        className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[40px] border-l-transparent border-r-transparent"
                        style={{
                          borderTopColor: '#FCD34D',
                          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 0 12px rgba(251, 191, 36, 0.6))',
                        }}
                      ></div>
                      {/* 指针高光 */}
                      <div 
                        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent"
                        style={{
                          borderTopColor: 'rgba(255, 255, 255, 0.6)',
                        }}
                      ></div>
                      {/* 指针底座 */}
                      <div 
                        className="absolute top-[38px] left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border-2 border-yellow-600 shadow-lg"
                        style={{
                          boxShadow: '0 4px 12px rgba(251, 191, 36, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.6)',
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* 转盘外圈光晕效果 */}
                  <div className="absolute inset-0 rounded-full pointer-events-none" 
                       style={{
                         boxShadow: 'inset 0 0 60px rgba(147, 51, 234, 0.1), 0 0 80px rgba(236, 72, 153, 0.15)',
                       }}></div>
                </div>
              </div>

              {/* 抽奖按钮 */}
              <div className="mt-8 text-center">
                <button
                  onClick={handleDraw}
                  disabled={isSpinning || lotteryClosed || eligibleCount === 0 || prizes.filter(p => p.remaining_quantity > 0).length === 0}
                  className="relative px-10 py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white rounded-2xl hover:from-purple-700 hover:via-pink-700 hover:to-red-700 transition-all duration-300 font-bold text-lg sm:text-xl shadow-2xl hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 overflow-hidden group"
                  style={{
                    boxShadow: isSpinning 
                      ? '0 0 30px rgba(147, 51, 234, 0.6), 0 10px 30px rgba(236, 72, 153, 0.4)' 
                      : '0 10px 30px rgba(147, 51, 234, 0.4), 0 0 20px rgba(236, 72, 153, 0.3)',
                  }}
                >
                  {/* 按钮光晕效果 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  {isSpinning ? (
                    <span className="relative flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                      <span>抽獎中...</span>
                    </span>
                  ) : (
                    <span className="relative flex items-center gap-2">
                      <span className="text-2xl">🎲</span>
                      <span>開始抽獎</span>
                    </span>
                  )}
                </button>
                
                {/* 提示信息 */}
                {lotteryExpired && (
                  <p className="mt-3 text-sm text-amber-600 font-medium">
                    抽獎已截止（{lotteryDeadlineLabel} 起名單歸零，隔週四 6:30 開放新週期）
                  </p>
                )}
                {!lotteryExpired && lotteryClosed && (
                  <p className="mt-3 text-sm text-amber-600 font-medium">抽獎已結束（例會日 6:30～7:00 可抽獎，7:00 截止）</p>
                )}
                {!lotteryExpired && !lotteryClosed && checkinCount === 0 && (
                  <p className="mt-3 text-sm text-gray-500">請先進行簽到</p>
                )}
                {!lotteryExpired && !lotteryClosed && checkinCount > 0 && eligibleCount === 0 && (
                  <p className="mt-3 text-sm text-gray-500">今日可抽獎人數已抽完</p>
                )}
                {prizes.length === 0 && (
                  <p className="mt-3 text-sm text-gray-500">請到後台添加獎品</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* 奖品列表 */}
            <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-3xl shadow-2xl p-6 border-2 border-purple-100 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="text-2xl">🎁</div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  獎品列表
                </h2>
              </div>
              <div className="space-y-3 max-h-[440px] overflow-y-auto custom-scrollbar pr-2">
                {prizes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">📦</div>
                    <p className="text-gray-500 font-medium">暫無獎品</p>
                    <p className="text-sm text-gray-400 mt-1">請到後台添加</p>
                  </div>
                ) : (
                  prizes.map((prize) => {
                    const isPinned = selectedPrizeIds.has(prize.id)
                    return (
                    <div
                      key={prize.id}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                        selectedPrize?.id === prize.id
                          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg ring-2 ring-purple-300'
                          : 'border-gray-200 bg-white/80 hover:border-purple-300 hover:shadow-md'
                      }`}
                    >
                      {/* 右上角勾選：勾選=指定此品項抽獎，未勾=隨機 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedPrizeIds(prev => {
                            const next = new Set(prev)
                            if (next.has(prize.id)) next.delete(prize.id)
                            else next.add(prize.id)
                            return next
                          })
                        }}
                        className={`absolute top-2 right-2 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all ${
                          isPinned
                            ? 'border-purple-600 bg-purple-500 text-white shadow-md'
                            : 'border-gray-300 bg-white/80 text-gray-400 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                        title={isPinned ? '已選定，只從勾選的品項抽獎' : '點擊勾選，只抽此品項；未勾選則隨機'}
                      >
                        {isPinned ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <div className="w-3 h-3 rounded-sm border border-gray-300" />
                        )}
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Image
                            src={getPrizeImageUrl(prize)}
                            alt={prize.name}
                            width={56}
                            height={56}
                            unoptimized
                            className="w-14 h-14 object-cover rounded-xl border-2 border-gray-200 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setPreviewImageUrl(getPrizeImageUrl(prize))
                              setPreviewImageAlt(prize.name)
                              setImagePreviewScale(1)
                              setShowImagePreview(true)
                            }}
                          />
                          {selectedPrize?.id === prize.id && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                              <span className="text-xs">✨</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 truncate">{prize.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                                style={{ width: `${(prize.remaining_quantity / prize.total_quantity) * 100}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600 font-semibold whitespace-nowrap">
                              {prize.remaining_quantity}/{prize.total_quantity}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )})
                )}
              </div>
            </div>

            {/* 中奖名单 */}
            <div className="bg-gradient-to-br from-white to-yellow-50/40 rounded-3xl shadow-2xl p-6 border-2 border-yellow-100 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="text-2xl">🏆</div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                  今日中獎名單
                </h2>
              </div>
              <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-2">
                {!winners || winners.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3">✨</div>
                    <p className="text-gray-500 font-medium">尚未抽出中獎者</p>
                    <p className="text-sm text-gray-400 mt-1">快開始第一抽</p>
                  </div>
                ) : (
                  winners
                    .filter((record) => record && record.member_name)
                    .map((record, index) => (
                      <div
                        key={record.id}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          winner?.member_id === record.member_id
                            ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg'
                            : 'border-gray-200 bg-white/80'
                        } ${deletingWinnerId === record.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Image
                            src={getPrizeImageUrl({ id: record.prize_id, image_url: record.prize_image_url })}
                            alt={record.prize_name}
                            width={56}
                            height={56}
                            unoptimized
                            className="w-14 h-14 object-cover rounded-xl border-2 border-yellow-100 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setPreviewImageUrl(getPrizeImageUrl({ id: record.prize_id, image_url: record.prize_image_url }))
                              setPreviewImageAlt(record.prize_name || '獎品')
                              setImagePreviewScale(1)
                              setShowImagePreview(true)
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded min-w-[36px] text-center">
                                {formatId(record.draw_order || (index + 1))}
                              </span>
                              <p className="text-base font-bold text-gray-900">
                                {record.member_name || '未知會員'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <span>編號：{formatId(record.member_id || 0)}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">獎品：<span className="font-semibold text-purple-600">{record.prize_name || '未知獎品'}</span></span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {winner?.member_id === record.member_id && (
                              <div className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full whitespace-nowrap">
                                最新
                              </div>
                            )}
                            {/* 刪除按鈕 - 更大更明顯 */}
                            <button
                              onClick={() => handleDeleteWinner(record.id, record.member_name || '未知會員')}
                              disabled={deletingWinnerId === record.id}
                              className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
                              title={`刪除 ${record.member_name || '未知會員'} 的中獎記錄`}
                            >
                              {deletingWinnerId === record.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                  <span>刪除中...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span>刪除</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 mt-6">
          <p className="text-sm text-gray-500">
            本系統由 <strong className="text-gray-700">華地產資訊長 蔡濬瑒</strong> 開發
          </p>
        </div>
      </div>

      {/* 中獎視窗 Modal - 更大的視窗增加氛圍感 */}
      {showWinnerModal && winnerModalData && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => {
            setShowWinnerModal(false)
            setWinnerModalData(null)
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 rounded-3xl shadow-2xl max-w-2xl w-full p-8 sm:p-12 border-4 border-yellow-400 animate-scaleIn relative"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.3)',
              pointerEvents: 'auto',
            }}
          >
            {/* 關閉按鈕 */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowWinnerModal(false)
                setWinnerModalData(null)
              }}
              className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all z-20 cursor-pointer"
              aria-label="關閉"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 中獎內容 */}
            <div className="text-center space-y-6">
              {/* 標題 */}
              <div className="space-y-2">
                <div className="text-6xl sm:text-7xl mb-4">🎉</div>
                <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600">
                  恭喜中獎！
                </h2>
              </div>

              {/* 中獎者信息 */}
              <div className="bg-white/90 rounded-2xl p-6 shadow-lg border-2 border-yellow-300">
                <div className="space-y-4">
                  <div>
                    <p className="text-lg text-gray-600 mb-2">中獎者</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {winnerModalData.winner.name}
                    </p>
                    <p className="text-lg text-gray-500 mt-1">
                      編號：{formatId(winnerModalData.winner.member_id || winnerModalData.winner.id)}
                    </p>
                  </div>

                    <div className="border-t border-gray-200 pt-4">
                    <p className="text-lg text-gray-600 mb-2">獎品</p>
                    <div className="flex items-center justify-center gap-4">
                      <Image
                        src={getPrizeImageUrl(winnerModalData.prize)}
                        alt={winnerModalData.prize.name}
                        width={128}
                        height={128}
                        unoptimized
                        title="點擊放大"
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl shadow-md border-2 border-yellow-300 cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-purple-400 transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setPreviewImageUrl(getPrizeImageUrl(winnerModalData.prize))
                          setPreviewImageAlt(winnerModalData.prize.name)
                          setImagePreviewScale(1)
                          setShowImagePreview(true)
                        }}
                      />
                      <p className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                        {winnerModalData.prize.name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 機率信息 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-gray-600 mb-1">會員中獎機率</p>
                  <p className="text-xl font-bold text-blue-600">{winnerModalData.winnerProb}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-gray-600 mb-1">獎品被抽中機率</p>
                  <p className="text-xl font-bold text-purple-600">{winnerModalData.prizeProb}</p>
                </div>
              </div>

              {/* 結束語（如果所有獎品抽完） */}
              {winnerModalData.completionMessage && (
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 border-2 border-purple-300">
                  <p className="text-lg font-semibold text-purple-800">
                    {winnerModalData.completionMessage}
                  </p>
                </div>
              )}

              {/* 確認按鈕 */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowWinnerModal(false)
                  setWinnerModalData(null)
                }}
                className="w-full px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all cursor-pointer"
                type="button"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 獎品圖片預覽 Modal：點擊放大（z-[150] 確保浮於中獎視窗之上） */}
      {showImagePreview && previewImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="獎品圖片預覽"
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 py-8 px-4"
          onClick={() => {
            setShowImagePreview(false)
            setPreviewImageUrl('')
          }}
        >
          <div
            className="flex flex-col items-center gap-3 max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImageUrl}
              alt={previewImageAlt}
              className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
              style={{ transform: `scale(${imagePreviewScale})` }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setImagePreviewScale((s) => Math.max(0.5, s - 0.25))
                }}
                className="px-4 py-2 bg-white/95 text-gray-800 rounded-lg font-medium shadow hover:bg-white"
              >
                － 縮小
              </button>
              <span className="px-3 py-2 bg-white/80 text-gray-700 rounded-lg text-sm tabular-nums min-w-[60px] text-center">
                {Math.round(imagePreviewScale * 100)}%
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setImagePreviewScale((s) => Math.min(2, s + 0.25))
                }}
                className="px-4 py-2 bg-white/95 text-gray-800 rounded-lg font-medium shadow hover:bg-white"
              >
                ＋ 放大
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setImagePreviewScale(1)
                }}
                className="px-4 py-2 bg-white/80 text-gray-700 rounded-lg text-sm hover:bg-white/95"
              >
                還原
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
