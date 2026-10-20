import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

type Card = { id: string; question: string; answer: string };
type Tab = 'study' | 'manage';

const STORAGE_KEY = 'codealpha.flashcards.v1';

const SAMPLE_CARDS: Card[] = [
  { id: 's1', question: 'What does CPU stand for?', answer: 'Central Processing Unit' },
  { id: 's2', question: 'What is the capital of Japan?', answer: 'Tokyo' },
  { id: 's3', question: 'What is the chemical symbol for gold?', answer: 'Au' },
  { id: 's4', question: 'What is 12 × 12?', answer: '144' },
  { id: 's5', question: 'In React, which hook stores local component state?', answer: 'useState' },
];

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('study');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // Editor modal state: editing === null means "not open"; id '' means a new card
  const [editing, setEditing] = useState<Card | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        setCards(raw === null ? SAMPLE_CARDS : (JSON.parse(raw) as Card[]));
      } catch {
        setCards(SAMPLE_CARDS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: Card[]) => {
    setCards(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      Alert.alert('Could not save', 'Your changes are visible now but may not be kept after closing the app.');
    }
  }, []);

  const safeIndex = cards.length === 0 ? 0 : Math.min(index, cards.length - 1);
  const current = cards[safeIndex];

  const go = (delta: number) => {
    if (cards.length === 0) return;
    setIndex((safeIndex + delta + cards.length) % cards.length);
    setRevealed(false);
  };

  const openEditor = (card?: Card) => {
    setEditing(card ?? { id: '', question: '', answer: '' });
    setQuestion(card?.question ?? '');
    setAnswer(card?.answer ?? '');
    setError('');
  };

  const saveCard = async () => {
    const q = question.trim();
    const a = answer.trim();
    if (!q || !a) {
      setError('Enter both a question and an answer.');
      return;
    }
    if (editing && editing.id) {
      await persist(cards.map((c) => (c.id === editing.id ? { ...c, question: q, answer: a } : c)));
    } else {
      await persist([...cards, { id: newId(), question: q, answer: a }]);
      setIndex(cards.length);
      setRevealed(false);
    }
    setEditing(null);
  };

  const removeCard = (card: Card) => {
    const doDelete = async () => {
      await persist(cards.filter((c) => c.id !== card.id));
      setRevealed(false);
    };
    if (Platform.OS === 'web') {
      // Alert buttons are not supported on web
      if (typeof window !== 'undefined' && window.confirm(`Delete "${card.question}"?`)) void doDelete();
      return;
    }
    Alert.alert('Delete card?', card.question, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  const progress = useMemo(
    () => (cards.length === 0 ? 0 : (safeIndex + 1) / cards.length),
    [cards.length, safeIndex],
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.muted}>Loading your cards…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Flashcards</Text>
        <Text style={styles.muted}>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</Text>
      </View>

      <View style={styles.tabs}>
        {(['study', 'manage'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'study' ? 'Study' : 'Manage cards'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'study' ? (
        current ? (
          <View style={styles.studyWrap}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.counter}>Card {safeIndex + 1} of {cards.length}</Text>

            <View style={[styles.card, revealed && styles.cardBack]}>
              <Text style={styles.side}>{revealed ? 'Answer' : 'Question'}</Text>
              <Text style={[styles.cardText, revealed && styles.cardTextBack]}>
                {revealed ? current.answer : current.question}
              </Text>
            </View>

            <Pressable
              style={styles.primaryBtn}
              onPress={() => setRevealed((r) => !r)}
              accessibilityLabel={revealed ? 'Hide answer' : 'Show answer'}
            >
              <Text style={styles.primaryText}>{revealed ? 'Hide Answer' : 'Show Answer'}</Text>
            </Pressable>

            <View style={styles.navRow}>
              <Pressable style={styles.navBtn} onPress={() => go(-1)} accessibilityLabel="Previous card">
                <Text style={styles.navText}>Previous</Text>
              </Pressable>
              <Pressable style={styles.navBtn} onPress={() => go(1)} accessibilityLabel="Next card">
                <Text style={styles.navText}>Next</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <EmptyState onAdd={() => openEditor()} />
        )
      ) : (
        <View style={styles.flex}>
          <FlatList
            data={cards}
            keyExtractor={(c) => c.id}
            contentContainerStyle={cards.length === 0 ? styles.flex : styles.list}
            ListEmptyComponent={<EmptyState onAdd={() => openEditor()} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.rowQ} numberOfLines={2}>{item.question}</Text>
                  <Text style={styles.rowA} numberOfLines={2}>{item.answer}</Text>
                </View>
                <Pressable onPress={() => openEditor(item)} style={styles.rowBtn} accessibilityLabel={`Edit ${item.question}`}>
                  <Text style={styles.rowBtnText}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => removeCard(item)} style={styles.rowBtn} accessibilityLabel={`Delete ${item.question}`}>
                  <Text style={[styles.rowBtnText, { color: C.danger }]}>Delete</Text>
                </Pressable>
              </View>
            )}
          />
          {cards.length > 0 && (
            <Pressable style={[styles.primaryBtn, styles.addBtn]} onPress={() => openEditor()}>
              <Text style={styles.primaryText}>Add card</Text>
            </Pressable>
          )}
        </View>
      )}

      <Modal visible={editing !== null} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editing?.id ? 'Edit card' : 'New card'}</Text>
            <Text style={styles.label}>Question</Text>
            <TextInput
              style={styles.input}
              value={question}
              onChangeText={setQuestion}
              placeholder="What do you want to remember?"
              multiline
              autoFocus
            />
            <Text style={styles.label}>Answer</Text>
            <TextInput
              style={styles.input}
              value={answer}
              onChangeText={setAnswer}
              placeholder="The answer"
              multiline
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.navRow}>
              <Pressable style={styles.navBtn} onPress={() => setEditing(null)}>
                <Text style={styles.navText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.navBtn, styles.saveBtn]} onPress={() => void saveCard()}>
                <Text style={[styles.navText, { color: '#fff' }]}>Save card</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={[styles.flex, styles.center, { padding: 24 }]}>
      <Text style={styles.emptyTitle}>No flashcards yet</Text>
      <Text style={[styles.muted, { textAlign: 'center', marginBottom: 16 }]}>
        Add your first card to start studying.
      </Text>
      <Pressable style={styles.primaryBtn} onPress={onAdd}>
        <Text style={styles.primaryText}>Add card</Text>
      </Pressable>
    </View>
  );
}

const C = {
  bg: '#EEF1F6',
  ink: '#14213D',
  muted: '#5C6B85',
  accent: '#2F4BFF',
  paper: '#FFFFFF',
  back: '#14213D',
  line: '#D5DCE8',
  danger: '#C62828',
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: C.bg, maxWidth: 640, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 30, fontWeight: '800', color: C.ink },
  muted: { color: C.muted, fontSize: 14 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 12, backgroundColor: '#DDE3EF', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: C.paper },
  tabText: { color: C.muted, fontWeight: '600' },
  tabTextActive: { color: C.ink },
  studyWrap: { flex: 1, paddingHorizontal: 20 },
  track: { height: 6, backgroundColor: C.line, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: C.accent },
  counter: { marginTop: 8, marginBottom: 16, color: C.muted, fontSize: 13 },
  card: { flex: 1, maxHeight: 340, minHeight: 220, backgroundColor: C.paper, borderRadius: 20, padding: 24, justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  cardBack: { backgroundColor: C.back, borderColor: C.back },
  side: { position: 'absolute', top: 18, left: 24, fontSize: 13, color: C.muted, fontWeight: '600' },
  cardText: { fontSize: 26, fontWeight: '700', color: C.ink, textAlign: 'center' },
  cardTextBack: { color: '#fff' },
  primaryBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  navBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, alignItems: 'center' },
  navText: { color: C.ink, fontWeight: '700', fontSize: 15 },
  saveBtn: { backgroundColor: C.accent, borderColor: C.accent },
  list: { paddingHorizontal: 20, paddingBottom: 90 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  rowQ: { fontWeight: '700', color: C.ink, fontSize: 15 },
  rowA: { color: C.muted, marginTop: 2 },
  rowBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  rowBtnText: { color: C.accent, fontWeight: '700' },
  addBtn: { position: 'absolute', left: 20, right: 20, bottom: 16, marginTop: 0 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,33,61,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 640, backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 8 },
  label: { marginTop: 10, marginBottom: 6, color: C.muted, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, fontSize: 16, minHeight: 48, color: C.ink, backgroundColor: '#F8FAFD' },
  error: { color: C.danger, marginTop: 10, fontWeight: '600' },
});
