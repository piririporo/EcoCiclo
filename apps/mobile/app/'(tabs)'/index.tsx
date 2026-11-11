import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>ECONOMIA CIRCULAR</Text>
      <Text style={styles.title}>Dê um novo ciclo aos seus eletrônicos.</Text>
      <Text style={styles.body}>Cadastre, recupere e conecte equipamentos a pessoas que podem aproveitá-los.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f5faf7' },
  kicker: { color: '#0f766e', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  title: { color: '#12372f', fontSize: 36, fontWeight: '800', lineHeight: 42, marginBottom: 16 },
  body: { color: '#47635b', fontSize: 17, lineHeight: 26 }
});
