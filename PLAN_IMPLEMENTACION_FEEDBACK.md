# Plan de Implementacion - Feedback Aplicacion Electoral Quipu

## Estado Actual (29 Enero 2026)

### COMPLETADAS
- [x] FASE 1: Bugs Criticos
  - [x] Bug 5.2 - Limite de 100 registros en usePromesas.ts (cambiado a 2000)
  - [x] Bug 6.2 - Boton "Ver mas" en Comparar.tsx (ahora funcional con toggle)
  - [x] Bug 3.4 - Perdida de seleccion en BuscarPromesas.tsx (mantiene vista con filtros)

- [x] FASE 2: Cambios de Texto
  - [x] Issue 1.3 - "Presidencial (incluye vicepresidentes)"
  - [x] Issue 4.1 - "Resumen" -> "Bio"
  - [x] Issue 6.3 - "En medios" -> "En medios y RRSS"
  - [x] Issue 3.3 - Mejorado sourceFromCanal() para detectar TV, Radio, Instagram, TikTok, YouTube

- [x] FASE 3: Navegacion Transversal
  - [x] Creado BackButton.tsx reutilizable (usa history o location.state)
  - [x] Agregado ScrollRestoration en App.tsx
  - [x] BackButton agregado a: BuscarPromesas, Comparar, MapaElectoral, CandidatoDetalle, DeclaracionDetalle, PartidoDetalle, CategoriaDetalle

### COMPLETADAS (cont.)
- [x] FASE 4: Reorganizar Dashboard (1.1, 1.2)
  - [x] Renombrar "Top Partidos por Propuestas" -> "Top Partidos por Declaraciones"
  - [x] Mover secciones
  - [x] Mover Stats Strip al final como "Estadistica General"

  **Orden final implementado:**
  1. Header
  2. Temas mas discutidos
  3. Top partido por declaraciones
  4. Declaraciones mas recientes
  5. Candidatos por Cargo + Candidatos Presidenciales
  6. Estadistica General (Stats Strip)

- [x] FASE 5: UX Mejoras (5.5, 7.2)
  - [x] Issue 5.5 - Separar Declaraciones de Menciones en PartidoDetalle
    - Separados en arrays diferentes (`partidoDeclaraciones` y `partidoMenciones`)
    - Nueva seccion "Menciones en Medios" con estilo naranja
    - Header muestra contadores separados
  - [x] Issue 7.2 - Acordeones con color diferenciado cuando expandidos
    - Todos los acordeones en PartidoDetalle ahora cambian color al expandirse
    - Colores segun tema: amber (declaraciones), orange (menciones), primary (candidatos), indigo (propuestas)

### COMPLETADAS (cont.)
- [x] FASE 6: Mejoras Comparar (6.1, 6.4)
  - [x] Issue 6.1 - Mejorar flujo de seleccion de candidatos
    - Agregado texto guia "Paso 1: Selecciona candidatos para comparar"
    - Mejorado mensaje de estado vacio
  - [x] Issue 6.4 - Dropdown filtro por categoria electoral
    - Agregado FilterSelect con opciones: Presidencial, Diputados, Senadores D. Unico, Senadores D. Multiple
    - Filtro aplicado a resultados de busqueda
    - Filtro se bloquea cuando hay candidatos seleccionados (para mantener consistencia)

### DIFERIDO
- [ ] FASE 7: Favoritos (DIFERIDO a Fase 3 del proyecto con usuarios)

---

## Archivos Modificados

### Fase 1
- `frontend/src/hooks/usePromesas.ts` - limite 100 -> 2000

### Fase 2
- `frontend/src/pages/Dashboard.tsx` - texto "(incluye vicepresidentes)"
- `frontend/src/pages/CandidatoDetalle.tsx` - tab "Bio"
- `frontend/src/pages/Comparar.tsx` - "En Medios y RRSS"
- `frontend/src/lib/constants.ts` - SOURCE_CONFIG expandido
- `frontend/src/lib/utils.ts` - sourceFromCanal()

### Fase 3
- `frontend/src/components/ui/BackButton.tsx` - NUEVO
- `frontend/src/App.tsx` - ScrollRestoration
- `frontend/src/pages/BuscarPromesas.tsx` - BackButton
- `frontend/src/pages/Comparar.tsx` - BackButton
- `frontend/src/pages/MapaElectoral.tsx` - BackButton
- `frontend/src/pages/CandidatoDetalle.tsx` - BackButton
- `frontend/src/pages/DeclaracionDetalle.tsx` - BackButton
- `frontend/src/pages/PartidoDetalle.tsx` - BackButton
- `frontend/src/pages/CategoriaDetalle.tsx` - BackButton

### Fase 4
- `frontend/src/pages/Dashboard.tsx` - reorganizacion completa

### Fase 5
- `frontend/src/pages/PartidoDetalle.tsx` - separacion declaraciones/menciones, acordeones con color

### Fase 6
- `frontend/src/pages/Comparar.tsx` - filtro categoria electoral, texto guia "Paso 1"

---

## Referencia: Feedback Original

Ver archivo: `# Documento de Feedback Vc.txt`

25 issues en 7 secciones:
1. Dashboard (1.1-1.3)
2. Declaraciones (2.1)
3. Buscar Promesas (3.1-3.4)
4. Candidatos (4.1)
5. Partidos (5.1-5.5)
6. Comparar (6.1-6.5)
7. General (7.1-7.3)
