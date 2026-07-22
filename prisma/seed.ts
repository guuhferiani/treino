import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import ws from 'ws'
import path from 'path'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente do arquivo .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL
const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Limpar banco de dados anterior
  await prisma.log.deleteMany()
  await prisma.workout.deleteMany()
  await prisma.exercise.deleteMany()
  await prisma.user.deleteMany()

  console.log('Banco de dados limpo.')

  // Criar Usuários Padrão
  const gustavo = await prisma.user.create({
    data: {
      name: 'Gustavo',
      email: 'gustavo@example.com',
    },
  })

  const michele = await prisma.user.create({
    data: {
      name: 'Michele',
      email: 'michele@example.com',
    },
  })

  console.log(`Usuários criados: ${gustavo.name} e ${michele.name}`)

  // 1. Treino A: Peito/tríceps/ombro (11 exercícios)
  const treinoAExercisesData = [
    {
      name: 'Supino Inclinado com Halteres',
      muscleGroup: 'Peitoral',
      safetyTips: 'Mantenha a escápula retraída (ombros para trás). Evite descer os halteres além da linha do peito para não tensionar a cápsula anterior do ombro.',
      alternatives: 'Supino Inclinado na Máquina Articulada ou Pec Deck Inclinado.',
      settings: 'Inclinação do banco: 30°-45°',
      restInterval: 90
    },
    {
      name: 'Supino Reto na Máquina',
      muscleGroup: 'Peitoral',
      safetyTips: 'Ajuste o banco de modo que os pegadores fiquem na altura do peitoral médio. Mantenha os cotovelos abaixo dos ombros.',
      alternatives: 'Supino Reto com Halteres.',
      settings: 'Banco: Altura 4',
      restInterval: 90
    },
    {
      name: 'Pec Deck (Voador Peitoral)',
      muscleGroup: 'Peitoral',
      safetyTips: 'Ajuste o assento para que as mãos fiquem na linha do peito. Mantenha braços ligeiramente flexionados. Não ultrapasse os ombros para trás.',
      alternatives: 'Crossover com cabos (polia média).',
      settings: 'Banco: Altura 3, Braços: Nível 4',
      restInterval: 60
    },
    {
      name: 'Crossover Polia Alta',
      muscleGroup: 'Peitoral',
      safetyTips: 'Incline o tronco levemente para a frente e contraia o abdômen. Mantenha o cotovelo fixo e não estenda totalmente ao final.',
      alternatives: 'Pec Deck (Voador Peitoral).',
      settings: 'Polia: Altura máxima (Nível 10)',
      restInterval: 60
    },
    {
      name: 'Desenvolvimento de Ombros com Halteres',
      muscleGroup: 'Ombros',
      safetyTips: 'Mantenha o encosto ligeiramente inclinado para trás (~80°) para proteger a lombar. Mantenha os cotovelos alinhados com o tronco.',
      alternatives: 'Desenvolvimento de Ombros na Máquina.',
      settings: 'Encosto do banco: Nível 7 (quase vertical)',
      restInterval: 90
    },
    {
      name: 'Elevação Lateral com Halteres',
      muscleGroup: 'Ombros',
      safetyTips: 'Mantenha os cotovelos semiflexionados. Levante os braços até a altura dos ombros, evitando ultrapassar a linha horizontal.',
      alternatives: 'Elevação Lateral no Cabo.',
      settings: 'Livre (em pé)',
      restInterval: 60
    },
    {
      name: 'Elevação Lateral no Cabo',
      muscleGroup: 'Ombros',
      safetyTips: 'Passe o cabo por trás do corpo. Incline levemente o tronco. Levante até a altura do ombro de forma controlada.',
      alternatives: 'Elevação Lateral com Halteres.',
      settings: 'Polia: Ajuste na posição mais baixa (Nível 1)',
      restInterval: 60
    },
    {
      name: 'Tríceps na Polia com Corda',
      muscleGroup: 'Tríceps',
      safetyTips: 'Mantenha os cotovelos fixos ao lado do corpo. Afaste a corda no final do movimento para contrair totalmente o tríceps.',
      alternatives: 'Tríceps na Polia com Barra V.',
      settings: 'Polia: Altura máxima (Nível 10)',
      restInterval: 60
    },
    {
      name: 'Tríceps Testa Polia Baixa',
      muscleGroup: 'Tríceps',
      safetyTips: 'Deitado no banco de costas para a polia. Mantenha os cotovelos apontados para o teto e evite que eles se abram para as laterais.',
      alternatives: 'Tríceps Testa com Halteres.',
      settings: 'Polia: Posição baixa (Nível 1), Banco horizontal',
      restInterval: 60
    },
    {
      name: 'Tríceps na Máquina (Dip)',
      muscleGroup: 'Tríceps',
      safetyTips: 'Mantenha a postura ereta e o peitoral aberto. Não deixe os ombros subirem em direção às orelhas na fase de subida.',
      alternatives: 'Tríceps Corda na Polia.',
      settings: 'Banco: Altura 5',
      restInterval: 60
    },
    {
      name: 'Flexão de Braço (Finalizador)',
      muscleGroup: 'Peitoral',
      safetyTips: 'Mantenha o corpo perfeitamente alinhado (abdômen e glúteos contraídos). Apoie os joelhos se necessário para manter a técnica.',
      alternatives: 'Supino na Máquina com carga leve.',
      settings: 'Livre (no colchonete)',
      restInterval: 60
    }
  ]

  // 2. Treino B: Costas/bíceps (9 exercícios)
  const treinoBExercisesData = [
    {
      name: 'Puxada Alta Pronada',
      muscleGroup: 'Costas',
      safetyTips: 'Puxe a barra até a altura do peitoral superior, inclinando o tronco levemente para trás. Nunca puxe atrás da nuca.',
      alternatives: 'Puxada com pegada supinada ou Graviton.',
      settings: 'Apoio de pernas: Nível 3',
      restInterval: 90
    },
    {
      name: 'Puxada Articulada Unilateral',
      muscleGroup: 'Costas',
      safetyTips: 'Puxe concentrando a força no cotovelo, levando-o em direção ao quadril. Mantenha o peito colado no apoio.',
      alternatives: 'Puxada Alta no Triângulo.',
      settings: 'Banco: Altura 4',
      restInterval: 90
    },
    {
      name: 'Remada Baixa com Triângulo',
      muscleGroup: 'Costas',
      safetyTips: 'Mantenha a coluna perfeitamente ereta. Puxe o triângulo em direção ao abdômen inferior sem balançar o tronco.',
      alternatives: 'Remada Máquina Articulada.',
      settings: 'Banco da polia baixa',
      restInterval: 90
    },
    {
      name: 'Crucifixo Invertido na Máquina',
      muscleGroup: 'Costas / Ombros',
      safetyTips: 'Ajuste o assento para que as mãos fiquem na linha do ombro. Faça o movimento puxando com os cotovelos para trás.',
      alternatives: 'Crucifixo Invertido no Cabo (Polia Alta).',
      settings: 'Banco: Altura 3, Braços: Posição 1',
      restInterval: 60
    },
    {
      name: 'Remada Curvada com Barra W',
      muscleGroup: 'Costas',
      safetyTips: 'Mantenha a coluna neutra e os joelhos semiflexionados. Puxe a barra em direção ao abdômen inferior com controle.',
      alternatives: 'Remada Serrote com Halter.',
      settings: 'Livre (Barra W)',
      restInterval: 90
    },
    {
      name: 'Rosca Bíceps na Barra W',
      muscleGroup: 'Bíceps',
      safetyTips: 'Mantenha a coluna ereta e evite balançar os ombros para ajudar no movimento. Controle a descida lenta do peso.',
      alternatives: 'Rosca Bíceps no Cabo.',
      settings: 'Livre (Barra W)',
      restInterval: 60
    },
    {
      name: 'Rosca Martelo com Corda no Cabo',
      muscleGroup: 'Bíceps',
      safetyTips: 'Mantenha os cotovelos colados ao lado do corpo. Pegada neutra. Não balance o tronco.',
      alternatives: 'Rosca Martelo com Halteres.',
      settings: 'Polia: Posição mais baixa (Nível 1)',
      restInterval: 60
    },
    {
      name: 'Rosca Scott na Máquina',
      muscleGroup: 'Bíceps',
      safetyTips: 'Ajuste o encosto de braço para que fique confortável abaixo das axilas. Não estenda totalmente os cotovelos no final da descida.',
      alternatives: 'Rosca Scott Livre.',
      settings: 'Banco: Altura 2',
      restInterval: 60
    },
    {
      name: 'Rosca Concentrada com Halter',
      muscleGroup: 'Bíceps',
      safetyTips: 'Apoie o cotovelo na parte interna da coxa. Faça o movimento de forma lenta e concentrada tanto na subida quanto na descida.',
      alternatives: 'Rosca Alternada com Halteres.',
      settings: 'Livre (sentado no banco)',
      restInterval: 60
    }
  ]

  // 3. Treino C: Quadríceps (6 exercícios)
  const treinoCExercisesData = [
    {
      name: 'Agachamento Livre com Barra',
      muscleGroup: 'Pernas',
      safetyTips: 'Mantenha os joelhos alinhados com as pontas dos pés. Não curve a lombar no ponto mais baixo do agachamento.',
      alternatives: 'Hack Machine ou Leg Press 45.',
      settings: 'Suporte da barra: Altura do peito (Nível 8)',
      restInterval: 120
    },
    {
      name: 'Leg Press 45 Horizontal',
      muscleGroup: 'Pernas',
      safetyTips: 'Mantenha toda a lombar e glúteos colados no encosto. Não estenda totalmente os joelhos para evitar o bloqueio articular.',
      alternatives: 'Leg Press 45 Tradicional.',
      settings: 'Assento: Distância Nível 5',
      restInterval: 90
    },
    {
      name: 'Cadeira Extensora (Isométrica)',
      muscleGroup: 'Pernas (Quadríceps)',
      safetyTips: 'Ajuste o rolo de espuma logo acima do tornozelo. Alinhe o joelho com o eixo da máquina. Segure 2s no topo.',
      alternatives: 'Leg Press Horizontal.',
      settings: 'Banco: Posição 3, Rolo de perna: Nível 2',
      restInterval: 60
    },
    {
      name: 'Afundo com Halteres',
      muscleGroup: 'Pernas',
      safetyTips: 'Mantenha o tronco ereto. Dê um passo largo para trás. O joelho da frente deve formar um ângulo de 90° e não ultrapassar o pé.',
      alternatives: 'Afundo no Smith.',
      settings: 'Livre (com halteres)',
      restInterval: 90
    },
    {
      name: 'Cadeira Adutora',
      muscleGroup: 'Pernas',
      safetyTips: 'Mantenha o quadril totalmente apoiado no banco. Feche as pernas de forma controlada, mantendo a tensão sem bater as placas.',
      alternatives: 'Adutor na Polia Baixa.',
      settings: 'Banco: Posição 4, Abertura: Nível 3',
      restInterval: 60
    },
    {
      name: 'Agachamento Sumô com Halter',
      muscleGroup: 'Pernas',
      safetyTips: 'Afaste as pernas além da largura dos ombros, com as pontas dos pés para fora (~45°). Os joelhos devem seguir o alinhamento dos pés.',
      alternatives: 'Agachamento Sumô no Cabo.',
      settings: 'Livre (segurando halter verticalmente)',
      restInterval: 90
    }
  ]

  // 4. Treino D: Perna completo (8 exercícios - Do print de referência)
  const treinoDExercisesData = [
    {
      name: 'Agachamento no Smith',
      muscleGroup: 'Pernas',
      safetyTips: 'Posicione os pés ligeiramente à frente da linha da barra. Mantenha os joelhos alinhados com os pés e a coluna protegida.',
      alternatives: 'Leg Press 45 ou Agachamento Hack.',
      settings: 'Trava de segurança: Altura do ombro',
      restInterval: 120
    },
    {
      name: 'Leg Press 45',
      muscleGroup: 'Pernas',
      safetyTips: 'Pés na largura dos ombros. Nunca bloqueie totalmente os joelhos no topo. Mantenha o quadril firme no assento e a lombar apoiada.',
      alternatives: 'Leg Press Horizontal ou Agachamento Smith.',
      settings: 'Inclinação do encosto: Nível 3',
      restInterval: 90
    },
    {
      name: 'Cadeira Extensora',
      muscleGroup: 'Pernas (Quadríceps)',
      safetyTips: 'Ajuste o encosto de modo que a articulação do joelho fique alinhada com o eixo da máquina. Evite movimentos explosivos bruscos.',
      alternatives: 'Leg Press Horizontal.',
      settings: 'Banco: Posição 3, Rolo de perna: Nível 2',
      restInterval: 60
    },
    {
      name: 'Cadeira Abdutora',
      muscleGroup: 'Pernas',
      safetyTips: 'Incline o tronco levemente para a frente para recrutar mais o glúteo médio. Controle a volta das pernas de forma lenta.',
      alternatives: 'Abdução na Polia Baixa.',
      settings: 'Encosto do banco: Posição 2',
      restInterval: 60
    },
    {
      name: 'Flexora em Pé',
      muscleGroup: 'Pernas (Isquiotibiais)',
      safetyTips: 'Apoie a coxa firmemente no suporte frontal. Puxe o rolo em direção ao glúteo de forma controlada sem flexionar a lombar.',
      alternatives: 'Mesa Flexora Deitada.',
      settings: 'Altura do rolo: Ajuste 3',
      restInterval: 60
    },
    {
      name: 'Elevação Pélvica com Barra Livre',
      muscleGroup: 'Pernas',
      safetyTips: 'Apoie as escápulas firme no banco. Empurre os calcanhares contra o chão e faça a extensão de quadril contraindo glúteos.',
      alternatives: 'Elevação Pélvica na Máquina.',
      settings: 'Banco padrão e Barra acolchoada',
      restInterval: 90
    },
    {
      name: 'Cadeira Flexora',
      muscleGroup: 'Pernas (Isquiotibiais)',
      safetyTips: 'Ajuste a trava de segurança das coxas bem firme para evitar que o corpo suba durante o movimento de flexão das pernas.',
      alternatives: 'Mesa Flexora Deitada.',
      settings: 'Banco: Posição 2, Trava de coxas: Posição 4',
      restInterval: 60
    },
    {
      name: 'Gêmeos no Hack',
      muscleGroup: 'Panturrilhas',
      safetyTips: 'Apoie a metade anterior dos pés na plataforma. Alongue ao máximo na descida e contraia forte por 2 segundos no topo.',
      alternatives: 'Gêmeos Sentado na Máquina.',
      settings: 'Apoio dos ombros: Altura média',
      restInterval: 60
    }
  ]

  // Helper para criar treinos A, B, C e D para um usuário com seus próprios exercícios independentes
  const assignWorkouts = async (userId: string, userName: string) => {
    // Criar cópias independentes dos exercícios para este usuário
    const exercisesA = await Promise.all(
      treinoAExercisesData.map((ex) => prisma.exercise.create({ data: ex }))
    )
    const exercisesB = await Promise.all(
      treinoBExercisesData.map((ex) => prisma.exercise.create({ data: ex }))
    )
    const exercisesC = await Promise.all(
      treinoCExercisesData.map((ex) => prisma.exercise.create({ data: ex }))
    )
    const exercisesD = await Promise.all(
      treinoDExercisesData.map((ex) => prisma.exercise.create({ data: ex }))
    )

    // Treino A: Peito/triceps/ombro
    await prisma.workout.create({
      data: {
        name: 'Treino A: Peito/tríceps/ombro',
        description: 'Foco em Empurrar - Ombros, Peitoral e Tríceps com alta estabilidade.',
        userId: userId,
        exercises: {
          connect: exercisesA.map((ex) => ({ id: ex.id })),
        },
        exerciseOrder: exercisesA.map((ex) => ex.id).join(','),
      },
    })

    // Treino B: Costas/biceps
    await prisma.workout.create({
      data: {
        name: 'Treino B: Costas/bíceps',
        description: 'Foco em Puxar - Costas, Bíceps e Deltóide Posterior.',
        userId: userId,
        exercises: {
          connect: exercisesB.map((ex) => ({ id: ex.id })),
        },
        exerciseOrder: exercisesB.map((ex) => ex.id).join(','),
      },
    })

    // Treino C: Quadriceps
    await prisma.workout.create({
      data: {
        name: 'Treino C: Quadríceps',
        description: 'Foco em Quadríceps, Adutores e estabilidade de core.',
        userId: userId,
        exercises: {
          connect: exercisesC.map((ex) => ({ id: ex.id })),
        },
        exerciseOrder: exercisesC.map((ex) => ex.id).join(','),
      },
    })

    // Treino D: Perna completo
    await prisma.workout.create({
      data: {
        name: 'Treino D: Perna completo',
        description: 'Treino completo de Pernas e Panturrilhas da referência de treino.',
        userId: userId,
        exercises: {
          connect: exercisesD.map((ex) => ({ id: ex.id })),
        },
        exerciseOrder: exercisesD.map((ex) => ex.id).join(','),
      },
    })

    console.log(`Treinos A, B, C e D com exercícios exclusivos criados para ${userName}.`)
  }

  await assignWorkouts(gustavo.id, gustavo.name)
  await assignWorkouts(michele.id, michele.name)

  console.log('Seeding concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('Erro durante o Seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
