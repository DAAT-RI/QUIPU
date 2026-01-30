// =====================================================
// Tipos Supabase — Quipu Sistema Electoral Peru 2026
// =====================================================

export interface Partido {
  id: number
  nombre_oficial: string
  nombre_corto: string | null
  candidato_presidencial: string | null
  pdf_plan_completo: string | null
  pdf_resumen: string | null
  total_candidatos: number
  fecha_registro: string
  metadata: Record<string, unknown> | null
}

export interface CategoriaPromesa {
  id: number
  nombre: string
  nombre_display: string | null
  descripcion: string | null
  icono: string | null
  color: string | null
  orden: number
}

export interface Promesa {
  id: number
  partido_id: number
  texto_original: string
  texto_normalizado: string | null
  resumen: string | null
  categoria: string
  subcategoria: string | null
  ambito: string
  pagina_pdf: number | null
  seccion_pdf: string | null
  confianza_extraccion: number
  embedding: number[] | null
  fecha_extraccion: string
  version_extraccion: number
}

export interface Candidato {
  id: number
  id_hoja_vida: string | null
  dni: string | null
  nombres: string | null
  apellido_paterno: string | null
  apellido_materno: string | null
  nombre_completo: string | null
  sexo: string | null
  fecha_nacimiento: string | null
  partido_id: number | null
  organizacion_politica: string | null
  tipo_eleccion: string | null
  cargo_postula: string | null
  cargo_eleccion: number | null
  designacion: string | null
  ubigeo: string | null
  departamento: string | null
  provincia: string | null
  distrito: string | null
  foto_url: string | null
  foto_local: string | null
  email: string | null
  estado: string | null
  fecha_registro: string
  metadata: Record<string, unknown> | null
}

export interface HojaVida {
  id: number
  candidato_id: number | null
  id_hoja_vida: string | null

  // Campos de estado y completitud (nuevos 2026-01-29)
  estado_hv: string | null
  porcentaje_completitud: number | null
  fecha_termino_registro: string | null

  // Verificaciones con fuentes externas
  verificaciones: {
    sunedu: string | null
    sunarp: string | null
    minedu_tec: string | null
    infogob: string | null
    rop: string | null
    rop_renuncia: string | null
  } | null

  // Indicadores booleanos
  indicadores: {
    tiene_experiencia_laboral: boolean
    tiene_educacion_basica: boolean
    tiene_educacion_tecnica: boolean
    tiene_educacion_universitaria: boolean
    tiene_posgrado: boolean
    tiene_cargo_partidario: boolean
    tiene_cargo_eleccion: boolean
    tiene_sentencia_penal: boolean
    tiene_sentencia_obligacion: boolean
    tiene_renuncia_partido: boolean
    tiene_ingresos: boolean
    tiene_inmueble: boolean
    tiene_mueble: boolean
    tiene_titularidad: boolean
    tiene_info_adicional: boolean
  } | null

  // Educacion
  educacion_basica: Record<string, unknown> | null
  educacion_tecnica: Record<string, unknown> | null
  educacion_universitaria: unknown[] | null
  posgrado: unknown[] | null

  // Experiencia y cargos
  experiencia_laboral: unknown[] | null
  cargos_partidarios: unknown[] | null
  cargos_eleccion: unknown[] | null
  cargos_postula: Array<{
    id_cargo: number
    cargo: string
    estado: string
  }> | null
  renuncias_partidos: unknown[] | null
  titularidades: unknown[] | null
  declaraciones_juradas: {
    renuncias_partidos_adicional: unknown[]
    declaraciones_juradas: unknown[]
    info_adicional: unknown[]
    anotaciones_marginales: unknown[]
  } | null

  // Legal
  sentencias_penales: unknown[] | null
  sentencias_obligaciones: unknown[] | null
  procesos_penales: unknown[] | null

  // Patrimonio
  bienes_muebles: unknown[] | null
  bienes_inmuebles: unknown[] | null
  ingresos: unknown[] | null

  // Ubicacion
  carne_extranjeria: string | null
  ubigeo_nacimiento: string | null
  ubigeo_domicilio: string | null

  fecha_extraccion: string
}

// QUIPU_MASTER — Monitoreo de medios
export interface QuipuMasterEntry {
  id: string
  canal: string | null
  titulo: string | null
  resumen: string | null  // Nota: es resumen del ARTÍCULO/POST completo
  categorias: string | null  // Antes: temas
  personas: string | null
  keywords: string | null
  organizaciones: string | null
  ubicaciones: string | null
  paises: string | null
  productos: string | null
  fecha: string | null
  ruta: string | null
  transcripcion: string | null  // URL a transcripción completa
  url_clip: string | null
  interacciones: Interaccion[] | null
  processed_at: string | null
}

export interface Interaccion {
  type: 'declaration' | 'mention'
  content: string
  stakeholder: string
  categorias?: string  // Antes: tema
}

// Vista: v_quipu_declaraciones (aplanada de interacciones)
// NOTA: resumen es del ARTÍCULO completo, no de la declaración individual
export interface Declaracion {
  master_id: string
  canal: string | null
  resumen: string | null
  categorias: string | null  // Antes: temas
  keywords: string | null
  organizaciones: string | null
  ubicaciones: string | null
  fecha: string | null
  ruta: string | null
  contenido: string
  stakeholder: string
  categorias_interaccion: string | null  // Antes: tema
}

// Vista v_quipu_declaraciones - Nueva estructura con todos los campos
export interface DeclaracionView {
  master_id: string
  idx: number  // Índice de la interacción en el array (0-based)
  canal: string | null
  titulo: string | null  // Título del artículo/post
  resumen: string | null  // Resumen del ARTÍCULO (no de la declaración)
  categorias: string | null  // Categorías del artículo (semicolon separated) - Antes: temas
  personas: string | null  // Personas mencionadas con descripciones
  keywords: string | null
  organizaciones: string | null  // Orgs mencionadas - IMPORTANTE para gremios
  ubicaciones: string | null
  paises: string | null
  productos: string | null
  fecha: string | null
  ruta: string | null  // URL fuente original
  transcripcion: string | null  // URL a transcripción completa
  tipo: 'declaration' | 'mention'  // Tipo de interacción
  stakeholder: string  // Quién dijo/fue mencionado
  contenido: string  // LO QUE DIJO - esto es lo más importante
  categorias_interaccion: string | null  // Categoría específica de esta declaración - Antes: tema_interaccion
}

// Vista: v_quipu_promesas_planes_completas
export interface PromesaCompleta {
  id: number
  texto_original: string
  resumen: string | null
  categoria: string
  subcategoria: string | null
  ambito: string
  pagina_pdf: number | null
  confianza_extraccion: number
  partido: string
  candidato_presidencial: string | null
  categoria_display: string | null
  categoria_icono: string | null
  categoria_color: string | null
}

// Vista: v_quipu_resumen_partidos
export interface ResumenPartido {
  id: number
  nombre_oficial: string
  candidato_presidencial: string | null
  total_candidatos: number
  total_promesas: number
  categorias: string[]
}

// Vista: v_quipu_candidatos_completos
export interface CandidatoCompleto extends Candidato {
  partido_nombre: string | null
  candidato_presidente: string | null
  orden_cargo?: number  // Computed: 1=Presidente, 2=1er Vice, 3=2do Vice, 4=Senador, 5=Diputado
}

// Filtros
export interface DeclaracionFilters {
  tipo?: 'declaration' | 'mention'  // Default: 'declaration' (mentions tienen ruido)
  stakeholder?: string
  canal?: string
  categoria?: string  // Antes: tema
  categoriaDeclaracion?: string  // Antes: temaDeclaracion
  organizacion?: string  // Filtrar por organización mencionada
  producto?: string
  partido?: string  // Filter by partido name (matches organizaciones, stakeholder, or contenido)
  search?: string  // Busca en CONTENIDO (lo que dijo), NO en keywords/titulo
  offset: number
  limit: number
}

export interface CandidatoFilters {
  search?: string
  tipo_eleccion?: string
  partido_id?: number
  departamento?: string
  offset: number
  limit: number
}

export interface PromesaFilters {
  search?: string
  categoria?: string
  partido_id?: number
  partido?: string  // Filter by partido name
  offset: number
  limit: number
}

// Busqueda semantica
export interface SearchResult {
  id: number
  texto_original: string
  resumen: string | null
  categoria: string
  partido: string
  candidato: string | null
  similarity: number
}
