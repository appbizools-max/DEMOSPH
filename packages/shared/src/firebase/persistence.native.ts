import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

export function getRNAuthPersistence() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require('firebase/auth');
    if (typeof getReactNativePersistence === 'function') {
      return getReactNativePersistence(ReactNativeAsyncStorage);
    }
  } catch (e) {
    // Fallback if environment is not React Native
  }
  return undefined;
}


