import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Image, TextInput, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

interface ContactInfo {
  name?: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  company?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  address?: string;
  linkedin?: string;
  twitter?: string;
  notes?: string;
}

export default function BusinessCardScanner() {
  const router = useRouter();
  const { colors, shadows } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  
  const [mode, setMode] = useState<'camera' | 'preview' | 'result'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContact, setEditedContact] = useState<ContactInfo>({});
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.8,
        });
        if (photo?.base64 && isMountedRef.current) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
          setMode('preview');
        }
      } catch (e) {
        console.error('Failed to take picture:', e);
        Alert.alert('Error', 'Failed to capture image');
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 2],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64 && isMountedRef.current) {
        const mimeType = result.assets[0].mimeType || 'image/jpeg';
        setCapturedImage(`data:${mimeType};base64,${result.assets[0].base64}`);
        setMode('preview');
      }
    } catch (e) {
      console.error('Failed to pick image:', e);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const scanCard = async () => {
    if (!capturedImage) return;
    
    setLoading(true);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/business-cards/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: capturedImage }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to scan card');
      }
      
      if (isMountedRef.current) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setContactInfo(data.contact);
        setEditedContact(data.contact);
        setCardId(data.card_id);
        setMode('result');
      }
    } catch (e: any) {
      Alert.alert('Scan Failed', e.message || 'Could not extract contact information');
      if (isMountedRef.current) {
        setMode('camera');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const saveToContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant contacts permission to save this contact.');
        return;
      }
      
      const contact = editMode ? editedContact : contactInfo;
      if (!contact) return;
      
      const newContact: Contacts.Contact = {
        contactType: Contacts.ContactTypes.Person,
        name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        firstName: contact.first_name,
        lastName: contact.last_name,
        jobTitle: contact.job_title,
        company: contact.company,
        emails: contact.email ? [{ email: contact.email, label: 'work' }] : undefined,
        phoneNumbers: [
          ...(contact.phone ? [{ number: contact.phone, label: 'work' }] : []),
          ...(contact.mobile ? [{ number: contact.mobile, label: 'mobile' }] : []),
        ],
        urlAddresses: contact.website ? [{ url: contact.website, label: 'homepage' }] : undefined,
        addresses: contact.address ? [{ 
          street: contact.address,
          label: 'work' 
        }] : undefined,
        note: [
          contact.linkedin ? `LinkedIn: ${contact.linkedin}` : '',
          contact.twitter ? `Twitter: ${contact.twitter}` : '',
          contact.notes || '',
        ].filter(Boolean).join('\n'),
      };
      
      await Contacts.addContactAsync(newContact);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Contact saved to your device!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      console.error('Failed to save contact:', e);
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const openUrl = (url: string) => {
    if (!url) return;
    let fullUrl = url;
    if (!url.startsWith('http')) {
      fullUrl = `https://${url}`;
    }
    Linking.openURL(fullUrl).catch(() => {
      Alert.alert('Error', 'Could not open URL');
    });
  };

  const callNumber = (number: string) => {
    if (!number) return;
    const url = Platform.OS === 'ios' ? `tel:${number}` : `tel:${number}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not make call');
    });
  };

  const sendEmail = (email: string) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Error', 'Could not open email app');
    });
  };

  const retake = () => {
    setCapturedImage(null);
    setContactInfo(null);
    setEditedContact({});
    setCardId(null);
    setEditMode(false);
    setMode('camera');
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            Camera Access Needed
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            We need camera access to scan business cards
          </Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Business Card Scanner
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Camera Mode */}
      {mode === 'camera' && (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              <View style={[styles.cardFrame, { borderColor: colors.primary }]}>
                <Text style={styles.frameHint}>Position card within frame</Text>
              </View>
            </View>
          </CameraView>
          
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: colors.surface }]}
              onPress={pickImage}
            >
              <Ionicons name="images-outline" size={24} color={colors.textPrimary} />
              <Text style={[styles.controlBtnText, { color: colors.textSecondary }]}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.captureBtn, { backgroundColor: colors.primary }]}
              onPress={takePicture}
            >
              <Ionicons name="camera" size={32} color="#FFF" />
            </TouchableOpacity>
            
            <View style={{ width: 70 }} />
          </View>
        </View>
      )}

      {/* Preview Mode */}
      {mode === 'preview' && capturedImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="contain" />
          
          <View style={styles.previewControls}>
            <TouchableOpacity
              style={[styles.previewBtn, { backgroundColor: colors.surface }]}
              onPress={retake}
            >
              <Ionicons name="refresh" size={20} color={colors.textPrimary} />
              <Text style={[styles.previewBtnText, { color: colors.textPrimary }]}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.previewBtn, styles.scanBtn, { backgroundColor: colors.primary }]}
              onPress={scanCard}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="scan" size={20} color="#FFF" />
                  <Text style={styles.scanBtnText}>Scan Card</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Result Mode */}
      {mode === 'result' && contactInfo && (
        <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultContent}>
          {/* Contact Card */}
          <View style={[styles.contactCard, { backgroundColor: colors.surface }, shadows.medium]}>
            <View style={styles.contactHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {(contactInfo.name || contactInfo.first_name || 'C')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactMainInfo}>
                {editMode ? (
                  <TextInput
                    style={[styles.editInput, { borderColor: colors.border, color: colors.textPrimary }]}
                    value={editedContact.name || ''}
                    onChangeText={(t) => setEditedContact({ ...editedContact, name: t })}
                    placeholder="Name"
                    placeholderTextColor={colors.textTertiary}
                  />
                ) : (
                  <Text style={[styles.contactName, { color: colors.textPrimary }]}>
                    {contactInfo.name || `${contactInfo.first_name || ''} ${contactInfo.last_name || ''}`.trim() || 'Unknown'}
                  </Text>
                )}
                {editMode ? (
                  <TextInput
                    style={[styles.editInput, styles.editInputSmall, { borderColor: colors.border, color: colors.textSecondary }]}
                    value={editedContact.job_title || ''}
                    onChangeText={(t) => setEditedContact({ ...editedContact, job_title: t })}
                    placeholder="Job Title"
                    placeholderTextColor={colors.textTertiary}
                  />
                ) : contactInfo.job_title && (
                  <Text style={[styles.contactTitle, { color: colors.textSecondary }]}>
                    {contactInfo.job_title}
                  </Text>
                )}
                {editMode ? (
                  <TextInput
                    style={[styles.editInput, styles.editInputSmall, { borderColor: colors.border, color: colors.primary }]}
                    value={editedContact.company || ''}
                    onChangeText={(t) => setEditedContact({ ...editedContact, company: t })}
                    placeholder="Company"
                    placeholderTextColor={colors.textTertiary}
                  />
                ) : contactInfo.company && (
                  <Text style={[styles.contactCompany, { color: colors.primary }]}>
                    {contactInfo.company}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setEditMode(!editMode)}
              >
                <Ionicons name={editMode ? 'checkmark' : 'pencil'} size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact Details */}
          <View style={[styles.detailsCard, { backgroundColor: colors.surface }, shadows.small]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact Details</Text>
            
            {/* Email */}
            {(editMode || contactInfo.email) && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => !editMode && sendEmail(contactInfo.email!)}
                disabled={editMode}
              >
                <View style={[styles.detailIcon, { backgroundColor: colors.surfaceHighlight }]}>
                  <Ionicons name="mail-outline" size={18} color={colors.primary} />
                </View>
                {editMode ? (
                  <TextInput
                    style={[styles.editInput, { flex: 1, borderColor: colors.border, color: colors.textPrimary }]}
                    value={editedContact.email || ''}
                    onChangeText={(t) => setEditedContact({ ...editedContact, email: t })}
                    placeholder="Email"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                  />
                ) : (
                  <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                    {contactInfo.email}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            
            {/* Phone */}
            {(editMode || contactInfo.phone) && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => !editMode && callNumber(contactInfo.phone!)}
                disabled={editMode}
              >
                <View style={[styles.detailIcon, { backgroundColor: colors.surfaceHighlight }]}>
                  <Ionicons name="call-outline" size={18} color={colors.primary} />
                </View>
                {editMode ? (
                  <TextInput
                    style={[styles.editInput, { flex: 1, borderColor: colors.border, color: colors.textPrimary }]}
                    value={editedContact.phone || ''}
                    onChangeText={(t) => setEditedContact({ ...editedContact, phone: t })}
                    placeholder="Phone"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                    {contactInfo.phone}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            
            {/* Mobile */}
            {(editMode || contactInfo.mobile) && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => !editMode && callNumber(contactInfo.mobile!)}
                disabled={editMode}
              >
                <View style={[styles.detailIcon, { backgroundColor: colors.surfaceHighlight }]}>
                  <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
                </View>
                {editMode ? (
                  <TextInput
                    style={[styles.editInput, { flex: 1, borderColor: colors.border, color: colors.textPrimary }]}
                    value={editedContact.mobile || ''}
                    onChangeText={(t) => setEditedContact({ ...editedContact, mobile: t })}
                    placeholder="Mobile"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                    {contactInfo.mobile}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            
            {/* Website */}
            {(editMode || contactInfo.website) && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => !editMode && openUrl(contactInfo.website!)}
                disabled={editMode}
              >
                <View style={[styles.detailIcon, { backgroundColor: colors.surfaceHighlight }]}>
                  <Ionicons name="globe-outline" size={18} color={colors.primary} />
                </View>
                {editMode ? (
                  <TextInput
                    style={[styles.editInput, { flex: 1, borderColor: colors.border, color: colors.textPrimary }]}
                    value={editedContact.website || ''}
                    onChangeText={(t) => setEditedContact({ ...editedContact, website: t })}
                    placeholder="Website"
                    placeholderTextColor={colors.textTertiary}
                  />
                ) : (
                  <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                    {contactInfo.website}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            
            {/* Address */}
            {(editMode || contactInfo.address) && (
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.surfaceHighlight }]}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                </View>
                {editMode ? (
                  <TextInput
                    style={[styles.editInput, { flex: 1, borderColor: colors.border, color: colors.textPrimary }]}
                    value={editedContact.address || ''}
                    onChangeText={(t) => setEditedContact({ ...editedContact, address: t })}
                    placeholder="Address"
                    placeholderTextColor={colors.textTertiary}
                    multiline
                  />
                ) : (
                  <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                    {contactInfo.address}
                  </Text>
                )}
              </View>
            )}
            
            {/* LinkedIn */}
            {(editMode || contactInfo.linkedin) && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => !editMode && openUrl(contactInfo.linkedin!.includes('linkedin.com') ? contactInfo.linkedin! : `https://linkedin.com/in/${contactInfo.linkedin}`)}
                disabled={editMode}
              >
                <View style={[styles.detailIcon, { backgroundColor: colors.surfaceHighlight }]}>
                  <Ionicons name="logo-linkedin" size={18} color="#0A66C2" />
                </View>
                {editMode ? (
                  <TextInput
                    style={[styles.editInput, { flex: 1, borderColor: colors.border, color: colors.textPrimary }]}
                    value={editedContact.linkedin || ''}
                    onChangeText={(t) => setEditedContact({ ...editedContact, linkedin: t })}
                    placeholder="LinkedIn"
                    placeholderTextColor={colors.textTertiary}
                  />
                ) : (
                  <Text style={[styles.detailText, { color: colors.textPrimary }]}>
                    {contactInfo.linkedin}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={retake}
            >
              <Ionicons name="scan-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Scan Another</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={saveToContacts}
            >
              <Ionicons name="person-add" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Save to Contacts</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardFrame: {
    width: '85%',
    aspectRatio: 1.75,
    borderWidth: 3,
    borderRadius: 12,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  frameHint: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  controlBtn: {
    width: 70,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  controlBtnText: {
    fontSize: 11,
    marginTop: 4,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
  },
  previewControls: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  previewBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scanBtn: {},
  scanBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    flex: 1,
  },
  resultContent: {
    padding: 16,
  },
  contactCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  contactMainInfo: {
    flex: 1,
    marginLeft: 16,
  },
  contactName: {
    fontSize: 20,
    fontWeight: '700',
  },
  contactTitle: {
    fontSize: 15,
    marginTop: 2,
  },
  contactCompany: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  editBtn: {
    padding: 8,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    marginBottom: 8,
  },
  editInputSmall: {
    fontSize: 14,
    paddingVertical: 6,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: 15,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    borderWidth: 0,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
