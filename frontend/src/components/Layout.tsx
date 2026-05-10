import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
export function Layout({ title, children }: { title: string; children: React.ReactNode }) { return <ScrollView contentContainerStyle={styles.wrap}><Text variant="headlineMedium" style={styles.title}>{title}</Text><View style={styles.card}>{children}</View></ScrollView>; }
const styles = StyleSheet.create({ wrap: { padding: 20, maxWidth: 1000, width: '100%', alignSelf: 'center', gap: 16 }, title: { marginBottom: 8, fontWeight: '700' }, card: { gap: 12 } });
