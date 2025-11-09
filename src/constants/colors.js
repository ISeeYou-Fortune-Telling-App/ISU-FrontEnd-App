// @/src/constants/colors.js

const Colors = {
  primary: "#1877F2",           // Facebook blue, used for buttons, links
  secondary: "#03dac4",         // Teal accent
  background: "#f5f5f5",        // Light background
  grayBackground: "#e2e8f0",    // Slightly darker gray bg (used in SafeAreaView)
  text: "#000000",
  error: "#B00020",
  white: "#ffffff",
  black: "#000000",
  lightBlue: "#e0e7ff",

  // Core status/action colors
  green: "#00ce00ff",           // Used in price tags
  yellow: "#F59E0B",            // Warning / pending
  pink: "#DB2777",              // Dislike / rejected
  purple: "#7C3AED",            // SEER gradient, premium
  brightYellow: "#d8c200ff",    // Highlighter yellow

  // Grays
  gray: "#777777",              // Default icon/text
  dark_gray: "#4B5563",          // Darker gray text
  borderGray: "#d1d5db",        // Input borders, dividers
  text_light: "#dee0e3ff",      // Light placeholder text

  // Category chip & icon colors (used in HomeScreen)
  categoryColors: {
    zodiac: { icon: "#5E51DC", chip: "#EAE6FF" },        // Cung Hoàng Đạo
    physiognomy: { icon: "#2D87FB", chip: "#E0EDFF" },   // Nhân Tướng Học
    elements: { icon: "#31C452", chip: "#E0F9E8" },      // Ngũ Hành
    palmistry: { icon: "#F04E99", chip: "#FFE7F0" },     // Chỉ Tay
    tarot: { icon: "#F8B940", chip: "#FFF3CD" },         // Tarot
    astrology: { icon: "#D97706", chip: "#FFF7ED" },     // Chiêm Tinh
    horoscope: { icon: "#EAB308", chip: "#FEFCE8" },     // Tử Vi
    card: { icon: "#3B82F6", chip: "#EFF6FF" },          // Bói Bài
    fengshui: { icon: "#16A34A", chip: "#F0FDF4" },      // Phong Thủy
    other: { icon: "#777777", chip: "#F2F2F2" },         // Khác
  },

  // Additional UI colors (used in cards, stats, etc.)
  cardBackground: "#ffffff",
  divider: "#E0E0E0",
  placeholder: "#9CA3AF",

  // Interaction feedback
  likeBlue: "#1877F2",
  dislikeYellow: "#FBCB0A",
  likeChipBg: "#E7F3FF",
  dislikeChipBg: "#FFF8DC",

  // Gradients (used in SEER package cards)
  gradientStart: "#7C3AED",
  gradientEnd: "#DB2777",
};

export default Colors;