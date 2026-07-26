import { useEffect, useMemo, useState, useCallback } from 'react'
import './App.css'

// ═══════════════════════════════════════════════════════════════
//  SVG ICONS (inline — no dependency needed)
// ═══════════════════════════════════════════════════════════════

const Icons = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  history: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /></svg>,
  report: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
  admin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  profile: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  billing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  checkin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>,
  checkout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  menu: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  wifi: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  activity: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  mapPin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  request: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  schedule: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>,
  auditLog: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>,
  approve: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  reject: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
}

// ═══════════════════════════════════════════════════════════════
//  INITIAL STATE
// ═══════════════════════════════════════════════════════════════

const initialAuthForm = {
  tenantId: '', userId: '', password: '',
  fullName: '', email: '', phone: '',
  otpType: 'PHONE', otpCode: '',
}

// ═══════════════════════════════════════════════════════════════
//  RBAC HELPER — Normalize role checks across frontend
// ═══════════════════════════════════════════════════════════════
function isAdmin(role) {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'ADMIN' || r === 'TENANT_ADMIN';
}
function isManagerRole(role) {
  if (!role) return false;
  return role.toUpperCase() === 'MANAGER';
}
function isManagerOrAdminRole(role) {
  return isAdmin(role) || isManagerRole(role);
}

function App() {
  // Auth state - Restore saved session from localStorage on page refresh
  const [token, setToken] = useState(() => localStorage.getItem('attendanceToken') || '')
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('attendanceUser')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [mode, setMode] = useState(() => (localStorage.getItem('attendanceToken') ? 'app' : 'login'))
  const [authForm, setAuthForm] = useState(initialAuthForm)

  // App state
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Theme state (persisted)
  const [theme, setTheme] = useState(() => localStorage.getItem('attendanceTheme') || 'dark')

  // Data state
  const [history, setHistory] = useState([])
  const [summary, setSummary] = useState(null)
  const [adminUsers, setAdminUsers] = useState([])
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7))
  const [historyMonth, setHistoryMonth] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Geolocation Configuration Toggles (Sandbox Testing Console)
  const [gpsMode, setGpsMode] = useState('OFFICE') // OFFICE (matching coords) | OUTSIDE (bad coords)
  const [gpsCoords, setGpsCoords] = useState('Lat: 10.762622, Lng: 106.660172')
  const [gpsStatus, setGpsStatus] = useState('success') // checking | success | failed

  useEffect(() => {
    if (gpsMode === 'OFFICE') {
      setGpsCoords('Lat: 10.762622, Lng: 106.660172')
      setGpsStatus('success')
    } else {
      setGpsCoords('Lat: 10.823099, Lng: 106.629664')
      setGpsStatus('success')
    }
  }, [gpsMode])

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('attendanceTheme', theme)
  }, [theme])

  // Privileged Target Employee Selection (For MANAGER and ADMIN roles)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [reportEmployeeId, setReportEmployeeId] = useState('ALL')

  // Employee Statistics Summary Lists state (For Manager/Admin UI table)
  const [employeeStatsSummary, setEmployeeStatsSummary] = useState([])
  const [adminTabMode, setAdminTabMode] = useState('users') // users | stats

  // Requests / Leave state
  const [myRequests, setMyRequests] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [leaveBalance, setLeaveBalance] = useState({ totalDays: 12, usedDays: 0, remainingDays: 12, pendingCount: 0 })
  const [requestForm, setRequestForm] = useState({ type: 'LEAVE', startDate: '', endDate: '', reason: '', otHours: 0 })
  const [reviewComment, setReviewComment] = useState('')

  // Schedule state
  const [myShifts, setMyShifts] = useState([])
  const [teamShifts, setTeamShifts] = useState([])
  const [shiftAssignForm, setShiftAssignForm] = useState({ targetUserId: '', weekDate: '', shiftType: 'CA_HANH_CHINH', note: '' })

  // Audit Log state
  const [auditLogs, setAuditLogs] = useState([])

  // Attendance CRUD modal states
  const [showCrudModal, setShowCrudModal] = useState(false)
  const [crudUserId, setCrudUserId] = useState('')
  const [crudUserName, setCrudUserName] = useState('')
  const [crudUserLogs, setCrudUserLogs] = useState([])

  // Form states for Create/Update Attendance item
  const [isEditingLog, setIsEditingLog] = useState(false)
  const [editLogOriginalSk, setEditLogOriginalSk] = useState('')
  const [logForm, setLogForm] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    action: 'CHECKIN',
    device: 'Điều chỉnh thủ công'
  })

  // User CRUD modal states
  const [showUserModal, setShowUserModal] = useState(false)
  const [userModalMode, setUserModalMode] = useState('create')
  const [userForm, setUserForm] = useState({ userId: '', password: '', fullName: '', email: '', phone: '', role: 'EMPLOYEE' })
  const [editingUserId, setEditingUserId] = useState('')

  // Subscription state
  const [subscription, setSubscription] = useState({ plan: 'FREE', status: 'ACTIVE', maxUsers: 50, expiresAt: null })

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [activeOrder, setActiveOrder] = useState(null)

  // Profile edit state
  const [profileForm, setProfileForm] = useState({ fullName: '', email: '', phone: '' })

  // Shift & Attendance rules config state
  const [shiftConfigForm, setShiftConfigForm] = useState({
    shiftStart: '08:00',
    shiftEnd: '17:00',
    windowCheckinStart: '07:00',
    windowCheckinEnd: '10:00',
    windowCheckoutStart: '16:00',
    windowCheckoutEnd: '20:00',
    gracePeriodMinutes: 5,
    cooldownMinutes: 2,
    otThresholdMinutes: 30
  })

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  // ─── Live Clock ───
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // ─── Geolocation refresh ───
  const fetchRealGpsLocation = useCallback(() => {
    setGpsStatus('checking')
    setGpsCoords('Đang xác thực tọa độ GPS...')
    if (!navigator.geolocation) {
      setGpsCoords('Trình duyệt không hỗ trợ định vị GPS')
      setGpsStatus('failed')
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords(`Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`)
          setGpsStatus('success')
          setGpsMode('CUSTOM')
        },
        (error) => {
          console.warn('GPS access blocked:', error.message)
          setGpsCoords('Lat: 10.762622, Lng: 106.660172 (Mock Office)')
          setGpsStatus('success')
          setGpsMode('OFFICE')
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }
  }, [])

  // ─── Show message helper ───
  const showMessage = useCallback((msg, type = 'error') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 6000)
  }, [])

  // ─── API Helper ───
  const requestJson = useCallback(async (path, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload.message || 'Yêu cầu không thành công')
    }
    return payload
  }, [apiBaseUrl, token])

  // ─── Fetch Shift Config ───
  const loadShiftConfig = useCallback(async () => {
    if (user && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
      try {
        const data = await requestJson('/admin/shift-config')
        if (data.config) {
          setShiftConfigForm({
            shiftStart: data.config.shiftStart || '08:00',
            shiftEnd: data.config.shiftEnd || '17:00',
            windowCheckinStart: data.config.windowCheckinStart || '07:00',
            windowCheckinEnd: data.config.windowCheckinEnd || '10:00',
            windowCheckoutStart: data.config.windowCheckoutStart || '16:00',
            windowCheckoutEnd: data.config.windowCheckoutEnd || '20:00',
            gracePeriodMinutes: data.config.gracePeriodMinutes ?? 5,
            cooldownMinutes: data.config.cooldownMinutes ?? 2,
            otThresholdMinutes: data.config.otThresholdMinutes ?? 30
          })
        }
      } catch (e) {
        // Ignore
      }
    }
  }, [user, requestJson])

  const handleSaveShiftConfig = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await requestJson('/admin/shift-config', {
        method: 'POST',
        body: JSON.stringify(shiftConfigForm)
      })
      showMessage(data.message, 'success')
    } catch (error) {
      showMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Load data on login ───
  const loadHistory = useCallback(async () => {
    try {
      const qParams = [];
      if (historyMonth) qParams.push(`month=${historyMonth}`);
      if (selectedEmployeeId) qParams.push(`userId=${selectedEmployeeId}`);

      const queryStr = qParams.length > 0 ? `?${qParams.join('&')}` : '';
      const data = await requestJson(`/attendance/history${queryStr}`)
      setHistory(data.history || [])
      setSummary(data.summary || null)
    } catch (error) {
      // Silently fail or log
    }
  }, [historyMonth, selectedEmployeeId, requestJson])

  const loadSubscription = useCallback(async () => {
    try {
      const data = await requestJson('/billing/subscription')
      if (data.subscription) {
        setSubscription(data.subscription)
      }
    } catch (e) {
      // Ignore
    }
  }, [requestJson])

  // Fetch admin user lists (Only for Manager/Admin roles)
  const fetchEmployeeList = useCallback(async () => {
    if (user && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
      try {
        const data = await requestJson('/admin/users')
        setAdminUsers(data.users || [])
      } catch (e) {
        // ignore
      }
    }
  }, [user, requestJson])

  // Fetch summary stats list for each person
  const fetchEmployeeStatsSummary = useCallback(async () => {
    if (user && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
      try {
        const data = await requestJson('/admin/attendance/summary')
        setEmployeeStatsSummary(data.summary || [])
      } catch (e) {
        // ignore
      }
    }
  }, [user, requestJson])

  useEffect(() => {
    if (token) {
      loadHistory()
      loadSubscription()
      fetchEmployeeList()
      fetchEmployeeStatsSummary()
    }
  }, [token, loadHistory, loadSubscription, fetchEmployeeList, fetchEmployeeStatsSummary])

  // Reload history when selecting another employee (Manager/Admin action)
  useEffect(() => {
    if (token) {
      loadHistory()
    }
  }, [selectedEmployeeId, token, loadHistory])

  // ─── Check URL for payment completion parameters ───
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('payment')
    const orderCode = params.get('orderCode')

    if (status && orderCode && user) {
      window.history.replaceState({}, document.title, window.location.pathname)

      if (status === 'success') {
        setLoading(true)
        requestJson('/billing/webhook', {
          method: 'POST',
          body: JSON.stringify({ orderCode: Number(orderCode), status: 'PAID', tenantId: user.tenantId })
        }).then(() => {
          showMessage(`Thanh toán nâng cấp Pro thành công cho Order #${orderCode}!`, 'success')
          loadSubscription()
        }).catch((err) => {
          showMessage(err.message)
        }).finally(() => {
          setLoading(false)
        })
      } else if (status === 'cancel') {
        showMessage(`Giao dịch nâng cấp đơn hàng #${orderCode} đã bị hủy.`, 'error')
      }
    }
  }, [user, requestJson, showMessage, loadSubscription])

  // ─── Profile form sync ───
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  async function loadAdminUsers() {
    try {
      const data = await requestJson('/admin/users')
      setAdminUsers(data.users || [])
    } catch (error) {
      showMessage(error.message)
    }
  }

  // ─── Dashboard Summary ───
  const dashboardStats = useMemo(() => {
    if (!summary) return { total: 0, checkins: 0, checkouts: 0, days: 0 }
    return {
      total: summary.totalRecords || 0,
      checkins: summary.totalCheckins || 0,
      checkouts: summary.totalCheckouts || 0,
      days: summary.totalDays || 0,
    }
  }, [summary])

  // ─── Dynamic Weekly Attendance Chart (derived from real history) ───
  const weeklyAttendanceChart = useMemo(() => {
    const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'];

    // Calculate dates for Monday–Friday of the current week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon … 6=Sat
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // rewind to Monday
    monday.setHours(0, 0, 0, 0);

    const weekDates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().substring(0, 10); // "YYYY-MM-DD"
    });

    return dayLabels.map((label, idx) => {
      const dateStr = weekDates[idx];
      const todayStr = now.toISOString().substring(0, 10);
      const isFuture = dateStr > todayStr;

      // Find CHECKIN / CHECKOUT records for this date
      const checkinRec = history.find(
        r => r.Action === 'CHECKIN' && r.Timestamp?.substring(0, 10) === dateStr
      );
      const checkoutRec = history.find(
        r => r.Action === 'CHECKOUT' && r.Timestamp?.substring(0, 10) === dateStr
      );

      const fmtTime = (ts) => {
        if (!ts) return '--:--';
        const d = new Date(ts);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      };

      const hasCheckin = !!checkinRec;
      const hasCheckout = !!checkoutRec;

      let status, rate;
      if (hasCheckin && hasCheckout) {
        status = 'CHECKED';
        rate = 100;
      } else if (hasCheckin) {
        status = 'PARTIAL';
        rate = 50;
      } else if (isFuture) {
        status = 'FUTURE';
        rate = 0;
      } else {
        status = 'MISSING';
        rate = 0;
      }

      return {
        day: label,
        date: dateStr,
        status,
        checkIn: fmtTime(checkinRec?.Timestamp),
        checkOut: fmtTime(checkoutRec?.Timestamp),
        rate,
      };
    });
  }, [history]);

  // ═══════════════════════════════════════════════════════════════
  //  AUTH HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await requestJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: authForm.tenantId,
          userId: authForm.userId,
          password: authForm.password,
        }),
      })
      localStorage.setItem('attendanceToken', data.token)
      localStorage.setItem('attendanceUser', JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      showMessage('Đăng nhập thành công!', 'success')
      setAuthForm(prev => ({ ...prev, password: '' }))
    } catch (error) {
      showMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterRequest = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await requestJson('/auth/register/request', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: authForm.tenantId,
          userId: authForm.userId,
          password: authForm.password,
          fullName: authForm.fullName,
          email: authForm.email,
          phone: authForm.phone,
          otpType: authForm.otpType,
        }),
      })
      showMessage(data.message, 'success')
      setMode('verify')
    } catch (error) {
      showMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await requestJson('/auth/register/verify', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: authForm.tenantId,
          userId: authForm.userId,
          otpCode: authForm.otpCode,
        }),
      })
      showMessage(data.message, 'success')
      setMode('login')
      setAuthForm(prev => ({ ...prev, otpCode: '', password: '' }))
    } catch (error) {
      showMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('attendanceToken')
    localStorage.removeItem('attendanceUser')
    setToken('')
    setUser(null)
    setHistory([])
    setSummary(null)
    setAdminUsers([])
    setEmployeeStatsSummary([])
    setCurrentPage('dashboard')
    setMode('login')
    setSelectedEmployeeId('')
    setReportEmployeeId('ALL')
    showMessage('Đã đăng xuất khỏi hệ thống', 'info')
  }

  const handleCheckAction = async (actionType) => {
    setLoading(true)
    try {
      const endpoint = actionType === 'OUT' ? '/attendance/check-out' : '/attendance/check-in'
      const data = await requestJson(endpoint, {
        method: 'POST',
        body: JSON.stringify({ gpsLocation: gpsCoords, actionType }),
      })
      showMessage(data.message, 'success')
      await loadHistory()
    } catch (error) {
      showMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const uParam = reportEmployeeId && reportEmployeeId !== 'ALL' ? `?userId=${reportEmployeeId}` : '';
      const response = await fetch(`${apiBaseUrl}/attendance/export/${reportMonth}${uParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.message || 'Xuất báo cáo không thành công')
      }
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `BaoCao_ChamCong_${reportMonth}.xlsx`
      link.click()
      window.URL.revokeObjectURL(downloadUrl)
      showMessage(`Đã tải báo cáo ${reportMonth}`, 'success')
    } catch (error) {
      showMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Profile Update ───
  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await requestJson('/profile/update', {
        method: 'PATCH',
        body: JSON.stringify(profileForm),
      })
      showMessage(data.message, 'success')
      const updatedUser = { ...user, ...profileForm }
      setUser(updatedUser)
      localStorage.setItem('attendanceUser', JSON.stringify(updatedUser))
    } catch (error) {
      showMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Admin settings ───
  const handleUpdateUserRole = async (targetUserId, newRole) => {
    try {
      const data = await requestJson('/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ targetUserId, newRole }),
      })
      showMessage(data.message, 'success')
      loadAdminUsers()
    } catch (error) {
      showMessage(error.message)
    }
  }

  const handleToggleUserActive = async (targetUserId, isActive) => {
    try {
      const data = await requestJson('/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ targetUserId, isActive }),
      })
      showMessage(data.message, 'success')
      loadAdminUsers()
    } catch (error) {
      showMessage(error.message)
    }
  }

  // ─── User CRUD Handlers (Admin Only) ───

  const openCreateUserModal = () => {
    setUserForm({ userId: '', password: '', fullName: '', email: '', phone: '', role: 'EMPLOYEE' })
    setUserModalMode('create')
    setShowUserModal(true)
  }

  const openEditUserModal = (u) => {
    setEditingUserId(u.userId)
    setUserForm({ userId: u.userId, password: '', fullName: u.fullName, email: u.email, phone: u.phone, role: u.role })
    setUserModalMode('edit')
    setShowUserModal(true)
  }

  const handleUserFormSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (userModalMode === 'create') {
        await requestJson('/admin/users/create', {
          method: 'POST',
          body: JSON.stringify({
            userId: userForm.userId,
            password: userForm.password,
            fullName: userForm.fullName,
            email: userForm.email,
            phone: userForm.phone,
            newRole: userForm.role,
          })
        })
        showMessage(`Tạo tài khoản "${userForm.userId}" thành công!`, 'success')
      } else {
        await requestJson('/admin/users/profile', {
          method: 'PATCH',
          body: JSON.stringify({
            targetUserId: editingUserId,
            fullName: userForm.fullName,
            email: userForm.email,
            phone: userForm.phone,
          })
        })
        showMessage(`Cập nhật hồ sơ "${editingUserId}" thành công!`, 'success')
      }
      setShowUserModal(false)
      loadAdminUsers()
      fetchEmployeeStatsSummary()
    } catch (err) {
      showMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (targetUserId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản "${targetUserId}" và tất cả dữ liệu chấm công liên quan?`)) return
    setLoading(true)
    try {
      await requestJson('/admin/users/delete', {
        method: 'DELETE',
        body: JSON.stringify({ targetUserId })
      })
      showMessage(`Đã xóa tài khoản "${targetUserId}" thành công!`, 'success')
      loadAdminUsers()
      fetchEmployeeStatsSummary()
    } catch (err) {
      showMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Attendance Log CRUD Functions (Admin Mode Only) ───

  const openAttendanceCrud = async (targetId, targetName) => {
    setCrudUserId(targetId)
    setCrudUserName(targetName)
    setLoading(true)
    try {
      const data = await requestJson(`/attendance/history?userId=${targetId}`)
      setCrudUserLogs(data.history || [])
      setIsEditingLog(false)
      setLogForm({
        timestamp: new Date().toISOString().slice(0, 16),
        action: 'CHECKIN',
        device: 'Điều chỉnh thủ công'
      })
      setShowCrudModal(true)
    } catch (e) {
      showMessage(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reloadCrudLogs = async () => {
    try {
      const data = await requestJson(`/attendance/history?userId=${crudUserId}`)
      setCrudUserLogs(data.history || [])
    } catch (e) {
      // ignore
    }
  }

  const handleLogFormSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        targetUserId: crudUserId,
        timestamp: new Date(logForm.timestamp).toISOString(),
        action: logForm.action,
        device: logForm.device
      }

      if (isEditingLog) {
        // Update record (calls PATCH)
        await requestJson('/admin/attendance', {
          method: 'PATCH',
          body: JSON.stringify({
            ...body,
            originalSk: editLogOriginalSk
          })
        })
        showMessage('Cập nhật bản ghi thành công!', 'success')
      } else {
        // Create record (calls POST)
        await requestJson('/admin/attendance', {
          method: 'POST',
          body: JSON.stringify(body)
        })
        showMessage('Thêm bản ghi thủ công thành công!', 'success')
      }

      // Reset states
      setIsEditingLog(false)
      setLogForm({
        timestamp: new Date().toISOString().slice(0, 16),
        action: 'CHECKIN',
        device: 'Điều chỉnh thủ công'
      })

      await reloadCrudLogs()
      await fetchEmployeeStatsSummary()
      await loadHistory()
    } catch (err) {
      showMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  const startEditLog = (item) => {
    setIsEditingLog(true)
    setEditLogOriginalSk(item.SK)
    setLogForm({
      timestamp: new Date(item.Timestamp).toISOString().slice(0, 16),
      action: item.Action,
      device: item.DeviceVerified
    })
  }

  const handleCancelEdit = () => {
    setIsEditingLog(false)
    setLogForm({
      timestamp: new Date().toISOString().slice(0, 16),
      action: 'CHECKIN',
      device: 'Điều chỉnh thủ công'
    })
  }

  const handleDeleteLog = async (sk) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi chấm công này?')) return;
    setLoading(true)
    try {
      await requestJson('/admin/attendance', {
        method: 'DELETE',
        body: JSON.stringify({ targetUserId: crudUserId, sk })
      })
      showMessage('Xóa bản ghi chấm công thành công!', 'success')
      await reloadCrudLogs()
      await fetchEmployeeStatsSummary()
      await loadHistory()
    } catch (err) {
      showMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Upgrade & payment ───
  const handleUpgrade = async (packageName, price) => {
    setLoading(true)
    try {
      const data = await requestJson('/billing/create-payment', {
        method: 'POST',
        body: JSON.stringify({
          amount: price,
          packageName: packageName
        })
      })

      if (data.checkoutUrl) {
        if (data.checkoutUrl.includes('mock=true')) {
          setActiveOrder({ orderCode: data.orderCode, packageName, amount: price })
          setShowCheckoutModal(true)
        } else {
          window.location.href = data.checkoutUrl
        }
      }
    } catch (e) {
      showMessage(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMockPaymentSuccess = async () => {
    setShowCheckoutModal(false)
    setLoading(true)
    try {
      await requestJson('/billing/webhook', {
        method: 'POST',
        body: JSON.stringify({
          orderCode: activeOrder.orderCode,
          status: 'PAID',
          tenantId: user.tenantId
        })
      })
      showMessage(`Cảm ơn bạn! Doanh nghiệp đã được nâng cấp lên gói ${activeOrder.packageName} thành công!`, 'success')
      await loadSubscription()
    } catch (e) {
      showMessage('Giao dịch lỗi: ' + e.message)
    } finally {
      setLoading(false)
      setActiveOrder(null)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  REQUESTS, LEAVE, SCHEDULE, AUDIT API FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  const loadMyRequests = async () => {
    try {
      const res = await fetch(`${API}/requests/my-requests`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setMyRequests(data.requests || [])
    } catch (e) { setMyRequests([]) }
  }

  const loadPendingRequests = async () => {
    try {
      const res = await fetch(`${API}/manager/requests`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setPendingRequests(data.requests || [])
    } catch (e) { setPendingRequests([]) }
  }

  const loadLeaveBalance = async () => {
    try {
      const res = await fetch(`${API}/user/leave-balance`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setLeaveBalance(data.leaveBalance || { totalDays: 12, usedDays: 0, remainingDays: 12, pendingCount: 0 })
    } catch (e) { /* keep defaults */ }
  }

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/requests/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm)
      })
      const data = await res.json()
      showMessage(data.message, res.ok ? 'success' : 'error')
      if (res.ok) {
        setRequestForm({ type: 'LEAVE', startDate: '', endDate: '', reason: '', otHours: 0 })
        await loadMyRequests()
        await loadLeaveBalance()
      }
    } catch (e) { showMessage('Lỗi gửi đơn: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  const handleApproveReject = async (requestId, status) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/manager/requests/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, reviewComment })
      })
      const data = await res.json()
      showMessage(data.message, res.ok ? 'success' : 'error')
      if (res.ok) {
        setReviewComment('')
        await loadPendingRequests()
      }
    } catch (e) { showMessage('Lỗi xử lý đơn: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  const loadMyShifts = async () => {
    try {
      const res = await fetch(`${API}/user/shifts`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setMyShifts(data.shifts || [])
    } catch (e) { setMyShifts([]) }
  }

  const loadTeamShifts = async () => {
    try {
      const res = await fetch(`${API}/manager/shifts`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setTeamShifts(data.shifts || [])
    } catch (e) { setTeamShifts([]) }
  }

  const handleAssignShift = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/manager/shifts/assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftAssignForm)
      })
      const data = await res.json()
      showMessage(data.message, res.ok ? 'success' : 'error')
      if (res.ok) {
        setShiftAssignForm({ targetUserId: '', weekDate: '', shiftType: 'CA_HANH_CHINH', note: '' })
        await loadTeamShifts()
      }
    } catch (e) { showMessage('Lỗi phân ca: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  const loadAuditLogs = async () => {
    try {
      const res = await fetch(`${API}/admin/audit-logs`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setAuditLogs(data.logs || [])
    } catch (e) { setAuditLogs([]) }
  }

  // ═══════════════════════════════════════════════════════════════
  //  PAGE NAVIGATION
  // ═══════════════════════════════════════════════════════════════

  const navigateTo = (page) => {
    setCurrentPage(page)
    setSidebarOpen(false)
    setMessage('')

    if (page === 'admin') {
      loadAdminUsers()
      fetchEmployeeStatsSummary()
    }
    if (page === 'history') {
      setSelectedEmployeeId('')
      loadHistory()
      fetchEmployeeList()
    }
    if (page === 'reports') {
      setReportEmployeeId('ALL')
      fetchEmployeeList()
    }
    if (page === 'billing') loadSubscription()
    if (page === 'requests') {
      loadMyRequests()
      loadLeaveBalance()
      if (isManagerOrAdminRole(userRole)) loadPendingRequests()
    }
    if (page === 'schedule') {
      loadMyShifts()
      if (isManagerOrAdminRole(userRole)) {
        loadTeamShifts()
        fetchEmployeeList()
      }
    }
    if (page === 'audit') loadAuditLogs()
  }

  const handleFieldChange = (e) => {
    const { name, value } = e.target
    setAuthForm(prev => ({ ...prev, [name]: value }))
  }

  // ═══════════════════════════════════════════════════════════════
  //  NAV ITEMS CONFIG (Privilege restricted tabs)
  // ═══════════════════════════════════════════════════════════════

  const userRole = user?.role || 'USER'

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: Icons.dashboard },
    { id: 'attendance', label: 'Chấm công', icon: Icons.clock },
    { id: 'history', label: 'Lịch sử', icon: Icons.history },
    { id: 'requests', label: 'Đơn từ', icon: Icons.request },
    { id: 'schedule', label: 'Lịch làm việc', icon: Icons.schedule },
    { id: 'reports', label: 'Báo cáo', icon: Icons.report },
    { id: 'divider1', type: 'divider' },
    { id: 'profile', label: 'Hồ sơ', icon: Icons.profile },
    { id: 'admin', label: 'Quản trị', icon: Icons.admin, roles: ['ADMIN', 'TENANT_ADMIN', 'MANAGER'] },
    { id: 'billing', label: 'Gói dịch vụ', icon: Icons.billing, roles: ['ADMIN', 'TENANT_ADMIN'] },
    { id: 'audit', label: 'Nhật ký hệ thống', icon: Icons.auditLog, roles: ['ADMIN', 'TENANT_ADMIN'] },
  ]

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: AUTH SCREENS
  // ═══════════════════════════════════════════════════════════════

  if (!user) {
    return (
      <div className="app-shell auth-mode">
        {/* Floating theme toggle on auth screen */}
        <button
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
            width: '42px', height: '42px', borderRadius: '50%',
            border: '1px solid var(--color-border-subtle)',
            background: 'var(--color-bg-card)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '1.2rem',
            boxShadow: 'var(--shadow-md)',
          }}
          title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="auth-container">
          {message && <div className={`notice ${messageType}`}>{message}</div>}

          <div className="auth-card">
            <div className="auth-logo">
              <h1>⚡ Smart Attendance</h1>
              <p>Hệ thống chấm công SaaS thông minh</p>
            </div>

            {mode !== 'verify' && (
              <div className="auth-tabs">
                <button type="button" className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
                  Đăng nhập
                </button>
                <button type="button" className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
                  Đăng ký
                </button>
              </div>
            )}

            {mode === 'login' && (
              <form className="form-stack" onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Mã doanh nghiệp</label>
                  <input className="form-input" name="tenantId" placeholder="VD: COMPANY001" value={authForm.tenantId} onChange={handleFieldChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Tài khoản</label>
                  <input className="form-input" name="userId" placeholder="Nhập tài khoản" value={authForm.userId} onChange={handleFieldChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <input className="form-input" type="password" name="password" placeholder="••••••••" value={authForm.password} onChange={handleFieldChange} required />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? <><span className="spinner"></span> Đang xử lý...</> : 'Đăng nhập'}
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form className="form-stack" onSubmit={handleRegisterRequest}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mã doanh nghiệp</label>
                    <input className="form-input" name="tenantId" placeholder="VD: COMPANY001" value={authForm.tenantId} onChange={handleFieldChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tài khoản</label>
                    <input className="form-input" name="userId" placeholder="Nhập tài khoản" value={authForm.userId} onChange={handleFieldChange} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <input className="form-input" type="password" name="password" placeholder="Tối thiểu 8 ký tự" value={authForm.password} onChange={handleFieldChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input className="form-input" name="fullName" placeholder="Nguyễn Văn A" value={authForm.fullName} onChange={handleFieldChange} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" name="email" placeholder="email@company.com" value={authForm.email} onChange={handleFieldChange} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input className="form-input" name="phone" placeholder="0901234567" value={authForm.phone} onChange={handleFieldChange} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Kênh nhận OTP</label>
                  <select className="form-select" name="otpType" value={authForm.otpType} onChange={handleFieldChange}>
                    <option value="PHONE">SMS</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? <><span className="spinner"></span> Đang gửi OTP...</> : 'Gửi mã OTP'}
                </button>
              </form>
            )}

            {mode === 'verify' && (
              <form className="form-stack" onSubmit={handleRegisterVerify}>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
                  Mã OTP đã được gửi. Kiểm tra terminal backend để lấy mã.
                </p>
                <div className="form-group">
                  <label className="form-label">Mã OTP</label>
                  <input className="form-input" name="otpCode" placeholder="6 chữ số" value={authForm.otpCode} onChange={handleFieldChange} required />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? <><span className="spinner"></span> Đang xác nhận...</> : 'Xác nhận'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setMode('register')}>
                  ← Quay lại
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER: MAIN DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <>
            <div className="page-header">
              <p className="eyebrow">Tổng quan</p>
              <h2>Xin chào, {user.fullName || user.userId} 👋</h2>
              <p className="subtitle">Chào mừng bạn quay lại hệ thống chấm công thông minh.</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card accent" style={{ animationDelay: '0ms' }}>
                <div className="stat-icon">{Icons.activity}</div>
                <div className="stat-value">{dashboardStats.total}</div>
                <div className="stat-label">Tổng bản ghi</div>
              </div>
              <div className="stat-card success" style={{ animationDelay: '80ms' }}>
                <div className="stat-icon">{Icons.checkin}</div>
                <div className="stat-value">{dashboardStats.checkins}</div>
                <div className="stat-label">Số lần Check-in</div>
              </div>
              <div className="stat-card info" style={{ animationDelay: '160ms' }}>
                <div className="stat-icon">{Icons.checkout}</div>
                <div className="stat-value">{dashboardStats.checkouts}</div>
                <div className="stat-label">Số lần Check-out</div>
              </div>
              <div className="stat-card warning" style={{ animationDelay: '240ms' }}>
                <div className="stat-icon">{Icons.calendar}</div>
                <div className="stat-value">{dashboardStats.days}</div>
                <div className="stat-label">Ngày công</div>
              </div>
            </div>

            <div className="content-grid cols-2">
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="card-header" style={{ marginBottom: 0, paddingBottom: 'var(--space-sm)' }}>
                  <div>
                    <div className="card-title">Thống kê tuần này</div>
                    <div className="card-subtitle">Lịch trình làm việc và ghi nhận thời gian</div>
                  </div>
                </div>

                <div className="weekly-chart-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-md)' }}>
                  {weeklyAttendanceChart.map((d) => {
                    const barClass =
                      d.status === 'CHECKED' ? 'active-gradient' :
                        d.status === 'PARTIAL' ? 'partial-gradient' : '';
                    const timeColor =
                      d.status === 'CHECKED' ? '#34d399' :
                        d.status === 'PARTIAL' ? '#fbbf24' :
                          'var(--color-text-muted)';
                    const timeLabel =
                      d.status === 'CHECKED' ? `${d.checkIn} - ${d.checkOut}` :
                        d.status === 'PARTIAL' ? `${d.checkIn} (chưa out)` :
                          d.status === 'FUTURE' ? 'Chưa đến' :
                            'Nghỉ / Trễ';

                    return (
                      <div key={d.day} className="weekly-chart-row" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <span style={{ width: '50px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{d.day}</span>
                        <div className="bar-wrapper" style={{ flex: 1, background: 'rgba(255,255,255,0.03)', height: '18px', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--color-border-subtle)' }}>
                          <div
                            className={`bar-fill ${barClass}`}
                            style={{ width: `${d.rate}%`, height: '100%', transition: 'width 0.8s ease' }}
                          ></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: timeColor, width: '110px', textAlign: 'right' }}>
                          {timeLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Chấm công nhanh</div>
                    <div className="card-subtitle">Nhấn để ghi nhận ca làm việc</div>
                  </div>
                </div>
                <div style={{ padding: 'var(--space-md) 0' }}>
                  <div className="live-clock">
                    {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="live-clock-date">
                    {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div className="check-actions">
                  <button className="check-btn checkin-btn" onClick={() => handleCheckAction('IN')} disabled={loading}>
                    <div className="check-icon">{Icons.checkin}</div>
                    <span className="check-label">Check-in</span>
                    <span className="check-sub">Vào ca</span>
                  </button>
                  <button className="check-btn checkout-btn" onClick={() => handleCheckAction('OUT')} disabled={loading}>
                    <div className="check-icon">{Icons.checkout}</div>
                    <span className="check-label">Check-out</span>
                    <span className="check-sub">Ra ca</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-md)' }}>
              <div className="card-header">
                <div>
                  <div className="card-title">Hoạt động gần đây</div>
                  <div className="card-subtitle">Bản ghi chấm công mới nhất</div>
                </div>
              </div>
              {history.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Thao tác</th>
                      <th>Thời gian</th>
                      <th>Hình thức xác thực</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 5).map((item, i) => (
                      <tr key={`${item.Timestamp}-${i}`}>
                        <td>
                          <span className={`badge ${item.Action === 'CHECKIN' ? 'checkin' : 'checkout'}`}>
                            <span className="badge-dot"></span>
                            {item.Action === 'CHECKIN' ? 'Check-in' : 'Check-out'}
                          </span>
                        </td>
                        <td>{new Date(item.Timestamp).toLocaleString('vi-VN')}</td>
                        <td>{item.DeviceVerified}</td>
                        <td><span className="badge active"><span className="badge-dot"></span>{item.Status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  {Icons.clock}
                  <p>Chưa có bản ghi chấm công nào.</p>
                </div>
              )}
            </div>
          </>
        )

      case 'attendance':
        return (
          <>
            <div className="page-header">
              <p className="eyebrow">Chấm công</p>
              <h2>Ghi nhận ca làm việc</h2>
              <p className="subtitle">Xác thực định vị GPS tự động để ghi nhận giờ ra vào ca làm việc chính xác.</p>
            </div>

            <div className="content-grid cols-2" style={{ alignItems: 'start' }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Ghi nhận giờ làm việc</div>
                </div>
                <div style={{ padding: 'var(--space-sm) 0 var(--space-md)' }}>
                  <div className="live-clock" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="live-clock-date">
                    {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                <div className="wifi-section" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(6, 182, 212, 0.03) 100%)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-md)' }}>
                  <div className="wifi-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' }}>
                    📍 Thông tin vị trí GPS
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                      <span className={`wifi-status-dot ${gpsMode === 'OFFICE' ? 'active-green' : 'active-red'}`}></span>
                      {Icons.mapPin}
                      <span style={{ color: 'var(--color-text-secondary)' }}>Tọa độ hiện tại:</span>
                      <strong style={{ fontFamily: 'monospace', color: 'var(--color-accent-hover)' }}>{gpsCoords}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginTop: '4px' }}>
                      <span className="badge active" style={{ background: gpsMode === 'OFFICE' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)', color: gpsMode === 'OFFICE' ? '#34d399' : '#f87171', border: gpsMode === 'OFFICE' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(248, 113, 113, 0.3)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                        {gpsMode === 'OFFICE' ? '● Trong phạm vi văn phòng' : '● Vẫn ở ngoài văn phòng'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="check-actions">
                  <button className="check-btn checkin-btn" onClick={() => handleCheckAction('IN')} disabled={loading}>
                    <div className="check-icon">{Icons.checkin}</div>
                    <span className="check-label">Check-in Vào Ca</span>
                  </button>
                  <button className="check-btn checkout-btn" onClick={() => handleCheckAction('OUT')} disabled={loading}>
                    <div className="check-icon">{Icons.checkout}</div>
                    <span className="check-label">Check-out Ra Ca</span>
                  </button>
                </div>
              </div>

              {/* Sandbox Testing Console */}
              <div className="card" style={{ border: '1px solid rgba(14, 165, 233, 0.25)', boxShadow: '0 8px 32px rgba(14, 165, 233, 0.08)' }}>
                <div className="card-header">
                  <div>
                    <div className="card-title" style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {Icons.settings} Giả lập vị trí GPS (Sandbox)
                    </div>
                    <div className="card-subtitle">Mô phỏng tọa độ GPS để kiểm thử quy tắc an ninh định vị ca làm việc</div>
                  </div>
                </div>

                <div className="form-stack">
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#38bdf8' }}>Giả lập định vị vệ tinh GPS</label>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${gpsMode === 'OFFICE' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setGpsMode('OFFICE')}
                          style={{ flex: 1, fontWeight: 700 }}
                        >
                          📍 Trong Văn phòng
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${gpsMode === 'OUTSIDE' ? 'btn-danger' : 'btn-ghost'}`}
                          onClick={() => setGpsMode('OUTSIDE')}
                          style={{ flex: 1, fontWeight: 700 }}
                        >
                          🚗 Ngoài Văn phòng
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={fetchRealGpsLocation}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontWeight: 600 }}
                      >
                        {Icons.mapPin} Lấy GPS thực tế từ Trình duyệt
                      </button>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                    💡 <strong>Mẹo kiểm thử:</strong> Đặt chế độ <em>Ngoài Văn phòng</em> và nhấn Check-in. Hệ thống sẽ đối soát tọa độ GPS và từ chối ghi nhận ngay lập tức!
                  </div>
                </div>
              </div>
            </div>
          </>
        )

      case 'history':
        return (
          <>
            <div className="page-header">
              <p className="eyebrow">Lịch sử</p>
              <h2>Nhật ký chấm công</h2>
              <p className="subtitle">
                {user.role === 'ADMIN' || user.role === 'MANAGER'
                  ? 'Quản lý lịch sử chấm công của tất cả nhân sự doanh nghiệp.'
                  : 'Xem lại toàn bộ bản ghi chấm công của bạn.'}
              </p>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Bản ghi chấm công</div>

                <div className="inline-actions">
                  {/* Privileged Feature: Filter logs by target employee (Manager/Admin Only) */}
                  {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                    <div className="form-group">
                      <label className="form-label">Chọn nhân sự</label>
                      <select
                        className="form-select"
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        style={{ minWidth: '180px' }}
                      >
                        <option value="">Tôi ({user.userId})</option>
                        {adminUsers.map(u => (
                          u.userId !== user.userId && (
                            <option key={u.userId} value={u.userId}>{u.fullName || u.userId} ({u.userId})</option>
                          )
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Lọc theo tháng</label>
                    <input className="form-input" type="month" value={historyMonth} onChange={(e) => setHistoryMonth(e.target.value)} />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={loadHistory}>Tải lại</button>
                </div>
              </div>

              {history.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Thao tác</th>
                        <th>Ngày</th>
                        <th>Giờ</th>
                        <th>Thiết bị xác thực</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item, i) => (
                        <tr key={`${item.SK}-${i}`}>
                          <td>
                            <span className={`badge ${item.Action === 'CHECKIN' ? 'checkin' : 'checkout'}`}>
                              <span className="badge-dot"></span>
                              {item.Action === 'CHECKIN' ? 'Check-in' : 'Check-out'}
                            </span>
                          </td>
                          <td>{new Date(item.Timestamp).toLocaleDateString('vi-VN')}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>{new Date(item.Timestamp).toLocaleTimeString('vi-VN')}</td>
                          <td>{item.DeviceVerified}</td>
                          <td>
                            {item.Status === 'LATE' ? (
                              <span className="badge inactive" style={{ background: 'rgba(248, 113, 113, 0.15)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
                                ⚠️ Đi muộn
                              </span>
                            ) : item.Status === 'ON_TIME' ? (
                              <span className="badge active" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                                ✅ Đúng giờ
                              </span>
                            ) : item.Status === 'OVERTIME' ? (
                              <span className="badge active" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                💪 OT ({item.OvertimeMinutes || 0}m)
                              </span>
                            ) : (
                              <span className="badge active"><span className="badge-dot"></span>{item.Status}</span>
                            )}
                            {item.Note && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{item.Note}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  {Icons.history}
                  <p>Chưa có bản ghi nào cho khoảng thời gian này.</p>
                </div>
              )}
            </div>
          </>
        )

      case 'reports':
        return (
          <>
            <div className="page-header">
              <p className="eyebrow">Báo cáo</p>
              <h2>Xuất báo cáo theo tháng</h2>
              <p className="subtitle">
                {user.role === 'ADMIN' || user.role === 'MANAGER'
                  ? 'Trích xuất và tải báo cáo Excel tổng hợp của doanh nghiệp.'
                  : 'Tải xuống báo cáo chấm công dạng Excel của riêng bạn.'}
              </p>
            </div>

            <div className="card" style={{ maxWidth: 600 }}>
              <div className="card-header">
                <div className="card-title">Xuất báo cáo Excel</div>
              </div>
              <form className="form-stack" onSubmit={handleExportReport}>
                {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                  <div className="form-group">
                    <label className="form-label">Phạm vi nhân sự xuất báo cáo</label>
                    <select
                      className="form-select"
                      value={reportEmployeeId}
                      onChange={(e) => setReportEmployeeId(e.target.value)}
                    >
                      <option value="ALL">Tất cả nhân sự (Tổng hợp)</option>
                      <option value={user.userId}>Chỉ riêng tôi ({user.userId})</option>
                      {adminUsers.map(u => (
                        u.userId !== user.userId && (
                          <option key={u.userId} value={u.userId}>{u.fullName || u.userId} ({u.userId})</option>
                        )
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Chọn tháng báo cáo</label>
                  <input className="form-input" type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <><span className="spinner"></span> Đang xuất...</> : <>{Icons.download} Xuất file Excel</>}
                </button>
              </form>
            </div>
          </>
        )

      case 'profile':
        return (
          <>
            <div className="page-header">
              <p className="eyebrow">Hồ sơ</p>
              <h2>Thông tin cá nhân</h2>
              <p className="subtitle">Cập nhật thông tin tài khoản của bạn.</p>
            </div>

            <div className="card" style={{ maxWidth: 600 }}>
              <div className="card-header">
                <div className="card-title">Chỉnh sửa hồ sơ</div>
              </div>
              <form className="form-stack" onSubmit={handleProfileUpdate}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mã doanh nghiệp</label>
                    <input className="form-input" value={user.tenantId} disabled style={{ opacity: 0.5 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tài khoản</label>
                    <input className="form-input" value={user.userId} disabled style={{ opacity: 0.5 }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input className="form-input" value={profileForm.fullName} onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={profileForm.email} onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input className="form-input" value={profileForm.phone} onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <><span className="spinner"></span> Đang lưu...</> : <>{Icons.check} Lưu thay đổi</>}
                </button>
              </form>
            </div>
          </>
        )

      case 'admin':
        const canManage = user.role === 'ADMIN' || user.role === 'MANAGER'
        const planName = subscription?.plan || subscription?.Plan || 'FREE'
        const defaultMax = planName === 'PRO' ? 300 : 50
        const maxAllowed = Number(subscription?.maxUsers || subscription?.MaxUsers || defaultMax)
        const usagePercent = Math.min(100, Math.round((adminUsers.length / maxAllowed) * 100)) || 0

        return (
          <>
            <div className="page-header">
              <p className="eyebrow">Quản trị hệ thống</p>
              <h2>Quản lý nhân sự & Giấy phép</h2>
              <p className="subtitle">
                {user.role === 'ADMIN' 
                  ? 'Quyền hạn: Quản trị viên cấp cao (ADMIN) — Toàn quyền quản lý nhân sự, nâng cấp gói và điều chỉnh hệ thống.'
                  : 'Quyền hạn: Trưởng phòng (MANAGER) — Quyền quản lý nhân viên (CRUD), duyệt hồ sơ và điều chỉnh nhật ký chấm công.'}
              </p>
            </div>

            {/* Prominent Subscription Plan Info Banner */}
            <div className="card" style={{ marginBottom: 'var(--space-lg)', background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(6, 182, 212, 0.04) 100%)', border: '1px solid rgba(14, 165, 233, 0.28)', boxShadow: '0 8px 32px rgba(14, 165, 233, 0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      Gói dịch vụ SaaS
                    </span>
                    <span className="badge active" style={{ background: 'linear-gradient(135deg, #0284c7, #06b6d4)', color: 'white', fontWeight: 800, padding: '4px 14px', fontSize: '0.75rem', borderRadius: 'var(--radius-full)', letterSpacing: '0.05em' }}>
                      {planName} PLAN
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ● Đang hoạt động
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Giới hạn quy mô tối đa: <strong>{maxAllowed} nhân viên</strong>. {planName === 'FREE' ? 'Chấm công GPS, Xuất báo cáo Excel.' : 'Chấm công GPS an ninh cao, Real-time Socket.IO, Webhook.'}
                  </p>
                </div>

                {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => setCurrentPage('billing')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--gradient-primary)', fontWeight: 700 }}
                  >
                    {Icons.billing} Nâng cấp gói Pro ngay
                  </button>
                )}
              </div>

              {/* Usage Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Tỷ lệ sử dụng tài khoản nhân sự:</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-accent-hover)' }}>
                    {adminUsers.length} / {maxAllowed} nhân viên ({usagePercent}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '10px', background: 'rgba(0,0,0,0.35)', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--color-border-subtle)' }}>
                  <div 
                    style={{ 
                      width: `${usagePercent}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.5s ease-in-out'
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Sub navigation buttons inside Admin tab */}
            <div className="auth-tabs" style={{ marginBottom: 'var(--space-lg)', maxWidth: '550px' }}>
              <button 
                type="button" 
                className={`auth-tab ${adminTabMode === 'users' ? 'active' : ''}`} 
                onClick={() => setAdminTabMode('users')}
              >
                Danh sách tài khoản
              </button>
              <button 
                type="button" 
                className={`auth-tab ${adminTabMode === 'stats' ? 'active' : ''}`} 
                onClick={() => { setAdminTabMode('stats'); fetchEmployeeStatsSummary(); }}
              >
                Bảng thống kê chấm công
              </button>
              <button 
                type="button" 
                className={`auth-tab ${adminTabMode === 'shift' ? 'active' : ''}`} 
                onClick={() => { setAdminTabMode('shift'); loadShiftConfig(); }}
              >
                ⚙️ Cấu hình Ca & Quy tắc
              </button>
            </div>

            {adminTabMode === 'users' && (
              <div className="card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                  <div className="card-title">Danh sách nhân viên ({adminUsers.length})</div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    {canManage && (
                      <button className="btn btn-primary btn-sm" onClick={openCreateUserModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Thêm nhân viên
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={loadAdminUsers}>Tải lại</button>
                  </div>
                </div>

                {adminUsers.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Tài khoản</th>
                          <th>Họ tên</th>
                          <th>Email</th>
                          <th>SĐT</th>
                          <th>Vai trò</th>
                          <th>Trạng thái</th>
                          <th style={{ width: '230px', minWidth: '230px' }}>Thao tác CRUD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map((u) => (
                          <tr key={u.userId}>
                            <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.userId}</td>
                            <td>{u.fullName}</td>
                            <td>{u.email}</td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{u.phone || '—'}</td>
                            <td>
                              {user.role === 'ADMIN' ? (
                                <select
                                  className="form-select"
                                  value={u.role}
                                  onChange={(e) => handleUpdateUserRole(u.userId, e.target.value)}
                                  style={{ padding: '4px 24px 4px 8px', fontSize: '0.75rem', fontWeight: 600 }}
                                >
                                  <option value="EMPLOYEE">Employee</option>
                                  <option value="MANAGER">Manager</option>
                                  <option value="ADMIN">Admin</option>
                                </select>
                              ) : (
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{u.role}</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${u.isActive ? 'active' : 'inactive'}`}>
                                <span className="badge-dot"></span>
                                {u.isActive ? 'Hoạt động' : 'Vô hiệu'}
                              </span>
                            </td>
                            <td>
                              {canManage ? (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  <button className="btn btn-ghost btn-sm" title="Sửa hồ sơ" onClick={() => openEditUserModal(u)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                                    ✏️ Sửa
                                  </button>
                                  <button
                                    className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                                    onClick={() => handleToggleUserActive(u.userId, !u.isActive)}
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    disabled={user.role === 'MANAGER' && u.role === 'ADMIN'}
                                  >
                                    {u.isActive ? '🔒 Khóa' : '🔓 Mở'}
                                  </button>
                                  <button
                                    className="btn btn-sm btn-danger"
                                    title="Xóa vĩnh viễn"
                                    onClick={() => handleDeleteUser(u.userId)}
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    disabled={user.role === 'MANAGER' && u.role === 'ADMIN'}
                                  >
                                    🗑️ Xóa
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {Icons.lock} Bị khóa
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    {Icons.users}
                    <p>Chưa có nhân viên nào trong hệ thống.</p>
                  </div>
                )}
              </div>
            )}

            {adminTabMode === 'stats' && (
              <div className="card">
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="card-title">Thống kê chấm công theo nhân sự</div>
                  <button className="btn btn-ghost btn-sm" onClick={fetchEmployeeStatsSummary}>Tải lại</button>
                </div>

                {employeeStatsSummary.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Tài khoản</th>
                          <th>Họ và tên</th>
                          <th>Chức vụ</th>
                          <th>Check-in</th>
                          <th>Check-out</th>
                          <th>Ngày công</th>
                          <th>Điều chỉnh logs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeStatsSummary.map((s) => (
                          <tr key={s.userId}>
                            <td style={{ fontWeight: 600 }}>{s.userId}</td>
                            <td>{s.fullName}</td>
                            <td>
                              <span className={`role-badge`}>{s.role}</span>
                            </td>
                            <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#34d399' }}>{s.checkins}</td>
                            <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#38bdf8' }}>{s.checkouts}</td>
                            <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--color-accent-hover)' }}>{s.days} ngày</td>
                            <td>
                              <button
                                className="btn btn-sm btn-ghost"
                                style={{ borderColor: 'rgba(14,165,233,0.3)', color: '#38bdf8' }}
                                onClick={() => openAttendanceCrud(s.userId, s.fullName)}
                              >
                                🛠️ Điều chỉnh logs
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    {Icons.calendar}
                    <p>Không tìm thấy dữ liệu số liệu chấm công.</p>
                  </div>
                )}
              </div>
            )}

            {adminTabMode === 'shift' && (
              <div className="card">
                <div className="card-header" style={{ marginBottom: 'var(--space-md)' }}>
                  <div>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ⚙️ Cấu hình Ca làm việc & Quy tắc Chấm công
                    </h3>
                    <p className="subtitle" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      Thiết lập khung giờ chuẩn, dung sai đi muộn, khoảng cách chống trùng log và mốc thời gian tính OT.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveShiftConfig}>
                  <fieldset disabled={user.role !== 'ADMIN'} style={{ border: 'none', padding: 0, margin: 0 }}>
                    {/* Group 1: Shift Time */}
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', border: '1px solid var(--color-border-subtle)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-sm)', color: 'var(--color-accent-hover)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🕒 Ca làm việc chuẩn (Shift Time)
                    </h4>
                    <div className="content-grid cols-2" style={{ gap: 'var(--space-md)' }}>
                      <div className="form-group">
                        <label className="form-label">Giờ bắt đầu ca (Check-in chuẩn)</label>
                        <input 
                          type="time" 
                          className="form-input" 
                          value={shiftConfigForm.shiftStart} 
                          onChange={(e) => setShiftConfigForm(prev => ({ ...prev, shiftStart: e.target.value }))}
                          required 
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Mặc định: 08:00</span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Giờ kết thúc ca (Check-out chuẩn)</label>
                        <input 
                          type="time" 
                          className="form-input" 
                          value={shiftConfigForm.shiftEnd} 
                          onChange={(e) => setShiftConfigForm(prev => ({ ...prev, shiftEnd: e.target.value }))}
                          required 
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Mặc định: 17:00</span>
                      </div>
                    </div>
                  </div>

                  {/* Group 2: Window Time */}
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', border: '1px solid var(--color-border-subtle)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-sm)', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🪟 Khung giờ cho phép chấm công (Window Time)
                    </h4>
                    <div className="content-grid cols-2" style={{ gap: 'var(--space-md)' }}>
                      <div className="form-group">
                        <label className="form-label">Khung giờ mở nhận Check-in</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="time" className="form-input" value={shiftConfigForm.windowCheckinStart} onChange={(e) => setShiftConfigForm(p => ({ ...p, windowCheckinStart: e.target.value }))} required />
                          <span style={{ color: 'var(--color-text-secondary)' }}>đến</span>
                          <input type="time" className="form-input" value={shiftConfigForm.windowCheckinEnd} onChange={(e) => setShiftConfigForm(p => ({ ...p, windowCheckinEnd: e.target.value }))} required />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Ví dụ: 07:00 - 10:00</span>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Khung giờ mở nhận Check-out</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input type="time" className="form-input" value={shiftConfigForm.windowCheckoutStart} onChange={(e) => setShiftConfigForm(p => ({ ...p, windowCheckoutStart: e.target.value }))} required />
                          <span style={{ color: 'var(--color-text-secondary)' }}>đến</span>
                          <input type="time" className="form-input" value={shiftConfigForm.windowCheckoutEnd} onChange={(e) => setShiftConfigForm(p => ({ ...p, windowCheckoutEnd: e.target.value }))} required />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Ví dụ: 16:00 - 20:00</span>
                      </div>
                    </div>
                  </div>

                  {/* Group 3: Grace Period & Cooldown Time */}
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', border: '1px solid var(--color-border-subtle)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-sm)', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⏱️ Dung sai & Chống ghi nhận trùng dư thừa
                    </h4>
                    <div className="content-grid cols-2" style={{ gap: 'var(--space-md)' }}>
                      <div className="form-group">
                        <label className="form-label">Thời gian dung sai đi muộn (Grace Period)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="number" 
                            min="0" 
                            max="60" 
                            className="form-input" 
                            value={shiftConfigForm.gracePeriodMinutes} 
                            onChange={(e) => setShiftConfigForm(p => ({ ...p, gracePeriodMinutes: e.target.value }))}
                            required 
                          />
                          <span style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>phút</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Check-in trước ({shiftConfigForm.shiftStart} + {shiftConfigForm.gracePeriodMinutes} phút) vẫn tính Đúng giờ</span>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Thời gian chống trùng lặp (Cooldown Time)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="number" 
                            min="1" 
                            max="30" 
                            className="form-input" 
                            value={shiftConfigForm.cooldownMinutes} 
                            onChange={(e) => setShiftConfigForm(p => ({ ...p, cooldownMinutes: e.target.value }))}
                            required 
                          />
                          <span style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>phút</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Thời gian nghỉ tối thiểu giữa 2 lần bấm máy liên tiếp</span>
                      </div>
                    </div>
                  </div>

                  {/* Group 4: OT Rules */}
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', border: '1px solid var(--color-border-subtle)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--space-sm)', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      💪 Quy tắc Làm thêm giờ (OT Rules)
                    </h4>
                    <div className="form-group" style={{ maxWidth: '400px' }}>
                      <label className="form-label">Mốc tối thiểu bắt đầu tính OT sau ca</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="number" 
                          min="0" 
                          max="180" 
                          className="form-input" 
                          value={shiftConfigForm.otThresholdMinutes} 
                          onChange={(e) => setShiftConfigForm(p => ({ ...p, otThresholdMinutes: e.target.value }))}
                          required 
                        />
                        <span style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>phút</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Làm thêm trên {shiftConfigForm.otThresholdMinutes} phút sau giờ kết thúc ({shiftConfigForm.shiftEnd}) mới bắt đầu tính OT</span>
                    </div>
                  </div>
                  </fieldset>
                  {user.role === 'ADMIN' && (
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '12px 24px', fontWeight: 700, marginTop: 'var(--space-md)' }}>
                      {loading ? <><span className="spinner"></span> Đang lưu...</> : <>💾 Lưu cấu hình ca làm việc</>}
                    </button>
                  )}
                </form>
              </div>
            )}
          </>
        )

      case 'billing':
        const billingPlan = subscription?.plan || subscription?.Plan || 'FREE'
        const defaultBillingMax = billingPlan === 'PRO' ? 300 : 50
        const billingMax = Number(subscription?.maxUsers || subscription?.MaxUsers || defaultBillingMax)
        const billingStatus = subscription?.status || subscription?.Status || 'ACTIVE'

        return (
          <>
            <div className="page-header">
              <p className="eyebrow">Gói dịch vụ</p>
              <h2>Nâng cấp doanh nghiệp</h2>
              <p className="subtitle">Quản lý nâng cấp thanh toán doanh nghiệp (Quyền Admin & Manager).</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="stat-card accent">
                <div className="stat-icon">{Icons.shield}</div>
                <div className="stat-value">{billingPlan} PLAN</div>
                <div className="stat-label">Gói hiện tại ({billingStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Hết hạn'})</div>
              </div>
              <div className="stat-card info">
                <div className="stat-icon">{Icons.users}</div>
                <div className="stat-value">{billingMax} nhân viên</div>
                <div className="stat-label">Giới hạn tài khoản tối đa</div>
              </div>
            </div>

            <div className="content-grid cols-3">
              <div className="plan-card">
                <div className="plan-name">Cơ bản (Miễn phí)</div>
                <div className="plan-price">0₫ <span>/ tháng</span></div>
                <ul className="plan-features">
                  <li>Tối đa <strong>50 nhân viên</strong></li>
                  <li>Chấm công định vị GPS</li>
                  <li>Xuất báo cáo Excel</li>
                  <li>Hỗ trợ email 24/7</li>
                </ul>
                <button className="btn btn-ghost" style={{ width: '100%' }} disabled={billingPlan === 'FREE'}>
                  {billingPlan === 'FREE' ? 'Gói hiện tại' : 'Gói Mặc định'}
                </button>
              </div>

              <div className="plan-card recommended">
                <div className="plan-name">Pro (Khuyên dùng)</div>
                <div className="plan-price">299.000₫ <span>/ tháng</span></div>
                <ul className="plan-features">
                  <li>Tối đa <strong>300 nhân viên</strong></li>
                  <li>Chấm công GPS an ninh cao</li>
                  <li>Báo cáo Excel nâng cao</li>
                  <li>Quản trị nhân sự & Phân quyền</li>
                  <li>Webhook & Realtime Alert</li>
                  <li>Hỗ trợ ưu tiên 24/7</li>
                </ul>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => handleUpgrade('PRO', 299000)}
                  disabled={loading || billingPlan === 'PRO'}
                >
                  {billingPlan === 'PRO' ? 'Gói hiện tại' : 'Nâng cấp Pro ngay'}
                </button>
              </div>

              <div className="plan-card">
                <div className="plan-name">Enterprise</div>
                <div className="plan-price">Liên hệ</div>
                <ul className="plan-features">
                  <li>Trên <strong>300 nhân viên</strong> (Không giới hạn)</li>
                  <li>Multi-tenant isolation</li>
                  <li>SSO / SAML / OIDC</li>
                  <li>API tùy chỉnh doanh nghiệp</li>
                  <li>Cam kết SLA 99.9%</li>
                  <li>Dedicated Support Manager</li>
                </ul>
                <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => showMessage('Vui lòng liên hệ sales@smartattendance.vn', 'info')}>
                  Liên hệ Doanh nghiệp
                </button>
              </div>
            </div>
          </>
        )

      // ═══════════════════════════════════════════════════════════════
      //  REQUESTS PAGE (Đơn từ — All roles)
      // ═══════════════════════════════════════════════════════════════
      case 'requests':
        return (
          <>
            <div className="page-header">
              <p className="eyebrow">Đơn từ & Nghỉ phép</p>
              <h2>{isManagerOrAdminRole(userRole) ? 'Quản lý Đơn từ' : 'Đơn từ Cá nhân'}</h2>
              <p className="subtitle">{isManagerOrAdminRole(userRole) ? 'Duyệt đơn, theo dõi nghỉ phép toàn team' : 'Gửi đơn nghỉ phép, OT, giải trình'}</p>
            </div>

            {/* Leave Balance Card */}
            <div className="stats-grid" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="stat-card accent" style={{ animationDelay: '0ms' }}>
                <div className="stat-icon">{Icons.schedule}</div>
                <div className="stat-value">{leaveBalance.totalDays}</div>
                <div className="stat-label">Tổng ngày phép/năm</div>
              </div>
              <div className="stat-card success" style={{ animationDelay: '80ms' }}>
                <div className="stat-icon">{Icons.approve}</div>
                <div className="stat-value">{leaveBalance.usedDays}</div>
                <div className="stat-label">Đã sử dụng</div>
              </div>
              <div className="stat-card info" style={{ animationDelay: '160ms' }}>
                <div className="stat-icon">{Icons.activity}</div>
                <div className="stat-value" style={{ color: leaveBalance.remainingDays <= 2 ? '#ef4444' : 'inherit' }}>{leaveBalance.remainingDays}</div>
                <div className="stat-label">Còn lại</div>
              </div>
              <div className="stat-card warning" style={{ animationDelay: '240ms' }}>
                <div className="stat-icon">{Icons.clock}</div>
                <div className="stat-value">{leaveBalance.pendingCount}</div>
                <div className="stat-label">Đơn chờ duyệt</div>
              </div>
            </div>

            {/* Leave Balance Progress Bar */}
            <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)' }}>Quỹ phép năm {new Date().getFullYear()}</div>
              <div className="leave-progress-bar">
                <div className="leave-progress-fill" style={{ width: `${Math.min(100, (leaveBalance.usedDays / leaveBalance.totalDays) * 100)}%` }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                <span>Đã dùng: {leaveBalance.usedDays}/{leaveBalance.totalDays} ngày</span>
                <span>Còn lại: {leaveBalance.remainingDays} ngày</span>
              </div>
            </div>

            {/* Submit Request Form */}
            <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>📝 Tạo đơn mới</h3>
              <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label className="form-label">Loại đơn</label>
                    <select className="form-select" value={requestForm.type} onChange={(e) => setRequestForm(p => ({ ...p, type: e.target.value }))}>
                      <option value="LEAVE">🏖️ Nghỉ phép</option>
                      <option value="OT">⏰ Tăng ca (OT)</option>
                      <option value="ADJUSTMENT">📋 Giải trình / Điều chỉnh</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Từ ngày <span style={{ color: '#ef4444' }}>*</span></label>
                    <input className="form-input" type="date" value={requestForm.startDate} onChange={(e) => setRequestForm(p => ({ ...p, startDate: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Đến ngày</label>
                    <input className="form-input" type="date" value={requestForm.endDate} onChange={(e) => setRequestForm(p => ({ ...p, endDate: e.target.value }))} />
                  </div>
                  {requestForm.type === 'OT' && (
                    <div className="form-group">
                      <label className="form-label">Số giờ OT</label>
                      <input className="form-input" type="number" min="0.5" max="12" step="0.5" value={requestForm.otHours} onChange={(e) => setRequestForm(p => ({ ...p, otHours: Number(e.target.value) }))} />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Lý do <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea className="form-input" rows={3} placeholder="Nhập lý do chi tiết..." value={requestForm.reason} onChange={(e) => setRequestForm(p => ({ ...p, reason: e.target.value }))} required style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-accent" disabled={loading}>{loading ? '⏳ Đang gửi...' : '📨 Gửi đơn'}</button>
                </div>
              </form>
            </div>

            {/* Manager/Admin: Pending Requests Approval */}
            {isManagerOrAdminRole(userRole) && (
              <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>📋 Đơn chờ duyệt ({pendingRequests.filter(r => r.Status === 'PENDING').length})</h3>
                {pendingRequests.filter(r => r.Status === 'PENDING').length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {pendingRequests.filter(r => r.Status === 'PENDING').map(req => (
                      <div key={req.RequestId} className="request-approval-card">
                        <div className="request-approval-header">
                          <div>
                            <strong>{req.UserFullName || req.UserId}</strong>
                            <span className={`badge request-type-${req.Type?.toLowerCase()}`} style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '0.65rem' }}>
                              {req.Type === 'LEAVE' ? '🏖️ Nghỉ phép' : req.Type === 'OT' ? '⏰ OT' : '📋 Giải trình'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(req.CreatedAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 'var(--space-sm) 0' }}>
                          <span>📅 {req.StartDate} → {req.EndDate || req.StartDate}</span>
                          {req.OtHours > 0 && <span style={{ marginLeft: '12px' }}>⏰ {req.OtHours}h OT</span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)' }}>💬 {req.Reason}</div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                          <input className="form-input" type="text" placeholder="Ghi chú duyệt đơn (tùy chọn)..." style={{ flex: 1, fontSize: '0.8rem' }} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                          <button className="btn btn-sm btn-accent" disabled={loading} onClick={() => handleApproveReject(req.RequestId, 'APPROVED')} style={{ whiteSpace: 'nowrap' }}>✅ Duyệt</button>
                          <button className="btn btn-sm btn-danger" disabled={loading} onClick={() => handleApproveReject(req.RequestId, 'REJECTED')} style={{ whiteSpace: 'nowrap', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>❌ Từ chối</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state"><p>Không có đơn nào chờ duyệt.</p></div>
                )}
              </div>
            )}

            {/* My Requests History */}
            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>📄 Đơn từ của tôi ({myRequests.length})</h3>
              {myRequests.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Loại</th>
                        <th>Từ ngày</th>
                        <th>Đến ngày</th>
                        <th>Lý do</th>
                        <th>Trạng thái</th>
                        <th>Ngày gửi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRequests.map(req => (
                        <tr key={req.RequestId}>
                          <td><span className={`badge request-type-${req.Type?.toLowerCase()}`}>{req.Type === 'LEAVE' ? 'Nghỉ phép' : req.Type === 'OT' ? 'OT' : 'Giải trình'}</span></td>
                          <td>{req.StartDate}</td>
                          <td>{req.EndDate || '—'}</td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.Reason}</td>
                          <td>
                            <span className={`badge request-status-${req.Status?.toLowerCase()}`}>
                              {req.Status === 'PENDING' ? '⏳ Chờ duyệt' : req.Status === 'APPROVED' ? '✅ Đã duyệt' : '❌ Từ chối'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>{new Date(req.CreatedAt).toLocaleDateString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state"><p>Bạn chưa gửi đơn từ nào.</p></div>
              )}
            </div>
          </>
        )

      // ═══════════════════════════════════════════════════════════════
      //  SCHEDULE PAGE (Lịch làm việc — All roles)
      // ═══════════════════════════════════════════════════════════════
      case 'schedule':
        return (
          <>
            <div className="page-header">
              <p className="eyebrow">Lịch làm việc</p>
              <h2>{isManagerOrAdminRole(userRole) ? 'Quản lý & Phân ca' : 'Lịch Ca Cá nhân'}</h2>
              <p className="subtitle">{isManagerOrAdminRole(userRole) ? 'Xem và phân ca cho nhân viên' : 'Xem ca làm việc được phân công'}</p>
            </div>

            {/* Manager/Admin: Assign Shift Form */}
            {isManagerOrAdminRole(userRole) && (
              <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>📅 Phân ca làm việc</h3>
                <form onSubmit={handleAssignShift} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                      <label className="form-label">Nhân viên <span style={{ color: '#ef4444' }}>*</span></label>
                      <select className="form-select" value={shiftAssignForm.targetUserId} onChange={(e) => setShiftAssignForm(p => ({ ...p, targetUserId: e.target.value }))} required>
                        <option value="">— Chọn nhân viên —</option>
                        {employeeList.map(emp => <option key={emp.userId} value={emp.userId}>{emp.fullName || emp.userId}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ngày / Tuần <span style={{ color: '#ef4444' }}>*</span></label>
                      <input className="form-input" type="date" value={shiftAssignForm.weekDate} onChange={(e) => setShiftAssignForm(p => ({ ...p, weekDate: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Loại ca</label>
                      <select className="form-select" value={shiftAssignForm.shiftType} onChange={(e) => setShiftAssignForm(p => ({ ...p, shiftType: e.target.value }))}>
                        <option value="CA_HANH_CHINH">Ca Hành chính (08:00–17:00)</option>
                        <option value="CA_SANG">Ca Sáng (06:00–14:00)</option>
                        <option value="CA_CHIEU">Ca Chiều (14:00–22:00)</option>
                        <option value="CA_DEM">Ca Đêm (22:00–06:00)</option>
                        <option value="NGHI">Nghỉ</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ghi chú</label>
                    <input className="form-input" type="text" placeholder="Ghi chú cho ca này..." value={shiftAssignForm.note} onChange={(e) => setShiftAssignForm(p => ({ ...p, note: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-accent" disabled={loading}>{loading ? '⏳ Đang xử lý...' : '📅 Phân ca'}</button>
                  </div>
                </form>
              </div>
            )}

            {/* Team Shifts Table (Manager/Admin) */}
            {isManagerOrAdminRole(userRole) && teamShifts.length > 0 && (
              <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>👥 Ca làm việc Team ({teamShifts.length})</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Nhân viên</th><th>Ngày</th><th>Loại ca</th><th>Ghi chú</th><th>Phân bởi</th></tr>
                    </thead>
                    <tbody>
                      {teamShifts.map((s, i) => (
                        <tr key={i}>
                          <td><strong>{s.UserId}</strong></td>
                          <td>{s.WeekDate}</td>
                          <td><span className="badge shift-type">{s.ShiftType}</span></td>
                          <td style={{ fontSize: '0.8rem' }}>{s.Note || '—'}</td>
                          <td style={{ fontSize: '0.8rem' }}>{s.AssignedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Personal Shifts */}
            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>🗓️ Ca làm việc của tôi ({myShifts.length})</h3>
              {myShifts.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Ngày</th><th>Loại ca</th><th>Ghi chú</th><th>Cập nhật</th></tr>
                    </thead>
                    <tbody>
                      {myShifts.map((s, i) => (
                        <tr key={i}>
                          <td>{s.WeekDate}</td>
                          <td><span className="badge shift-type">{s.ShiftType}</span></td>
                          <td style={{ fontSize: '0.8rem' }}>{s.Note || '—'}</td>
                          <td style={{ fontSize: '0.8rem' }}>{s.UpdatedAt ? new Date(s.UpdatedAt).toLocaleDateString('vi-VN') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state"><p>Chưa có ca nào được phân công cho bạn.</p></div>
              )}
            </div>
          </>
        )

      // ═══════════════════════════════════════════════════════════════
      //  AUDIT LOG PAGE (Admin/Tenant Admin only)
      // ═══════════════════════════════════════════════════════════════
      case 'audit':
        return (
          <>
            <div className="page-header">
              <p className="eyebrow">Nhật ký Hệ thống</p>
              <h2>Audit Log</h2>
              <p className="subtitle">Theo dõi mọi thao tác quan trọng trong hệ thống doanh nghiệp.</p>
            </div>

            <div className="card" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h3 style={{ fontSize: '1rem' }}>🛡️ Lịch sử hành động ({auditLogs.length})</h3>
                <button className="btn btn-sm btn-ghost" onClick={loadAuditLogs}>🔄 Làm mới</button>
              </div>

              {auditLogs.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Người thực hiện</th>
                        <th>Vai trò</th>
                        <th>Hành động</th>
                        <th>Đối tượng</th>
                        <th>Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log, i) => (
                        <tr key={i}>
                          <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : '—'}</td>
                          <td><strong>{log.actor}</strong></td>
                          <td><span className={`badge ${log.actorRole === 'TENANT_ADMIN' || log.actorRole === 'ADMIN' ? 'admin-role' : log.actorRole === 'MANAGER' ? 'manager-role' : 'user-role'}`} style={{ padding: '2px 8px', fontSize: '0.65rem' }}>{log.actorRole}</span></td>
                          <td><span className="badge audit-action">{log.action}</span></td>
                          <td>{log.target || '—'}</td>
                          <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state"><p>Chưa có nhật ký hành động nào được ghi nhận.</p></div>
              )}
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="app-shell">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {Icons.menu}
        </button>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Smart Attendance
        </span>
        <div style={{ width: 36 }}></div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="mobile-overlay visible" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h1>⚡ Smart Attendance</h1>
          <p>SaaS Platform</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            if (item.type === 'divider') return <div key={item.id} className="nav-divider" />
            // Role enforcement tab visibility — unified roles-based check
            if (item.roles && !item.roles.includes(userRole.toUpperCase())) return null;

            return (
              <button
                key={item.id}
                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => navigateTo(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="theme-toggle-wrapper">
            <div className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              <div className={`theme-toggle-pill ${theme === 'light' ? 'light' : ''}`}></div>
              <div className={`theme-toggle-option ${theme === 'dark' ? 'active' : ''}`}>
                <span className="theme-toggle-icon">🌙</span>
                <span>Tối</span>
              </div>
              <div className={`theme-toggle-option ${theme === 'light' ? 'active' : ''}`}>
                <span className="theme-toggle-icon">☀️</span>
                <span>Sáng</span>
              </div>
            </div>
          </div>
          <div className="user-info">
            <div className="user-avatar">
              {(user.fullName || user.userId || '?').charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="name">{user.fullName || user.userId}</div>
              <span className={`role-badge role-${(user.role || 'employee').toLowerCase()}`}>{user.role || 'EMPLOYEE'}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            {Icons.logout}
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {message && <div className={`notice ${messageType}`}>{message}</div>}
        {renderPage()}
      </main>

      {/* Simulated Premium Payment Dialog Modal */}
      {showCheckoutModal && activeOrder && (
        <div className="payment-dialog-overlay">
          <div className="payment-dialog">
            <div className="payment-dialog-header">
              <h3>⚡ Cổng Thanh Toán PayOS (Simulated)</h3>
              <button className="close-dialog" onClick={() => { setShowCheckoutModal(false); setActiveOrder(null); }}>×</button>
            </div>
            <div className="payment-dialog-body">
              <div className="payment-summary-box">
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Mã đơn hàng:</div>
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>#{activeOrder.orderCode}</strong>

                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)' }}>Gói nâng cấp:</div>
                <strong>Gói {activeOrder.packageName} Enterprise SaaS</strong>

                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)' }}>Tổng số tiền:</div>
                <span className="payment-amount">{activeOrder.amount.toLocaleString('vi-VN')}₫</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <p>• Đây là giao dịch nâng cấp tài khoản Enterprise SaaS.</p>
                <p>• Nhấn "Xác nhận Thanh toán" để gửi tín hiệu Webhook và nâng cấp tài khoản tức thì.</p>
              </div>
            </div>
            <div className="payment-dialog-footer">
              <button className="btn btn-ghost" onClick={() => { setShowCheckoutModal(false); setActiveOrder(null); showMessage('Giao dịch đã hủy.', 'error'); }}>Hủy</button>
              <button className="btn btn-primary" onClick={handleMockPaymentSuccess}>Xác nhận Thanh toán</button>
            </div>
          </div>
        </div>
      )}

      {/* User CRUD Modal (Create / Edit) */}
      {showUserModal && (
        <div className="payment-dialog-overlay" style={{ backdropFilter: 'blur(12px)' }}>
          <div className="payment-dialog" style={{ maxWidth: '520px', width: '95%' }}>
            <div className="payment-dialog-header">
              <h3>{userModalMode === 'create' ? '➕ Thêm nhân viên mới' : `✏️ Sửa hồ sơ: ${editingUserId}`}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowUserModal(false)}>✕</button>
            </div>
            <div className="payment-dialog-body">
              <form onSubmit={handleUserFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

                {userModalMode === 'create' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Tài khoản (userId) <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="vd: nguyen.van.a"
                        value={userForm.userId}
                        onChange={(e) => setUserForm({ ...userForm, userId: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mật khẩu <span style={{ color: '#ef4444' }}>*</span></label>
                      <input
                        className="form-input"
                        type="password"
                        placeholder="Tối thiểu 8 ký tự"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vai trò</label>
                      <select
                        className="form-select"
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      >
                        <option value="EMPLOYEE">Employee</option>
                        <option value="MANAGER">Manager</option>
                        {user.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                      </select>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="email@company.com"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      className="form-input"
                      type="tel"
                      placeholder="0912345678"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', paddingTop: 'var(--space-sm)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowUserModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-accent" disabled={loading}>
                    {loading ? '⏳ Đang xử lý...' : userModalMode === 'create' ? '✅ Tạo tài khoản' : '💾 Lưu thay đổi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Attendance CRUD Management Dialog Modal */}
      {showCrudModal && (
        <div className="payment-dialog-overlay" style={{ backdropFilter: 'blur(12px)' }}>
          <div className="payment-dialog" style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh' }}>
            <div className="payment-dialog-header">
              <h3>🛠️ Điều chỉnh nhật ký: {crudUserName} ({crudUserId})</h3>
              <button className="close-dialog" onClick={() => setShowCrudModal(false)}>×</button>
            </div>
            <div className="payment-dialog-body" style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>

              {/* Form to CREATE / UPDATE log item (Editable for Admin and Manager roles) */}
              {(user.role === 'ADMIN' || user.role === 'MANAGER') ? (
                <form className="card" style={{ padding: 'var(--space-md)', background: 'rgba(255,255,255,0.01)', marginBottom: 'var(--space-md)' }} onSubmit={handleLogFormSubmit}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 'var(--space-md)', color: 'var(--color-accent)' }}>
                    {isEditingLog ? '📝 Chỉnh sửa bản ghi cũ' : '➕ Thêm log chấm công thủ công'}
                  </div>
                  <div className="form-row" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <div className="form-group">
                      <label className="form-label">Chọn thời gian</label>
                      <input
                        className="form-input"
                        type="datetime-local"
                        value={logForm.timestamp}
                        onChange={(e) => setLogForm(p => ({ ...p, timestamp: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Thao tác</label>
                      <select
                        className="form-select"
                        value={logForm.action}
                        onChange={(e) => setLogForm(p => ({ ...p, action: e.target.value }))}
                      >
                        <option value="CHECKIN">Check-in Vào Ca</option>
                        <option value="CHECKOUT">Check-out Ra Ca</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                    <label className="form-label">Thiết bị / Nguồn xác thực</label>
                    <input
                      className="form-input"
                      value={logForm.device}
                      onChange={(e) => setLogForm(p => ({ ...p, device: e.target.value }))}
                      placeholder="VD: Điều chỉnh thủ công bởi Quản lý"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                    {isEditingLog && (
                      <button type="button" className="btn btn-sm btn-ghost" onClick={handleCancelEdit}>Hủy bỏ</button>
                    )}
                    <button type="submit" className="btn btn-sm btn-primary" disabled={loading}>
                      {isEditingLog ? 'Lưu thay đổi' : 'Ghi nhận bản ghi'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px dashed rgba(251,191,36,0.3)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
                  {Icons.lock} Bạn chỉ có quyền xem nhật ký.
                </div>
              )}

              {/* User Logs Table */}
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)' }}>
                Bản ghi chấm công gần đây ({crudUserLogs.length})
              </div>

              {crudUserLogs.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Ca</th>
                        <th>Ngày</th>
                        <th>Giờ</th>
                        <th>Thiết bị</th>
                        {(user.role === 'ADMIN' || user.role === 'MANAGER') && <th>Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {crudUserLogs.map(item => (
                        <tr key={item.SK}>
                          <td>
                            <span className={`badge ${item.Action === 'CHECKIN' ? 'checkin' : 'checkout'}`} style={{ padding: '2px 8px', fontSize: '0.65rem' }}>
                              {item.Action === 'CHECKIN' ? 'In' : 'Out'}
                            </span>
                          </td>
                          <td>{new Date(item.Timestamp).toLocaleDateString('vi-VN')}</td>
                          <td style={{ fontVariantNumeric: 'tabular-nums' }}>{new Date(item.Timestamp).toLocaleTimeString('vi-VN')}</td>
                          <td style={{ fontSize: '0.75rem', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.DeviceVerified}</td>
                          {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn btn-sm btn-ghost" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => startEditLog(item)}>Sửa</button>
                                <button className="btn btn-sm btn-danger" style={{ padding: '2px 6px', fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }} onClick={() => handleDeleteLog(item.SK)}>Xóa</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-md)' }}>
                  <p style={{ fontSize: '0.8rem' }}>Không tìm thấy bản ghi chấm công nào cho nhân viên này.</p>
                </div>
              )}
            </div>
            <div className="payment-dialog-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCrudModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
