## MODIFIED Requirements

### Requirement: Listar usuarios
El sistema SHALL exponer un endpoint, accesible únicamente a un usuario autenticado con rol `ADMIN`, que devuelva la lista de usuarios que no han sido eliminados lógicamente, sin incluir el hash de la contraseña de ningún usuario.

#### Scenario: Listado exitoso
- **WHEN** un usuario autenticado con rol `ADMIN` solicita la lista de usuarios
- **THEN** el sistema responde 200 con un arreglo de usuarios no eliminados, cada uno sin el campo de contraseña

#### Scenario: Listado vacío
- **WHEN** un usuario autenticado con rol `ADMIN` solicita la lista de usuarios y no existe ninguno sin eliminar
- **THEN** el sistema responde 200 con un arreglo vacío

#### Scenario: Usuarios eliminados lógicamente excluidos
- **WHEN** un usuario autenticado con rol `ADMIN` solicita la lista de usuarios y existen usuarios eliminados lógicamente
- **THEN** el sistema no incluye a esos usuarios en la respuesta

#### Scenario: Acceso sin autenticación o sin rol administrador
- **WHEN** un cliente sin token, con token inválido, o con un token válido de un usuario que no tiene rol `ADMIN` solicita la lista de usuarios
- **THEN** el sistema responde 401 (sin token o token inválido) o 403 (rol insuficiente), sin devolver ningún dato de usuarios

### Requirement: Obtener un usuario por id
El sistema SHALL exponer un endpoint, accesible únicamente a un usuario autenticado con rol `ADMIN`, que devuelva un usuario específico por su identificador, sin incluir el hash de la contraseña, siempre que no haya sido eliminado lógicamente.

#### Scenario: Usuario existente
- **WHEN** un usuario autenticado con rol `ADMIN` solicita un usuario con un id que existe y no está eliminado
- **THEN** el sistema responde 200 con los datos del usuario, sin el campo de contraseña

#### Scenario: Usuario inexistente
- **WHEN** un usuario autenticado con rol `ADMIN` solicita un usuario con un id que no existe
- **THEN** el sistema responde 404 con un mensaje de error indicando que el usuario no fue encontrado

#### Scenario: Usuario eliminado lógicamente
- **WHEN** un usuario autenticado con rol `ADMIN` solicita un usuario con un id que corresponde a un usuario eliminado lógicamente
- **THEN** el sistema responde 404 con un mensaje de error indicando que el usuario no fue encontrado

#### Scenario: Acceso sin autenticación o sin rol administrador
- **WHEN** un cliente sin token, con token inválido, o con un token válido de un usuario que no tiene rol `ADMIN` solicita un usuario por id
- **THEN** el sistema responde 401 (sin token o token inválido) o 403 (rol insuficiente), sin devolver los datos del usuario

### Requirement: Crear un usuario
El sistema SHALL permitir, únicamente a un usuario autenticado con rol `ADMIN`, crear un usuario nuevo a partir de un email, una contraseña y un nombre, con un rol opcional, validando el formato de los datos, rechazando emails duplicados y almacenando la contraseña únicamente en forma de hash.

#### Scenario: Creación exitosa
- **WHEN** un usuario autenticado con rol `ADMIN` envía datos válidos (email único, contraseña y nombre) para crear un usuario
- **THEN** el sistema crea el usuario, almacena la contraseña como hash (nunca en texto plano) y responde 201 con los datos del usuario creado, sin el campo de contraseña

#### Scenario: Creación con rol explícito
- **WHEN** un usuario autenticado con rol `ADMIN` envía datos válidos incluyendo un rol soportado (`ADMIN`, `PHOTOGRAPHER` o `ASSISTANT`)
- **THEN** el sistema crea el usuario con ese rol y lo refleja en la respuesta

#### Scenario: Creación sin rol explícito
- **WHEN** un usuario autenticado con rol `ADMIN` envía datos válidos sin especificar un rol
- **THEN** el sistema crea el usuario con el rol por defecto `PHOTOGRAPHER`

#### Scenario: Datos inválidos
- **WHEN** un usuario autenticado con rol `ADMIN` envía datos de creación con un email con formato inválido, una contraseña demasiado corta, un rol no soportado, o campos requeridos faltantes
- **THEN** el sistema responde 400 con los detalles de validación, sin crear ningún usuario

#### Scenario: Email duplicado
- **WHEN** un usuario autenticado con rol `ADMIN` intenta crear un usuario con un email que ya está registrado en un usuario no eliminado
- **THEN** el sistema responde 409 indicando que el email ya está en uso, sin crear ningún usuario

#### Scenario: Acceso sin autenticación o sin rol administrador
- **WHEN** un cliente sin token, con token inválido, o con un token válido de un usuario que no tiene rol `ADMIN` intenta crear un usuario
- **THEN** el sistema responde 401 (sin token o token inválido) o 403 (rol insuficiente), sin crear ningún usuario

### Requirement: Editar un usuario
El sistema SHALL permitir, únicamente a un usuario autenticado con rol `ADMIN`, actualizar de forma parcial los datos de un usuario existente no eliminado (nombre, email, contraseña, rol y/o estado activo), validando los datos enviados y rechazando emails duplicados.

#### Scenario: Edición exitosa
- **WHEN** un usuario autenticado con rol `ADMIN` envía datos válidos para actualizar un usuario existente no eliminado
- **THEN** el sistema actualiza los campos enviados y responde 200 con los datos actualizados del usuario, sin el campo de contraseña

#### Scenario: Edición del estado activo
- **WHEN** un usuario autenticado con rol `ADMIN` envía `is_active: false` para un usuario existente
- **THEN** el sistema marca al usuario como inactivo y lo refleja en la respuesta, sin eliminarlo

#### Scenario: Edición de usuario inexistente o eliminado
- **WHEN** un usuario autenticado con rol `ADMIN` intenta editar un usuario con un id que no existe o que corresponde a un usuario eliminado lógicamente
- **THEN** el sistema responde 404 con un mensaje de error indicando que el usuario no fue encontrado

#### Scenario: Edición con datos inválidos
- **WHEN** un usuario autenticado con rol `ADMIN` envía datos de edición con formato inválido (por ejemplo, un email mal formado o un rol no soportado)
- **THEN** el sistema responde 400 con los detalles de validación, sin modificar el usuario

#### Scenario: Edición con email duplicado
- **WHEN** un usuario autenticado con rol `ADMIN` intenta actualizar el email de un usuario a uno que ya pertenece a otro usuario no eliminado
- **THEN** el sistema responde 409 indicando que el email ya está en uso, sin modificar el usuario

#### Scenario: Acceso sin autenticación o sin rol administrador
- **WHEN** un cliente sin token, con token inválido, o con un token válido de un usuario que no tiene rol `ADMIN` intenta editar un usuario
- **THEN** el sistema responde 401 (sin token o token inválido) o 403 (rol insuficiente), sin modificar ningún usuario

### Requirement: Eliminar un usuario
El sistema SHALL permitir, únicamente a un usuario autenticado con rol `ADMIN`, eliminar lógicamente un usuario existente por su identificador, marcándolo como eliminado sin borrar su registro de la base de datos.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado con rol `ADMIN` solicita eliminar un usuario con un id que existe y no está eliminado
- **THEN** el sistema marca al usuario como eliminado lógicamente y responde 200 o 204 confirmando la eliminación

#### Scenario: Eliminación de usuario inexistente o ya eliminado
- **WHEN** un usuario autenticado con rol `ADMIN` solicita eliminar un usuario con un id que no existe o que ya fue eliminado lógicamente
- **THEN** el sistema responde 404 con un mensaje de error indicando que el usuario no fue encontrado

#### Scenario: Usuario eliminado no aparece en operaciones posteriores
- **WHEN** un usuario fue eliminado lógicamente
- **THEN** las operaciones de listar, obtener y editar dejan de encontrarlo, como si no existiera

#### Scenario: Acceso sin autenticación o sin rol administrador
- **WHEN** un cliente sin token, con token inválido, o con un token válido de un usuario que no tiene rol `ADMIN` intenta eliminar un usuario
- **THEN** el sistema responde 401 (sin token o token inválido) o 403 (rol insuficiente), sin eliminar ningún usuario
