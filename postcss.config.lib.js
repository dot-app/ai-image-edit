/**
 * PostCSS config for library build
 * Compiles Tailwind to pure CSS without @layer directives
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
    // Remove @layer wrappers in final output
    'postcss-discard-empty': {},
  },
}
