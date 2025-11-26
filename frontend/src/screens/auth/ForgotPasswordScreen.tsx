import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../context/ThemeContext';
import { authAPI } from '../../services/api';

type ResetStep = 'email' | 'code' | 'password';

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [step, setStep] = useState<ResetStep>('email');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formScale = useSharedValue(0.9);
  const formOpacity = useSharedValue(0);

  useEffect(() => {
    formScale.value = withSpring(1);
    formOpacity.value = withTiming(1, { duration: 600 });
  }, []);

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => {
        setTimer(timer - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer]);

  const animatedFormStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: formScale.value }],
      opacity: formOpacity.value,
    };
  });

  const validateEmail = (value: string): boolean => {
    setErrors({});
    if (!value.trim()) {
      setErrors({ emailOrPhone: 'Email or phone number is required' });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    
    if (!emailRegex.test(value) && !phoneRegex.test(value.replace(/\D/g, ''))) {
      setErrors({ emailOrPhone: 'Enter a valid email or phone number' });
      return false;
    }
    return true;
  };

  const validateCode = (value: string): boolean => {
    setErrors({});
    if (!value.trim()) {
      setErrors({ code: 'Verification code is required' });
      return false;
    }
    if (value.length < 4) {
      setErrors({ code: 'Code must be at least 4 characters' });
      return false;
    }
    return true;
  };

  const validatePasswordFields = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestCode = async () => {
    if (!validateEmail(emailOrPhone)) return;

    try {
      setIsLoading(true);
      const response = await authAPI.requestPasswordReset(emailOrPhone.trim());

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Code Sent',
          text2: 'Verification code sent to ' + emailOrPhone,
          visibilityTime: 3000,
        });
        setStep('code');
        setTimer(300);
      } else {
        setErrors({ general: response.message || 'Failed to send code' });
      }
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.message || 'An error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!validateCode(code)) return;

    try {
      setIsLoading(true);
      const response = await authAPI.verifyResetCode(emailOrPhone, code.trim());

      if (response.success) {
        setStep('password');
        if (timerRef.current) clearTimeout(timerRef.current);
        setTimer(0);
      } else {
        setErrors({ code: response.message || 'Invalid code' });
      }
    } catch (error: any) {
      setErrors({
        code: error.response?.data?.message || 'Invalid or expired code.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validatePasswordFields()) return;

    try {
      setIsLoading(true);
      const response = await authAPI.resetPassword(
        emailOrPhone,
        code.trim(),
        newPassword
      );

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Password Reset',
          text2: 'Your password has been reset successfully',
          visibilityTime: 3000,
        });
        setTimeout(() => {
          navigation.navigate('Login' as never);
        }, 1500);
      } else {
        setErrors({
          general: response.message || 'Failed to reset password',
        });
      }
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.message || 'Failed to reset password. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
    },
    backButton: {
      alignSelf: 'flex-start',
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      marginLeft: -theme.spacing.md,
    },
    backButtonText: {
      fontSize: 18,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    stepIndicator: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: theme.spacing.xl,
      alignItems: 'center',
    },
    stepDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      fontWeight: '600',
    },
    stepDotActive: {
      backgroundColor: theme.colors.primary,
    },
    stepDotText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    stepDotTextActive: {
      color: theme.colors.textInverse,
    },
    form: {
      marginBottom: theme.spacing.xl,
    },
    inputContainer: {
      marginBottom: theme.spacing.lg,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    passwordContainer: {
      position: 'relative',
    },
    passwordToggle: {
      position: 'absolute',
      right: theme.spacing.md,
      top: theme.spacing.md,
      padding: theme.spacing.sm,
    },
    passwordToggleText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
    },
    generalErrorContainer: {
      backgroundColor: theme.colors.error + '20',
      borderWidth: 1,
      borderColor: theme.colors.error,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    generalErrorText: {
      fontSize: 14,
      color: theme.colors.error,
      fontWeight: '500',
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textInverse,
    },
    resendContainer: {
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    resendText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    resendButton: {
      marginTop: theme.spacing.sm,
    },
    resendButtonText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    timerText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
    },
  });

  const getStepNumber = (s: ResetStep) => {
    switch (s) {
      case 'email':
        return 1;
      case 'code':
        return 2;
      case 'password':
        return 3;
      default:
        return 1;
    }
  };

  return (
    <LinearGradient
      colors={
        theme.name === 'neon-whisper'
          ? ['#0B0F15', '#111827']
          : [theme.colors.background, theme.colors.surface]
      }
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={animatedFormStyle}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Recover access to your account
              </Text>
            </View>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              {(['email', 'code', 'password'] as ResetStep[]).map((s) => (
                <View key={s} style={{ alignItems: 'center' }}>
                  <View
                    style={[
                      styles.stepDot,
                      (step === s || getStepNumber(s) < getStepNumber(step)) &&
                        styles.stepDotActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepDotText,
                        (step === s ||
                          getStepNumber(s) < getStepNumber(step)) &&
                          styles.stepDotTextActive,
                      ]}
                    >
                      {getStepNumber(s)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* General Error */}
              {errors.general && (
                <View style={styles.generalErrorContainer}>
                  <Text style={styles.generalErrorText}>{errors.general}</Text>
                </View>
              )}

              {/* Step 1: Email/Phone */}
              {step === 'email' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email or Phone Number</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.emailOrPhone && styles.inputError,
                      ]}
                      placeholder="Enter your email or phone"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={emailOrPhone}
                      onChangeText={(text) => {
                        setEmailOrPhone(text);
                        if (errors.emailOrPhone) {
                          setErrors({ ...errors, emailOrPhone: '' });
                        }
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                    />
                    {errors.emailOrPhone && (
                      <Text style={styles.errorText}>{errors.emailOrPhone}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleRequestCode}
                    disabled={isLoading || !emailOrPhone}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={theme.colors.textInverse} />
                    ) : (
                      <Text style={styles.buttonText}>Send Verification Code</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* Step 2: Verification Code */}
              {step === 'code' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Verification Code</Text>
                    <Text style={styles.subtitle} numberOfLines={2}>
                      Enter the 4-6 digit code sent to {emailOrPhone}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { marginTop: theme.spacing.md },
                        errors.code && styles.inputError,
                      ]}
                      placeholder="000000"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={code}
                      onChangeText={(text) => {
                        setCode(text.replace(/[^0-9]/g, ''));
                        if (errors.code) {
                          setErrors({ ...errors, code: '' });
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isLoading}
                    />
                    {errors.code && (
                      <Text style={styles.errorText}>{errors.code}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleVerifyCode}
                    disabled={isLoading || code.length < 4}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={theme.colors.textInverse} />
                    ) : (
                      <Text style={styles.buttonText}>Verify Code</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>
                      Didn't receive a code?
                    </Text>
                    {timer > 0 ? (
                      <Text style={styles.timerText}>
                        Resend in {Math.floor(timer / 60)}:{(timer % 60)
                          .toString()
                          .padStart(2, '0')}
                      </Text>
                    ) : (
                      <TouchableOpacity
                        style={styles.resendButton}
                        onPress={handleRequestCode}
                        disabled={isLoading}
                      >
                        <Text style={styles.resendButtonText}>Resend Code</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}

              {/* Step 3: New Password */}
              {step === 'password' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.input,
                          errors.newPassword && styles.inputError,
                          { paddingRight: 60 },
                        ]}
                        placeholder="Enter new password (min 6 characters)"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={newPassword}
                        onChangeText={(text) => {
                          setNewPassword(text);
                          if (errors.newPassword) {
                            setErrors({ ...errors, newPassword: '' });
                          }
                        }}
                        secureTextEntry={!showPassword}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Text style={styles.passwordToggleText}>
                          {showPassword ? 'Hide' : 'Show'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {errors.newPassword && (
                      <Text style={styles.errorText}>{errors.newPassword}</Text>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.input,
                          errors.confirmPassword && styles.inputError,
                          { paddingRight: 60 },
                        ]}
                        placeholder="Confirm your password"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          if (errors.confirmPassword) {
                            setErrors({ ...errors, confirmPassword: '' });
                          }
                        }}
                        secureTextEntry={!showConfirmPassword}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        <Text style={styles.passwordToggleText}>
                          {showConfirmPassword ? 'Hide' : 'Show'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && (
                      <Text style={styles.errorText}>
                        {errors.confirmPassword}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleResetPassword}
                    disabled={
                      isLoading || !newPassword || !confirmPassword
                    }
                  >
                    {isLoading ? (
                      <ActivityIndicator color={theme.colors.textInverse} />
                    ) : (
                      <Text style={styles.buttonText}>Reset Password</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default ForgotPasswordScreen;
