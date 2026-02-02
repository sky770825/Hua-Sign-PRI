/**
 * 載入 .env.local 到 process.env（供 CLI / 腳本共用）
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { projectRoot } from './path.mjs'

export function loadEnv(root = projectRoot) {
  try {
    const envPath = resolve(root, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const [key, ...valParts] = line.split('=')
      if (key && valParts.length) {
        const val = valParts.join('=').trim().replace(/^["']|["']$/g, '')
        process.env[key.trim()] = val
      }
    })
    return true
  } catch (e) {
    return false
  }
}
