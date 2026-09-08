import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SearchBarUIProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

export const SearchBarUI: React.FC<SearchBarUIProps> = ({
  placeholder = "Search here...",
  value,
  onChangeText,
}) => {
  const [internalQuery, setInternalQuery] = useState('');
  const queryValue = value !== undefined ? value : internalQuery;
  const handleTextChange = onChangeText || setInternalQuery;

  return (
    <View style={styles.searchContainer}>
      <Feather name="search" size={18} color="#64748b" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={queryValue}
        onChangeText={handleTextChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
});
