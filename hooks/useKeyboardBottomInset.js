import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Altura del teclado visible (0 si está oculto). Útil para padding extra en ScrollView.
 */
export function useKeyboardBottomInset() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subShow = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates?.height ?? 0);
    });
    const subHide = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  return height;
}
