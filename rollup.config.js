import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'public/js/main.js',
  output: {
    file: 'public/js/bundle.js',
    format: 'cjs'
  },
  plugins: [nodeResolve(),commonjs()]
};

//https://github.com/rollup/plugins