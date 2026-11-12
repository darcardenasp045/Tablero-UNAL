// ============================================================
// CONFIG: lo único que se edita cuando cambian hojas o columnas
// ============================================================
const CONFIG = {
  // Enlaces CSV publicados (Archivo > Compartir > Publicar en la web > CSV)
  URL_CONTROL:     'https://docs.google.com/spreadsheets/d/e/2PACX-1vTfZLZW0YYGXcClSIkOZfTF40T_HBmN_7aIW5A8_JGVBu9q4hEivXuJq3Q2OXOsl6udC0oQGQgTk5DE/pub?gid=52723933&single=true&output=csv',
  URL_SEGUIMIENTO: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQYT9HUSG3fUIq3HmgJqRqlPvgSFlyEVdzAzxliMM0ihN4ceDJaruJz-Cs54cbERw/pub?gid=1558092341&single=true&output=csv',

  // null = suma de TOTAL SERVIDORES de la hoja. Pon 3260 para fijar el corte SARA.
  META_SERVIDORES: 3260,
  CORTE_SARA: '30/09/2026',

  // Nombres de columna (tildes y mayúsculas no importan)
  COLS: {
    // Hoja CONTROL_CONTRATACION (la edita solo el administrador)
    id: 'ID_UADMIN', sede: 'ID_SEDE', nombre: 'NOMBRE DE LA DEPENDENCIA',
    esOrg: 'ES UNIDAD ORGANIZACIONAL?',
    mesa: 'MESA DE APERTURA',            // aquí va el ID_UADMIN de la mesa (se repite si cubre varias)
    llevaPrel: 'LLEVA INFORME PRELIMINAR?', llevaFinal: 'LLEVA INFORME FINAL?',
    // Hoja SEGUIMIENTO_ANALISTAS (la editan los analistas)
    segId: 'ID_UADMIN', actividad: 'ID_ACTIVIDAD',
    servidores: 'TOTAL SERVIDORES', contratistas: 'TOTAL CONTRATISTAS INDENTIFICADOS',
    cancel: 'TOTAL DE CANCELACIONES', reprog: 'TOTAL REPROGRAMACIONES', oficios: 'OFICIOS PROYECTADOS',
    solicitud: 'SOLICITUD DE INFORMACIÓN / VOLÚMENES DE TRABAJO',
    caracteriz: 'CARACTERIZACIÓN / ANÁLISIS DE CARGAS REALIZADO',
    servLev: 'SERVIDORES CON CARGA LEVANTADA', contLev: 'TOTAL CONTRATISTAS CON CARGA LEVANTADA',
    unidadLev: 'UNIDAD LEVANTADA', instrumentos: 'TOTAL DE INSTR DE OBSERVACION',
    informePrel: 'INFORME PRELIMINAR / PRESENTACIÓN PARA JEFE', entrevista: 'ENTREVISTA CON EL JEFE',
    informeFinal: 'INFORME FINAL', fecha: 'FECHA', hora: 'HORA', lugar: 'LUGAR',
    responsable: 'RESPONSABLE', apoyo: 'APOYO'
  },
  AGENDA_MAX: 8,
  ALERTA_MAX: 15
};