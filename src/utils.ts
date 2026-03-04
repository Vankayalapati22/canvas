/**
 * Converts a number to its ordinal representation (e.g., 1st, 2nd, 3rd, 4th).
 */
export function ordinal(n: number): string {
    if (n >= 11 && n <= 13) return `${n}th`;
    switch (n % 10) {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
    }
}