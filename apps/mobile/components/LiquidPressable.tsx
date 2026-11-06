import React, { useRef, useState } from "react";
import {
  Animated,
  Pressable as NativePressable,
  View,
  type PressableProps,
  type PressableStateCallbackType,
  type ViewStyle,
} from "react-native";

type Props = PressableProps & { glass?: boolean; containerStyle?: ViewStyle };

export function LiquidPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  disabled,
  glass = true,
  containerStyle,
  ...props
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const pressState: PressableStateCallbackType = { pressed };

  const pressIn = (event: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) => {
    setPressed(true);
    Animated.spring(scale, { toValue: 0.975, speed: 38, bounciness: 3, useNativeDriver: true }).start();
    onPressIn?.(event);
  };

  const pressOut = (event: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) => {
    setPressed(false);
    Animated.spring(scale, { toValue: 1, speed: 26, bounciness: 7, useNativeDriver: true }).start();
    onPressOut?.(event);
  };

  const resolvedStyle = typeof style === "function" ? style(pressState) : style;

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <NativePressable
        {...props}
        disabled={disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={resolvedStyle}
      >
        {typeof children === "function" ? children(pressState) : children}
        {glass ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.38)",
              backgroundColor: pressed ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.035)",
            }}
          />
        ) : null}
      </NativePressable>
    </Animated.View>
  );
}
