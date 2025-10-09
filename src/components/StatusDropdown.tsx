import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Menu } from "react-native-paper";

type StatusOption = {
  status: string,
  label: string;
  color: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { status: "ACTIVE", label: "Online", color: "green" },
  { status: "INACTIVE", label: "Offline", color: "gray" },
  { status: "BLOCKED", label: "Bận", color: "red" },
];

type Props = {
  value: string; 
  onChange: (newStatus: string) => void; 
};

export default function StatusDropdown({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View collapsable={false}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
      <TouchableOpacity style={styles.button} onPress={() => setVisible(true)}>
        <View
          style={[
            styles.colorDot,
            { backgroundColor: STATUS_OPTIONS.find(s => s.status === value)?.color || "gray" }
          ]}
        />
        <Text style={styles.text}>{value}</Text>
      </TouchableOpacity>
    }
      >
        {STATUS_OPTIONS.map(option => (
          <Menu.Item
            key={option.status}
            onPress={() => {
              onChange(option.status);
              setVisible(false);
            }}
            title={option.label}
            leadingIcon={() => (
              <View style={[styles.colorDot, { backgroundColor: option.color }]} />
            )}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "white",
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    color: "#000",
  },
});
