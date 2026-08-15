## Purpose

Autentica al personal del estudio mediante email y contraseña, emite y renueva tokens de sesión (access/refresh), permite cerrar sesión revocando el refresh token, y provee el mecanismo con el que otras rutas de la API exigen autenticación y un rol específico.

## ADDED Requirements

### Requirement: Iniciar sesión con email y contraseña
El sistema SHALL exponer un endpoint que reciba un email y una contraseña, valide las credenciales contra el usuario activo y no eliminado correspondiente, y devuelva un access token, un refresh token y los datos del usuario autenticado (sin el campo de contraseña).

#### Scenario: Login exitoso
- **WHEN** un cliente envía un email y contraseña que corresponden a un usuario activo y no eliminado
- **THEN** el sistema responde 200 con `access_token`, `refresh_token` y los datos del usuario autenticado, sin el campo de contraseña

#### Scenario: Contraseña incorrecta
- **WHEN** un cliente envía un email que existe pero una contraseña que no coincide
- **THEN** el sistema responde 401 con un mensaje de credenciales inválidas, sin indicar cuál de los dos datos falló

#### Scenario: Email inexistente
- **WHEN** un cliente envía un email que no corresponde a ningún usuario
- **THEN** el sistema responde 401 con un mensaje de credenciales inválidas, sin indicar que el email no existe

#### Scenario: Usuario inactivo
- **WHEN** un cliente envía credenciales válidas de un usuario con `is_active: false`
- **THEN** el sistema responde 401 y no emite tokens

#### Scenario: Usuario eliminado lógicamente
- **WHEN** un cliente envía credenciales que corresponden a un usuario eliminado lógicamente
- **THEN** el sistema responde 401 y no emite tokens, como si el usuario no existiera

#### Scenario: Datos de login inválidos
- **WHEN** un cliente envía la solicitud de login sin email, sin contraseña, o con formato de email inválido
- **THEN** el sistema responde 400 con los detalles de validación, sin emitir tokens

### Requirement: Renovar tokens mediante refresh token
El sistema SHALL exponer un endpoint que reciba un refresh token, valide que exista, no esté revocado, no haya expirado y corresponda a un usuario activo y no eliminado, y en tal caso emita un nuevo access token y un nuevo refresh token, revocando el refresh token utilizado.

#### Scenario: Renovación exitosa
- **WHEN** un cliente envía un refresh token vigente, no revocado, y que pertenece a un usuario activo y no eliminado
- **THEN** el sistema responde 200 con un nuevo `access_token` y un nuevo `refresh_token`, y revoca el refresh token recibido para que no pueda reutilizarse

#### Scenario: Refresh token expirado
- **WHEN** un cliente envía un refresh token cuya fecha de expiración ya pasó
- **THEN** el sistema responde 401 sin emitir nuevos tokens

#### Scenario: Refresh token revocado o inexistente
- **WHEN** un cliente envía un refresh token que ya fue revocado (por logout o por un uso previo) o que no existe
- **THEN** el sistema responde 401 sin emitir nuevos tokens

#### Scenario: Refresh token de usuario inactivo o eliminado
- **WHEN** un cliente envía un refresh token válido pero el usuario asociado está inactivo o fue eliminado lógicamente
- **THEN** el sistema responde 401 sin emitir nuevos tokens

### Requirement: Cerrar sesión revocando el refresh token
El sistema SHALL exponer un endpoint que reciba un refresh token vigente y lo marque como revocado, de modo que no pueda usarse para renovar tokens posteriormente.

#### Scenario: Logout exitoso
- **WHEN** un cliente envía un refresh token vigente y no revocado a través del endpoint de logout
- **THEN** el sistema marca ese refresh token como revocado y responde 200 o 204

#### Scenario: Logout con refresh token inválido
- **WHEN** un cliente envía un refresh token que no existe o que ya estaba revocado
- **THEN** el sistema responde 401

### Requirement: Proteger rutas mediante autenticación y rol
El sistema SHALL proveer un mecanismo de autenticación basado en el access token (JWT) y un mecanismo de autorización basado en el rol del usuario autenticado, de modo que cualquier ruta pueda exigir un access token válido y, opcionalmente, uno o más roles permitidos.

#### Scenario: Acceso sin token
- **WHEN** un cliente solicita una ruta protegida sin incluir un access token
- **THEN** el sistema responde 401 sin ejecutar la operación solicitada

#### Scenario: Acceso con token inválido o expirado
- **WHEN** un cliente solicita una ruta protegida con un access token malformado, con firma inválida, o expirado
- **THEN** el sistema responde 401 sin ejecutar la operación solicitada

#### Scenario: Acceso con token válido pero rol no autorizado
- **WHEN** un cliente solicita una ruta protegida por rol con un access token válido cuyo usuario no tiene ninguno de los roles permitidos
- **THEN** el sistema responde 403 sin ejecutar la operación solicitada

#### Scenario: Acceso autorizado
- **WHEN** un cliente solicita una ruta protegida con un access token válido cuyo usuario tiene un rol permitido (o la ruta no exige un rol específico)
- **THEN** el sistema ejecuta la operación solicitada con normalidad
