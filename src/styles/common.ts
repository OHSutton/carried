import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalOverlaySecondary: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  modalClose: { padding: 8 },
  inputLabel: { color: '#666', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  primaryAction: {
    backgroundColor: '#00E5FF',
    width: '100%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryActionText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
