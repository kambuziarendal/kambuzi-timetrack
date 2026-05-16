import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LanguageSwitch } from '../i18n';
export function Layout({ children }: { title: string; children: React.ReactNode; hideTitle?: boolean }) { return <ScrollView contentContainerStyle={styles.wrap}><View style={styles.top}><LanguageSwitch /></View><View style={styles.card}>{children}</View></ScrollView>; }
const styles = StyleSheet.create({ wrap: { padding: 20, maxWidth: 1000, width: '100%', alignSelf: 'center', gap: 16 }, top: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, card: { gap: 12 } });
