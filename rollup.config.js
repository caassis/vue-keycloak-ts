import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from 'rollup-plugin-babel'
import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import pkg from './package.json'

const version = process.env.VERSION || require('./package.json').version
const banner =
`/*!
  * vue-keycloak-ts v${version}
  * @license ISC
  */`
const name = 'caassis-vue-keycloak'

// CommonJS (for Node), ES module (for bundlers) and browser-friendly UMD build.
export default [
  {
    input: 'src/index.ts',
    output: [
      { file: pkg.main, format: 'cjs', exports: 'named', banner, name },
      { file: pkg.module, format: 'es', exports: 'named', banner, name },
      { file: pkg.browser, format: 'umd', exports: 'named', banner, name }
    ],
    plugins: [
      resolve(), // so Rollup can find `keycloak-js`
      commonjs(), // so Rollup can convert `keycloak-js` to an ES module
      typescript()
    ]
  },
  {
    input: 'src/types.d.ts',
    output: [ {file: 'dist/types.d.ts', format: 'es'} ],
    plugins: [
      commonjs(),
      babel({
        exclude: ['node_modules/**']
      }),
      typescript(),
      dts()
    ]
  }
]

