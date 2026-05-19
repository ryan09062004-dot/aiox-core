import type { WorkoutSession } from '@shapeai/shared'

export const STANDARD_HOME_PLAN: WorkoutSession[] = [
  {
    day: 'Segunda',
    focus: 'Peito + Tríceps',
    exercises: [
      { name: 'Flexão no chão', muscle_group: 'chest', sets: 4, reps: '12-15', rest_seconds: 60, note: null },
      { name: 'Flexão com mãos fechadas', muscle_group: 'triceps', sets: 3, reps: '10-12', rest_seconds: 60, note: null },
      { name: 'Flexão com apoio elevado', muscle_group: 'chest', sets: 3, reps: '10-12', rest_seconds: 60, note: 'Pés em cadeira ou sofá' },
      { name: 'Tríceps no banco', muscle_group: 'triceps', sets: 3, reps: '12-15', rest_seconds: 60, note: 'Use cadeira ou sofá' },
      { name: 'Flexão diamante', muscle_group: 'triceps', sets: 3, reps: '10', rest_seconds: 60, note: null },
    ],
  },
  {
    day: 'Terça',
    focus: 'Bíceps + Costas',
    exercises: [
      { name: 'Remada com mochila', muscle_group: 'lats', sets: 4, reps: '12', rest_seconds: 60, note: 'Mochila com livros/garrafas de água' },
      { name: 'Rosca com garrafa', muscle_group: 'biceps', sets: 3, reps: '15', rest_seconds: 45, note: 'Garrafa com areia ou água (1,5-2L)' },
      { name: 'Superman', muscle_group: 'lats', sets: 3, reps: '15', rest_seconds: 45, note: 'Deitado de bruços, eleva braços e pernas' },
      { name: 'Isometria de costas na mesa', muscle_group: 'lats', sets: 3, reps: '12', rest_seconds: 60, note: 'Segure a borda da mesa, incline o corpo para trás' },
      { name: 'Rosca concentrada com garrafa', muscle_group: 'biceps', sets: 3, reps: '12 cada', rest_seconds: 45, note: null },
    ],
  },
  {
    day: 'Quarta',
    focus: 'Pernas',
    exercises: [
      { name: 'Agachamento livre', muscle_group: 'quadriceps', sets: 4, reps: '15-20', rest_seconds: 60, note: null },
      { name: 'Avanço alternado', muscle_group: 'quadriceps', sets: 3, reps: '12 cada', rest_seconds: 60, note: null },
      { name: 'Agachamento sumô', muscle_group: 'glutes', sets: 3, reps: '15-20', rest_seconds: 60, note: null },
      { name: 'Ponte de glúteos', muscle_group: 'glutes', sets: 4, reps: '20', rest_seconds: 45, note: null },
      { name: 'Panturrilha em pé', muscle_group: 'calves', sets: 4, reps: '20-25', rest_seconds: 30, note: 'Apoio em degrau se possível' },
    ],
  },
  {
    day: 'Quinta',
    focus: 'Ombros + Trapézio',
    exercises: [
      { name: 'Desenvolvimento com garrafa', muscle_group: 'shoulders', sets: 4, reps: '12-15', rest_seconds: 60, note: 'Garrafa com areia (1-2kg)' },
      { name: 'Elevação lateral com garrafa', muscle_group: 'shoulders', sets: 3, reps: '15', rest_seconds: 45, note: null },
      { name: 'Elevação frontal com garrafa', muscle_group: 'shoulders', sets: 3, reps: '15', rest_seconds: 45, note: null },
      { name: 'Flexão pike', muscle_group: 'shoulders', sets: 3, reps: '10-12', rest_seconds: 60, note: 'Quadril alto, cabeça em direção ao chão' },
      { name: 'Encolhimento de ombros com mochila', muscle_group: 'shoulders', sets: 3, reps: '20', rest_seconds: 45, note: null },
    ],
  },
  {
    day: 'Sexta',
    focus: 'Glúteos + Abdômen',
    exercises: [
      { name: 'Agachamento búlgaro', muscle_group: 'glutes', sets: 3, reps: '12 cada', rest_seconds: 60, note: 'Pé traseiro em cadeira' },
      { name: 'Coice de glúteo', muscle_group: 'glutes', sets: 3, reps: '15 cada', rest_seconds: 45, note: null },
      { name: 'Abdominal crunch', muscle_group: 'abs', sets: 3, reps: '20', rest_seconds: 30, note: null },
      { name: 'Prancha abdominal', muscle_group: 'abs', sets: 3, reps: '45s', rest_seconds: 30, note: null },
      { name: 'Mountain climber', muscle_group: 'abs', sets: 3, reps: '30s', rest_seconds: 30, note: null },
    ],
  },
]
