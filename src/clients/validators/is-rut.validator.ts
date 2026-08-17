import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Sin puntos ni guion, mayúsculas: "176543210" / "12345678K" (ver domain-schema).
export function normalizeRut(rut: string): string {
  return rut.replace(/[.-]/g, '').toUpperCase();
}

// Algoritmo de módulo 11 sobre el RUT chileno ya normalizado.
export function isValidRut(rut: string): boolean {
  const cuerpo = rut.slice(0, -1);
  const dv = rut.slice(-1);
  if (!/^\d{7,8}$/.test(cuerpo)) {
    return false;
  }

  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === esperado;
}

@ValidatorConstraint({ name: 'isRut' })
class IsRutConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidRut(value);
  }

  defaultMessage(): string {
    return 'rut debe ser un RUT chileno válido';
  }
}

export function IsRut(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsRutConstraint,
    });
  };
}
