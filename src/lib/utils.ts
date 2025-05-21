
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNowStrict } from "date-fns";
import type { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(timestamp: Timestamp | Date | number | undefined): string {
  if (timestamp === undefined || timestamp === null) return "";
  
  let date: Date;
  if (typeof timestamp === 'number') {
    date = new Date(timestamp); // Assume RTDB timestamp (milliseconds)
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else { // Firestore Timestamp
    date = (timestamp as Timestamp).toDate();
  }
  
  if (!date || isNaN(date.getTime())) return "";

  return formatDistanceToNowStrict(date, { addSuffix: true });
}

