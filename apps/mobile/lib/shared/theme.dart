import 'package:flutter/material.dart';

const kNavy = Color(0xFF0E192D);
const kGold  = Color(0xFFC9A84C);
const kNavy2 = Color(0xFF162035);
const kBorder = Color(0xFF2A3548);
const kMuted = Color(0xFF8A94A6);

final ThemeData appTheme = ThemeData(
  useMaterial3: true,
  fontFamily: 'Inter',
  colorScheme: ColorScheme.dark(
    primary:   kGold,
    secondary: kNavy2,
    surface:   kNavy,
    onPrimary: kNavy,
    onSurface: Colors.white,
    error:     const Color(0xFFEF4444),
    outline:   kBorder,
  ),
  scaffoldBackgroundColor: kNavy,
  appBarTheme: const AppBarTheme(
    backgroundColor: kNavy2,
    foregroundColor: Colors.white,
    elevation: 0,
    centerTitle: false,
    titleTextStyle: TextStyle(
      fontFamily: 'Inter', fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white,
    ),
  ),
  cardTheme: CardTheme(
    color: kNavy2,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
      side: const BorderSide(color: kBorder, width: 1),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: const Color(0xFF0A1422),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: kBorder),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: kBorder),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: kGold, width: 1.5),
    ),
    hintStyle: const TextStyle(color: kMuted, fontSize: 14),
    labelStyle: const TextStyle(color: kMuted, fontSize: 12),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: kGold,
      foregroundColor: kNavy,
      minimumSize: const Size(double.infinity, 46),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      textStyle: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, fontSize: 14),
      elevation: 0,
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(foregroundColor: kGold),
  ),
  dividerTheme: const DividerThemeData(color: kBorder, thickness: 1),
  chipTheme: ChipThemeData(
    backgroundColor: kNavy2,
    selectedColor: kGold.withOpacity(0.15),
    side: const BorderSide(color: kBorder),
    labelStyle: const TextStyle(fontSize: 11, color: Colors.white),
  ),
);
