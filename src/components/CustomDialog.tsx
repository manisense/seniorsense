// CustomDialog.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface CustomDialogProps {
  visible: boolean;
  title: string;
  onDismiss: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
  visible,
  title,
  onDismiss,
  onConfirm,
  onCancel,
  children,
}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onDismiss}>
        <View style={styles.dialogContainer}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <View style={styles.dialogContent}>{children}</View>
          <View style={styles.dialogActions}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.dialogButton}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm}>
              <Text style={styles.dialogButton}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 3,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dialogContent: {
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dialogButton: {
    marginLeft: 16,
    fontSize: 16,
    color: '#2563EB',
  },
});
