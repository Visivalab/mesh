import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import { terser } from "rollup-plugin-terser";
import analyze from 'rollup-plugin-analyzer'

export default {
  input: 'public/js/main.js',
  output: {
    file: 'public/js/bundle.js',
    format: 'cjs'
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    babel({
      exclude: [ 'node_modules/**' ],
      babelHelpers: 'bundled' 
    }),
    analyze(), // Analitza rollup, després al passar el terser redueix molt més el size
  
    terser()
  ]
};

//https://github.com/rollup/plugins