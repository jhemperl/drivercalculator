export interface GigStats {
  payout: number;
  miles: number;
  estimatedMinutes: number;
  grossPerMile: number;
  netProfit: number;
  netHourly: number;
  colorCode: 'green' | 'yellow' | 'red';
  displayString: string;
}

export function calculateGigStats(
  payout: number,
  miles: number,
  costPerMile: number,
): GigStats {
  const estimatedMinutes = miles * 2.5;
  const grossPerMile = miles > 0 ? payout / miles : 0;
  const netProfit = payout - miles * costPerMile;
  const netHourly =
    estimatedMinutes > 0 ? (netProfit / estimatedMinutes) * 60 : 0;

  let colorCode: 'green' | 'yellow' | 'red';
  if (netHourly > 22 && grossPerMile > 1.5) {
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
    estimatedMinutes,
    grossPerMile,
    netProfit,
    netHourly,
    colorCode,
    displayString,
  };
}
