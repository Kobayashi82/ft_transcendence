import { Registry, Counter, Histogram } from "prom-client"

// Crear un registro para las métricas
export const register = new Registry()

// Añadir métricas por defecto
export const collectDefaultMetrics = async () => {
  const { collectDefaultMetrics } = await import('prom-client')
  collectDefaultMetrics({ register })
}

// Contador de solicitudes HTTP
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
})

// Histograma de duración de solicitudes HTTP
export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
})

