'use client'

import Image from 'next/image'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { filterVercelText, safeApiCall } from '@/lib/frontend-utils'
import { getPrizeImageUrl } from '@/lib/prize-placeholder'
import { perfStart, perfEnd, processInChunks } from '@/lib/perf'
import type { Member, CheckinRecord, Meeting } from '@/types'

export default function AttendanceManagement() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  
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
  const selectedDateRef = useRef(selectedDate)
  selectedDateRef.current = selectedDate
  const checkinsByDateRef = useRef<Record<string, CheckinRecord[]>>({})
  const [datesWithCheckins, setDatesWithCheckins] = useState<string[]>([])
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'late' | 'early_leave' | 'proxy'>('all')
  const [meetingStats, setMeetingStats] = useState<Record<string, number>>({})
  /** 會議管理排序：'date' 依日期、'attendance' 有簽到的優先 */
  const [meetingSortMode, setMeetingSortMode] = useState<'date' | 'attendance'>('attendance')
  const [absentDrafts, setAbsentDrafts] = useState<Record<number, { checkin_time: string; status: string; message: string }>>({})
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'time' | 'status'>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [memberAttendanceStats, setMemberAttendanceStats] = useState<Record<number, {
    total: number
    present: number
    late: number
    proxy: number
    absent: number
    rate: number
  }>>({})
  /** 統計報表用的總會議數（依簽到記錄統整，由 API 回傳） */
  const [statsTotalMeetings, setStatsTotalMeetings] = useState(0)
  /** 統計區間：空字串表示「全部」；有值則 API 帶 start/end */
  const [statsDateStart, setStatsDateStart] = useState('')
  const [statsDateEnd, setStatsDateEnd] = useState('')
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsRangeLabel, setStatsRangeLabel] = useState<string>('全部')
  const [statsSortBy, setStatsSortBy] = useState<'id' | 'name' | 'profession' | 'total' | 'present' | 'late' | 'proxy' | 'absent' | 'rate'>('id')
  const [statsSortOrder, setStatsSortOrder] = useState<'asc' | 'desc'>('asc')
  /** 統計報表子 Tab：會員出席統計 | 關注名單 */
  const [statsReportsSubTab, setStatsReportsSubTab] = useState<'stats' | 'care'>('stats')
  const [careList, setCareList] = useState<Array<{
    memberId: number
    name: string
    profession: string
    total: number
    present: number
    absent: number
    rate: number
    consecutiveAbsences: number
    lastAttendanceDate: string | null
    daysSinceLastAttendance: number | null
    trend: 'up' | 'flat' | 'down' | null
    riskLevel: 'high' | 'medium' | 'low' | null
  }>>([])
  const [careListLoading, setCareListLoading] = useState(false)
  const [careListSummary, setCareListSummary] = useState({ high: 0, medium: 0, low: 0 })
  const [careListFilter, setCareListFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [systemSettings, setSystemSettings] = useState({ autoBackup: false, emailNotifications: false, defaultMeetingTime: '06:30', lateThreshold: '07:00', checkinDeadline: '08:45', lotteryCutoff: '07:00' })
  // 載入系統設定：時間參數與 API 同步（GET /api/settings/checkin-times），其餘從 localStorage
  useEffect(() => {
    const load = async () => {
      try {
        const saved = localStorage.getItem('systemSettings')
        let base = { autoBackup: false, emailNotifications: false, defaultMeetingTime: '06:30', lateThreshold: '07:00', checkinDeadline: '08:45', lotteryCutoff: '07:00' }
        if (saved) {
          const parsed = JSON.parse(saved)
          base = {
            autoBackup: !!parsed.autoBackup,
            emailNotifications: !!parsed.emailNotifications,
            defaultMeetingTime: parsed.defaultMeetingTime || '06:30',
            lateThreshold: parsed.lateThreshold || '07:00',
            checkinDeadline: parsed.checkinDeadline || '08:45',
            lotteryCutoff: parsed.lotteryCutoff || '07:00',
          }
        }
        const res = await fetch('/api/settings/checkin-times', { cache: 'no-store' })
        const apiConfig = await res.json().catch(() => null)
        if (apiConfig && apiConfig.meetingRoomOpen) {
          setSystemSettings({
            ...base,
            defaultMeetingTime: apiConfig.meetingRoomOpen || base.defaultMeetingTime,
            lateThreshold: apiConfig.lateThreshold || base.lateThreshold,
            checkinDeadline: apiConfig.signinDeadline || base.checkinDeadline,
            lotteryCutoff: apiConfig.lotteryCutoff || base.lotteryCutoff,
          })
        } else {
          setSystemSettings(base)
        }
      } catch (e) {
        console.warn('Failed to load systemSettings:', e)
      }
    }
    load()
  }, [])
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [syncToSheetsLoading, setSyncToSheetsLoading] = useState(false)
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
    addStock: 0,
    adjustTotalQuantity: 0,
  })
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [imagePreviewScale, setImagePreviewScale] = useState(1)
  const [imagePreviewNatural, setImagePreviewNatural] = useState<{ w: number; h: number } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [lotteryHistory, setLotteryHistory] = useState<Array<{
    id: number
    meeting_date: string
    created_at: string
    member_name: string
    prize_id: number
    prize_name: string
    prize_image_url: string
  }>>([])

  const fetchWithTimeout = useCallback(async (
    input: RequestInfo,
    init?: RequestInit,
    timeoutMs = 10000
  ) => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      // 添加快取控制和時間戳以繞過 Vercel CDN 快取
      const url = typeof input === 'string' 
        ? `${input}${input.includes('?') ? '&' : '?'}_t=${Date.now()}`
        : input
      const headers = {
        ...((init?.headers as Record<string, string>) || {}),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
      return await fetch(url, { ...init, headers, signal: controller.signal, cache: 'no-store' })
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
      // 單一情境 API：一次取得 members、meetings、checkinsByDate、meetingStats
      // 非靜默載入（使用者操作、匯入後等）帶 fresh=1 跳過快取，確保看到最新會員與簽到
      const contextUrl = silent ? '/api/attendance/context' : '/api/attendance/context?fresh=1'
      const contextRes = await fetchWithTimeout(contextUrl, undefined, 12000)
      if (!contextRes.ok) {
        console.warn('Context API failed, fallback to empty data')
        setMembers([])
        setMeetings([])
        setCheckins([])
        setSelectedMeeting(null)
        setMeetingStats({})
        setDatesWithCheckins([])
        return
      }
      const contextJson = await contextRes.json()
      const data = contextJson.data || contextJson
      const membersList: Member[] = data.members || []
      const meetingsList: Meeting[] = data.meetings || []
      const checkinsByDate: Record<string, CheckinRecord[]> = data.checkinsByDate || {}
      const meetingStatsMap: Record<string, number> = data.meetingStats || {}
      checkinsByDateRef.current = checkinsByDate
      setDatesWithCheckins(Object.keys(checkinsByDate))

      setMembers(membersList)
      setMeetings(meetingsList)
      setCheckins((checkinsByDate[targetDate] || []) as CheckinRecord[])
      setSelectedMeeting(meetingsList.find((m: Meeting) => m.date === targetDate) || null)
      setMeetingStats(meetingStatsMap)
      // 統計報表由「統計報表」tab 切換時打 member-attendance?start=&end= 載入，不在此處計算
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

  // 當會議列表變更時，若當前選中日期不在會議也不在有簽到的日期中，則自動切換到最新日期
  useEffect(() => {
    const inMeetings = meetings.some((m) => m.date === selectedDate)
    const inOrphan = datesWithCheckins.includes(selectedDate)
    if (inMeetings || inOrphan) return
    const meetingDates = meetings.map((m) => m.date).filter(Boolean)
    const fallback = [...meetingDates, ...datesWithCheckins].sort((a, b) => b.localeCompare(a))[0]
    if (fallback) setSelectedDate(fallback)
  }, [meetings, datesWithCheckins, selectedDate])

  // 切換日期時從已載入的 checkinsByDate 更新當日簽到與會議
  useEffect(() => {
    const byDate = checkinsByDateRef.current
    if (Object.keys(byDate).length === 0) return
    setCheckins((byDate[selectedDate] || []) as CheckinRecord[])
    setSelectedMeeting(prev => {
      if (meetings.length === 0) return prev
      return meetings.find((m: Meeting) => m.date === selectedDate) || null
    })
  }, [selectedDate, meetings])

  const loadPrizes = useCallback(async () => {
    try {
      const response = await fetch(`/api/prizes?_t=${Date.now()}`, { cache: 'no-store' })
      const data = await response.json()
      setPrizes(data.prizes || [])
    } catch (error) {
      console.error('Error loading prizes:', error)
    }
  }, [])

  const loadLotteryHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/lottery/history?limit=50', { cache: 'no-store' })
      const data = await response.json()
      setLotteryHistory(data.winners || [])
    } catch (error) {
      console.error('Error loading lottery history:', error)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'prizes') {
      loadPrizes()
      loadLotteryHistory()
    }
  }, [activeTab, loadPrizes, loadLotteryHistory])

  // 全局錯誤處理器
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('全局錯誤:', event.error)
      if (event.error && event.error.message) {
        const errorMsg = filterVercelText(event.error.message)
        setToast({ message: `發生錯誤：${errorMsg}`, type: 'error' })
        setTimeout(() => setToast(null), 5000)
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('未處理的 Promise 拒絕:', event.reason)
      const errorMsg = event.reason instanceof Error 
        ? filterVercelText(event.reason.message)
        : filterVercelText(String(event.reason || '未知錯誤'))
      setToast({ message: `操作失敗：${errorMsg}`, type: 'error' })
      setTimeout(() => setToast(null), 5000)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

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
        
        // 背景靜默刷新，使用當前選擇的日期（避免用舊閉包導致日期跳回）
        loadData(true, selectedDateRef.current).catch(err => {
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
  }, [activeTab, loadData])

  useEffect(() => {
    setAbsentDrafts({})
  }, [selectedDate])

  // 統計區間快捷：回傳 { start, end, label }，null 表示全部
  const getStatsPresetRange = useCallback((preset: 'week' | 'month' | 'quarter' | 'year' | 'all') => {
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()
    const d = today.getDate()
    const pad = (n: number) => String(n).padStart(2, '0')
    const toStr = (date: Date) => date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
    if (preset === 'all') return { start: '', end: '', label: '全部' }
    if (preset === 'week') {
      const day = today.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const mon = new Date(today)
      mon.setDate(d + diff)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return { start: toStr(mon), end: toStr(sun), label: '本週' }
    }
    if (preset === 'month') {
      const first = new Date(y, m, 1)
      const last = new Date(y, m + 1, 0)
      return { start: toStr(first), end: toStr(last), label: '本月' }
    }
    if (preset === 'quarter') {
      const first = new Date(today)
      first.setMonth(m - 3)
      return { start: toStr(first), end: toStr(today), label: '近三個月' }
    }
    if (preset === 'year') {
      return { start: `${y}-01-01`, end: `${y}-12-31`, label: '本年度' }
    }
    return { start: '', end: '', label: '全部' }
  }, [])

  const loadMemberStats = useCallback(async (start?: string, end?: string) => {
    setStatsLoading(true)
    try {
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      const url = '/api/statistics/member-attendance' + (params.toString() ? '?' + params.toString() : '')
      const statsResponse = await fetch(url)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        if (statsData.success) {
          const totalFromApi = statsData.data?.totalMeetings ?? statsData.totalMeetings ?? 0
          setStatsTotalMeetings(typeof totalFromApi === 'number' ? totalFromApi : 0)
          const memberStats = statsData.data?.memberStats || statsData.data?.data || statsData.data || statsData.memberStats || {}
          const statsMap: Record<number, { total: number; present: number; late: number; proxy: number; absent: number; rate: number }> = {}
          if (Array.isArray(memberStats)) {
            for (const item of memberStats) {
              statsMap[item.memberId] = {
                total: item.total || 0,
                present: item.present || 0,
                late: item.late || 0,
                proxy: item.proxy || 0,
                absent: item.absent || 0,
                rate: item.rate || 0
              }
            }
          } else {
            for (const [memberId, stats] of Object.entries(memberStats)) {
              const stat = stats as any
              statsMap[parseInt(memberId)] = {
                total: stat.total || 0,
                present: stat.present || 0,
                late: stat.late || 0,
                proxy: stat.proxy || 0,
                absent: stat.absent || 0,
                rate: stat.rate || 0
              }
            }
          }
          setMemberAttendanceStats(statsMap)
        }
      }
    } catch (error) {
      console.error('載入會員出席統計失敗:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadCareList = useCallback(async (start?: string, end?: string) => {
    setCareListLoading(true)
    try {
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      const url = '/api/statistics/care-list' + (params.toString() ? '?' + params.toString() : '')
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setCareList(data.data.careList || [])
          setCareListSummary(data.data.summary || { high: 0, medium: 0, low: 0 })
        }
      }
    } catch (error) {
      console.error('載入關注名單失敗:', error)
    } finally {
      setCareListLoading(false)
    }
  }, [])

  // 當切換到統計報表標籤時，依目前區間載入統計與關注名單
  useEffect(() => {
    if (activeTab === 'reports') {
      loadMemberStats(statsDateStart || undefined, statsDateEnd || undefined)
      loadCareList(statsDateStart || undefined, statsDateEnd || undefined)
    }
  }, [activeTab, statsDateStart, statsDateEnd, loadMemberStats, loadCareList])

  // 圖片預覽開啟時鎖住背景捲動
  useEffect(() => {
    if (showImagePreview) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showImagePreview])

  // 取得「今天若為週四則今天，否則下一個週四」的日期（例會固定週四，建立例會時週四當天應可建立今日）
  const getNextThursday = (): string => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 4 = Thursday
    const daysToAdd = dayOfWeek === 4 ? 0 : ((4 - dayOfWeek + 7) % 7 || 7)
    const target = new Date(today)
    target.setDate(today.getDate() + daysToAdd)
    return target.toISOString().split('T')[0]
  }

  // 检查日期是否为周四
  const isThursday = (dateString: string): boolean => {
    const date = new Date(dateString)
    return date.getDay() === 4 // 4 = Thursday
  }

  // 生成所有周四的日期列表（過去 24 個月到未來 24 個月，確保涵蓋資料庫中的會議）
  const getThursdayDates = (): Array<{ value: string; label: string }> => {
    const dates: Array<{ value: string; label: string }> = []
    const today = new Date()
    
    const startDate = new Date(today)
    startDate.setMonth(today.getMonth() - 24)
    
    const firstThursday = new Date(startDate)
    const dayOfWeek = firstThursday.getDay()
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7
    firstThursday.setDate(startDate.getDate() + daysUntilThursday)
    
    const currentDate = new Date(firstThursday)
    const endDate = new Date(today)
    endDate.setMonth(today.getMonth() + 24)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const label = currentDate.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      })
      dates.push({ value: dateStr, label })
      currentDate.setDate(currentDate.getDate() + 7)
    }
    
    return dates
  }

  const thursdayDates = useMemo(() => getThursdayDates(), [])

  // 有簽到但尚未建立會議的日期（孤兒日期）
  const orphanDates = useMemo(() => {
    const meetingSet = new Set(meetings.filter((m) => m.date).map((m) => m.date))
    return datesWithCheckins.filter((d) => d && !meetingSet.has(d)).sort((a, b) => b.localeCompare(a))
  }, [meetings, datesWithCheckins])

  // 會議日期 + 有簽到但無會議的日期，全部可選；與會議管理同步
  const selectableDates = useMemo(() => {
    const meetingSet = new Set(meetings.filter((m) => m.date).map((m) => m.date))
    const allDates = new Set([...Array.from(meetingSet), ...orphanDates])
    return Array.from(allDates)
      .map((dateStr) => {
        const d = new Date(dateStr + 'T12:00:00')
        const isOrphan = orphanDates.includes(dateStr)
        return {
          value: dateStr,
          label: d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) + (isOrphan ? '（有簽到，待新增會議）' : ''),
        }
      })
      .sort((a, b) => b.value.localeCompare(a.value))
  }, [meetings, orphanDates])

  // 統計報表：排序後的會員統計列（useMemo 避免每次 render 重算 map+sort）
  type StatsRow = { member: Member; stat: { total: number; present: number; late: number; proxy: number; absent: number; rate: number } }
  const sortedStatsRows = useMemo(() => {
    perfStart('sortedStatsRows')
    const rows: StatsRow[] = members.map((member) => ({
      member,
      stat: memberAttendanceStats[member.id] || { total: 0, present: 0, late: 0, proxy: 0, absent: 0, rate: 0 }
    }))
    const cmp = (a: StatsRow, b: StatsRow) => {
      let diff = 0
      if (statsSortBy === 'id') diff = a.member.id - b.member.id
      else if (statsSortBy === 'name') diff = (a.member.name || '').localeCompare(b.member.name || '')
      else if (statsSortBy === 'profession') diff = (a.member.profession || '').localeCompare(b.member.profession || '')
      else if (statsSortBy === 'total') diff = a.stat.total - b.stat.total
      else if (statsSortBy === 'present') diff = a.stat.present - b.stat.present
      else if (statsSortBy === 'late') diff = a.stat.late - b.stat.late
      else if (statsSortBy === 'proxy') diff = a.stat.proxy - b.stat.proxy
      else if (statsSortBy === 'absent') diff = a.stat.absent - b.stat.absent
      else if (statsSortBy === 'rate') diff = a.stat.rate - b.stat.rate
      return statsSortOrder === 'asc' ? diff : -diff
    }
    rows.sort(cmp)
    perfEnd('sortedStatsRows')
    return rows
  }, [members, memberAttendanceStats, statsSortBy, statsSortOrder])

  /** 會議歷史：可依月份篩選，預設顯示最近 20 筆 */
  const [meetingHistoryMonth, setMeetingHistoryMonth] = useState<string>('')
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    for (const m of meetings) {
      const d = m.date
      if (d && d.length >= 7) set.add(d.slice(0, 7)) // YYYY-MM
    }
    return Array.from(set).sort().reverse()
  }, [meetings])
  const filteredMeetingsForHistory = useMemo(() => {
    let list = [...meetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (meetingHistoryMonth) {
      list = list.filter(m => m.date.startsWith(meetingHistoryMonth))
    }
    return list.slice(0, 100) // 單月或全部最多顯示 100 筆
  }, [meetings, meetingHistoryMonth])

  /** 會議管理用的排序後會議列表：可依日期或「有簽到的優先」 */
  const sortedMeetingsForManagement = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const cntA = meetingStats[a.date] || 0
      const cntB = meetingStats[b.date] || 0
      if (meetingSortMode === 'attendance') {
        const hasA = cntA > 0 ? 1 : 0
        const hasB = cntB > 0 ? 1 : 0
        if (hasB !== hasA) return hasB - hasA
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [meetings, meetingStats, meetingSortMode])

  const handleCreateMeeting = async () => {
    const thursdayDate = getNextThursday()
    setSelectedDate(thursdayDate)
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: thursdayDate, status: 'scheduled' }),
      })
      if (response.ok) loadData(false, thursdayDate)
    } catch (error) {
      console.error('Error creating meeting:', error)
    }
  }

  /** 為「有簽到但無會議」的日期新增會議（可處理非週四的孤兒日期） */
  const handleCreateMeetingForDate = async (dateStr: string) => {
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, status: 'scheduled' }),
      })
      if (response.ok) {
        loadData(false, dateStr)
        setToast({ message: `已為 ${dateStr} 新增會議`, type: 'success' })
        setTimeout(() => setToast(null), 3000)
      } else {
        const data = await response.json().catch(() => ({}))
        setToast({ message: data.error || '新增失敗', type: 'error' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (error) {
      console.error('Error creating meeting for date:', error)
      setToast({ message: '新增失敗', type: 'error' })
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleManualCheckin = async (memberId: number, status: string) => {
    const key = `checkin-${memberId}`
    if (actionLoading[key]) {
      console.log('簽到操作進行中，跳過重複請求')
      return
    }

    // 如果目前選擇的日期沒有會議，直接提示，不送出簽到請求
    if (!selectedMeeting) {
      setToast({ message: '今天沒有會議，請先在上方建立會議後再簽到', type: 'error' })
      setTimeout(() => setToast(null), 4000)
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
        
        // 失敗時恢復原狀態（背景靜默刷新，避免整頁「載入中」閃動）
        await loadData(true, selectedDate)
        setToast({ message: `簽到失敗：${errorMessage}`, type: 'error' })
        setTimeout(() => setToast(null), 4000)
        return
      }

      const data = await response.json()
      console.log('簽到響應:', data)
      
      if (data.success) {
        // 前端已經樂觀更新為已簽到，這裡不再強制重抓，避免畫面一閃又還原
        // 延遲背景刷新，確保簽到狀態保持
        setTimeout(() => {
          loadData(true, selectedDate).catch(err => console.error('背景刷新失敗:', err))
        }, 2000)
        
        setToast({ message: '簽到成功！', type: 'success' })
        setTimeout(() => setToast(null), 3000)
      } else {
        // 失敗時恢復原狀態（靜默刷新）
        await loadData(true, selectedDate)
        setToast({ message: '簽到失敗：' + (data.error || '未知錯誤'), type: 'error' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (error) {
      console.error('Error checking in:', error)
      const errorMessage = error instanceof Error ? error.message : '簽到失敗'
      
      // 失敗時恢復原狀態（靜默刷新）
      await loadData(true, selectedDate)
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
        // 檢查是否真的刪除了記錄
        if (data.deleted === false || data.count === 0) {
          // 記錄不存在或已被刪除，但前端已經樂觀更新移除了，所以保持移除狀態
          setToast({ message: data.message || '簽到記錄不存在或已被刪除', type: 'info' })
          setTimeout(() => setToast(null), 3000)
        } else {
          // 成功刪除
          // 延遲背景刷新，確保刪除狀態保持
          setTimeout(() => {
            loadData(true, selectedDate).catch(err => console.error('背景刷新失敗:', err))
          }, 2000)
          
          setToast({ message: '簽到記錄已成功刪除', type: 'success' })
          setTimeout(() => setToast(null), 3000)
        }
      } else {
        // 失敗時恢復（靜默刷新）
        if (checkinToDelete) {
          setCheckins(prev => [...prev, checkinToDelete])
        }
        await loadData(true, selectedDate)
        setToast({ message: '刪除失敗：' + (data.error || '未知錯誤'), type: 'error' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (error) {
      console.error('Error deleting checkin:', error)
      // 失敗時恢復（靜默刷新）
      if (checkinToDelete) {
        setCheckins(prev => [...prev, checkinToDelete])
      }
      await loadData(true, selectedDate)
      const errorMessage = error instanceof Error ? error.message : '刪除失敗'
      setToast({ message: `刪除失敗：${errorMessage}`, type: 'error' })
      setTimeout(() => setToast(null), 4000)
    }
  }

  const getCheckinStatus = useCallback((memberId: number) => {
    return checkins.find(c => c.member_id === memberId) || null
  }, [checkins])

  // O(1) 查詢：避免在 filter/sort 中重複 O(n) find，降低主執行緒負擔
  const checkinMap = useMemo(() => {
    perfStart('checkinMap')
    const map = new Map<number, CheckinRecord>()
    for (const c of checkins) map.set(c.member_id, c)
    perfEnd('checkinMap')
    return map
  }, [checkins])

  // 使用 useMemo 優化篩選（搭配 checkinMap 避免 O(n²)）
  const filteredMembers = useMemo(() => {
    perfStart('filteredMembers')
    const term = searchTerm.toLowerCase()
    const list = members.filter(member => {
      const matchesSearch = searchTerm === '' ||
        member.name.toLowerCase().includes(term) ||
        (member.profession || '').toLowerCase().includes(term) ||
        member.id.toString().includes(searchTerm)
      const checkin = checkinMap.get(member.id)
      const msg = (checkin?.message || '').toLowerCase()
      const isProxy = checkin?.status === 'proxy' || msg.includes('代理') || msg.includes('代') || msg.includes('替') || msg.includes('proxy')
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'present' && checkin && ['present', 'early'].includes(checkin.status || '')) ||
        (filterStatus === 'late' && checkin?.status === 'late') ||
        (filterStatus === 'early_leave' && checkin?.status === 'early_leave') ||
        (filterStatus === 'proxy' && checkin && isProxy) ||
        (filterStatus === 'absent' && !checkin)
      return matchesSearch && matchesStatus
    })
    perfEnd('filteredMembers')
    return list
  }, [members, searchTerm, filterStatus, checkinMap])

  // 排序會員 - 使用 useMemo，搭配 checkinMap 避免 O(n) find  per compare
  const sortedFilteredMembers = useMemo(() => {
    perfStart('sortedFilteredMembers')
    const sorted = [...filteredMembers].sort((a, b) => {
      const aCheckin = checkinMap.get(a.id)
      const bCheckin = checkinMap.get(b.id)
      
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
    perfEnd('sortedFilteredMembers')
    return sorted
  }, [filteredMembers, sortBy, sortOrder, checkinMap])

  const updateCheckinInState = useCallback((memberId: number, updates: Partial<CheckinRecord>) => {
    setCheckins(prev => prev.map(c => {
      if (c.member_id !== memberId || c.checkin_time?.split('T')[0] !== selectedDate) return c
      return { ...c, ...updates }
    }))
  }, [selectedDate])

  const getAbsentDraft = useCallback((memberId: number) => {
    return absentDrafts[memberId] || {
      checkin_time: `${selectedDate}T08:45:00`,
      status: 'absent',
      message: ''
    }
  }, [absentDrafts, selectedDate])

  const setAbsentDraft = useCallback((memberId: number, updates: Partial<{ checkin_time: string; status: string; message: string }>) => {
    const defaults = {
      checkin_time: `${selectedDate}T08:45:00`,
      status: 'absent',
      message: ''
    }
    setAbsentDrafts(prev => ({
      ...prev,
      [memberId]: { ...defaults, ...prev[memberId], ...updates }
    }))
  }, [selectedDate])

  const handleSaveCheckinEdit = async (memberId: number) => {
    const checkin = getCheckinStatus(memberId)
    const draft = getAbsentDraft(memberId)
    const isCreate = !checkin

    const checkinTimeISO = (checkin?.checkin_time || draft.checkin_time)
      ? new Date(checkin?.checkin_time || draft.checkin_time).toISOString()
      : new Date().toISOString()
    const message = (checkin?.message ?? draft.message) || null
    const status = (checkin?.status || draft.status) || 'present'

    try {
      const key = `save-${memberId}`
      setActionLoading(prev => ({ ...prev, [key]: true }))

      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          date: selectedDate,
          message: (message || '').trim() || null,
          status,
          checkin_time: checkinTimeISO,
        }),
      })

      if (!response.ok) {
        await loadData(true, selectedDate)
        const errorData = await response.json().catch(() => ({ error: '更新失敗' }))
        setToast({ message: `更新失敗：${errorData.error || '更新失敗'}`, type: 'error' })
        setTimeout(() => setToast(null), 4000)
        return
      }

      const data = await response.json()
      if (data.success) {
        if (isCreate) {
          setAbsentDrafts(prev => {
            const next = { ...prev }
            delete next[memberId]
            return next
          })
        }
        setToast({ message: isCreate ? '簽到記錄已新增' : '簽到記錄已成功更新', type: 'success' })
        setTimeout(() => setToast(null), 3000)
        setTimeout(() => loadData(true, selectedDate).catch(() => {}), 500)
      } else {
        await loadData(true, selectedDate)
        setToast({ message: '更新失敗：' + (data.error || '未知錯誤'), type: 'error' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (error) {
      await loadData(true, selectedDate)
      const errorMessage = error instanceof Error ? error.message : '更新失敗'
      setToast({ message: `更新失敗：${errorMessage}`, type: 'error' })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setActionLoading(prev => ({ ...prev, [`save-${memberId}`]: false }))
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
      console.log('刪除會員請求:', memberId)
      const response = await fetch(`/api/members/${memberId}?_t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        cache: 'no-store',
      })

      console.log('刪除會員響應:', { status: response.status, ok: response.ok })

      if (response.ok) {
        const data = await response.json()
        console.log('刪除會員響應數據:', data)
        
        if (data.success && (data.deleted !== false)) {
          // 前端已經將會員從列表中移除，這裡不再強制重抓，避免列表又被還原
          // 延遲背景刷新，確保刪除狀態保持
          setTimeout(() => {
            loadData(true).catch(err => console.error('背景刷新失敗:', err))
          }, 2000)
          
          setToast({ message: '會員已成功刪除', type: 'success' })
          setTimeout(() => setToast(null), 3000)
        } else {
          // 失敗時恢復列表
          console.warn('刪除會員失敗：', data)
          if (memberToDelete) {
            setMembers(prev => [...prev, memberToDelete].sort((a, b) => a.id - b.id))
          }
          const errorMsg = filterVercelText(data.error || '刪除失敗：未知錯誤')
          setToast({ message: errorMsg, type: 'error' })
          setTimeout(() => setToast(null), 4000)
        }
      } else {
        // 失敗時恢復列表
        console.error('刪除會員 HTTP 錯誤:', response.status)
        if (memberToDelete) {
          setMembers(prev => [...prev, memberToDelete].sort((a, b) => a.id - b.id))
        }
        const errorData = await response.json().catch(() => ({ error: '刪除失敗' }))
        const errorMsg = filterVercelText(errorData.error || `刪除失敗：HTTP ${response.status}`)
        
        // 如果是 404，顯示更清楚的訊息
        if (response.status === 404) {
          setToast({ message: `會員不存在（編號：${memberId}），可能已被刪除`, type: 'error' })
        } else {
          setToast({ message: errorMsg, type: 'error' })
        }
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

        const response = await fetch(`/api/members/${savedEditingMember.id}?_t=${Date.now()}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
          cache: 'no-store',
          body: JSON.stringify({
            name: savedEditingMember.name.trim(),
            profession: savedEditingMember.profession?.trim() || '',
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // 前端已經樂觀更新，不再強制重抓，避免畫面閃爍
            setToast({ message: '會員已成功更新', type: 'success' })
            setTimeout(() => setToast(null), 3000)
          } else {
            // 失敗時恢復原數據（靜默刷新）
            setMembers(prev => prev.map(m => m.id === savedEditingMember.id ? savedEditingMember : m))
            await loadData(true)
            setToast({ message: '更新失敗：' + (data.error || '未知錯誤'), type: 'error' })
            setTimeout(() => setToast(null), 4000)
          }
        } else {
          // 失敗時恢復原數據（靜默刷新）
          setMembers(prev => prev.map(m => m.id === savedEditingMember.id ? savedEditingMember : m))
          await loadData(true)
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
        
        let response;
        try {
          response = await fetch(`/api/members/create?_t=${Date.now()}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
            cache: 'no-store',
            body: JSON.stringify(savedMemberData),
          })
        } catch (fetchError) {
          console.error('新增會員請求失敗:', fetchError)
          // 失敗時從列表中移除
          setMembers(prev => prev.filter(m => m.id !== memberId))
          await loadData(true)
          setToast({ message: '新增失敗：網路錯誤，請檢查連線狀態', type: 'error' })
          setTimeout(() => setToast(null), 4000)
          return
        }

        console.log('新增會員 API 響應:', { ok: response.ok, status: response.status })

        if (response.ok) {
          let data;
          try {
            data = await response.json()
          } catch (jsonError) {
            console.error('解析 API 響應失敗:', jsonError)
            // 失敗時從列表中移除
            setMembers(prev => prev.filter(m => m.id !== memberId))
            await loadData(true)
            setToast({ message: '新增失敗：伺服器響應格式錯誤', type: 'error' })
            setTimeout(() => setToast(null), 4000)
            return
          }
          
          console.log('新增會員 API 數據:', data)
          
          if (data.success && data.data) {
            // 前端已經樂觀更新，但為了確保資料一致性，進行背景刷新
            // 使用 setTimeout 延遲刷新，避免立即覆蓋樂觀更新
            setTimeout(() => {
              loadData(true).catch(err => console.error('背景刷新失敗:', err))
            }, 1000)
            
            setToast({ message: '會員已成功新增', type: 'success' })
            setTimeout(() => setToast(null), 3000)
            console.log('會員新增成功:', data.data)
          } else {
            // 失敗時從列表中移除（靜默刷新）
            setMembers(prev => prev.filter(m => m.id !== memberId))
            await loadData(true)
            const errorMessage = filterVercelText(data.error || '新增失敗：未知錯誤')
            console.error('新增會員失敗:', errorMessage, data)
            setToast({ message: '新增失敗：' + errorMessage, type: 'error' })
            setTimeout(() => setToast(null), 4000)
          }
        } else {
          // 失敗時從列表中移除（靜默刷新）
          setMembers(prev => prev.filter(m => m.id !== memberId))
          await loadData(true)
          
          let errorData;
          try {
            errorData = await response.json()
          } catch (jsonError) {
            console.error('解析錯誤響應失敗:', jsonError)
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
          }
          
          const errorMessage = filterVercelText(errorData.error || `新增失敗：HTTP ${response.status}`)
          console.error('新增會員 API 錯誤:', { status: response.status, error: errorMessage, errorData })
          setToast({ message: errorMessage, type: 'error' })
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
    const late = checkins.filter(c => c.status === 'late').length
    const earlyLeave = checkins.filter(c => c.status === 'early_leave').length
    const attended = checkins.filter(c =>
      ['present', 'early', 'late', 'early_leave', 'proxy'].includes(c.status || '')
    ).length
    const proxy = checkins.filter(c => {
      if (!['present', 'early', 'late', 'early_leave', 'proxy'].includes(c.status || '')) return false
      if (c.status === 'proxy') return true
      const msg = (c.message || '').toLowerCase()
      return msg.includes('代理') || msg.includes('代') || msg.includes('替') || msg.includes('proxy')
    }).length
    const absent = total - attended
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0
    return { total, present: attended, late, earlyLeave, proxy, absent, rate }
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
      
      if (failed.length > 0) {
        // 部分失敗時，靜默刷新恢復失敗的項目
        await loadData(true, selectedDate)
        console.error('批量簽到部分失敗:', failed)
        const errorMessages = failed.map((f: any) => f.reason?.message || '未知錯誤').join('、')
        setToast({ 
          message: `批量簽到完成，但有 ${failed.length} 位會員簽到失敗：${errorMessages}`, 
          type: 'error' 
        })
        setTimeout(() => setToast(null), 5000)
      } else {
        // 全部成功，前端已經樂觀更新，不再強制重抓
        setToast({ message: `批量簽到成功！已為 ${selectedMemberIds.length} 位會員簽到`, type: 'success' })
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error) {
      console.error('Error batch checking in:', error)
      // 失敗時恢復（靜默刷新）
      await loadData(true, selectedDate)
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
      
      if (failed.length > 0) {
        // 部分失敗時，恢復失敗的項目並靜默刷新
        setCheckins(prev => [...prev, ...checkinsToDelete])
        await loadData(true, selectedDate)
        console.error('批量刪除部分失敗:', failed)
        const errorMessages = failed.map((f: any) => f.reason?.message || '未知錯誤').join('、')
        setToast({ 
          message: `批量刪除完成，但有 ${failed.length} 筆記錄刪除失敗：${errorMessages}`, 
          type: 'error' 
        })
        setTimeout(() => setToast(null), 5000)
      } else {
        // 全部成功，前端已經樂觀更新，不再強制重抓
        setToast({ message: `批量刪除成功！已刪除 ${selectedMemberIds.length} 筆簽到記錄`, type: 'success' })
        setTimeout(() => setToast(null), 3000)
      }
    } catch (error) {
      console.error('Error batch deleting:', error)
      // 失敗時恢復（靜默刷新）
      setCheckins(prev => [...prev, ...checkinsToDelete])
      await loadData(true, selectedDate)
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

  const handleSyncToSheets = async () => {
    if (syncToSheetsLoading) return
    setSyncToSheetsLoading(true)
    try {
      setToast({ message: '正在同步到 Google Sheets...', type: 'success' })
      setTimeout(() => setToast(null), 2000)
      
      const response = await fetch('/api/sync/sheets', {
        method: 'POST',
      })

      const data = await response.json()
      
      if (data.success) {
        setToast({ message: `成功同步 ${data.count} 筆會員資料到 Google Sheets`, type: 'success' })
        setTimeout(() => setToast(null), 4000)
      } else {
        const errorMsg = filterVercelText(data.error || '同步失敗')
        setToast({ message: '同步失敗：' + errorMsg, type: 'error' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch (error) {
      console.error('同步到 Google Sheets 失敗:', error)
      setToast({ message: '同步失敗：網路錯誤或伺服器無回應', type: 'error' })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setSyncToSheetsLoading(false)
    }
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

  const handleBackupDatabase = async () => {
    try {
      setToast({ message: '正在備份資料...', type: 'info' })
      const backupData: {
        members: Member[]
        meetings: Meeting[]
        prizes?: any[]
        checkins: Array<{ date: string; checkins: any[] }>
        winners?: any[]
        timestamp: string
      } = {
        members,
        meetings,
        prizes,
        checkins: [],
        timestamp: new Date().toISOString(),
      }

      for (const meeting of meetings) {
        try {
          const checkinsRes = await fetch(`/api/checkins?date=${meeting.date}`)
          const checkinsData = await checkinsRes.json()
          backupData.checkins.push({
            date: meeting.date,
            checkins: checkinsData.checkins || [],
          })
        } catch {
          // ignore
        }
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `backup_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      setToast({ message: '資料庫備份成功！', type: 'success' })
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error('Error backing up:', error)
      setToast({ message: '備份失敗', type: 'error' })
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

      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: backupData }),
      })

      const result = await response.json().catch(() => ({}))
      if (response.ok && result.success) {
        const r = result.data?.results || {}
        setToast({
          message: `還原完成！會員: ${r.members?.success || 0}, 會議: ${r.meetings?.success || 0}, 簽到: ${r.checkins?.success || 0}`,
          type: 'success',
        })
        await loadData()
        if (prizes.length === 0) await loadPrizes()
      } else {
        setToast({ message: result.error || '還原失敗', type: 'error' })
      }
      event.target.value = ''
    } catch (error) {
      console.error('Error restoring:', error)
      setToast({ message: '還原失敗：檔案格式錯誤', type: 'error' })
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

  // 檢查 CSV 檔案中的數據
  const handleAnalyzeCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      console.log('沒有選擇檔案')
      return
    }

    try {
      setToast({ message: '正在讀取和分析 CSV 檔案...', type: 'info' })
      const text = await file.text()
      
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
      
      if (lines.length < 2) {
        setToast({ message: 'CSV 檔案格式錯誤：至少需要標題行和一行數據', type: 'error' })
        setTimeout(() => setToast(null), 4000)
        event.target.value = ''
        return
      }

      const parseCSVLine = (line: string): string[] => {
        const cells: string[] = []
        let currentCell = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              currentCell += '"'
              i++
            } else inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            cells.push(currentCell.trim())
            currentCell = ''
          } else currentCell += char
        }
        cells.push(currentCell.trim())
        return cells
      }

      const header = parseCSVLine(lines[0])
      const dataLines = lines.slice(1)
      perfStart('CSV parse rows (analyze)')
      const dataRows = await processInChunks(
        dataLines,
        200,
        (chunk) => chunk.map((line) => ({ rowIndex: 0, cells: parseCSVLine(line) })).filter(row => row.cells.length >= 2 && row.cells[0] && row.cells[1]),
        (done, total) => { if (done % 500 === 0 || done === total) setToast({ message: `解析 CSV：${done}/${total} 行`, type: 'info' }) }
      )
      dataRows.forEach((row, index) => { row.rowIndex = index + 2 })
      perfEnd('CSV parse rows (analyze)')

      const statistics: Array<{
        memberId: number
        memberName: string
        totalMeetings: number
        presentCount: number
        lateCount: number
        proxyCount: number
        absentCount: number
      }> = []

      for (const row of dataRows) {
        try {
          const memberId = parseInt(row.cells[0])
          const memberName = row.cells[1] || ''
          const totalMeetings = parseInt(row.cells[2] || '0')
          const presentCount = parseInt(row.cells[3] || '0')
          const lateCount = parseInt(row.cells[4] || '0')
          const proxyCount = parseInt(row.cells[5] || '0')
          const absentCount = parseInt(row.cells[6] || '0')

          if (isNaN(memberId) || memberId <= 0) continue

          statistics.push({
            memberId,
            memberName,
            totalMeetings,
            presentCount,
            lateCount,
            proxyCount,
            absentCount
          })
        } catch (error) {
          // 跳過錯誤的行
        }
      }

      if (statistics.length === 0) {
        setToast({ message: '無法解析任何有效數據', type: 'error' })
        setTimeout(() => setToast(null), 4000)
        event.target.value = ''
        return
      }

      // 從檔案名稱提取日期範圍
      const fileName = file.name
      const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/)
      const startDate = dateMatch ? dateMatch[1] : '2025-07-18'
      const endDate = dateMatch ? dateMatch[2] : new Date().toISOString().split('T')[0]

      // 調用分析 API
      setToast({ message: '正在分析數據...', type: 'info' })

      let response: Response
      try {
        response = await fetch('/api/statistics/analyze-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            statistics,
            startDate,
            endDate
          })
        })
      } catch (fetchError) {
        console.error('網路請求失敗:', fetchError)
        setToast({ 
          message: `網路請求失敗：${fetchError instanceof Error ? fetchError.message : '無法連接到伺服器'}\n\n請檢查：\n1. 伺服器是否正在運行\n2. 網路連線是否正常`, 
          type: 'error' 
        })
        setTimeout(() => setToast(null), 8000)
        event.target.value = ''
        return
      }

      // 檢查響應類型
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('API 返回非 JSON 響應:', text.substring(0, 500))
        setToast({ 
          message: `API 錯誤：伺服器返回了非 JSON 響應。\n\n響應內容：${text.substring(0, 200)}\n\n請檢查伺服器日誌或重新啟動伺服器。`, 
          type: 'error' 
        })
        setTimeout(() => setToast(null), 10000)
        event.target.value = ''
        return
      }

      let result: any
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error('JSON 解析失敗:', jsonError)
        setToast({ 
          message: `數據解析失敗：${jsonError instanceof Error ? jsonError.message : '無法解析伺服器響應'}\n\n請檢查伺服器日誌。`, 
          type: 'error' 
        })
        setTimeout(() => setToast(null), 8000)
        event.target.value = ''
        return
      }

      if (!response.ok || !result.success) {
        const errorMsg = result.error || result.message || '未知錯誤'
        console.error('API 返回錯誤:', result)
        setToast({ 
          message: `分析失敗：${errorMsg}\n\n請檢查 CSV 檔案格式和數據是否正確。`, 
          type: 'error' 
        })
        setTimeout(() => setToast(null), 8000)
        event.target.value = ''
        return
      }

      // API 返回的數據結構：{ success: true, data: { summary, analysis, allAnalysis, thursdayDates } }
      const data = result.data || result
      const summary = data?.summary || {}
      const analysis = data?.analysis || []
      const allAnalysis = data?.allAnalysis || []

      // 構建詳細報告
      let report = `📊 CSV 數據分析報告\n\n` +
        `📅 日期範圍：${startDate} ~ ${endDate}\n` +
        `📋 總會議數：${summary.totalMeetings || 0}\n\n` +
        `👥 會員統計：\n` +
        `  • 總會員數：${summary.totalMembers || 0}\n` +
        `  • ✅ 正常：${summary.membersOk || 0}\n` +
        `  • ❌ 缺少記錄：${summary.membersMissing || 0}\n` +
        `  • ⚠️ 會員不存在：${summary.membersNotFound || 0}\n\n` +
        `📈 簽到記錄統計：\n` +
        `  • CSV 出席次數：${summary.totalCsvCheckins || 0}\n` +
        `  • 實際簽到記錄：${summary.totalActualCheckins || 0}\n` +
        `  • 已匯入記錄：${summary.totalImportedCheckins || 0}\n` +
        `  • 缺少記錄：${summary.totalMissingCheckins || 0}\n\n`

      if (analysis && analysis.length > 0) {
        report += `❌ 有問題的會員（${analysis.length} 個）：\n\n`
        
        // 按問題類型分組
        const missing = analysis.filter((a: any) => a.status === 'missing')
        const notFound = analysis.filter((a: any) => a.status === 'member_not_found')
        
        if (missing.length > 0) {
          report += `缺少記錄的會員（${missing.length} 個）：\n`
          missing.slice(0, 15).forEach((a: any) => {
            report += `  • ${a.memberName} (ID: ${a.memberId}): CSV=${a.csvPresentCount}, 實際=${a.actualCheckins}, 缺少=${a.missingCheckins}\n`
          })
          if (missing.length > 15) {
            report += `  ... 還有 ${missing.length - 15} 個會員\n`
          }
          report += `\n`
        }

        if (notFound.length > 0) {
          report += `會員不存在的記錄（${notFound.length} 個）：\n`
          notFound.slice(0, 10).forEach((a: any) => {
            report += `  • ${a.memberName} (ID: ${a.memberId}): CSV 出席=${a.csvPresentCount}\n`
          })
          if (notFound.length > 10) {
            report += `  ... 還有 ${notFound.length - 10} 個會員\n`
          }
          report += `\n`
        }
      } else {
        report += `✅ 所有記錄都正常！\n\n`
      }

      report += `詳細資訊已輸出到瀏覽器控制台（按 F12 查看）`

      // 輸出詳細資訊到控制台
      console.log('📊 CSV 數據詳細分析報告：', {
        summary,
        analysis,
        allAnalysis,
        statistics,
        result
      })

      setToast({ 
        message: report, 
        type: (summary.membersMissing > 0 || summary.membersNotFound > 0) ? 'error' : 'success'
      })
      setTimeout(() => setToast(null), 30000) // 顯示30秒

    } catch (error) {
      console.error('分析 CSV 失敗:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : '檔案格式錯誤或網路連線問題'
      setToast({ 
        message: `分析失敗：${errorMessage}\n\n請檢查：\n1. CSV 檔案格式是否正確\n2. 網路連線是否正常\n3. 伺服器是否正常運行\n\n詳細錯誤請查看瀏覽器控制台（按 F12）`, 
        type: 'error' 
      })
      setTimeout(() => setToast(null), 10000)
    } finally {
      event.target.value = ''
    }
  }

  // 簡單直接的匯入功能
  const handleImportStatisticsCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      console.log('沒有選擇檔案')
      return
    }

    try {
      setToast({ message: '正在讀取 CSV 檔案...', type: 'info' })
      const text = await file.text()
      
      // 解析 CSV（處理 BOM 和換行符）
      const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
      
      if (lines.length < 2) {
        setToast({ message: 'CSV 檔案格式錯誤：至少需要標題行和一行數據', type: 'error' })
        setTimeout(() => setToast(null), 4000)
        event.target.value = ''
        return
      }

      // 解析標題行
      const parseCSVLine = (line: string): string[] => {
        const cells: string[] = []
        let currentCell = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              currentCell += '"'
              i++
            } else {
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            cells.push(currentCell.trim())
            currentCell = ''
          } else {
            currentCell += char
          }
        }
        cells.push(currentCell.trim())
        return cells
      }
      
      const header = parseCSVLine(lines[0])
      const dataRows = lines.slice(1).map((line, index) => {
        const cells = parseCSVLine(line)
        return {
          rowIndex: index + 2,
          cells
        }
      }).filter(row => row.cells.length >= 2 && row.cells[0] && row.cells[1])

      // 解析統計數據
      const statistics: Array<{
        memberId: number
        memberName: string
        totalMeetings: number
        presentCount: number
        lateCount: number
        proxyCount: number
        absentCount: number
      }> = []

      for (const row of dataRows) {
        try {
          const memberId = parseInt(row.cells[0])
          const memberName = row.cells[1] || ''
          const totalMeetings = parseInt(row.cells[2] || '0')
          const presentCount = parseInt(row.cells[3] || '0')
          const lateCount = parseInt(row.cells[4] || '0')
          const proxyCount = parseInt(row.cells[5] || '0')
          const absentCount = parseInt(row.cells[6] || '0')

          if (isNaN(memberId) || memberId <= 0) continue

          statistics.push({
            memberId,
            memberName,
            totalMeetings,
            presentCount,
            lateCount,
            proxyCount,
            absentCount
          })
        } catch (error) {
          // 跳過錯誤的行
        }
      }

      if (statistics.length === 0) {
        setToast({ message: '無法解析任何有效數據', type: 'error' })
        setTimeout(() => setToast(null), 4000)
        event.target.value = ''
        return
      }

      // 從檔案名稱提取日期範圍
      const fileName = file.name
      const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/)
      const startDate = dateMatch ? dateMatch[1] : '2025-07-18'
      const endDate = dateMatch ? dateMatch[2] : new Date().toISOString().split('T')[0]

      // 直接匯入，不進行分析
      setToast({ 
        message: `正在匯入 ${statistics.length} 筆會員數據...\n日期範圍：${startDate} ~ ${endDate}`, 
        type: 'info' 
      })

      const response = await fetch('/api/statistics/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statistics,
          startDate,
          endDate
        })
      })

      // 檢查響應類型
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('API 返回非 JSON 響應:', text.substring(0, 500))
        setToast({ 
          message: `API 錯誤：伺服器返回了非 JSON 響應。\n\n請檢查伺服器日誌或重新啟動伺服器。`, 
          type: 'error' 
        })
        setTimeout(() => setToast(null), 10000)
        event.target.value = ''
        return
      }

      const result = await response.json()

      if (!response.ok || !result.success) {
        const errorMsg = result.error || result.message || '未知錯誤'
        const details = result.details || {}
        console.error('匯入失敗:', result)
        
        // 檢查是否是資料庫表不存在的錯誤
        if (errorMsg.includes('資料庫表尚未建立') || details.missingTables) {
          setToast({ 
            message: `❌ 匯入失敗：資料庫表尚未建立\n\n缺少的表：${details.missingTables?.join(', ') || '未知'}\n\n請先：\n1. 點擊「檢查資料庫」按鈕\n2. 按照提示建立資料表\n3. 然後再重新匯入`, 
            type: 'error' 
          })
          setTimeout(() => setToast(null), 15000)
        } else {
          setToast({ 
            message: `匯入失敗：${errorMsg}\n\n請檢查 CSV 檔案格式和數據是否正確。`, 
            type: 'error' 
          })
          setTimeout(() => setToast(null), 8000)
        }
        event.target.value = ''
        return
      }

      const data = result.data || result
      const results = data?.results || {}

      // 顯示匯入結果
      const created = results.checkinsCreated || 0
      const skipped = results.checkinsSkipped || 0
      const errors = results.errors || 0
      
      let report = `✅ 匯入完成！\n\n` +
        `📊 統計：\n` +
        `  • 處理會員數：${results.totalMembers || 0}\n` +
        `  • 會議數：${results.totalMeetings || 0}\n` +
        `  • 創建簽到記錄：${created} 筆\n` +
        `  • 跳過記錄：${skipped} 筆\n` +
        `  • 錯誤數：${errors}\n\n`
      
      // 如果沒有創建任何記錄，給出提示
      if (created === 0 && skipped > 0) {
        report += `⚠️ 注意：沒有創建任何簽到記錄！\n\n` +
          `可能原因：\n` +
          `1. 會員不存在（請先匯入會員資料）\n` +
          `2. 所有日期都已有簽到記錄\n` +
          `3. CSV 中的會員 ID 與資料庫不符\n\n`
      }
      
      if (results.errorDetails && results.errorDetails.length > 0) {
        report += `⚠️ 錯誤詳情（前 ${Math.min(5, results.errorDetails.length)} 個）：\n${results.errorDetails.slice(0, 5).join('\n')}\n\n`
      }
      
      if (created > 0) {
        report += `✅ 資料已成功寫入資料庫！`
      } else {
        report += `❌ 請檢查錯誤詳情並修正後重新匯入。`
      }

      setToast({ 
        message: report, 
        type: results.errors > 0 ? 'error' : 'success'
      })
      setTimeout(() => setToast(null), 15000)

      // 重新載入數據
      await loadData(false) // 重新載入所有數據
      
      // 重新載入統計（保留目前選擇的區間）
      loadMemberStats(statsDateStart || undefined, statsDateEnd || undefined).catch(err =>
        console.error('重新載入統計數據失敗:', err)
      )

      console.log('匯入結果:', results)

    } catch (error) {
      console.error('匯入 CSV 失敗:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : '檔案格式錯誤或網路連線問題'
      setToast({ 
        message: `匯入失敗：${errorMessage}\n\n請檢查：\n1. CSV 檔案格式是否正確\n2. 網路連線是否正常\n3. 伺服器是否正常運行\n\n詳細錯誤請查看瀏覽器控制台（按 F12）`, 
        type: 'error' 
      })
      setTimeout(() => setToast(null), 10000)
    } finally {
      event.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        {/* Header skeleton */}
        <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="h-8 w-48 bg-white/20 rounded mb-2 animate-pulse" />
                <div className="h-4 w-32 bg-white/20 rounded animate-pulse" />
              </div>
              <div className="h-10 w-20 bg-white/20 rounded-lg animate-pulse" />
            </div>
          </div>
        </header>
        {/* Tabs skeleton */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex gap-4 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        {/* Content skeleton */}
        <main className="w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="h-5 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
              <div className="h-12 w-full max-w-xs bg-gray-100 rounded-xl mb-6 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
            <div className="bg-white/90 rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="h-6 w-40 bg-gray-200 rounded mb-4 mx-6 mt-6 animate-pulse" />
              <div className="space-y-3 p-6 pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </main>
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
              : toast.type === 'error'
              ? 'bg-red-500/95 border-red-400 text-white'
              : 'bg-blue-500/95 border-blue-400 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
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
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
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
                返回前台
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Responsive */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
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
      <main className="w-full min-w-0 px-4 sm:px-6 lg:px-8 py-8">
        {/* Attendance Management Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Date Selection and Meeting Control */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📅 選擇會議日期
                  </label>
                  {selectableDates.length > 0 ? (
                    <>
                      <select
                        value={selectedDate}
                        onChange={(e) => {
                          const newDate = e.target.value
                          setSelectedDate(newDate)
                          setTimeout(() => loadData(false, newDate), 0)
                        }}
                        className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                      >
                        {selectableDates.map((date) => (
                          <option key={date.value} value={date.value}>
                            {date.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">與會議管理同步，新增／刪除請至「會議管理」</p>
                    </>
                  ) : (
                    <div className="px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                      <p className="text-sm text-gray-600 mb-2">尚無會議，請先在會議管理新增</p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('meetings')
                          if (typeof window !== 'undefined') {
                            window.history.pushState({}, '', '/admin/attendance_management?tab=meetings')
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                      >
                        📅 前往會議管理
                      </button>
                    </div>
                  )}
                </div>
                {selectableDates.length > 0 && (
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setActiveTab('meetings')
                        if (typeof window !== 'undefined') {
                          window.history.pushState({}, '', '/admin/attendance_management?tab=meetings')
                        }
                      }}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all shadow-sm font-semibold text-sm"
                    >
                      📅 管理會議
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-5 border border-blue-200 shadow-sm">
                  <div className="text-xs sm:text-sm text-blue-600 font-medium mb-1">總會員數</div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-700">{stats.total}</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 sm:p-5 border border-green-200 shadow-sm">
                  <div className="text-xs sm:text-sm text-green-600 font-medium mb-1">已簽到</div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-700">{stats.present}</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 sm:p-5 border border-yellow-200 shadow-sm">
                  <div className="text-xs sm:text-sm text-yellow-600 font-medium mb-1">遲到</div>
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-700">{stats.late}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 sm:p-5 border border-orange-200 shadow-sm">
                  <div className="text-xs sm:text-sm text-orange-600 font-medium mb-1">早退</div>
                  <div className="text-2xl sm:text-3xl font-bold text-orange-700">{stats.earlyLeave}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 sm:p-5 border border-purple-200 shadow-sm">
                  <div className="text-xs sm:text-sm text-purple-600 font-medium mb-1">代理出席</div>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-700">{stats.proxy}</div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 sm:p-5 border border-red-200 shadow-sm">
                  <div className="text-xs sm:text-sm text-red-600 font-medium mb-1">缺席</div>
                  <div className="text-2xl sm:text-3xl font-bold text-red-700">{stats.absent}</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 sm:p-5 border border-indigo-200 shadow-sm">
                  <div className="text-xs sm:text-sm text-indigo-600 font-medium mb-1">出席率</div>
                  <div className="text-2xl sm:text-3xl font-bold text-indigo-700">{stats.rate}%</div>
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
                    <label className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-semibold cursor-pointer">
                      📤 匯入CSV
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportStatisticsCSV}
                        className="hidden"
                      />
                    </label>
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
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'present' | 'absent' | 'late' | 'early_leave' | 'proxy')}
                      className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    >
                      <option value="all">全部狀態</option>
                      <option value="present">已簽到</option>
                      <option value="late">遲到</option>
                      <option value="early_leave">早退</option>
                      <option value="proxy">代理出席</option>
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
                        出席狀態
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
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                            <input
                              type="datetime-local"
                              value={checkin
                                ? (checkin.checkin_time ? new Date(checkin.checkin_time).toISOString().slice(0, 16) : '')
                                : (getAbsentDraft(member.id).checkin_time?.slice(0, 16) || '')}
                              onChange={(e) => {
                                const val = e.target.value
                                if (checkin) {
                                  updateCheckinInState(member.id, {
                                    checkin_time: val ? new Date(val).toISOString() : new Date().toISOString()
                                  })
                                } else {
                                  setAbsentDraft(member.id, { checkin_time: val ? val : `${selectedDate}T08:45` })
                                }
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-xs w-full max-w-[180px]"
                            />
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <select
                              value={checkin ? (checkin.status || 'present') : getAbsentDraft(member.id).status}
                              onChange={(e) => {
                                if (checkin) updateCheckinInState(member.id, { status: e.target.value })
                                else setAbsentDraft(member.id, { status: e.target.value })
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-xs font-medium"
                            >
                              <option value="present">正常</option>
                              <option value="early">早安</option>
                              <option value="late">遲到</option>
                              <option value="early_leave">早退</option>
                              <option value="proxy">代理</option>
                              <option value="absent">缺席</option>
                            </select>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm">
                            <input
                              type="text"
                              value={checkin ? (checkin.message || '') : getAbsentDraft(member.id).message}
                              onChange={(e) => {
                                if (checkin) updateCheckinInState(member.id, { message: e.target.value })
                                else setAbsentDraft(member.id, { message: e.target.value })
                              }}
                              placeholder="留言"
                              maxLength={500}
                              className="px-2 py-1 border border-gray-300 rounded text-xs w-full max-w-[200px]"
                            />
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveCheckinEdit(member.id)}
                                disabled={actionLoading[`save-${member.id}`]}
                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all text-xs font-semibold disabled:opacity-50"
                              >
                                {actionLoading[`save-${member.id}`] ? '儲存中...' : '儲存'}
                              </button>
                              <button
                                onClick={() => checkin && handleDeleteCheckin(member.id)}
                                disabled={!checkin}
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                刪除
                              </button>
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
                  onClick={handleSyncToSheets}
                  disabled={syncToSheetsLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-wait"
                  title="同步會員資料到 Google Sheets"
                >
                  📊 同步到 Sheets
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">排序：</span>
                <button
                  type="button"
                  onClick={() => setMeetingSortMode('attendance')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${meetingSortMode === 'attendance' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  有簽到的優先
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingSortMode('date')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${meetingSortMode === 'date' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  依日期
                </button>
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
            </div>

            {/* 有簽到但尚未建立會議的日期（孤兒日期） */}
            {orphanDates.length > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                  <span>⚠️</span>
                  有簽到紀錄但尚未建立會議的日期
                </h3>
                <p className="text-xs text-amber-700 mb-3">這些日期在出席管理中可選，但尚未在會議表中建立，請點「新增會議」補齊。</p>
                <div className="flex flex-wrap gap-2">
                  {orphanDates.map((dateStr) => {
                    const d = new Date(dateStr + 'T12:00:00')
                    const label = d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
                    const checkinCount = meetingStats[dateStr] ?? (checkinsByDateRef.current[dateStr]?.length ?? 0)
                    return (
                      <div key={dateStr} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-amber-200">
                        <span className="text-sm font-medium text-gray-800">{label}</span>
                        <span className="text-xs text-gray-500">({checkinCount} 人簽到)</span>
                        <button
                          type="button"
                          onClick={() => handleCreateMeetingForDate(dateStr)}
                          className="px-2 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700"
                        >
                          新增會議
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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
                  {sortedMeetingsForManagement.map((meeting) => {
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
            {/* 統計區間選擇 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📊</span>
                <span>統計報表</span>
              </h2>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-sm font-medium text-gray-700">統計區間：</span>
                {(['week', 'month', 'quarter', 'year', 'all'] as const).map((preset) => {
                  const r = getStatsPresetRange(preset)
                  const label = r.label
                  const isActive = preset === 'all'
                    ? !statsDateStart && !statsDateEnd
                    : statsDateStart === r.start && statsDateEnd === r.end
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setStatsDateStart(r.start)
                        setStatsDateEnd(r.end)
                        setStatsRangeLabel(label)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">自訂：</span>
                <input
                  type="date"
                  value={statsDateStart}
                  onChange={(e) => setStatsDateStart(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-gray-500">～</span>
                <input
                  type="date"
                  value={statsDateEnd}
                  onChange={(e) => setStatsDateEnd(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => loadMemberStats(statsDateStart || undefined, statsDateEnd || undefined)}
                  disabled={statsLoading}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {statsLoading ? '載入中...' : '查詢'}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                目前：{statsDateStart && statsDateEnd ? `${statsDateStart} ～ ${statsDateEnd}` : '全部'}
              </p>

              {/* 子 Tab：會員出席統計 | 關注名單 */}
              <div className="mt-4 flex gap-2 border-b border-gray-200 pb-2">
                <button
                  type="button"
                  onClick={() => setStatsReportsSubTab('stats')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    statsReportsSubTab === 'stats'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  👥 會員出席統計
                </button>
                <button
                  type="button"
                  onClick={() => setStatsReportsSubTab('care')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    statsReportsSubTab === 'care'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  💝 關注名單
                  {(careListSummary.high + careListSummary.medium + careListSummary.low) > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold bg-amber-400 text-amber-900 rounded-full">
                      {careListSummary.high + careListSummary.medium + careListSummary.low}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Overall Statistics */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium mb-1">總會議數（依簽到記錄）</div>
                  <div className="text-2xl font-bold text-blue-700">{statsLoading ? '—' : statsTotalMeetings}</div>
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

            {/* 關注名單區塊（子 Tab = care 時顯示） */}
            {statsReportsSubTab === 'care' && (
              <div className="space-y-6">
                {/* 風險摘要卡片 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 sm:p-5 border-2 border-red-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🔴</span>
                      <span className="text-sm font-bold text-red-700">高風險（瀕臨流失）</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-red-800">{careListSummary.high}</div>
                    <p className="text-xs text-red-600 mt-1">連續缺席≥4次／出席率&lt;15%／逾60天未出席</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 sm:p-5 border-2 border-amber-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🟠</span>
                      <span className="text-sm font-bold text-amber-700">中風險（需要關注）</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-amber-800">{careListSummary.medium}</div>
                    <p className="text-xs text-amber-600 mt-1">連續缺席2～3次／出席率15～35%／30～60天未出席</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 sm:p-5 border-2 border-yellow-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">🟡</span>
                      <span className="text-sm font-bold text-yellow-700">低風險（觀察名單）</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-yellow-800">{careListSummary.low}</div>
                    <p className="text-xs text-yellow-600 mt-1">連續缺席1次／出席率35～50%／趨勢下降</p>
                  </div>
                </div>

                {/* 篩選與匯出 */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>💝</span>
                        <span>關注名單</span>
                        {careListLoading && <span className="text-sm font-normal text-gray-500">載入中...</span>}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">總會議數、出席次數依所選區間計算；新進會員總會議數較少屬正常</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-sm text-gray-600">篩選：</span>
                      <select
                        value={careListFilter}
                        onChange={(e) => setCareListFilter(e.target.value as typeof careListFilter)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="all">全部</option>
                        <option value="high">🔴 高風險</option>
                        <option value="medium">🟠 中風險</option>
                        <option value="low">🟡 低風險</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = careListFilter === 'all'
                            ? careList
                            : careList.filter(c => c.riskLevel === careListFilter)
                          const header = ['編號', '姓名', '專業別', '總會議數', '出席次數', '出席率', '連續缺席', '最後出席日', '距今天數', '趨勢', '風險等級']
                          const rows = filtered.map(c => [
                            c.memberId,
                            c.name,
                            c.profession,
                            c.total,
                            c.present,
                            `${c.rate.toFixed(1)}%`,
                            c.consecutiveAbsences,
                            c.lastAttendanceDate || '從未出席',
                            c.daysSinceLastAttendance !== null ? `${c.daysSinceLastAttendance} 天` : '-',
                            c.trend === 'up' ? '↑上升' : c.trend === 'down' ? '↓下降' : c.trend === 'flat' ? '持平' : '-',
                            c.riskLevel === 'high' ? '高風險' : c.riskLevel === 'medium' ? '中風險' : '低風險'
                          ])
                          const csv = [header.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
                          const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
                          const link = document.createElement('a')
                          link.href = URL.createObjectURL(blob)
                          link.download = `關注名單_${new Date().toISOString().split('T')[0]}.csv`
                          link.click()
                          URL.revokeObjectURL(link.href)
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 text-sm font-semibold"
                      >
                        📥 匯出 CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => loadCareList(statsDateStart || undefined, statsDateEnd || undefined)}
                        disabled={careListLoading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                      >
                        🔄 重新載入
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-rose-50 to-amber-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">風險</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">編號</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">姓名</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">專業別</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">總會議數</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">出席次數</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">出席率</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">連續缺席</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">最後出席日</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">距今天數</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">趨勢</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(careListFilter === 'all' ? careList : careList.filter(c => c.riskLevel === careListFilter)).map((item) => {
                          const riskBadge = item.riskLevel === 'high'
                            ? { bg: 'bg-red-100', text: 'text-red-800', label: '高風險' }
                            : item.riskLevel === 'medium'
                              ? { bg: 'bg-amber-100', text: 'text-amber-800', label: '中風險' }
                              : { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '低風險' }
                          const trendLabel = item.trend === 'up' ? '↑ 上升' : item.trend === 'down' ? '↓ 下降' : item.trend === 'flat' ? '持平' : '-'
                          const trendColor = item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                          return (
                            <tr key={item.memberId} className="hover:bg-rose-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${riskBadge.bg} ${riskBadge.text}`}>
                                  {riskBadge.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">#{item.memberId}</td>
                              <td className="px-4 py-3 text-sm font-bold text-gray-900">{item.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.profession}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 font-medium" title="此區間內的總會議數（新進會員可能較少）">{item.total}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600">{item.present}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        item.rate >= 50 ? 'bg-green-500' : item.rate >= 25 ? 'bg-amber-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(100, item.rate)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700">{item.rate.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-red-600">{item.consecutiveAbsences} 次</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.lastAttendanceDate || '從未出席'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {item.daysSinceLastAttendance !== null ? `${item.daysSinceLastAttendance} 天` : '-'}
                              </td>
                              <td className={`px-4 py-3 text-sm font-medium ${trendColor}`}>{trendLabel}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {careList.length === 0 && !careListLoading && (
                      <div className="py-12 text-center text-gray-500">
                        <p className="text-lg font-medium">目前無需關注的會員</p>
                        <p className="text-sm mt-1">表示大家都在穩定參與，加油！</p>
                      </div>
                    )}
                    {careList.length === 0 && careListLoading && (
                      <div className="py-12 text-center text-gray-500">載入中...</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Member Attendance Statistics + Meeting History（子 Tab = stats 時顯示） */}
            {statsReportsSubTab === 'stats' && (
            <>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>👥</span>
                  <span>會員出席統計</span>
                </h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 whitespace-nowrap">排序：</span>
                    <select
                      value={statsSortBy}
                      onChange={(e) => setStatsSortBy(e.target.value as typeof statsSortBy)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="id">編號</option>
                      <option value="name">姓名</option>
                      <option value="profession">專業別</option>
                      <option value="total">總會議數</option>
                      <option value="present">出席次數</option>
                      <option value="late">遲到次數</option>
                      <option value="proxy">代理出席</option>
                      <option value="absent">缺席次數</option>
                      <option value="rate">出席率</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setStatsSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-gray-50 hover:bg-gray-100"
                      title={statsSortOrder === 'asc' ? '升序，點擊切換降序' : '降序，點擊切換升序'}
                    >
                      {statsSortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
                    </button>
                  </div>
                  <label className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer">
                    <span>📤</span>
                    <span>匯入 CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleImportStatisticsCSV}
                      className="hidden"
                    />
                  </label>
                  <label className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer">
                    <span>🔍</span>
                    <span>分析 CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleAnalyzeCSV}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">編號</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">姓名</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">專業別</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">總會議數</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">出席次數</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">遲到次數</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">代理出席</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">缺席次數</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">出席率</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedStatsRows.map(({ member, stat }) => {
                      const attendanceRate = (typeof stat.rate === 'number' && !isNaN(stat.rate))
                        ? stat.rate
                        : (stat.total > 0 ? (stat.present / stat.total) * 100 : 0)
                      const safeRate = Math.max(0, Math.min(100, attendanceRate))
                      return (
                        <tr key={member.id} className="hover:bg-indigo-50/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">#{member.id}</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">{member.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{member.profession || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-semibold">{stat.total || 0}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-600">{stat.present || 0}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-yellow-600">{stat.late || 0}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-600">{stat.proxy || 0}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-600">{stat.absent || 0}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    safeRate >= 80 ? 'bg-green-500' :
                                    safeRate >= 50 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${safeRate}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold whitespace-nowrap min-w-[50px] text-right ${
                                safeRate >= 80 ? 'text-green-600' :
                                safeRate >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {safeRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Meeting History */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h3 className="text-lg font-bold text-gray-900">會議歷史記錄</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">月份：</span>
                  <select
                    value={meetingHistoryMonth}
                    onChange={(e) => setMeetingHistoryMonth(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">全部（最近 100 筆）</option>
                    {availableMonths.map((ym) => {
                      const [y, m] = ym.split('-')
                      const label = `${y}年${parseInt(m, 10)}月`
                      return (
                        <option key={ym} value={ym}>{label}</option>
                      )
                    })}
                  </select>
                </div>
              </div>
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
                    {filteredMeetingsForHistory.map((meeting) => {
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
                {filteredMeetingsForHistory.length === 0 && (
                  <div className="py-8 text-center text-gray-500 text-sm">該區間尚無會議記錄</div>
                )}
              </div>
              {filteredMeetingsForHistory.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  共顯示 {filteredMeetingsForHistory.length} 筆
                  {meetingHistoryMonth && `（${meetingHistoryMonth.slice(0, 4)}年${parseInt(meetingHistoryMonth.slice(5), 10)}月）`}
                </p>
              )}
            </div>
            </>
            )}
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
                    setNewPrize({ name: '', totalQuantity: 1, probability: 1.0, image: null, addStock: 0, adjustTotalQuantity: 0 })
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
                      <Image
                        src={getPrizeImageUrl(prize)}
                        alt={prize.name}
                        width={64}
                        height={64}
                        unoptimized
                        className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          setPreviewImageUrl(getPrizeImageUrl(prize))
                          setImagePreviewScale(1)
                          setImagePreviewNatural(null)
                          setShowImagePreview(true)
                        }}
                      />
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
                            addStock: 0,
                            adjustTotalQuantity: 0,
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
                      setNewPrize({ name: '', totalQuantity: 1, probability: 1.0, image: null, addStock: 0, adjustTotalQuantity: 0 })
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

            {/* 歷史獲獎紀錄 */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🏆</span>
                <span>歷史獲獎紀錄</span>
                <button
                  onClick={() => loadLotteryHistory()}
                  className="ml-2 text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                >
                  重新整理
                </button>
              </h3>
              {lotteryHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">尚無獲獎紀錄</p>
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">日期</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">中獎者</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">獎品</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {lotteryHistory.map((w) => (
                        <tr key={w.id} className="hover:bg-purple-50/50">
                          <td className="px-4 py-2 text-sm text-gray-700">{w.meeting_date}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{w.member_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 flex items-center gap-2">
                            <Image src={getPrizeImageUrl({ id: w.prize_id, image_url: w.prize_image_url })} alt="" width={32} height={32} unoptimized className="w-8 h-8 object-cover rounded" />
                            {w.prize_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">會議室開放時間</label>
                    <input
                      type="time"
                      value={systemSettings.defaultMeetingTime}
                      onChange={(e) => setSystemSettings({ ...systemSettings, defaultMeetingTime: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">簽到開始（例：6:30）</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">遲到門檻</label>
                    <input
                      type="time"
                      value={systemSettings.lateThreshold}
                      onChange={(e) => setSystemSettings({ ...systemSettings, lateThreshold: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">超過此時間算遲到（例：7:00）</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">簽到截止時間</label>
                    <input
                      type="time"
                      value={systemSettings.checkinDeadline}
                      onChange={(e) => setSystemSettings({ ...systemSettings, checkinDeadline: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">簽到截止（例：8:45）</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">獎品區截止</label>
                    <input
                      type="time"
                      value={systemSettings.lotteryCutoff}
                      onChange={(e) => setSystemSettings({ ...systemSettings, lotteryCutoff: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">此時間前簽到才能抽獎（例：7:00）</p>
                  </div>
                </div>
                <p className="text-xs text-indigo-600 mt-1">儲存後將同步至簽到頁、抽獎頁與 API 判斷</p>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/settings/checkin-times', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          meetingRoomOpen: systemSettings.defaultMeetingTime,
                          signinStart: systemSettings.defaultMeetingTime,
                          lateThreshold: systemSettings.lateThreshold,
                          signinDeadline: systemSettings.checkinDeadline,
                          lotteryCutoff: systemSettings.lotteryCutoff,
                        }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (!res.ok) throw new Error(data.error || '儲存失敗')
                      localStorage.setItem('systemSettings', JSON.stringify(systemSettings))
                      setToast({ message: '系統參數已儲存，簽到與抽獎時間已同步', type: 'success' })
                      setTimeout(() => setToast(null), 3000)
                    } catch (e) {
                      setToast({ message: e instanceof Error ? e.message : '儲存失敗', type: 'error' })
                      setTimeout(() => setToast(null), 3000)
                    }
                  }}
                  className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold"
                >
                  💾 儲存設定（同步至全系統）
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
                  <div className="text-sm text-gray-600 font-medium mb-1">資料庫</div>
                  <div className="text-sm font-semibold text-gray-700">Supabase PostgreSQL</div>
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
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/database/check')
                      const data = await res.json()
                      if (data.success && data.data) {
                        const d = data.data
                        const missing = d.missingTables || []
                        if (missing.length === 0) {
                          setToast({ message: '✅ 資料庫表皆已建立', type: 'success' })
                        } else {
                          setToast({ message: `缺少表：${missing.join(', ')}\n請點擊「建立資料表」`, type: 'error' })
                        }
                        setTimeout(() => setToast(null), 5000)
                      }
                    } catch (e) {
                      setToast({ message: '檢查失敗', type: 'error' })
                    }
                  }}
                  className="px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all text-sm font-semibold flex items-center justify-center gap-2"
                >
                  🔍 檢查資料庫
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('確定要建立/重置資料表嗎？')) return
                    try {
                      const res = await fetch('/api/database/create', { method: 'POST' })
                      const data = await res.json()
                      if (res.ok) {
                        setToast({ message: '資料表建立成功', type: 'success' })
                        await loadData()
                      } else {
                        setToast({ message: data.error || '建立失敗', type: 'error' })
                      }
                    } catch (e) {
                      setToast({ message: '建立失敗', type: 'error' })
                    }
                  }}
                  className="px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all text-sm font-semibold flex items-center justify-center gap-2"
                >
                  📋 建立資料表
                </button>
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
                  <strong className="text-gray-900">Next.js + React + Supabase</strong>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>最後更新</span>
                  <strong className="text-gray-900" suppressHydrationWarning>
                    {new Date().toLocaleDateString('zh-TW')}
                  </strong>
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
                  addStock: newPrize.addStock,
                  adjustTotalQuantity: newPrize.adjustTotalQuantity,
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
                  if (editingPrize && (newPrize.addStock !== 0 || newPrize.adjustTotalQuantity !== 0)) {
                    formData.append('addStock', newPrize.addStock.toString())
                    formData.append('adjustTotalQuantity', newPrize.adjustTotalQuantity.toString())
                  }

                  const url = editingPrize
                    ? `/api/prizes/${editingPrize.id}`
                    : '/api/prizes'
                  const method = editingPrize ? 'PUT' : 'POST'

                  // 樂觀更新：立即關閉彈窗，提升用戶體驗
                  setShowPrizeModal(false)
                  
                  // 清空表單狀態
                  setEditingPrize(null)
                  setNewPrize({ name: '', totalQuantity: 1, probability: 1.0, image: null, addStock: 0, adjustTotalQuantity: 0 })

                  const response = await fetch(url, {
                    method,
                    body: formData,
                  })

                  if (response.ok) {
                    let data
                    try {
                      data = await response.json()
                    } catch (jsonError) {
                      console.error('解析 API 響應失敗:', jsonError)
                      throw new Error('伺服器響應格式錯誤')
                    }
                    
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
                        image: savedPrizeData.image,
                        addStock: savedPrizeData.addStock ?? 0,
                        adjustTotalQuantity: savedPrizeData.adjustTotalQuantity ?? 0,
                      })
                      if (wasEditing && currentEditingPrize) {
                        setEditingPrize(currentEditingPrize)
                      }
                      const errorMsg = filterVercelText(data.error || '未知錯誤')
                      setToast({ message: '操作失敗：' + errorMsg, type: 'error' })
                      setTimeout(() => setToast(null), 4000)
                    }
                  } else {
                    let errorData
                    try {
                      const text = await response.text()
                      errorData = text ? JSON.parse(text) : { error: `HTTP ${response.status}: ${response.statusText}` }
                    } catch (parseError) {
                      console.error('解析錯誤響應失敗:', parseError)
                      errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
                    }
                    
                    const errorMessage = errorData.error || '操作失敗'
                    
                    // 失敗時重新打開彈窗並顯示錯誤
                    setShowPrizeModal(true)
                    setNewPrize({ 
                      name: savedPrizeData.name, 
                      totalQuantity: savedPrizeData.totalQuantity, 
                      probability: savedPrizeData.probability, 
                      image: savedPrizeData.image,
                      addStock: savedPrizeData.addStock ?? 0,
                      adjustTotalQuantity: savedPrizeData.adjustTotalQuantity ?? 0,
                    })
                    if (wasEditing && currentEditingPrize) {
                      setEditingPrize(currentEditingPrize)
                    }
                    
                    // 檢查是否為速率限制錯誤
                    const errorMsg = response.status === 429 || errorMessage.includes('Too many requests') || errorMessage.includes('請求過於頻繁')
                      ? '⚠️ 請求過於頻繁，請稍候 1-2 分鐘後再試上傳圖片'
                      : '操作失敗：' + filterVercelText(errorMessage)
                    setToast({ message: errorMsg, type: 'error' })
                    setTimeout(() => setToast(null), 4000)
                    console.error('Error saving prize:', { status: response.status, error: errorData })
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
                    image: savedPrizeData.image,
                    addStock: savedPrizeData.addStock ?? 0,
                    adjustTotalQuantity: savedPrizeData.adjustTotalQuantity ?? 0,
                  })
                  if (wasEditing && currentEditingPrize) {
                    setEditingPrize(currentEditingPrize)
                  }
                  
                  const errorMsg = errorMessage.includes('Too many requests') || errorMessage.includes('rate limit')
                    ? '⚠️ 請求過於頻繁，請稍候 1-2 分鐘後再試上傳圖片'
                    : '操作失敗：' + filterVercelText(errorMessage)
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
              {editingPrize && (
                <>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 mb-2">📦 庫存調整（編輯時可用）</p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">補庫存數量（增加剩餘）</label>
                        <input
                          type="number"
                          min="0"
                          value={newPrize.addStock}
                          onChange={(e) => setNewPrize({ ...newPrize, addStock: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">調整總數量（+/- 變更上限）</label>
                        <input
                          type="number"
                          value={newPrize.adjustTotalQuantity}
                          onChange={(e) => setNewPrize({ ...newPrize, adjustTotalQuantity: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">正數增加、負數減少總數量上限</p>
                      </div>
                    </div>
                    <p className="text-xs text-amber-700 mt-2">當前：剩餘 {editingPrize.remaining_quantity} / 總計 {editingPrize.total_quantity}</p>
                  </div>
                </>
              )}
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
                    <Image
                      src={editingPrize.image_url}
                      alt={editingPrize.name}
                      width={80}
                      height={80}
                      unoptimized
                      className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        setPreviewImageUrl(editingPrize.image_url)
                        setImagePreviewScale(1)
                        setImagePreviewNatural(null)
                        setShowImagePreview(true)
                      }}
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
                    setNewPrize({ name: '', totalQuantity: 1, probability: 1.0, image: null, addStock: 0, adjustTotalQuantity: 0 })
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {editingPrize ? '儲存' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 獎品圖片預覽 Modal：點擊放大、縮小 */}
      {showImagePreview && previewImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="獎品圖片預覽"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 overflow-auto py-8 px-4"
          onClick={() => {
            setShowImagePreview(false)
            setPreviewImageUrl('')
            setImagePreviewNatural(null)
          }}
        >
          <div
            className="flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="shrink-0 rounded-lg bg-black/30 flex items-center justify-center"
              style={{
                width: imagePreviewNatural ? `min(${imagePreviewNatural.w * imagePreviewScale}px, 80vw)` : 160,
                height: imagePreviewNatural ? `min(${imagePreviewNatural.h * imagePreviewScale}px, 65vh)` : 160,
              }}
            >
              <img
                src={previewImageUrl}
                alt="獎品預覽"
                className="w-full h-full object-contain"
                onLoad={(e) => {
                  const { naturalWidth: w, naturalHeight: h } = e.currentTarget
                  setImagePreviewNatural({ w, h })
                }}
                onDoubleClick={() => setImagePreviewScale(1)}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setImagePreviewScale((s) => Math.max(0.5, s - 0.25))
                }}
                className="px-4 py-2 bg-white/95 text-gray-800 rounded-lg font-medium shadow hover:bg-white transition-colors"
              >
                － 縮小
              </button>
              <span className="px-3 py-2 bg-white/80 text-gray-700 rounded-lg text-sm tabular-nums">
                {Math.round(imagePreviewScale * 100)}%
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setImagePreviewScale((s) => Math.min(2, s + 0.25))
                }}
                className="px-4 py-2 bg-white/95 text-gray-800 rounded-lg font-medium shadow hover:bg-white transition-colors"
              >
                ＋ 放大
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setImagePreviewScale(1)
                }}
                className="px-4 py-2 bg-white/80 text-gray-700 rounded-lg text-sm hover:bg-white/95 transition-colors"
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
