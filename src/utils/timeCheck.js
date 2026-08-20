const TARGETS = {
  "Pembuatan LHA Reject": 0,
  "LHA Reject to PPIC": 2,
  "Pembuatan SKR": 2,
  "Approval Supplier": 5,
  "Harga dari Accounting": 5,
  "Pembuatan PO": 1,
  "Muat Return": 6
};

/**
 * Checks if the time between lastInputDate and currentDate exceeds the target days for the stage
 * @param {string} currentStage - The stage name
 * @param {Date} lastInputDate - The date of the previous progress
 * @param {Date} currentDate - The current local device date
 * @returns {string|null} Warning message if exceeded, null if within target
 */
export function checkTargetTime(currentStage, lastInputDate, currentDate) {
  const targetDays = TARGETS[currentStage];
  
  if (!targetDays || targetDays === 0) return null;
  
  // Calculate difference in days
  const diffTime = Math.abs(currentDate - lastInputDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays > targetDays) {
    return `Peringatan: Progres ini melebihi target (${diffDays} hari vs target ${targetDays} hari).`;
  }
  
  return null;
}
