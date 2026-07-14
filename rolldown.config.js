export default {
  input: 'src/ShuffleTextElement.ts',
  output: [
    {
      format: 'iife',
      name: 'ShuffleText',
      file: 'build/shuffle-text.js',
      strict: true
    },
    {
      format: 'iife',
      name: 'ShuffleText',
      file: 'build/shuffle-text.min.js',
      strict: true,
      minify: true
    },
    {
      format: 'cjs',
      file: 'build/shuffle-text.cjs',
      strict: true
    },
    {
      format: 'es',
      file: 'build/shuffle-text.module.js'
    }
  ]
};

