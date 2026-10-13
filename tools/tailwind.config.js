module.exports = {
  content: [process.env.TWSRC],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: { extend: {
    colors: {
      bg: 'var(--bg)', surface: 'var(--surface)', surface2: 'var(--surface-2)', line: 'var(--line)',
      fg: 'var(--fg)', muted: 'var(--muted)',
      red: 'var(--red)', redstrong: 'var(--red-strong)', redsoft: 'var(--red-soft)', onred: 'var(--on-red)',
      ink: 'var(--ink)', inkfg: 'var(--ink-fg)', inkmuted: 'var(--ink-muted)', inkline: 'var(--ink-line)',
      good: 'var(--good)', goodsoft: 'var(--good-soft)', warn: 'var(--warn)', warnsoft: 'var(--warn-soft)',
      bad: 'var(--bad)', badsoft: 'var(--bad-soft)'
    },
    fontFamily: {
      head: ['"Bai Jamjuree"', '"IBM Plex Sans Thai"', '"Noto Sans Thai"', 'Tahoma', 'sans-serif'],
      body: ['"IBM Plex Sans Thai"', '"Noto Sans Thai"', '"Leelawadee UI"', 'Tahoma', 'sans-serif']
    }
  } }
};
