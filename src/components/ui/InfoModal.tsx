import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

// Same visual shell as the existing confirm dialog (overlay + rounded card),
// but single "Got it" action instead of Cancel/Confirm — this is for
// explaining something, not asking the user to decide something.
export function InfoModal({ visible, title, message, onClose }: Props) {
  const Colors = useTheme();
  const styles = getStyles(Colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (Colors: ReturnType<typeof useTheme>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  box: { backgroundColor: Colors.card, borderRadius: 16, padding: 24, width: '100%' },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  message: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 20 },
  button: { paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});