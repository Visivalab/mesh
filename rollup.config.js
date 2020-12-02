import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';

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
    })
  ]
};

//https://github.com/rollup/plugins