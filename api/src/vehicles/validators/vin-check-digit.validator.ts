import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator'

const TRANS: Record<string, number> = {
  A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8,
  J:1, K:2, L:3, M:4, N:5, P:7, R:9,
  S:2, T:3, U:4, V:5, W:6, X:7, Y:8, Z:9,
  '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
}
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

export function isVinCheckDigitValid(vin: string): boolean {
  const upper = vin.toUpperCase()
  if (upper.length !== 17) return true // @Matches handles format
  const sum = upper.split('').reduce((acc, ch, i) => acc + (TRANS[ch] ?? 0) * VIN_WEIGHTS[i], 0)
  const rem = sum % 11
  const expected = rem === 10 ? 'X' : String(rem)
  return upper[8] === expected
}

@ValidatorConstraint({ name: 'vinCheckDigit', async: false })
export class VinCheckDigitConstraint implements ValidatorConstraintInterface {
  validate(vin: unknown): boolean {
    if (typeof vin !== 'string') return true
    return isVinCheckDigitValid(vin)
  }
  defaultMessage(): string {
    return 'VIN check digit (position 9) is invalid'
  }
}
