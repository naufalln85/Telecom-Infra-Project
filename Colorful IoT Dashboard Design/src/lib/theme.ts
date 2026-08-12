/* All background/text colors are CSS variables so light/dark mode just
   swaps the :root values. Accent colors are static (same in both modes). */

export const C = {
  // ── Accent colors (same in dark & light) ──────────────────────────────
  coral:   '#C65C55',
  purple:  '#931783',
  magenta: '#AD3A6C',
  amber:   '#D4913A',
  teal:    '#2AA6A0',
  green:   '#3DAA6A',

  // ── Dynamic (CSS variables) ───────────────────────────────────────────
  bg:       'var(--c-bg)',
  surface:  'var(--c-surface)',
  surface2: 'var(--c-surface2)',
  surface3: 'var(--c-surface3)',
  light:    'var(--c-text)',
  muted:    'var(--c-muted)',
  border:   'var(--c-border)',
  overlay:  'var(--c-overlay)',
  btnGhost: 'var(--c-btn-ghost)',
  inputBg:  'var(--c-input-bg)',
  codeBg:   'var(--c-code-bg)',
  codeTxt:  'var(--c-code-txt)',
  shadow:   'var(--c-shadow)',
} as const

export const THEME_COLORS: Record<string, string> = {
  coral:   C.coral,
  purple:  C.purple,
  magenta: C.magenta,
  amber:   C.amber,
  teal:    C.teal,
  green:   C.green,
}

export type ColorKey = keyof typeof THEME_COLORS

// ── Widget type list ───────────────────────────────────────────────────────
export type WidgetType =
  // Stats
  | 'stat-devices' | 'stat-messages' | 'stat-temp' | 'stat-power' | 'stat-voltage'
  // Gauges
  | 'gauge-temp' | 'gauge-humidity' | 'gauge-co2' | 'gauge-pressure'
  // Sensors
  | 'sensor-motion' | 'sensor-ldr' | 'sensor-soil' | 'sensor-wind'
  // Charts
  | 'chart-telemetry' | 'chart-power' | 'chart-realtime'
  // Controls
  | 'switch-panel' | 'relay-single' | 'dimmer'
  // Meters
  | 'voltage-meter' | 'water-flow'
  // Others
  | 'device-list' | 'alert-feed' | 'map' | 'terminal'

export type WidgetConfig = {
  device:     string
  channel:    string
  unit:       string
  colorTheme: ColorKey
  chartTab?:  'temp' | 'humid' | 'cpu'
  min?:       number
  max?:       number
  label?:     string
}

export type Widget = {
  id:       string
  type:     WidgetType
  title:    string
  colSpan:  1 | 2 | 4
  rowSpan:  1 | 2
  visible:  boolean
  config:   WidgetConfig
}

export type CatalogEntry = {
  type:         WidgetType
  label:        string
  desc:         string
  icon:         string
  defaultColSpan: 1 | 2 | 4
  defaultRowSpan: 1 | 2
  category:     'stats' | 'gauges' | 'sensors' | 'charts' | 'controls' | 'utilities'
}

export const WIDGET_CATALOG: CatalogEntry[] = [
  // ── Stats ──────────────────────────────────────────────────────────────
  { type:'stat-devices',  label:'Devices Online',    desc:'Live device count & status',       icon:'devices',     defaultColSpan:1, defaultRowSpan:1, category:'stats'    },
  { type:'stat-messages', label:'Message Counter',   desc:'Daily message quota usage',        icon:'signal',      defaultColSpan:1, defaultRowSpan:1, category:'stats'    },
  { type:'stat-temp',     label:'Temperature Tile',  desc:'Average sensor temperature',       icon:'thermometer', defaultColSpan:1, defaultRowSpan:1, category:'stats'    },
  { type:'stat-power',    label:'Power Usage',       desc:'kWh consumption today',            icon:'power',       defaultColSpan:1, defaultRowSpan:1, category:'stats'    },
  { type:'stat-voltage',  label:'Voltage Stat',      desc:'Live voltage reading',             icon:'bolt',        defaultColSpan:1, defaultRowSpan:1, category:'stats'    },
  // ── Gauges ─────────────────────────────────────────────────────────────
  { type:'gauge-temp',    label:'Temperature Gauge', desc:'Large circular temperature gauge', icon:'thermometer', defaultColSpan:1, defaultRowSpan:1, category:'gauges'   },
  { type:'gauge-humidity',label:'Humidity Gauge',    desc:'Large circular humidity gauge',    icon:'humidity',    defaultColSpan:1, defaultRowSpan:1, category:'gauges'   },
  { type:'gauge-co2',     label:'CO₂ / Air Quality', desc:'CO₂ ppm with air quality index',  icon:'wind',        defaultColSpan:1, defaultRowSpan:1, category:'gauges'   },
  { type:'gauge-pressure',label:'Pressure Gauge',    desc:'Atmospheric pressure (hPa)',       icon:'gauge',       defaultColSpan:1, defaultRowSpan:1, category:'gauges'   },
  // ── Sensors ────────────────────────────────────────────────────────────
  { type:'sensor-motion', label:'Motion Sensor',     desc:'PIR motion detection card',        icon:'eye',         defaultColSpan:1, defaultRowSpan:1, category:'sensors'  },
  { type:'sensor-ldr',    label:'Light / LDR Sensor',desc:'Light intensity in lux',          icon:'sun',         defaultColSpan:1, defaultRowSpan:1, category:'sensors'  },
  { type:'sensor-soil',   label:'Soil Moisture',     desc:'Soil moisture % for agriculture',  icon:'plant',       defaultColSpan:1, defaultRowSpan:1, category:'sensors'  },
  { type:'sensor-wind',   label:'Wind Sensor',       desc:'Wind speed & direction',           icon:'wind',        defaultColSpan:1, defaultRowSpan:1, category:'sensors'  },
  // ── Charts ─────────────────────────────────────────────────────────────
  { type:'chart-telemetry',label:'Telemetry Chart',  desc:'Multi-channel area chart',         icon:'analytics',   defaultColSpan:2, defaultRowSpan:1, category:'charts'   },
  { type:'chart-power',   label:'Power Chart',       desc:'Weekly kWh bar chart',             icon:'chart',       defaultColSpan:1, defaultRowSpan:1, category:'charts'   },
  { type:'chart-realtime',label:'Realtime Line Chart',desc:'Auto-updating live line chart',   icon:'signal',      defaultColSpan:2, defaultRowSpan:1, category:'charts'   },
  // ── Controls ───────────────────────────────────────────────────────────
  { type:'switch-panel',  label:'Relay Switch Panel',desc:'Multi-channel relay panel',        icon:'power',       defaultColSpan:1, defaultRowSpan:1, category:'controls' },
  { type:'relay-single',  label:'Single Relay',      desc:'Large single relay toggle',        icon:'power',       defaultColSpan:1, defaultRowSpan:1, category:'controls' },
  { type:'dimmer',        label:'Dimmer / PWM',      desc:'Analog brightness/speed slider',   icon:'slider',      defaultColSpan:1, defaultRowSpan:1, category:'controls' },
  // ── Meters ─────────────────────────────────────────────────────────────
  { type:'voltage-meter', label:'Voltage Meter',     desc:'Voltage, current & power stats',   icon:'bolt',        defaultColSpan:2, defaultRowSpan:1, category:'utilities'},
  { type:'water-flow',    label:'Water Flow Meter',  desc:'Flow rate & total volume',         icon:'droplet',     defaultColSpan:1, defaultRowSpan:1, category:'utilities'},
  // ── Utilities ──────────────────────────────────────────────────────────
  { type:'device-list',   label:'Device List',       desc:'All devices with toggles',         icon:'list',        defaultColSpan:2, defaultRowSpan:1, category:'utilities'},
  { type:'alert-feed',    label:'Alert Feed',        desc:'Recent alert notifications',       icon:'bell',        defaultColSpan:1, defaultRowSpan:1, category:'utilities'},
  { type:'map',           label:'GPS Map',           desc:'Device location map',              icon:'map',         defaultColSpan:2, defaultRowSpan:1, category:'utilities'},
  { type:'terminal',      label:'Serial Terminal',   desc:'Live device log stream',           icon:'terminal',    defaultColSpan:2, defaultRowSpan:1, category:'utilities'},
]

const DEF = (type: WidgetType, colorTheme: ColorKey = 'coral'): WidgetConfig =>
  ({ device:'All Devices', channel:'temperature', unit:'', colorTheme, min:0, max:100 })

export const DEFAULT_WIDGETS: Widget[] = [
  { id:'w1',  type:'stat-devices',    title:'Devices Online',    colSpan:1, rowSpan:1, visible:true,  config:DEF('stat-devices','coral')   },
  { id:'w2',  type:'stat-messages',   title:'Messages Today',    colSpan:1, rowSpan:1, visible:true,  config:DEF('stat-messages','purple') },
  { id:'w3',  type:'stat-temp',       title:'Avg Temperature',   colSpan:1, rowSpan:1, visible:true,  config:{...DEF('stat-temp','magenta'),  unit:'°C'} },
  { id:'w4',  type:'stat-power',      title:'Power Usage',       colSpan:1, rowSpan:1, visible:true,  config:{...DEF('stat-power','amber'),   unit:'kWh'} },
  { id:'w5',  type:'chart-telemetry', title:'Telemetry Stream',  colSpan:2, rowSpan:1, visible:true,  config:DEF('chart-telemetry','coral') },
  { id:'w6',  type:'gauge-temp',      title:'Temperature',       colSpan:1, rowSpan:1, visible:true,  config:{...DEF('gauge-temp','coral'),   unit:'°C', min:0, max:50}  },
  { id:'w7',  type:'gauge-humidity',  title:'Humidity',          colSpan:1, rowSpan:1, visible:true,  config:{...DEF('gauge-humidity','teal'), unit:'%',  min:0, max:100} },
  { id:'w8',  type:'switch-panel',    title:'Relay Control',     colSpan:1, rowSpan:1, visible:true,  config:DEF('switch-panel','coral')   },
  { id:'w9',  type:'chart-power',     title:'Power Chart',       colSpan:1, rowSpan:1, visible:true,  config:DEF('chart-power','magenta')  },
  { id:'w10', type:'device-list',     title:'Device Manager',    colSpan:2, rowSpan:1, visible:true,  config:DEF('device-list','purple')   },
  // Hidden by default
  { id:'w11', type:'gauge-co2',       title:'CO₂ Level',         colSpan:1, rowSpan:1, visible:false, config:{...DEF('gauge-co2','amber'),   unit:'ppm',min:0, max:2000} },
  { id:'w12', type:'gauge-pressure',  title:'Pressure',          colSpan:1, rowSpan:1, visible:false, config:{...DEF('gauge-pressure','teal'),unit:'hPa',min:900,max:1100} },
  { id:'w13', type:'sensor-motion',   title:'Motion Detector',   colSpan:1, rowSpan:1, visible:false, config:DEF('sensor-motion','magenta') },
  { id:'w14', type:'sensor-ldr',      title:'Light Sensor',      colSpan:1, rowSpan:1, visible:false, config:{...DEF('sensor-ldr','amber'),  unit:'lux',min:0, max:10000} },
  { id:'w15', type:'sensor-soil',     title:'Soil Moisture',     colSpan:1, rowSpan:1, visible:false, config:{...DEF('sensor-soil','green'), unit:'%',  min:0, max:100} },
  { id:'w16', type:'sensor-wind',     title:'Wind Speed',        colSpan:1, rowSpan:1, visible:false, config:{...DEF('sensor-wind','teal'),  unit:'km/h',min:0,max:120} },
  { id:'w17', type:'relay-single',    title:'Main Relay',        colSpan:1, rowSpan:1, visible:false, config:DEF('relay-single','coral')   },
  { id:'w18', type:'dimmer',          title:'LED Dimmer',        colSpan:1, rowSpan:1, visible:false, config:{...DEF('dimmer','amber'),       unit:'%'}  },
  { id:'w19', type:'voltage-meter',   title:'Power Meter',       colSpan:2, rowSpan:1, visible:false, config:DEF('voltage-meter','coral')  },
  { id:'w20', type:'water-flow',      title:'Water Flow',        colSpan:1, rowSpan:1, visible:false, config:{...DEF('water-flow','teal'),   unit:'L/min'} },
  { id:'w21', type:'alert-feed',      title:'Alert Feed',        colSpan:1, rowSpan:1, visible:false, config:DEF('alert-feed','magenta')   },
  { id:'w22', type:'chart-realtime',  title:'Realtime Chart',    colSpan:2, rowSpan:1, visible:false, config:DEF('chart-realtime','purple') },
  { id:'w23', type:'map',             title:'GPS Map',           colSpan:2, rowSpan:1, visible:false, config:DEF('map','teal')             },
  { id:'w24', type:'terminal',        title:'Serial Terminal',   colSpan:2, rowSpan:1, visible:false, config:DEF('terminal','purple')      },
  { id:'w25', type:'stat-voltage',    title:'Voltage',           colSpan:1, rowSpan:1, visible:false, config:{...DEF('stat-voltage','teal'), unit:'V'}  },
]
