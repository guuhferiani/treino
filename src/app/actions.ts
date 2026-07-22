'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Buscar todos os usuários cadastrados
export async function getUsers() {
  try {
    return await prisma.user.findMany({
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return []
  }
}

// Buscar todos os treinos de um usuário específico, incluindo os exercícios
export async function getWorkoutsForUser(userId: string) {
  try {
    return await prisma.workout.findMany({
      where: { userId },
      include: {
        exercises: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Erro ao buscar treinos do usuário:', error)
    return []
  }
}

// Obter o último registro (carga, repetições, série) de cada exercício para um usuário
export async function getLastLogsForUser(userId: string) {
  try {
    const logs = await prisma.log.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // Reduz para obter apenas o último log por exercício
    const lastLogsMap: Record<string, { weight: number; reps: number; setNumber: number; createdAt: Date }> = {}
    for (const log of logs) {
      if (!lastLogsMap[log.exerciseId]) {
        lastLogsMap[log.exerciseId] = {
          weight: log.weight,
          reps: log.reps,
          setNumber: log.setNumber,
          createdAt: log.createdAt,
        }
      }
    }
    return lastLogsMap
  } catch (error) {
    console.error('Erro ao buscar últimos registros do usuário:', error)
    return {}
  }
}

// Obter os logs registrados no dia de hoje para o usuário
export async function getLogsForToday(userId: string) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return await prisma.log.findMany({
      where: {
        userId,
        createdAt: {
          gte: today,
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  } catch (error) {
    console.error('Erro ao buscar registros de hoje:', error)
    return []
  }
}

// Salvar um novo registro de série (Log)
export async function saveSetLog(data: {
  userId: string
  workoutId: string | null
  exerciseId: string
  weight: number
  reps: number
  setNumber: number
}) {
  try {
    const newLog = await prisma.log.create({
      data: {
        userId: data.userId,
        workoutId: data.workoutId,
        exerciseId: data.exerciseId,
        weight: data.weight,
        reps: data.reps,
        setNumber: data.setNumber,
      },
    })
    
    revalidatePath('/')
    return { success: true, log: newLog }
  } catch (error) {
    console.error('Erro ao salvar registro de treino:', error)
    return { success: false, error: 'Não foi possível salvar a série' }
  }
}

// Apagar um log (útil caso o usuário queira desfazer um registro errado)
export async function deleteSetLog(logId: string) {
  try {
    await prisma.log.delete({
      where: { id: logId },
    })
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir registro:', error)
    return { success: false, error: 'Não foi possível excluir a série' }
  }
}

// Atualizar a data de validade da ficha do usuário
export async function updateUserValidity(userId: string, validityDate: string | null) {
  try {
    const dateVal = validityDate ? new Date(validityDate) : null
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { workoutValidity: dateVal },
    })
    revalidatePath('/')
    return { success: true, user: updatedUser }
  } catch (error) {
    console.error('Erro ao atualizar validade:', error)
    return { success: false, error: 'Não foi possível atualizar a validade' }
  }
}

// Atualizar a foto de perfil do usuário (Base64)
export async function updateUserAvatar(userId: string, avatarBase64: string | null) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarBase64 },
    })
    revalidatePath('/')
    return { success: true, user: updatedUser }
  } catch (error) {
    console.error('Erro ao atualizar foto de perfil:', error)
    return { success: false, error: 'Não foi possível atualizar a foto de perfil' }
  }
}

// Adicionar um novo exercício a um treino
export async function addExerciseToWorkout(workoutId: string, data: {
  name: string
  muscleGroup: string
  safetyTips: string
  alternatives: string
  settings: string | null
  restInterval: number
}) {
  try {
    const newExercise = await prisma.exercise.create({
      data: {
        name: data.name,
        muscleGroup: data.muscleGroup,
        safetyTips: data.safetyTips,
        alternatives: data.alternatives,
        settings: data.settings,
        restInterval: data.restInterval,
        workouts: {
          connect: { id: workoutId }
        }
      }
    })

    // Sincronizar o exerciseOrder na ficha
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: { exerciseOrder: true }
    })
    const existingOrder = workout?.exerciseOrder ? workout.exerciseOrder.split(',') : []
    existingOrder.push(newExercise.id)
    await prisma.workout.update({
      where: { id: workoutId },
      data: { exerciseOrder: existingOrder.join(',') }
    })

    revalidatePath('/')
    return { success: true, exercise: newExercise }
  } catch (error) {
    console.error('Erro ao adicionar exercício ao treino:', error)
    return { success: false, error: 'Não foi possível adicionar o exercício' }
  }
}

// Atualizar informações de um exercício existente
export async function updateExercise(exerciseId: string, data: {
  name: string
  muscleGroup: string
  safetyTips: string
  alternatives: string
  settings: string | null
  restInterval: number
}) {
  try {
    const updated = await prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        name: data.name,
        muscleGroup: data.muscleGroup,
        safetyTips: data.safetyTips,
        alternatives: data.alternatives,
        settings: data.settings,
        restInterval: data.restInterval
      }
    })
    revalidatePath('/')
    return { success: true, exercise: updated }
  } catch (error) {
    console.error('Erro ao atualizar exercício:', error)
    return { success: false, error: 'Não foi possível atualizar o exercício' }
  }
}

// Excluir um exercício e seus logs vinculados
export async function deleteExercise(exerciseId: string) {
  try {
    // Acha os treinos vinculados a esse exercício para limpar o exerciseOrder
    const workouts = await prisma.workout.findMany({
      where: {
        exercises: {
          some: { id: exerciseId }
        }
      },
      select: { id: true, exerciseOrder: true }
    })
    
    for (const w of workouts) {
      if (w.exerciseOrder) {
        const orderArray = w.exerciseOrder.split(',').filter(id => id !== exerciseId)
        await prisma.workout.update({
          where: { id: w.id },
          data: { exerciseOrder: orderArray.join(',') }
        })
      }
    }

    // Exclui logs desse exercício primeiro para manter integridade referencial
    await prisma.log.deleteMany({
      where: { exerciseId }
    })
    const deleted = await prisma.exercise.delete({
      where: { id: exerciseId }
    })
    revalidatePath('/')
    return { success: true, exercise: deleted }
  } catch (error) {
    console.error('Erro ao excluir exercício:', error)
    return { success: false, error: 'Não foi possível excluir o exercício' }
  }
}

// Buscar o histórico completo de todos os logs de um usuário
export async function getUserWorkoutHistory(userId: string) {
  try {
    const logs = await prisma.log.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, logs }
  } catch (error) {
    console.error('Erro ao obter histórico do usuário:', error)
    return { success: false, logs: [] }
  }
}

// Atualizar a ordem de exercícios em um treino
export async function updateWorkoutExerciseOrder(workoutId: string, orderArray: string[]) {
  try {
    const updated = await prisma.workout.update({
      where: { id: workoutId },
      data: { exerciseOrder: orderArray.join(',') }
    })
    revalidatePath('/')
    return { success: true, workout: updated }
  } catch (error) {
    console.error('Erro ao atualizar ordem dos exercícios:', error)
    return { success: false, error: 'Não foi possível atualizar a ordem' }
  }
}

// Chamar o AI Coach com base no perfil do usuário e limitações médicas
export async function askAICoach(
  userId: string, 
  message: string, 
  history: { role: 'user' | 'model'; parts: string }[]
) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Fallback inteligente se a chave não estiver configurada no Vercel
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const isGustavo = user?.name.toLowerCase().includes('gustavo')
    
    let fallbackText = ''
    if (isGustavo) {
      fallbackText = "Olá, Gustavo! Como a chave `GEMINI_API_KEY` não está ativa na Vercel no momento, aqui vai uma orientação baseada na sua ficha:\n\n**Hérnia Inguinal/Umbilical**: Evite a todo custo a Manobra de Valsalva (prender a respiração no esforço máximo) e exercícios com forte compressão abdominal livre. Diga-me qual máquina está ocupada hoje e eu recomendarei substitutos estáveis!"
    } else {
      fallbackText = "Olá, Michele! Como a chave `GEMINI_API_KEY` não está ativa na Vercel no momento, aqui vai uma orientação baseada na sua ficha:\n\n**Ombro (Impacto/Manguito)**: Evite abduções excessivas ou puxadas e desenvolvimentos por trás da nuca. Foque em pegadas neutras e amplitude reduzida. Diga-me qual máquina está ocupada hoje e eu recomendarei substitutos estáveis!"
    }
    
    // Análise simples de palavra-chave para o fallback inteligente
    const cleanMsg = message.toLowerCase()
    if (cleanMsg.includes('ocupad') || cleanMsg.includes('substitu') || cleanMsg.includes('trocar')) {
      if (isGustavo) {
        fallbackText += "\n\n💡 **Dica de Substituição**: Se o Supino Inclinado na máquina estiver ocupado, você pode fazer o Supino Reto Articulado ou Cross Over na polia média, pois as polias dão estabilidade ao abdômen. Evite usar halteres pesados livres do chão."
      } else {
        fallbackText += "\n\n💡 **Dica de Substituição**: Se a Puxada Alta estiver ocupada, você pode fazer Remada Baixa com triângulo (pegada neutra), pois protege o ombro de abduções extremas."
      }
    }
    
    return { success: true, reply: fallbackText }
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const userName = user?.name || 'Atleta'
    
    const isGustavo = userName.toLowerCase().includes('gustavo')
    
    const systemPrompt = `Você é o "SmartLift AI Coach", um treinador de musculação de IA altamente qualificado e especialista em cinesiologia e segurança articular.
Você está conversando com ${userName}.
Aqui estão as limitações médicas deste usuário que você DEVE levar em consideração em TODAS as respostas de substituição ou execução de exercícios:
${isGustavo 
  ? '- Limitações: Hérnia inguinal e umbilical. Evitar valsalva extrema (prender a respiração sob esforço), compressão intra-abdominal severa (como agachamento livre com muita carga), e flexão forçada do tronco sob carga. Focar em exercícios em máquinas, com apoio nas costas, mantendo respiração fluida (soltando o ar no esforço).'
  : '- Limitações: Dores/problemas no ombro (manguito rotador/impacto). Evitar abdução associada à rotação interna (como remada alta), desenvolvimento atrás da nuca, e descidas excessivamente profundas em supinos e paralelas. Focar em movimentos com pegada neutra, amplitude controlada e estabilização das escápulas.'
}

Sempre responda em português (pt-BR). Seja conciso, motivador, focado em segurança e dê alternativas de exercícios seguras se o usuário relatar dor ou máquina ocupada.`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...history.map(h => ({
            role: h.role,
            parts: [{ text: h.parts }]
          })),
          { role: 'user', parts: [{ text: message }] }
        ],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7
        }
      })
    })

    const data = await response.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, tive um problema ao processar a resposta."
    return { success: true, reply }
  } catch (error) {
    console.error('Erro no AI Coach:', error)
    return { success: false, error: 'Erro de conexão com a IA' }
  }
}
