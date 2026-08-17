## Context

El modelo `Client` ya está migrado (`prisma/schema.prisma`, capacidad `domain-schema`):

```prisma
model Client {
  id    String  @id @default(uuid(7)) @db.Char(36)
  name  String  @db.VarChar(160)
  rut   String? @unique @db.VarChar(12) // sin puntos ni guion: "176543210" / "12345678K"
  email String? @db.VarChar(180)
  phone String? @db.VarChar(30)
  notes String? @db.Text
  deleted_at DateTime? // soft delete
  @@map("clients")
}
```

A diferencia de `User`, `email` en `Client` **no** es `@unique`; el único campo único es `rut`, y es opcional. `PrismaModule`/`PrismaService` (capacidad `database`) y el módulo `auth` (JWT guards, `RolesGuard`, decorador `@Roles`, capacidad `auth`) ya existen y son el mismo mecanismo usado por `users`. Ver `proposal.md` - Why para la motivación de negocio y `specs/clients/spec.md` para el contrato de comportamiento.

## Goals / Non-Goals

**Goals:**
- Implementar el CRUD de clientes (`ClientsModule`/`Controller`/`Service`/DTOs) sobre el modelo `Client` ya migrado, sin modificar el schema de Prisma.
- Aplicar `JwtAuthGuard` + `RolesGuard` con roles distintos por operación: `ADMIN`+`PHOTOGRAPHER` para listar/obtener/crear/editar, solo `ADMIN` para eliminar (a diferencia de `users`, donde todo el controller es `ADMIN`-only).
- Respetar `deleted_at` como soft delete, igual que en `users`: ninguna lectura, edición o eliminación debe considerar clientes ya eliminados como existentes.
- Cubrir el módulo con pruebas unitarias (servicio) y e2e (endpoints HTTP + enforcement de rol, contra base de datos real).

**Non-Goals:**
- No se expone la relación `Client.projects`/`Client.quotes` desde este módulo.
- No se implementa restauración (undelete), paginación avanzada, ni búsqueda/filtrado por nombre o RUT.

## Decisions

### Roles por operación en vez de a nivel de controller
`users.controller.ts` aplica `@Roles(UserRole.ADMIN)` una sola vez a nivel de clase porque todas sus operaciones requieren `ADMIN`. `clients` necesita dos conjuntos de roles distintos (lectura/escritura vs. eliminación), así que `@Roles(...)` se aplica por handler (`@Get`, `@Post`, `@Patch` con `ADMIN, PHOTOGRAPHER`; `@Delete` con `ADMIN`), manteniendo `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel de clase. `RolesGuard` ya soporta esto vía `getAllAndOverride` (el override de método gana sobre el de clase), sin cambios en `auth`.

### Validación del RUT con dígito verificador (módulo 11)
El comentario del schema indica que `rut` se guarda normalizado, sin puntos ni guion (ej. `"176543210"` o `"12345678K"`). Se valida con un validador custom de `class-validator` (`@IsRut`) que normaliza el valor (sin puntos ni guion, mayúsculas) y aplica el algoritmo de módulo 11 sobre el cuerpo del RUT para calcular el dígito verificador esperado y compararlo contra el recibido. Función de referencia usada como base de la implementación:

```ts
export function validarRut(rut: string): boolean {
  const limpio = rut.replace(/[.-]/g, '').toUpperCase()
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false

  let suma = 0, mult = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult
    mult = mult === 7 ? 2 : mult + 1
  }
  const resto = 11 - (suma % 11)
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dv === esperado
}
```

Un RUT con formato correcto pero dígito verificador inválido se rechaza (400). Alternativa descartada: validar solo el formato sin dígito verificador — se prefiere el cálculo real porque tiene la misma complejidad de implementación y evita persistir RUTs inválidos.

### Sin unicidad de email a nivel de aplicación
A diferencia de `users`, `email` en `Client` no tiene `@unique` en el schema, por lo que no se valida ni se maneja como conflicto — dos clientes pueden compartir el mismo email (ej. una pareja en una boda). Solo `rut` dispara `ConflictException` (409) ante un `P2002` de Prisma.

### Reutilización directa del patrón de `users`
Estructura de archivos (`clients.module.ts`, `.controller.ts`, `.service.ts`, `dto/create-client.dto.ts`, `dto/update-client.dto.ts`, `dto/client-response.dto.ts`, `dto/message-response.dto.ts`, `mappers/client-response.mapper.ts`) y convenciones (soft delete vía `update({ deleted_at: new Date() })`, `NotFoundException`/`ConflictException`, `toClientResponse` explícito) calcadas de `src/users/*` para mantener el codebase consistente. No se introduce una clase base compartida entre `users` y `clients`: ambos módulos son pequeños y una abstracción prematura complicaría más de lo que ahorra.

### Estrategia de pruebas
- Unitarias: `ClientsService` con `PrismaService` mockeado (jest), igual patrón que `users.service.spec.ts`.
- E2E: `test/clients.e2e-spec.ts` con `supertest`, sembrando un usuario por rol (`ADMIN`, `PHOTOGRAPHER`, `ASSISTANT`) para cubrir el enforcement de rol por endpoint, y limpiando `clients`/`users` antes/después de cada test.

## Risks / Trade-offs

- **[Roles por handler en vez de por clase]** Aumenta ligeramente la superficie de repetición de `@Roles(...)` frente al patrón de `users` → Mitigación: es la única forma de expresar el requisito real (eliminar es más restrictivo que el resto) sin tocar `RolesGuard`; se cubre explícitamente en los tests e2e para evitar regresiones silenciosas.
