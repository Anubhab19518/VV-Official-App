import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Colors, Radii, Fonts } from '@/theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  suffix?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export function Input({
  label,
  suffix,
  error,
  containerStyle,
  inputStyle,
  ...rest
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, inputStyle]}
          {...rest}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  suffix: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
  },
});
