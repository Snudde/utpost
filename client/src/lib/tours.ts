// import type { TourLog } from '@utpost/shared';

// export elevationGain = (logs: TourLog[]): number => {
//   return logs.reduce((sum, log i) => {
//     if (i === 0) return 0
//     const diff = log-elevation m - logs[i -1].elevation_m
//     return diff > 0 ? sum + diff : sum
//   }, 0)

// Lösning
// export const elevationGain = (logs: TourLog[]): number => {
//     logs
//     .map((log) => log.elevation_m)
//     .filter((elevation_m) => elevation_m !== null)
//     .reduce((sum, elevation_m, i, elevation_ms) => {
//         if (i === 0) return 0
//         const diff = elevation_m - elevation_ms[i - 1]
//         return diff > 0 ? sum + diff : sum
//     }, 0)

// }
