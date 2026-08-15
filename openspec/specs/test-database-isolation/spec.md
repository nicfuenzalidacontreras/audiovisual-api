# test-database-isolation Specification

## Purpose

Garantiza que las pruebas automatizadas corran contra su propia base de datos, de modo que ejecutar la suite de tests nunca cree, modifique ni elimine datos de la base de datos de desarrollo o producción.

## Requirements

### Requirement: Ejecutar pruebas contra una base de datos dedicada a pruebas
El sistema SHALL ejecutar las pruebas automatizadas que requieren base de datos (e2e) contra una conexión de base de datos dedicada a pruebas, distinta de la configurada para desarrollo/producción, de modo que las operaciones de escritura o eliminación realizadas por las pruebas nunca afecten los datos de desarrollo o producción.

#### Scenario: Ejecución de la suite e2e
- **WHEN** se ejecuta el comando de pruebas e2e
- **THEN** la aplicación bajo prueba se conecta a la base de datos dedicada a pruebas y no a la base de datos configurada para uso normal de la aplicación

#### Scenario: Datos de desarrollo intactos tras correr las pruebas
- **WHEN** existen usuarios u otros datos en la base de datos de desarrollo y se ejecuta la suite e2e completa
- **THEN** esos datos siguen existiendo sin cambios al finalizar la ejecución de las pruebas

#### Scenario: Base de datos de pruebas lista sin intervención manual
- **WHEN** se ejecuta la suite e2e y la base de datos de pruebas no tiene el esquema al día
- **THEN** el sistema aplica las migraciones necesarias sobre la base de datos de pruebas antes de correr los tests, sin requerir un paso manual adicional por parte de quien ejecuta las pruebas
