import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

export default await generateEslintConfig({ ignores: ['pkg/**', 'dist/**'] })
