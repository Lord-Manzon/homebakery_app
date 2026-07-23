import { BarChart3, ChevronRight, Flame, Info, LayoutGrid, Menu, Package, Receipt, Settings, Store } from 'lucide-react-native';
import { Tabs, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { getSettings } from '../../services/settings';
import { eventBus } from '../../utils/eventBus';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.72;

export default function TabsLayout() {
  const Colors = useTheme();
  const styles = useMemo(() => getStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const [showSidebar, setShowSidebar] = useState(false);
  const [businessName, setBusinessName] = useState('HomeBakery');
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Load business name for sidebar header
  useFocusEffect(useCallback(() => {
    getSettings().then((s) => {
      if (s?.business_name) setBusinessName(s.business_name);
    });
  }, []));

  function openSidebar() {
    setShowSidebar(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeSidebar(callback?: () => void) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SIDEBAR_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSidebar(false);
      callback?.();
    });
  }

  function navigate(path: string) {
    closeSidebar(() => router.push(path as any));
  }

  const MenuButton = () => (
    <TouchableOpacity onPress={openSidebar} style={{ marginRight: 16 }}>
      <Menu size={26} color={Colors.textPrimary} />
    </TouchableOpacity>
  );

  return (
    <>
      {/* Sidebar Drawer */}
      <Modal
        visible={showSidebar}
        transparent
        animationType="none"
        onRequestClose={() => closeSidebar()}
      >
        <View style={styles.modalContainer}>
          {/* Overlay */}
          <Animated.View
            style={[styles.overlay, { opacity: overlayAnim }]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => closeSidebar()}
            />
          </Animated.View>

          {/* Sidebar Panel */}
          <Animated.View
            style={[
              styles.sidebar,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            {/* Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarLogoRow}>
                <View style={styles.sidebarLogoIcon}>
                  <Store size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.sidebarBusinessName}>{businessName}</Text>
                  <Text style={styles.sidebarSubtitle}>Bakery Manager</Text>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Menu Label */}
            <Text style={styles.sectionLabel}>MORE</Text>

            {/* Menu Items */}
            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => navigate('/modals/expenses')}
            >
              <View style={[styles.itemIcon, { backgroundColor: '#FFF3E0' }]}>
                <Receipt size={18} color={Colors.primary} />
              </View>
              <Text style={styles.sidebarItemText}>Expenses</Text>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => navigate('/modals/reports')}
            >
              <View style={[styles.itemIcon, { backgroundColor: '#E8F5E9' }]}>
                <BarChart3 size={18} color={Colors.success} />
              </View>
              <Text style={styles.sidebarItemText}>Reports</Text>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={() => navigate('/modals/settings')}
            >
              <View style={[styles.itemIcon, { backgroundColor: '#E3F2FD' }]}>
                <Settings size={18} color={Colors.info} />
              </View>
              <Text style={styles.sidebarItemText}>Settings</Text>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* Footer */}
            <Text style={styles.footerText}>HomeBakery v1.0</Text>
          </Animated.View>
        </View>
      </Modal>

      <Tabs
        screenOptions={{
          headerShown: true,
          headerRight: () => <MenuButton />,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Colors.card },
          headerTitleStyle: { color: Colors.textPrimary, fontWeight: '700' },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            backgroundColor: Colors.card,
            borderTopColor: Colors.border,
            height: 60 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
          },
          tabBarLabelStyle: {
            fontSize: 11,
          },
          sceneStyle: {
            backgroundColor: Colors.background,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <LayoutGrid size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color, size }) => (
              <Receipt size={size} color={color} />
            ),
            headerRight: () => <MenuButton />,
          }}
        />
        <Tabs.Screen
          name="production"
          options={{
            title: 'Production',
            tabBarIcon: ({ color, size }) => (
              <Flame size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Products',
            tabBarIcon: ({ color, size }) => (
              <Store size={size} color={color} />
            ),
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => eventBus.emit('products:showGlossary')}
                  style={{ marginRight: 14 }}
                >
                  <Info size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <MenuButton />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Inventory',
            tabBarIcon: ({ color, size }) => (
              <Package size={size} color={color} />
            ),
            headerRight: () => <MenuButton />,
          }}
        />
      </Tabs>
    </>
  );
}

const getStyles = (Colors: Record<string, string>) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: Colors.card,
    elevation: 16,
    ...Platform.select({
      web: {
        boxShadow: '-2px 0px 12px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
    paddingBottom: 32,
  },
  sidebarHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
  },
  sidebarLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarLogoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarBusinessName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  sidebarSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    paddingBottom: 8,
  },
});