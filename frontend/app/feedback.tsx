import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { getErrorMessage } from '../utils/errorHelpers';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'general', label: 'General', icon: 'chatbubble-ellipses' as const, color: '#2563EB' },
  { id: 'feature', label: 'Feature Request', icon: 'bulb' as const, color: '#F59E0B' },
  { id: 'bug', label: 'Bug Report', icon: 'bug' as const, color: '#DC2626' },
  { id: 'ui', label: 'Design / UX', icon: 'color-palette' as const, color: '#8B5CF6' },
  { id: 'performance', label: 'Performance', icon: 'speedometer' as const, color: '#059669' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle' as const, color: '#6B7280' },
];

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing'];

export default function FeedbackScreen() {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  
  const [rating, setRating] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const scaleAnims = useRef(Array.from({ length: 5 }, () => new Animated.Value(1))).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const animateStar = (index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(scaleAnims[index], { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const handleStarPress = (star: number) => {
    setRating(star);
    animateStar(star - 1);
  };

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a rating'); return; }
    if (!selectedCategory) { setError('Please select a category'); return; }
    if (message.trim().length < 5) { setError('Please write at least 5 characters'); return; }
    
    setError('');
    setSubmitting(true);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          category: CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory,
          message: message.trim(),
          email: email.trim(),
          user_name: userName.trim() || 'Anonymous',
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to submit feedback');
      }
      
      setSubmitted(true);
      Animated.spring(successAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <Animated.View style={[styles.successIconWrap, { transform: [{ scale: successAnim }] }]}>
            <View style={[styles.successIconCircle, { backgroundColor: '#059669' + '18' }]}>
              <Ionicons name="checkmark-circle" size={72} color="#059669" />
            </View>
          </Animated.View>
          
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
            Thank You!
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Your feedback helps us make DocScan Pro better for everyone.
            We truly appreciate you taking the time.
          </Text>
          
          <View style={styles.successStars}>
            {Array.from({ length: 5 }, (_, i) => (
              <Ionicons
                key={i}
                name={i < rating ? 'star' : 'star-outline'}
                size={28}
                color={i < rating ? '#F59E0B' : colors.textTertiary}
              />
            ))}
          </View>
          
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="#FFF" />
            <Text style={styles.backBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.anotherBtn, { borderColor: colors.primary }]}
            activeOpacity={0.7}
            onPress={() => {
              setSubmitted(false);
              setRating(0);
              setSelectedCategory('');
              setMessage('');
              setEmail('');
              setUserName('');
              successAnim.setValue(0);
            }}
          >
            <Text style={[styles.anotherBtnText, { color: colors.primary }]}>Submit Another</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.surfaceHighlight }]}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Share Feedback</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={[styles.heroIconWrap, { backgroundColor: '#8B5CF6' + '15' }]}>
              <Ionicons name="heart" size={36} color="#8B5CF6" />
            </View>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              We'd Love Your Feedback
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              As a valued beta user, your opinion shapes the future of DocScan Pro.
              Every piece of feedback matters.
            </Text>
          </View>

          {/* Star Rating */}
          <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              How would you rate your experience?
            </Text>
            <View style={styles.starsRow}>
              {Array.from({ length: 5 }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  onPress={() => handleStarPress(i + 1)}
                  style={styles.starBtn}
                >
                  <Animated.View style={{ transform: [{ scale: scaleAnims[i] }] }}>
                    <Ionicons
                      name={i < rating ? 'star' : 'star-outline'}
                      size={40}
                      color={i < rating ? '#F59E0B' : colors.textTertiary}
                    />
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={[styles.starLabel, { color: '#F59E0B' }]}>
                {STAR_LABELS[rating]}
              </Text>
            )}
          </View>

          {/* Category Selection */}
          <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              What's your feedback about?
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selectedCategory === cat.id
                        ? cat.color + '18'
                        : colors.surfaceHighlight,
                      borderColor: selectedCategory === cat.id
                        ? cat.color
                        : 'transparent',
                      borderWidth: selectedCategory === cat.id ? 1.5 : 0,
                    },
                  ]}
                >
                  <Ionicons
                    name={cat.icon}
                    size={18}
                    color={selectedCategory === cat.id ? cat.color : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: selectedCategory === cat.id ? cat.color : colors.textSecondary,
                        fontWeight: selectedCategory === cat.id ? '700' : '500',
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Message */}
          <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              Tell us more
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.surfaceHighlight,
                  color: colors.textPrimary,
                  borderColor: message.length > 0 ? colors.primary + '40' : 'transparent',
                },
              ]}
              placeholder="What did you like? What could be improved? Any features you'd love to see?"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={5}
              maxLength={2000}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {message.length}/2000
            </Text>
          </View>

          {/* Optional Contact Info */}
          <View style={[styles.section, { backgroundColor: colors.surface, ...shadows.sm }]}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
              Optional: Let us follow up
            </Text>
            <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>
              Leave your details if you'd like us to respond
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Your name"
              placeholderTextColor={colors.textTertiary}
              value={userName}
              onChangeText={setUserName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHighlight, color: colors.textPrimary }]}
              placeholder="Email address"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Error */}
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: (rating > 0 && selectedCategory && message.length >= 5)
                  ? colors.primary
                  : colors.textTertiary,
              },
            ]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#FFF" />
                <Text style={styles.submitText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Privacy note */}
          <Text style={[styles.privacyNote, { color: colors.textTertiary }]}>
            Your feedback is private and only shared with the DocScan Pro team.
            We never share your information with third parties.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  
  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 10,
  },
  
  // Section
  section: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  
  // Stars
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  starBtn: {
    padding: 4,
  },
  starLabel: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  
  // Categories
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 13,
  },
  
  // Text area
  textArea: {
    minHeight: 120,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    borderWidth: 1.5,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  
  // Input
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 10,
  },
  
  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  
  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    marginBottom: 12,
  },
  submitText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  privacyNote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  
  // Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIconWrap: {
    marginBottom: 24,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
  },
  successStars: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
    marginBottom: 32,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    width: '100%',
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  anotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    width: '100%',
    marginTop: 12,
  },
  anotherBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
