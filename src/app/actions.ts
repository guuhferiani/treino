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
