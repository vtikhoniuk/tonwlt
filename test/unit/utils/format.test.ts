import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTon, formatDate, timeAgo } from '../../../src/utils/format';

describe('formatTon', () => {
  it('formats with minimum 2 decimal places', () => {
    expect(formatTon('1.5')).toBe('1.50');
  });

  it('formats with at most 4 decimal places', () => {
    expect(formatTon('1.123456')).toBe('1.1235');
  });

  it('returns "0" for NaN input', () => {
    expect(formatTon('not-a-number')).toBe('0');
  });

  it('formats zero as "0.00"', () => {
    expect(formatTon('0')).toBe('0.00');
  });

  it('formats integer values', () => {
    expect(formatTon('10')).toBe('10.00');
  });
});

describe('formatDate', () => {
  it('converts UNIX timestamp to ru-RU formatted date', () => {
    const result = formatDate(1700000000);
    // Should contain date parts in some format
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it('handles timestamp 0 (epoch)', () => {
    const result = formatDate(0);
    expect(result).toBeTruthy();
  });
});

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1700000000 * 1000)); // fixed "now"
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "только что" for less than 60 seconds ago', () => {
    expect(timeAgo(1700000000 - 30)).toBe('только что');
  });

  it('returns minutes ago for 60-3599 seconds', () => {
    expect(timeAgo(1700000000 - 120)).toBe('2 мин назад');
  });

  it('returns hours ago for 3600-86399 seconds', () => {
    expect(timeAgo(1700000000 - 7200)).toBe('2 ч назад');
  });

  it('returns days ago for 86400-604799 seconds', () => {
    expect(timeAgo(1700000000 - 172800)).toBe('2 дн назад');
  });

  it('falls back to formatDate for older timestamps', () => {
    const oldTimestamp = 1700000000 - 700000;
    const result = timeAgo(oldTimestamp);
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });
});
