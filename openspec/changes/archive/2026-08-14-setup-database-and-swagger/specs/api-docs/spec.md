## Purpose

Ofrece documentación interactiva y siempre actualizada de la API, para que desarrolladores y consumidores puedan descubrir y probar los endpoints disponibles sin depender de documentación externa mantenida a mano.

## ADDED Requirements

### Requirement: Documentación interactiva de la API
El sistema SHALL exponer una interfaz web de documentación interactiva de la API en una ruta dedicada del propio servidor, accesible mientras la aplicación esté en ejecución.

#### Scenario: Consulta de la documentación
- **WHEN** un desarrollador navega a la ruta de documentación de la API mientras la aplicación está corriendo
- **THEN** el sistema muestra una interfaz interactiva con los endpoints disponibles, sus métodos HTTP, parámetros y respuestas esperadas

### Requirement: Documentación reflejada automáticamente desde los endpoints
El sistema SHALL generar la documentación a partir de los endpoints y sus contratos de entrada/salida existentes, de modo que un endpoint nuevo o modificado se refleje en la documentación sin pasos manuales adicionales.

#### Scenario: Se agrega un endpoint nuevo
- **WHEN** se define un nuevo endpoint con su contrato de entrada y salida
- **THEN** la documentación interactiva lo incluye automáticamente la próxima vez que la aplicación se inicia, sin requerir edición manual de un archivo de documentación separado

### Requirement: Validación de entrada reflejada en la documentación
El sistema SHALL reflejar en la documentación las reglas de validación declaradas sobre los datos de entrada de cada endpoint (campos requeridos, tipos de datos), de modo que un consumidor pueda conocer el formato esperado sin leer el código fuente.

#### Scenario: Endpoint con datos de entrada validados
- **WHEN** un endpoint declara reglas de validación sobre su cuerpo de solicitud
- **THEN** la documentación interactiva muestra esos campos, si son requeridos y su tipo esperado

### Requirement: Metadatos generales de la API
El sistema SHALL mostrar en la documentación un título, una descripción y una versión que identifiquen la API documentada.

#### Scenario: Acceso inicial a la documentación
- **WHEN** un usuario abre la ruta de documentación por primera vez
- **THEN** la página muestra el nombre, la descripción y la versión de la API antes de listar los endpoints