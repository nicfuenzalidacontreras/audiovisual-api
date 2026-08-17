# clients Specification

## Purpose

Gestiona el ciclo de vida de los clientes del CRM del estudio: permite listarlos, consultarlos, crearlos, editarlos y eliminarlos lógicamente a través de una API HTTP, restringiendo cada operación al rol del usuario autenticado que la solicita.

## Requirements

### Requirement: Listar clientes
El sistema SHALL exponer un endpoint, accesible únicamente a un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER`, que devuelva la lista de clientes que no han sido eliminados lógicamente.

#### Scenario: Listado exitoso
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` solicita la lista de clientes
- **THEN** el sistema responde 200 con un arreglo de clientes no eliminados

#### Scenario: Listado vacío
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` solicita la lista de clientes y no existe ninguno sin eliminar
- **THEN** el sistema responde 200 con un arreglo vacío

#### Scenario: Clientes eliminados lógicamente excluidos
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` solicita la lista de clientes y existen clientes eliminados lógicamente
- **THEN** el sistema no incluye a esos clientes en la respuesta

#### Scenario: Acceso sin autenticación o sin rol suficiente
- **WHEN** un cliente HTTP sin token, con token inválido, o con un token válido de un usuario con rol `ASSISTANT` solicita la lista de clientes
- **THEN** el sistema responde 401 (sin token o token inválido) o 403 (rol insuficiente), sin devolver ningún dato

### Requirement: Obtener un cliente por id
El sistema SHALL exponer un endpoint, accesible únicamente a un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER`, que devuelva un cliente específico por su identificador, siempre que no haya sido eliminado lógicamente.

#### Scenario: Cliente existente
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` solicita un cliente con un id que existe y no está eliminado
- **THEN** el sistema responde 200 con los datos del cliente

#### Scenario: Cliente inexistente
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` solicita un cliente con un id que no existe
- **THEN** el sistema responde 404 con un mensaje de error indicando que el cliente no fue encontrado

#### Scenario: Cliente eliminado lógicamente
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` solicita un cliente con un id que corresponde a un cliente eliminado lógicamente
- **THEN** el sistema responde 404 con un mensaje de error indicando que el cliente no fue encontrado

#### Scenario: Acceso sin autenticación o sin rol suficiente
- **WHEN** un cliente HTTP sin token, con token inválido, o con un token válido de un usuario con rol `ASSISTANT` solicita un cliente por id
- **THEN** el sistema responde 401 (sin token o token inválido) o 403 (rol insuficiente), sin devolver los datos del cliente

### Requirement: Crear un cliente
El sistema SHALL permitir, únicamente a un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER`, crear un cliente nuevo a partir de un nombre, con RUT, email, teléfono y notas opcionales, validando el formato de los datos y rechazando un RUT duplicado.

#### Scenario: Creación exitosa con datos mínimos
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` envía únicamente un `name` válido
- **THEN** el sistema crea el cliente y responde 201 con sus datos

#### Scenario: Creación exitosa con todos los campos
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` envía datos válidos de `name`, `rut`, `email`, `phone` y `notes`
- **THEN** el sistema crea el cliente con todos esos datos y responde 201 reflejándolos

#### Scenario: Datos inválidos
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` envía datos de creación sin `name`, con un `email` de formato inválido, o con un `rut` que no cumple el formato esperado o cuyo dígito verificador es incorrecto
- **THEN** el sistema responde 400 con los detalles de validación, sin crear ningún cliente

#### Scenario: RUT duplicado
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` intenta crear un cliente con un `rut` que ya pertenece a un cliente no eliminado
- **THEN** el sistema responde 409 indicando que el RUT ya está en uso, sin crear ningún cliente

#### Scenario: Acceso sin autenticación o sin rol suficiente
- **WHEN** un cliente HTTP sin token, con token inválido, o con un token válido de un usuario con rol `ASSISTANT` intenta crear un cliente
- **THEN** el sistema responde 401 (sin token o token inválido) o 403 (rol insuficiente), sin crear ningún cliente

### Requirement: Editar un cliente
El sistema SHALL permitir, únicamente a un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER`, actualizar de forma parcial los datos de un cliente existente no eliminado (nombre, RUT, email, teléfono y/o notas), validando los datos enviados y rechazando un RUT duplicado.

#### Scenario: Edición exitosa
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` envía datos válidos para actualizar un cliente existente no eliminado
- **THEN** el sistema actualiza los campos enviados y responde 200 con los datos actualizados del cliente

#### Scenario: Edición de cliente inexistente o eliminado
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` intenta editar un cliente con un id que no existe o que corresponde a un cliente eliminado lógicamente
- **THEN** el sistema responde 404 con un mensaje de error indicando que el cliente no fue encontrado

#### Scenario: Edición con datos inválidos
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` envía datos de edición con formato inválido (por ejemplo, un email mal formado, o un RUT con formato inválido o dígito verificador incorrecto)
- **THEN** el sistema responde 400 con los detalles de validación, sin modificar el cliente

#### Scenario: Edición con RUT duplicado
- **WHEN** un usuario autenticado con rol `ADMIN` o `PHOTOGRAPHER` intenta actualizar el RUT de un cliente a uno que ya pertenece a otro cliente no eliminado
- **THEN** el sistema responde 409 indicando que el RUT ya está en uso, sin modificar el cliente

#### Scenario: Acceso sin autenticación o sin rol suficiente
- **WHEN** un cliente HTTP sin token, con token inválido, o con un token válido de un usuario con rol `ASSISTANT` intenta editar un cliente
- **THEN** el sistema responde 401 (sin token o token inválido) o 403 (rol insuficiente), sin modificar ningún cliente

### Requirement: Eliminar un cliente
El sistema SHALL permitir, únicamente a un usuario autenticado con rol `ADMIN`, eliminar lógicamente un cliente existente por su identificador, marcándolo como eliminado sin borrar su registro de la base de datos.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado con rol `ADMIN` solicita eliminar un cliente con un id que existe y no está eliminado
- **THEN** el sistema marca al cliente como eliminado lógicamente y responde 200 confirmando la eliminación

#### Scenario: Eliminación de cliente inexistente o ya eliminado
- **WHEN** un usuario autenticado con rol `ADMIN` solicita eliminar un cliente con un id que no existe o que ya fue eliminado lógicamente
- **THEN** el sistema responde 404 con un mensaje de error indicando que el cliente no fue encontrado

#### Scenario: Cliente eliminado no aparece en operaciones posteriores
- **WHEN** un cliente fue eliminado lógicamente
- **THEN** las operaciones de listar, obtener y editar dejan de encontrarlo, como si no existiera

#### Scenario: Acceso sin permisos suficientes
- **WHEN** un cliente HTTP sin token, con token inválido, o con un token válido de un usuario con rol `PHOTOGRAPHER` o `ASSISTANT` intenta eliminar un cliente
- **THEN** el sistema responde 401 (sin token o token inválido) o 403 (rol insuficiente, incluyendo `PHOTOGRAPHER`), sin eliminar ningún cliente
