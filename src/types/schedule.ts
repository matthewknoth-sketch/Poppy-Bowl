import { z } from 'zod';

// TypeScript interfaces for the schedule structure
export interface Game {
  id: string;
  home: string;
  away: string;
  kickoff: string;
  winner: 'home' | 'away' | null;
}

export interface Week {
  week: number;
  deadline: string;
  games: Game[];
}

export interface Season {
  season: string;
  weeks: Week[];
}

// Zod schemas for runtime validation
const GameSchema = z.object({
  id: z.string().min(1, 'Game ID is required'),
  home: z.string().min(1, 'Home team is required'),
  away: z.string().min(1, 'Away team is required'),
  kickoff: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid kickoff date format'
  }),
  winner: z.enum(['home', 'away']).nullable()
});

const WeekSchema = z.object({
  week: z.number().int().positive('Week number must be positive'),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid deadline date format'
  }),
  games: z.array(GameSchema).min(1, 'At least one game is required per week')
}).refine((week) => {
  // Validate that deadline is before all game kickoffs
  const deadlineDate = new Date(week.deadline);
  return week.games.every(game => {
    const kickoffDate = new Date(game.kickoff);
    return deadlineDate <= kickoffDate;
  });
}, {
  message: 'Deadline must be before or equal to all game kickoffs in the week'
});

export const ScheduleSchema = z.object({
  season: z.string().min(1, 'Season is required'),
  weeks: z.array(WeekSchema).min(1, 'At least one week is required')
});

// Type inference from Zod schemas
export type ScheduleData = z.infer<typeof ScheduleSchema>;

// Helper function to validate schedule data
export function validateSchedule(data: unknown): ScheduleData {
  try {
    return ScheduleSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Schedule validation failed: ${errorMessages.join(', ')}`);
    }
    throw error;
  }
}
