/**
 * 專案路徑：取得專案根目錄與腳本目錄
 */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** 專案根目錄（scripts 的上一層） */
export const projectRoot = resolve(__dirname, '../..')

/** scripts 目錄 */
export const scriptsDir = resolve(__dirname, '..')
