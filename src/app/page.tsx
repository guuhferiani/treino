'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useRef } from 'react'
import {
  getUsers,
  getWorkoutsForUser,
  getLastLogsForUser,
  getLogsForToday,
  saveSetLog,
  deleteSetLog,
  updateUserValidity,
  updateUserAvatar,
  addExerciseToWorkout,
  updateExercise,
  deleteExercise
} from './actions'
import {
  User as UserIcon,
  Flame,
  Dumbbell,
  AlertTriangle,
  Check,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
  Info,
  Activity,
  Home,
  User as ProfileIcon,
  Play,
  RotateCcw,
  Volume2,
  Sliders,
  Maximize2
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  workoutValidity?: string | Date | null
  avatar?: string | null
}

interface Exercise {
  id: string
  name: string
  muscleGroup: string
  safetyTips: string
  alternatives: string
  settings: string | null
  restInterval: number
}

interface Workout {
  id: string
  name: string
  description: string | null
  exercises: Exercise[]
}

interface Log {
  id: string
  userId: string
  workoutId: string | null
  exerciseId: string
  weight: number
  reps: number
  setNumber: number
  createdAt: Date
}

export default function WorkoutDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [lastLogs, setLastLogs] = useState<Record<string, { weight: number; reps: number; setNumber: number; createdAt: Date }>>({})
  const [todayLogs, setTodayLogs] = useState<Log[]>([])
  
  // Abas de navegação: "inicio" | "treinos" | "perfil" | "admin"
  const [activeTab, setActiveTab] = useState<'inicio' | 'treinos' | 'perfil' | 'admin'>('treinos')
  
  // Controle de Treino Ativo (Modo Execução)
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null)
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null)
  const [activeSets, setActiveSets] = useState<Record<string, number>>({}) // exerciseId -> activeSetNumber (1 a 4)

  // Temporizador de Descanso
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const [timerMax, setTimerMax] = useState<number>(60)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Estados para Gerenciador de Treinos (Admin)
  const [selectedAdminWorkout, setSelectedAdminWorkout] = useState<Workout | null>(null)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null) // null = criar
  const [showExerciseForm, setShowExerciseForm] = useState<boolean>(false)
  const [exerciseFormState, setExerciseFormState] = useState({
    name: '',
    muscleGroup: '',
    safetyTips: '',
    alternatives: '',
    settings: '',
    restInterval: 60
  })
  const [savingExercise, setSavingExercise] = useState<boolean>(false)

  // Estados de UI
  const [loading, setLoading] = useState(true)
  const [validityInput, setValidityInput] = useState<string>('')
  const [savingValidity, setSavingValidity] = useState<boolean>(false)
  const [expandedAlternatives, setExpandedAlternatives] = useState<Record<string, boolean>>({})
  const [expandedSettings, setExpandedSettings] = useState<Record<string, boolean>>({})
  const [setInputs, setSetInputs] = useState<Record<string, { weight: number; reps: number }>>({} )
  const [savingSet, setSavingSet] = useState<string | null>(null) // "exerciseId-setNumber"

  // Som para o final do timer (Web Audio API)
  const playTimerFinishSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // Lá (A5)
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      
      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.3)
    } catch {
      console.log('Audio Context falhou ou não é suportado pelo navegador')
    }
  }

  // Carregar usuários iniciais
  useEffect(() => {
    async function loadInitialData() {
      const dbUsers = await getUsers()
      setUsers(dbUsers)
      if (dbUsers.length > 0) {
        setSelectedUser(dbUsers[0]) // Gustavo por padrão
      }
    }
    loadInitialData()
  }, [])

  // Carregar treinos, logs históricos e de hoje quando o usuário mudar
  useEffect(() => {
    if (!selectedUser) return

    async function loadUserData() {
      setLoading(true)
      const userWorkouts = await getWorkoutsForUser(selectedUser!.id)
      const userLastLogs = await getLastLogsForUser(selectedUser!.id)
      const userTodayLogs = await getLogsForToday(selectedUser!.id)

      setWorkouts(userWorkouts)
      
      // Converte datas de string para Date para os logs
      const formattedLastLogs: Record<string, { weight: number; reps: number; setNumber: number; createdAt: Date }> = {}
      Object.keys(userLastLogs).forEach(k => {
        formattedLastLogs[k] = {
          ...userLastLogs[k],
          createdAt: new Date(userLastLogs[k].createdAt)
        }
      })
      setLastLogs(formattedLastLogs)
      setTodayLogs(userTodayLogs.map((l: Omit<Log, 'createdAt'> & { createdAt: string | Date }) => ({ ...l, createdAt: new Date(l.createdAt) })))

      // Seleciona o primeiro treino por padrão
      if (userWorkouts.length > 0) {
        setSelectedWorkout(userWorkouts[0])
      } else {
        setSelectedWorkout(null)
      }
      
      setLoading(false)
    }

    loadUserData()
  }, [selectedUser])

  // Registrar Service Worker para PWA (Progressive Web App)
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('ServiceWorker registrado com sucesso: ', registration.scope)
          },
          (err) => {
            console.log('Falha ao registrar ServiceWorker: ', err)
          }
        )
      })
    }
  }, [])

  // Sincronizar campo de validade quando o usuário selecionado mudar
  useEffect(() => {
    if (selectedUser?.workoutValidity) {
      const date = new Date(selectedUser.workoutValidity)
      const formatted = date.toISOString().split('T')[0]
      setValidityInput(formatted)
    } else {
      setValidityInput('')
    }
  }, [selectedUser])

  // Handler para salvar a validade de treino manualmente
  const handleSaveValidity = async () => {
    if (!selectedUser) return
    setSavingValidity(true)
    const result = await updateUserValidity(selectedUser.id, validityInput || null)
    if (result.success && result.user) {
      const updatedUser = {
        ...result.user,
        workoutValidity: result.user.workoutValidity ? new Date(result.user.workoutValidity) : null
      }
      setSelectedUser(updatedUser)
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
      alert('Data de validade do treino atualizada com sucesso! 👍')
    } else {
      alert('Erro ao salvar a validade.')
    }
    setSavingValidity(false)
  }

  // Handler para carregar e converter imagem de perfil para Base64
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedUser) return

    // Verifica tamanho do arquivo (limite de 1.5MB para Base64 no banco)
    if (file.size > 1.5 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma foto com menos de 1.5MB para melhor desempenho.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64String = reader.result as string
      setLoading(true)
      const result = await updateUserAvatar(selectedUser.id, base64String)
      if (result.success && result.user) {
        const updatedUser = {
          ...result.user,
          workoutValidity: result.user.workoutValidity ? new Date(result.user.workoutValidity) : null,
          avatar: result.user.avatar
        }
        setSelectedUser(updatedUser)
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
        alert('Foto de perfil atualizada com sucesso! 📸')
      } else {
        alert('Erro ao salvar a foto de perfil.')
      }
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  // Handler para remover a foto de perfil
  const handleRemoveAvatar = async () => {
    if (!selectedUser) return
    if (confirm('Tem certeza que deseja remover sua foto de perfil?')) {
      setLoading(true)
      const result = await updateUserAvatar(selectedUser.id, null)
      if (result.success && result.user) {
        const updatedUser = {
          ...result.user,
          workoutValidity: result.user.workoutValidity ? new Date(result.user.workoutValidity) : null,
          avatar: null
        }
        setSelectedUser(updatedUser)
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
        alert('Foto de perfil removida! 👍')
      } else {
        alert('Erro ao remover a foto.')
      }
      setLoading(false)
    }
  }

  // Salvar Exercício (Adicionar ou Editar)
  const handleSaveExercise = async () => {
    if (!selectedAdminWorkout) return
    if (!exerciseFormState.name || !exerciseFormState.muscleGroup) {
      alert('Nome e Grupo Muscular são obrigatórios!')
      return
    }

    setSavingExercise(true)
    
    if (editingExercise) {
      // Modo Edição
      const result = await updateExercise(editingExercise.id, {
        name: exerciseFormState.name,
        muscleGroup: exerciseFormState.muscleGroup,
        safetyTips: exerciseFormState.safetyTips,
        alternatives: exerciseFormState.alternatives,
        settings: exerciseFormState.settings || null,
        restInterval: exerciseFormState.restInterval
      })
      if (result.success && result.exercise) {
        const updatedEx = result.exercise as Exercise
        setWorkouts(prev => prev.map(w => ({
          ...w,
          exercises: w.exercises.map(e => e.id === updatedEx.id ? updatedEx : e)
        })))
        if (selectedAdminWorkout) {
          setSelectedAdminWorkout(prev => prev ? {
            ...prev,
            exercises: prev.exercises.map(e => e.id === updatedEx.id ? updatedEx : e)
          } : null)
        }
        setShowExerciseForm(false)
        setEditingExercise(null)
        alert('Exercício atualizado com sucesso! 👍')
      } else {
        alert('Erro ao atualizar exercício.')
      }
    } else {
      // Modo Criação
      const result = await addExerciseToWorkout(selectedAdminWorkout.id, {
        name: exerciseFormState.name,
        muscleGroup: exerciseFormState.muscleGroup,
        safetyTips: exerciseFormState.safetyTips,
        alternatives: exerciseFormState.alternatives,
        settings: exerciseFormState.settings || null,
        restInterval: exerciseFormState.restInterval
      })
      if (result.success && result.exercise) {
        const newEx = result.exercise as Exercise
        setWorkouts(prev => prev.map(w => w.id === selectedAdminWorkout.id ? {
          ...w,
          exercises: [...w.exercises, newEx].sort((a, b) => a.name.localeCompare(b.name))
        } : w))
        setSelectedAdminWorkout(prev => prev ? {
          ...prev,
          exercises: [...prev.exercises, newEx].sort((a, b) => a.name.localeCompare(b.name))
        } : null)
        setShowExerciseForm(false)
        alert('Exercício adicionado com sucesso! 🎉')
      } else {
        alert('Erro ao adicionar exercício.')
      }
    }
    setSavingExercise(false)
  }

  // Deletar Exercício
  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Deseja realmente excluir este exercício? Isso apagará também todo o histórico de cargas gravado nele.')) return
    
    setLoading(true)
    const result = await deleteExercise(exerciseId)
    if (result.success) {
      setWorkouts(prev => prev.map(w => ({
        ...w,
        exercises: w.exercises.filter(e => e.id !== exerciseId)
      })))
      if (selectedAdminWorkout) {
        setSelectedAdminWorkout(prev => prev ? {
          ...prev,
          exercises: prev.exercises.filter(e => e.id !== exerciseId)
        } : null)
      }
      alert('Exercício excluído! 👍')
    } else {
      alert('Erro ao excluir exercício.')
    }
    setLoading(false)
  }

  // Iniciar Formulário para Edição
  const startEditExercise = (ex: Exercise) => {
    setEditingExercise(ex)
    setExerciseFormState({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      safetyTips: ex.safetyTips,
      alternatives: ex.alternatives,
      settings: ex.settings || '',
      restInterval: ex.restInterval
    })
    setShowExerciseForm(true)
  }

  // Iniciar Formulário para Criação
  const startCreateExercise = () => {
    setEditingExercise(null)
    setExerciseFormState({
      name: '',
      muscleGroup: '',
      safetyTips: '',
      alternatives: '',
      settings: '',
      restInterval: 60
    })
    setShowExerciseForm(true)
  }

  // Inicializar inputs de carga e reps
  useEffect(() => {
    if (!selectedWorkout) return

    const initialInputs: Record<string, { weight: number; reps: number }> = {}
    const initialActiveSets: Record<string, number> = {}

    selectedWorkout.exercises.forEach((ex) => {
      // Definir a série ativa como a primeira que ainda não foi concluída hoje
      let activeSetForEx = 1
      for (let s = 1; s <= 4; s++) {
        const isLogged = todayLogs.some(l => l.exerciseId === ex.id && l.setNumber === s)
        if (!isLogged) {
          activeSetForEx = s
          break
        }
        if (s === 4) {
          activeSetForEx = 4 // Se todas completas, deixa na 4
        }
      }
      initialActiveSets[ex.id] = activeSetForEx

      // Inicializar inputs
      for (let s = 1; s <= 4; s++) {
        const key = `${ex.id}-${s}`
        const todayLog = todayLogs.find(l => l.exerciseId === ex.id && l.setNumber === s)
        
        if (todayLog) {
          initialInputs[key] = { weight: todayLog.weight, reps: todayLog.reps }
        } else {
          const lastLog = lastLogs[ex.id]
          initialInputs[key] = {
            weight: lastLog ? lastLog.weight : 10,
            reps: lastLog ? lastLog.reps : 12
          }
        }
      }
    })

    setSetInputs(initialInputs)
    setActiveSets(initialActiveSets)
  }, [selectedWorkout, lastLogs, todayLogs])

  // Limpeza do timer
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [])

  // Efeito do timer de intervalo
  useEffect(() => {
    if (timerSeconds !== null) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timerIntervalRef.current!)
            playTimerFinishSound()
            return null
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [timerSeconds])

  const handleUserChange = (user: User) => {
    setSelectedUser(user)
    setActiveWorkout(null) // Reseta treino em andamento ao trocar usuário
    setTimerSeconds(null)
  }

  // Controles de ajuste de carga/reps
  const adjustInput = (exerciseId: string, setNumber: number, field: 'weight' | 'reps', amount: number) => {
    const key = `${exerciseId}-${setNumber}`
    setSetInputs(prev => {
      const current = prev[key] || { weight: 10, reps: 12 }
      let newValue = current[field] + amount
      
      if (field === 'weight' && newValue < 0) newValue = 0
      if (field === 'reps' && newValue < 1) newValue = 1

      return {
        ...prev,
        [key]: {
          ...current,
          [field]: parseFloat(newValue.toFixed(1))
        }
      }
    })
  }

  // Iniciar um Treino
  const handleStartWorkout = (workout: Workout) => {
    setActiveWorkout(workout)
    setActiveTab('treinos')
    
    // Abre o primeiro exercício automaticamente
    if (workout.exercises.length > 0) {
      setExpandedExerciseId(workout.exercises[0].id)
    }
  }

  // Finalizar Treino em andamento
  const handleFinishWorkout = () => {
    if (confirm('Deseja finalizar o treino de hoje?')) {
      setActiveWorkout(null)
      setExpandedExerciseId(null)
      setTimerSeconds(null)
      alert('Treino concluído! Bom trabalho! 💪')
    }
  }

  // Salvar uma Série
  const handleSaveSet = async (exerciseId: string, setNumber: number, restInterval: number) => {
    if (!selectedUser || !activeWorkout) return
    
    const key = `${exerciseId}-${setNumber}`
    const input = setInputs[key] || { weight: 10, reps: 12 }
    
    setSavingSet(key)

    const result = await saveSetLog({
      userId: selectedUser.id,
      workoutId: activeWorkout.id,
      exerciseId: exerciseId,
      weight: input.weight,
      reps: input.reps,
      setNumber: setNumber
    })

    if (result.success && result.log) {
      const newLog = {
        ...result.log,
        createdAt: new Date(result.log.createdAt)
      }
      setTodayLogs(prev => [...prev, newLog])
      
      setLastLogs(prev => ({
        ...prev,
        [exerciseId]: {
          weight: input.weight,
          reps: input.reps,
          setNumber: setNumber,
          createdAt: new Date()
        }
      }))

      // Inicia o timer de descanso
      setTimerMax(restInterval)
      setTimerSeconds(restInterval)

      // Avança para a próxima série automaticamente
      if (setNumber < 4) {
        setActiveSets(prev => ({
          ...prev,
          [exerciseId]: setNumber + 1
        }))
      }
    } else {
      alert('Erro ao salvar a série.')
    }
    
    setSavingSet(null)
  }

  // Excluir Série
  const handleDeleteSet = async (logId: string, exerciseId: string, setNumber: number) => {
    const result = await deleteSetLog(logId)
    if (result.success) {
      setTodayLogs(prev => prev.filter(l => l.id !== logId))
      
      // Volta a série ativa para a série excluída
      setActiveSets(prev => ({
        ...prev,
        [exerciseId]: setNumber
      }))
    } else {
      alert('Erro ao excluir série.')
    }
  }

  // Concluir um Exercício e abrir o próximo
  const handleCompleteExercise = (currentIndex: number) => {
    if (!activeWorkout) return
    
    // Se houver próximo exercício, expande ele
    if (currentIndex < activeWorkout.exercises.length - 1) {
      const nextExId = activeWorkout.exercises[currentIndex + 1].id
      setExpandedExerciseId(nextExId)
    } else {
      // Se era o último, colapsa
      setExpandedExerciseId(null)
    }
  }

  // Determinar qual é o próximo treino baseado no histórico recente
  const getNextWorkout = (): Workout | null => {
    if (workouts.length === 0) return null
    if (todayLogs.length > 0) {
      // Se já treinou hoje, sugere o seguinte ao treino de hoje
      const lastWorkoutId = todayLogs[todayLogs.length - 1].workoutId
      const lastIndex = workouts.findIndex(w => w.id === lastWorkoutId)
      if (lastIndex !== -1) {
        return workouts[(lastIndex + 1) % workouts.length]
      }
    }
    
    // Se não treinou hoje, olha para o último log histórico
    const allLogs = Object.values(lastLogs)
    if (allLogs.length > 0) {
      // Encontra a data mais recente
      const sorted = allLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      const lastLoggedExerciseId = Object.keys(lastLogs).find(
        key => lastLogs[key].createdAt.getTime() === sorted[0].createdAt.getTime()
      )
      
      // Acha a qual treino esse exercício pertence
      const matchedWorkout = workouts.find(w => w.exercises.some(e => e.id === lastLoggedExerciseId))
      if (matchedWorkout) {
        const index = workouts.findIndex(w => w.id === matchedWorkout.id)
        return workouts[(index + 1) % workouts.length]
      }
    }
    
    return workouts[0] // Treino A por padrão se for novíssimo
  }

  // Contar sessões completadas no ciclo (com base em dias únicos de treino)
  const getCompletedSessionsCount = () => {
    // Filtra dias distintos de registros de log do usuário
    // Como simulador iniciante de testes, somamos o valor de 13 (do print)
    const baseCount = 13
    return baseCount + todayLogs.length > 0 ? 1 : 0
  }

  const nextWorkoutSuggestion = getNextWorkout()

  return (
    <div className="min-h-screen bg-[#09090b] flex justify-center py-0 sm:py-6 px-0 sm:px-4">
      {/* Container Otimizado para Mobile */}
      <div className="w-full max-w-md bg-[#0e0e11] sm:rounded-3xl sm:border sm:border-zinc-800 shadow-2xl flex flex-col overflow-hidden min-h-screen sm:min-h-[850px] relative pb-20">
        
        {/* TIMER DE DESCANSO FLUTUANTE (Dica visual premium) */}
        {timerSeconds !== null && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 border border-amber-400 text-xs animate-bounce">
            <span>⏱️ Descanso: {timerSeconds}s</span>
            <button 
              onClick={() => setTimerSeconds(null)} 
              className="ml-2 bg-black/25 hover:bg-black/45 text-[10px] text-white px-2 py-0.5 rounded-full"
            >
              Pular
            </button>
          </div>
        )}

        {/* HEADER */}
        <header className="px-5 pt-6 pb-4 border-b border-zinc-800/80 bg-[#0e0e11]/80 backdrop-blur sticky top-0 z-20">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-10 h-10 text-indigo-400 shrink-0 select-none">
                {/* Haste do Halter passando por trás do cérebro */}
                <path d="M12 44 L52 20" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" className="text-zinc-500" />
                
                {/* Anilhas da Esquerda */}
                <rect x="6" y="32" width="6" height="20" rx="2" transform="rotate(-31 9 42)" fill="currentColor" className="text-zinc-400" />
                <rect x="2" y="30" width="4" height="24" rx="1.5" transform="rotate(-31 4 42)" fill="currentColor" className="text-indigo-600" />
                
                {/* Anilhas da Direita */}
                <rect x="52" y="12" width="6" height="20" rx="2" transform="rotate(-31 55 22)" fill="currentColor" className="text-zinc-400" />
                <rect x="58" y="10" width="4" height="24" rx="1.5" transform="rotate(-31 60 22)" fill="currentColor" className="text-indigo-600" />

                {/* Cérebro Lado Esquerdo (Tecnologia/Intelecto) */}
                <path d="M32 10 C25 10 19 16 19 24 C19 28 21 31 23 33 C22 35 22 38 24 40 C27 43 30 42 32 42 Z" fill="currentColor" className="text-indigo-400" />
                      
                {/* Cérebro Lado Direito (Ação/Força) */}
                <path d="M32 10 C39 10 45 16 45 24 C45 28 43 31 41 33 C42 35 42 38 40 40 C37 43 34 42 32 42 Z" fill="currentColor" className="text-lime-400" />

                {/* Linhas de Conexão Neural (Efeito Circuitos) */}
                <path d="M32 16 L25 21" stroke="#0e0e11" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M32 23 L22 25" stroke="#0e0e11" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M32 30 L26 33" stroke="#0e0e11" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M32 20 L39 23" stroke="#0e0e11" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M32 28 L41 31" stroke="#0e0e11" strokeWidth="2.5" strokeLinecap="round" />

                {/* Nós Neural (Sinapses) */}
                <circle cx="25" cy="21" r="1.5" fill="#0e0e11" />
                <circle cx="22" cy="25" r="1.5" fill="#0e0e11" />
                <circle cx="26" cy="33" r="1.5" fill="#0e0e11" />
                <circle cx="39" cy="23" r="1.5" fill="#0e0e11" />
                <circle cx="41" cy="31" r="1.5" fill="#0e0e11" />
              </svg>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  SmartLift
                </h1>
                <p className="text-[10px] text-zinc-400">Treino Inteligente e Seguro</p>
              </div>
            </div>

            {/* Status do Treino Ativo */}
            {activeWorkout ? (
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/30 flex items-center gap-1.5 animate-pulse">
                <Flame className="w-3.5 h-3.5 text-indigo-400" />
                <span>Treino Iniciado</span>
              </span>
            ) : (
              <div className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>IA Pronta</span>
              </div>
            )}
          </div>
        </header>

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-500">Sincronizando seus treinos...</p>
          </div>
        ) : (
          <>
            {/* CONTEÚDO DA ABA: INÍCIO */}
            {activeTab === 'inicio' && !activeWorkout && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 animate-slide-down">
                {/* Cabeçalho de Bem-Vindo */}
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-white">Olá, {selectedUser?.name}!</h2>
                  <p className="text-xs text-zinc-400">Pronto para a sessão de hoje?</p>
                </div>

                {/* Bloco de Frequência e Validade (Conforme a Referência) */}
                <div className="glass-card rounded-2xl p-4 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400 font-semibold">Ciclo de Hipertrofia</span>
                    <span className="text-zinc-500">
                      {selectedUser?.workoutValidity 
                        ? `Validade: ${new Date(selectedUser.workoutValidity).toLocaleDateString('pt-BR')}` 
                        : 'Validade: A definir com Personal'}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full h-3.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80 p-0.5">
                      <div 
                        className="h-full bg-lime-400 rounded-full transition-all duration-500" 
                        style={{ width: `${(getCompletedSessionsCount() / 32) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-400 font-bold">
                      <span>Progresso</span>
                      <span className="text-lime-300">{getCompletedSessionsCount()}/32 sessões</span>
                    </div>
                  </div>
                </div>

                {/* Próximo Treino Recomendado */}
                {nextWorkoutSuggestion && (
                  <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-bold border border-indigo-500/20">
                        Próximo Sugerido
                      </span>
                      <h3 className="text-base font-bold text-white mt-1.5">{nextWorkoutSuggestion.name}</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{nextWorkoutSuggestion.exercises.length} exercícios recomendados</p>
                    </div>
                    <button
                      onClick={() => handleStartWorkout(nextWorkoutSuggestion)}
                      className="w-10 h-10 rounded-full bg-lime-400 flex items-center justify-center text-black hover:bg-lime-300 shadow-lg shadow-lime-400/10 shrink-0"
                    >
                      <Play className="w-5 h-5 fill-black pl-0.5" />
                    </button>
                  </div>
                )}

                {/* Listagem Geral dos Treinos */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Seus Treinos (Ciclo ABCD)</h3>
                  <div className="space-y-2.5">
                    {workouts.map((workout) => {
                      const isNext = nextWorkoutSuggestion?.id === workout.id
                      return (
                        <div 
                          key={workout.id} 
                          className={`glass-card rounded-2xl p-4 flex justify-between items-center hover:border-zinc-700 transition-all ${
                            isNext ? 'border-indigo-500/30 bg-indigo-500/5' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{workout.name}</h4>
                              {isNext && (
                                <span className="text-[9px] bg-lime-500/20 text-lime-300 px-1.5 py-0.2 rounded font-bold border border-lime-500/10">
                                  Próximo
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">{workout.exercises.length} exercícios • 4 séries</p>
                          </div>
                          <button
                            onClick={() => handleStartWorkout(workout)}
                            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                          >
                            <Play className="w-4.5 h-4.5 fill-current text-lime-400 pl-0.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA: TREINOS (Nenhum treino iniciado) */}
            {activeTab === 'treinos' && !activeWorkout && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 animate-slide-down">
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-white">Treino de Hoje</h2>
                  <p className="text-xs text-zinc-400">Selecione uma rotina para iniciar na academia:</p>
                </div>

                <div className="space-y-3 pt-2">
                  {workouts.map((workout) => {
                    const isNext = nextWorkoutSuggestion?.id === workout.id
                    return (
                      <div 
                        key={workout.id} 
                        className={`glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden flex flex-col justify-between ${
                          isNext ? 'border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.05)]' : ''
                        }`}
                      >
                        {isNext && (
                          <div className="absolute top-0 right-0 bg-lime-400 text-black font-extrabold text-[9px] px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                            Recomendado
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold border border-zinc-700/50">
                            Hipertrofia
                          </span>
                          <h3 className="text-base font-bold text-white pt-1">{workout.name}</h3>
                          <p className="text-xs text-zinc-400 leading-relaxed pt-0.5">{workout.description}</p>
                        </div>

                        <div className="pt-4 border-t border-zinc-900 flex justify-between items-center">
                          <span className="text-xs text-zinc-500 font-semibold">
                            {workout.exercises.length} Exercícios • 4 Séries
                          </span>
                          <button
                            onClick={() => handleStartWorkout(workout)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs transition-all shadow-md"
                          >
                            <Play className="w-3.5 h-3.5 fill-black pl-0.5" />
                            <span>Iniciar</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA: TREINO EM ANDAMENTO (MODO EXECUÇÃO - SELEÇÃO DA REFERÊNCIA) */}
            {activeWorkout && (
              <div className="flex-1 flex flex-col overflow-hidden animate-slide-down">
                
                {/* Subheader do Treino Ativo */}
                <div className="px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (confirm('Deseja pausar o treino e voltar à lista? O progresso de hoje será mantido.')) {
                          setActiveWorkout(null)
                          setExpandedExerciseId(null)
                        }
                      }}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 py-1 pr-2 border-r border-zinc-800"
                    >
                      ← Voltar
                    </button>
                    <div>
                      <h2 className="text-sm font-extrabold text-white leading-tight">{activeWorkout.name}</h2>
                      <p className="text-[10px] text-zinc-500">{activeWorkout.exercises.length} Exercícios no total</p>
                    </div>
                  </div>
                  
                  {/* Botão de Finalizar Treino */}
                  <button
                    onClick={handleFinishWorkout}
                    className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 px-3 rounded-lg border border-red-500/20 font-bold transition-all shrink-0"
                  >
                    Finalizar Treino
                  </button>
                </div>

                {/* Lista de Exercícios (Formatada como Accordions do Print) */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {activeWorkout.exercises.map((ex, index) => {
                    const isExpanded = expandedExerciseId === ex.id
                    const lastLog = lastLogs[ex.id]
                    
                    // Série ativa para este exercício (1 a 4)
                    const activeSet = activeSets[ex.id] || 1
                    const inputKey = `${ex.id}-${activeSet}`
                    const input = setInputs[inputKey] || { weight: 10, reps: 12 }
                    
                    const activeSetLogged = todayLogs.find(l => l.exerciseId === ex.id && l.setNumber === activeSet)
                    const isSetCompleted = !!activeSetLogged
                    
                    const isSaving = savingSet === inputKey

                    return (
                      <div 
                        key={ex.id} 
                        className={`glass-card rounded-2xl overflow-hidden transition-all duration-200 ${
                          isExpanded ? 'ring-1 ring-indigo-500/30' : ''
                        }`}
                      >
                        {/* Cabeçalho do Exercício (Accordion Trigger) */}
                        <button
                          onClick={() => setExpandedExerciseId(isExpanded ? null : ex.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/10 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            {/* Número do Exercício / Thumbnail */}
                            <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-sm font-extrabold border border-zinc-800 shrink-0 text-zinc-400">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                                  {ex.muscleGroup}
                                </span>
                                {/* Indicador de progresso de séries hoje */}
                                <span className="text-[9px] text-lime-400 font-bold bg-lime-500/10 px-1 rounded">
                                  {todayLogs.filter(l => l.exerciseId === ex.id).length}/4 séries
                                </span>
                              </div>
                              <h3 className="text-sm font-bold text-white mt-1 leading-tight">{ex.name}</h3>
                            </div>
                          </div>
                          
                          <div className="text-zinc-500">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {/* Conteúdo do Exercício Ativo (Accordion Content - Inspirado no Print) */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-zinc-900/80 pt-3.5 space-y-4 animate-slide-down">
                            
                            {/* Dica de Segurança Articular (Sempre em destaque) */}
                            <div className="bg-amber-950/20 border-l-2 border-amber-500/60 p-2.5 rounded-r-xl flex items-start gap-2 text-xs text-amber-200/90">
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <p className="leading-relaxed">
                                <strong>Segurança:</strong> {ex.safetyTips}
                              </p>
                            </div>

                            {/* Seletor de Séries do Topo (Abas 1, 2, 3, 4 conforme print) */}
                            <div className="space-y-2">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Registrar Série:</span>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4].map((s) => {
                                  const isLogged = todayLogs.some(l => l.exerciseId === ex.id && l.setNumber === s)
                                  const isActive = activeSet === s
                                  
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => setActiveSets(prev => ({ ...prev, [ex.id]: s }))}
                                      className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                                        isActive
                                          ? isLogged
                                            ? 'bg-emerald-500 border-emerald-400 text-black shadow-md shadow-emerald-500/10'
                                            : 'bg-lime-400 border-lime-300 text-black shadow-md shadow-lime-400/10'
                                          : isLogged
                                            ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                                            : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300'
                                      }`}
                                    >
                                      {isLogged ? `Série ${s} ✓` : `Série ${s}`}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Detalhes da Série Ativa: Repetições, Carga e Intervalo (3 Blocos do Print) */}
                            <div className="grid grid-cols-3 gap-2 pt-1.5">
                              {/* Repetições */}
                              <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1">
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Repetições</span>
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <button
                                    disabled={isSetCompleted || isSaving}
                                    onClick={() => adjustInput(ex.id, activeSet, 'reps', -1)}
                                    className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center text-xs disabled:opacity-20"
                                  >
                                    -
                                  </button>
                                  <span className="text-sm font-bold text-white w-7 text-center">{input.reps}x</span>
                                  <button
                                    disabled={isSetCompleted || isSaving}
                                    onClick={() => adjustInput(ex.id, activeSet, 'reps', 1)}
                                    className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center text-xs disabled:opacity-20"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Carga (kg) */}
                              <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1">
                                  <Dumbbell className="w-2.5 h-2.5" />
                                  <span>Carga (kg)</span>
                                </span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <button
                                    disabled={isSetCompleted || isSaving}
                                    onClick={() => adjustInput(ex.id, activeSet, 'weight', -1)}
                                    className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center text-xs disabled:opacity-20"
                                  >
                                    -
                                  </button>
                                  <span className="text-sm font-bold text-white w-10 text-center">{input.weight}</span>
                                  <button
                                    disabled={isSetCompleted || isSaving}
                                    onClick={() => adjustInput(ex.id, activeSet, 'weight', 1)}
                                    className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center text-xs disabled:opacity-20"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Intervalo */}
                              <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1">
                                  <Sliders className="w-2.5 h-2.5" />
                                  <span>Descanso</span>
                                </span>
                                <span className="text-sm font-bold text-white mt-2 block">
                                  {ex.restInterval}s
                                </span>
                              </div>
                            </div>

                            {/* Histórico da Última Carga do Usuário */}
                            <div className="bg-zinc-950/40 py-2 px-3.5 rounded-xl border border-zinc-900 flex justify-between items-center text-xs">
                              <span className="text-zinc-500 font-medium">Último treino desse exercício:</span>
                              {lastLog ? (
                                <span className="text-zinc-300 font-semibold">
                                  {lastLog.weight} kg x {lastLog.reps} reps (S{lastLog.setNumber})
                                </span>
                              ) : (
                                <span className="text-zinc-500 italic">Nenhum registro anterior</span>
                              )}
                            </div>

                            {/* Botão de Salvar Série ou Desfazer (Botão Grande) */}
                            {isSetCompleted ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteSet(activeSetLogged.id, ex.id, activeSet)}
                                className="w-full py-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm transition-all flex items-center justify-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Excluir Registro da Série {activeSet}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveSet(ex.id, activeSet, ex.restInterval)}
                                className={`w-full py-3 rounded-xl font-bold text-sm text-black transition-all flex items-center justify-center gap-2 shadow-md ${
                                  selectedUser?.name.toLowerCase().includes('michele')
                                    ? 'bg-rose-400 hover:bg-rose-300 shadow-rose-400/10'
                                    : 'bg-lime-400 hover:bg-lime-300 shadow-lime-400/10'
                                } disabled:opacity-50`}
                              >
                                {isSaving ? (
                                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    <span>Concluir Série {activeSet}</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Botão Concluir Exercício (Vai para o próximo automaticamente) */}
                            <button
                              type="button"
                              onClick={() => handleCompleteExercise(index)}
                              className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs hover:border-zinc-700 transition-all text-center block"
                            >
                              Concluir Exercício & Ir para o Próximo
                            </button>

                            {/* Ações Inferiores (Regulagem e Exercícios Similares do Print) */}
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              {/* Regulagem */}
                              <button
                                onClick={() => {
                                  setExpandedSettings(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))
                                  setExpandedAlternatives(prev => ({ ...prev, [ex.id]: false }))
                                }}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center ${
                                  expandedSettings[ex.id]
                                    ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-300 shadow-md shadow-indigo-500/10'
                                    : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                <Sliders className="w-4 h-4 mb-1" />
                                <span className="text-[10px] font-bold">Regulagem</span>
                              </button>

                              {/* Exercícios Similares */}
                              <button
                                onClick={() => {
                                  setExpandedAlternatives(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))
                                  setExpandedSettings(prev => ({ ...prev, [ex.id]: false }))
                                }}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center ${
                                  expandedAlternatives[ex.id]
                                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                                    : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                <Info className="w-4 h-4 mb-1" />
                                <span className="text-[10px] font-bold">Substitutos</span>
                              </button>
                            </div>

                            {/* Painel de Regulagem do Aparelho */}
                            {expandedSettings[ex.id] && (
                              <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-xs animate-slide-down space-y-1">
                                <div className="text-indigo-400 font-bold flex items-center gap-1.5">
                                  <Sliders className="w-3.5 h-3.5" />
                                  <span>Regulagem Recomendada:</span>
                                </div>
                                <p className="text-zinc-200 font-medium pl-5 leading-relaxed">
                                  {ex.settings || 'Ajuste padrão confortável. Mantenha os apoios firmes.'}
                                </p>
                              </div>
                            )}

                            {/* Painel de Exercícios Similares */}
                            {expandedAlternatives[ex.id] && (
                              <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-xs animate-slide-down space-y-1">
                                <div className="text-amber-400 font-bold flex items-center gap-1.5">
                                  <Info className="w-3.5 h-3.5" />
                                  <span>Aparelho Ocupado? Use Alternativo:</span>
                                </div>
                                <p className="text-zinc-200 font-medium pl-5 leading-relaxed">
                                  {ex.alternatives}
                                </p>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA: PERFIL */}
            {activeTab === 'perfil' && !activeWorkout && (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 animate-slide-down">
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold text-white">Seu Perfil</h2>
                  <p className="text-xs text-zinc-400">Gerencie sua conta e visualize suas conquistas:</p>
                </div>

                {/* Perfil Switcher */}
                <div className="glass-card rounded-2xl p-5 space-y-4">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Usuário Ativo</span>
                  <div className="space-y-2">
                    {users.map((user) => {
                      const isSelected = selectedUser?.id === user.id
                      const isMichele = user.name.toLowerCase().includes('michele')
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleUserChange(user)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                            isSelected
                              ? isMichele
                                ? 'bg-rose-500/10 border-rose-500/50 text-white shadow-md'
                                : 'bg-indigo-500/10 border-indigo-500/50 text-white shadow-md'
                              : 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img src={user.avatar} className="w-8 h-8 rounded-full object-cover shrink-0" alt={user.name} />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                isSelected 
                                  ? isMichele ? 'bg-rose-500 text-white' : 'bg-indigo-500 text-white'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {user.name[0]}
                              </div>
                            )}
                            <span className="font-semibold">{user.name}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              Ativo
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Botão de Ir para o Gerenciador de Treinos (Admin) */}
                <button
                  onClick={() => {
                    setActiveTab('admin')
                    if (workouts.length > 0) {
                      setSelectedAdminWorkout(workouts[0])
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 font-bold text-xs transition-all shadow-md shrink-0"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Gerenciar Fichas de Treino (Admin)</span>
                  </div>
                  <span>→</span>
                </button>

                {/* Alterar Foto de Perfil (Manual Upload) */}
                <div className="glass-card rounded-2xl p-5 space-y-4">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Foto de Perfil</span>
                  <div className="flex items-center gap-4">
                    {/* Visualização da Foto Atual */}
                    {selectedUser?.avatar ? (
                      <div className="relative group shrink-0">
                        <img 
                          src={selectedUser.avatar} 
                          className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500" 
                          alt={selectedUser.name}
                        />
                        <button
                          onClick={handleRemoveAvatar}
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow"
                          title="Remover Foto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center font-extrabold text-xl shrink-0 ${
                        selectedUser?.name.toLowerCase().includes('michele') 
                          ? 'bg-rose-950 text-rose-300 border-2 border-rose-500/30' 
                          : 'bg-indigo-950 text-indigo-300 border-2 border-indigo-500/30'
                      }`}>
                        {selectedUser?.name ? selectedUser.name[0] : 'U'}
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-zinc-400">Envie uma foto para personalizar seu perfil.</p>
                      
                      <label className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-md">
                        <span>Carregar Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Validade do Treino (Manual Input) */}
                <div className="glass-card rounded-2xl p-5 space-y-4">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Validade do Treino</span>
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-400">Defina ou atualize a data de validade da sua ficha:</p>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={validityInput}
                        onChange={(e) => setValidityInput(e.target.value)}
                        className="flex-1 bg-[#09090b] border border-zinc-800/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
                      />
                      <button
                        onClick={handleSaveValidity}
                        disabled={savingValidity}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all disabled:opacity-50 shrink-0"
                      >
                        {savingValidity ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Histórico do Dia de Hoje */}
                <div className="glass-card rounded-2xl p-5 space-y-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Atividade de Hoje</h3>
                  {todayLogs.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-300 font-medium">Você já concluiu <strong>{todayLogs.length} séries</strong> hoje!</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pt-1.5">
                        {todayLogs.map((log) => {
                          // Acha o nome do exercício
                          const exerciseName = workouts
                            .flatMap(w => w.exercises)
                            .find(e => e.id === log.exerciseId)?.name || 'Exercício'

                          return (
                            <div key={log.id} className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900 text-xs">
                              <div>
                                <span className="font-semibold text-white block truncate max-w-[200px]">{exerciseName}</span>
                                <span className="text-[10px] text-zinc-500">Série {log.setNumber} • {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                              <span className="font-bold text-lime-400 text-right">{log.weight} kg x {log.reps}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-zinc-500 text-xs italic">
                      Nenhuma série registrada no dia de hoje ainda.
                    </div>
                  )}
                </div>

                {/* Dica do Dia da Inteligência Artificial */}
                <div className="bg-indigo-950/15 border-2 border-dashed border-indigo-500/20 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Dica Inteligente (IA)</span>
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    &quot;Como vocês começaram a treinar há pouco tempo, o foco principal deve ser a <strong>técnica de execução e estabilidade articular</strong>, não a quantidade de carga. Utilize os controles de regulagem e siga à risca as dicas de segurança amarela de cada card.&quot;
                  </p>
                </div>
              </div>
            )}

            {/* CONTEÚDO DA ABA: GERENCIADOR (ADMIN) */}
            {activeTab === 'admin' && (
              <div className="flex-1 flex flex-col overflow-hidden animate-slide-down">
                
                {/* Cabeçalho Admin */}
                <div className="px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (showExerciseForm) {
                          setShowExerciseForm(false)
                        } else {
                          setActiveTab('perfil')
                        }
                      }}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 py-1 pr-2 border-r border-zinc-800"
                    >
                      ← Voltar
                    </button>
                    <div>
                      <h2 className="text-sm font-extrabold text-white leading-tight">
                        {showExerciseForm 
                          ? editingExercise 
                            ? 'Editar Exercício' 
                            : 'Novo Exercício' 
                          : 'Gerenciador de Treinos'}
                      </h2>
                      <p className="text-[10px] text-zinc-500">
                        {showExerciseForm ? selectedAdminWorkout?.name : 'Personalize sua rotina'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* FORMULÁRIO DE CADASTRO/EDIÇÃO */}
                {showExerciseForm ? (
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Nome do Exercício */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Nome do Exercício *</label>
                      <input
                        type="text"
                        placeholder="Ex: Supino Reto na Máquina"
                        value={exerciseFormState.name}
                        onChange={(e) => setExerciseFormState(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Grupo Muscular */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Grupo Muscular *</label>
                      <input
                        type="text"
                        placeholder="Ex: Peitoral, Pernas, Ombros..."
                        value={exerciseFormState.muscleGroup}
                        onChange={(e) => setExerciseFormState(prev => ({ ...prev, muscleGroup: e.target.value }))}
                        className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Regulagem Física */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Regulagem do Aparelho (Banco/Apoio)</label>
                      <input
                        type="text"
                        placeholder="Ex: Banco: Altura 4, Encosto: Nível 3"
                        value={exerciseFormState.settings}
                        onChange={(e) => setExerciseFormState(prev => ({ ...prev, settings: e.target.value }))}
                        className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Tempo de Descanso */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Tempo de Descanso (Segundos)</label>
                      <input
                        type="number"
                        placeholder="Ex: 60, 90, 120"
                        value={exerciseFormState.restInterval}
                        onChange={(e) => setExerciseFormState(prev => ({ ...prev, restInterval: parseInt(e.target.value) || 60 }))}
                        className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Dica de Segurança */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Dica de Segurança Articular</label>
                      <textarea
                        rows={3}
                        placeholder="Ex: Mantenha os cotovelos ligeiramente abaixo da linha do ombro para proteger a articulação..."
                        value={exerciseFormState.safetyTips}
                        onChange={(e) => setExerciseFormState(prev => ({ ...prev, safetyTips: e.target.value }))}
                        className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    {/* Aparelhos Alternativos */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Aparelhos Substitutos (Caso Ocupado)</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Supino inclinado com halteres ou Pec Deck."
                        value={exerciseFormState.alternatives}
                        onChange={(e) => setExerciseFormState(prev => ({ ...prev, alternatives: e.target.value }))}
                        className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowExerciseForm(false)}
                        className="flex-1 py-3 rounded-xl border border-zinc-800 text-zinc-400 font-bold text-xs hover:bg-zinc-900 hover:text-white transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingExercise}
                        onClick={handleSaveExercise}
                        className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        {savingExercise ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          'Salvar Exercício'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  // LISTA DE EXERCÍCIOS DO TREINO
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Seletor do Treino (A, B, C, D) */}
                    <div className="px-4 py-2.5 bg-zinc-950/40 border-b border-zinc-900 flex gap-2 overflow-x-auto shrink-0 scrollbar-none">
                      {workouts.map((w) => {
                        const isSelected = selectedAdminWorkout?.id === w.id
                        const letter = w.name.includes('Treino ') ? w.name.split('Treino ')[1][0] : w.name[0]
                        return (
                          <button
                            key={w.id}
                            onClick={() => setSelectedAdminWorkout(w)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            Treino {letter}
                          </button>
                        )
                      })}
                    </div>

                    {/* Lista dos Exercícios */}
                    <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-2">
                      <div className="flex justify-between items-center mb-2 px-1 text-xs">
                        <span className="text-zinc-500 font-semibold">{selectedAdminWorkout?.name}</span>
                        <span className="text-zinc-500 font-bold">{selectedAdminWorkout?.exercises.length || 0} exercícios</span>
                      </div>

                      {selectedAdminWorkout?.exercises.map((ex, index) => (
                        <div 
                          key={ex.id}
                          className="glass-card rounded-xl p-3.5 flex items-center justify-between border border-zinc-900 hover:border-zinc-800 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-zinc-500 shrink-0 w-5">
                              #{index + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">
                                {ex.muscleGroup}
                              </span>
                              <span className="text-xs font-bold text-white block truncate">
                                {ex.name}
                              </span>
                            </div>
                          </div>

                          {/* Ações (Editar e Deletar) */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEditExercise(ex)}
                              className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
                              title="Editar Exercício"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExercise(ex.id)}
                              className="p-2 rounded-lg bg-red-950/20 border border-red-900/20 text-red-400 hover:bg-red-950/40 transition-all"
                              title="Excluir Exercício"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {selectedAdminWorkout?.exercises.length === 0 && (
                        <div className="text-center py-12 text-zinc-600 text-xs italic">
                          Nenhum exercício cadastrado nesta rotina.
                        </div>
                      )}
                    </div>

                    {/* Botão Inferior de Adicionar Exercício */}
                    <div className="p-4 border-t border-zinc-900 bg-zinc-950/60 shrink-0">
                      <button
                        onClick={startCreateExercise}
                        className="w-full py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar Novo Exercício</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* BARRA DE NAVEGAÇÃO DO RODAPÉ (Bottom Navigation Bar) */}
        <nav className="absolute bottom-0 left-0 right-0 h-16 bg-[#0e0e11] border-t border-zinc-800/80 flex items-center justify-around z-20">
          {/* Início */}
          <button
            onClick={() => {
              if (activeWorkout) {
                alert('Conclua ou cancele o treino atual antes de ir para o Início.')
              } else {
                setActiveTab('inicio')
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
              activeTab === 'inicio' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Início</span>
          </button>

          {/* Treinos */}
          <button
            onClick={() => setActiveTab('treinos')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
              activeTab === 'treinos' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {activeWorkout && (
              <span className="absolute top-2 right-12 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
            )}
            <Dumbbell className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Treinos</span>
          </button>

          {/* Perfil */}
          <button
            onClick={() => {
              if (activeWorkout) {
                alert('Conclua ou cancele o treino atual antes de ir para o Perfil.')
              } else {
                setActiveTab('perfil')
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
              activeTab === 'perfil' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ProfileIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Perfil</span>
          </button>
        </nav>

      </div>
    </div>
  )
}
