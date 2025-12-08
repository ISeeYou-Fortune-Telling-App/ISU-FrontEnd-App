import { ChevronDown, ChevronUp } from "lucide-react-native";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "../constants/colors";

type StatusOption = {
  status: string,
  label: string;
  color: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { status: "ACTIVE", label: "ACTIVE", color: "green" },
  { status: "INACTIVE", label: "INACTIVE", color: "gray" },
  { status: "VERIFIED", label: "VERIFIED", color: Colors.primary },
  { status: "BLOCKED", label: "Bận", color: "red" },
];

type Props = {
  value: string; 
  onChange: (newStatus: string) => void; 
};

export default function StatusDropdown({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const [selectorLayout, setSelectorLayout] = useState({ y: 0, height: 0 });

  const currentOption = STATUS_OPTIONS.find(s => s.status === value);

  return (
    <View collapsable={false}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setVisible((v) => !v)}
        activeOpacity={0.85}
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          setSelectorLayout({ y, height });
        }}
      >
        <View
          style={[
            styles.colorDot,
            { backgroundColor: currentOption?.color || "gray" }
          ]}
        />
        <Text style={styles.text}>{value}</Text>
        {visible ? (
          <ChevronUp size={18} color="#6B7280" style={{ marginLeft: 8 }} />
        ) : (
          <ChevronDown size={18} color="#6B7280" style={{ marginLeft: 8 }} />
        )}
      </TouchableOpacity>

      {visible && (
        <View style={[
          styles.listBox,
          {
            position: 'absolute',
            top: selectorLayout.height + 4,
            left: 0,
            right: 0,
            zIndex: 9999,
            elevation: 10,
          }
        ]}>
          {STATUS_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.status}
              style={[
                styles.option,
                value === option.status && styles.optionActive
              ]}
              onPress={() => {
                onChange(option.status);
                setVisible(false);
              }}
            >
              <View style={[styles.colorDot, { backgroundColor: option.color }]} />
              <Text style={[
                styles.optionText,
                value === option.status && styles.optionTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
    flex: 1,
  },
  listBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    backgroundColor: Colors.white,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: "#EEF2FF",
  },
  optionText: {
    color: "#374151",
    fontSize: 16,
  },
  optionTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
});
