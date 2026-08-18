import { calculateAllowedWeeksFromSchedule } from './src/lib/supplierUtils.js';

const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

const monthlySchedule = {
    "Agosto": [5]
};
const result = calculateAllowedWeeksFromSchedule(monthlySchedule, 2026);
console.log("Allowed weeks calculated by util (should match S5 logic, which mapped to 35):", result);

const isDateAllowed = (date) => {
    let isWeekAllowed = true;
    const weekNum = getWeekNumber(date);
    if (result && result.length > 0) {
      if (!result.includes(weekNum)) {
        isWeekAllowed = false;
      }
    }
    return isWeekAllowed;
};

const firstDay = new Date(2026, 7, 1);
const lastDay = new Date(2026, 7 + 1, 0).getDate();
const totalDays = firstDay.getDay() + lastDay;
const totalRows = Math.ceil(totalDays / 7);

for (let r = 0; r < totalRows; r++) {
    const rowDate = new Date(2026, 7, (r * 7) + 1 - firstDay.getDay() + 3);
    const weekNum = getWeekNumber(rowDate);
    const allowed = isDateAllowed(rowDate);
    console.log(`Row ${r} -> Date: ${rowDate.toISOString().split('T')[0]}, WeekNum: ${weekNum}, Allowed: ${allowed}`);
}
