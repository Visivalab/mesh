import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: './main.js',
  output: {
    dir: 'bundles',
    format: 'cjs'
  },
  plugins: [nodeResolve(),commonjs()]
};

//https://github.com/rollup/plugins