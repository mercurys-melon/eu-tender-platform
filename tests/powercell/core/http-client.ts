/**
 * Powercell HTTP Client
 * Lightweight HTTP client using Node.js stdlib
 */

import { URL } from 'node:url'
import * as http from 'node:http'
import * as https from 'node:https'

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  json(): any
}

export interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: string | Buffer
  timeout?: number
}

export class HttpClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string = '', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'User-Agent': 'Powercell-Test-Runner/1.0',
      ...defaultHeaders,
    }
  }

  async request(path: string, options: RequestOptions = {}): Promise<HttpResponse> {
    const url = new URL(path, this.baseUrl)
    const method = options.method || 'GET'
    const headers = { ...this.defaultHeaders, ...options.headers }
    const timeout = options.timeout || 30000

    return new Promise((resolve, reject) => {
      const requestOptions = {
        method,
        headers,
        timeout,
      }

      const client = url.protocol === 'https:' ? https : http

      const req = client.request(url, requestOptions, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk.toString()
        })

        res.on('end', () => {
          const responseHeaders: Record<string, string> = {}
          for (const [key, value] of Object.entries(res.headers)) {
            responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value
          }

          resolve({
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            headers: responseHeaders,
            body: data,
            json() {
              try {
                return JSON.parse(data)
              } catch {
                throw new Error('Response is not valid JSON')
              }
            },
          })
        })
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error(`Request timeout after ${timeout}ms`))
      })

      if (options.body) {
        req.write(options.body)
      }

      req.end()
    })
  }

  async get(path: string, options?: RequestOptions): Promise<HttpResponse> {
    return this.request(path, { ...options, method: 'GET' })
  }

  async post(path: string, body?: string | Buffer, options?: RequestOptions): Promise<HttpResponse> {
    return this.request(path, {
      ...options,
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  }

  async put(path: string, body?: string | Buffer, options?: RequestOptions): Promise<HttpResponse> {
    return this.request(path, {
      ...options,
      method: 'PUT',
      body,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  }

  async delete(path: string, options?: RequestOptions): Promise<HttpResponse> {
    return this.request(path, { ...options, method: 'DELETE' })
  }
}
