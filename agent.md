# Agent Guide - Proyecto Quipu

Guía para futuros asistentes Claude trabajando en este proyecto.

---

## Sobre el Usuario

### Estilo de trabajo
- **Directo y conciso**: Prefiere respuestas cortas. No adornes.
- **Pragmático**: "Eso lo hacemos en fase 2" - sabe priorizar.
- **Técnico**: Entiende código, arquitectura, y términos en inglés. No necesita explicaciones básicas.
- **Orientado a resultados**: Le importa que funcione, no la teoría.

### Frustraciones conocidas
- **Estimaciones incorrectas**: Una vez estimé $3 USD y costó $20. Fue muy claro en su decepción.
- **Timeouts y procesos largos**: Prefiere correr scripts largos él mismo en terminal con `tqdm` para ver progreso.
- **Repetir trabajo**: Si algo ya se procesó, debe skippearse. Implementamos checkpoints por esto.
- **Desorden**: Pidió consolidar todo en una carpeta limpia (Quipu/) para la siguiente fase.

### Preferencias técnicas
- **Windows**: Trabaja en Windows. Cuidado con paths y comandos bash.
- **Python**: Es el lenguaje principal del proyecto.
- **Terminal propia**: Para procesos largos, darle el comando para que lo corra él.
- **tqdm**: Siempre agregar barras de progreso en scripts batch.

### Comunicación
- Español principalmente, términos técnicos en inglés OK.
- No usar emojis a menos que él los use primero.
- Cuando algo falla, ser honesto y directo sobre el error.

---

## Sobre el Proyecto

### Qué es Quipu
Plataforma de inteligencia electoral para las elecciones Peru 2026. Permite a empresas, gremios y periodistas seguir, comparar y analizar la narrativa de partidos y candidatos.

**Cliente**: DA'AT Reputational Intelligence (para APESEG y otros gremios)

### Fuentes de datos (5)
1. **Planes de gobierno** - 70 PDFs del JNE → ✅ 22,358 promesas extraídas
2. **Hojas de vida** - Info oficial de candidatos → ✅ 6,438 procesados
3. **Perfiles RRSS** - Cuentas oficiales → ⏳ Pendiente
4. **Medios web** - Portales informativos → ⏳ Pendiente
5. **Podcasts YouTube** - New media → ⏳ Pendiente

### Estructura del proyecto
```
C:\Entornos\Quipu\
├── data/
│   ├── promesas_v2.db          # SQLite principal (472 MB)
│   ├── hojas_vida_completas.json
│   ├── candidatos_jne_2026.json
│   └── partido_pdf_map.json
├── docs/
│   ├── PROPUESTA_APESEG_2026.pdf
│   └── encuestas/              # Para PDFs futuros
├── fotos/                      # 8,109 fotos de candidatos
├── pdfs/                       # 70 PDFs planes de gobierno
├── migrations/
│   ├── 001_schema_supabase.sql
│   └── 002_migrate_to_supabase.py
├── excel/
├── OBJECTIVE.md                # Visión del proyecto
├── README.md                   # Documentación técnica
└── agent.md                    # Este archivo
```

### Base de datos actual (SQLite)
- **promesas_v2.db**: 22,358 promesas con embeddings (1536 dims, Gemini)
- 35 partidos procesados
- 15 categorías: educacion, salud, economia, seguridad, empleo, infraestructura, agricultura, medio_ambiente, justicia, tecnologia, vivienda, transporte, cultura, social, reforma_estado

### Decisiones técnicas tomadas
| Decisión | Razón |
|----------|-------|
| Gemini 2.5 Flash | Balance costo/calidad para extracción masiva |
| Gemini Embeddings (1536 dims) | Más barato que OpenAI, suficiente calidad |
| SQLite → Supabase | Local primero, migrar cuando esté listo el frontend |
| INSERT OR IGNORE | Mantener IDs estables entre corridas |
| Batch de 3 páginas | Evitar exceder contexto de Gemini |
| Structured Output | Garantizar JSON válido de Gemini |

### Lecciones aprendidas
1. **IDs estables**: INSERT OR REPLACE crea IDs nuevos → usar INSERT OR IGNORE
2. **Unicode en Windows**: Normalizar NFC/NFD para nombres de archivo con acentos
3. **Costos de API**: Siempre subestimé. Multiplicar estimación x3-5.
4. **Timeouts**: Scripts largos deben correrse en terminal del usuario, no via subprocess.
5. **Checkpoints**: Siempre verificar si un partido ya fue procesado antes de re-procesar.

---

## Próximos pasos probables

1. **Integrar datos de RRSS/medios** - Cuando lleguen, crear pipeline similar al de planes
2. **Migrar a Supabase** - Schema listo en `migrations/`
3. **Crear frontend** - Dashboard tipo el mockup de la propuesta
4. **Encuestas** - Procesarlas cuando lleguen los PDFs

---

## Cómo ayudar mejor

### DO
- Ser conciso y directo
- Mostrar progreso con tqdm en scripts
- Verificar que los datos no se dupliquen
- Dar comandos listos para copiar/pegar en terminal
- Estructurar bien los archivos y carpetas
- Preguntar si algo no está claro antes de asumir

### DON'T
- Dar estimaciones de tiempo/costo sin margen de error
- Correr procesos largos via subprocess (darle el comando)
- Crear archivos innecesarios (prefiere editar existentes)
- Sobreexplicar conceptos que ya conoce
- Usar INSERT OR REPLACE sin pensar en IDs
- Ignorar errores - ser transparente cuando algo falla

---

## Archivos clave para leer primero

1. `OBJECTIVE.md` - Entender la visión del proyecto
2. `data/promesas_v2.db` - La data principal
3. `migrations/001_schema_supabase.sql` - Modelo de datos completo
4. `docs/PROPUESTA_APESEG_2026.pdf` - Contexto comercial

---

*Última actualización: 2026-01-24*
