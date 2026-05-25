export interface GigStats {
  payout: number;
  miles: number;
  timeMinutes: number;
  grossPerMile: number;
  netProfit: number;
  netHourly: number;
  colorCode: 'green' | 'yellow' | 'red';
  displayString: string;
  appName?: string;
}

export function calculateGigStats(
  payout: number,
  miles: number,
  costPerMile: number,
  appName?: string,
  detectedMinutes?: number,
): GigStats {
  // Use detected minutes if available, otherwise fallback to 2.5 min/mile estimate
  const timeMinutes =
    detectedMinutes && detectedMinutes > 0 ? detectedMinutes : miles * 2.5;

  const grossPerMile = miles > 0 ? payout / miles : 0;
  const netProfit = payout - miles * costPerMile;
  const netHourly = timeMinutes > 0 ? (netProfit / timeMinutes) * 60 : 0;

  let colorCode: 'green' | 'yellow' | 'red';
  // Standard "Good" thresholds: > $2/mi and > $25/hr net
  if (netHourly > 25 && grossPerMile > 2.0) {
    colorCode = 'green';
  } else if (netHourly < 18 || grossPerMile < 1.0) {
    colorCode = 'red';
  } else {
    colorCode = 'yellow';
  }

  const displayString = `$${grossPerMile.toFixed(2)}/mi | $${netHourly.toFixed(
    0,
  )}/hr`;

  return {
    payout,
    miles,
    timeMinutes,
    grossPerMile,
    netProfit,
    netHourly,
    colorCode,
    displayString,
    appName,
  };
}
