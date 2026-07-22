# 🧠 SmartLift - Treino Inteligente e Seguro

O **SmartLift** é um Web App mobile-first de acompanhamento de treinos para musculação, projetado especificamente para uso prático na academia. Ele nasceu de uma frustração comum: os aplicativos de academia tradicionais são confusos, poluídos e lentos durante a execução do treino. 

Desenvolvido especialmente para o uso pessoal de **Gustavo** e **Michele**, o SmartLift foca em simplicidade, segurança articular para iniciantes, agilidade na marcação de carga e adaptabilidade rápida.

---

## 🎯 Problemas que o SmartLift resolve

1. **"Aparelho Ocupado? E agora?"**: Durante o treino, se a máquina que você precisa estiver ocupada, o app sugere instantaneamente um **equipamento alternativo** equivalente para trabalhar o mesmo grupo muscular sem quebrar seu ritmo.
2. **"Como regula esse banco?"**: Lembrar o ajuste de altura do banco, encosto ou rolo de cada máquina é difícil quando se está começando. O app traz um botão de **Regulagem** para exibir as posições exatas do aparelho.
3. **Ergonomia durante o treino**: Botões pequenos e telas cheias de informações são péssimos para dedos suados e fadiga pós-série. O SmartLift exibe uma série por vez com controles de ajuste (`+` e `-`) gigantescos e confortáveis.
4. **Foco e Constância**: Possui um **cronômetro de descanso integrado** que inicia automaticamente ao concluir uma série (com som de alerta no final) e um **indicador inteligente de próximo treino** baseado no histórico ABCD.

---

## ✨ Funcionalidades Principais

* **Divisão de Treinos ABCD Real**:
  * **Treino A**: Peito / tríceps / ombro (11 exercícios)
  * **Treino B**: Costas / bíceps (9 exercícios)
  * **Treino C**: Quadríceps (6 exercícios)
  * **Treino D**: Perna completo (8 exercícios)
* **Execução Focada**: Lista de exercícios em acordeões colapsáveis que expandem um por um. Ao terminar, o botão "Concluir Exercício" abre o próximo da lista de forma automática.
* **Seletor de 4 Série**: Foco no preenchimento de uma série por vez (Séries 1 a 4) com histórico da última carga visível para comparação rápida.
* **Gestão de Perfil Individual**: Alternância rápida entre Gustavo e Michele na aba Perfil, carregando o histórico de cargas, fotos de perfil (salvas diretamente no banco de dados como Base64) e validade da ficha individualmente.
* **Gerenciador de Fichas (Admin)**: Interface completa para adicionar, editar detalhes (dicas, regulagens, descansos) ou excluir exercícios das fichas sem mexer no banco de dados.

---

## 🛠️ Stack Tecnológica

* **Framework**: [Next.js](https://nextjs.org/) (App Router & Server Actions)
* **Estilização**: [Tailwind CSS](https://tailwindcss.com/) (Design Dark Mode e Glassmorphism nativos)
* **Banco de Dados**: [Neon](https://neon.tech/) (PostgreSQL Serverless de alta performance)
* **ORM**: [Prisma](https://www.prisma.io/) (com conexão via driver serverless via WebSockets)
* **Ícones**: [Lucide React](https://lucide.dev/)

---

## 🚀 Como rodar localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/guuhferiani/treino.git
cd treino
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto e configure suas conexões com o Neon:
```env
DATABASE_URL="postgresql://usuario:senha@ep-nome-projeto.pooler.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://usuario:senha@ep-nome-projeto.tech/neondb?sslmode=require"
```

### 4. Rodar as migrações do banco
```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Alimentar o banco (Seeding)
Cadastra os usuários Gustavo/Michele e a ficha ABCD inicial com 34 exercícios completos:
```bash
npx prisma db seed
```

### 6. Executar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador (e ative o modo responsivo móvel nas ferramentas de desenvolvedor).

---

## 📦 Deploy na Vercel

Ao conectar o repositório à Vercel:
1. Adicione as variáveis de ambiente `DATABASE_URL` e `DIRECT_URL` nas configurações do projeto na Vercel.
2. Certifique-se de que o comando de build configurado seja `next build` (a geração do cliente Prisma ocorrerá automaticamente através do gancho de `postinstall` configurado no `package.json`).
