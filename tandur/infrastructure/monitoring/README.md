# Monitoring & Observability (LGTM Stack)

Dokumentasi arsitektur observability untuk TANDUR menggunakan LGTM Stack (Loki, Grafana, Tempo, Mimir/Prometheus).

## 1. Komponen Observability

| Komponen | Peran |
|---|---|
| **Loki** | Log aggregation untuk seluruh container backend, frontend, dan database. |
| **Grafana** | Dashboard visualisasi metrik performa sistem, log query, dan tracing status. |
| **Tempo** | Distributed tracing untuk melacak siklus hidup request dari frontend ke backend. |
| **Prometheus / Mimir** | Penyimpanan metrik time-series (CPU, memori, latency request, active users). |

## 2. Metrik Kunci TANDUR

1. **HTTP Metrics:** Total request, response duration (p95/p99), error rate (4xx/5xx).
2. **Business Metrics:** Jumlah transaksi komoditas, volume agregasi stok, rata-rata margin harga.
3. **Database Metrics:** Connection pool usage, execution time query PostGIS geospasial.
4. **Cache Metrics:** Redis cache hit ratio untuk kuotasi harga komoditas terkini.
