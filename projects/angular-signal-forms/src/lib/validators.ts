import { FormElementValidatorFn } from './forms';

export function useValidator<T>(validator: FormElementValidatorFn<T>, cond: () => boolean): FormElementValidatorFn<T> {
  return (value?: T) => (!cond()) ? { status: 'VALID' } : validator(value);
}

export function required(): FormElementValidatorFn<any> {
  return (value?: any) =>
    (value == null || value === '') ? { status: 'INVALID', errors: { required: true } }
      : { status: 'VALID' };
}

export function minLength(length: number): FormElementValidatorFn<string> {
  return (value?: string) =>
    (value == null || value.length < length) ? { status: 'INVALID', errors: { minLength: { currentLength: value?.length, minLength: length } } }
      : { status: 'VALID' };
}

export function maxLength(length: number): FormElementValidatorFn<string> {
  return (value?: string) =>
    (value == null || value.length > length) ? { status: 'INVALID', errors: { maxLength: { currentLength: value?.length, maxLength: length } } }
      : { status: 'VALID' };
}

export function min(minValue: number): FormElementValidatorFn<number | undefined> {
  return (value?: number | undefined) =>
    (value == null || value < minValue) ? { status: 'INVALID', errors: { min: { value: value, minValue: minValue } } }
      : { status: 'VALID' };
}

export function max(maxValue: number): FormElementValidatorFn<number | undefined> {
  return (value?: number | undefined) =>
    (value == null || value > maxValue) ? { status: 'INVALID', errors: { max: { value: value, maxValue: maxValue } } }
      : { status: 'VALID' };
}
