import { definePreset, palette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const CustomPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      light: {
        surface: palette('{zinc}')
      },
      dark: {
        surface: palette('{zinc}')
      }
    }
  }
});
