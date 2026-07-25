import { Plus } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/theme';

type Props = {
  onPress: () => void;
  /** Extra bottom offset — pass the floating tab bar's height so the FAB doesn't sit behind it (see useTabBarHeight) */
  bottomOffset?: number;
};

export default function FAB({ onPress, bottomOffset = 0 }: Props) {
  return (
    <TouchableOpacity
      style={[styles.fab, { bottom: 24 + bottomOffset }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Plus size={30} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});