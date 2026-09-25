export interface Module {
  id: string;
  code: string;       // e.g., "SOFT06001"
  name: string;       // e.g., "Software Engineering"
  color: string;      // Tailwind color badge (e.g., "emerald")
  deckCount?: number;
  taskCount?: number;
}