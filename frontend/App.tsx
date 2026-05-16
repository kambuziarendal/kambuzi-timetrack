import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LanguageProvider } from './src/i18n';
const theme = { ...MD3LightTheme, colors: { ...MD3LightTheme.colors, primary: '#2563eb', secondary: '#16a34a' } };
export default function App() { return <PaperProvider theme={theme}><LanguageProvider><NavigationContainer><RootNavigator /></NavigationContainer></LanguageProvider></PaperProvider>; }
