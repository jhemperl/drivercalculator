/**
 * @format
 */

import {it, describe, expect} from '@jest/globals';
import {calculateGigStats} from '../src/utils/calculations';

describe('calculateGigStats', () => {
  it('calculates correct stats for a good offer', () => {
    const stats = calculateGigStats(25.0, 5.0, 0.18);
    expect(stats.payout).toBe(25.0);
    expect(stats.miles).toBe(5.0);
    expect(stats.grossPerMile).toBe(5.0);
    expect(stats.netProfit).toBeCloseTo(24.1, 1);
    expect(stats.colorCode).toBe('green');
  });

  it('calculates correct stats for a bad offer', () => {
    const stats = calculateGigStats(5.0, 10.0, 0.18);
    expect(stats.grossPerMile).toBe(0.5);
    expect(stats.colorCode).toBe('red');
  });

  it('calculates correct stats for a medium offer', () => {
    // $11 / 7mi = $1.57/mi, 25min => net=9.74, hourly=23.38 => yellow
    const stats = calculateGigStats(11.0, 7.0, 0.18, 'Uber', 25.0);
    expect(stats.colorCode).toBe('yellow');
  });

  it('handles zero miles gracefully', () => {
    const stats = calculateGigStats(10.0, 0, 0.18);
    expect(stats.grossPerMile).toBe(0);
    expect(stats.colorCode).toBe('red');
  });

  it('uses detected minutes when provided', () => {
    const stats = calculateGigStats(20.0, 8.0, 0.18, 'Uber', 30.0);
    expect(stats.timeMinutes).toBe(30.0);
  });

  it('falls back to estimated minutes when not provided', () => {
    const stats = calculateGigStats(20.0, 8.0, 0.18);
    expect(stats.timeMinutes).toBe(20.0); // 8 * 2.5
  });

  it('includes appName in result', () => {
    const stats = calculateGigStats(20.0, 8.0, 0.18, 'DoorDash');
    expect(stats.appName).toBe('DoorDash');
  });

  it('generates display string', () => {
    const stats = calculateGigStats(25.0, 5.0, 0.18);
    expect(stats.displayString).toContain('/mi');
    expect(stats.displayString).toContain('/hr');
  });

  it('handles negative net profit', () => {
    const stats = calculateGigStats(1.0, 100.0, 0.5);
    expect(stats.netProfit).toBeLessThan(0);
    expect(stats.colorCode).toBe('red');
  });

  it('classifies green when above both thresholds', () => {
    const stats = calculateGigStats(30.0, 5.0, 0.18, 'Uber', 25.0);
    expect(stats.colorCode).toBe('green');
  });

  it('classifies red when below hourly threshold', () => {
    const stats = calculateGigStats(10.0, 5.0, 0.18, 'Uber', 40.0);
    expect(stats.colorCode).toBe('red');
  });
});
