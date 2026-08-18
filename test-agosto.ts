import { calculateAllowedWeeksFromSchedule } from './src/lib/supplierUtils.js';

const monthlySchedule = {
    "Agosto": [5]
};

const result = calculateAllowedWeeksFromSchedule(monthlySchedule, 2026);
console.log("Allowed weeks for Agosto S5:", result);
