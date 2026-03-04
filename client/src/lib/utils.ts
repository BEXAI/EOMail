import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEmailTime(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  const days = diff / (1000 * 60 * 60 * 24);

  if (hours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getSenderColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-purple-600",
    "bg-green-600",
    "bg-rose-500",
    "bg-amber-500",
    "bg-teal-600",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-cyan-600",
    "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
