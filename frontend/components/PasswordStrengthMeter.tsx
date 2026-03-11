import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import * as Crypto from 'expo-crypto';

interface PasswordStrengthMeterProps {
  password: string;
  onValidityChange?: (isValid: boolean, errors: string[]) => void;
  onBreachCheck?: (isBreached: boolean) => void;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  label: string;
  check: (password: string) => boolean;
  icon: string;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    label: 'At least 8 characters',
    check: (p) => p.length >= 8,
    icon: 'text',
  },
  {
    label: 'One uppercase letter (A-Z)',
    check: (p) => /[A-Z]/.test(p),
    icon: 'arrow-up',
  },
  {
    label: 'One lowercase letter (a-z)',
    check: (p) => /[a-z]/.test(p),
    icon: 'arrow-down',
  },
  {
    label: 'One number (0-9)',
    check: (p) => /[0-9]/.test(p),
    icon: 'keypad',
  },
  {
    label: 'One special character (!@#$%^&*)',
    check: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
    icon: 'star',
  },
];

// Calculate password strength score (0-100)
const calculateStrength = (password: string): number => {
  if (!password) return 0;
  
  let score = 0;
  
  // Length score (up to 30 points)
  score += Math.min(password.length * 3, 30);
  
  // Character variety (up to 40 points)
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
  
  // Bonus for mixing (up to 30 points)
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (varietyCount >= 3) score += 15;
  if (varietyCount === 4) score += 15;
  
  // Penalty for common patterns
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // Only letters
  if (/^[0-9]+$/.test(password)) score -= 20; // Only numbers
  if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/^(123|abc|qwerty|password)/i.test(password)) score -= 30; // Common patterns
  
  return Math.max(0, Math.min(100, score));
};

// Get strength label and color
const getStrengthInfo = (score: number): { label: string; color: string; level: number } => {
  if (score < 25) return { label: 'Very Weak', color: '#EF4444', level: 1 };
  if (score < 50) return { label: 'Weak', color: '#F97316', level: 2 };
  if (score < 70) return { label: 'Fair', color: '#EAB308', level: 3 };
  if (score < 90) return { label: 'Strong', color: '#22C55E', level: 4 };
  return { label: 'Very Strong', color: '#059669', level: 5 };
};

// Check if password has been exposed in data breaches using HaveIBeenPwned API
const checkBreachedPassword = async (password: string): Promise<{ breached: boolean; count: number }> => {
  try {
    // Hash the password using SHA-1
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA1,
      password
    );
    
    const hashUpper = hash.toUpperCase();
    const prefix = hashUpper.substring(0, 5);
    const suffix = hashUpper.substring(5);
    
    // Query HaveIBeenPwned API with k-anonymity (only send first 5 chars of hash)
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true', // Adds padding to prevent response length analysis
      },
    });
    
    if (!response.ok) {
      console.log('HIBP API error:', response.status);
      return { breached: false, count: 0 };
    }
    
    const text = await response.text();
    const lines = text.split('\n');
    
    // Check if our hash suffix is in the response
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return { breached: true, count: parseInt(count.trim(), 10) };
      }
    }
    
    return { breached: false, count: 0 };
  } catch (error) {
    console.log('Error checking breached password:', error);
    return { breached: false, count: 0 };
  }
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  onValidityChange,
  onBreachCheck,
  showRequirements = true,
}) => {
  const { colors } = useTheme();
  const [isCheckingBreach, setIsCheckingBreach] = useState(false);
  const [breachResult, setBreachResult] = useState<{ breached: boolean; count: number } | null>(null);
  
  // Calculate requirements status
  const requirementsStatus = useMemo(() => {
    return PASSWORD_REQUIREMENTS.map(req => ({
      ...req,
      met: req.check(password),
    }));
  }, [password]);
  
  // Calculate strength
  const strength = useMemo(() => calculateStrength(password), [password]);
  const strengthInfo = useMemo(() => getStrengthInfo(strength), [strength]);
  
  // Check for breached password (debounced)
  useEffect(() => {
    if (password.length < 8) {
      setBreachResult(null);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setIsCheckingBreach(true);
      const result = await checkBreachedPassword(password);
      setBreachResult(result);
      setIsCheckingBreach(false);
      onBreachCheck?.(result.breached);
    }, 500); // Debounce 500ms
    
    return () => clearTimeout(timeoutId);
  }, [password, onBreachCheck]);
  
  // Notify parent of validity changes
  useEffect(() => {
    const allRequirementsMet = requirementsStatus.every(r => r.met);
    const errors: string[] = [];
    
    requirementsStatus.forEach(req => {
      if (!req.met) errors.push(req.label);
    });
    
    if (breachResult?.breached) {
      errors.push('Password found in data breach');
    }
    
    const isValid = allRequirementsMet && !breachResult?.breached;
    onValidityChange?.(isValid, errors);
  }, [requirementsStatus, breachResult, onValidityChange]);
  
  if (!password) return null;
  
  return (
    <View style={styles.container}>
      {/* Strength Bar */}
      <View style={styles.strengthBarContainer}>
        <View style={[styles.strengthBarBg, { backgroundColor: colors.surfaceHighlight }]}>
          <View 
            style={[
              styles.strengthBarFill, 
              { 
                width: `${strength}%`,
                backgroundColor: strengthInfo.color,
              }
            ]} 
          />
        </View>
        <View style={styles.strengthLabelRow}>
          <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
            {strengthInfo.label}
          </Text>
          <Text style={[styles.strengthScore, { color: colors.textTertiary }]}>
            {strength}/100
          </Text>
        </View>
      </View>
      
      {/* Requirements Checklist */}
      {showRequirements && (
        <View style={styles.requirementsContainer}>
          {requirementsStatus.map((req, index) => (
            <View key={index} style={styles.requirementRow}>
              <Ionicons 
                name={req.met ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={req.met ? '#22C55E' : colors.textTertiary} 
              />
              <Text style={[
                styles.requirementText, 
                { color: req.met ? colors.textPrimary : colors.textTertiary }
              ]}>
                {req.label}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Breach Warning */}
      {password.length >= 8 && (
        <View style={styles.breachContainer}>
          {isCheckingBreach ? (
            <View style={styles.breachRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.breachText, { color: colors.textSecondary }]}>
                Checking password security...
              </Text>
            </View>
          ) : breachResult?.breached ? (
            <View style={[styles.breachWarning, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={18} color="#DC2626" />
              <View style={styles.breachTextContainer}>
                <Text style={styles.breachWarningTitle}>Password Compromised!</Text>
                <Text style={styles.breachWarningText}>
                  This password appeared in {breachResult.count.toLocaleString()} data breaches. 
                  Please choose a different password.
                </Text>
              </View>
            </View>
          ) : breachResult !== null ? (
            <View style={styles.breachRow}>
              <Ionicons name="shield-checkmark" size={16} color="#22C55E" />
              <Text style={[styles.breachText, { color: '#22C55E' }]}>
                Password not found in known breaches
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

// Password validation function for use in forms
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
  
  strengthBarContainer: {
    marginBottom: 12,
  },
  strengthBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  strengthScore: {
    fontSize: 11,
  },
  
  requirementsContainer: {
    marginTop: 8,
    gap: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 12,
  },
  
  breachContainer: {
    marginTop: 12,
  },
  breachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breachText: {
    fontSize: 12,
  },
  breachWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  breachTextContainer: {
    flex: 1,
  },
  breachWarningTitle: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  breachWarningText: {
    color: '#991B1B',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default PasswordStrengthMeter;
