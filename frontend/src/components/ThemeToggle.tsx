/** Botón para alternar entre tema claro y oscuro. */
import { useTheme } from '../lib/theme';
import { Icon } from './Icon';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      className="iconbtn"
      onClick={toggle}
      aria-label={isDark ? 'Activar tema claro' : 'Activar tema oscuro'}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={18} />
    </button>
  );
}
