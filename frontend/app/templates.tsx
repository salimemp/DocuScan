import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  Modal, TextInput, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  fields: TemplateField[];
  isPremium: boolean;
}

interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'email' | 'signature';
  required: boolean;
  placeholder?: string;
}

const TEMPLATES: DocumentTemplate[] = [
  {
    id: 'invoice',
    name: 'Invoice',
    description: 'Professional invoice template',
    icon: 'receipt-outline',
    color: '#2563EB',
    category: 'Business',
    isPremium: false,
    fields: [
      { id: 'invoice_no', label: 'Invoice Number', type: 'text', required: true },
      { id: 'date', label: 'Date', type: 'date', required: true },
      { id: 'client_name', label: 'Client Name', type: 'text', required: true },
      { id: 'amount', label: 'Amount', type: 'number', required: true },
      { id: 'description', label: 'Description', type: 'text', required: false },
    ],
  },
  {
    id: 'receipt',
    name: 'Receipt',
    description: 'Simple receipt for transactions',
    icon: 'card-outline',
    color: '#059669',
    category: 'Business',
    isPremium: false,
    fields: [
      { id: 'receipt_no', label: 'Receipt Number', type: 'text', required: true },
      { id: 'date', label: 'Date', type: 'date', required: true },
      { id: 'amount', label: 'Amount', type: 'number', required: true },
      { id: 'payment_method', label: 'Payment Method', type: 'text', required: false },
    ],
  },
  {
    id: 'contract',
    name: 'Contract',
    description: 'Basic contract agreement',
    icon: 'document-text-outline',
    color: '#7C3AED',
    category: 'Legal',
    isPremium: true,
    fields: [
      { id: 'title', label: 'Contract Title', type: 'text', required: true },
      { id: 'party1', label: 'Party 1 Name', type: 'text', required: true },
      { id: 'party2', label: 'Party 2 Name', type: 'text', required: true },
      { id: 'start_date', label: 'Start Date', type: 'date', required: true },
      { id: 'signature1', label: 'Party 1 Signature', type: 'signature', required: true },
      { id: 'signature2', label: 'Party 2 Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'nda',
    name: 'NDA',
    description: 'Non-Disclosure Agreement',
    icon: 'shield-outline',
    color: '#DC2626',
    category: 'Legal',
    isPremium: true,
    fields: [
      { id: 'discloser', label: 'Disclosing Party', type: 'text', required: true },
      { id: 'recipient', label: 'Receiving Party', type: 'text', required: true },
      { id: 'date', label: 'Effective Date', type: 'date', required: true },
      { id: 'signature', label: 'Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'meeting_notes',
    name: 'Meeting Notes',
    description: 'Structured meeting notes',
    icon: 'people-outline',
    color: '#F59E0B',
    category: 'Personal',
    isPremium: false,
    fields: [
      { id: 'title', label: 'Meeting Title', type: 'text', required: true },
      { id: 'date', label: 'Date', type: 'date', required: true },
      { id: 'attendees', label: 'Attendees', type: 'text', required: false },
      { id: 'agenda', label: 'Agenda', type: 'text', required: false },
      { id: 'notes', label: 'Notes', type: 'text', required: false },
      { id: 'action_items', label: 'Action Items', type: 'text', required: false },
    ],
  },
  {
    id: 'expense_report',
    name: 'Expense Report',
    description: 'Track business expenses',
    icon: 'wallet-outline',
    color: '#8B5CF6',
    category: 'Business',
    isPremium: false,
    fields: [
      { id: 'report_no', label: 'Report Number', type: 'text', required: true },
      { id: 'date', label: 'Date', type: 'date', required: true },
      { id: 'total', label: 'Total Amount', type: 'number', required: true },
      { id: 'purpose', label: 'Purpose', type: 'text', required: true },
    ],
  },
  {
    id: 'timesheet',
    name: 'Timesheet',
    description: 'Track work hours',
    icon: 'time-outline',
    color: '#14B8A6',
    category: 'Business',
    isPremium: true,
    fields: [
      { id: 'employee', label: 'Employee Name', type: 'text', required: true },
      { id: 'week_of', label: 'Week Of', type: 'date', required: true },
      { id: 'total_hours', label: 'Total Hours', type: 'number', required: true },
      { id: 'signature', label: 'Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'quote',
    name: 'Quote/Estimate',
    description: 'Price quote for services',
    icon: 'pricetag-outline',
    color: '#EC4899',
    category: 'Business',
    isPremium: false,
    fields: [
      { id: 'quote_no', label: 'Quote Number', type: 'text', required: true },
      { id: 'date', label: 'Date', type: 'date', required: true },
      { id: 'client', label: 'Client', type: 'text', required: true },
      { id: 'items', label: 'Line Items', type: 'text', required: true },
      { id: 'total', label: 'Total', type: 'number', required: true },
      { id: 'valid_until', label: 'Valid Until', type: 'date', required: false },
    ],
  },
];

const CATEGORIES = ['All', 'Business', 'Legal', 'Personal'];

export default function TemplatesScreen() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const { t } = useLanguage();
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const filteredTemplates = selectedCategory === 'All' 
    ? TEMPLATES 
    : TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleSelectTemplate = (template: DocumentTemplate) => {
    if (template.isPremium) {
      Alert.alert(
        'Premium Template',
        'This template requires a Pro subscription. Upgrade to unlock all templates.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }
    
    setSelectedTemplate(template);
    setFormData({});
    setShowPreview(true);
  };

  const handleCreateDocument = () => {
    if (!selectedTemplate) return;
    
    // Validate required fields
    const missingFields = selectedTemplate.fields
      .filter((f) => f.required && !formData[f.id])
      .map((f) => f.label);
    
    if (missingFields.length > 0) {
      Alert.alert('Missing Fields', `Please fill in: ${missingFields.join(', ')}`);
      return;
    }
    
    Alert.alert(
      'Create Document',
      'Document will be created with the template. You can edit it afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: () => {
            setShowPreview(false);
            // Navigate to preview with template data
            router.push({
              pathname: '/preview',
              params: {
                templateId: selectedTemplate.id,
                formData: JSON.stringify(formData),
              },
            });
          },
        },
      ]
    );
  };

  const renderTemplateCard = ({ item }: { item: DocumentTemplate }) => (
    <TouchableOpacity
      style={[styles.templateCard, { backgroundColor: colors.surface, ...shadows.sm }]}
      onPress={() => handleSelectTemplate(item)}
    >
      {item.isPremium && (
        <View style={[styles.premiumBadge, { backgroundColor: '#F59E0B' }]}>
          <Ionicons name="star" size={10} color="#FFF" />
          <Text style={styles.premiumText}>PRO</Text>
        </View>
      )}
      <View style={[styles.templateIcon, { backgroundColor: item.color + '18' }]}>
        <Ionicons name={item.icon as any} size={28} color={item.color} />
      </View>
      <Text style={[styles.templateName, { color: colors.textPrimary }]}>{item.name}</Text>
      <Text style={[styles.templateDesc, { color: colors.textTertiary }]} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={[styles.templateCategory, { backgroundColor: colors.surfaceHighlight }]}>
        <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Templates</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryPill,
              { backgroundColor: selectedCategory === cat ? colors.primary : colors.surface },
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[
              styles.categoryPillText,
              { color: selectedCategory === cat ? '#FFF' : colors.textSecondary },
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Templates Grid */}
      <FlatList
        data={filteredTemplates}
        renderItem={renderTemplateCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.templatesGrid}
        columnWrapperStyle={styles.row}
      />

      {/* Template Preview Modal */}
      <Modal visible={showPreview} animationType="slide" onRequestClose={() => setShowPreview(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {selectedTemplate?.name}
            </Text>
            <View style={styles.headerBtn} />
          </View>

          <ScrollView contentContainerStyle={styles.formContainer}>
            {selectedTemplate?.fields.map((field) => (
              <View key={field.id} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {field.label}
                  {field.required && <Text style={{ color: '#DC2626' }}> *</Text>}
                </Text>
                {field.type === 'signature' ? (
                  <TouchableOpacity 
                    style={[styles.signatureBtn, { borderColor: colors.border }]}
                    onPress={() => Alert.alert('Signature', 'Signature pad would open here')}
                  >
                    <Ionicons name="finger-print" size={24} color={colors.primary} />
                    <Text style={[styles.signatureBtnText, { color: colors.primary }]}>
                      Add Signature
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    placeholderTextColor={colors.textTertiary}
                    value={formData[field.id] || ''}
                    onChangeText={(text) => setFormData({ ...formData, [field.id]: text })}
                    keyboardType={field.type === 'number' ? 'numeric' : field.type === 'email' ? 'email-address' : 'default'}
                  />
                )}
              </View>
            ))}

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateDocument}
            >
              <Ionicons name="add-circle" size={22} color="#FFF" />
              <Text style={styles.createBtnText}>Create Document</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  
  categoryScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryPillText: { fontSize: 14, fontWeight: '500' },
  
  templatesGrid: { padding: 12 },
  row: { justifyContent: 'space-between' },
  
  templateCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  templateIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  templateName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  templateDesc: { fontSize: 12, lineHeight: 16, marginBottom: 12 },
  templateCategory: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: { fontSize: 11, fontWeight: '500' },
  
  formContainer: { padding: 20 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  fieldInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  signatureBtn: {
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signatureBtnText: { fontSize: 14, fontWeight: '600' },
  
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    marginTop: 20,
  },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
