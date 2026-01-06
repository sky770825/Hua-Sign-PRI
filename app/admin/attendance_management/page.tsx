'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id: number
  name: string
  profession: string
}

interface CheckinRecord {
  member_id: number
  checkin_time: string | null
  message: string | null
  status: string
  name: string
}

interface Meeting {
  id: number
  date: string
  status: string
}

export default function AttendanceManagement() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  
  // 過濾 vercel 相關文字的輔助函數
  const filterVercelText = (text: string): string => {
    return text
      .replace(/vercel\.app/gi, '')
      .replace(/vercel/gi, '')
      .replace(/\.app/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  // 初始化選中的日期為下一個週四
  const getInitialThursday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7
    const nextThursday = new Date(today)
    nextThursday.setDate(today.getDate() + daysUntilThursday)
    return nextThursday.toISOString().split('T')[0]
  }
  
  const [selectedDate, setSelectedDate] = useState(getInitialThursday())
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  
  // 从 URL 参数读取 tab，如果没有则默认为 'attendance'
  // 支持 'statistics' 作为 'reports' 的别名
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search)
        const tabFromUrl = params.get('tab')
        if (tabFromUrl) {
          return tabFromUrl === 'statistics' ? 'reports' : tabFromUrl
        }
      } catch (e) {
        console.error('Error reading URL params:', e)
      }
    }
    return 'attendance'
  }
  
  const [activeTab, setActiveTab] = useState('attendance')
  
  // 当组件挂载时，从URL读取tab参数
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialTab = getInitialTab()
      if (initialTab !== activeTab) {
        setActiveTab(initialTab)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // 监听浏览器前进/后退
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handlePopState = () => {
      const newTab = getInitialTab()
      if (newTab !== activeTab) {
        setActiveTab(newTab)
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [activeTab])
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [newMember, setNewMember] = useState({ id: '', name: '', profession: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all')
  const [meetingStats, setMeetingStats] = useState<Record<string, number>>({})
  const [editingCheckin, setEditingCheckin] = useState<{memberId: number, message: string} | null>(null)
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'time' | 'status'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [memberAttendanceStats, setMemberAttendanceStats] = useState<Record<number, {total: number, present: number, rate: number}>>({})
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [systemSettings, setSystemSettings] = useState({
    autoBackup: false,
    emailNotifications: false,
    defaultMeetingTime: '19:00',
    checkinDeadline: '19:30',
  })
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [prizes, setPrizes] = useState<Array<{
    id: number
    name: string
    image_url: string
    total_quantity: number
    remaining_quantity: number
    probability: number
  }>>([])
  const [editingPrize, setEditingPrize] = useState<{
    id: number
    name: string
    image_url: string
    total_quantity: number
    remaining_quantity: number
    probability: number
  } | null>(null)
  const [showPrizeModal, setShowPrizeModal] = useState(false)
  const [newPrize, setNewPrize] = useState({
    name: '',
    totalQuantity: 1,
    probability: 1.0,
    image: null as File | null,
  })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchWithTimeout = useCallback(async (
    input: RequestInfo,
    init?: RequestInit,
    timeoutMs = 10000
  ) => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(input, { ...init, signal: controller.signal })
    } finally {
      window.clearTimeout(timeoutId)
    }
  }, [])

  const loadData = useCallback(async (silent = false, dateOverride?: string) => {
    if (!silent) {
      setLoading(true)
    }
    try {
      const targetDate = dateOverride ?? selectedDate
      // 並行加載基本數據以提高性能，使用更短的超時時間
      const [membersRes, meetingsRes, checkinsRes] = await Promise.allSettled([
        fetchWithTimeout('/api/members', undefined, 6000),
        fetchWithTimeout('/api/meetings', undefined, 6000),
        fetchWithTimeout(`/api/checkins?date=${targetDate}`, undefined, 6000)
      ])

      // 處理會員數據
      let membersData: { members: Member[] } = { members: [] }
      if (membersRes.status === 'fulfilled' && membersRes.value.ok) {
        membersData = await membersRes.value.json()
      } else {
        console.warn('Failed to fetch members, using empty array')
      }

      // 處理會議數據
      let meetingsData: { meetings: Meeting[] } = { meetings: [] }
      if (meetingsRes.status === 'fulfilled' && meetingsRes.value.ok) {
        meetingsData = await meetingsRes.value.json()
      } else {
        console.warn('Failed to fetch meetings, using empty array')
      }

      // 處理簽到數據
      let checkinsData: { checkins: CheckinRecord[] } = { checkins: [] }
      if (checkinsRes.status === 'fulfilled' && checkinsRes.value.ok) {
        checkinsData = await checkinsRes.value.json()
      } else {
        console.warn('Failed to fetch checkins, using empty array')
      }

      setMembers(membersData.members || [])
      setMeetings(meetingsData.meetings || [])
      setCheckins(checkinsData.checkins || [])

      // 设置当前日期的会议
      const todayMeeting = meetingsData.meetings?.find((m: Meeting) => m.date === targetDate)
      setSelectedMeeting(todayMeeting || null)

      // 獲取每個會議的簽到人數（優化：只獲取最近 3 個會議，進一步減少請求數量）
      const stats: Record<string, number> = {}
      const meetingDates = (meetingsData.meetings || []).slice(-3).map((m: Meeting) => m.date)
      
      // 並行獲取會議的簽到數據（限制為最近 3 個會議，使用更短的超時）
      // 添加延遲以避免同時發送過多請求
      const checkinPromises: Array<Promise<{ date: string; checkins: CheckinRecord[] }>> = meetingDates.map(async (date: string, index: number) => {
        // 為每個請求添加小延遲，避免同時發送
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, index * 200)) // 每個請求間隔200ms
        }
        
        try {
          const checkinsRes = await fetchWithTimeout(`/api/checkins?date=${date}`, undefined, 4000)
          if (!checkinsRes.ok) {
            // 檢查是否為速率限制錯誤
            if (checkinsRes.status === 429) {
              throw new Error('Too many requests')
            }
            return { date, checkins: [] as CheckinRecord[] }
          }
          const checkinsData = await checkinsRes.json()
          return { date, checkins: (checkinsData.checkins || []) as CheckinRecord[] }
        } catch (err) {
          // 如果是速率限制錯誤，重新拋出
          if (err instanceof Error && err.message.includes('Too many requests')) {
            throw err
          }
          // 其他錯誤返回空數組，不影響頁面顯示
          return { date, checkins: [] as CheckinRecord[] }
        }
      })
      
      // 使用 Promise.allSettled 確保即使部分請求失敗也能繼續
      const checkinResults = await Promise.allSettled(checkinPromises)
      const allCheckinsByDate: Record<string, CheckinRecord[]> = {}
      for (const result of checkinResults) {
        if (result.status === 'fulfilled') {
          allCheckinsByDate[result.value.date] = result.value.checkins
          stats[result.value.date] = result.value.checkins.length
        }
      }
      
      // 為所有會議設置統計（沒有數據的設為 0）
      (meetingsData.meetings || []).forEach((meeting: Meeting) => {
        if (!stats[meeting.date]) {
          stats[meeting.date] = 0
        }
      })
      
      setMeetingStats(stats)

      // 計算每個會員的出席統計（使用已獲取的數據，只計算最近 10 個會議）
      const memberStats: Record<number, {total: number, present: number, rate: number}> = {}
      const totalMeetings = meetingDates.length
      
      if (totalMeetings > 0) {
        for (const member of membersData.members) {
          let presentCount = 0
          for (const date of meetingDates) {
            const checkins = allCheckinsByDate[date] || []
            const hasCheckin = checkins.some((c: CheckinRecord) => c.member_id === member.id && c.status === 'present')
            if (hasCheckin) presentCount++
          }
          memberStats[member.id] = {
            total: totalMeetings,
            present: presentCount,
            rate: totalMeetings > 0 ? (presentCount / totalMeetings) * 100 : 0
          }
        }
      }
      setMemberAttendanceStats(memberStats)
    } catch (error) {
      console.error('Error loading data:', error)
      if (!silent) {
        // 只在非靜默模式下顯示錯誤提示
        const errorMessage = error instanceof Error ? error.message : '載入資料失敗'
        if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
          console.warn('Request timeout, will retry on next refresh')
        } else if (errorMessage.includes('Too many requests') || 
                   errorMessage.includes('rate limit') ||
                   errorMessage.includes('429')) {
          // 速率限制錯誤，顯示提示但不中斷操作
          console.warn('Rate limit detected, please wait before refreshing')
          if (!silent) {
            alert('請求過於頻繁，請稍候再試')
          }
        } else {
          console.error('Load data error:', errorMessage)
          // 不顯示alert，避免干擾用戶
        }
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [fetchWithTimeout, selectedDate])

  const loadPrizes = useCallback(async () => {
    try {
      const response = await fetch('/api/prizes')
      const data = await response.json()
      setPrizes(data.prizes || [])
    } catch (error) {
      console.error('Error loading prizes:', error)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'prizes') {
      loadPrizes()
    }
  }, [activeTab, loadPrizes])

  useEffect(() => {
    // 檢查登入狀態（確保在客戶端執行）
    if (typeof window === 'undefined') {
      return
    }

    const loggedIn = localStorage.getItem('adminLoggedIn')
    if (loggedIn !== 'true') {
      setLoading(false)
      // 使用 window.location 確保完整重定向
      window.location.href = '/admin/login'
      return
    }

    // 只在組件掛載時加載一次，避免無限循環
    let mounted = true
    const fetchData = async () => {
      if (mounted) {
        await loadData()
      }
    }
    fetchData()
    
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在掛載時執行一次

  // 背景自動刷新數據（每60秒）- 僅在出席管理標籤頁，不顯示加載狀態
  // 添加速率限制檢測，避免觸發 "Too many requests" 錯誤
  useEffect(() => {
    if (activeTab === 'attendance') {
      let retryCount = 0
      const maxRetries = 3
      let isPaused = false
      
      const interval = setInterval(() => {
        // 如果已暫停（遇到速率限制），跳過本次刷新
        if (isPaused) {
          console.log('Background refresh paused due to rate limiting')
          return
        }
        
        // 背景靜默刷新，不顯示loading狀態
        loadData(true).catch(err => {
          console.error('Background refresh error:', err)
          const errorMessage = err instanceof Error ? err.message : String(err)
          
          // 檢測速率限制錯誤
          if (errorMessage.includes('Too many requests') || 
              errorMessage.includes('rate limit') ||
              errorMessage.includes('429')) {
            console.warn('Rate limit detected, pausing background refresh')
            isPaused = true
            retryCount++
            
            // 如果重試次數未達上限，在5分鐘後恢復
            if (retryCount < maxRetries) {
              setTimeout(() => {
                isPaused = false
                console.log('Resuming background refresh after rate limit cooldown')
              }, 5 * 60 * 1000) // 5分鐘後恢復
            } else {
              console.warn('Max retries reached, background refresh permanently paused')
            }
          }
        })
      }, 60000) // 改為60秒刷新一次，減少請求頻率
      
      return () => clearInterval(interval)
    }
  }, [activeTab]) // 移除 loadData 依賴，避免無限循環

  // 获取下一个周四的日期
  const getNextThursday = (): string => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 4 = Thursday
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7 // 如果今天是周四，则取下一个周四
    const nextThursday = new Date(today)
    nextThursday.setDate(today.getDate() + daysUntilThursday)
    return nextThursday.toISOString().split('T')[0]
  }

  // 检查日期是否为周四
  const isThursday = (dateString: string): boolean => {
    const date = new Date(dateString)
    return date.getDay() === 4 // 4 = Thursday
  }

  // 生成所有周四的日期列表（过去12个月到未来12个月）
  const getThursdayDates = (): Array<{ value: string; label: string }> => {
    const dates: Array<{ value: string; label: string }> = []
    const today = new Date()
    
    // 从12个月前开始
    const startDate = new Date(today)
    startDate.setMonth(today.getMonth() - 12)
    
    // 找到第一个周四
    const firstThursday = new Date(startDate)
    const dayOfWeek = firstThursday.getDay()
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7
    firstThursday.setDate(startDate.getDate() + daysUntilThursday)
    
    // 生成未来24个月的所有周四（大约104个周四）
    const currentDate = new Date(firstThursday)
    const endDate = new Date(today)
    endDate.setMonth(today.getMonth() + 12)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const label = currentDate.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      })
      dates.push({ value: dateStr, label })
      currentDate.setDate(currentDate.getDate() + 7) // 加7天到下个周四
    }
    
    return dates
  }

  const thursdayDates = useMemo(() => getThursdayDates(), [])

  const handleCreateMeeting = async () => {
    // 自动设置为下一个周四
    const thursdayDate = getNextThursday()
    setSelectedDate(thursdayDate)
    
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: thursdayDate,
          status: 'scheduled',
        }),
      })

      if (response.ok) {
        loadData(false, thursdayDate)
      }
    } catch (error) {
      console.error('Error creating meeting:', error)
    }
  }

  const handleManualCheckin = async (memberId: number, status: string) => {
    const key = `checkin-${memberId}`
    if (actionLoading[key]) {
      console.log('簽到操作進行中，跳過重複請求')
      return
    }

    setActionLoading(prev => ({ ...prev, [key]: true }))
    
    // 樂觀更新：立即更新簽到狀態
    const member = members.find(m => m.id === memberId)
    const optimisticCheckin: CheckinRecord = {
      member_id: memberId,
      checkin_time: new Date().toISOString(),
      message: '管理員手動簽到',
      status: status || 'present',
      name: member?.name || '',
    }
    setCheckins(prev => {
      const filtered = prev.filter(c => c.member_id !== memberId || c.checkin_time?.split('T')[0] !== selectedDate)
      return [...filtered, optimisticCheckin]
    })
    
    try {
      console.log('開始手動簽到:', { memberId, date: selectedDate, status })
      
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          date: selectedDate,
          message: '管理員手動簽到',
          status,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '簽到失敗' }))
        const errorMessage = errorData.error || '簽到失敗'
        console.error('簽到失敗:', { status: response.status, error: errorMessage })
        
        // 失敗時恢復原狀態
        await loadData(false, selectedDate)
        setToast({ message: `簽到失敗：${errorMessage}`, type: 'error' })
        setTimeout(() => setToast(null), 4000)
        return
      }

      const data = await response.json()
      console.log('簽到響應:', data)
      
      if (data.success) {
        // 背景刷新數據確保同步
        await loadData(false, selectedDate)
        setToast({ message: '簽到成功！', type: 'success' })
        setTimeout(() => setToast(null), 3000)
      } else {
        // 失敗時恢復原狀態
        await loadData(false, selectedDate)
        setToast({ message: '簽到失敗：' + (data.error || '未知錯誤'), type: 'error' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (error) {
      console.error('Error checking in:', error)
      const errorMessage = error instanceof Error ? error.message : '簽到失敗'
      
      // 失敗時恢復原狀態
      await loadData(false, selectedDate)
      setToast({ message: `簽到失敗：${errorMessage}`, type: 'error' })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleDeleteCheckin = async (memberId: number) => {
    if (!confirm('確定要刪除此簽到記錄嗎？')) return

    // 樂觀更新：立即從列表中移除
    const checkinToDelete = checkins.find(c => c.member_id === memberId && c.checkin_time?.split('T')[0] === selectedDate)
    setCheckins(prev => prev.filter(c => !(c.member_id === memberId && c.checkin_time?.split('T')[0] === selectedDate)))

    try {
      console.log('刪除簽到記錄:', { memberId, date: selectedDate })
      
      const response = await fetch('/api/checkin/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId,
          date: selectedDate,
        }),
      })

      if (!response.ok) {
        // 失敗時恢復
        if (checkinToDelete) {
          setCheckins(prev => [...prev, checkinToDelete])
        }
        const errorData = await response.json().catch(() => ({ error: '刪除失敗' }))
        const errorMessage = errorData.error || '刪除失敗'
        console.error('刪除簽到記錄失敗:', { status: response.status, error: errorMessage })
        setToast({ message: `刪除失敗：${errorMessage}`, type: 'error' })
        setTimeout(() => setToast(null), 4000)
        return
      }

      const data = await response.json()
      console.log('刪除簽到記錄響應:', data)
      
      if (data.success) {
        // 背景刷新數據確保同步
        await loadData(false, selectedDate)
        setToast({ message: '簽到記錄已成功刪除', type: 'success' })
        setTimeout(() => setToast(null), 3000)
      } else {
        // 失敗時恢復
        if (checkinToDelete) {
          setCheckins(prev => [...prev, checkinToDelete])
        }
        setToast({ message: '刪除失敗：' + (data.error || '未知錯誤'), type: 'error' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (error) {
      console.error('Error deleting checkin:', error)
      // 失敗時恢復
      if (checkinToDelete) {
        setCheckins(prev => [...prev, checkinToDelete])
      }
      const errorMessage = error instanceof Error ? error.message : '刪除失敗'
      setToast({ message: `刪除失敗：${errorMessage}`, type: 'error' })
      setTimeout(() => setToast(null), 4000)
    }
  }

  const getCheckinStatus = useCallback((memberId: number) => {
    return checkins.find(c => c.member_id === memberId) || null
  }, [checkins])

  // 使用 useMemo 优化筛选和排序
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = searchTerm === '' || 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.id.toString().includes(searchTerm)
      
      const checkin = getCheckinStatus(member.id)
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'present' && checkin) ||
        (filterStatus === 'absent' && !checkin)
      
      return matchesSearch && matchesStatus
    })
  }, [members, searchTerm, filterStatus, getCheckinStatus])

  // 排序会员 - 使用 useMemo 优化
  const sortedFilteredMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      const aCheckin = getCheckinStatus(a.id)
      const bCheckin = getCheckinStatus(b.id)
      
      let comparison = 0
      switch (sortBy) {
        case 'id':
          comparison = a.id - b.id
          break
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-TW')
          break
        case 'time':
          const aTime = aCheckin?.checkin_time ? new Date(aCheckin.checkin_time).getTime() : 0
          const bTime = bCheckin?.checkin_time ? new Date(bCheckin.checkin_time).getTime() : 0
          comparison = aTime - bTime
          break
        case 'status':
          comparison = (aCheckin ? 1 : 0) - (bCheckin ? 1 : 0)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredMembers, sortBy, sortOrder, getCheckinStatus])

  const handleEditCheckin = (memberId: number) => {
    const checkin = getCheckinStatus(memberId)
    setEditingCheckin({
      memberId,
      message: checkin?.message || '',
    })
  }

  const handleSaveCheckinEdit = async () => {
    if (!editingCheckin) return

    // 樂觀更新：立即更新簽到記錄
    const member = members.find(m => m.id === editingCheckin.memberId)
    const updatedCheckin: CheckinRecord = {
      member_id: editingCheckin.memberId,
      checkin_time: new Date().toISOString(),
      message: (editingCheckin.message.trim() || null) as string | null,
      status: 'present',
      name: member?.name || '',
    }
    setCheckins(prev => prev.map(c => 
      c.member_id === editingCheckin.memberId && c.checkin_time?.split('T')[0] === selectedDate
        ? updatedCheckin
        : c
    ))
    
    // 立即關閉彈窗
    const savedEditingCheckin = editingCheckin
    setEditingCheckin(null)

    try {
      console.log('更新簽到記錄:', { 
        memberId: savedEditingCheckin.memberId, 
        date: selectedDate, 
        message: savedEditingCheckin.message 
      })
      
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: savedEditingCheckin.memberId,
          date: selectedDate,
          message: savedEditingCheckin.message.trim() || null,
          status: 'present',
        }),
      })

      if (!response.ok) {
        // 失敗時恢復
        await loadData(false, selectedDate)
        const errorData = await response.json().catch(() => ({ error: '更新失敗' }))
        const errorMessage = errorData.error || '更新失敗'
        console.error('更新簽到記錄失敗:', { status: response.status, error: errorMessage })
        setToast({ message: `更新失敗：${errorMessage}`, type: 'error' })
        setTimeout(() => setToast(null), 4000)
        return
      }

      const data = await response.json()
      console.log('更新簽到記錄響應:', data)
      
      if (data.success) {
        // 背景刷新數據確保同步
        await loadData(false, selectedDate)
        setToast({ message: '簽到記錄已成功更新', type: 'success' })
        setTimeout(() => setToast(null), 3000)
      } else {
        // 失敗時恢復
        await loadData(false, selectedDate)
        setToast({ message: '更新失敗：' + (data.error || '未知錯誤'), type: 'error' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (error) {
      console.error('Error updating checkin:', error)
      // 失敗時恢復
      await loadData(false, selectedDate)
      const errorMessage = error instanceof Error ? error.message : '更新失敗'
      setToast({ message: `更新失敗：${errorMessage}`, type: 'error' })
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleEditMember = (member: Member) => {
    setEditingMember(member)
    setShowMemberModal(true)
  }

  const handleDeleteMember = async (memberId: number) => {
    if (!confirm('確定要刪除此會員嗎？此操作無法復原。')) return

    // 樂觀更新：立即從列表中移除
    const memberToDelete = members.find(m => m.id === memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
    
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // 延遲背景刷新數據，確保樂觀更新先顯示
          setTimeout(async () => {
            await loadData(true) // 使用靜默模式，不顯示 loading
          }, 500)
          setToast({ message: '會員已成功刪除', type: 'success' })
          setTimeout(() => setToast(null), 3000)
        } else {
          // 失敗時恢復列表
          if (memberToDelete) {
            setMembers(prev => [...prev, memberToDelete].sort((a, b) => a.id - b.id))
          }
          const errorMsg = filterVercelText(data.error || '未知錯誤')
          setToast({ message: '刪除失敗：' + errorMsg, type: 'error' })
          setTimeout(() => setToast(null), 4000)
        }
      } else {
        // 失敗時恢復列表
        if (memberToDelete) {
          setMembers(prev => [...prev, memberToDelete].sort((a, b) => a.id - b.id))
        }
        const errorData = await response.json().catch(() => ({ error: '刪除失敗' }))
        const errorMsg = filterVercelText(errorData.error || '未知錯誤')
        setToast({ message: '刪除失敗：' + errorMsg, type: 'error' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (error) {
      console.error('Error deleting member:', error)
      // 失敗時恢復列表
      if (memberToDelete) {
        setMembers(prev => [...prev, memberToDelete].sort((a, b) => a.id - b.id))
      }
      setToast({ message: '刪除失敗：網路錯誤或伺服器無回應', type: 'error' })
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleSaveMember = async () => {
    try {
      if (editingMember) {
        // 更新會員
        if (!editingMember.name || editingMember.name.trim() === '') {
          setToast({ message: '請輸入會員姓名', type: 'error' })
          setTimeout(() => setToast(null), 3000)
          return
        }

        // 樂觀更新：立即更新列表中的會員
        const updatedMember = {
          id: editingMember.id,
          name: editingMember.name.trim(),
          profession: editingMember.profession?.trim() || '',
        }
        setMembers(prev => prev.map(m => m.id === editingMember.id ? updatedMember : m))
        
        // 立即關閉彈窗
        setShowMemberModal(false)
        const savedEditingMember = editingMember
        setEditingMember(null)

        const response = await fetch(`/api/members/${savedEditingMember.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: savedEditingMember.name.trim(),
            profession: savedEditingMember.profession?.trim() || '',
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // 背景刷新數據確保同步
            await loadData(false)
            setToast({ message: '會員已成功更新', type: 'success' })
            setTimeout(() => setToast(null), 3000)
          } else {
            // 失敗時恢復原數據
            setMembers(prev => prev.map(m => m.id === savedEditingMember.id ? savedEditingMember : m))
            setToast({ message: '更新失敗：' + (data.error || '未知錯誤'), type: 'error' })
            setTimeout(() => setToast(null), 4000)
          }
        } else {
          // 失敗時恢復原數據
          setMembers(prev => prev.map(m => m.id === savedEditingMember.id ? savedEditingMember : m))
          const errorData = await response.json().catch(() => ({ error: '更新失敗' }))
          setToast({ message: '更新失敗：' + (errorData.error || '未知錯誤'), type: 'error' })
          setTimeout(() => setToast(null), 4000)
        }
      } else {
        // 創建新會員
        // 驗證輸入
        if (!newMember.id || newMember.id.trim() === '') {
          setToast({ message: '請輸入會員編號', type: 'error' })
          setTimeout(() => setToast(null), 3000)
          return
        }

        if (!newMember.name || newMember.name.trim() === '') {
          setToast({ message: '請輸入會員姓名', type: 'error' })
          setTimeout(() => setToast(null), 3000)
          return
        }

        const memberId = parseInt(newMember.id)
        if (isNaN(memberId) || memberId <= 0) {
          setToast({ message: '會員編號必須是正整數', type: 'error' })
          setTimeout(() => setToast(null), 3000)
          return
        }

        // 保存表單數據
        const savedMemberData = {
          id: memberId,
          name: newMember.name.trim(),
          profession: newMember.profession?.trim() || '',
        }

        // 樂觀更新：立即添加到列表
        const newMemberObj: Member = {
          id: memberId,
          name: savedMemberData.name,
          profession: savedMemberData.profession,
        }
        setMembers(prev => [...prev, newMemberObj].sort((a, b) => a.id - b.id))
        
        // 立即關閉彈窗並清空表單
        setShowMemberModal(false)
        setNewMember({ id: '', name: '', profession: '' })

        console.log('開始新增會員:', savedMemberData)
        
        const response = await fetch('/api/members/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(savedMemberData),
        })

        console.log('新增會員 API 響應:', { ok: response.ok, status: response.status })

        if (response.ok) {
          const data = await response.json()
          console.log('新增會員 API 數據:', data)
          
          if (data.success) {
            // 延遲背景刷新數據，確保樂觀更新先顯示
            setTimeout(async () => {
              await loadData(true) // 使用靜默模式，不顯示 loading
            }, 500)
            setToast({ message: '會員已成功新增', type: 'success' })
            setTimeout(() => setToast(null), 3000)
            console.log('會員數據已刷新')
          } else {
            // 失敗時從列表中移除
            setMembers(prev => prev.filter(m => m.id !== memberId))
            const errorMessage = filterVercelText(data.error || '未知錯誤')
            console.error('新增會員失敗:', errorMessage)
            setToast({ message: '新增失敗：' + errorMessage, type: 'error' })
            setTimeout(() => setToast(null), 4000)
          }
        } else {
          // 失敗時從列表中移除
          setMembers(prev => prev.filter(m => m.id !== memberId))
          const errorData = await response.json().catch(() => ({ error: '新增失敗' }))
          const errorMessage = filterVercelText(errorData.error || '新增失敗')
          console.error('新增會員 API 錯誤:', { status: response.status, error: errorMessage })
          setToast({ message: '新增失敗：' + errorMessage, type: 'error' })
          setTimeout(() => setToast(null), 4000)
        }
      }
    } catch (error) {
      console.error('Error saving member:', error)
      // 如果是新增，失敗時從列表中移除
      if (!editingMember) {
        const memberId = parseInt(newMember.id)
        if (!isNaN(memberId)) {
          setMembers(prev => prev.filter(m => m.id !== memberId))
        }
      } else {
        // 如果是編輯，恢復原數據
        setMembers(prev => prev.map(m => m.id === editingMember.id ? editingMember : m))
      }
      setToast({ message: '操作失敗：網路錯誤或伺服器無回應', type: 'error' })
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting)
    setShowMeetingModal(true)
  }

  const handleDeleteMeeting = async (meetingId: number) => {
    if (!confirm('確定要刪除此會議嗎？相關的簽到記錄也會被刪除。')) return

    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Error deleting meeting:', error)
    }
  }

  const handleSaveMeeting = async () => {
    try {
      if (editingMeeting) {
        // 更新现有会议 - 确保日期是周四
        let meetingDate = editingMeeting.date
        if (!isThursday(meetingDate)) {
          meetingDate = getNextThursday()
          alert('會議日期必須是週四，已自動調整為下一個週四')
        }
        
        const response = await fetch(`/api/meetings/${editingMeeting.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: meetingDate,
            status: editingMeeting.status,
          }),
        })

        if (response.ok) {
          setShowMeetingModal(false)
          setEditingMeeting(null)
          loadData()
        }
      } else {
        // 创建新会议 - 自动设置为下一个周四
        const meetingDate = getNextThursday()
        const response = await fetch('/api/meetings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: meetingDate,
            status: 'scheduled',
          }),
        })

        if (response.ok) {
          setShowMeetingModal(false)
          setEditingMeeting(null)
          loadData()
        }
      }
    } catch (error) {
      console.error('Error saving meeting:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminLoggedIn')
    router.push('/admin/login')
  }

  // 统计数据 - 使用 useMemo 优化
  const stats = useMemo(() => {
    const total = members.length
    const present = checkins.filter(c => c.status === 'present').length
    const absent = total - present
    return { total, present, absent }
  }, [members.length, checkins])

  // 批量操作
  const handleBatchCheckin = async () => {
    if (selectedMembers.length === 0) {
      setToast({ message: '請選擇要簽到的會員', type: 'error' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    if (!confirm(`確定要為 ${selectedMembers.length} 位會員進行批量簽到嗎？`)) return

    // 樂觀更新：立即更新所有選中會員的簽到狀態
    const selectedMemberIds = [...selectedMembers]
    selectedMemberIds.forEach(memberId => {
      const member = members.find(m => m.id === memberId)
      const optimisticCheckin: CheckinRecord = {
        member_id: memberId,
        checkin_time: new Date().toISOString(),
        message: '管理員批量簽到',
        status: 'present',
        name: member?.name || '',
      }
      setCheckins(prev => {
        const filtered = prev.filter(c => c.member_id !== memberId || c.checkin_time?.split('T')[0] !== selectedDate)
        return [...filtered, optimisticCheckin]
      })
    })
    
    setSelectedMembers([])

    try {
      console.log('開始批量簽到:', { count: selectedMemberIds.length, date: selectedDate })
      
      const promises = selectedMemberIds.map(memberId =>
        fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId,
            date: selectedDate,
            message: '管理員批量簽到',
            status: 'present',
          }),
        }).then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: '簽到失敗' }))
            throw new Error(`會員 ${memberId}: ${errorData.error || '簽到失敗'}`)
          }
          return response.json()
        })
      )

      const results = await Promise.allSettled(promises)
      const failed = results.filter(r => r.status === 'rejected')
      
      // 背景刷新數據確保同步
      await loadData(false, selectedDate)
      
      if (failed.length > 0) {
        console.error('批量簽到部分失敗:', failed)
        const errorMessages = failed.map((f: any) => f.reason?.message || '未知錯誤').join('、')
        setToast({ 
          message: `批量簽到完成，但有 ${failed.length} 位會員簽到失敗：${errorMessages}`, 
          type: 'error' 
        })
        setTimeout(() => setToast(null), 5000)
      } else {
        setToast({ message: `批量簽到成功！已為 ${selectedMemberIds.length} 位會員簽到`, type: 'success' })
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error) {
      console.error('Error batch checking in:', error)
      // 失敗時恢復
      await loadData(false, selectedDate)
      setToast({ 
        message: '批量簽到失敗：' + (error instanceof Error ? error.message : '未知錯誤'), 
        type: 'error' 
      })
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedMembers.length === 0) {
      setToast({ message: '請選擇要刪除的簽到記錄', type: 'error' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    if (!confirm(`確定要刪除 ${selectedMembers.length} 筆簽到記錄嗎？`)) return

    // 樂觀更新：立即從列表中移除所有選中的簽到記錄
    const selectedMemberIds = [...selectedMembers]
    const checkinsToDelete = checkins.filter(c => 
      selectedMemberIds.includes(c.member_id) && c.checkin_time?.split('T')[0] === selectedDate
    )
    setCheckins(prev => prev.filter(c => 
      !(selectedMemberIds.includes(c.member_id) && c.checkin_time?.split('T')[0] === selectedDate)
    ))
    setSelectedMembers([])

    try {
      console.log('開始批量刪除簽到記錄:', { count: selectedMemberIds.length, date: selectedDate })
      
      const promises = selectedMemberIds.map(memberId =>
        fetch('/api/checkin/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, date: selectedDate }),
        }).then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: '刪除失敗' }))
            throw new Error(`會員 ${memberId}: ${errorData.error || '刪除失敗'}`)
          }
          return response.json()
        })
      )

      const results = await Promise.allSettled(promises)
      const failed = results.filter(r => r.status === 'rejected')
      
      // 背景刷新數據確保同步
      await loadData(false, selectedDate)
      
      if (failed.length > 0) {
        // 失敗時恢復
        setCheckins(prev => [...prev, ...checkinsToDelete])
        console.error('批量刪除部分失敗:', failed)
        const errorMessages = failed.map((f: any) => f.reason?.message || '未知錯誤').join('、')
        setToast({ 
          message: `批量刪除完成，但有 ${failed.length} 筆記錄刪除失敗：${errorMessages}`, 
          type: 'error' 
        })
        setTimeout(() => setToast(null), 5000)
      } else {
        setToast({ message: `批量刪除成功！已刪除 ${selectedMemberIds.length} 筆簽到記錄`, type: 'success' })
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error) {
      console.error('Error batch deleting:', error)
      // 失敗時恢復
      setCheckins(prev => [...prev, ...checkinsToDelete])
      await loadData(false, selectedDate)
      setToast({ 
        message: '批量刪除失敗：' + (error instanceof Error ? error.message : '未知錯誤'), 
        type: 'error' 
      })
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleExportCSV = () => {
    const csvContent = [
      ['編號', '姓名', '專業別', '簽到時間', '狀態', '留言'],
      ...sortedFilteredMembers.map(member => {
        const checkin = getCheckinStatus(member.id)
        return [
          member.id.toString(),
          member.name,
          member.profession,
          checkin?.checkin_time ? new Date(checkin.checkin_time).toLocaleString('zh-TW') : '',
          checkin ? '已簽到' : '缺席',
          checkin?.message || '',
        ]
      }),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `簽到記錄_${selectedDate}.csv`
    link.click()
  }

  const toggleMemberSelection = (memberId: number) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedMembers.length === sortedFilteredMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(sortedFilteredMembers.map(m => m.id))
    }
  }

  const handleExportMembersCSV = () => {
    const csvContent = [
      ['編號', '姓名', '專業別'],
      ...members.map(member => [
        member.id.toString(),
        member.name,
        member.profession,
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `會員清單_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handleImportMembers = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split('\n').slice(1).filter(line => line.trim())
    
    let successCount = 0
    let errorCount = 0

    for (const line of lines) {
      const [id, name, profession] = line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim())
      if (!id || !name) continue

      try {
        const response = await fetch('/api/members/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: parseInt(id), name, profession: profession || '' }),
        })
        if (response.ok) successCount++
        else errorCount++
      } catch (error) {
        errorCount++
      }
    }

    alert(`匯入完成：成功 ${successCount} 筆，失敗 ${errorCount} 筆`)
    loadData()
    event.target.value = ''
  }

  const handleChangePassword = async () => {
    if (passwordForm.oldPassword !== 'h123') {
      alert('舊密碼錯誤')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('新密碼與確認密碼不一致')
      return
    }

    if (passwordForm.newPassword.length < 4) {
      alert('新密碼長度至少需要4個字元')
      return
    }

    // 这里应该调用API更新密码，目前先存储在localStorage
    localStorage.setItem('adminPassword', passwordForm.newPassword)
    alert('密碼修改成功！請記住新密碼：' + passwordForm.newPassword)
    setShowPasswordModal(false)
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
  }

  const handleBackupDatabase = async () => {
    try {
      // 导出所有数据为JSON
      const backupData: {
        members: Member[]
        meetings: Meeting[]
        checkins: Array<{ date: string; checkins: any[] }>
        timestamp: string
      } = {
        members,
        meetings,
        checkins: [],
        timestamp: new Date().toISOString(),
      }

      // 获取所有会议的签到记录
      for (const meeting of meetings) {
        try {
          const checkinsRes = await fetch(`/api/checkins?date=${meeting.date}`)
          const checkinsData = await checkinsRes.json()
          backupData.checkins.push({
            date: meeting.date,
            checkins: checkinsData.checkins || [],
          })
        } catch (err) {
          // ignore
        }
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `backup_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      alert('資料庫備份成功！')
    } catch (error) {
      console.error('Error backing up:', error)
      alert('備份失敗')
    }
  }

  const handleRestoreDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!confirm('確定要還原資料庫嗎？此操作會覆蓋現有資料！')) {
      event.target.value = ''
      return
    }

    try {
      const text = await file.text()
      const backupData = JSON.parse(text)

      // 这里应该调用API还原数据
      alert('資料還原功能需要後端API支援。備份檔案已讀取，包含：\n' +
        `會員數：${backupData.members?.length || 0}\n` +
        `會議數：${backupData.meetings?.length || 0}\n` +
        `簽到記錄：${backupData.checkins?.length || 0} 筆`)
      
      loadData()
      event.target.value = ''
    } catch (error) {
      console.error('Error restoring:', error)
      alert('還原失敗：檔案格式錯誤')
      event.target.value = ''
    }
  }

  const handleClearCheckins = async () => {
    if (!confirm('確定要清除所有簽到記錄嗎？此操作無法復原！')) return

    try {
      // 获取所有会议的签到记录并删除
      let deletedCount = 0
      for (const meeting of meetings) {
        try {
          const checkinsRes = await fetch(`/api/checkins?date=${meeting.date}`)
          const checkinsData = await checkinsRes.json()
          
          for (const checkin of checkinsData.checkins || []) {
            const deleteRes = await fetch('/api/checkin/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                memberId: checkin.member_id,
                date: meeting.date,
              }),
            })
            if (deleteRes.ok) deletedCount++
          }
        } catch (err) {
          // ignore
        }
      }

      alert(`已清除 ${deletedCount} 筆簽到記錄`)
      loadData()
    } catch (error) {
      console.error('Error clearing checkins:', error)
      alert('清除失敗')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50" style={{ animation: 'slideIn 0.3s ease-out' }}>
          <div className={`px-6 py-4 rounded-lg shadow-2xl backdrop-blur-sm border-2 min-w-[300px] ${
            toast.type === 'success' 
              ? 'bg-green-500/95 border-green-400 text-white' 
              : 'bg-red-500/95 border-red-400 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">
                {toast.type === 'success' ? '✅' : '❌'}
              </span>
              <span className="font-semibold">
                {filterVercelText(toast.message)}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Header with gradient */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">華地產後台管理系統</h1>
              <p className="text-indigo-100 text-sm sm:text-base">管理員控制面板</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-sm sm:text-base text-indigo-100 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                👤 管理員
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all border border-white/30 font-medium text-sm sm:text-base"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Responsive */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex overflow-x-auto scrollbar-hide space-x-1 sm:space-x-4">
            <button
              onClick={() => {
                const newTab = 'attendance'
                setActiveTab(newTab)
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/admin/attendance_management?tab=attendance')
                }
              }}
              className={`py-4 px-2 sm:px-4 border-b-2 font-semibold text-sm sm:text-base whitespace-nowrap transition-all ${
                activeTab === 'attendance'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 出席管理
            </button>
            <button
              onClick={() => {
                const newTab = 'members'
                setActiveTab(newTab)
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/admin/attendance_management?tab=members')
                }
              }}
              className={`py-4 px-2 sm:px-4 border-b-2 font-semibold text-sm sm:text-base whitespace-nowrap transition-all ${
                activeTab === 'members'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 會員管理
            </button>
            <button
              onClick={() => {
                const newTab = 'meetings'
                setActiveTab(newTab)
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/admin/attendance_management?tab=meetings')
                }
              }}
              className={`py-4 px-2 sm:px-4 border-b-2 font-semibold text-sm sm:text-base whitespace-nowrap transition-all ${
                activeTab === 'meetings'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📅 會議管理
            </button>
            <button
              onClick={() => {
                const newTab = 'reports'
                setActiveTab(newTab)
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/admin/attendance_management?tab=statistics')
                }
              }}
              className={`py-4 px-2 sm:px-4 border-b-2 font-semibold text-sm sm:text-base whitespace-nowrap transition-all ${
                activeTab === 'reports'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 統計報表
            </button>
            <button
              onClick={() => {
                const newTab = 'prizes'
                setActiveTab(newTab)
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/admin/attendance_management?tab=prizes')
                }
              }}
              className={`py-4 px-2 sm:px-4 border-b-2 font-semibold text-sm sm:text-base whitespace-nowrap transition-all ${
                activeTab === 'prizes'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎁 獎品管理
            </button>
            <button
              onClick={() => {
                const newTab = 'settings'
                setActiveTab(newTab)
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/admin/attendance_management?tab=settings')
                }
              }}
              className={`py-4 px-2 sm:px-4 border-b-2 font-semibold text-sm sm:text-base whitespace-nowrap transition-all ${
                activeTab === 'settings'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ 系統設定
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Attendance Management Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Date Selection and Meeting Control */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📅 選擇日期（週四）
                  </label>
                  <select
                    value={selectedDate}
                    onChange={(e) => {
                      const newDate = e.target.value
                      setSelectedDate(newDate)
                      // 使用新的日期加载数据
                      setTimeout(() => {
                        loadData(false, newDate)
                      }, 0)
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                  >
                    {thursdayDates.map((date) => (
                      <option key={date.value} value={date.value}>
                        {date.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">提示：所有選項都是週四的日期</p>
                </div>
                {!selectedMeeting && (
                  <div className="flex items-end">
                    <button
                      onClick={handleCreateMeeting}
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-semibold"
                    >
                      ➕ 建立會議
                    </button>
                  </div>
                )}
                {selectedMeeting && (
                  <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-xl border border-green-200">
                    <span className="text-sm font-semibold text-green-700">
                      ✓ 會議狀態：{selectedMeeting.status === 'scheduled' ? '已安排' : selectedMeeting.status}
                    </span>
                  </div>
                )}
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-5 border border-blue-200 shadow-sm">
                  <div className="text-xs sm:text-sm text-blue-600 font-medium mb-1">總會員數</div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-700">{stats.total}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 sm:p-5 border border-green-200 shadow-sm">
                  <div className="text-xs sm:text-sm text-green-600 font-medium mb-1">已簽到</div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-700">{stats.present}</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 sm:p-5 border border-red-200 shadow-sm">
                  <div className="text-xs sm:text-sm text-red-600 font-medium mb-1">缺席</div>
                  <div className="text-2xl sm:text-3xl font-bold text-red-700">{stats.absent}</div>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>📋</span>
                    <span>出席記錄</span>
                  </h2>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleExportCSV}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold"
                    >
                      📥 匯出CSV
                    </button>
                    {selectedMembers.length > 0 && (
                      <>
                        <button
                          onClick={handleBatchCheckin}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
                        >
                          ✓ 批量簽到 ({selectedMembers.length})
                        </button>
                        <button
                          onClick={handleBatchDelete}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-semibold"
                        >
                          🗑️ 批量刪除 ({selectedMembers.length})
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {/* Search and Filter */}
                <div className="mt-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="搜尋會員（姓名、專業別、編號）..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchTerm('')
                      }
                    }}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="px-3 py-2 text-gray-500 hover:text-gray-700"
                      title="清除搜尋"
                    >
                      ✕
                    </button>
                  )}
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'present' | 'absent')}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    >
                      <option value="all">全部狀態</option>
                      <option value="present">已簽到</option>
                      <option value="absent">缺席</option>
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'id' | 'name' | 'time' | 'status')}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    >
                      <option value="id">依編號排序</option>
                      <option value="name">依姓名排序</option>
                      <option value="time">依簽到時間排序</option>
                      <option value="status">依狀態排序</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm"
                    >
                      {sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedMembers.length === sortedFilteredMembers.length && sortedFilteredMembers.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        編號
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        姓名
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        專業別
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        簽到時間
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        狀態
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        留言
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedFilteredMembers.map((member) => {
                      const checkin = getCheckinStatus(member.id)
                      return (
                        <tr key={member.id} className={`hover:bg-indigo-50/50 transition-colors ${selectedMembers.includes(member.id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(member.id)}
                              onChange={() => toggleMemberSelection(member.id)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            #{member.id}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {member.name}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {member.profession}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {checkin?.checkin_time
                              ? new Date(checkin.checkin_time).toLocaleString('zh-TW')
                              : '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            {checkin ? (
                              <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-green-100 text-green-800 border border-green-200">
                                ✓ 已簽到
                              </span>
                            ) : (
                              <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                                ✗ 缺席
                              </span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {checkin?.message || '-'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              {checkin ? (
                                <>
                                  <button
                                    onClick={() => handleEditCheckin(member.id)}
                                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-xs font-semibold"
                                  >
                                    編輯
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCheckin(member.id)}
                                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all text-xs font-semibold"
                                  >
                                    刪除
                                  </button>
                                </>
                            ) : (
                              <button
                                onClick={() => handleManualCheckin(member.id, 'present')}
                                disabled={actionLoading[`checkin-${member.id}`]}
                                className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-xs font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {actionLoading[`checkin-${member.id}`] ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                    <span>簽到中...</span>
                                  </>
                                ) : (
                                  '手動簽到'
                                )}
                              </button>
                            )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Members Management Tab */}
        {activeTab === 'members' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>👥</span>
                <span>會員管理</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="搜尋會員..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                />
                <label className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all font-semibold text-sm cursor-pointer">
                  📤 匯入會員
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportMembers}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleExportMembersCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold text-sm"
                >
                  📥 匯出會員
                </button>
                <button
                  onClick={() => {
                    setEditingMember(null)
                    setNewMember({ id: '', name: '', profession: '' })
                    setShowMemberModal(true)
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold text-sm"
                >
                  ➕ 新增會員
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">編號</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">姓名</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">專業別</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members
                    .filter(m => 
                      searchTerm === '' || 
                      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      m.profession.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      m.id.toString().includes(searchTerm)
                    )
                    .map((member) => (
                    <tr key={member.id} className="hover:bg-indigo-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">#{member.id}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{member.name}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{member.profession}</td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditMember(member)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-xs font-semibold mr-2"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all text-xs font-semibold"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Meetings Management Tab */}
        {activeTab === 'meetings' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>📅</span>
                <span>會議管理</span>
              </h2>
              <button
                onClick={() => {
                  setEditingMeeting(null)
                  setShowMeetingModal(true)
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold text-sm"
              >
                ➕ 新增會議
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">日期</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">狀態</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">簽到人數</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {meetings
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((meeting) => {
                      const checkinCount = meetingStats[meeting.date] || 0
                      const attendanceRate = members.length > 0 ? ((checkinCount / members.length) * 100).toFixed(1) : '0'
                      
                      return (
                        <tr key={meeting.id} className="hover:bg-indigo-50/50 transition-colors">
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {new Date(meeting.date).toLocaleDateString('zh-TW', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              weekday: 'long'
                            })}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${
                              meeting.status === 'scheduled' 
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : meeting.status === 'completed'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}>
                              {meeting.status === 'scheduled' ? '已安排' : meeting.status === 'completed' ? '已完成' : '已取消'}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div>{checkinCount} / {members.length}</div>
                            <div className="text-xs text-gray-500">出席率: {attendanceRate}%</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedDate(meeting.date)
                                setActiveTab('attendance')
                                if (typeof window !== 'undefined') {
                                  window.history.pushState({}, '', '/admin/attendance_management?tab=attendance')
                                }
                              }}
                              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all text-xs font-semibold mr-2"
                            >
                              查看
                            </button>
                            <button
                              onClick={() => handleEditMeeting(meeting)}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-xs font-semibold mr-2"
                            >
                              編輯
                            </button>
                            <button
                              onClick={() => handleDeleteMeeting(meeting.id)}
                              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all text-xs font-semibold"
                            >
                              刪除
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Overall Statistics */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span>📊</span>
                <span>統計報表</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium mb-1">總會議數</div>
                  <div className="text-2xl font-bold text-blue-700">{meetings.length}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="text-sm text-green-600 font-medium mb-1">今日已簽到</div>
                  <div className="text-2xl font-bold text-green-700">{stats.present}</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                  <div className="text-sm text-red-600 font-medium mb-1">今日缺席</div>
                  <div className="text-2xl font-bold text-red-700">{stats.absent}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium mb-1">今日出席率</div>
                  <div className="text-2xl font-bold text-purple-700">
                    {stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Member Attendance Statistics */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>👥</span>
                <span>會員出席統計</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">編號</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">姓名</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">專業別</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">總會議數</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">出席次數</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">缺席次數</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">出席率</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members
                      .map((member) => {
                        const stat = memberAttendanceStats[member.id] || { total: 0, present: 0, rate: 0 }
                        const absent = stat.total - stat.present
                        return { member, stat, absent }
                      })
                      .sort((a, b) => b.stat.rate - a.stat.rate)
                      .map(({ member, stat, absent }) => (
                        <tr key={member.id} className="hover:bg-indigo-50/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">#{member.id}</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">{member.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{member.profession}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{stat.total}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">{stat.present}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-600">{absent}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    stat.rate >= 80 ? 'bg-green-500' :
                                    stat.rate >= 50 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(stat.rate, 100)}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold whitespace-nowrap ${
                                stat.rate >= 80 ? 'text-green-600' :
                                stat.rate >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {stat.rate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Meeting History */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">會議歷史記錄</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">日期</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">狀態</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">簽到人數</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">出席率</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {meetings
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 10)
                      .map((meeting) => {
                        const checkinCount = meetingStats[meeting.date] || 0
                        const attendanceRate = members.length > 0 ? ((checkinCount / members.length) * 100).toFixed(1) : '0'
                        return (
                          <tr key={meeting.id} className="hover:bg-indigo-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-900">{meeting.date}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                meeting.status === 'scheduled' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : meeting.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {meeting.status === 'scheduled' ? '已安排' : meeting.status === 'completed' ? '已完成' : '已取消'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{checkinCount} / {members.length}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-700">{attendanceRate}%</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'prizes' && (
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>🎁</span>
                  <span>獎品管理</span>
                </h2>
                <button
                  onClick={() => {
                    setEditingPrize(null)
                    setNewPrize({ name: '', totalQuantity: 1, probability: 1.0, image: null })
                    setShowPrizeModal(true)
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
                >
                  ➕ 新增獎品
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prizes.map((prize) => (
                  <div key={prize.id} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                    <div className="flex items-start gap-3">
                      {prize.image_url && (
                        <img
                          src={prize.image_url}
                          alt={prize.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">{prize.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          剩餘：{prize.remaining_quantity} / {prize.total_quantity}
                        </p>
                        <p className="text-xs text-gray-500">機率：{prize.probability}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPrize({
                            id: prize.id,
                            name: prize.name,
                            image_url: prize.image_url || '',
                            total_quantity: prize.total_quantity,
                            remaining_quantity: prize.remaining_quantity,
                            probability: prize.probability,
                          })
                          setNewPrize({
                            name: prize.name,
                            totalQuantity: prize.total_quantity,
                            probability: prize.probability,
                            image: null,
                          })
                          setShowPrizeModal(true)
                        }}
                        className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all text-sm font-semibold"
                      >
                        編輯
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('確定要刪除此獎品嗎？')) return
                          try {
                            // 先在前端快速移除卡片，提升體感速度（樂觀更新）
                            setPrizes((prev) => prev.filter((p) => p.id !== prize.id))

                            // 如果目前有開啟編輯此獎品的彈窗，一併關閉
                            if (editingPrize && editingPrize.id === prize.id) {
                              setEditingPrize(null)
                              setShowPrizeModal(false)
                            }

                            const response = await fetch(`/api/prizes/${prize.id}`, {
                              method: 'DELETE',
                            })
                            
                            if (response.ok) {
                              const data = await response.json()
                              if (data.success) {
                                // 後端也刪除成功，不需要再額外 reload，前端狀態已更新
                                console.log('獎品已成功刪除', { id: prize.id })
                              } else {
                                alert('刪除失敗：' + (data.error || '未知錯誤'))
                                // 若後端失敗，重新載入一次以恢復正確狀態
                                await loadPrizes()
                              }
                            } else {
                              const errorData = await response.json().catch(() => ({ error: '刪除失敗' }))
                              alert('刪除失敗：' + (errorData.error || '未知錯誤'))
                              await loadPrizes()
                            }
                          } catch (error) {
                            console.error('Error deleting prize:', error)
                            alert('刪除失敗：網路錯誤或伺服器無回應')
                            await loadPrizes()
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all text-sm font-semibold"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {prizes.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">暫無獎品</p>
                  <button
                    onClick={() => {
                      setEditingPrize(null)
                      setNewPrize({ name: '', totalQuantity: 1, probability: 1.0, image: null })
                      setShowPrizeModal(true)
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
                  >
                    ➕ 新增第一個獎品
                  </button>
                </div>
              )}
            </div>

            {/* 抽獎轉盤連結 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">抽獎轉盤</h3>
              <p className="text-gray-600 mb-4">點擊下方按鈕前往抽獎轉盤頁面</p>
              <a
                href="/lottery"
                target="_blank"
                className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold"
              >
                🎰 前往抽獎轉盤
              </a>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Password Settings */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🔐</span>
                <span>密碼設定</span>
              </h2>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold text-sm"
              >
                🔑 修改管理員密碼
              </button>
            </div>

            {/* System Settings */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>⚙️</span>
                <span>系統參數</span>
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="font-semibold text-gray-900">自動備份</label>
                    <p className="text-sm text-gray-600">每日自動備份資料庫</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.autoBackup}
                      onChange={(e) => setSystemSettings({ ...systemSettings, autoBackup: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="font-semibold text-gray-900">郵件通知</label>
                    <p className="text-sm text-gray-600">會議提醒和統計報告</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.emailNotifications}
                      onChange={(e) => setSystemSettings({ ...systemSettings, emailNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">預設會議時間</label>
                    <input
                      type="time"
                      value={systemSettings.defaultMeetingTime}
                      onChange={(e) => setSystemSettings({ ...systemSettings, defaultMeetingTime: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">簽到截止時間</label>
                    <input
                      type="time"
                      value={systemSettings.checkinDeadline}
                      onChange={(e) => setSystemSettings({ ...systemSettings, checkinDeadline: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('systemSettings', JSON.stringify(systemSettings))
                    alert('系統參數已儲存')
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold"
                >
                  💾 儲存設定
                </button>
              </div>
            </div>

            {/* Database Info */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📊</span>
                <span>資料庫資訊</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium mb-1">總會員數</div>
                  <div className="text-2xl font-bold text-blue-700">{members.length}</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600 font-medium mb-1">總會議數</div>
                  <div className="text-2xl font-bold text-green-700">{meetings.length}</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium mb-1">總簽到記錄</div>
                  <div className="text-2xl font-bold text-purple-700">
                    {Object.values(meetingStats).reduce((sum, count) => sum + count, 0)}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600 font-medium mb-1">資料庫位置</div>
                  <div className="text-sm font-semibold text-gray-700">data/checkin.db</div>
                </div>
              </div>
            </div>

            {/* System Actions */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🛠️</span>
                <span>系統操作</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleBackupDatabase}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold flex items-center justify-center gap-2"
                >
                  💾 備份資料庫
                </button>
                <label className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer">
                  📥 還原資料庫
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreDatabase}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleClearCheckins}
                  className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-semibold flex items-center justify-center gap-2"
                >
                  🗑️ 清除所有簽到記錄
                </button>
                <button
                  onClick={() => {
                    if (confirm('確定要重置系統嗎？所有資料將被清除！此操作無法復原！')) {
                      alert('此功能需要後端API支援')
                    }
                  }}
                  className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all text-sm font-semibold flex items-center justify-center gap-2"
                >
                  🔄 重置系統
                </button>
              </div>
            </div>

            {/* About */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>ℹ️</span>
                <span>關於系統</span>
              </h2>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>開發團隊</span>
                  <strong className="text-gray-900">華地產資訊長 蔡濬瑒</strong>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>版本</span>
                  <strong className="text-gray-900">v4.5.1</strong>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>技術棧</span>
                  <strong className="text-gray-900">Next.js 14 + React 18 + SQLite</strong>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>最後更新</span>
                  <strong className="text-gray-900">{new Date().toLocaleDateString('zh-TW')}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-gray-900">修改管理員密碼</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">舊密碼</label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="請輸入舊密碼"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">新密碼</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="請輸入新密碼（至少4個字元）"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">確認新密碼</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="請再次輸入新密碼"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false)
                      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all font-semibold"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleChangePassword}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold"
                  >
                    確認修改
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingMember ? '編輯會員' : '新增會員'}
            </h3>
            <div className="space-y-4">
              {!editingMember && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    編號
                  </label>
                  <input
                    type="number"
                    value={newMember.id}
                    onChange={(e) => setNewMember({ ...newMember, id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名
                </label>
                <input
                  type="text"
                  value={editingMember?.name || newMember.name}
                  onChange={(e) => {
                    if (editingMember) {
                      setEditingMember({ ...editingMember, name: e.target.value })
                    } else {
                      setNewMember({ ...newMember, name: e.target.value })
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  專業別
                </label>
                <input
                  type="text"
                  value={editingMember?.profession || newMember.profession}
                  onChange={(e) => {
                    if (editingMember) {
                      setEditingMember({ ...editingMember, profession: e.target.value })
                    } else {
                      setNewMember({ ...newMember, profession: e.target.value })
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowMemberModal(false)
                    setEditingMember(null)
                    setNewMember({ id: '', name: '', profession: '' })
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveMember}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingMeeting ? '編輯會議' : '新增會議'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日期（週四）
                </label>
                <select
                  value={editingMeeting ? editingMeeting.date : getNextThursday()}
                  onChange={(e) => {
                    const selectedDate = e.target.value
                    if (editingMeeting) {
                      setEditingMeeting({ ...editingMeeting, date: selectedDate })
                    } else {
                      setEditingMeeting({ id: 0, date: selectedDate, status: 'scheduled' })
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  required
                >
                  {thursdayDates.map((date) => (
                    <option key={date.value} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">提示：所有選項都是週四的日期</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  狀態
                </label>
                <select
                  value={editingMeeting ? editingMeeting.status : 'scheduled'}
                  onChange={(e) => {
                    if (editingMeeting) {
                      setEditingMeeting({ ...editingMeeting, status: e.target.value })
                    } else {
                      setEditingMeeting({ id: 0, date: new Date().toISOString().split('T')[0], status: e.target.value })
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="scheduled">已安排</option>
                  <option value="completed">已完成</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowMeetingModal(false)
                    setEditingMeeting(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveMeeting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Checkin Modal */}
      {editingCheckin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900">編輯簽到記錄</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  會員姓名
                </label>
                <input
                  type="text"
                  value={members.find(m => m.id === editingCheckin.memberId)?.name || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  留言
                </label>
                <textarea
                  value={editingCheckin.message}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setEditingCheckin({ ...editingCheckin, message: e.target.value })
                    }
                  }}
                  maxLength={500}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                  rows={4}
                  placeholder="輸入留言...（最多500字）"
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {editingCheckin.message.length} / 500
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setEditingCheckin(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all font-semibold"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCheckinEdit}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold"
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prize Modal */}
      {showPrizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingPrize ? '編輯獎品' : '新增獎品'}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                // 保存當前表單數據（在清空前，用於錯誤恢復）
                const savedPrizeData = {
                  name: newPrize.name,
                  totalQuantity: newPrize.totalQuantity,
                  probability: newPrize.probability,
                  image: newPrize.image,
                }
                const wasEditing = !!editingPrize
                const currentEditingPrize = editingPrize
                
                try {
                  const formData = new FormData()
                  formData.append('name', newPrize.name)
                  formData.append('totalQuantity', newPrize.totalQuantity.toString())
                  formData.append('probability', newPrize.probability.toString())
                  if (newPrize.image) {
                    formData.append('image', newPrize.image)
                  }

                  const url = editingPrize
                    ? `/api/prizes/${editingPrize.id}`
                    : '/api/prizes'
                  const method = editingPrize ? 'PUT' : 'POST'

                  // 樂觀更新：立即關閉彈窗，提升用戶體驗
                  setShowPrizeModal(false)
                  
                  // 清空表單狀態
                  setEditingPrize(null)
                  setNewPrize({ name: '', totalQuantity: 1, probability: 1.0, image: null })

                  const response = await fetch(url, {
                    method,
                    body: formData,
                  })

                  if (response.ok) {
                    const data = await response.json()
                    if (data.success) {
                      // 背景更新列表
                      await loadPrizes()
                      // 顯示美觀的自動消失提示
                      const successMsg = wasEditing ? '獎品已成功更新' : '獎品已成功新增'
                      console.log('✅', successMsg, savedPrizeData.name)
                      setToast({ message: successMsg, type: 'success' })
                      // 3秒後自動消失
                      setTimeout(() => setToast(null), 3000)
                    } else {
                      // 失敗時重新打開彈窗並顯示錯誤
                      setShowPrizeModal(true)
                      setNewPrize({ 
                        name: savedPrizeData.name, 
                        totalQuantity: savedPrizeData.totalQuantity, 
                        probability: savedPrizeData.probability, 
                        image: savedPrizeData.image 
                      })
                      if (wasEditing && currentEditingPrize) {
                        setEditingPrize(currentEditingPrize)
                      }
                      setToast({ message: '操作失敗：' + (data.error || '未知錯誤'), type: 'error' })
                      setTimeout(() => setToast(null), 4000)
                    }
                  } else {
                    const errorData = await response.json().catch(() => ({ error: '操作失敗' }))
                    const errorMessage = errorData.error || '操作失敗'
                    
                    // 失敗時重新打開彈窗並顯示錯誤
                    setShowPrizeModal(true)
                    setNewPrize({ 
                      name: savedPrizeData.name, 
                      totalQuantity: savedPrizeData.totalQuantity, 
                      probability: savedPrizeData.probability, 
                      image: savedPrizeData.image 
                    })
                    if (wasEditing && currentEditingPrize) {
                      setEditingPrize(currentEditingPrize)
                    }
                    
                    // 檢查是否為速率限制錯誤
                    const errorMsg = response.status === 429 || errorMessage.includes('Too many requests') || errorMessage.includes('請求過於頻繁')
                      ? '⚠️ 請求過於頻繁，請稍候 1-2 分鐘後再試上傳圖片'
                      : '操作失敗：' + errorMessage
                    setToast({ message: errorMsg, type: 'error' })
                    setTimeout(() => setToast(null), 4000)
                    console.error('Error saving prize:', errorData)
                  }
                } catch (error) {
                  console.error('Error saving prize:', error)
                  const errorMessage = error instanceof Error ? error.message : '網路錯誤'
                  
                  // 失敗時重新打開彈窗並恢復表單數據
                  setShowPrizeModal(true)
                  setNewPrize({ 
                    name: savedPrizeData.name, 
                    totalQuantity: savedPrizeData.totalQuantity, 
                    probability: savedPrizeData.probability, 
                    image: savedPrizeData.image 
                  })
                  if (wasEditing && currentEditingPrize) {
                    setEditingPrize(currentEditingPrize)
                  }
                  
                  const errorMsg = errorMessage.includes('Too many requests') || errorMessage.includes('rate limit')
                    ? '⚠️ 請求過於頻繁，請稍候 1-2 分鐘後再試上傳圖片'
                    : '操作失敗：' + errorMessage
                  setToast({ message: errorMsg, type: 'error' })
                  setTimeout(() => setToast(null), 4000)
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  獎品名稱 *
                </label>
                <input
                  type="text"
                  value={newPrize.name}
                  onChange={(e) => setNewPrize({ ...newPrize, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  總數量 *
                </label>
                <input
                  type="number"
                  min="1"
                  value={newPrize.totalQuantity}
                  onChange={(e) => setNewPrize({ ...newPrize, totalQuantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  抽中機率（相對值，數字越大越容易中）
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={newPrize.probability}
                  onChange={(e) => setNewPrize({ ...newPrize, probability: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  獎品圖片
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setNewPrize({ ...newPrize, image: file })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                {editingPrize && editingPrize.image_url && !newPrize.image && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">當前圖片：</p>
                    <img
                      src={editingPrize.image_url}
                      alt={editingPrize.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPrizeModal(false)
                    setEditingPrize(null)
                    setNewPrize({ name: '', totalQuantity: 1, probability: 1.0, image: null })
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
