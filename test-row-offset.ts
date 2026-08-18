const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

const m = 7; // Agosto
const firstDay = new Date(2026, m, 1);

console.log("firstDay.getDay():", firstDay.getDay()); // 0 = Sun, 6 = Sat
for (let r = 0; r < 6; r++) {
  // Calendar.tsx logic: (r * 7) + 1 - firstDay.getDay() + 3 
  const rowDateCal = new Date(2026, m, (r * 7) + 1 - firstDay.getDay() + 3);
  const weekNumCal = getWeekNumber(rowDateCal);

  console.log(`Row ${r}: Calendar Week -> ${weekNumCal}`);
}
