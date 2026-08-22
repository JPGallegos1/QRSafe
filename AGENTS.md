# Investigacion de mercado

## Skill obligatoria

Para cualquier investigacion de mercado, carga la skill `research` antes de empezar. Si no esta instalada localmente, obtenla desde [mattpocock/skills: engineering/research](https://github.com/mattpocock/skills/tree/main/skills/engineering/research). La skill delega la busqueda a un agente en segundo plano y exige contrastar los hallazgos con fuentes primarias.

## Flujo de trabajo

1. Delimita la pregunta, mercado, geografia y periodo a investigar.
2. Prioriza fuentes primarias: organismos reguladores, empresas analizadas, documentacion oficial, registros publicos, especificaciones y APIs.
3. Usa fuentes secundarias solo para localizar pistas o casos; etiquetalas como tales y no las uses como unica evidencia de una afirmacion importante.
4. Guarda un unico informe en `docs/research/` con un nombre descriptivo en kebab-case.
5. Incluye fecha, alcance, metodologia, resumen ejecutivo, hallazgos, limitaciones y enlaces junto a cada afirmacion verificable.
6. Distingue claramente hechos, estimaciones e hipotesis. Declara los vacios de datos en vez de inferirlos.

## Criterio de salida

Un informe esta listo cuando responde la pregunta inicial, cada hallazgo relevante tiene una fuente enlazada y sus limitaciones permiten evaluar la confianza de las conclusiones.
