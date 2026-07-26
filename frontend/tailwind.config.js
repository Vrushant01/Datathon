/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ksp: {
          navy: {
            DEFAULT: '#0B2240',
            light: '#1B3E6C',
            dark: '#051224',
          },
          gold: {
            DEFAULT: '#D4AF37',
            light: '#EAD168',
            dark: '#AA881E',
          },
          blue: {
            DEFAULT: '#00529B',
            light: '#337CB6',
            dark: '#003366',
          }
        },
        "tertiary": "#dec29a",
        "outline-variant": "#45464d",
        "on-primary-fixed": "#131b2e",
        "on-surface-variant": "#c6c6cd",
        "primary-container": "#0f172a",
        "secondary-fixed-dim": "#b9c7e0",
        "surface-variant": "#353436",
        "surface-dim": "#131315",
        "error-container": "#93000a",
        "inverse-on-surface": "#303032",
        "on-secondary-fixed": "#0d1c2f",
        "error": "#ffb4ab",
        "on-surface": "#e4e2e4",
        "on-primary": "#283044",
        "on-background": "#e4e2e4",
        "surface-tint": "#bec6e0",
        "surface-container-high": "#2a2a2b",
        "secondary-container": "#3c4a5e",
        "surface-container": "#1f1f21",
        "on-error": "#690005",
        "tertiary-fixed-dim": "#dec29a",
        "secondary-fixed": "#d5e3fd",
        "on-primary-container": "#798098",
        "tertiary-fixed": "#fcdeb5",
        "outline": "#909097",
        "tertiary-container": "#231500",
        "primary-fixed": "#dae2fd",
        "on-error-container": "#ffdad6",
        "surface": "#131315",
        "surface-container-lowest": "#0e0e10",
        "on-secondary-container": "#abb9d2",
        "primary": "#bec6e0",
        "on-tertiary-container": "#957d5a",
        "surface-container-highest": "#353436",
        "surface-container-low": "#1b1b1d",
        "on-secondary-fixed-variant": "#3a485c",
        "on-tertiary-fixed": "#271901",
        "on-tertiary": "#3e2d11",
        "on-primary-fixed-variant": "#3f465c",
        "on-secondary": "#233144",
        "inverse-surface": "#e4e2e4",
        "primary-fixed-dim": "#bec6e0",
        "surface-bright": "#39393b",
        "on-tertiary-fixed-variant": "#574425",
        "background": "#131315",
        "inverse-primary": "#565e74",
        "secondary": "#b9c7e0"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "gutter": "16px",
        "container-padding": "24px",
        "unit": "4px",
        "margin-desktop": "32px",
        "margin-mobile": "16px"
      },
      fontFamily: {
        "data-mono": ["JetBrains Mono", "monospace"],
        "headline-md": ["Inter", "sans-serif"],
        "headline-lg": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "label-caps": ["JetBrains Mono", "monospace"],
        "body-lg": ["Inter", "sans-serif"],
        "sans": ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "data-mono": ["13px", {"lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "500"}],
        "headline-md": ["24px", {"lineHeight": "32px", "letterSpacing": "-0.01em", "fontWeight": "600"}],
        "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "body-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "label-caps": ["11px", {"lineHeight": "16px", "letterSpacing": "0.08em", "fontWeight": "700"}],
        "body-lg": ["16px", {"lineHeight": "24px", "fontWeight": "400"}]
      }
    },
  },
  plugins: [],
}
