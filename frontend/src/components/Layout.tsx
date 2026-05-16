import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LanguageSwitch } from '../i18n';
export function Layout({ title, children }: { title: string; children: React.ReactNode }) { return <ScrollView contentContainerStyle={styles.wrap}><View style={styles.top}><Text variant="headlineMedium" style={styles.title}>{title}</Text><LanguageSwitch /></View><View style={styles.card}>{children}</View></ScrollView>; }
const styles = StyleSheet.create({ wrap: { padding: 20, maxWidth: 1000, width: '100%', alignSelf: 'center', gap: 16 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }, title: { marginBottom: 8, fontWeight: '700' }, card: { gap: 12 } });
