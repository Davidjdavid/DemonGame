// Random-encounter tables per floor: [type, weight] (new types weigh more), level range, group size, step gap.
// Hero level targets on arrival: 1F 1, 2F 4, 3F 7, 4F 10, 5F 13, 6F 15, 7F 17 (boss at ~18). See PROGRESS balance table.
export const ENCOUNTERS = {
  f1: { table: [['slime', 2], ['gnawer', 2], ['wisp', 2], ['dustmoth', 2], ['husk', 1], ['imp', 1]], level: [1, 3], size: [1, 2], rate: [15, 30] },
  f2: { table: [['thornling', 2], ['hound', 2], ['shrike', 2], ['stinger', 2], ['viper', 2], ['imp', 1], ['dustmoth', 1]], level: [3, 6], size: [2, 3], rate: [15, 30] },
  f3: { table: [['bogjelly', 2], ['claydoll', 2], ['bonewalker', 2], ['shellback', 2], ['stinger', 1], ['viper', 1], ['hound', 1]], level: [6, 9], size: [2, 3], rate: [15, 30] },
  f4: { table: [['harpy', 2], ['watcher', 2], ['bloomwitch', 2], ['direwolf', 2], ['mantis', 2], ['shellback', 1]], level: [9, 12], size: [2, 3], rate: [16, 30] },
  f5: { table: [['wraith', 2], ['naga', 2], ['acidooze', 2], ['irongolem', 2], ['ironclaw', 2], ['mantis', 1]], level: [12, 15], size: [2, 3], rate: [16, 30] },
  f6: { table: [['thunderbird', 2], ['gazer', 2], ['hellion', 2], ['dreadknight', 2], ['treant', 2], ['naga', 1]], level: [15, 18], size: [2, 4], rate: [16, 30] },
  f7: { table: [['hellion', 1], ['dreadknight', 1], ['gazer', 1], ['thunderbird', 1], ['wraith', 1], ['treant', 1]], level: [17, 19], size: [2, 3], rate: [20, 35] },
};
